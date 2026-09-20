"use client";

import Link from "next/link";
import {
  Calendar,
  Clock,
  Truck,
  Plus,
  Sliders,
  ChevronRight,
  Pill,
} from "lucide-react";
import { CalculatedMedicineState } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface MedicineCardProps {
  item: CalculatedMedicineState;
  onRestockClick: (item: CalculatedMedicineState) => void;
  onAdjustClick: (item: CalculatedMedicineState) => void;
}

export function MedicineCard({ item, onRestockClick, onAdjustClick }: MedicineCardProps) {
  const { medicine, urgency, on_hand_stock, days_remaining, stock_out_date, in_transit } = item;

  const urgencyConfig = {
    OK: {
      badgeBg: "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]",
      dot: "bg-[#10b981]",
    },
    ORDER_SOON: {
      badgeBg: "bg-[#fefce8] text-[#854d0e] border-[#fef08a]",
      dot: "bg-[#eab308]",
    },
    ORDER_NOW: {
      badgeBg: "bg-[#fff7ed] text-[#9a3412] border-[#fed7aa]",
      dot: "bg-[#f97316]",
    },
    CRITICAL: {
      badgeBg: "bg-[#fff1f2] text-[#9f1239] border-[#fecdd3]",
      dot: "bg-[#e11d48] animate-pulse",
    },
  }[urgency];

  return (
    <div className="rounded-2xl border border-[#ebebeb] bg-white hover:border-[#c1c1c1] transition-all p-5 flex flex-col justify-between group shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
      <div>
        {/* Header & Pill Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <Link
              href={`/medicines/${medicine.id}`}
              className="font-semibold text-[16px] text-[#222222] hover:text-[#ff385c] transition-colors flex items-center gap-2 group-hover:translate-x-0.5 transition-transform"
            >
              <span className="truncate">{medicine.name}</span>
              {medicine.strength && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f7f7f7] text-[#222222] font-mono border border-[#ebebeb] font-medium shrink-0">
                  {medicine.strength}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-1.5 mt-1 text-[13px] text-[#6a6a6a]">
              <span className="capitalize">{medicine.form}</span>
              <span>•</span>
              <span>
                {medicine.units_per_pack > 1
                  ? `${medicine.units_per_pack} ${medicine.unit_label}/pack`
                  : medicine.unit_label}
              </span>
              <span>•</span>
              <span className="font-semibold text-[#222222]">
                {item.daily_consumption} {medicine.unit_label}/day
              </span>
            </div>
          </div>

          <div
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 shrink-0 ${urgencyConfig.badgeBg}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${urgencyConfig.dot}`} />
            <span>{item.urgency_label}</span>
          </div>
        </div>

        {/* Stock & Burn Rate Display */}
        <div className="grid grid-cols-2 gap-3 my-4 p-3.5 rounded-xl bg-[#f7f7f7] border border-[#ebebeb]">
          <div>
            <span className="text-[11px] font-medium text-[#6a6a6a] block">Current Stock</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold font-mono text-[#222222]">{on_hand_stock}</span>
              <span className="text-[12px] text-[#6a6a6a]">{medicine.unit_label}</span>
            </div>
          </div>

          <div className="border-l border-[#dddddd] pl-3.5">
            <span className="text-[11px] font-medium text-[#6a6a6a] block">Runs Dry In</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-2xl font-bold font-mono ${
                  days_remaining <= 3
                    ? "text-[#c13515]"
                    : days_remaining <= 7
                    ? "text-[#ca8a04]"
                    : "text-[#16a34a]"
                }`}
              >
                {days_remaining}
              </span>
              <span className="text-[12px] text-[#6a6a6a]">days ({format(parseISO(stock_out_date), "dd MMM")})</span>
            </div>
          </div>
        </div>

        {/* In-Transit Banner */}
        {in_transit.orders.length > 0 && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-[#f0f9ff] border border-[#bae6fd] flex items-center justify-between text-xs text-[#0369a1]">
            <div className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-[#0284c7] shrink-0" />
              <span>
                Ordered: <strong>+{in_transit.total_units} {medicine.unit_label}</strong>
              </span>
            </div>
            <span className="font-mono text-[11px] font-medium">
              ETA: {in_transit.earliest_eta || "Soon"}
            </span>
          </div>
        )}

        {/* Channel Deadlines */}
        <div className="space-y-1.5 my-3">
          <div className="text-[11px] font-bold text-[#6a6a6a] uppercase tracking-wider">
            Channel Deadlines
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {item.deadlines.map((dl) => {
              const isPassed = !dl.is_viable_today && dl.available;
              return (
                <div
                  key={dl.channel}
                  className={`p-2 rounded-xl border text-center transition-colors ${
                    !dl.available
                      ? "bg-[#f7f7f7] border-[#ebebeb] text-[#929292] line-through"
                      : isPassed
                      ? "bg-[#fff1f2] border-[#fecdd3] text-[#9f1239]"
                      : "bg-[#ffffff] border-[#ebebeb] text-[#222222]"
                  }`}
                >
                  <div className="text-[10px] font-medium text-[#6a6a6a] truncate">
                    {dl.channel === "apollo"
                      ? "Apollo (10d)"
                      : dl.channel === "mr_med"
                      ? "Mr. Med (5d)"
                      : "Offline (1d)"}
                  </div>
                  <div
                    className={`font-mono text-[11px] font-bold mt-0.5 ${
                      !dl.available
                        ? "text-[#929292]"
                        : isPassed
                        ? "text-[#c13515]"
                        : "text-[#16a34a]"
                    }`}
                  >
                    {!dl.available ? "N/A" : format(parseISO(dl.order_by_date), "dd MMM")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Recommendation */}
        <div className="text-[12px] bg-[#f7f7f7] p-2.5 rounded-xl border border-[#ebebeb] text-[#3f3f3f]">
          <span className="font-bold text-[#222222]">Action: </span>
          <span>{item.recommended_action}</span>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-[#ebebeb]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRestockClick(item)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold text-white bg-[#ff385c] hover:bg-[#e00b41] active:scale-98 rounded-full transition-all shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Restock</span>
          </button>
          <button
            onClick={() => onAdjustClick(item)}
            title="Audit physical stock count"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#222222] hover:bg-[#f7f7f7] border border-[#dddddd] rounded-full transition-colors"
          >
            <Sliders className="h-3.5 w-3.5 text-[#6a6a6a]" />
            <span>Count</span>
          </button>
        </div>

        <Link
          href={`/medicines/${medicine.id}`}
          className="text-[13px] font-semibold text-[#222222] hover:text-[#ff385c] flex items-center gap-0.5 transition-colors"
        >
          <span>Details</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
