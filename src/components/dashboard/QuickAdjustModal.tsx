"use client";

import { useState, useTransition } from "react";
import { X, Sliders, Check } from "lucide-react";
import { CalculatedMedicineState, StockAdjustment } from "@/lib/types";
import { logStockAdjustmentAction } from "@/app/actions";
import { format } from "date-fns";

interface QuickAdjustModalProps {
  item: CalculatedMedicineState;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickAdjustModal({ item, onClose, onSuccess }: QuickAdjustModalProps) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"recount" | "delta">("recount");
  const [exactCount, setExactCount] = useState<number>(Math.round(item.on_hand_stock));
  const [deltaVal, setDeltaVal] = useState<number>(-1);
  const [reason, setReason] = useState<StockAdjustment["reason"]>("audit_recount");
  const [notes, setNotes] = useState<string>("");
  const [adjustDate, setAdjustDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const calculatedDelta =
    mode === "recount"
      ? Math.round((exactCount - item.on_hand_stock) * 10) / 10
      : deltaVal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      await logStockAdjustmentAction({
        medicine_id: item.medicine.id,
        delta: calculatedDelta,
        reason: mode === "recount" ? "audit_recount" : reason,
        notes: notes || (mode === "recount" ? `Physical audit recount: ${exactCount} ${item.medicine.unit_label}` : null),
        date: adjustDate,
        reset_baseline: mode === "recount",
        new_baseline_stock: mode === "recount" ? exactCount : undefined,
      });
      if (onSuccess) onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-[#dddddd] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#ebebeb]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-[#f7f7f7] text-[#222222]">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#222222]">Stock Count & Audit</h2>
              <p className="text-[13px] text-[#6a6a6a]">
                {item.medicine.name} — On Hand: {item.on_hand_stock} {item.medicine.unit_label}
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
          {/* Mode Switcher */}
          <div className="flex items-center justify-between text-xs bg-[#f7f7f7] p-1 rounded-xl border border-[#ebebeb]">
            <button
              type="button"
              onClick={() => {
                setMode("recount");
                setReason("audit_recount");
              }}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                mode === "recount" ? "bg-white text-[#222222] shadow-sm" : "text-[#6a6a6a]"
              }`}
            >
              Exact Physical Count
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("delta");
                setReason("damaged_spilled");
              }}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                mode === "delta" ? "bg-white text-[#222222] shadow-sm" : "text-[#6a6a6a]"
              }`}
            >
              Quick +/- Delta
            </button>
          </div>

          {mode === "recount" ? (
            <div>
              <label className="block text-[12px] font-bold text-[#222222] mb-1">
                Actual Physical Units on Hand Now
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={exactCount}
                onChange={(e) => setExactCount(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-[#dddddd] rounded-xl px-4 py-2.5 text-base font-bold text-[#222222] focus:outline-none focus:border-[#222222] font-mono"
                required
              />
              <p className="text-[11px] text-[#6a6a6a] mt-1.5 font-medium">
                Adjusts stock by {calculatedDelta >= 0 ? `+${calculatedDelta}` : calculatedDelta}{" "}
                {item.medicine.unit_label} and resets anchor to today.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[12px] font-bold text-[#222222] mb-1">
                  Delta Adjustment (+/- Units)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={deltaVal}
                    onChange={(e) => setDeltaVal(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-[#dddddd] rounded-xl px-3.5 py-2 text-sm text-[#222222] focus:outline-none focus:border-[#222222] font-mono"
                    required
                  />
                  <span className="text-xs text-[#6a6a6a] font-mono">{item.medicine.unit_label}</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#222222] mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as StockAdjustment["reason"])}
                  className="w-full bg-white border border-[#dddddd] rounded-xl px-3 py-2 text-xs text-[#222222] focus:outline-none focus:border-[#222222]"
                >
                  <option value="missed_dose">Missed Dose (+)</option>
                  <option value="extra_dose">Extra Dose Taken (-)</option>
                  <option value="damaged_spilled">Damaged / Spilled / Crushed (-)</option>
                  <option value="lost">Lost / Misplaced (-)</option>
                  <option value="prescription_change">Prescription Changed</option>
                  <option value="other">Other Manual Correction</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-[12px] font-bold text-[#222222] mb-1">Notes / Remarks</label>
            <input
              type="text"
              placeholder="e.g. Recounted strip in medicine box"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-[#dddddd] rounded-xl px-3.5 py-2 text-xs text-[#222222] focus:outline-none focus:border-[#222222]"
            />
          </div>

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
              disabled={isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-[#ff385c] hover:bg-[#e00b41] active:scale-98 rounded-full shadow-sm transition-all disabled:opacity-50"
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>{isPending ? "Saving..." : "Apply Count"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
