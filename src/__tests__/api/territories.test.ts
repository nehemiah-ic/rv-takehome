/**
 * @jest-environment node
 */
import { GET } from "../../app/api/territories/route";
import { initializeDataSource } from "../../data-source";
import { Deal } from "../../lib/entities/deals/Deal";

// Mock the data source
jest.mock("../../data-source");
const mockInitializeDataSource = initializeDataSource as jest.MockedFunction<typeof initializeDataSource>;

describe("/api/territories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return territory analytics with correct grouping", async () => {
      // Mock deals data with proper sales_rep entity structure
      const mockDeals: Partial<Deal>[] = [
        {
          id: 1,
          deal_id: "RV-001",
          territory: "West Coast",
          sales_rep: { id: 1, name: "Mike Rodriguez", email: "mike@test.com", territory: "West", active: true },
          value: 45000,
          probability: 70,
          stage: "proposal",
        },
        {
          id: 2,
          deal_id: "RV-002",
          territory: "West Coast",
          sales_rep: { id: 1, name: "Mike Rodriguez", email: "mike@test.com", territory: "West", active: true },
          value: 25000,
          probability: 60,
          stage: "negotiation",
        },
        {
          id: 3,
          deal_id: "RV-003",
          territory: "East Coast",
          sales_rep: { id: 2, name: "Jennifer Walsh", email: "jennifer@test.com", territory: "East", active: true },
          value: 75000,
          probability: 30,
          stage: "prospect",
        },
        {
          id: 4,
          deal_id: "RV-004",
          territory: undefined, // Unassigned
          sales_rep: { id: 3, name: "Tom Wilson", email: "tom@test.com", territory: "Central", active: true },
          value: 28000,
          probability: 60,
          stage: "qualified",
        },
      ];

      const mockRepository = {
        find: jest.fn().mockResolvedValue(mockDeals),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalDeals).toBe(4);
      expect(data.territories).toHaveLength(3); // West Coast, East Coast, Unassigned

      // Check West Coast territory
      const westCoast = data.territories.find((t: any) => t.territory === "West Coast");
      expect(westCoast).toBeDefined();
      expect(westCoast.totalDeals).toBe(2);
      expect(westCoast.totalValue).toBe(70000);
      expect(westCoast.avgProbability).toBe(65); // (70 + 60) / 2
      expect(westCoast.repCount).toBe(1);
      expect(westCoast.salesReps).toContain("Mike Rodriguez");

      // Check Unassigned territory
      const unassigned = data.territories.find((t: any) => t.territory === "Unassigned");
      expect(unassigned).toBeDefined();
      expect(unassigned.totalDeals).toBe(1);
      expect(unassigned.totalValue).toBe(28000);
    });

    it("should handle empty deals array", async () => {
      const mockRepository = {
        find: jest.fn().mockResolvedValue([]),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalDeals).toBe(0);
      expect(data.territories).toHaveLength(0);
    });

    it("should handle database errors", async () => {
      const mockRepository = {
        find: jest.fn().mockRejectedValue(new Error("Database error")),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});