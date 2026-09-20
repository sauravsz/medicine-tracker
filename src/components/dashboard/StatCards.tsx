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
      dotColor: "bg-white",
      badge: "Tracked",
    },
    {
      id: "CRITICAL",
      label: "Critical (Buy Offline)",
      count: summary.critical_count,
      icon: AlertOctagon,
      dotColor: "bg-[#f43f5e]",
      badge: "Stockout <2d",
    },
    {
      id: "ORDER_NOW",
      label: "Order Now (Offline)",
      count: summary.order_now_count,
      icon: AlertTriangle,
      dotColor: "bg-[#fb923c]",
      badge: "Online Passed",
    },
    {
      id: "ORDER_SOON",
      label: "Order Soon (Mr. Med)",
      count: summary.order_soon_count,
      icon: Clock,
      dotColor: "bg-[#facc15]",
      badge: "Apollo Passed",
    },
    {
      id: "OK",
      label: "Stock Healthy",
      count: summary.ok_count,
      icon: CheckCircle2,
      dotColor: "bg-[#34d399]",
      badge: "Apollo Viable",
    },
    {
      id: "IN_TRANSIT",
      label: "In Transit Orders",
      count: summary.in_transit_orders_count,
      icon: Truck,
      dotColor: "bg-[#38bdf8]",
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
            className={`p-4 rounded-2xl bg-[#131722] border text-left transition-all cursor-pointer flex flex-col justify-between shadow-sm ${
              isActive
                ? "border-[#ff385c] ring-1 ring-[#ff385c] shadow-lg shadow-[#ff385c]/10"
                : "border-[#1e2536] hover:border-[#313c54]"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-[12px] font-medium text-[#94a3b8] truncate">{card.label}</span>
              <span className={`h-2 w-2 rounded-full ${card.dotColor} shrink-0`} />
            </div>
            <div>
              <div className="text-[26px] font-bold tracking-tight text-white font-mono leading-none">
                {card.count}
              </div>
              <p className="text-[11px] text-[#64748b] mt-1.5 font-medium">{card.badge}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
