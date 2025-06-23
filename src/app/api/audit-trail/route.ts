import { NextRequest, NextResponse } from "next/server";
import { initializeDataSource } from "../../../data-source";
import { AuditLog } from "../../../lib/entities/auditLog/AuditLog";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dealIdParam = searchParams.get('dealId');
    const limitParam = searchParams.get('limit');
    
    const dealId = dealIdParam ? parseInt(dealIdParam) : null;
    const limit = limitParam ? parseInt(limitParam) : 50;
    
    // Validate dealId is a valid number
    const isValidDealId = dealId !== null && !isNaN(dealId) && dealId > 0;
    // Validate limit is a valid number, fallback to 50
    const validLimit = !isNaN(limit) && limit > 0 ? limit : 50;

    const dataSource = await initializeDataSource();
    const auditRepository = dataSource.getRepository(AuditLog);

    let query = auditRepository.createQueryBuilder('audit')
      .orderBy('audit.changedAt', 'DESC');

    if (isValidDealId) {
      query = query.where('audit.dealId = :dealId', { dealId });
    }

    const auditLogs = await query.limit(validLimit).getMany();

    return NextResponse.json({
      auditLogs,
      count: auditLogs.length,
    });
  } catch (error) {
    console.error("Error fetching audit trail:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}