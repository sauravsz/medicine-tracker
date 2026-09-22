"use client";

import Link from "next/link";
import { Plus, Sliders, Truck, ChevronRight } from "lucide-react";
import { CalculatedMedicineState } from "@/lib/types";
import { safeFormatDate } from "@/lib/calculations";

interface MedicineTableViewProps {
  medicines: CalculatedMedicineState[];
  onRestockClick: (item: CalculatedMedicineState) => void;
  onAdjustClick: (item: CalculatedMedicineState) => void;
}

export function MedicineTableView({
  medicines,
  onRestockClick,
  onAdjustClick,
}: MedicineTableViewProps) {
  return (
    <div className="liquid-glass-panel rounded-3xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-black/40 backdrop-blur-md text-[#94a3b8] uppercase tracking-wider font-bold border-b border-white/10">
            <tr>
              <th className="py-4 px-5">Medicine</th>
              <th className="py-4 px-3 text-center">Daily Rate</th>
              <th className="py-4 px-4 text-center">On-Hand Stock</th>
              <th className="py-4 px-4">Depletion Horizon</th>
              <th className="py-4 px-4 text-center">In Transit</th>
              <th className="py-4 px-4 text-center">Order By (Vendor)</th>
              <th className="py-4 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {medicines.map((item) => {
              const { medicine, urgency, on_hand_stock, days_remaining, stock_out_date, in_transit } = item;
              const hasInTransit = in_transit.orders.length > 0;
              const isCritical = urgency === "CRITICAL" || (days_remaining <= 2 && on_hand_stock <= 0);
              const isOrderSoon = urgency === "ORDER_SOON" || urgency === "ORDER_NOW";

              const stockPercent = Math.min(100, Math.max(0, Math.round((days_remaining / 30) * 100)));

              const progressGradient = isCritical
                ? "bg-gradient-to-r from-rose-500 to-[#ff385c]"
                : isOrderSoon
                ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                : hasInTransit
                ? "bg-gradient-to-r from-sky-500 to-cyan-400"
                : "bg-gradient-to-r from-emerald-500 to-teal-400";

              return (
                <tr key={medicine.id} className="hover:bg-white/[0.04] transition-colors group">
                  {/* Name & Strength */}
                  <td className="py-4 px-5">
                    <Link
                      href={`/medicines/${medicine.id}`}
                      className="font-bold text-[14px] text-white hover:text-[#ff385c] transition-colors inline-block"
                    >
                      <span>{medicine.name}</span>
                    </Link>
                    <span className="text-[11px] text-[#94a3b8] capitalize">
                      {medicine.form} • {medicine.units_per_pack > 1 ? `${medicine.units_per_pack}/pk` : "Loose"}
                    </span>
                  </td>

                  {/* Dosage Rate / Frequency */}
                  <td className="py-4 px-3 text-center font-mono font-semibold text-white text-[12px]">
                    {item.frequency_label || `${item.daily_consumption}/d`}
                  </td>

                  {/* Stock On Hand */}
                  <td className="py-4 px-4 text-center font-mono">
                    <span className="text-[15px] font-black text-white">{on_hand_stock}</span>
                    <span className="text-[11px] text-[#94a3b8] ml-1">{medicine.unit_label}</span>
                  </td>

                  {/* Depletion Progress & Days Left */}
                  <td className="py-4 px-4 min-w-[160px]">
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                      <span className={`font-bold ${isCritical ? "text-[#fda4af]" : isOrderSoon ? "text-[#fde047]" : "text-[#34d399]"}`}>
                        {days_remaining}d left
                      </span>
                      <span className="text-[#64748b]">({safeFormatDate(stock_out_date, "dd MMM")})</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div
                        style={{ width: `${Math.max(4, stockPercent)}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${progressGradient}`}
                      />
                    </div>
                  </td>

                  {/* In Transit */}
                  <td className="py-4 px-4 text-center">
                    {hasInTransit ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 text-[#38bdf8] border border-sky-500/30 text-[11px] font-bold">
                        <Truck className="h-3 w-3" />
                        <span>+{in_transit.total_units}</span>
                      </span>
                    ) : (
                      <span className="text-[#475569]">—</span>
                    )}
                  </td>

                  {/* Order Cutoff */}
                  <td className="py-4 px-4 text-center font-mono">
                    {item.recommended_order_by !== "N/A" ? (
                      <div>
                        <span
                          className={`font-bold text-[12px] block ${
                            isCritical
                              ? "text-[#fda4af]"
                              : isOrderSoon
                              ? "text-[#fde047]"
                              : "text-[#34d399]"
                          }`}
                        >
                          {safeFormatDate(item.recommended_order_by, "dd MMM")}
                        </span>
                        <span className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-wide">
                          {item.recommended_channel}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#475569]">N/A</span>
                    )}
                  </td>

                  {/* Quick Action */}
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onRestockClick(item)}
                        className="px-3.5 py-1.5 liquid-btn-primary font-semibold rounded-full text-xs spring-tap"
                      >
                        Restock
                      </button>
                      <button
                        onClick={() => onAdjustClick(item)}
                        title="Audit count"
                        className="p-1.5 text-[#cbd5e1] hover:text-white liquid-glass-pill rounded-full spring-tap"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
