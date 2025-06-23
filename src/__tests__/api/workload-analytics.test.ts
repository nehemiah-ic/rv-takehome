/**
 * @jest-environment node
 */
import { GET } from "../../app/api/workload-analytics/route";
import { initializeDataSource } from "../../data-source";
import { Deal } from "../../lib/entities/deals/Deal";

// Mock the data source
jest.mock("../../data-source");
const mockInitializeDataSource = initializeDataSource as jest.MockedFunction<typeof initializeDataSource>;

// Mock fetch for sales reps API
global.fetch = jest.fn();

describe("/api/workload-analytics", () => {
  const mockSalesReps = [
    { id: 1, name: "Alice Smith", email: "alice@test.com", territory: "West", active: true },
    { id: 2, name: "Bob Johnson", email: "bob@test.com", territory: "East", active: true },
    { id: 3, name: "Sarah Johnson", email: "sarah@test.com", territory: "Central", active: true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return workload analytics with all available reps", async () => {
      const mockDeals: Partial<Deal>[] = [
        {
          id: 1,
          deal_id: "RV-001",
          sales_rep_id: 1,
          sales_rep: mockSalesReps[0],
          value: 50000,
          territory: "West Coast",
          stage: "proposal",
        },
        {
          id: 2,
          deal_id: "RV-002", 
          sales_rep_id: 1,
          sales_rep: mockSalesReps[0],
          value: 30000,
          territory: "West Coast",
          stage: "negotiation",
        },
        {
          id: 3,
          deal_id: "RV-003",
          sales_rep_id: 2,
          sales_rep: mockSalesReps[1],
          value: 75000,
          territory: "East Coast",
          stage: "qualified",
        },
      ];

      const mockDealRepository = {
        find: jest.fn().mockResolvedValue(mockDeals),
      };
      const mockSalesRepRepository = {
        find: jest.fn().mockResolvedValue(mockSalesReps),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity.name === 'Deal') return mockDealRepository;
          if (entity.name === 'SalesRep') return mockSalesRepRepository;
          return mockDealRepository;
        }),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.totalReps).toBe(3); // All available reps
      expect(data.summary.totalDeals).toBe(3);
      expect(data.summary.avgDealsPerRep).toBe(1); // 3 deals / 3 reps
      expect(data.repWorkloads).toHaveLength(3);

      // Check Alice Smith (2 deals)
      const alice = data.repWorkloads.find((rep: any) => rep.salesRep === "Alice Smith");
      expect(alice.dealCount).toBe(2);
      expect(alice.totalValue).toBe(80000);
      expect(alice.avgDealValue).toBe(40000);
      expect(alice.utilizationLevel).toBe("under"); // Low deal count

      // Check Bob Johnson (1 deal)
      const bob = data.repWorkloads.find((rep: any) => rep.salesRep === "Bob Johnson");
      expect(bob.dealCount).toBe(1);
      expect(bob.totalValue).toBe(75000);
      expect(bob.avgDealValue).toBe(75000);

      // Check Sarah Johnson (0 deals)
      const sarah = data.repWorkloads.find((rep: any) => rep.salesRep === "Sarah Johnson");
      expect(sarah.dealCount).toBe(0);
      expect(sarah.totalValue).toBe(0);
      expect(sarah.avgDealValue).toBe(0);
      expect(sarah.utilizationLevel).toBe("under");
    });

    it("should correctly classify utilization levels", async () => {
      const testSalesReps = [
        { id: 4, name: "Overloaded Rep", email: "overloaded@test.com", territory: "North", active: true },
        { id: 5, name: "High Value Rep", email: "highvalue@test.com", territory: "South", active: true },
        { id: 1, name: "Alice Smith", email: "alice@test.com", territory: "West", active: true },
      ];

      const mockDeals: Partial<Deal>[] = [
        // Overloaded rep - high deal count
        ...Array.from({ length: 8 }, (_, i) => ({
          id: i + 1,
          deal_id: `RV-00${i + 1}`,
          sales_rep_id: 4, 
          sales_rep: testSalesReps[0],
          value: 25000,
          territory: "West Coast",
          stage: "proposal",
        })),
        // High value rep
        {
          id: 20,
          deal_id: "RV-020",
          sales_rep_id: 5, 
          sales_rep: testSalesReps[1],
          value: 250000,
          territory: "East Coast", 
          stage: "negotiation",
        },
        // High avg deal size rep  
        {
          id: 21,
          deal_id: "RV-021",
          sales_rep_id: 1, 
          sales_rep: testSalesReps[2],
          value: 60000,
          territory: "Midwest",
          stage: "proposal",
        },
        // Additional deal for High Avg Rep to ensure proper avg calculation
        {
          id: 22,
          deal_id: "RV-022", 
          sales_rep_id: 1, 
          sales_rep: testSalesReps[2],
          value: 40000,
          territory: "Midwest",
          stage: "qualified",
        },
      ];

      const mockDealRepository = {
        find: jest.fn().mockResolvedValue(mockDeals),
      };
      const mockSalesRepRepository = {
        find: jest.fn().mockResolvedValue(testSalesReps),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity.name === 'Deal') return mockDealRepository;
          if (entity.name === 'SalesRep') return mockSalesRepRepository;
          return mockDealRepository;
        }),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);

      // Check overloaded rep (8+ deals)
      const overloaded = data.repWorkloads.find((rep: any) => rep.salesRep === "Overloaded Rep");
      expect(overloaded).toBeTruthy();
      expect(overloaded.utilizationLevel).toBe("over");

      // Check high value rep ($250K pipeline)
      const highValue = data.repWorkloads.find((rep: any) => rep.salesRep === "High Value Rep");
      expect(highValue).toBeTruthy();
      expect(highValue.utilizationLevel).toBe("balanced");

      // Check Alice Smith (2 deals, $100K total, $50K avg)
      const alice = data.repWorkloads.find((rep: any) => rep.salesRep === "Alice Smith");
      expect(alice).toBeTruthy();
      expect(alice.totalValue).toBe(100000);
      expect(alice.avgDealValue).toBe(50000);
      expect(alice.utilizationLevel).toBe("balanced");
    });

    it("should generate appropriate recommendations", async () => {
      const testSalesReps = [
        { id: 4, name: "Overloaded Rep", email: "overloaded@test.com", territory: "North", active: true },
        { id: 5, name: "Underutilized Rep", email: "under@test.com", territory: "South", active: true },
        { id: 3, name: "Sarah Johnson", email: "sarah@test.com", territory: "Central", active: true },
      ];

      const mockDeals: Partial<Deal>[] = [
        // Overloaded rep
        ...Array.from({ length: 8 }, (_, i) => ({
          id: i + 1,
          deal_id: `RV-00${i + 1}`,
          sales_rep_id: 4, 
          sales_rep: testSalesReps[0],
          value: 25000,
          territory: "West Coast",
          stage: "proposal",
        })),
      ];

      const mockDealRepository = {
        find: jest.fn().mockResolvedValue(mockDeals),
      };
      const mockSalesRepRepository = {
        find: jest.fn().mockResolvedValue(testSalesReps),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity.name === 'Deal') return mockDealRepository;
          if (entity.name === 'SalesRep') return mockSalesRepRepository;
          return mockDealRepository;
        }),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Should have recommendations based on workload imbalance
      expect(data.recommendations).toBeDefined();
      expect(Array.isArray(data.recommendations)).toBe(true);
    });

    it("should handle empty deals array", async () => {
      const mockDealRepository = {
        find: jest.fn().mockResolvedValue([]), // Empty deals array
      };
      const mockSalesRepRepository = {
        find: jest.fn().mockResolvedValue(mockSalesReps),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity.name === 'Deal') return mockDealRepository;
          if (entity.name === 'SalesRep') return mockSalesRepRepository;
          return mockDealRepository;
        }),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.totalDeals).toBe(0);
      expect(data.summary.avgDealsPerRep).toBe(0);
      expect(data.repWorkloads).toHaveLength(3); // Still includes all available reps
      
      // All reps should have 0 deals and be underutilized
      data.repWorkloads.forEach((rep: any) => {
        expect(rep.dealCount).toBe(0);
        expect(rep.utilizationLevel).toBe("under");
      });
    });

    it("should handle database errors", async () => {
      const mockDealRepository = {
        find: jest.fn().mockRejectedValue(new Error("Database connection failed")),
      };
      const mockSalesRepRepository = {
        find: jest.fn().mockResolvedValue(mockSalesReps),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity.name === 'Deal') return mockDealRepository;
          if (entity.name === 'SalesRep') return mockSalesRepRepository;
          return mockDealRepository;
        }),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should handle sales reps API failure gracefully", async () => {
      const mockDealRepository = {
        find: jest.fn().mockResolvedValue([]),
      };
      const mockSalesRepRepository = {
        find: jest.fn().mockResolvedValue([]), // No sales reps available
      };
      const mockDataSource = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity.name === 'Deal') return mockDealRepository;
          if (entity.name === 'SalesRep') return mockSalesRepRepository;
          return mockDealRepository;
        }),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.repWorkloads).toHaveLength(0); // No reps available
    });
  });
});