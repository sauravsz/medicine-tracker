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
      badgeBg: "bg-[#064e3b]/50 text-[#34d399] border-[#065f46]",
      dot: "bg-[#34d399]",
    },
    ORDER_SOON: {
      badgeBg: "bg-[#78350f]/40 text-[#fde047] border-[#92400e]",
      dot: "bg-[#facc15]",
    },
    ORDER_NOW: {
      badgeBg: "bg-[#7c2d12]/40 text-[#fdba74] border-[#9a3412]",
      dot: "bg-[#fb923c]",
    },
    CRITICAL: {
      badgeBg: "bg-[#881337]/50 text-[#fda4af] border-[#9f1239]",
      dot: "bg-[#f43f5e] animate-pulse",
    },
  }[urgency];

  return (
    <div className="rounded-2xl border border-[#1e2536] bg-[#131722] hover:border-[#35415c] transition-all p-5 flex flex-col justify-between group shadow-lg shadow-black/20">
      <div>
        {/* Header & Pill Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <Link
              href={`/medicines/${medicine.id}`}
              className="font-semibold text-[16px] text-white hover:text-[#ff385c] transition-colors flex items-center gap-2 group-hover:translate-x-0.5 transition-transform"
            >
              <span className="truncate">{medicine.name}</span>
              {medicine.strength && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1c2333] text-[#cbd5e1] font-mono border border-[#2b364e] font-medium shrink-0">
                  {medicine.strength}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-1.5 mt-1 text-[13px] text-[#94a3b8]">
              <span className="capitalize">{medicine.form}</span>
              <span>•</span>
              <span>
                {medicine.units_per_pack > 1
                  ? `${medicine.units_per_pack} ${medicine.unit_label}/pack`
                  : medicine.unit_label}
              </span>
              <span>•</span>
              <span className="font-semibold text-white">
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
        <div className="grid grid-cols-2 gap-3 my-4 p-3.5 rounded-xl bg-[#0e121a] border border-[#1b2130]">
          <div>
            <span className="text-[11px] font-medium text-[#94a3b8] block">Current Stock</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold font-mono text-white">{on_hand_stock}</span>
              <span className="text-[12px] text-[#94a3b8]">{medicine.unit_label}</span>
            </div>
          </div>

          <div className="border-l border-[#242b3b] pl-3.5">
            <span className="text-[11px] font-medium text-[#94a3b8] block">Runs Dry In</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-2xl font-bold font-mono ${
                  days_remaining <= 3
                    ? "text-[#fb7185]"
                    : days_remaining <= 7
                    ? "text-[#fde047]"
                    : "text-[#34d399]"
                }`}
              >
                {days_remaining}
              </span>
              <span className="text-[12px] text-[#94a3b8]">days ({format(parseISO(stock_out_date), "dd MMM")})</span>
            </div>
          </div>
        </div>

        {/* In-Transit Banner */}
        {in_transit.orders.length > 0 && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-[#0c2333] border border-[#0369a1] flex items-center justify-between text-xs text-[#38bdf8]">
            <div className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-[#38bdf8] shrink-0" />
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
          <div className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
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
                      ? "bg-[#0e121a] border-[#1b2130] text-[#475569] line-through"
                      : isPassed
                      ? "bg-[#331118] border-[#6b1e2a] text-[#fda4af]"
                      : "bg-[#0e121a] border-[#1b2130] text-[#f1f5f9]"
                  }`}
                >
                  <div className="text-[10px] font-medium text-[#94a3b8] truncate">
                    {dl.channel === "apollo"
                      ? "Apollo (10d)"
                      : dl.channel === "mr_med"
                      ? "Mr. Med (5d)"
                      : "Offline (1d)"}
                  </div>
                  <div
                    className={`font-mono text-[11px] font-bold mt-0.5 ${
                      !dl.available
                        ? "text-[#475569]"
                        : isPassed
                        ? "text-[#fb7185]"
                        : "text-[#34d399]"
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
        <div className="text-[12px] bg-[#0e121a] p-2.5 rounded-xl border border-[#1b2130] text-[#cbd5e1]">
          <span className="font-bold text-white">Action: </span>
          <span>{item.recommended_action}</span>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-[#1e2536]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRestockClick(item)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold text-white bg-[#ff385c] hover:bg-[#e00b41] active:scale-98 rounded-full transition-all shadow-md shadow-[#ff385c]/25"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Restock</span>
          </button>
          <button
            onClick={() => onAdjustClick(item)}
            title="Audit physical stock count"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium text-[#cbd5e1] hover:text-white bg-[#171d2b] hover:bg-[#1f2638] border border-[#293347] rounded-full transition-colors"
          >
            <Sliders className="h-3.5 w-3.5 text-[#94a3b8]" />
            <span>Count</span>
          </button>
        </div>

        <Link
          href={`/medicines/${medicine.id}`}
          className="text-[13px] font-semibold text-[#cbd5e1] hover:text-[#ff385c] flex items-center gap-0.5 transition-colors"
        >
          <span>Details</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
