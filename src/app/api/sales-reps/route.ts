import { NextResponse } from "next/server";
import { initializeDataSource } from "../../../data-source";
import { SalesRep } from "../../../lib/entities/salesRep/SalesRep";

export async function GET() {
  try {
    const dataSource = await initializeDataSource();
    const salesRepRepository = dataSource.getRepository(SalesRep);
    
    // Get all active sales reps
    const salesReps = await salesRepRepository.find({
      where: { active: true },
      order: { name: "ASC" },
    });

    return NextResponse.json({
      sales_reps: salesReps.map(rep => rep.name),
    });
  } catch (error) {
    console.error("Error fetching sales reps:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}