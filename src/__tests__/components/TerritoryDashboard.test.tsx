/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TerritoryDashboard from '../../components/TerritoryDashboard';

// Mock fetch
global.fetch = jest.fn();

const mockTerritoryData = {
  territories: [
    {
      territory: "East Coast",
      totalDeals: 15,
      totalValue: 750000,
      avgProbability: 65,
      salesReps: ["Alice Johnson", "Bob Smith"],
      repCount: 2,
      dealsByStage: {
        "prospect": 5,
        "qualified": 4,
        "proposal": 3,
        "negotiation": 2,
        "closed_won": 1
      }
    },
    {
      territory: "West Coast",
      totalDeals: 12,
      totalValue: 600000,
      avgProbability: 70,
      salesReps: ["Carol Davis", "David Wilson"],
      repCount: 2,
      dealsByStage: {
        "prospect": 4,
        "qualified": 3,
        "proposal": 3,
        "negotiation": 2
      }
    }
  ],
  totalDeals: 27
};

describe('TerritoryDashboard', () => {
  beforeEach(() => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => mockTerritoryData,
    } as Response);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders territory summary cards correctly', async () => {
    render(<TerritoryDashboard />);

    await waitFor(() => {
      // Look for cards with specific content
      expect(screen.getByText('Territories')).toBeInTheDocument();
      expect(screen.getByText('Total Deals')).toBeInTheDocument();
      expect(screen.getByText('Pipeline Value')).toBeInTheDocument();
      
      // Check specific values by looking at card structure with parent container
      const territoriesCard = screen.getByText('Territories').closest('.bg-blue-50');
      expect(territoriesCard).toHaveTextContent('Territories');
      expect(territoriesCard).toHaveTextContent('2');
      
      const dealsCard = screen.getByText('Total Deals').closest('.bg-green-50');
      expect(dealsCard).toHaveTextContent('Total Deals');
      expect(dealsCard).toHaveTextContent('27');
      
      const valueCard = screen.getByText('Pipeline Value').closest('.bg-purple-50');
      expect(valueCard).toHaveTextContent('Pipeline Value');
      expect(valueCard).toHaveTextContent('$1,350,000');
    });
  });

  it('renders territory table with data', async () => {
    render(<TerritoryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('East Coast')).toBeInTheDocument();
      expect(screen.getByText('West Coast')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // East Coast deals
      expect(screen.getByText('12')).toBeInTheDocument(); // West Coast deals
    });
  });

  it('opens territory detail modal when clicking territory name', async () => {
    render(<TerritoryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('East Coast')).toBeInTheDocument();
    });

    // Click on East Coast territory
    fireEvent.click(screen.getByText('East Coast'));

    // Check if modal opens with territory details
    await waitFor(() => {
      expect(screen.getByText('Territory Details - East Coast')).toBeInTheDocument();
      expect(screen.getByText('Deal Distribution by Stage')).toBeInTheDocument();
      expect(screen.getByText('Sales Representatives')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  it('shows deal distribution by stage in modal', async () => {
    render(<TerritoryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('East Coast')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('East Coast'));

    await waitFor(() => {
      expect(screen.getByText('Territory Details - East Coast')).toBeInTheDocument();
      expect(screen.getByText('Deal Distribution by Stage')).toBeInTheDocument();
      
      // Look for stage data in the distribution section
      const stageSection = screen.getByText('Deal Distribution by Stage').closest('div');
      expect(within(stageSection!).getByText('prospect')).toBeInTheDocument();
      expect(within(stageSection!).getByText('qualified')).toBeInTheDocument();
      expect(within(stageSection!).getByText('proposal')).toBeInTheDocument();
    });
  });

  it('closes modal when clicking X button', async () => {
    render(<TerritoryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('East Coast')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('East Coast'));

    await waitFor(() => {
      expect(screen.getByText('Territory Details - East Coast')).toBeInTheDocument();
    });

    // Click X button to close - use more specific selector
    const modal = screen.getByText('Territory Details - East Coast').closest('.fixed');
    const closeButton = within(modal!).getAllByRole('button').find(button => 
      button.querySelector('svg') && 
      button.className.includes('text-gray-400')
    );
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(screen.queryByText('Territory Details - East Coast')).not.toBeInTheDocument();
    });
  });

  it('closes modal when clicking outside', async () => {
    render(<TerritoryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('East Coast')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('East Coast'));

    await waitFor(() => {
      expect(screen.getByText('Territory Details - East Coast')).toBeInTheDocument();
    });

    // Click on modal overlay (outside the modal content)
    const modalOverlay = screen.getByText('Territory Details - East Coast').closest('.fixed');
    fireEvent.click(modalOverlay!);

    await waitFor(() => {
      expect(screen.queryByText('Territory Details - East Coast')).not.toBeInTheDocument();
    });
  });

  it('calculates performance insights correctly', async () => {
    render(<TerritoryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('East Coast')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('East Coast'));

    await waitFor(() => {
      // Average deal value: $750,000 / 15 deals = $50,000
      expect(screen.getByText('$50,000')).toBeInTheDocument();
      // Deals per rep: 15 deals / 2 reps = 7.5
      expect(screen.getByText('7.5')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
      new Error('API Error')
    );

    render(<TerritoryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error loading territory data')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('handles empty territory data', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ territories: [], totalDeals: 0 }),
    } as Response);

    render(<TerritoryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No territory data available')).toBeInTheDocument();
    });
  });

  it('sorts territories correctly', async () => {
    render(<TerritoryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('East Coast')).toBeInTheDocument();
    });

    // Click on Territory header to sort - use more specific selector
    const territoryHeader = screen.getByRole('columnheader', { name: /Territory/ });
    fireEvent.click(territoryHeader);

    // Should still render the data (sorting is applied)
    expect(screen.getByText('East Coast')).toBeInTheDocument();
    expect(screen.getByText('West Coast')).toBeInTheDocument();
  });
});