import { NextRequest, NextResponse } from "next/server";
import { initializeDataSource } from "../../../data-source";
import { AuditLog } from "../../../lib/entities/auditLog/AuditLog";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const dataSource = await initializeDataSource();
    const auditRepository = dataSource.getRepository(AuditLog);

    let query = auditRepository.createQueryBuilder('audit')
      .orderBy('audit.changedAt', 'DESC');

    if (dealId) {
      query = query.where('audit.dealId = :dealId', { dealId: parseInt(dealId) });
    }

    const auditLogs = await query.limit(limit).getMany();

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