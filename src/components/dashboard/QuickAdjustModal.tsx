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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="liquid-glass-panel rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-white/15 animate-spring-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-white border border-white/15">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Stock Count & Audit</h2>
              <p className="text-[13px] text-[#94a3b8]">
                {item.medicine.name} — On Hand: {item.on_hand_stock} {item.medicine.unit_label}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mode Switcher */}
          <div className="flex items-center justify-between text-xs bg-black/40 p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode("recount");
                setReason("audit_recount");
              }}
              className={`flex-1 py-2 rounded-xl font-semibold transition-all spring-tap ${
                mode === "recount" ? "bg-white/20 text-white shadow-sm" : "text-[#94a3b8]"
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
              className={`flex-1 py-2 rounded-xl font-semibold transition-all spring-tap ${
                mode === "delta" ? "bg-white/20 text-white shadow-sm" : "text-[#94a3b8]"
              }`}
            >
              Quick +/- Delta
            </button>
          </div>

          {mode === "recount" ? (
            <div>
              <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1">
                Actual Physical Units on Hand Now
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={exactCount}
                onChange={(e) => setExactCount(parseFloat(e.target.value) || 0)}
                className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-base font-bold text-white font-mono"
                required
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1">
                  Delta Adjustment (+/- Units)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={deltaVal}
                    onChange={(e) => setDeltaVal(parseFloat(e.target.value) || 0)}
                    className="w-full liquid-glass-input rounded-2xl px-4 py-2 text-sm text-white font-mono"
                    required
                  />
                  <span className="text-xs text-[#94a3b8] font-mono">{item.medicine.unit_label}</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as StockAdjustment["reason"])}
                  className="w-full liquid-glass-input rounded-2xl px-4 py-2 text-xs text-white"
                >
                  <option value="missed_dose" className="bg-[#131722]">Missed Dose (+)</option>
                  <option value="extra_dose" className="bg-[#131722]">Extra Dose Taken (-)</option>
                  <option value="damaged_spilled" className="bg-[#131722]">Damaged / Spilled / Crushed (-)</option>
                  <option value="lost" className="bg-[#131722]">Lost / Misplaced (-)</option>
                  <option value="prescription_change" className="bg-[#131722]">Prescription Changed</option>
                  <option value="other" className="bg-[#131722]">Other Manual Correction</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1">Notes / Remarks</label>
            <input
              type="text"
              placeholder="e.g. Recounted strip in medicine box"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full liquid-glass-input rounded-2xl px-4 py-2 text-xs text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-[#94a3b8] hover:text-white rounded-full transition-colors spring-tap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold liquid-btn-primary rounded-full shadow-md transition-all spring-tap disabled:opacity-50"
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
