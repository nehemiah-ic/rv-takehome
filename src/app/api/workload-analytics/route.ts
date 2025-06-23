import { NextResponse } from "next/server";
import { initializeDataSource } from "../../../data-source";
import { Deal } from "../../../lib/entities/deals/Deal";

interface RepWorkload {
  salesRep: string;
  dealCount: number;
  totalValue: number;
  avgDealValue: number;
  territories: string[];
  dealsByStage: Record<string, number>;
  utilizationLevel: 'under' | 'balanced' | 'over';
  recommendations: string[];
}

interface WorkloadRecommendation {
  type: 'redistribute' | 'hire' | 'optimize';
  priority: 'high' | 'medium' | 'low';
  description: string;
  affectedReps: string[];
}

export async function GET() {
  try {
    const dataSource = await initializeDataSource();
    const dealRepository = dataSource.getRepository(Deal);
    const deals = await dealRepository.find();

    // Group deals by sales rep
    const repWorkloads = deals.reduce((accumulator, deal) => {
      const rep = deal.sales_rep;
      
      if (!accumulator[rep]) {
        accumulator[rep] = {
          salesRep: rep,
          dealCount: 0,
          totalValue: 0,
          avgDealValue: 0,
          territories: new Set(),
          dealsByStage: {},
          utilizationLevel: 'balanced' as const,
          recommendations: [],
        };
      }

      accumulator[rep].dealCount += 1;
      accumulator[rep].totalValue += Number(deal.value);
      if (deal.territory) {
        accumulator[rep].territories.add(deal.territory);
      }

      // Track deals by stage
      if (!accumulator[rep].dealsByStage[deal.stage]) {
        accumulator[rep].dealsByStage[deal.stage] = 0;
      }
      accumulator[rep].dealsByStage[deal.stage] += 1;

      return accumulator;
    }, {} as Record<string, any>);

    // Calculate metrics and utilization levels
    const workloadData: RepWorkload[] = Object.values(repWorkloads).map((rep: any) => {
      rep.avgDealValue = rep.dealCount > 0 ? Math.round(rep.totalValue / rep.dealCount) : 0;
      rep.territories = Array.from(rep.territories);
      
      // Determine utilization level (simple heuristic)
      if (rep.dealCount >= 8) {
        rep.utilizationLevel = 'over';
        rep.recommendations.push('Consider redistributing deals to reduce workload');
      } else if (rep.dealCount <= 2) {
        rep.utilizationLevel = 'under';
        rep.recommendations.push('Has capacity for additional deals');
      } else {
        rep.utilizationLevel = 'balanced';
      }

      return rep;
    });

    // Sort by deal count descending
    workloadData.sort((a, b) => b.dealCount - a.dealCount);

    // Generate overall recommendations
    const overloadedReps = workloadData.filter(rep => rep.utilizationLevel === 'over');
    const underutilizedReps = workloadData.filter(rep => rep.utilizationLevel === 'under');
    
    const recommendations: WorkloadRecommendation[] = [];
    
    if (overloadedReps.length > 0 && underutilizedReps.length > 0) {
      recommendations.push({
        type: 'redistribute',
        priority: 'high',
        description: `Redistribute deals from ${overloadedReps.map(r => r.salesRep).join(', ')} to ${underutilizedReps.map(r => r.salesRep).join(', ')}`,
        affectedReps: [...overloadedReps.map(r => r.salesRep), ...underutilizedReps.map(r => r.salesRep)],
      });
    }

    if (overloadedReps.length > underutilizedReps.length) {
      recommendations.push({
        type: 'hire',
        priority: 'medium',
        description: 'Consider hiring additional sales reps to handle current workload',
        affectedReps: overloadedReps.map(r => r.salesRep),
      });
    }

    // Calculate summary metrics
    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, deal) => sum + Number(deal.value), 0);
    const avgDealsPerRep = workloadData.length > 0 ? Math.round(totalDeals / workloadData.length) : 0;
    const avgValuePerRep = workloadData.length > 0 ? Math.round(totalValue / workloadData.length) : 0;

    return NextResponse.json({
      summary: {
        totalDeals,
        totalValue,
        totalReps: workloadData.length,
        avgDealsPerRep,
        avgValuePerRep,
        overloadedReps: overloadedReps.length,
        underutilizedReps: underutilizedReps.length,
      },
      repWorkloads: workloadData,
      recommendations,
    });
  } catch (error) {
    console.error("Error fetching workload analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}