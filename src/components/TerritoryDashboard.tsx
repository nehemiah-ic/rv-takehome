"use client";

import React, { useEffect, useState } from "react";

interface TerritoryData {
  territory: string;
  totalDeals: number;
  totalValue: number;
  avgProbability: number;
  salesReps: string[];
  repCount: number;
  dealsByStage: Record<string, number>;
}

interface TerritoryResponse {
  territories: TerritoryData[];
  totalDeals: number;
}

const TerritoryDashboard: React.FC = () => {
  const [territoryData, setTerritoryData] = useState<TerritoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<keyof TerritoryData>("totalValue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchTerritoryData();
  }, []);

  const fetchTerritoryData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/territories");
      if (!response.ok) {
        throw new Error("Failed to fetch territory data");
      }
      const data = await response.json();
      setTerritoryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof TerritoryData) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const sortedTerritories = territoryData?.territories.sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    let comparison = 0;
    if (typeof aValue === "number" && typeof bValue === "number") {
      comparison = aValue - bValue;
    } else if (typeof aValue === "string" && typeof bValue === "string") {
      comparison = aValue.localeCompare(bValue);
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading territory data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-medium">Error loading territory data</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
        <button
          onClick={fetchTerritoryData}
          className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!territoryData || territoryData.territories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No territory data available
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded p-2">
          <div className="text-blue-800 text-xs font-medium">Territories</div>
          <div className="text-lg font-bold text-blue-900">
            {territoryData.territories.length}
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-2">
          <div className="text-green-800 text-xs font-medium">Total Deals</div>
          <div className="text-lg font-bold text-green-900">
            {territoryData.totalDeals}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded p-2">
          <div className="text-purple-800 text-xs font-medium">Pipeline Value</div>
          <div className="text-lg font-bold text-purple-900">
            {formatCurrency(
              territoryData.territories.reduce((sum, t) => sum + t.totalValue, 0)
            )}
          </div>
        </div>
      </div>

      {/* Territory Table */}
      <div className="bg-gray-50 rounded border w-full">
        <div className="px-3 py-2 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Territory Performance</h3>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs" style={{tableLayout: "fixed"}}>
            <thead className="bg-gray-100">
              <tr>
                <th
                  className="px-2 py-1 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort("territory")}
                >
                  Territory {sortBy === "territory" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="px-2 py-1 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort("totalDeals")}
                >
                  Deals {sortBy === "totalDeals" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="px-2 py-1 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort("totalValue")}
                >
                  Value {sortBy === "totalValue" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="px-2 py-1 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort("repCount")}
                >
                  Reps {sortBy === "repCount" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedTerritories?.map((territory) => (
                <tr key={territory.territory} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-2 font-medium text-gray-900">
                    {territory.territory}
                  </td>
                  <td className="px-2 py-2 text-gray-600">
                    {territory.totalDeals}
                  </td>
                  <td className="px-2 py-2 text-gray-600">
                    {formatCurrency(territory.totalValue)}
                  </td>
                  <td className="px-2 py-2 text-gray-600">
                    <div>
                      <div>{territory.repCount}</div>
                      <div className="text-gray-400 text-xs truncate max-w-20">
                        {territory.salesReps.slice(0, 1).join(", ")}
                        {territory.salesReps.length > 1 && "..."}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TerritoryDashboard;