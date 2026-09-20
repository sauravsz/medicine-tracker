"use client";

import Link from "next/link";
import {
  Clock,
  Truck,
  Plus,
  ChevronRight,
  Pill,
  CheckCircle2,
  AlertCircle,
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

  // Safe progress percentage (capped at 100% relative to 30 days)
  const stockPercent = Math.min(100, Math.max(0, Math.round((days_remaining / 30) * 100)));

  const isCritical = urgency === "CRITICAL" || (days_remaining <= 2 && on_hand_stock <= 0);
  const isOrderSoon = urgency === "ORDER_SOON" || urgency === "ORDER_NOW";
  const hasInTransit = in_transit.orders.length > 0;

  // Color theme for progress bar & status
  const theme = isCritical
    ? {
        border: "border-[#4c1620] hover:border-[#7f1d1d]",
        badge: "bg-[#381119] text-[#fb7185] border-[#591c28]",
        progress: "bg-[#f43f5e]",
        daysText: "text-[#fb7185]",
      }
    : isOrderSoon
    ? {
        border: "border-[#452a12] hover:border-[#78350f]",
        badge: "bg-[#331e0c] text-[#fde047] border-[#57300c]",
        progress: "bg-[#facc15]",
        daysText: "text-[#fde047]",
      }
    : hasInTransit
    ? {
        border: "border-[#163047] hover:border-[#0284c7]",
        badge: "bg-[#0b2233] text-[#38bdf8] border-[#0e3b5e]",
        progress: "bg-[#38bdf8]",
        daysText: "text-[#38bdf8]",
      }
    : {
        border: "border-[#1e2536] hover:border-[#2f3b52]",
        badge: "bg-[#0c261e] text-[#34d399] border-[#134234]",
        progress: "bg-[#34d399]",
        daysText: "text-[#34d399]",
      };

  return (
    <div
      className={`rounded-2xl border bg-[#131722] transition-all p-5 flex flex-col justify-between group shadow-lg shadow-black/25 ${theme.border}`}
    >
      <div>
        {/* Header: Title + Strength + Status Chip */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <Link
              href={`/medicines/${medicine.id}`}
              className="font-bold text-[16px] text-white hover:text-[#ff385c] transition-colors flex items-center gap-2 group-hover:translate-x-0.5 transition-transform"
            >
              <span className="truncate">{medicine.name}</span>
              {medicine.strength && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1b2230] text-[#cbd5e1] font-mono border border-[#273245] font-medium shrink-0">
                  {medicine.strength}
                </span>
              )}
            </Link>
            <p className="text-[12px] text-[#94a3b8] mt-0.5">
              {item.daily_consumption} {medicine.unit_label}/day • {medicine.units_per_pack > 1 ? `${medicine.units_per_pack}/pk` : "Loose"}
            </p>
          </div>

          <div
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${theme.badge}`}
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

        {/* Stock Metrics & Visual Progress Bar */}
        <div className="my-3.5 space-y-2">
          <div className="flex items-baseline justify-between text-xs">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono text-white">{on_hand_stock}</span>
              <span className="text-[12px] text-[#94a3b8]">{medicine.unit_label} in hand</span>
            </div>
            <span className={`font-mono text-[12px] font-bold ${theme.daysText}`}>
              Runs dry: {safeFormatDate(stock_out_date, "dd MMM")}
            </span>
          </div>

          {/* Clean slim progress bar */}
          <div className="h-1.5 w-full bg-[#1b2230] rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.max(4, stockPercent)}%` }}
              className={`h-full rounded-full transition-all duration-500 ${theme.progress}`}
            />
          </div>
        </div>

        {/* In-Transit Order Badge (if active) */}
        {hasInTransit ? (
          <div className="mb-3 px-3 py-2 rounded-xl bg-[#0b2233] border border-[#0e3b5e] flex items-center justify-between text-xs text-[#38bdf8]">
            <div className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 shrink-0" />
              <span>
                Ordered: <strong>+{in_transit.total_units} {medicine.unit_label}</strong>
              </span>
            </div>
            <span className="font-mono text-[11px] font-medium">ETA: {in_transit.earliest_eta || "Soon"}</span>
          </div>
        ) : (
          /* Single Most Important Next Action Line */
          <div className="mb-3 px-3 py-2 rounded-xl bg-[#0e121a] border border-[#1b2130] flex items-center justify-between text-xs text-[#cbd5e1]">
            <span className="text-[#94a3b8] font-medium">Order By:</span>
            <span
              className={`font-mono font-bold ${
                isCritical
                  ? "text-[#fb7185]"
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
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1e2536]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRestockClick(item)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold text-white bg-[#ff385c] hover:bg-[#e00b41] active:scale-98 rounded-full transition-all shadow-md shadow-[#ff385c]/25"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Restock</span>
          </button>
          <button
            onClick={() => onAdjustClick(item)}
            title="Audit physical stock count"
            className="px-3 py-1.5 text-[12px] font-medium text-[#94a3b8] hover:text-white bg-[#171d2b] hover:bg-[#1f2638] border border-[#273245] rounded-full transition-colors"
          >
            <span>Count</span>
          </button>
        </div>

        <Link
          href={`/medicines/${medicine.id}`}
          className="text-[12px] font-semibold text-[#94a3b8] hover:text-white flex items-center gap-0.5 transition-colors"
        >
          <span>Details</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
