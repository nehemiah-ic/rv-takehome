import { NextRequest, NextResponse } from "next/server";
import { initializeDataSource } from "../../../../data-source";
import { Deal } from "../../../../lib/entities/deals/Deal";
import { AuditLog } from "../../../../lib/entities/auditLog/AuditLog";
import { SalesRep } from "../../../../lib/entities/salesRep/SalesRep";
import { z } from "zod";

const BulkReassignSchema = z.object({
  dealIds: z.array(z.number()).min(1, "Must select at least one deal"),
  changes: z.object({
    sales_rep_name: z.string().min(1, "Sales rep is required"),
  }),
  reason: z.string().min(1, "Reason is required for bulk operations"),
  changed_by: z.string().default("System User"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = BulkReassignSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { dealIds, changes, reason, changed_by } = validationResult.data;

    const dataSource = await initializeDataSource();
    const dealRepository = dataSource.getRepository(Deal);
    const auditRepository = dataSource.getRepository(AuditLog);
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

    // Fetch all deals to be updated with current sales rep info
    const deals = await dealRepository.find({
      where: dealIds.map(id => ({ id })),
      relations: ['sales_rep'],
    });

    if (deals.length !== dealIds.length) {
      const foundIds = deals.map(d => d.id);
      const missingIds = dealIds.filter(id => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Deals not found: ${missingIds.join(', ')}` },
        { status: 404 }
      );
    }

    // Generate batch operation ID for audit grouping
    const batchId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const auditEntries: any[] = [];
    const updatedDeals: Deal[] = [];

    // Process each deal
    for (const deal of deals) {
      const originalDeal = { ...deal };
      let hasChanges = false;

      // Update sales rep
      if (deal.sales_rep_id !== targetSalesRep.id) {
        auditEntries.push(auditRepository.create({
          dealId: deal.id,
          dealIdentifier: deal.deal_id,
          fieldChanged: 'sales_rep',
          oldValue: deal.sales_rep?.name || 'Unassigned',
          newValue: targetSalesRep.name,
          changedBy: changed_by,
          reason: `${reason} (Batch: ${batchId})`,
          changeType: 'bulk',
        }));
        deal.sales_rep_id = targetSalesRep.id;
        hasChanges = true;
      }

      if (hasChanges) {
        deal.updated_date = new Date().toISOString();
        updatedDeals.push(deal);
      }
    }

    // Save all changes and audit entries
    if (updatedDeals.length > 0) {
      await dealRepository.save(updatedDeals);
    }
    
    if (auditEntries.length > 0) {
      await auditRepository.save(auditEntries);
    }

    return NextResponse.json({
      message: "Bulk reassignment completed successfully",
      batchId,
      updatedDeals: updatedDeals.length,
      auditEntries: auditEntries.length,
      summary: {
        totalDeals: dealIds.length,
        changedDeals: updatedDeals.length,
        changes: ["sales_rep"],
      },
    });
  } catch (error) {
    console.error("Error in bulk reassignment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}