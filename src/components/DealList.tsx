"use client";
import React, { useEffect, useMemo, useState } from "react";

interface SalesRep {
  id: number;
  name: string;
  email: string;
  territory: string;
  active: boolean;
  created_date: string;
  updated_date: string;
}

interface Deal {
  id: number;
  deal_id: string;
  company_name: string;
  contact_name: string;
  transportation_mode: string;
  stage: string;
  value: number;
  probability: number;
  created_date: string;
  updated_date: string;
  expected_close_date: string;
  sales_rep_id: number;
  sales_rep: SalesRep;
  origin_city: string;
  destination_city: string;
  cargo_type?: string;
  territory?: string;
}

interface PipelineData {
  totalDeals: number;
  stageAnalytics: Record<
    string,
    { deals: Deal[]; count: number; percentage: number }
  >;
}

type SortField = keyof Deal;
type SortDirection = "asc" | "desc";

const DealList: React.FC = () => {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editingDeal, setEditingDeal] = useState<number | null>(null);
  const [salesReps, setSalesReps] = useState<string[]>([]);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const response = await fetch("/api/deals");
        if (!response.ok) {
          throw new Error("Failed to fetch deals");
        }
        const data = await response.json();
        setPipelineData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    const fetchSalesReps = async () => {
      try {
        const response = await fetch("/api/sales-reps");
        if (response.ok) {
          const data = await response.json();
          setSalesReps(data.sales_reps);
        }
      } catch (err) {
        console.error("Failed to fetch sales reps:", err);
      }
    };

    fetchDeals();
    fetchSalesReps();
  }, []);

  // Flatten all deals from all stages
  const allDeals = useMemo(() => {
    if (!pipelineData) return [];

    const deals: Deal[] = [];
    Object.values(pipelineData.stageAnalytics).forEach((stageData) => {
      deals.push(...stageData.deals);
    });
    return deals;
  }, [pipelineData]);

  // Filter and sort deals
  const filteredAndSortedDeals = useMemo(() => {
    const filtered = allDeals.filter(
      (deal) =>
        deal.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.deal_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.sales_rep?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.stage.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.transportation_mode
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return sortDirection === "asc" ? -1 : 1;
      if (bValue === undefined) return sortDirection === "asc" ? 1 : -1;

      // Handle different data types
      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [allDeals, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleSalesRepUpdate = async (dealId: number, salesRep: string) => {
    try {
      const response = await fetch(`/api/deals/${dealId}/sales-rep`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sales_rep: salesRep }),
      });

      if (!response.ok) {
        throw new Error('Failed to update sales rep');
      }

      // Refresh the deals data
      const dealsResponse = await fetch('/api/deals');
      if (dealsResponse.ok) {
        const data = await dealsResponse.json();
        setPipelineData(data);
      }

      // Trigger event for other components to refresh
      window.dispatchEvent(new CustomEvent('dealUpdated', { detail: { dealId, salesRep } }));

      setEditingDeal(null);
    } catch (err) {
      console.error('Error updating sales rep:', err);
      alert('Failed to update sales rep. Please try again.');
    }
  };

  const getStageColor = (stage: string) => {
    const colors = {
      prospect: "bg-blue-100 text-blue-800",
      qualified: "bg-green-100 text-green-800",
      proposal: "bg-yellow-100 text-yellow-800",
      negotiation: "bg-orange-100 text-orange-800",
      closed_won: "bg-emerald-100 text-emerald-800",
      closed_lost: "bg-red-100 text-red-800",
    };
    return colors[stage as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Error loading deals: {error}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search deals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Showing {filteredAndSortedDeals.length} of {allDeals.length} deals
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full bg-white border border-gray-200 rounded-lg" style={{tableLayout: "auto"}}>
          <thead className="bg-gray-50">
            <tr>
              {[
                { key: "deal_id", label: "Deal ID" },
                { key: "company_name", label: "Company" },
                { key: "contact_name", label: "Contact" },
                { key: "stage", label: "Stage" },
                { key: "transportation_mode", label: "Mode" },
                { key: "value", label: "Value" },
                { key: "probability", label: "Probability" },
                { key: "sales_rep", label: "Sales Rep" },
                { key: "territory", label: "Territory" },
                { key: "expected_close_date", label: "Expected Close" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort(key as SortField)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{label}</span>
                    {sortField === key && (
                      <span className="text-blue-500">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedDeals.map((deal) => (
              <tr key={deal.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {deal.deal_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {deal.company_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {deal.contact_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(
                      deal.stage
                    )}`}
                  >
                    {deal.stage.replace("_", " ")}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                  {deal.transportation_mode}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(deal.value)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {deal.probability}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {editingDeal === deal.id ? (
                    <select
                      defaultValue={deal.sales_rep?.name}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSalesRepUpdate(deal.id, e.target.value);
                        }
                      }}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="">Select Sales Rep</option>
                      {salesReps.map((rep) => (
                        <option key={rep} value={rep}>
                          {rep}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>{deal.sales_rep?.name || 'Unassigned'}</span>
                      {deal.stage !== 'closed_won' && deal.stage !== 'closed_lost' && (
                        <button
                          onClick={() => setEditingDeal(deal.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Reassign
                        </button>
                      )}
                      {(deal.stage === 'closed_won' || deal.stage === 'closed_lost') && (
                        <span className="text-gray-400 text-xs">
                          (Closed - cannot reassign)
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    deal.territory 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {deal.territory || 'Unassigned'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(deal.expected_close_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedDeals.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No deals found matching your search criteria.
        </div>
      )}
    </div>
  );
};

export default DealList;
