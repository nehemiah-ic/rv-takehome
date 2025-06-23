import { NextRequest, NextResponse } from "next/server";
import { initializeDataSource } from "../../../../../data-source";
import { Deal } from "../../../../../lib/entities/deals/Deal";
import { z } from "zod";

const SalesRepUpdateSchema = z.object({
  sales_rep: z.string().min(1, "Sales rep cannot be empty"),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = parseInt(params.id);
    if (isNaN(dealId)) {
      return NextResponse.json(
        { error: "Invalid deal ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = SalesRepUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { sales_rep } = validationResult.data;

    const dataSource = await initializeDataSource();
    const dealRepository = dataSource.getRepository(Deal);

    const deal = await dealRepository.findOne({ where: { id: dealId } });
    if (!deal) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      );
    }

    // Update sales rep
    deal.sales_rep = sales_rep;
    deal.updated_date = new Date().toISOString();

    await dealRepository.save(deal);

    return NextResponse.json({
      deal_id: deal.deal_id,
      sales_rep: deal.sales_rep,
      territory: deal.territory,
      updated_date: deal.updated_date,
    });
  } catch (error) {
    console.error("Error updating deal sales rep:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}