import { NextResponse } from "next/server";
import { initializeDataSource } from "../../../data-source";
import { Deal } from "../../../lib/entities/deals/Deal";

export async function GET() {
  try {
    const dataSource = await initializeDataSource();
    const dealRepository = dataSource.getRepository(Deal);
    const deals = await dealRepository.find();

    // Get unique sales reps from existing deals
    const salesReps = [...new Set(deals.map(deal => deal.sales_rep))].sort();

    // Add one additional rep for assignment flexibility
    const additionalReps = [
      "Sarah Johnson"
    ];

    const allReps = [...new Set([...salesReps, ...additionalReps])].sort();

    return NextResponse.json({
      sales_reps: allReps,
    });
  } catch (error) {
    console.error("Error fetching sales reps:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}