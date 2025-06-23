/**
 * @jest-environment node
 */
import { GET } from "../../app/api/audit-trail/route";
import { initializeDataSource } from "../../data-source";
import { AuditLog } from "../../lib/entities/auditLog/AuditLog";
import { NextRequest } from "next/server";

// Mock the data source
jest.mock("../../data-source");
const mockInitializeDataSource = initializeDataSource as jest.MockedFunction<typeof initializeDataSource>;

describe("/api/audit-trail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return all audit logs when no dealId specified", async () => {
      const mockAuditLogs: Partial<AuditLog>[] = [
        {
          id: 1,
          dealId: 1,
          dealIdentifier: "RV-001",
          fieldChanged: "sales_rep",
          oldValue: "Alice Smith",
          newValue: "Bob Johnson",
          changedBy: "Manager",
          reason: "Workload balancing",
          changedAt: new Date("2023-01-01T10:00:00Z"),
          changeType: "manual",
        },
        {
          id: 2,
          dealId: 2,
          dealIdentifier: "RV-002",
          fieldChanged: "sales_rep",
          oldValue: "Carol Davis",
          newValue: "Alice Smith",
          changedBy: "System User",
          reason: "Territory reassignment",
          changedAt: new Date("2023-01-01T09:00:00Z"),
          changeType: "manual",
        },
      ];

      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAuditLogs),
      };

      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/audit-trail");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.auditLogs).toHaveLength(2);
      expect(data.count).toBe(2);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('audit.changedAt', 'DESC');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50); // Default limit
    });

    it("should filter audit logs by dealId when specified", async () => {
      const mockAuditLogs: Partial<AuditLog>[] = [
        {
          id: 1,
          dealId: 1,
          dealIdentifier: "RV-001",
          fieldChanged: "sales_rep",
          oldValue: "Alice Smith",
          newValue: "Bob Johnson",
          changedBy: "Manager",
          reason: "Workload balancing",
          changedAt: new Date("2023-01-01T10:00:00Z"),
          changeType: "manual",
        },
      ];

      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAuditLogs),
      };

      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/audit-trail?dealId=1");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.auditLogs).toHaveLength(1);
      expect(data.auditLogs[0].dealId).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('audit.dealId = :dealId', { dealId: 1 });
    });

    it("should respect custom limit parameter", async () => {
      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/audit-trail?limit=10");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it("should handle invalid dealId parameter", async () => {
      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/audit-trail?dealId=invalid");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.auditLogs).toHaveLength(0);
      // Invalid dealId should not call where clause since isValidDealId will be false
      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
    });

    it("should handle invalid limit parameter", async () => {
      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/audit-trail?limit=invalid");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50); // Falls back to default when invalid
    });

    it("should handle database errors", async () => {
      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockRejectedValue(new Error("Database error")),
      };

      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/audit-trail");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return empty array when no audit logs found", async () => {
      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/audit-trail");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.auditLogs).toHaveLength(0);
      expect(data.count).toBe(0);
    });

    it("should handle both dealId and limit parameters together", async () => {
      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/audit-trail?dealId=5&limit=25");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('audit.dealId = :dealId', { dealId: 5 });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(25);
    });
  });
});