"use client";

import { useState, useTransition } from "react";
import {
  X,
  Copy,
  Check,
  Share2,
  Truck,
  Building2,
  ShoppingBag,
  Store,
  Layers,
  Sparkles,
} from "lucide-react";
import { CalculatedMedicineState, ChannelType } from "@/lib/types";
import { logRestockAction } from "@/app/actions";
import { format } from "date-fns";

interface ProcurementCartModalProps {
  medicines: CalculatedMedicineState[];
  initialVendor?: ChannelType;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProcurementCartModal({
  medicines,
  initialVendor = "apollo",
  onClose,
  onSuccess,
}: ProcurementCartModalProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedVendor, setSelectedVendor] = useState<ChannelType>(initialVendor);
  const [copied, setCopied] = useState(false);
  const [batchOrderedSuccess, setBatchOrderedSuccess] = useState(false);

  // Filter medicines for selected vendor
  const vendorMeds = medicines.filter(
    (m) => m.monthly_planning.recommended_channel === selectedVendor
  );

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(vendorMeds.map((m) => m.medicine.id))
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(vendorMeds.map((m) => m.medicine.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const selectedItems = vendorMeds.filter((m) => selectedIds.has(m.medicine.id));

  // Generate formatted order sheet text
  const vendorName =
    selectedVendor === "apollo"
      ? "Apollo 24|7"
      : selectedVendor === "mr_med"
      ? "Mr. Med"
      : "Local Pharmacy";

  const todayStr = format(new Date(), "dd MMM yyyy");

  const generateOrderText = () => {
    let text = `📦 Prescription Reorder List — ${vendorName} (${todayStr})\n\n`;
    selectedItems.forEach((item, idx) => {
      const plan = item.monthly_planning;
      const packText =
        plan.units_per_pack > 1
          ? `${plan.packs_needed} strip${plan.packs_needed !== 1 ? "s" : ""} (${plan.total_units_purchased} ${item.medicine.unit_label})`
          : `${plan.total_units_purchased} ${item.medicine.unit_label}`;

      text += `${idx + 1}. ${item.medicine.name} ${item.medicine.strength || ""}\n`;
      text += `   • Quantity: ${packText}\n`;
      text += `   • Prescribed: ${item.daily_consumption} ${item.medicine.unit_label}/day\n\n`;
    });
    text += `Total: ${selectedItems.length} item(s)`;
    return text;
  };

  const handleCopy = () => {
    const orderText = generateOrderText();
    navigator.clipboard.writeText(orderText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    const orderText = generateOrderText();
    const encoded = encodeURIComponent(orderText);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const handleBatchLogRestock = () => {
    if (selectedItems.length === 0) return;

    startTransition(async () => {
      const orderDateIso = format(new Date(), "yyyy-MM-dd");

      for (const item of selectedItems) {
        const plan = item.monthly_planning;
        await logRestockAction({
          medicine_id: item.medicine.id,
          channel: selectedVendor,
          pack_count: plan.packs_needed,
          units_per_pack: plan.units_per_pack,
          quantity_added: plan.total_units_purchased,
          ordered_date: orderDateIso,
          expected_arrival_date: selectedVendor === "offline" ? orderDateIso : "2026-09-24",
          notes: `Batch ordered via ${vendorName} Cart Generator`,
        });
      }

      setBatchOrderedSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="liquid-glass-panel rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 animate-spring-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#ff385c]/15 text-[#ff4d6d] border border-[#ff385c]/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Procurement Cart Builder
              </h2>
              <p className="text-[12px] text-[#94a3b8]">
                Assemble batch prescription orders for 1-click clipboard copy, WhatsApp, or transit logging
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#94a3b8] hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors spring-tap"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Vendor Selector Tabs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "apollo" as const, label: "Apollo 24|7", icon: Building2, lead: "7–10d Lead" },
              { id: "mr_med" as const, label: "Mr. Med", icon: ShoppingBag, lead: "3–5d Lead" },
              { id: "offline" as const, label: "Local Chemist", icon: Store, lead: "0–1d Lead" },
            ].map((v) => {
              const Icon = v.icon;
              const count = medicines.filter(
                (m) => m.monthly_planning.recommended_channel === v.id
              ).length;
              const isSelected = selectedVendor === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSelectedVendor(v.id);
                    const forVendor = medicines.filter(
                      (m) => m.monthly_planning.recommended_channel === v.id
                    );
                    setSelectedIds(new Set(forVendor.map((m) => m.medicine.id)));
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all spring-tap ${
                    isSelected
                      ? "border-[#ff385c] bg-[#ff385c]/15 text-white ring-1 ring-[#ff385c]/40 shadow-lg shadow-[#ff385c]/15"
                      : "border-white/10 bg-black/30 text-[#94a3b8] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Icon className={`h-4 w-4 ${isSelected ? "text-[#ff385c]" : "text-[#94a3b8]"}`} />
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/10">
                      {count}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-white truncate">{v.label}</div>
                  <div className="text-[10px] text-[#94a3b8] mt-0.5">{v.lead}</div>
                </button>
              );
            })}
          </div>

          {/* Medicines Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[12px] font-bold text-[#cbd5e1] uppercase tracking-wider">
                Select Medicines to Order ({selectedItems.length}/{vendorMeds.length})
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[#38bdf8] hover:underline"
                >
                  Select All
                </button>
                <span className="text-white/20">•</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-[#94a3b8] hover:text-white"
                >
                  Deselect
                </button>
              </div>
            </div>

            {vendorMeds.length === 0 ? (
              <div className="p-8 text-center bg-black/30 rounded-2xl border border-white/10 text-xs text-[#94a3b8]">
                No medicines mapped to {vendorName}.
              </div>
            ) : (
              <div className="divide-y divide-white/5 bg-black/30 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-md">
                {vendorMeds.map((item) => {
                  const isChecked = selectedIds.has(item.medicine.id);
                  const plan = item.monthly_planning;
                  return (
                    <label
                      key={item.medicine.id}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(item.medicine.id)}
                          className="rounded border-white/20 text-[#ff385c] focus:ring-0 h-4 w-4"
                        />
                        <div>
                          <div className="font-bold text-white text-sm">
                            {item.medicine.name}{" "}
                            {item.medicine.strength && (
                              <span className="text-[11px] text-[#94a3b8] font-normal font-mono">
                                ({item.medicine.strength})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#94a3b8] mt-0.5">
                            Dose: {item.daily_consumption} {item.medicine.unit_label}/day • On-hand: {item.on_hand_stock}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-white text-xs px-2.5 py-1 rounded-full bg-white/10 border border-white/15">
                          {plan.units_per_pack > 1
                            ? `${plan.packs_needed} pk (${plan.total_units_purchased} ${item.medicine.unit_label})`
                            : `${plan.total_units_purchased} ${item.medicine.unit_label}`}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Generated Text Preview Box */}
          {selectedItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                <span>Formatted Output Preview</span>
                <span>{selectedItems.length} items</span>
              </div>
              <pre className="text-[11px] text-[#cbd5e1] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                {generateOrderText()}
              </pre>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={selectedItems.length === 0}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white liquid-glass-pill rounded-full transition-all spring-tap disabled:opacity-40"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#34d399]" /> : <Copy className="h-3.5 w-3.5 text-[#ff385c]" />}
                <span>{copied ? "Copied Order!" : "Copy to Clipboard"}</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsApp}
                disabled={selectedItems.length === 0}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 rounded-full transition-all spring-tap disabled:opacity-40"
              >
                <Share2 className="h-3.5 w-3.5 text-[#25D366]" />
                <span>Share WhatsApp</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleBatchLogRestock}
              disabled={isPending || selectedItems.length === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold liquid-btn-primary rounded-full shadow-lg transition-all spring-tap disabled:opacity-40"
            >
              <Truck className="h-4 w-4" />
              <span>
                {batchOrderedSuccess
                  ? "Logged as In-Transit!"
                  : isPending
                  ? "Logging..."
                  : `Mark ${selectedItems.length} Ordered`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
