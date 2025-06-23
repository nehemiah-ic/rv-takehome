"use client";
import React, { useEffect, useState } from "react";

interface StageData {
  deals: any[];
  count: number;
  percentage: number;
}

interface PipelineData {
  totalDeals: number;
  stageAnalytics: Record<string, StageData>;
}

const PipelineFunnel: React.FC = () => {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stageOrder = [
    "prospect",
    "qualified",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
  ];
  const stageColors = {
    prospect: "bg-blue-500",
    qualified: "bg-green-500",
    proposal: "bg-yellow-500",
    negotiation: "bg-orange-500",
    closed_won: "bg-emerald-600",
    closed_lost: "bg-red-500",
  };

  useEffect(() => {
    const fetchPipelineData = async () => {
      try {
        const response = await fetch("/api/deals");
        if (!response.ok) {
          throw new Error("Failed to fetch pipeline data");
        }
        const data = await response.json();
        setPipelineData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchPipelineData();
  }, []);

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
        Error loading pipeline data: {error}
      </div>
    );
  }

  if (!pipelineData) {
    return (
      <div className="text-center text-gray-500 p-4">No data available</div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="text-center mb-4">
        <h3 className="text-sm font-semibold text-gray-800">
          Total Deals: {pipelineData.totalDeals}
        </h3>
      </div>

      <div className="space-y-3">
        {stageOrder.map((stage) => {
          const stageData = pipelineData.stageAnalytics[stage];
          if (!stageData) return null;

          const widthPercentage = Math.max(stageData.percentage, 5); // Minimum 5% width for visibility

          return (
            <div key={stage} className="relative">
              <div className="flex items-center space-x-2">
                <div className="w-20 text-xs font-medium text-gray-700 capitalize">
                  {stage.replace("_", " ")}
                </div>
                <div className="flex-1 bg-gray-200 rounded h-8 relative overflow-hidden">
                  <div
                    className={`h-full ${
                      stageColors[stage as keyof typeof stageColors]
                    } rounded flex items-center justify-between px-2 text-white font-medium transition-all duration-300`}
                    style={{ width: `${widthPercentage}%` }}
                  >
                    <span className="text-xs">{stageData.count}</span>
                    <span className="text-xs">{stageData.percentage}%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineFunnel;
