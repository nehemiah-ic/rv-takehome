"use client";
import React, { useEffect, useState } from "react";

interface AuditLogEntry {
  id: number;
  dealId: number;
  dealIdentifier: string;
  fieldChanged: string;
  oldValue?: string;
  newValue?: string;
  changedBy: string;
  reason?: string;
  changedAt: string;
  changeType: string;
}

interface AuditTrailProps {
  dealId?: number;
  showAllDeals?: boolean;
}

const AuditTrail: React.FC<AuditTrailProps> = ({ dealId, showAllDeals = false }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dealId && !showAllDeals) {
        params.append('dealId', dealId.toString());
      }
      params.append('limit', '100');

      const response = await fetch(`/api/audit-trail?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit trail");
      }
      const data = await response.json();
      setAuditLogs(data.auditLogs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [dealId, showAllDeals, refreshKey]);

  // Listen for deal changes to auto-refresh
  useEffect(() => {
    const handleDealUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('dealUpdated', handleDealUpdate);
    return () => window.removeEventListener('dealUpdated', handleDealUpdate);
  }, []);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getChangeIcon = (fieldChanged: string) => {
    switch (fieldChanged) {
      case 'sales_rep':
        return '👤';
      case 'territory':
        return '🌍';
      default:
        return '📝';
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'manual':
        return 'bg-blue-100 text-blue-800';
      case 'bulk':
        return 'bg-purple-100 text-purple-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
        Error loading audit trail: {error}
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className="text-center text-gray-500 p-4">
        No audit trail entries found
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="text-sm text-gray-600 mb-4">
        Showing {auditLogs.length} recent changes
        {dealId && !showAllDeals && ` for deal ${auditLogs[0]?.dealIdentifier}`}
      </div>

      <div className="space-y-3">
        {auditLogs.map((entry) => (
          <div
            key={entry.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="text-xl">{getChangeIcon(entry.fieldChanged)}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {entry.dealIdentifier}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getChangeTypeColor(entry.changeType)}`}
                    >
                      {entry.changeType}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">
                      {entry.fieldChanged.replace('_', ' ')}
                    </span>
                    {' changed from '}
                    <span className="font-mono bg-red-50 text-red-700 px-1 rounded">
                      {entry.oldValue || 'none'}
                    </span>
                    {' to '}
                    <span className="font-mono bg-green-50 text-green-700 px-1 rounded">
                      {entry.newValue}
                    </span>
                  </div>

                  {entry.reason && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Reason:</span> {entry.reason}
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>
                      <span className="font-medium">Changed by:</span> {entry.changedBy}
                    </span>
                    <span>
                      <span className="font-medium">When:</span> {formatDateTime(entry.changedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuditTrail;