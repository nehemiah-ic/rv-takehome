import { NextRequest, NextResponse } from "next/server";
import { initializeDataSource } from "../../../../data-source";
import { Deal } from "../../../../lib/entities/deals/Deal";
import { SalesRep } from "../../../../lib/entities/salesRep/SalesRep";
import { z } from "zod";

const BulkPreviewSchema = z.object({
  dealIds: z.array(z.number()).min(1, "Must select at least one deal"),
  changes: z.object({
    sales_rep_name: z.string().min(1, "Sales rep is required"),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = BulkPreviewSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { dealIds, changes } = validationResult.data;

    const dataSource = await initializeDataSource();
    const dealRepository = dataSource.getRepository(Deal);
    const salesRepRepository = dataSource.getRepository(SalesRep);

    // Find the target sales rep by name
    const targetSalesRep = await salesRepRepository.findOne({
      where: { name: changes.sales_rep_name }
    });

    if (!targetSalesRep) {
      return NextResponse.json(
        { error: `Sales rep not found: ${changes.sales_rep_name}` },
        { status: 404 }
      );
    }

    // Fetch selected deals and all deals for workload calculation with relations
    const [selectedDeals, allDeals] = await Promise.all([
      dealRepository.find({
        where: dealIds.map(id => ({ id })),
        relations: ['sales_rep'],
      }),
      dealRepository.find({
        relations: ['sales_rep'],
      }),
    ]);

    if (selectedDeals.length !== dealIds.length) {
      const foundIds = selectedDeals.map(d => d.id);
      const missingIds = dealIds.filter(id => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Deals not found: ${missingIds.join(', ')}` },
        { status: 404 }
      );
    }

    // Calculate current workload state
    const currentWorkload = calculateWorkload(allDeals);

    // Simulate the changes
    const simulatedDeals = allDeals.map(deal => {
      if (dealIds.includes(deal.id)) {
        return {
          ...deal,
          sales_rep_id: targetSalesRep.id,
          sales_rep: targetSalesRep,
        };
      }
      return deal;
    });

    // Calculate projected workload state
    const projectedWorkload = calculateWorkload(simulatedDeals);

    // Detect conflicts and warnings
    const conflicts = detectConflicts(projectedWorkload);
    const warnings = detectWarnings(currentWorkload, projectedWorkload);

    // Calculate impact summary
    const impact = calculateImpact(selectedDeals, changes);

    return NextResponse.json({
      impact,
      currentWorkload,
      projectedWorkload,
      conflicts,
      warnings,
      summary: {
        totalDeals: dealIds.length,
        totalValue: selectedDeals.reduce((sum, deal) => sum + Number(deal.value), 0),
        affectedReps: getAffectedReps(selectedDeals, changes),
        changeTypes: ["sales_rep"],
      },
    });
  } catch (error) {
    console.error("Error in bulk preview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function calculateWorkload(deals: Deal[]) {
  const workload: Record<string, any> = {};
  
  deals.forEach(deal => {
    const repName = deal.sales_rep?.name;
    if (!repName) return; // Skip deals without sales rep
    
    if (!workload[repName]) {
      workload[repName] = {
        dealCount: 0,
        totalValue: 0,
        territories: new Set(),
      };
    }
    
    workload[repName].dealCount += 1;
    workload[repName].totalValue += Number(deal.value);
    if (deal.territory) {
      workload[repName].territories.add(deal.territory);
    }
  });

  // Convert sets to arrays and calculate averages
  Object.values(workload).forEach((rep: any) => {
    rep.avgDealValue = rep.dealCount > 0 ? Math.round(rep.totalValue / rep.dealCount) : 0;
    rep.territories = Array.from(rep.territories);
    rep.territoryCount = rep.territories.length;
  });

  return workload;
}

function detectConflicts(workload: Record<string, any>) {
  const conflicts = [];

  for (const [rep, data] of Object.entries(workload)) {
    // Check for overload conditions (using same logic as workload analytics)
    const dealCountScore = data.dealCount <= 2 ? -1 : data.dealCount >= 8 ? 1 : 0;
    const valueScore = data.totalValue <= 50000 ? -1 : data.totalValue >= 200000 ? 1 : 0;
    const avgDealScore = data.avgDealValue <= 20000 ? -1 : data.avgDealValue >= 50000 ? 1 : 0;
    
    const totalScore = dealCountScore + valueScore + avgDealScore;
    
    if (totalScore >= 2) {
      conflicts.push({
        type: 'overload',
        rep,
        severity: 'high',
        message: `${rep} would be overloaded: ${data.dealCount} deals, ${formatCurrency(data.totalValue)} pipeline`,
        suggestion: `Consider distributing some deals to other reps`,
      });
    }
  }

  return conflicts;
}

function detectWarnings(current: Record<string, any>, projected: Record<string, any>) {
  const warnings = [];

  // Check for significant workload shifts
  for (const rep of Object.keys({ ...current, ...projected })) {
    const currentData = current[rep] || { dealCount: 0, totalValue: 0 };
    const projectedData = projected[rep] || { dealCount: 0, totalValue: 0 };
    
    const dealCountChange = projectedData.dealCount - currentData.dealCount;
    const valueChange = projectedData.totalValue - currentData.totalValue;
    
    if (Math.abs(dealCountChange) >= 3) {
      warnings.push({
        type: 'workload_shift',
        rep,
        severity: 'medium',
        message: `${rep} workload ${dealCountChange > 0 ? 'increases' : 'decreases'} by ${Math.abs(dealCountChange)} deals`,
        details: `From ${currentData.dealCount} to ${projectedData.dealCount} deals`,
      });
    }

    if (Math.abs(valueChange) >= 100000) {
      warnings.push({
        type: 'value_shift',
        rep,
        severity: 'medium',
        message: `${rep} pipeline ${valueChange > 0 ? 'increases' : 'decreases'} by ${formatCurrency(Math.abs(valueChange))}`,
        details: `From ${formatCurrency(currentData.totalValue)} to ${formatCurrency(projectedData.totalValue)}`,
      });
    }
  }

  return warnings;
}

function calculateImpact(deals: Deal[], changes: any) {
  const impact = {
    dealCount: deals.length,
    totalValue: deals.reduce((sum, deal) => sum + Number(deal.value), 0),
    territoriesAffected: new Set(),
    repsAffected: new Set(),
    changes: [] as any[],
  };

  deals.forEach(deal => {
    impact.territoriesAffected.add(deal.territory || 'Unassigned');
    impact.repsAffected.add(deal.sales_rep?.name);

    if (deal.sales_rep?.name !== changes.sales_rep_name) {
      impact.changes.push({
        dealId: deal.deal_id,
        field: 'sales_rep',
        from: deal.sales_rep?.name,
        to: changes.sales_rep_name,
      });
    }
  });

  return {
    ...impact,
    territoriesAffected: Array.from(impact.territoriesAffected),
    repsAffected: Array.from(impact.repsAffected),
  };
}

function getAffectedReps(deals: Deal[], changes: any) {
  const reps = new Set();
  
  deals.forEach(deal => {
    reps.add(deal.sales_rep?.name); // Current rep
    reps.add(changes.sales_rep_name); // New rep
  });

  return Array.from(reps);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}