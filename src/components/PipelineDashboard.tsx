"use client";
import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AuditTrail from "./AuditTrail";
import BulkReorganizationTool from "./BulkReorganizationTool";
import CollapsibleCard from "./CollapsibleCard";
import DealList from "./DealList";
import PerformanceMetrics from "./PerformanceMetrics";
import PipelineFunnel from "./PipelineFunnel";
import RepWorkloadDashboard from "./RepWorkloadDashboard";
import TerritoryDashboard from "./TerritoryDashboard";

interface CardItem {
  id: string;
  title: string;
  component: React.ReactNode;
  defaultExpanded?: boolean;
}

interface SortableCardProps {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const SortableCard: React.FC<SortableCardProps> = ({ id, title, children, defaultExpanded = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandle = (
    <div 
      {...listeners} 
      className="w-6 h-6 cursor-grab flex items-center justify-center text-gray-400 hover:text-gray-600 active:cursor-grabbing"
      onClick={(e) => e.stopPropagation()}
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
      </svg>
    </div>
  );

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <CollapsibleCard 
        title={title} 
        defaultExpanded={defaultExpanded}
        dragHandle={dragHandle}
      >
        {children}
      </CollapsibleCard>
    </div>
  );
};

const PipelineDashboard: React.FC = () => {
  const [pipelineData, setPipelineData] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchPipelineData = async () => {
      try {
        const response = await fetch('/api/deals');
        if (response.ok) {
          const data = await response.json();
          setPipelineData(data);
        }
      } catch (error) {
        console.error('Failed to fetch pipeline data:', error);
      }
    };
    fetchPipelineData();
  }, []);

  const totalDeals = pipelineData?.totalDeals || 0;

  const cards: CardItem[] = [
    {
      id: "territory",
      title: "Territory Summary",
      component: <TerritoryDashboard />,
      defaultExpanded: false,
    },
    {
      id: "deals",
      title: `Deal List (${totalDeals})`,
      component: <DealList />,
      defaultExpanded: false,
    },
    {
      id: "workload",
      title: "Sales Rep Workload Analysis",
      component: <RepWorkloadDashboard />,
      defaultExpanded: false,
    },
    {
      id: "bulk",
      title: "Bulk Sales Rep Reassignment",
      component: <BulkReorganizationTool />,
      defaultExpanded: false,
    },
    {
      id: "audit",
      title: "Recent Changes & Audit Trail",
      component: <AuditTrail showAllDeals={true} />,
      defaultExpanded: false,
    },
  ];

  const [cardOrder, setCardOrder] = useState(cards.map(card => card.id));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setCardOrder((items) => {
        const oldIndex = items.findIndex((item) => item === active.id);
        const newIndex = items.findIndex((item) => item === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const orderedCards = cardOrder.map(id => cards.find(card => card.id === id)!).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Pipeline Analytics Dashboard
        </h1>

        <div className="space-y-4 lg:space-y-6">
          {/* Top Row - Pipeline Overview and Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Pipeline Overview
              </h2>
              <div className="overflow-hidden">
                <PipelineFunnel />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Performance Metrics
              </h2>
              <div className="overflow-hidden">
                <PerformanceMetrics />
              </div>
            </div>
          </div>

          {/* Draggable Cards */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={cardOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {orderedCards.map((card) => (
                  <SortableCard
                    key={card.id}
                    id={card.id}
                    title={card.title}
                    defaultExpanded={card.defaultExpanded}
                  >
                    {card.component}
                  </SortableCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
};

export default PipelineDashboard;
