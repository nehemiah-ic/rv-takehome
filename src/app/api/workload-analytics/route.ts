import { NextResponse } from "next/server";
import { initializeDataSource } from "../../../data-source";
import { Deal } from "../../../lib/entities/deals/Deal";
import { SalesRep } from "../../../lib/entities/salesRep/SalesRep";

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
    const salesRepRepository = dataSource.getRepository(SalesRep);
    
    // Fetch deals and sales reps in parallel
    const [deals, salesReps] = await Promise.all([
      dealRepository.find({
        relations: ['sales_rep'],
      }),
      salesRepRepository.find({
        where: { active: true },
        order: { name: "ASC" },
      }),
    ]);

    const allAvailableReps = salesReps.map(rep => rep.name);

    // Initialize all reps with zero deals
    const repWorkloads: Record<string, any> = {};
    allAvailableReps.forEach(rep => {
      repWorkloads[rep] = {
        salesRep: rep,
        dealCount: 0,
        totalValue: 0,
        avgDealValue: 0,
        territories: new Set(),
        dealsByStage: {},
        utilizationLevel: 'balanced' as const,
        recommendations: [],
      };
    });

    // Add deals to existing rep workloads
    deals.forEach(deal => {
      const repName = deal.sales_rep?.name;
      
      if (repName && repWorkloads[repName]) {
        repWorkloads[repName].dealCount += 1;
        repWorkloads[repName].totalValue += Number(deal.value);
        if (deal.territory) {
          repWorkloads[repName].territories.add(deal.territory);
        }

        // Track deals by stage
        if (!repWorkloads[repName].dealsByStage[deal.stage]) {
          repWorkloads[repName].dealsByStage[deal.stage] = 0;
        }
        repWorkloads[repName].dealsByStage[deal.stage] += 1;
      }
    });

    // Calculate metrics and utilization levels
    const workloadData: RepWorkload[] = Object.values(repWorkloads).map((rep: any) => {
      rep.avgDealValue = rep.dealCount > 0 ? Math.round(rep.totalValue / rep.dealCount) : 0;
      rep.territories = Array.from(rep.territories);
      
      // Determine utilization level (considers deal count, value, and avg deal size)
      const dealCountScore = rep.dealCount <= 2 ? -1 : rep.dealCount >= 8 ? 1 : 0;
      const valueScore = rep.totalValue <= 50000 ? -1 : rep.totalValue >= 200000 ? 1 : 0;
      const avgDealScore = rep.avgDealValue <= 20000 ? -1 : rep.avgDealValue >= 50000 ? 1 : 0;
      
      const totalScore = dealCountScore + valueScore + avgDealScore;
      
      if (totalScore >= 2) {
        rep.utilizationLevel = 'over';
        rep.recommendations.push('Consider redistributing deals to reduce workload');
      } else if (totalScore <= -1) {
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

    // Calculate summary metrics based on all available reps
    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, deal) => sum + Number(deal.value), 0);
    const totalAvailableReps = allAvailableReps.length;
    const avgDealsPerRep = totalAvailableReps > 0 ? Math.round(totalDeals / totalAvailableReps) : 0;
    const avgValuePerRep = totalAvailableReps > 0 ? Math.round(totalValue / totalAvailableReps) : 0;

    return NextResponse.json({
      summary: {
        totalDeals,
        totalValue,
        totalReps: totalAvailableReps,
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