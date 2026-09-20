import {
  AlertTriangle,
  CheckCircle2,
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
  const urgentCount = summary.critical_count + summary.order_now_count + summary.order_soon_count;

  const chips = [
    {
      id: "all",
      label: "All Medicines",
      count: summary.total_medicines,
      color: "text-white",
      activeStyle: "bg-white/15 text-white border-white/25 shadow-lg shadow-white/5",
    },
    {
      id: "URGENT",
      label: "Needs Reorder",
      count: urgentCount,
      color: "text-[#ff385c]",
      dot: "bg-[#ff385c] animate-pulse shadow-sm shadow-[#ff385c]",
      activeStyle: "bg-[#ff385c]/20 text-[#ff4d6d] border-[#ff385c]/40 shadow-lg shadow-[#ff385c]/20",
    },
    {
      id: "IN_TRANSIT",
      label: "In Transit",
      count: summary.in_transit_orders_count,
      color: "text-[#38bdf8]",
      dot: "bg-[#38bdf8] shadow-sm shadow-[#38bdf8]",
      activeStyle: "bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/40 shadow-lg shadow-[#38bdf8]/20",
    },
    {
      id: "OK",
      label: "Healthy Stock",
      count: summary.ok_count,
      color: "text-[#34d399]",
      dot: "bg-[#34d399] shadow-sm shadow-[#34d399]",
      activeStyle: "bg-[#34d399]/20 text-[#34d399] border-[#34d399]/40 shadow-lg shadow-[#34d399]/20",
    },
  ];

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
      {chips.map((chip) => {
        const isActive = activeFilter === chip.id;
        return (
          <button
            key={chip.id}
            onClick={() => onSelectFilter(chip.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer shrink-0 spring-tap ${
              isActive
                ? `${chip.activeStyle} ring-1 ring-white/15`
                : "liquid-glass-pill text-[#94a3b8] hover:text-white"
            }`}
          >
            {chip.dot && <span className={`h-2 w-2 rounded-full ${chip.dot} shrink-0`} />}
            <span>{chip.label}</span>
            <span className={`px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-mono font-bold ${chip.color}`}>
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
