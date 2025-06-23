"use client";
import React, { useEffect, useState } from "react";

interface RepWorkload {
  salesRep: string;
  dealCount: number;
  totalValue: number;
  avgDealValue: number;
  territories: string[];
  dealsByStage: Record<string, number>;
  utilizationLevel: 'under' | 'balanced' | 'over';
  recommendations: string[];
}

interface WorkloadRecommendation {
  type: 'redistribute' | 'hire' | 'optimize';
  priority: 'high' | 'medium' | 'low';
  description: string;
  affectedReps: string[];
}

interface WorkloadSummary {
  totalDeals: number;
  totalValue: number;
  totalReps: number;
  avgDealsPerRep: number;
  avgValuePerRep: number;
  overloadedReps: number;
  underutilizedReps: number;
}

interface WorkloadData {
  summary: WorkloadSummary;
  repWorkloads: RepWorkload[];
  recommendations: WorkloadRecommendation[];
}

const RepWorkloadDashboard: React.FC = () => {
  const [workloadData, setWorkloadData] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchWorkloadData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/workload-analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch workload data");
      }
      const data = await response.json();
      setWorkloadData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkloadData();
  }, [refreshKey]);

  // Listen for deal changes to auto-refresh
  useEffect(() => {
    const handleStorageChange = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('dealUpdated', handleStorageChange);
    return () => window.removeEventListener('dealUpdated', handleStorageChange);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getUtilizationColor = (level: string) => {
    switch (level) {
      case 'over':
        return 'bg-red-100 text-red-800';
      case 'under':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getUtilizationLabel = (level: string) => {
    switch (level) {
      case 'over':
        return 'Overloaded';
      case 'under':
        return 'Underutilized';
      default:
        return 'Balanced';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
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
        Error loading workload data: {error}
      </div>
    );
  }

  if (!workloadData) {
    return (
      <div className="text-center text-gray-500 p-4">No data available</div>
    );
  }

  const { summary, repWorkloads, recommendations } = workloadData;

  return (
    <div className="w-full space-y-6">
      {/* Summary Cards */}
      <div className="mb-4">
        <h3 className="text-md font-medium text-gray-700 mb-3">Team Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600">Total Reps</h3>
          <p className="text-2xl font-bold text-gray-900">{summary.totalReps}</p>
          <p className="text-xs text-gray-500">Active sales representatives</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600">Avg Deals/Rep</h3>
          <p className="text-2xl font-bold text-gray-900">{summary.avgDealsPerRep}</p>
          <p className="text-xs text-gray-500">Deals per representative</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600">Overloaded Reps</h3>
          <p className="text-2xl font-bold text-red-600">{summary.overloadedReps}</p>
          <p className="text-xs text-gray-500">Need workload reduction</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600">Underutilized Reps</h3>
          <p className="text-2xl font-bold text-yellow-600">{summary.underutilizedReps}</p>
          <p className="text-xs text-gray-500">Have additional capacity</p>
        </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Workload Recommendations
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div
                  className={`w-3 h-3 rounded-full ${getPriorityColor(rec.priority)} mt-1`}
                ></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {rec.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Priority: {rec.priority.toUpperCase()} • Affects: {rec.affectedReps.join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rep Workload Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            Individual Rep Analysis
          </h3>
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales Rep
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deal Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pipeline Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Deal Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Territories
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {repWorkloads.map((rep, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {rep.salesRep}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="text-lg font-semibold">{rep.dealCount}</span>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ 
                            width: `${Math.min((rep.dealCount / Math.max(...repWorkloads.map(r => r.dealCount))) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(rep.totalValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(rep.avgDealValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-wrap gap-1">
                      {rep.territories.slice(0, 2).map((territory, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {territory}
                        </span>
                      ))}
                      {rep.territories.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{rep.territories.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUtilizationColor(rep.utilizationLevel)}`}
                    >
                      {getUtilizationLabel(rep.utilizationLevel)}
                    </span>
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

export default RepWorkloadDashboard;