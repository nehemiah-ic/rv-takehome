import { NextRequest, NextResponse } from "next/server";
import { initializeDataSource } from "../../../../../data-source";
import { Deal } from "../../../../../lib/entities/deals/Deal";
import { TERRITORIES } from "../../../../../lib/constants/territories";
import { z } from "zod";

const TerritoryUpdateSchema = z.object({
  territory: z.enum(TERRITORIES as readonly [string, ...string[]], {
    errorMap: () => ({ message: `Territory must be one of: ${TERRITORIES.join(", ")}` })
  }),
  sales_rep: z.string().optional(),
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
    const validationResult = TerritoryUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { territory, sales_rep } = validationResult.data;

    const dataSource = await initializeDataSource();
    const dealRepository = dataSource.getRepository(Deal);

    const deal = await dealRepository.findOne({ where: { id: dealId } });
    if (!deal) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      );
    }

    // Update territory and optionally sales_rep
    deal.territory = territory;
    if (sales_rep) {
      deal.sales_rep = sales_rep;
    }
    deal.updated_date = new Date().toISOString();

    await dealRepository.save(deal);

    return NextResponse.json({
      deal_id: deal.deal_id,
      territory: deal.territory,
      sales_rep: deal.sales_rep,
      updated_date: deal.updated_date,
    });
  } catch (error) {
    console.error("Error updating deal territory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}