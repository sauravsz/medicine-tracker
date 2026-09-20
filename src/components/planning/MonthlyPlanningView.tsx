"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Building2,
  Truck,
  Plus,
  Layers,
} from "lucide-react";
import { CalculatedMedicineState } from "@/lib/types";
import { QuickRestockModal } from "@/components/dashboard/QuickRestockModal";
import { safeFormatDate } from "@/lib/calculations";

interface MonthlyPlanningViewProps {
  medicines: CalculatedMedicineState[];
}

export function MonthlyPlanningView({ medicines }: MonthlyPlanningViewProps) {
  const [selectedForRestock, setSelectedForRestock] = useState<CalculatedMedicineState | null>(null);
  const [vendorFilter, setVendorFilter] = useState<string>("all");

  const apolloGroup = medicines.filter((m) => m.monthly_planning.recommended_channel === "apollo");
  const mrMedGroup = medicines.filter((m) => m.monthly_planning.recommended_channel === "mr_med");
  const offlineGroup = medicines.filter((m) => m.monthly_planning.recommended_channel === "offline");

  const filteredMedicines = medicines.filter((m) => {
    if (vendorFilter === "all") return true;
    return m.monthly_planning.recommended_channel === vendorFilter;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3 font-sans">
            <span>Monthly Procurement Planning</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15 font-bold font-mono">
              30-Day Math
            </span>
          </h1>
          <p className="text-sm text-[#94a3b8] mt-1">
            Exact monthly strip/pack requirement based on prescribed daily frequency and packaging units.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/medicines/new"
            className="inline-flex items-center gap-2 px-6 py-2.5 text-[14px] font-semibold liquid-btn-primary rounded-full shadow-md transition-all spring-tap"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add Medicine</span>
          </Link>
        </div>
      </div>

      {/* 3 Vendor Procurement Buckets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Apollo 24|7 */}
        <div className="liquid-glass-card rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#ff385c]" />
                <span>Apollo 24|7 (Bulk Online)</span>
              </span>
              <span className="text-xs font-mono text-[#94a3b8] px-2.5 py-0.5 rounded-full bg-black/40 border border-white/10">
                7–10d Lead
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Order chronic supplies 12–14 days in advance to maximize discounts.
            </p>

            <div className="my-4 p-4 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between">
              <span className="text-xs font-medium text-[#94a3b8]">Monthly Meds:</span>
              <span className="font-mono font-bold text-white text-lg">
                {apolloGroup.length} item{apolloGroup.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[#94a3b8] bg-black/40 p-3 rounded-xl border border-white/5">
            Order cutoff: 10 days before stockout + 2d buffer
          </div>
        </div>

        {/* Mr. Med */}
        <div className="liquid-glass-card rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[#ff385c]" />
                <span>Mr. Med (Specialty Online)</span>
              </span>
              <span className="text-xs font-mono text-[#94a3b8] px-2.5 py-0.5 rounded-full bg-black/40 border border-white/10">
                3–5d Lead
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Fast online delivery for specialty chronic meds when Apollo cutoff passed.
            </p>

            <div className="my-4 p-4 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between">
              <span className="text-xs font-medium text-[#94a3b8]">Monthly Meds:</span>
              <span className="font-mono font-bold text-white text-lg">
                {mrMedGroup.length} item{mrMedGroup.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[#94a3b8] bg-black/40 p-3 rounded-xl border border-white/5">
            Order cutoff: 5 days before stockout + 2d buffer
          </div>
        </div>

        {/* Offline Store */}
        <div className="liquid-glass-card rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#ff385c]" />
                <span>Local Offline Pharmacy</span>
              </span>
              <span className="text-xs font-mono text-[#94a3b8] px-2.5 py-0.5 rounded-full bg-black/40 border border-white/10">
                0–1d Immediate
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Walk-in purchase for emergency gaps or medications unavailable online.
            </p>

            <div className="my-4 p-4 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between">
              <span className="text-xs font-medium text-[#94a3b8]">Monthly Meds:</span>
              <span className="font-mono font-bold text-white text-lg">
                {offlineGroup.length} item{offlineGroup.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[#94a3b8] bg-black/40 p-3 rounded-xl border border-white/5">
            Order cutoff: 1 day before stockout + 2d buffer
          </div>
        </div>
      </div>

      {/* Main Procurement Table */}
      <div className="liquid-glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#ff385c]" />
              <span>30-Day Pack & Strip Calculator</span>
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Calculates exact whole-pack purchase quantities given prescribed daily dose and pack size.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVendorFilter("all")}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all spring-tap ${
                vendorFilter === "all"
                  ? "bg-[#ff385c] text-white shadow-md shadow-[#ff385c]/25"
                  : "liquid-glass-pill text-[#94a3b8] hover:text-white"
              }`}
            >
              All ({medicines.length})
            </button>
            <button
              onClick={() => setVendorFilter("apollo")}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all spring-tap ${
                vendorFilter === "apollo"
                  ? "bg-[#ff385c] text-white shadow-md shadow-[#ff385c]/25"
                  : "liquid-glass-pill text-[#94a3b8] hover:text-white"
              }`}
            >
              Apollo ({apolloGroup.length})
            </button>
            <button
              onClick={() => setVendorFilter("mr_med")}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all spring-tap ${
                vendorFilter === "mr_med"
                  ? "bg-[#ff385c] text-white shadow-md shadow-[#ff385c]/25"
                  : "liquid-glass-pill text-[#94a3b8] hover:text-white"
              }`}
            >
              Mr. Med ({mrMedGroup.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/40 text-[#94a3b8] uppercase tracking-wider font-bold border-b border-white/10 backdrop-blur-md">
              <tr>
                <th className="py-4 px-4">Medicine & Dose</th>
                <th className="py-4 px-3 text-center">Daily Rate</th>
                <th className="py-4 px-3 text-center">30d Need</th>
                <th className="py-4 px-3 text-center">Pack Size</th>
                <th className="py-4 px-3 text-center">Packs Needed</th>
                <th className="py-4 px-3 text-center">Total Units</th>
                <th className="py-4 px-4 text-center">Vendor</th>
                <th className="py-4 px-4 text-center">Reorder Deadline</th>
                <th className="py-4 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredMedicines.map((item) => {
                const plan = item.monthly_planning;
                return (
                  <tr
                    key={item.medicine.id}
                    className="hover:bg-white/[0.04] transition-colors group"
                  >
                    {/* Name */}
                    <td className="py-4 px-4">
                      <Link
                        href={`/medicines/${item.medicine.id}`}
                        className="font-bold text-[14px] text-white hover:text-[#ff385c] transition-colors flex items-center gap-1.5"
                      >
                        <span>{item.medicine.name}</span>
                        {item.medicine.strength && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white font-mono border border-white/15">
                            {item.medicine.strength}
                          </span>
                        )}
                      </Link>
                      <span className="text-[11px] text-[#94a3b8] capitalize">
                        {item.medicine.form} • Current Stock: {item.on_hand_stock} {item.medicine.unit_label}
                      </span>
                    </td>

                    {/* Daily Rate */}
                    <td className="py-4 px-3 text-center font-mono font-bold text-white">
                      {item.daily_consumption} <span className="text-[10px] text-[#94a3b8] font-normal">/d</span>
                    </td>

                    {/* 30d Units */}
                    <td className="py-4 px-3 text-center font-mono font-semibold text-white">
                      {plan.monthly_units} <span className="text-[10px] text-[#94a3b8] font-normal">{item.medicine.unit_label}</span>
                    </td>

                    {/* Pack Size */}
                    <td className="py-4 px-3 text-center font-mono text-[#94a3b8]">
                      {plan.units_per_pack > 1
                        ? `${plan.units_per_pack} ${item.medicine.unit_label}/pk`
                        : "Loose"}
                    </td>

                    {/* Packs Needed */}
                    <td className="py-4 px-3 text-center">
                      <span className="px-3 py-1 rounded-full bg-white/10 text-white border border-white/15 font-mono font-bold text-xs">
                        {plan.packs_needed} pk
                      </span>
                    </td>

                    {/* Total Units Purchased */}
                    <td className="py-4 px-3 text-center font-mono text-white">
                      {plan.total_units_purchased} {item.medicine.unit_label}
                      {plan.buffer_units > 0 && (
                        <span className="text-[10px] text-[#34d399] block font-medium">
                          (+{plan.buffer_units} surplus)
                        </span>
                      )}
                    </td>

                    {/* Recommended Channel */}
                    <td className="py-4 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize bg-black/40 text-[#cbd5e1] border-white/10">
                        {plan.recommended_channel.replace("_", " ")}
                      </span>
                    </td>

                    {/* Next Reorder Cutoff */}
                    <td className="py-4 px-4 text-center font-mono">
                      {item.recommended_order_by !== "N/A" ? (
                        <span
                          className={`font-bold ${
                            item.urgency === "CRITICAL"
                              ? "text-[#fb7185]"
                              : item.urgency === "ORDER_NOW"
                              ? "text-[#fb923c]"
                              : item.urgency === "ORDER_SOON"
                              ? "text-[#fde047]"
                              : "text-[#34d399]"
                          }`}
                        >
                          {safeFormatDate(item.recommended_order_by, "dd MMM yyyy")}
                        </span>
                      ) : (
                        <span className="text-[#64748b]">N/A</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedForRestock(item)}
                        className="px-4 py-2 liquid-btn-primary font-semibold rounded-full text-xs spring-tap"
                      >
                        Order Now
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reorder Modal */}
      {selectedForRestock && (
        <QuickRestockModal
          item={selectedForRestock}
          onClose={() => setSelectedForRestock(null)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}
