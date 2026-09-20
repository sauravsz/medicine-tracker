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
    <div className="bg-[#131722] border border-[#1e2536] rounded-3xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0e121a] text-[#94a3b8] uppercase tracking-wider font-bold border-b border-[#1b2130]">
            <tr>
              <th className="py-3.5 px-5">Medicine</th>
              <th className="py-3.5 px-3 text-center">Daily Dose</th>
              <th className="py-3.5 px-4 text-center">On-Hand Stock</th>
              <th className="py-3.5 px-4">Depletion Horizon</th>
              <th className="py-3.5 px-4 text-center">In Transit</th>
              <th className="py-3.5 px-4 text-center">Order By (Vendor)</th>
              <th className="py-3.5 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b2130]">
            {medicines.map((item) => {
              const { medicine, urgency, on_hand_stock, days_remaining, stock_out_date, in_transit } = item;
              const hasInTransit = in_transit.orders.length > 0;
              const isCritical = urgency === "CRITICAL" || (days_remaining <= 2 && on_hand_stock <= 0);
              const isOrderSoon = urgency === "ORDER_SOON" || urgency === "ORDER_NOW";

              const stockPercent = Math.min(100, Math.max(0, Math.round((days_remaining / 30) * 100)));

              const progressColor = isCritical
                ? "bg-[#f43f5e]"
                : isOrderSoon
                ? "bg-[#facc15]"
                : hasInTransit
                ? "bg-[#38bdf8]"
                : "bg-[#34d399]";

              return (
                <tr key={medicine.id} className="hover:bg-[#181f2e] transition-colors group">
                  {/* Name & Strength */}
                  <td className="py-3.5 px-5">
                    <Link
                      href={`/medicines/${medicine.id}`}
                      className="font-bold text-[14px] text-white hover:text-[#ff385c] transition-colors flex items-center gap-2"
                    >
                      <span>{medicine.name}</span>
                      {medicine.strength && (
                        <span className="text-[11px] px-1.5 py-0.2 rounded bg-[#1c2333] text-[#cbd5e1] font-mono border border-[#2b364e]">
                          {medicine.strength}
                        </span>
                      )}
                    </Link>
                    <span className="text-[11px] text-[#64748b] capitalize">
                      {medicine.form} • {medicine.units_per_pack > 1 ? `${medicine.units_per_pack}/pk` : "Loose"}
                    </span>
                  </td>

                  {/* Daily Rate */}
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-white text-[13px]">
                    {item.daily_consumption} <span className="text-[10px] text-[#94a3b8] font-normal">/d</span>
                  </td>

                  {/* Stock On Hand */}
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="text-[14px] font-bold text-white">{on_hand_stock}</span>
                    <span className="text-[11px] text-[#94a3b8] ml-1">{medicine.unit_label}</span>
                  </td>

                  {/* Depletion Progress & Days Left */}
                  <td className="py-3.5 px-4 min-w-[150px]">
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span className={`font-bold ${isCritical ? "text-[#fb7185]" : isOrderSoon ? "text-[#fde047]" : "text-[#34d399]"}`}>
                        {days_remaining}d left
                      </span>
                      <span className="text-[#64748b]">({safeFormatDate(stock_out_date, "dd MMM")})</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#1b2230] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.max(4, stockPercent)}%` }}
                        className={`h-full rounded-full ${progressColor}`}
                      />
                    </div>
                  </td>

                  {/* In Transit */}
                  <td className="py-3.5 px-4 text-center">
                    {hasInTransit ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0b2233] text-[#38bdf8] border border-[#0e3b5e] text-[11px] font-semibold">
                        <Truck className="h-3 w-3" />
                        <span>+{in_transit.total_units}</span>
                      </span>
                    ) : (
                      <span className="text-[#475569]">—</span>
                    )}
                  </td>

                  {/* Order Cutoff */}
                  <td className="py-3.5 px-4 text-center font-mono">
                    {item.recommended_order_by !== "N/A" ? (
                      <div>
                        <span
                          className={`font-bold text-[12px] block ${
                            isCritical
                              ? "text-[#fb7185]"
                              : isOrderSoon
                              ? "text-[#fde047]"
                              : "text-[#34d399]"
                          }`}
                        >
                          {safeFormatDate(item.recommended_order_by, "dd MMM")}
                        </span>
                        <span className="text-[10px] text-[#64748b] uppercase">
                          {item.recommended_channel}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#475569]">N/A</span>
                    )}
                  </td>

                  {/* Quick Action */}
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onRestockClick(item)}
                        className="px-3 py-1.5 bg-[#ff385c] hover:bg-[#e00b41] text-white font-semibold rounded-full text-xs transition-all shadow-sm"
                      >
                        Restock
                      </button>
                      <button
                        onClick={() => onAdjustClick(item)}
                        title="Audit count"
                        className="p-1.5 text-[#94a3b8] hover:text-white bg-[#171d2b] hover:bg-[#1f2638] border border-[#273245] rounded-full transition-colors"
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
