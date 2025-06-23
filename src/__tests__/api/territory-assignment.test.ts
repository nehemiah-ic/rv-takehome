/**
 * @jest-environment node
 */
import { PATCH } from "../../app/api/deals/[id]/territory/route";
import { initializeDataSource } from "../../data-source";
import { Deal } from "../../lib/entities/deals/Deal";
import { NextRequest } from "next/server";

// Mock the data source
jest.mock("../../data-source");
const mockInitializeDataSource = initializeDataSource as jest.MockedFunction<typeof initializeDataSource>;

describe("/api/deals/[id]/territory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PATCH", () => {
    it("should update deal territory successfully", async () => {
      const mockDeal: Partial<Deal> = {
        id: 1,
        deal_id: "RV-001",
        territory: "Old Territory",
        sales_rep: "Old Rep",
        updated_date: "2023-01-01T00:00:00.000Z",
      };

      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockDeal),
        save: jest.fn().mockResolvedValue({
          ...mockDeal,
          territory: "West Coast",
          sales_rep: "New Rep",
        }),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/deals/1/territory", {
        method: "PATCH",
        body: JSON.stringify({
          territory: "West Coast",
          sales_rep: "New Rep",
        }),
      });

      const response = await PATCH(request, { params: { id: "1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deal_id).toBe("RV-001");
      expect(data.territory).toBe("West Coast");
      expect(data.sales_rep).toBe("New Rep");
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          territory: "West Coast",
          sales_rep: "New Rep",
        })
      );
    });

    it("should update only territory when sales_rep not provided", async () => {
      const mockDeal: Partial<Deal> = {
        id: 1,
        deal_id: "RV-001",
        territory: "Old Territory",
        sales_rep: "Existing Rep",
        updated_date: "2023-01-01T00:00:00.000Z",
      };

      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockDeal),
        save: jest.fn().mockResolvedValue({
          ...mockDeal,
          territory: "East Coast",
        }),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/deals/1/territory", {
        method: "PATCH",
        body: JSON.stringify({
          territory: "East Coast",
        }),
      });

      const response = await PATCH(request, { params: { id: "1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.territory).toBe("East Coast");
      expect(data.sales_rep).toBe("Existing Rep");
    });

    it("should return 400 for invalid deal ID", async () => {
      const request = new NextRequest("http://localhost:3000/api/deals/invalid/territory", {
        method: "PATCH",
        body: JSON.stringify({
          territory: "New Territory",
        }),
      });

      const response = await PATCH(request, { params: { id: "invalid" } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid deal ID");
    });

    it("should return 404 for non-existent deal", async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(null),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/deals/999/territory", {
        method: "PATCH",
        body: JSON.stringify({
          territory: "Midwest",
        }),
      });

      const response = await PATCH(request, { params: { id: "999" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Deal not found");
    });

    it("should return 400 for invalid request data", async () => {
      const request = new NextRequest("http://localhost:3000/api/deals/1/territory", {
        method: "PATCH",
        body: JSON.stringify({
          territory: "", // Empty territory should fail validation
        }),
      });

      const response = await PATCH(request, { params: { id: "1" } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request data");
      expect(data.details).toBeDefined();
    });
  });
});