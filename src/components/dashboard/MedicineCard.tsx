"use client";

import Link from "next/link";
import {
  Clock,
  Truck,
  Plus,
  ChevronRight,
  Pill,
} from "lucide-react";
import { CalculatedMedicineState } from "@/lib/types";
import { safeFormatDate } from "@/lib/calculations";

interface MedicineCardProps {
  item: CalculatedMedicineState;
  onRestockClick: (item: CalculatedMedicineState) => void;
  onAdjustClick: (item: CalculatedMedicineState) => void;
}

export function MedicineCard({ item, onRestockClick, onAdjustClick }: MedicineCardProps) {
  const { medicine, urgency, on_hand_stock, days_remaining, stock_out_date, in_transit } = item;

  // Percentage calculation capped at 100%
  const stockPercent = Math.min(100, Math.max(0, Math.round((days_remaining / 30) * 100)));

  const isCritical = urgency === "CRITICAL" || (days_remaining <= 2 && on_hand_stock <= 0);
  const isOrderSoon = urgency === "ORDER_SOON" || urgency === "ORDER_NOW";
  const hasInTransit = in_transit.orders.length > 0;

  // Liquid glass status badge themes
  const theme = isCritical
    ? {
        border: "hover:border-rose-500/50",
        badge: "bg-rose-500/15 text-[#fda4af] border-rose-500/30 shadow-sm shadow-rose-950",
        progress: "bg-gradient-to-r from-rose-500 to-[#ff385c]",
        daysText: "text-[#fda4af]",
      }
    : isOrderSoon
    ? {
        border: "hover:border-amber-500/50",
        badge: "bg-amber-500/15 text-[#fde047] border-amber-500/30 shadow-sm shadow-amber-950",
        progress: "bg-gradient-to-r from-amber-500 to-yellow-400",
        daysText: "text-[#fde047]",
      }
    : hasInTransit
    ? {
        border: "hover:border-sky-500/50",
        badge: "bg-sky-500/15 text-[#38bdf8] border-sky-500/30 shadow-sm shadow-sky-950",
        progress: "bg-gradient-to-r from-sky-500 to-cyan-400",
        daysText: "text-[#38bdf8]",
      }
    : {
        border: "hover:border-emerald-500/50",
        badge: "bg-emerald-500/15 text-[#34d399] border-emerald-500/30 shadow-sm shadow-emerald-950",
        progress: "bg-gradient-to-r from-emerald-500 to-teal-400",
        daysText: "text-[#34d399]",
      };

  return (
    <div
      className={`rounded-3xl liquid-glass-card p-5 flex flex-col justify-between group relative overflow-hidden ${theme.border}`}
    >
      <div>
        {/* Header: Title + Status Chip */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <Link
              href={`/medicines/${medicine.id}`}
              className="font-bold text-[16px] text-white hover:text-[#ff385c] transition-colors flex items-center gap-2 group-hover:translate-x-0.5 transition-transform"
            >
              <span className="truncate">{medicine.name}</span>
            </Link>
            <p className="text-[12px] text-[#94a3b8] mt-0.5 font-medium">
              {item.daily_consumption} {medicine.unit_label}/day • {medicine.units_per_pack > 1 ? `${medicine.units_per_pack}/pk` : "Loose"}
            </p>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-md shrink-0 ${theme.badge}`}
          >
            {hasInTransit && on_hand_stock <= 0 ? (
              "En Route"
            ) : days_remaining <= 0 ? (
              "Stock 0"
            ) : (
              `${days_remaining}d stock`
            )}
          </div>
        </div>

        {/* Stock Metrics & Liquid Progress Bar */}
        <div className="my-3.5 space-y-2 p-3.5 rounded-2xl bg-black/30 border border-white/5 backdrop-blur-md">
          <div className="flex items-baseline justify-between text-xs">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-white tracking-tight">{on_hand_stock}</span>
              <span className="text-[12px] text-[#94a3b8] font-medium">{medicine.unit_label}</span>
            </div>
            <span className={`font-mono text-[12px] font-bold ${theme.daysText}`}>
              Depletion: {safeFormatDate(stock_out_date, "dd MMM")}
            </span>
          </div>

          {/* Liquid progress bar with glow */}
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              style={{ width: `${Math.max(4, stockPercent)}%` }}
              className={`h-full rounded-full transition-all duration-700 shadow-sm ${theme.progress}`}
            />
          </div>
        </div>

        {/* In-Transit Order Badge (if active) */}
        {hasInTransit ? (
          <div className="mb-3 px-3.5 py-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 backdrop-blur-md flex items-center justify-between text-xs text-[#38bdf8]">
            <div className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 shrink-0" />
              <span>
                Ordered: <strong>+{in_transit.total_units} {medicine.unit_label}</strong>
              </span>
            </div>
            <span className="font-mono text-[11px] font-semibold">ETA: {in_transit.earliest_eta || "Soon"}</span>
          </div>
        ) : (
          /* Single Most Important Next Action Line */
          <div className="mb-3 px-3.5 py-2.5 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md flex items-center justify-between text-xs text-[#cbd5e1]">
            <span className="text-[#94a3b8] font-medium">Reorder By:</span>
            <span
              className={`font-mono font-bold ${
                isCritical
                  ? "text-[#fda4af]"
                  : isOrderSoon
                  ? "text-[#fde047]"
                  : "text-[#34d399]"
              }`}
            >
              {item.recommended_order_by !== "N/A"
                ? `${safeFormatDate(item.recommended_order_by, "dd MMM yyyy")} (${item.recommended_channel})`
                : "N/A"}
            </span>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRestockClick(item)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold liquid-btn-primary rounded-full transition-all spring-tap"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Restock</span>
          </button>
          <button
            onClick={() => onAdjustClick(item)}
            title="Audit physical stock count"
            className="px-3.5 py-1.5 text-[12px] font-semibold text-[#cbd5e1] hover:text-white liquid-glass-pill rounded-full transition-all spring-tap"
          >
            <span>Count</span>
          </button>
        </div>

        <Link
          href={`/medicines/${medicine.id}`}
          className="text-[12px] font-semibold text-[#94a3b8] hover:text-white flex items-center gap-0.5 transition-colors spring-tap"
        >
          <span>Details</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
