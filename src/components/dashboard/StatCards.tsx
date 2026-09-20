import {
  AlertTriangle,
  CheckCircle2,
  Truck,
  Pill,
  Clock,
  Sparkles,
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
      activeBg: "bg-white/10 text-white border-white/20",
    },
    {
      id: "URGENT",
      label: "Needs Reorder",
      count: urgentCount,
      color: "text-[#ff385c]",
      dot: "bg-[#ff385c] animate-pulse",
      activeBg: "bg-[#ff385c]/15 text-[#ff385c] border-[#ff385c]/40",
    },
    {
      id: "IN_TRANSIT",
      label: "In Transit",
      count: summary.in_transit_orders_count,
      color: "text-[#38bdf8]",
      dot: "bg-[#38bdf8]",
      activeBg: "bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/40",
    },
    {
      id: "OK",
      label: "Healthy Stock",
      count: summary.ok_count,
      color: "text-[#34d399]",
      dot: "bg-[#34d399]",
      activeBg: "bg-[#34d399]/15 text-[#34d399] border-[#34d399]/40",
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
            className={`px-4 py-2.5 rounded-full border text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer shrink-0 ${
              isActive
                ? `${chip.activeBg} shadow-sm ring-1 ring-white/10`
                : "bg-[#131722] border-[#1e2536] text-[#94a3b8] hover:text-white hover:border-[#2d374d]"
            }`}
          >
            {chip.dot && <span className={`h-2 w-2 rounded-full ${chip.dot} shrink-0`} />}
            <span>{chip.label}</span>
            <span className={`px-2 py-0.5 rounded-full bg-[#1b2230] text-[11px] font-mono font-bold ${chip.color}`}>
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
