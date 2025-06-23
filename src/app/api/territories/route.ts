import { NextResponse } from "next/server";
import { initializeDataSource } from "../../../data-source";
import { Deal } from "../../../lib/entities/deals/Deal";

export async function GET() {
  try {
    const dataSource = await initializeDataSource();
    const dealRepository = dataSource.getRepository(Deal);
    const deals = await dealRepository.find({
      relations: ['sales_rep']
    });

    // Group deals by territory
    const territoryAnalytics = deals.reduce((accumulator, deal) => {
      const territory = deal.territory || "Unassigned";
      
      if (!accumulator[territory]) {
        accumulator[territory] = {
          territory,
          totalDeals: 0,
          totalValue: 0,
          avgProbability: 0,
          salesReps: new Set(),
          dealsByStage: {},
        };
      }

      accumulator[territory].totalDeals += 1;
      accumulator[territory].totalValue += Number(deal.value);
      if (deal.sales_rep?.name) {
        accumulator[territory].salesReps.add(deal.sales_rep.name);
      }

      // Track deals by stage within territory
      if (!accumulator[territory].dealsByStage[deal.stage]) {
        accumulator[territory].dealsByStage[deal.stage] = 0;
      }
      accumulator[territory].dealsByStage[deal.stage] += 1;

      return accumulator;
    }, {} as Record<string, any>);

    // Calculate averages and convert Sets to arrays
    Object.values(territoryAnalytics).forEach((territory: any) => {
      const territoryDeals = deals.filter(deal => (deal.territory || "Unassigned") === territory.territory);
      territory.avgProbability = territoryDeals.length > 0 
        ? Math.round(territoryDeals.reduce((sum, deal) => sum + Number(deal.probability), 0) / territoryDeals.length)
        : 0;
      territory.salesReps = Array.from(territory.salesReps);
      territory.repCount = territory.salesReps.length;
    });

    return NextResponse.json({
      territories: Object.values(territoryAnalytics),
      totalDeals: deals.length,
    });
  } catch (error) {
    console.error("Error fetching territory analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}