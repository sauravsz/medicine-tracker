"use client";

import { useState, useTransition } from "react";
import { X, Truck, Check } from "lucide-react";
import { CalculatedMedicineState, ChannelType } from "@/lib/types";
import { logRestockAction } from "@/app/actions";
import { format } from "date-fns";

interface QuickRestockModalProps {
  item: CalculatedMedicineState;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickRestockModal({ item, onClose, onSuccess }: QuickRestockModalProps) {
  const [isPending, startTransition] = useTransition();
  const [channel, setChannel] = useState<ChannelType>(
    item.recommended_channel !== "none" ? (item.recommended_channel as ChannelType) : "apollo"
  );
  const unitsPerPack = item.medicine.units_per_pack || 1;
  const [mode, setMode] = useState<"packs" | "units">(unitsPerPack > 1 ? "packs" : "units");
  const [packCount, setPackCount] = useState<number>(1);
  const [looseUnits, setLooseUnits] = useState<number>(unitsPerPack > 1 ? unitsPerPack : 30);
  const [orderedDate, setOrderedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [isReceived, setIsReceived] = useState<boolean>(false);
  const [cost, setCost] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const calculatedTotalUnits =
    mode === "packs" ? (packCount || 0) * unitsPerPack : looseUnits || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedTotalUnits <= 0) return;

    startTransition(async () => {
      await logRestockAction({
        medicine_id: item.medicine.id,
        channel,
        pack_count: mode === "packs" ? packCount : null,
        units_per_pack: unitsPerPack,
        quantity_added: calculatedTotalUnits,
        ordered_date: orderedDate,
        expected_arrival_date: !isReceived ? format(new Date(), "yyyy-MM-dd") : null,
        received_date: isReceived ? orderedDate : null,
        cost: cost ? parseFloat(cost) : null,
        notes: notes || null,
      });
      if (onSuccess) onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-[#dddddd] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#ebebeb]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-[#f7f7f7] text-[#ff385c]">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#222222]">Log Restock Order</h2>
              <p className="text-[13px] text-[#6a6a6a]">
                {item.medicine.name} {item.medicine.strength && `(${item.medicine.strength})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6a6a6a] hover:text-[#222222] p-2 rounded-full hover:bg-[#f7f7f7] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Channel Selector */}
          <div>
            <label className="block text-[12px] font-bold text-[#222222] uppercase tracking-wider mb-2">
              Purchase Channel
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: "apollo", label: "Apollo 24|7", desc: "7–10d delivery" },
                { id: "mr_med", label: "Mr. Med", desc: "3–5d delivery" },
                { id: "offline", label: "Local Chemist", desc: "0–1d immediate" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id as ChannelType)}
                  className={`p-3 rounded-2xl border text-left transition-all text-xs ${
                    channel === c.id
                      ? "border-[#222222] bg-[#f7f7f7] ring-1 ring-[#222222]"
                      : "border-[#ebebeb] text-[#6a6a6a] hover:border-[#c1c1c1]"
                  }`}
                >
                  <div className="font-bold text-[#222222]">{c.label}</div>
                  <div className="text-[11px] text-[#6a6a6a] mt-0.5">{c.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Mode */}
          {unitsPerPack > 1 && (
            <div className="flex items-center justify-between text-xs bg-[#f7f7f7] p-1 rounded-xl border border-[#ebebeb]">
              <button
                type="button"
                onClick={() => setMode("packs")}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                  mode === "packs" ? "bg-white text-[#222222] shadow-sm" : "text-[#6a6a6a]"
                }`}
              >
                By Packs ({unitsPerPack} {item.medicine.unit_label}/pack)
              </button>
              <button
                type="button"
                onClick={() => setMode("units")}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                  mode === "units" ? "bg-white text-[#222222] shadow-sm" : "text-[#6a6a6a]"
                }`}
              >
                By Loose Units ({item.medicine.unit_label})
              </button>
            </div>
          )}

          {/* Quantity Input */}
          <div className="grid grid-cols-2 gap-3">
            {mode === "packs" && unitsPerPack > 1 ? (
              <div>
                <label className="block text-[12px] font-bold text-[#222222] mb-1">
                  Number of Packs
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={packCount}
                  onChange={(e) => setPackCount(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-[#dddddd] rounded-xl px-3 py-2.5 text-sm text-[#222222] focus:outline-none focus:border-[#222222] font-mono"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-[12px] font-bold text-[#222222] mb-1">
                  Total {item.medicine.unit_label}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={looseUnits}
                  onChange={(e) => setLooseUnits(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-[#dddddd] rounded-xl px-3 py-2.5 text-sm text-[#222222] focus:outline-none focus:border-[#222222] font-mono"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[12px] font-bold text-[#222222] mb-1">Order Date</label>
              <input
                type="date"
                value={orderedDate}
                onChange={(e) => setOrderedDate(e.target.value)}
                className="w-full bg-white border border-[#dddddd] rounded-xl px-3 py-2.5 text-sm text-[#222222] focus:outline-none focus:border-[#222222] font-mono"
                required
              />
            </div>
          </div>

          <div className="bg-[#f7f7f7] p-3.5 rounded-2xl border border-[#ebebeb] flex items-center justify-between text-xs">
            <span className="text-[#6a6a6a] font-medium">Total Units Adding:</span>
            <span className="font-mono font-bold text-[#222222] text-sm">
              +{calculatedTotalUnits} {item.medicine.unit_label}
            </span>
          </div>

          {/* Delivery Status Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f7f7f7] border border-[#ebebeb]">
            <div>
              <span className="text-xs font-bold text-[#222222] block">Delivered / In Hand?</span>
              <span className="text-[11px] text-[#6a6a6a]">
                {isReceived ? "Stock increases on-hand immediately" : "Marked as in transit (mutes alerts)"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsReceived(!isReceived)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isReceived ? "bg-[#ff385c]" : "bg-[#dddddd]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isReceived ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Cost & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-[#222222] mb-1">Cost (₹ Optional)</label>
              <input
                type="number"
                step="0.01"
                placeholder="240.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full bg-white border border-[#dddddd] rounded-xl px-3 py-2 text-sm text-[#222222] focus:outline-none focus:border-[#222222] font-mono"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#222222] mb-1">Notes / Order ID</label>
              <input
                type="text"
                placeholder="Apollo #98421"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-[#dddddd] rounded-xl px-3 py-2 text-sm text-[#222222] focus:outline-none focus:border-[#222222]"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ebebeb]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-[#6a6a6a] hover:text-[#222222] rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || calculatedTotalUnits <= 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-[#ff385c] hover:bg-[#e00b41] active:scale-98 rounded-full shadow-sm transition-all disabled:opacity-50"
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>{isPending ? "Saving..." : "Confirm Restock"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
