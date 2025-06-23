import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import PerformanceMetrics from "../../components/PerformanceMetrics";

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("PerformanceMetrics", () => {
  const mockSalesReps = {
    alice: { id: 1, name: "Alice Johnson", email: "alice@test.com", territory: "West", active: true },
    bob: { id: 2, name: "Bob Smith", email: "bob@test.com", territory: "East", active: true },
    john: { id: 3, name: "John Doe", email: "john@test.com", territory: "Central", active: true },
    jane: { id: 4, name: "Jane Smith", email: "jane@test.com", territory: "North", active: true },
    bobW: { id: 5, name: "Bob Wilson", email: "bobw@test.com", territory: "South", active: true },
    charlie: { id: 6, name: "Charlie Brown", email: "charlie@test.com", territory: "West", active: true },
    eve: { id: 7, name: "Eve Davis", email: "eve@test.com", territory: "East", active: true },
  };
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const mockPipelineData = {
    totalDeals: 10,
    stageAnalytics: {
      prospect: {
        deals: [
          {
            id: 1,
            deal_id: "DEAL-001",
            value: 50000,
            probability: 75,
            sales_rep_id: 6, sales_rep: mockSalesReps.john,
            transportation_mode: "trucking",
          },
          {
            id: 2,
            deal_id: "DEAL-002",
            value: 30000,
            probability: 60,
            sales_rep_id: 1, sales_rep: mockSalesReps.jane,
            transportation_mode: "rail",
          },
        ],
        count: 2,
        percentage: 20,
      },
      qualified: {
        deals: [
          {
            id: 3,
            deal_id: "DEAL-003",
            value: 75000,
            probability: 80,
            sales_rep_id: 3, sales_rep: mockSalesReps.john,
            transportation_mode: "ocean",
          },
        ],
        count: 1,
        percentage: 10,
      },
      proposal: {
        deals: [
          {
            id: 4,
            deal_id: "DEAL-004",
            value: 100000,
            probability: 90,
            sales_rep_id: 3, sales_rep: mockSalesReps.jane,
            transportation_mode: "air",
          },
        ],
        count: 1,
        percentage: 10,
      },
      negotiation: {
        deals: [
          {
            id: 5,
            deal_id: "DEAL-005",
            value: 80000,
            probability: 85,
            sales_rep_id: 5, sales_rep: mockSalesReps.bobW,
            transportation_mode: "trucking",
          },
        ],
        count: 1,
        percentage: 10,
      },
      closed_won: {
        deals: [
          {
            id: 6,
            deal_id: "DEAL-006",
            value: 120000,
            probability: 100,
            sales_rep_id: 2, sales_rep: mockSalesReps.john,
            transportation_mode: "rail",
          },
          {
            id: 7,
            deal_id: "DEAL-007",
            value: 90000,
            probability: 100,
            sales_rep_id: 7, sales_rep: mockSalesReps.jane,
            transportation_mode: "ocean",
          },
        ],
        count: 2,
        percentage: 20,
      },
      closed_lost: {
        deals: [
          {
            id: 8,
            deal_id: "DEAL-008",
            value: 60000,
            probability: 0,
            sales_rep_id: 3, sales_rep: mockSalesReps.bobW,
            transportation_mode: "air",
          },
          {
            id: 9,
            deal_id: "DEAL-009",
            value: 40000,
            probability: 0,
            sales_rep_id: 3, sales_rep: mockSalesReps.alice,
            transportation_mode: "trucking",
          },
          {
            id: 10,
            deal_id: "DEAL-010",
            value: 70000,
            probability: 0,
            sales_rep_id: 4, sales_rep: mockSalesReps.alice,
            transportation_mode: "rail",
          },
        ],
        count: 3,
        percentage: 30,
      },
    },
  };

  it("renders loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<PerformanceMetrics />);

    // Check for loading spinner
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders error state when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<PerformanceMetrics />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading metrics/)).toBeInTheDocument();
    });
  });

  it("renders no data state when no data available", async () => {
    const emptyData = {
      totalDeals: 0,
      stageAnalytics: {},
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyData,
    } as Response);

    render(<PerformanceMetrics />);

    await waitFor(() => {
      expect(screen.getByText("Total Pipeline Value")).toBeInTheDocument();
    });

    // Component shows metric cards with zero values instead of "No data available"
    expect(screen.getAllByText("$0")).toHaveLength(3); // Total Pipeline Value, Average Deal Size, Weighted Pipeline
    expect(screen.getByText("0.0%")).toBeInTheDocument(); // Win Rate
    expect(screen.getByText("0")).toBeInTheDocument(); // Total Deals
    expect(screen.getByText("N/A")).toBeInTheDocument(); // Top Sales Rep
    expect(screen.getByText("$0 in deals")).toBeInTheDocument(); // Top Sales Rep description
  });

  it("calculates and displays total pipeline value correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPipelineData,
    } as Response);

    render(<PerformanceMetrics />);

    await waitFor(() => {
      expect(screen.getByText("Total Pipeline Value")).toBeInTheDocument();
    });

    // Total value: 50000 + 30000 + 75000 + 100000 + 80000 + 120000 + 90000 + 60000 + 40000 + 70000 = 715000
    expect(screen.getByText("$715,000")).toBeInTheDocument();
  });

  it("calculates and displays win rate correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPipelineData,
    } as Response);

    render(<PerformanceMetrics />);

    await waitFor(() => {
      expect(screen.getByText("Win Rate")).toBeInTheDocument();
    });

    // Win rate: 2 closed_won / (2 closed_won + 3 closed_lost) = 2/5 = 40%
    expect(screen.getByText("40.0%")).toBeInTheDocument();
  });

  it("calculates and displays average deal size correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPipelineData,
    } as Response);

    render(<PerformanceMetrics />);

    await waitFor(() => {
      expect(screen.getByText("Average Deal Size")).toBeInTheDocument();
    });

    // Average: 715000 / 10 = 71500
    expect(screen.getByText("$71,500")).toBeInTheDocument();
  });

  it("calculates and displays weighted pipeline value correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPipelineData,
    } as Response);

    render(<PerformanceMetrics />);

    await waitFor(() => {
      expect(screen.getByText("Weighted Pipeline")).toBeInTheDocument();
    });

    // Weighted value calculation:
    // (50000*0.75) + (30000*0.60) + (75000*0.80) + (100000*0.90) + (80000*0.85) + (120000*1.00) + (90000*1.00) + (60000*0) + (40000*0) + (70000*0)
    // = 37500 + 18000 + 60000 + 90000 + 68000 + 120000 + 90000 + 0 + 0 + 0 = 483500
    expect(screen.getByText("$483,500")).toBeInTheDocument();
  });

  it("displays total deals count correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPipelineData,
    } as Response);

    render(<PerformanceMetrics />);

    await waitFor(() => {
      expect(screen.getByText("Total Deals")).toBeInTheDocument();
    });

    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("identifies and displays top sales rep correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPipelineData,
    } as Response);

    render(<PerformanceMetrics />);

    await waitFor(() => {
      expect(screen.getByText("Top Sales Rep")).toBeInTheDocument();
    });

    // John Doe: 50000 + 75000 + 120000 = 245000
    // Jane Smith: 30000 + 100000 + 90000 = 220000
    // Bob Wilson: 80000 + 60000 = 140000
    // Alice Brown: 40000
    // Charlie Davis: 70000
    // Top should be John Doe with $245,000
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("$245,000 in deals")).toBeInTheDocument();
  });

  it("displays transportation mode breakdown correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPipelineData,
    } as Response);

    render(<PerformanceMetrics />);

    await waitFor(() => {
      expect(
        screen.getByText("Deals by Transportation Mode")
      ).toBeInTheDocument();
    });

    // Count by mode:
    // trucking: DEAL-001, DEAL-005, DEAL-009 = 3
    // rail: DEAL-002, DEAL-006, DEAL-010 = 3
    // ocean: DEAL-003, DEAL-007 = 2
    // air: DEAL-004, DEAL-008 = 2
    expect(screen.getAllByText("3")).toHaveLength(2); // trucking and rail
    expect(screen.getAllByText("2")).toHaveLength(2); // ocean and air
    expect(screen.getByText("trucking")).toBeInTheDocument();
    expect(screen.getByText("rail")).toBeInTheDocument();
    expect(screen.getByText("ocean")).toBeInTheDocument();
    expect(screen.getByText("air")).toBeInTheDocument();
  });

  it("handles API error response correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    render(<PerformanceMetrics />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading metrics/)).toBeInTheDocument();
    });
  });

  it("displays all metric cards with correct icons and descriptions", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPipelineData,
    } as Response);

    render(<PerformanceMetrics />);

    await waitFor(() => {
      expect(screen.getByText("Total Pipeline Value")).toBeInTheDocument();
    });

    // Check all metric card titles
    expect(screen.getByText("Total Pipeline Value")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("Average Deal Size")).toBeInTheDocument();
    expect(screen.getByText("Weighted Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Total Deals")).toBeInTheDocument();
    expect(screen.getByText("Top Sales Rep")).toBeInTheDocument();

    // Check descriptions
    expect(screen.getByText("Total value of all deals")).toBeInTheDocument();
    expect(screen.getByText("Closed won vs closed lost")).toBeInTheDocument();
    expect(screen.getByText("Average value per deal")).toBeInTheDocument();
    expect(
      screen.getByText("Pipeline value × probability")
    ).toBeInTheDocument();
    expect(screen.getByText("Total number of deals")).toBeInTheDocument();
  });

  it("handles edge case with no closed deals for win rate", async () => {
    const dataWithNoClosedDeals = {
      totalDeals: 3,
      stageAnalytics: {
        prospect: {
          deals: [
            {
              id: 1,
              deal_id: "DEAL-001",
              value: 50000,
              probability: 75,
              sales_rep_id: 3, sales_rep: mockSalesReps.john,
              transportation_mode: "trucking",
            },
          ],
          count: 1,
          percentage: 33,
        },
        qualified: {
          deals: [
            {
              id: 2,
              deal_id: "DEAL-002",
              value: 30000,
              probability: 60,
              sales_rep_id: 7, sales_rep: mockSalesReps.jane,
              transportation_mode: "rail",
            },
          ],
          count: 1,
          percentage: 33,
        },
        proposal: {
          deals: [
            {
              id: 3,
              deal_id: "DEAL-003",
              value: 75000,
              probability: 80,
              sales_rep_id: 6, sales_rep: mockSalesReps.bobW,
              transportation_mode: "ocean",
            },
          ],
          count: 1,
          percentage: 33,
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => dataWithNoClosedDeals,
    } as Response);

    render(<PerformanceMetrics />);

    await waitFor(() => {
      expect(screen.getByText("Win Rate")).toBeInTheDocument();
    });

    // Win rate should be 0% when no deals are closed
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });
});
