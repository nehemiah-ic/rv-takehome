import { NextRequest, NextResponse } from "next/server";
import { initializeDataSource } from "../../../data-source";
import { getStageAnalytics } from "../../../lib/business/deals/analytics";
import { Deal } from "../../../lib/entities/deals/Deal";
import { validateAndSaveDeal } from "../../../lib/persistence/deals";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dataSource = await initializeDataSource();
    const dealRepository = dataSource.getRepository(Deal);

    // Check if the request body is an array for batch processing
    if (Array.isArray(body)) {
      const results: {
        success: number;
        errors: { deal_id: string; error: any }[];
      } = { success: 0, errors: [] };

      for (const deal of body) {
        const result = await validateAndSaveDeal(deal, dealRepository);
        if (result.success) {
          results.success++;
        } else {
          results.errors.push(result);
        }
      }

      return NextResponse.json(results, { status: 207 });
    }

    // Single deal processing
    const result = await validateAndSaveDeal(body, dealRepository);
    if (result.success) {
      return NextResponse.json({ deal_id: result.deal_id }, { status: 201 });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in POST /api/deals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const dataSource = await initializeDataSource();
    const dealRepository = dataSource.getRepository(Deal);
    const deals = await dealRepository.find({
      relations: ['sales_rep']
    });

    const { totalDeals, stageAnalytics } = getStageAnalytics(deals);

    return NextResponse.json({
      totalDeals,
      stageAnalytics,
    });
  } catch (error) {
    console.error("Error fetching deals by stage:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
