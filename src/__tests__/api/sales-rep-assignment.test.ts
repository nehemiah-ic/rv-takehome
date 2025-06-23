/**
 * @jest-environment node
 */
import { PATCH } from "../../app/api/deals/[id]/sales-rep/route";
import { initializeDataSource } from "../../data-source";
import { Deal } from "../../lib/entities/deals/Deal";
import { NextRequest } from "next/server";

// Mock the data source
jest.mock("../../data-source");
const mockInitializeDataSource = initializeDataSource as jest.MockedFunction<typeof initializeDataSource>;

describe("/api/deals/[id]/sales-rep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PATCH", () => {
    it("should update deal sales rep successfully", async () => {
      const mockDeal: Partial<Deal> = {
        id: 1,
        deal_id: "RV-001",
        sales_rep: "Old Rep",
        territory: "West Coast",
        updated_date: "2023-01-01T00:00:00.000Z",
      };

      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockDeal),
        save: jest.fn().mockResolvedValue({
          ...mockDeal,
          sales_rep: "Jennifer Walsh",
        }),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/deals/1/sales-rep", {
        method: "PATCH",
        body: JSON.stringify({
          sales_rep: "Jennifer Walsh",
        }),
      });

      const response = await PATCH(request, { params: { id: "1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deal_id).toBe("RV-001");
      expect(data.sales_rep).toBe("Jennifer Walsh");
      expect(data.territory).toBe("West Coast");
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sales_rep: "Jennifer Walsh",
        })
      );
    });

    it("should return 400 for invalid deal ID", async () => {
      const request = new NextRequest("http://localhost:3000/api/deals/invalid/sales-rep", {
        method: "PATCH",
        body: JSON.stringify({
          sales_rep: "Jennifer Walsh",
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

      const request = new NextRequest("http://localhost:3000/api/deals/999/sales-rep", {
        method: "PATCH",
        body: JSON.stringify({
          sales_rep: "Jennifer Walsh",
        }),
      });

      const response = await PATCH(request, { params: { id: "999" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Deal not found");
    });

    it("should return 400 for empty sales rep", async () => {
      const request = new NextRequest("http://localhost:3000/api/deals/1/sales-rep", {
        method: "PATCH",
        body: JSON.stringify({
          sales_rep: "",
        }),
      });

      const response = await PATCH(request, { params: { id: "1" } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request data");
      expect(data.details).toBeDefined();
    });

    it("should return 400 for missing sales rep", async () => {
      const request = new NextRequest("http://localhost:3000/api/deals/1/sales-rep", {
        method: "PATCH",
        body: JSON.stringify({}),
      });

      const response = await PATCH(request, { params: { id: "1" } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request data");
    });

    it("should handle database errors", async () => {
      const mockRepository = {
        findOne: jest.fn().mockRejectedValue(new Error("Database error")),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/deals/1/sales-rep", {
        method: "PATCH",
        body: JSON.stringify({
          sales_rep: "Jennifer Walsh",
        }),
      });

      const response = await PATCH(request, { params: { id: "1" } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should update timestamp when changing sales rep", async () => {
      const mockDeal: Partial<Deal> = {
        id: 1,
        deal_id: "RV-001",
        sales_rep: "Old Rep",
        territory: "West Coast",
        updated_date: "2023-01-01T00:00:00.000Z",
      };

      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockDeal),
        save: jest.fn().mockImplementation((deal) => Promise.resolve(deal)),
      };
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockInitializeDataSource.mockResolvedValue(mockDataSource as any);

      const request = new NextRequest("http://localhost:3000/api/deals/1/sales-rep", {
        method: "PATCH",
        body: JSON.stringify({
          sales_rep: "New Rep",
        }),
      });

      await PATCH(request, { params: { id: "1" } });

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sales_rep: "New Rep",
          updated_date: expect.any(String),
        })
      );

      // Check that updated_date is a recent ISO string
      const savedDeal = mockRepository.save.mock.calls[0][0];
      const updatedDate = new Date(savedDeal.updated_date);
      const now = new Date();
      expect(updatedDate.getTime()).toBeCloseTo(now.getTime(), -3); // Within 1 second
    });
  });
});