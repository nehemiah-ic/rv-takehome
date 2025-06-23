"use client";
import React, { useState } from "react";

interface CollapsibleCardProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  dragHandle?: React.ReactNode;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  children,
  defaultExpanded = true,
  className = "",
  dragHandle,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-200 relative"
        onClick={toggleExpanded}
      >
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <div className="flex items-center space-x-2">
          {dragHandle}
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {isExpanded && (
        <div className="p-4 overflow-hidden">
          <div className="overflow-x-auto">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollapsibleCard;