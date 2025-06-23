// Mock Next.js server components before importing
jest.mock("next/server", () => {
  const mockNextRequest = jest.fn().mockImplementation((url, options) => ({
    url,
    method: options?.method || "GET",
    json: jest.fn().mockImplementation(() => {
      try {
        return Promise.resolve(JSON.parse(options?.body || "{}"));
      } catch (error) {
        return Promise.reject(new Error("Invalid JSON"));
      }
    }),
    text: jest.fn().mockResolvedValue(options?.body || ""),
  }));

  const mockNextResponse = {
    json: jest.fn((data, options) => ({
      json: async () => data,
      status: options?.status || 200,
    })),
  };

  return {
    NextRequest: mockNextRequest,
    NextResponse: mockNextResponse,
  };
});

// Mock the data source and repositories
jest.mock("../../data-source");
jest.mock("../../lib/entities/deals/Deal");
jest.mock("../../lib/entities/auditLog/AuditLog");

import { NextRequest } from "next/server";
import { POST as BulkReassignPOST } from "../../app/api/deals/bulk-reassign/route";
import { POST as PreviewBulkPOST } from "../../app/api/deals/preview-bulk/route";
import { initializeDataSource } from "../../data-source";

const mockInitializeDataSource = initializeDataSource as jest.MockedFunction<
  typeof initializeDataSource
>;

describe("Bulk Operations APIs", () => {
  let mockDealRepository: any;
  let mockAuditRepository: any;
  let mockSalesRepRepository: any;
  let mockDataSource: any;

  const mockDeals = [
    {
      id: 1,
      deal_id: "DEAL-001",
      company_name: "Company A",
      sales_rep: "Alice Johnson",
      territory: "West Coast",
      value: 50000,
      stage: "prospect",
    },
    {
      id: 2,
      deal_id: "DEAL-002",
      company_name: "Company B",
      sales_rep: "Bob Smith",
      territory: "East Coast",
      value: 75000,
      stage: "qualified",
    },
    {
      id: 3,
      deal_id: "DEAL-003",
      company_name: "Company C",
      sales_rep: "Alice Johnson",
      territory: "West Coast",
      value: 100000,
      stage: "proposal",
    },
  ];

  beforeEach(() => {
    mockDealRepository = {
      find: jest.fn(),
      save: jest.fn(),
    };

    mockAuditRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    mockSalesRepRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity.name === "Deal") return mockDealRepository;
        if (entity.name === "AuditLog") return mockAuditRepository;
        if (entity.name === "SalesRep") return mockSalesRepRepository;
        return mockDealRepository;
      }),
    };

    mockInitializeDataSource.mockResolvedValue(mockDataSource);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/deals/preview-bulk", () => {
    it("should generate preview for sales rep change", async () => {
      const selectedDeals = [mockDeals[0], mockDeals[1]];
      const allDeals = [...mockDeals];

      // Mock sales rep lookup
      mockSalesRepRepository.findOne.mockResolvedValue({
        id: 4,
        name: "Charlie Brown",
        email: "charlie.brown@test.com",
      });

      mockDealRepository.find
        .mockResolvedValueOnce(selectedDeals) // First call for selected deals
        .mockResolvedValueOnce(allDeals); // Second call for all deals

      const requestBody = {
        dealIds: [1, 2],
        changes: {
          sales_rep_name: "Charlie Brown",
        },
      };

      const request = new NextRequest("http://localhost:3000/api/deals/preview-bulk", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await PreviewBulkPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.totalDeals).toBe(2);
      expect(data.summary.totalValue).toBe(125000);
      expect(data.summary.changeTypes).toEqual(["sales_rep"]);
      expect(data.summary.affectedReps).toContain("Charlie Brown");
      expect(data.conflicts).toBeDefined();
      expect(data.warnings).toBeDefined();
    });

    it("should generate preview for multiple deals with same rep", async () => {
      const selectedDeals = [mockDeals[0], mockDeals[2]];
      const allDeals = [...mockDeals];

      mockDealRepository.find
        .mockResolvedValueOnce(selectedDeals)
        .mockResolvedValueOnce(allDeals);

      const requestBody = {
        dealIds: [1, 3],
        changes: {
          sales_rep_name: "Diana Prince",
        },
      };

      const request = new NextRequest("http://localhost:3000/api/deals/preview-bulk", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await PreviewBulkPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.totalDeals).toBe(2);
      expect(data.summary.changeTypes).toEqual(["sales_rep"]);
    });

    it("should detect conflicts for overloaded reps", async () => {
      // Create a scenario where the new rep would be overloaded
      const heavyDeals = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        deal_id: `DEAL-${String(i + 1).padStart(3, "0")}`,
        sales_rep: "Overloaded Rep",
        territory: "Test Territory",
        value: 60000,
        stage: "prospect",
      }));

      const selectedDeals = [mockDeals[0]];
      const allDeals = [...heavyDeals, ...mockDeals];

      mockDealRepository.find
        .mockResolvedValueOnce(selectedDeals)
        .mockResolvedValueOnce(allDeals);

      const requestBody = {
        dealIds: [1],
        changes: {
          sales_rep: "Overloaded Rep", // This rep already has 10 deals
        },
      };

      const request = new NextRequest("http://localhost:3000/api/deals/preview-bulk", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await PreviewBulkPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.conflicts).toHaveLength(1);
      expect(data.conflicts[0].type).toBe("overload");
      expect(data.conflicts[0].rep).toBe("Overloaded Rep");
    });

    it("should detect workload warnings for significant changes", async () => {
      const selectedDeals = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        deal_id: `DEAL-${String(i + 1).padStart(3, "0")}`,
        sales_rep: "Alice Johnson",
        territory: "West Coast",
        value: 50000,
        stage: "prospect",
      }));

      const allDeals = [...selectedDeals, ...mockDeals];

      mockDealRepository.find
        .mockResolvedValueOnce(selectedDeals)
        .mockResolvedValueOnce(allDeals);

      const requestBody = {
        dealIds: [1, 2, 3, 4, 5],
        changes: {
          sales_rep: "New Rep",
        },
      };

      const request = new NextRequest("http://localhost:3000/api/deals/preview-bulk", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await PreviewBulkPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.warnings.length).toBeGreaterThan(0);
      expect(data.warnings.some((w: any) => w.type === "workload_shift")).toBe(true);
    });

    it("should reject invalid request data", async () => {
      const requestBody = {
        dealIds: [], // Empty array
        changes: {
          sales_rep_name: "Test Rep",
        },
      };

      const request = new NextRequest("http://localhost:3000/api/deals/preview-bulk", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await PreviewBulkPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request data");
    });

    it("should reject request with no sales rep", async () => {
      const requestBody = {
        dealIds: [1, 2],
        changes: {
          sales_rep_name: "", // Empty sales rep
        },
      };

      const request = new NextRequest("http://localhost:3000/api/deals/preview-bulk", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await PreviewBulkPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request data");
    });

    it("should handle missing deals", async () => {
      mockDealRepository.find.mockResolvedValueOnce([mockDeals[0]]); // Only one deal found

      const requestBody = {
        dealIds: [1, 999], // 999 doesn't exist
        changes: {
          sales_rep_name: "Test Rep",
        },
      };

      const request = new NextRequest("http://localhost:3000/api/deals/preview-bulk", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await PreviewBulkPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("Deals not found: 999");
    });
  });

  describe("POST /api/deals/bulk-reassign", () => {
    it("should successfully execute bulk sales rep reassignment", async () => {
      const selectedDeals = [
        { ...mockDeals[0] },
        { ...mockDeals[1] },
      ];

      mockDealRepository.find.mockResolvedValue(selectedDeals);
      mockDealRepository.save.mockResolvedValue(selectedDeals);
      mockAuditRepository.create.mockImplementation((entry) => entry);
      mockAuditRepository.save.mockResolvedValue([]);

      const requestBody = {
        dealIds: [1, 2],
        changes: {
          sales_rep_name: "New Sales Rep",
        },
        reason: "Q4 territory rebalancing",
        changed_by: "Manager User",
      };

      const request = new NextRequest("http://localhost:3000/api/deals/bulk-reassign", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await BulkReassignPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Bulk reassignment completed successfully");
      expect(data.updatedDeals).toBe(2);
      expect(data.auditEntries).toBe(2);
      expect(data.batchId).toBeDefined();
      expect(data.batchId).toMatch(/^bulk-\d+-[a-z0-9]+$/);
      
      // Verify audit entries were created
      expect(mockAuditRepository.create).toHaveBeenCalledTimes(2);
      expect(mockAuditRepository.save).toHaveBeenCalled();
      
      // Verify deals were updated
      expect(mockDealRepository.save).toHaveBeenCalled();
    });

    it("should successfully execute single sales rep reassignment", async () => {
      const selectedDeals = [{ ...mockDeals[0] }];

      mockDealRepository.find.mockResolvedValue(selectedDeals);
      mockDealRepository.save.mockResolvedValue(selectedDeals);
      mockAuditRepository.create.mockImplementation((entry) => entry);
      mockAuditRepository.save.mockResolvedValue([]);

      const requestBody = {
        dealIds: [1],
        changes: {
          sales_rep_name: "New Sales Rep",
        },
        reason: "Workload rebalancing",
        changed_by: "Admin User",
      };

      const request = new NextRequest("http://localhost:3000/api/deals/bulk-reassign", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await BulkReassignPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.updatedDeals).toBe(1);
      expect(data.auditEntries).toBe(1);
      
      // Verify audit entry has correct batch ID format
      const auditCall = mockAuditRepository.create.mock.calls[0][0];
      expect(auditCall.reason).toContain("Workload rebalancing (Batch:");
      expect(auditCall.changeType).toBe("bulk");
      expect(auditCall.fieldChanged).toBe("sales_rep");
    });

    it("should handle deals with no changes needed", async () => {
      const selectedDeals = [
        {
          ...mockDeals[0],
          sales_rep: "Existing Rep", // Same as the change
        },
      ];

      mockDealRepository.find.mockResolvedValue(selectedDeals);
      mockDealRepository.save.mockResolvedValue([]);
      mockAuditRepository.save.mockResolvedValue([]);

      const requestBody = {
        dealIds: [1],
        changes: {
          sales_rep: "Existing Rep", // No change needed
        },
        reason: "Test update",
        changed_by: "Test User",
      };

      const request = new NextRequest("http://localhost:3000/api/deals/bulk-reassign", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await BulkReassignPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.updatedDeals).toBe(0); // No deals actually updated
      expect(data.auditEntries).toBe(0); // No audit entries created
    });

    it("should reject invalid request data", async () => {
      const requestBody = {
        dealIds: [],
        changes: {
          sales_rep_name: "Test Rep",
        },
        reason: "Test",
      };

      const request = new NextRequest("http://localhost:3000/api/deals/bulk-reassign", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await BulkReassignPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request data");
    });

    it("should reject request without reason", async () => {
      const requestBody = {
        dealIds: [1, 2],
        changes: {
          sales_rep_name: "Test Rep",
        },
        reason: "", // Empty reason
      };

      const request = new NextRequest("http://localhost:3000/api/deals/bulk-reassign", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await BulkReassignPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request data");
    });

    it("should reject request with empty sales rep", async () => {
      const requestBody = {
        dealIds: [1, 2],
        changes: {
          sales_rep_name: "",
        },
        reason: "Test update",
      };

      const request = new NextRequest("http://localhost:3000/api/deals/bulk-reassign", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await BulkReassignPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request data");
    });

    it("should handle missing deals", async () => {
      mockDealRepository.find.mockResolvedValue([mockDeals[0]]); // Only one deal found

      const requestBody = {
        dealIds: [1, 999], // 999 doesn't exist
        changes: {
          sales_rep_name: "Test Rep",
        },
        reason: "Test update",
      };

      const request = new NextRequest("http://localhost:3000/api/deals/bulk-reassign", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await BulkReassignPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("Deals not found: 999");
    });

    it("should handle database errors gracefully", async () => {
      mockDealRepository.find.mockRejectedValue(new Error("Database connection failed"));

      const requestBody = {
        dealIds: [1, 2],
        changes: {
          sales_rep_name: "Test Rep",
        },
        reason: "Test update",
      };

      const request = new NextRequest("http://localhost:3000/api/deals/bulk-reassign", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await BulkReassignPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});