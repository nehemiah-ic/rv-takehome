"use client";
import React, { useEffect, useState } from "react";

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
  stageAnalytics: Record<string, { deals: Deal[]; count: number; percentage: number }>;
}

interface BulkPreview {
  impact: any;
  currentWorkload: any;
  projectedWorkload: any;
  conflicts: any[];
  warnings: any[];
  summary: any;
}

const BulkReorganizationTool: React.FC = () => {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [salesReps, setSalesReps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selection and filtering state
  const [selectedDeals, setSelectedDeals] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState({
    sales_rep: '',
    stage: '',
    minValue: '',
    maxValue: '',
  });
  
  // Bulk operation state
  const [bulkChanges, setBulkChanges] = useState({
    sales_rep: '',
  });
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dealsResponse, repsResponse] = await Promise.all([
          fetch('/api/deals'),
          fetch('/api/sales-reps'),
        ]);

        if (dealsResponse.ok) {
          const dealsData = await dealsResponse.json();
          setPipelineData(dealsData);
        }

        if (repsResponse.ok) {
          const repsData = await repsResponse.json();
          setSalesReps(repsData.sales_reps);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get all deals flattened from pipeline data
  const allDeals: Deal[] = pipelineData 
    ? Object.values(pipelineData.stageAnalytics).flatMap(stage => stage.deals)
    : [];

  // Apply filters to get filtered deals
  const filteredDeals = allDeals.filter(deal => {
    if (filters.sales_rep && deal.sales_rep?.name !== filters.sales_rep) return false;
    if (filters.stage && deal.stage !== filters.stage) return false;
    if (filters.minValue && deal.value < Number(filters.minValue)) return false;
    if (filters.maxValue && deal.value > Number(filters.maxValue)) return false;
    return true;
  });

  const handleDealSelection = (dealId: number, selected: boolean) => {
    const newSelection = new Set(selectedDeals);
    if (selected) {
      newSelection.add(dealId);
    } else {
      newSelection.delete(dealId);
    }
    setSelectedDeals(newSelection);
    setPreview(null); // Clear preview when selection changes
  };

  const handleSelectAll = () => {
    if (selectedDeals.size === filteredDeals.length) {
      setSelectedDeals(new Set());
    } else {
      setSelectedDeals(new Set(filteredDeals.map(deal => deal.id)));
    }
    setPreview(null);
  };

  const handlePreview = async () => {
    if (selectedDeals.size === 0 || !bulkChanges.sales_rep) {
      return;
    }

    setIsPreviewLoading(true);
    try {
      const response = await fetch('/api/deals/preview-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealIds: Array.from(selectedDeals),
          changes: {
            sales_rep_name: bulkChanges.sales_rep,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const data = await response.json();
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!preview || !reason.trim()) {
      return;
    }

    setIsExecuting(true);
    try {
      const response = await fetch('/api/deals/bulk-reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealIds: Array.from(selectedDeals),
          changes: {
            sales_rep_name: bulkChanges.sales_rep,
          },
          reason: reason.trim(),
          changed_by: 'Bulk Operations User',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute bulk operation');
      }

      const result = await response.json();
      
      // Refresh data and reset state
      const dealsResponse = await fetch('/api/deals');
      if (dealsResponse.ok) {
        const dealsData = await dealsResponse.json();
        setPipelineData(dealsData);
      }

      // Trigger event for other components to refresh
      window.dispatchEvent(new CustomEvent('dealUpdated', { 
        detail: { bulkOperation: true, batchId: result.batchId } 
      }));

      // Reset form
      setSelectedDeals(new Set());
      setBulkChanges({ sales_rep: '' });
      setReason('');
      setPreview(null);
      
      alert(`Bulk operation completed! Updated ${result.updatedDeals} deals.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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
        Error: {error}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Filters Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Deal Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sales Rep</label>
            <select
              value={filters.sales_rep}
              onChange={(e) => setFilters({ ...filters, sales_rep: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">All Reps</option>
              {salesReps.map(rep => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <select
              value={filters.stage}
              onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">All Stages</option>
              <option value="prospect">Prospect</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Value</label>
            <input
              type="number"
              value={filters.minValue}
              onChange={(e) => setFilters({ ...filters, minValue: e.target.value })}
              placeholder="0"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Value</label>
            <input
              type="number"
              value={filters.maxValue}
              onChange={(e) => setFilters({ ...filters, maxValue: e.target.value })}
              placeholder="No limit"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Selection Summary and Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Selected: {selectedDeals.size} deals
            </h3>
            <p className="text-sm text-gray-600">
              Showing {filteredDeals.length} deals total
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              {selectedDeals.size === filteredDeals.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Changes Configuration */}
      {selectedDeals.size > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Bulk Changes</h3>
          <div className="mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Sales Rep *
              </label>
              <select
                value={bulkChanges.sales_rep}
                onChange={(e) => setBulkChanges({ ...bulkChanges, sales_rep: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              >
                <option value="">Select sales rep...</option>
                {salesReps.map(rep => (
                  <option key={rep} value={rep}>{rep}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for bulk change *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Q4 territory rebalancing"
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handlePreview}
              disabled={!bulkChanges.sales_rep || isPreviewLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isPreviewLoading ? 'Generating Preview...' : 'Preview Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Preview Results */}
      {preview && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Impact Preview</h3>
          
          {/* Conflicts */}
          {preview.conflicts.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
              <h4 className="font-medium text-red-800 mb-2">⚠️ Conflicts Detected</h4>
              {preview.conflicts.map((conflict: any, index: number) => (
                <div key={index} className="text-sm text-red-700 mb-1">
                  <strong>{conflict.rep}:</strong> {conflict.message}
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {preview.warnings.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h4 className="font-medium text-yellow-800 mb-2">⚡ Workload Changes</h4>
              {preview.warnings.map((warning: any, index: number) => (
                <div key={index} className="text-sm text-yellow-700 mb-1">
                  <strong>{warning.rep}:</strong> {warning.message}
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-blue-800 mb-2">📊 Impact Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Deals:</span>
                <div className="font-semibold">{preview.summary.totalDeals}</div>
              </div>
              <div>
                <span className="text-blue-700">Total Value:</span>
                <div className="font-semibold">{formatCurrency(preview.summary.totalValue)}</div>
              </div>
              <div>
                <span className="text-blue-700">Affected Reps:</span>
                <div className="font-semibold">{preview.summary.affectedReps.length}</div>
              </div>
              <div>
                <span className="text-blue-700">Change Types:</span>
                <div className="font-semibold">{preview.summary.changeTypes.join(', ')}</div>
              </div>
            </div>
          </div>

          {/* Execute Button */}
          <div className="flex space-x-2">
            <button
              onClick={handleExecute}
              disabled={!reason.trim() || preview.conflicts.length > 0 || isExecuting}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isExecuting ? 'Executing...' : 'Execute Bulk Changes'}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>

          {preview.conflicts.length > 0 && (
            <p className="text-sm text-red-600 mt-2">
              Cannot execute: Please resolve conflicts first by adjusting the selection or assignments.
            </p>
          )}
        </div>
      )}

      {/* Deal List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Deals ({filteredDeals.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedDeals.size === filteredDeals.length && filteredDeals.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deal ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales Rep
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Territory
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDeals.map((deal) => (
                <tr 
                  key={deal.id} 
                  className={`hover:bg-gray-50 ${selectedDeals.has(deal.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedDeals.has(deal.id)}
                      onChange={(e) => handleDealSelection(deal.id, e.target.checked)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">{deal.deal_id}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{deal.company_name}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{formatCurrency(deal.value)}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                      {deal.stage.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">{deal.sales_rep?.name || 'Unassigned'}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{deal.territory || 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BulkReorganizationTool;