/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DealList from '../../components/DealList';

// Mock fetch
global.fetch = jest.fn();

const mockDealData = {
  totalDeals: 2,
  stageAnalytics: {
    "prospect": {
      deals: [
        {
          id: 1,
          deal_id: "RV-001",
          company_name: "Acme Corp",
          contact_name: "John Doe",
          stage: "prospect",
          value: 50000,
          probability: 60,
          transportation_mode: "truck",
          sales_rep: { id: 1, name: "Alice Johnson", email: "alice@test.com", territory: "East", active: true },
          territory: "East Coast",
          origin_city: "New York",
          destination_city: "Boston",
          expected_close_date: "2024-02-15",
          created_date: "2024-01-15",
          updated_date: "2024-01-20",
          cargo_type: "Electronics"
        }
      ],
      count: 1,
      percentage: 50
    },
    "qualified": {
      deals: [
        {
          id: 2,
          deal_id: "RV-002",
          company_name: "Beta Inc",
          contact_name: "Jane Smith",
          stage: "qualified",
          value: 75000,
          probability: 80,
          transportation_mode: "rail",
          sales_rep: { id: 2, name: "Bob Smith", email: "bob@test.com", territory: "West", active: true },
          territory: "West Coast",
          origin_city: "Los Angeles",
          destination_city: "San Francisco",
          expected_close_date: "2024-03-01",
          created_date: "2024-01-10",
          updated_date: "2024-01-18",
          cargo_type: "Automotive"
        }
      ],
      count: 1,
      percentage: 50
    }
  }
};

const mockSalesReps = {
  sales_reps: ["Alice Johnson", "Bob Smith", "Carol Davis"]
};

