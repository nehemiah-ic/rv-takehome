import React from "react";
import AuditTrail from "./AuditTrail";
import DealList from "./DealList";
import PerformanceMetrics from "./PerformanceMetrics";
import PipelineFunnel from "./PipelineFunnel";
import RepWorkloadDashboard from "./RepWorkloadDashboard";
import TerritoryDashboard from "./TerritoryDashboard";

const PipelineDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Pipeline Analytics Dashboard
        </h1>

        <div className="grid gap-4 lg:gap-6">
          {/* Top Row - Pipeline Overview and Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-4 overflow-hidden">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Pipeline Overview
              </h2>
              <div className="overflow-hidden">
                <PipelineFunnel />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 overflow-hidden">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Performance Metrics
              </h2>
              <div className="overflow-hidden">
                <PerformanceMetrics />
              </div>
            </div>
          </div>

          {/* Territory Management Section */}
          <div className="bg-white rounded-lg shadow p-4 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Territory Management
            </h2>
            <div className="overflow-hidden">
              <TerritoryDashboard />
            </div>
          </div>

          {/* Rep Workload Section */}
          <div className="bg-white rounded-lg shadow p-4 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Sales Rep Workload Analysis
            </h2>
            <div className="overflow-hidden">
              <RepWorkloadDashboard />
            </div>
          </div>

          {/* Audit Trail Section */}
          <div className="bg-white rounded-lg shadow p-4 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Recent Changes & Audit Trail
            </h2>
            <div className="overflow-hidden">
              <AuditTrail showAllDeals={true} />
            </div>
          </div>

          {/* Deal List Section */}
          <div className="bg-white rounded-lg shadow p-4 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Deal List
            </h2>
            <div className="overflow-hidden">
              <DealList />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PipelineDashboard;
