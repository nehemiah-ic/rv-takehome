import { NextRequest, NextResponse } from "next/server";
import { initializeDataSource } from "../../../../../data-source";
import { Deal } from "../../../../../lib/entities/deals/Deal";
import { AuditLog } from "../../../../../lib/entities/auditLog/AuditLog";
import { SalesRep } from "../../../../../lib/entities/salesRep/SalesRep";
import { z } from "zod";

const SalesRepUpdateSchema = z.object({
  sales_rep: z.string().min(1, "Sales rep cannot be empty"),
  reason: z.string().optional(),
  changed_by: z.string().default("System User"),
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

    const { sales_rep, reason, changed_by } = validationResult.data;

    const dataSource = await initializeDataSource();
    const dealRepository = dataSource.getRepository(Deal);
    const auditRepository = dataSource.getRepository(AuditLog);
    const salesRepRepository = dataSource.getRepository(SalesRep);

    const deal = await dealRepository.findOne({ 
      where: { id: dealId },
      relations: ['sales_rep']
    });
    if (!deal) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      );
    }

    // Find the new sales rep
    const newSalesRep = await salesRepRepository.findOne({
      where: { name: sales_rep }
    });
    if (!newSalesRep) {
      return NextResponse.json(
        { error: "Sales rep not found" },
        { status: 404 }
      );
    }

    // Store old value for audit trail
    const oldSalesRep = deal.sales_rep?.name;

    // Update sales rep
    deal.sales_rep_id = newSalesRep.id;
    deal.sales_rep = newSalesRep;
    deal.updated_date = new Date().toISOString();

    // Create audit log entry
    const auditEntry = auditRepository.create({
      dealId: deal.id,
      dealIdentifier: deal.deal_id,
      fieldChanged: 'sales_rep',
      oldValue: oldSalesRep,
      newValue: newSalesRep.name,
      changedBy: changed_by,
      reason: reason || 'Sales rep reassignment',
      changeType: 'manual',
    });

    // Save both deal and audit log
    await dealRepository.save(deal);
    await auditRepository.save(auditEntry);

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