describe('DealList', () => {
  beforeEach(() => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
      if (url === '/api/deals') {
        return Promise.resolve({
          ok: true,
          json: async () => mockDealData,
        } as Response);
      }
      if (url === '/api/sales-reps') {
        return Promise.resolve({
          ok: true,
          json: async () => mockSalesReps,
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders deal list with compact table', async () => {
    render(<DealList />);

    await waitFor(() => {
      expect(screen.getByText('RV-001')).toBeInTheDocument();
      expect(screen.getByText('RV-002')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Beta Inc')).toBeInTheDocument();
    });
  });

  it('shows deal count in results', async () => {
    render(<DealList />);

    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 2 deals')).toBeInTheDocument();
    });
  });

  it('opens deal detail modal when clicking deal ID', async () => {
    render(<DealList />);

    await waitFor(() => {
      expect(screen.getByText('RV-001')).toBeInTheDocument();
    });

    // Click on deal ID
    fireEvent.click(screen.getByText('RV-001'));

    // Check if modal opens with deal details
    await waitFor(() => {
      expect(screen.getByText('Deal Details - RV-001')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument(); // Contact name
      expect(screen.getByText('truck')).toBeInTheDocument(); // Transportation mode
      expect(screen.getByText('60%')).toBeInTheDocument(); // Probability
      expect(screen.getByText('New York')).toBeInTheDocument(); // Origin city
      expect(screen.getByText('Boston')).toBeInTheDocument(); // Destination city
      expect(screen.getByText('Electronics')).toBeInTheDocument(); // Cargo type
    });
  });

  it('shows all deal details in modal that were removed from table', async () => {
    render(<DealList />);

    await waitFor(() => {
      expect(screen.getByText('RV-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('RV-001'));

    await waitFor(() => {
      // These fields were removed from the compact table but should be in modal
      expect(screen.getByText('John Doe')).toBeInTheDocument(); // Contact
      expect(screen.getByText('truck')).toBeInTheDocument(); // Transportation Mode
      expect(screen.getByText('60%')).toBeInTheDocument(); // Probability
      expect(screen.getByText('New York')).toBeInTheDocument(); // Origin City
      expect(screen.getByText('Boston')).toBeInTheDocument(); // Destination City
      expect(screen.getByText('Electronics')).toBeInTheDocument(); // Cargo Type
    });
  });

  it('allows sales rep reassignment in modal', async () => {
    render(<DealList />);

    await waitFor(() => {
      expect(screen.getByText('RV-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('RV-001'));

    await waitFor(() => {
      expect(screen.getByText('Deal Details - RV-001')).toBeInTheDocument();
      // Look for sales rep section in modal
      const modal = screen.getByText('Deal Details - RV-001').closest('.fixed');
      expect(within(modal!).getByText('Sales Rep')).toBeInTheDocument();
      expect(within(modal!).getByText('Alice Johnson')).toBeInTheDocument();
      expect(within(modal!).getByText('Change')).toBeInTheDocument();
    });
  });

  it('closes modal when clicking X button', async () => {
    render(<DealList />);

    await waitFor(() => {
      expect(screen.getByText('RV-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('RV-001'));

    await waitFor(() => {
      expect(screen.getByText('Deal Details - RV-001')).toBeInTheDocument();
    });

    // Click X button in modal header
    const modal = screen.getByText('Deal Details - RV-001').closest('.fixed');
    const buttons = within(modal!).getAllByRole('button');
    const closeButton = buttons.find(btn => btn.querySelector('svg'));
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(screen.queryByText('Deal Details - RV-001')).not.toBeInTheDocument();
    });
  });

  it('filters deals by sales rep', async () => {
    render(<DealList />);

    await waitFor(() => {
      expect(screen.getByText('RV-001')).toBeInTheDocument();
      expect(screen.getByText('RV-002')).toBeInTheDocument();
    });

    // Select sales rep filter
    const salesRepFilter = screen.getByDisplayValue('All Sales Reps');
    fireEvent.change(salesRepFilter, { target: { value: 'Alice Johnson' } });

    await waitFor(() => {
      expect(screen.getByText('RV-001')).toBeInTheDocument();
      expect(screen.queryByText('RV-002')).not.toBeInTheDocument();
      expect(screen.getByText('Showing 1 of 2 deals')).toBeInTheDocument();
    });
  });

  it('filters deals by territory', async () => {
    render(<DealList />);

    await waitFor(() => {
      expect(screen.getByText('RV-001')).toBeInTheDocument();
      expect(screen.getByText('RV-002')).toBeInTheDocument();
    });

    // Select territory filter
    const territoryFilter = screen.getByDisplayValue('All Territories');
    fireEvent.change(territoryFilter, { target: { value: 'East Coast' } });

    await waitFor(() => {
      expect(screen.getByText('RV-001')).toBeInTheDocument();
      expect(screen.queryByText('RV-002')).not.toBeInTheDocument();
      expect(screen.getByText('Showing 1 of 2 deals')).toBeInTheDocument();
    });
  });

  it('filters deals by stage', async () => {
    render(<DealList />);

    await waitFor(() => {
      expect(screen.getByText('RV-001')).toBeInTheDocument();
      expect(screen.getByText('RV-002')).toBeInTheDocument();
    });

    // Select stage filter
    const stageFilter = screen.getByDisplayValue('All Stages');
    fireEvent.change(stageFilter, { target: { value: 'prospect' } });

    await waitFor(() => {
      expect(screen.getByText('RV-001')).toBeInTheDocument();
      expect(screen.queryByText('RV-002')).not.toBeInTheDocument();
      expect(screen.getByText('Showing 1 of 2 deals')).toBeInTheDocument();
    });
  });

  it('clears all filters when clicking Clear button', async () => {
    render(<DealList />);

    await waitFor(() => {
      expect(screen.getByText('RV-001')).toBeInTheDocument();
    });

    // Apply a filter
    const stageFilter = screen.getByDisplayValue('All Stages');
    fireEvent.change(stageFilter, { target: { value: 'prospect' } });

    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    // Click Clear button
    fireEvent.click(screen.getByText('Clear'));

    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 2 deals')).toBeInTheDocument();
      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    });
  });

  it('shows no deals message when no matches found', async () => {
    render(<DealList />);

    await waitFor(() => {
      expect(screen.getByText('RV-001')).toBeInTheDocument();
    });

    // Filter to something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search deals...');
    fireEvent.change(searchInput, { target: { value: 'NonexistentDeal' } });

    await waitFor(() => {
      expect(screen.getByText('No deals found matching your search criteria.')).toBeInTheDocument();
      expect(screen.getByText('Showing 0 of 2 deals')).toBeInTheDocument();
    });
  });
});