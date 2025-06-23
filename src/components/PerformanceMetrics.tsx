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
}

interface PipelineData {
  totalDeals: number;
  stageAnalytics: Record<
    string,
    { deals: Deal[]; count: number; percentage: number }
  >;
}

const PerformanceMetrics: React.FC = () => {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    fetchDeals();
  }, []);

  const metrics = useMemo(() => {
    if (!pipelineData) return null;

    // Flatten all deals
    const allDeals: Deal[] = [];
    Object.values(pipelineData.stageAnalytics).forEach((stageData) => {
      allDeals.push(...stageData.deals);
    });

    // Calculate total pipeline value
    const totalPipelineValue = allDeals.reduce(
      (sum, deal) => sum + deal.value,
      0
    );

    // Calculate win rate (closed_won / (closed_won + closed_lost))
    const closedWonDeals = pipelineData.stageAnalytics.closed_won?.deals || [];
    const closedLostDeals =
      pipelineData.stageAnalytics.closed_lost?.deals || [];
    const totalClosedDeals = closedWonDeals.length + closedLostDeals.length;
    const winRate =
      totalClosedDeals > 0
        ? (closedWonDeals.length / totalClosedDeals) * 100
        : 0;

    // Calculate average deal size
    const avgDealSize =
      allDeals.length > 0 ? totalPipelineValue / allDeals.length : 0;

    // Calculate weighted pipeline value (value * probability)
    const weightedPipelineValue = allDeals.reduce((sum, deal) => {
      return sum + deal.value * (deal.probability / 100);
    }, 0);

    // Calculate deals by transportation mode
    const dealsByMode = allDeals.reduce((acc, deal) => {
      acc[deal.transportation_mode] = (acc[deal.transportation_mode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find top performing sales rep
    const dealsBySalesRep = allDeals.reduce((acc, deal) => {
      const repName = deal.sales_rep?.name;
      if (repName) {
        if (!acc[repName]) {
          acc[repName] = { count: 0, value: 0 };
        }
        acc[repName].count += 1;
        acc[repName].value += deal.value;
      }
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    const topSalesRep = Object.entries(dealsBySalesRep).reduce(
      (top, [rep, data]) => {
        return data.value > top.value ? { name: rep, ...data } : top;
      },
      { name: "", count: 0, value: 0 }
    );

    return {
      totalPipelineValue,
      winRate,
      avgDealSize,
      weightedPipelineValue,
      totalDeals: allDeals.length,
      dealsByMode,
      topSalesRep,
    };
  }, [pipelineData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Error loading metrics: {error}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center text-gray-500 p-4">No data available</div>
    );
  }

  const metricCards = [
    {
      title: "Total Pipeline Value",
      value: formatCurrency(metrics.totalPipelineValue),
      icon: "💰",
      color: "bg-blue-500",
      description: "Total value of all deals",
    },
    {
      title: "Win Rate",
      value: formatPercentage(metrics.winRate),
      icon: "🎯",
      color: "bg-green-500",
      description: "Closed won vs closed lost",
    },
    {
      title: "Average Deal Size",
      value: formatCurrency(metrics.avgDealSize),
      icon: "📊",
      color: "bg-purple-500",
      description: "Average value per deal",
    },
    {
      title: "Weighted Pipeline",
      value: formatCurrency(metrics.weightedPipelineValue),
      icon: "⚖️",
      color: "bg-orange-500",
      description: "Pipeline value × probability",
    },
    {
      title: "Total Deals",
      value: metrics.totalDeals.toString(),
      icon: "📋",
      color: "bg-indigo-500",
      description: "Total number of deals",
    },
    {
      title: "Top Sales Rep",
      value: metrics.topSalesRep.name || "N/A",
      icon: "🏆",
      color: "bg-yellow-500",
      description: `${formatCurrency(metrics.topSalesRep.value)} in deals`,
    },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {metricCards.map((metric, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-1">
                  {metric.title}
                </p>
                <p className="text-lg font-bold text-gray-900 mb-1">
                  {metric.value}
                </p>
                <p className="text-xs text-gray-500">{metric.description}</p>
              </div>
              <div
                className={`w-8 h-8 ${metric.color} rounded flex items-center justify-center text-white text-sm`}
              >
                {metric.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Transportation Mode Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Deals by Transportation Mode
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(metrics.dealsByMode).map(([mode, count]) => (
            <div key={mode} className="text-center">
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-600 capitalize">{mode}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
