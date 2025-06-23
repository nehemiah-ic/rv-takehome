import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import PipelineFunnel from "../../components/PipelineFunnel";

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("PipelineFunnel", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("renders loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<PipelineFunnel />);

    // Check for loading spinner by class name since it doesn't have a role
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders pipeline data correctly", async () => {
    const mockData = {
      totalDeals: 10,
      stageAnalytics: {
        prospect: { deals: [], count: 3, percentage: 30 },
        qualified: { deals: [], count: 2, percentage: 20 },
        proposal: { deals: [], count: 2, percentage: 20 },
        negotiation: { deals: [], count: 2, percentage: 20 },
        closed_won: { deals: [], count: 1, percentage: 10 },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    render(<PipelineFunnel />);

    await waitFor(() => {
      expect(screen.getByText("Total Deals: 10")).toBeInTheDocument();
    });

    // Check for lowercase stage names as they appear in the component
    expect(screen.getByText("prospect")).toBeInTheDocument();
    expect(screen.getByText("qualified")).toBeInTheDocument();
    expect(screen.getByText("proposal")).toBeInTheDocument();
    expect(screen.getByText("negotiation")).toBeInTheDocument();
    expect(screen.getByText("closed won")).toBeInTheDocument();

    // Check for deal counts and percentages - use getAllByText for duplicates
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getAllByText("2")).toHaveLength(3); // qualified, proposal, negotiation
    expect(screen.getAllByText("20%")).toHaveLength(3);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
  });

  it("renders error state when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<PipelineFunnel />);

    await waitFor(() => {
      expect(
        screen.getByText(/Error loading pipeline data/)
      ).toBeInTheDocument();
    });
  });

  it("renders empty state when no data", async () => {
    const mockData = {
      totalDeals: 0,
      stageAnalytics: {},
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    render(<PipelineFunnel />);

    await waitFor(() => {
      expect(screen.getByText("Total Deals: 0")).toBeInTheDocument();
    });

    // The component shows "Total Deals: 0" but no specific "No pipeline data available" message
    expect(screen.getByText("Total Deals: 0")).toBeInTheDocument();
  });

  it("handles API error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    render(<PipelineFunnel />);

    await waitFor(() => {
      expect(
        screen.getByText(/Error loading pipeline data/)
      ).toBeInTheDocument();
    });
  });

  it("displays stage information correctly", async () => {
    const mockData = {
      totalDeals: 5,
      stageAnalytics: {
        prospect: { deals: [], count: 1, percentage: 20 },
        qualified: { deals: [], count: 1, percentage: 20 },
        proposal: { deals: [], count: 1, percentage: 20 },
        negotiation: { deals: [], count: 1, percentage: 20 },
        closed_won: { deals: [], count: 1, percentage: 20 },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    render(<PipelineFunnel />);

    await waitFor(() => {
      expect(screen.getByText("Total Deals: 5")).toBeInTheDocument();
    });

    // Check that all stages are displayed (lowercase)
    expect(screen.getByText("prospect")).toBeInTheDocument();
    expect(screen.getByText("qualified")).toBeInTheDocument();
    expect(screen.getByText("proposal")).toBeInTheDocument();
    expect(screen.getByText("negotiation")).toBeInTheDocument();
    expect(screen.getByText("closed won")).toBeInTheDocument();

    // Check that counts and percentages are displayed
    expect(screen.getAllByText("1")).toHaveLength(5);
    expect(screen.getAllByText("20%")).toHaveLength(5);
  });

  it("handles closed_lost stage correctly", async () => {
    const mockData = {
      totalDeals: 2,
      stageAnalytics: {
        closed_won: { deals: [], count: 1, percentage: 50 },
        closed_lost: { deals: [], count: 1, percentage: 50 },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    render(<PipelineFunnel />);

    await waitFor(() => {
      expect(screen.getByText("Total Deals: 2")).toBeInTheDocument();
    });

    expect(screen.getByText("closed won")).toBeInTheDocument();
    expect(screen.getByText("closed lost")).toBeInTheDocument();
    expect(screen.getAllByText("1")).toHaveLength(2);
    expect(screen.getAllByText("50%")).toHaveLength(2);
  });

  it("displays correct visual structure", async () => {
    const mockData = {
      totalDeals: 3,
      stageAnalytics: {
        prospect: { deals: [], count: 2, percentage: 67 },
        qualified: { deals: [], count: 1, percentage: 33 },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    render(<PipelineFunnel />);

    await waitFor(() => {
      expect(screen.getByText("Total Deals: 3")).toBeInTheDocument();
    });

    // Check that the bars have the correct width styles
    const prospectBar = screen.getByText("2").closest("div");
    const qualifiedBar = screen.getByText("1").closest("div");

    expect(prospectBar).toHaveStyle("width: 67%");
    expect(qualifiedBar).toHaveStyle("width: 33%");
  });
});
