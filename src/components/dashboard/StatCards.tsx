import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Truck,
  Pill,
} from "lucide-react";
import { DashboardStats } from "@/lib/types";

interface StatCardsProps {
  summary: DashboardStats;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
}

export function StatCards({ summary, activeFilter, onSelectFilter }: StatCardsProps) {
  const cards = [
    {
      id: "all",
      label: "Total Medicines",
      count: summary.total_medicines,
      icon: Pill,
      dotColor: "bg-[#222222]",
      badge: "Tracked",
    },
    {
      id: "CRITICAL",
      label: "Critical (Buy Offline)",
      count: summary.critical_count,
      icon: AlertOctagon,
      dotColor: "bg-[#c13515]",
      badge: "Stockout <2d",
    },
    {
      id: "ORDER_NOW",
      label: "Order Now (Offline)",
      count: summary.order_now_count,
      icon: AlertTriangle,
      dotColor: "bg-[#f97316]",
      badge: "Online Passed",
    },
    {
      id: "ORDER_SOON",
      label: "Order Soon (Mr. Med)",
      count: summary.order_soon_count,
      icon: Clock,
      dotColor: "bg-[#eab308]",
      badge: "Apollo Passed",
    },
    {
      id: "OK",
      label: "Stock Healthy",
      count: summary.ok_count,
      icon: CheckCircle2,
      dotColor: "bg-[#10b981]",
      badge: "Apollo Viable",
    },
    {
      id: "IN_TRANSIT",
      label: "In Transit Orders",
      count: summary.in_transit_orders_count,
      icon: Truck,
      dotColor: "bg-[#0284c7]",
      badge: "Awaiting",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;
        return (
          <button
            key={card.id}
            onClick={() => onSelectFilter(card.id)}
            className={`p-4 rounded-2xl bg-white border text-left transition-all cursor-pointer flex flex-col justify-between ${
              isActive
                ? "border-[#222222] ring-1 ring-[#222222] shadow-md"
                : "border-[#ebebeb] hover:border-[#c1c1c1] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-[12px] font-medium text-[#6a6a6a] truncate">{card.label}</span>
              <span className={`h-2 w-2 rounded-full ${card.dotColor} shrink-0`} />
            </div>
            <div>
              <div className="text-[26px] font-bold tracking-tight text-[#222222] font-mono leading-none">
                {card.count}
              </div>
              <p className="text-[11px] text-[#6a6a6a] mt-1.5 font-medium">{card.badge}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
