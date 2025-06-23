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
  const [salesRepFilter, setSalesRepFilter] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editingDeal, setEditingDeal] = useState<number | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
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

  // Get unique territories and stages for filter dropdowns
  const territories = useMemo(() => {
    const territorySet = new Set<string>();
    allDeals.forEach(deal => {
      if (deal.territory) {
        territorySet.add(deal.territory);
      }
    });
    return Array.from(territorySet).sort();
  }, [allDeals]);

  const stages = useMemo(() => {
    const stageSet = new Set<string>();
    allDeals.forEach(deal => {
      if (deal.stage) {
        stageSet.add(deal.stage);
      }
    });
    return Array.from(stageSet).sort();
  }, [allDeals]);

  // Filter and sort deals
  const filteredAndSortedDeals = useMemo(() => {
    const filtered = allDeals.filter(
      (deal) => {
        // Search term filter
        const matchesSearch = !searchTerm || 
          deal.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          deal.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          deal.deal_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          deal.sales_rep?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          deal.stage.toLowerCase().includes(searchTerm.toLowerCase()) ||
          deal.transportation_mode.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Sales rep filter
        const matchesSalesRep = !salesRepFilter || deal.sales_rep?.name === salesRepFilter;
        
        // Territory filter
        const matchesTerritory = !territoryFilter || deal.territory === territoryFilter;
        
        // Stage filter
        const matchesStage = !stageFilter || deal.stage === stageFilter;
        
        return matchesSearch && matchesSalesRep && matchesTerritory && matchesStage;
      }
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
  }, [allDeals, searchTerm, salesRepFilter, territoryFilter, stageFilter, sortField, sortDirection]);

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
      {/* Search and Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
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
          
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={salesRepFilter}
              onChange={(e) => setSalesRepFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Sales Reps</option>
              {salesReps.map(rep => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>
            
            <select
              value={territoryFilter}
              onChange={(e) => setTerritoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Territories</option>
              {territories.map(territory => (
                <option key={territory} value={territory}>{territory}</option>
              ))}
            </select>
            
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Stages</option>
              {stages.map(stage => (
                <option key={stage} value={stage}>{stage.replace('_', ' ')}</option>
              ))}
            </select>
            
            {(searchTerm || salesRepFilter || territoryFilter || stageFilter) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSalesRepFilter("");
                  setTerritoryFilter("");
                  setStageFilter("");
                }}
                className="px-3 py-2 text-sm text-gray-900 hover:text-gray-900 font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        
        <div className="text-sm text-gray-900 font-medium">
          Showing {filteredAndSortedDeals.length} of {allDeals.length} deals
        </div>
      </div>

      {/* Compact Table - Key fields only */}
      <div className="w-full">
        <table className="w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              {[
                { key: "deal_id", label: "Deal ID" },
                { key: "company_name", label: "Company" },
                { key: "stage", label: "Stage" },
                { key: "value", label: "Value" },
                { key: "sales_rep", label: "Sales Rep" },
                { key: "territory", label: "Territory" },
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
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  <button
                    onClick={() => setSelectedDeal(deal)}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {deal.deal_id}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={deal.company_name}>
                    {deal.company_name}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(
                      deal.stage
                    )}`}
                  >
                    {deal.stage.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {formatCurrency(deal.value)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {editingDeal === deal.id ? (
                    <select
                      defaultValue={deal.sales_rep?.name}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSalesRepUpdate(deal.id, e.target.value);
                        } else {
                          setEditingDeal(null);
                        }
                      }}
                      onBlur={() => setEditingDeal(null)}
                      autoFocus
                      className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                    >
                      <option value="">Select Sales Rep</option>
                      {salesReps.map((rep) => (
                        <option key={rep} value={rep}>
                          {rep}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex flex-col space-y-1">
                      <span className="truncate" title={deal.sales_rep?.name || 'Unassigned'}>
                        {deal.sales_rep?.name || 'Unassigned'}
                      </span>
                      {deal.stage !== 'closed_won' && deal.stage !== 'closed_lost' && (
                        <button
                          onClick={() => setEditingDeal(deal.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs self-start"
                        >
                          Reassign
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    deal.territory 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {deal.territory || 'Unassigned'}
                  </span>
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

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedDeal(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Deal Details - {selectedDeal.deal_id}
              </h3>
              <button
                onClick={() => setSelectedDeal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Company</label>
                  <p className="text-gray-900">{selectedDeal.company_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact</label>
                  <p className="text-gray-900">{selectedDeal.contact_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Stage</label>
                  <p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(selectedDeal.stage)}`}>
                      {selectedDeal.stage.replace("_", " ")}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Value</label>
                  <p className="text-gray-900 font-medium">{formatCurrency(selectedDeal.value)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Probability</label>
                  <p className="text-gray-900">{selectedDeal.probability}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Transportation Mode</label>
                  <p className="text-gray-900 capitalize">{selectedDeal.transportation_mode}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Sales Rep</label>
                  {editingDeal === selectedDeal.id ? (
                    <select
                      defaultValue={selectedDeal.sales_rep?.name}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSalesRepUpdate(selectedDeal.id, e.target.value);
                        } else {
                          setEditingDeal(null);
                        }
                      }}
                      onBlur={() => setEditingDeal(null)}
                      autoFocus
                      className="border border-gray-300 rounded px-2 py-1 text-sm w-full mt-1"
                    >
                      <option value="">Select Sales Rep</option>
                      {salesReps.map((rep) => (
                        <option key={rep} value={rep}>
                          {rep}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-gray-900">{selectedDeal.sales_rep?.name || 'Unassigned'}</span>
                      {selectedDeal.stage !== 'closed_won' && selectedDeal.stage !== 'closed_lost' && (
                        <button
                          onClick={() => setEditingDeal(selectedDeal.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Change
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Territory</label>
                  <p>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      selectedDeal.territory 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedDeal.territory || 'Unassigned'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Origin City</label>
                  <p className="text-gray-900">{selectedDeal.origin_city}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Destination City</label>
                  <p className="text-gray-900">{selectedDeal.destination_city}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Expected Close</label>
                  <p className="text-gray-900">{formatDate(selectedDeal.expected_close_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created Date</label>
                  <p className="text-gray-900">{formatDate(selectedDeal.created_date)}</p>
                </div>
              </div>
              {selectedDeal.cargo_type && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-500">Cargo Type</label>
                  <p className="text-gray-900">{selectedDeal.cargo_type}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealList;
