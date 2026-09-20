"use client";

import { useState, useTransition } from "react";
import { X, Check, Sparkles, Edit3, Truck, Sliders, Clock, PlusCircle } from "lucide-react";
import { AICommandPayload, CalculatedMedicineState, ChannelType, StockAdjustment } from "@/lib/types";
import {
  logRestockAction,
  logStockAdjustmentAction,
  updateMedicineAction,
  createMedicineAction,
} from "@/app/actions";
import { format } from "date-fns";

interface AIConfirmationModalProps {
  payload: AICommandPayload;
  medicines: CalculatedMedicineState[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AIConfirmationModal({
  payload,
  medicines,
  onClose,
  onSuccess,
}: AIConfirmationModalProps) {
  const [isPending, startTransition] = useTransition();

  // Matched medicine resolution
  const matchedState = medicines.find(
    (m) =>
      m.medicine.id === payload.medicine_id ||
      m.medicine.name.toLowerCase() === payload.matched_name.toLowerCase()
  );

  const [selectedMedId, setSelectedMedId] = useState<string>(
    matchedState?.medicine.id || medicines[0]?.medicine.id || ""
  );

  const currentMed = medicines.find((m) => m.medicine.id === selectedMedId) || medicines[0];
  const unitsPerPack = currentMed?.medicine.units_per_pack || 10;
  const unitLabel = currentMed?.medicine.unit_label || "tablets";

  // Editable restock state
  const [channel, setChannel] = useState<ChannelType>(payload.restock?.channel || "apollo");
  const [packCount, setPackCount] = useState<number>(
    payload.restock?.pack_count ?? Math.ceil((payload.restock?.total_units_added || unitsPerPack) / unitsPerPack)
  );
  const [totalUnits, setTotalUnits] = useState<number>(
    payload.restock?.total_units_added || packCount * unitsPerPack
  );
  const [cost, setCost] = useState<string>(payload.restock?.cost ? String(payload.restock.cost) : "");
  const [isDelivered, setIsDelivered] = useState<boolean>(payload.restock?.is_delivered ?? true);

  // Editable audit state
  const [exactCount, setExactCount] = useState<number>(
    payload.audit?.exact_units_on_hand ?? Math.round(currentMed?.on_hand_stock || 0)
  );
  const [auditReason, setAuditReason] = useState<StockAdjustment["reason"]>(
    payload.audit?.reason || "audit_recount"
  );

  // Editable new medicine state
  const [newName, setNewName] = useState(payload.new_medicine?.name || payload.matched_name || "");
  const [newStrength, setNewStrength] = useState(payload.new_medicine?.strength || "");
  const [newPackSize, setNewPackSize] = useState(payload.new_medicine?.units_per_pack || 10);
  const [newBaseline, setNewBaseline] = useState(payload.new_medicine?.baseline_stock || 30);

  const handleApply = () => {
    startTransition(async () => {
      const todayStr = format(new Date(), "yyyy-MM-dd");

      if (payload.intent === "LOG_RESTOCK") {
        await logRestockAction({
          medicine_id: selectedMedId,
          channel,
          pack_count: packCount,
          units_per_pack: unitsPerPack,
          quantity_added: totalUnits || packCount * unitsPerPack,
          ordered_date: todayStr,
          expected_arrival_date: !isDelivered ? "2026-09-24" : null,
          received_date: isDelivered ? todayStr : null,
          cost: cost ? parseFloat(cost) : null,
          notes: payload.restock?.notes || "Logged via AI natural language input",
        });
      } else if (payload.intent === "AUDIT_COUNT") {
        const delta = Math.round((exactCount - currentMed.on_hand_stock) * 10) / 10;
        await logStockAdjustmentAction({
          medicine_id: selectedMedId,
          delta,
          reason: auditReason,
          notes: payload.audit?.notes || `AI physical count audit: ${exactCount} ${unitLabel}`,
          date: todayStr,
          reset_baseline: true,
          new_baseline_stock: exactCount,
        });
      } else if (payload.intent === "UPDATE_SCHEDULE" && payload.schedule_update) {
        await updateMedicineAction(selectedMedId, {
          schedules: payload.schedule_update.schedules,
        });
      } else if (payload.intent === "ADD_MEDICINE") {
        await createMedicineAction({
          name: newName,
          strength: newStrength || null,
          form: "tablet",
          unit_label: "tablets",
          units_per_pack: newPackSize,
          baseline_stock: newBaseline,
          baseline_date: todayStr,
          safety_buffer_days: 2,
          schedules: [{ time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Daily" }],
          channel_configs: [
            { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
            { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
            { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
          ],
        });
      }

      onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="liquid-glass-panel rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 animate-spring-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#ff385c]/15 text-[#ff4d6d] border border-[#ff385c]/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">AI Intent Decoded</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[#34d399] border border-emerald-500/30 text-[10px] font-mono font-bold">
                  {Math.round(payload.confidence * 100)}% Confidence
                </span>
              </div>
              <p className="text-[12px] text-[#94a3b8] mt-0.5">
                Review extracted values and adjust before writing to Supabase
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

        <div className="p-6 space-y-5">
          {/* Summary Explanation Banner */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-[#cbd5e1] flex items-start gap-2.5">
            <Edit3 className="h-4 w-4 text-[#ff385c] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block mb-0.5">What AI Decoded:</span>
              <p className="leading-relaxed text-white font-medium">{payload.summary_explanation}</p>
            </div>
          </div>

          {/* Form Fields by Intent Type */}

          {/* 1. RESTOCK INTENT */}
          {payload.intent === "LOG_RESTOCK" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#cbd5e1] uppercase tracking-wider mb-1.5">
                  Target Medicine
                </label>
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-sm text-white font-semibold"
                >
                  {medicines.map((m) => (
                    <option key={m.medicine.id} value={m.medicine.id} className="bg-[#131722]">
                      {m.medicine.name} {m.medicine.strength && `(${m.medicine.strength})`} — {m.medicine.units_per_pack} {m.medicine.unit_label}/pack
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#cbd5e1] uppercase tracking-wider mb-1.5">
                    Strips / Packs
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={packCount}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 0;
                      setPackCount(count);
                      setTotalUnits(count * unitsPerPack);
                    }}
                    className="w-full liquid-glass-input rounded-2xl px-4 py-2 text-sm text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#cbd5e1] uppercase tracking-wider mb-1.5">
                    Total Units Added
                  </label>
                  <input
                    type="number"
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(parseInt(e.target.value) || 0)}
                    className="w-full liquid-glass-input rounded-2xl px-4 py-2 text-sm text-white font-mono font-bold text-[#ff385c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#cbd5e1] uppercase tracking-wider mb-1.5">
                    Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as ChannelType)}
                    className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs text-white uppercase font-semibold"
                  >
                    <option value="apollo" className="bg-[#131722]">Apollo 24|7</option>
                    <option value="mr_med" className="bg-[#131722]">Mr. Med</option>
                    <option value="offline" className="bg-[#131722]">Local Pharmacy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#cbd5e1] uppercase tracking-wider mb-1.5">
                    Cost (₹ Optional)
                  </label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="e.g. 480"
                    className="w-full liquid-glass-input rounded-2xl px-4 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. AUDIT / COUNT INTENT */}
          {payload.intent === "AUDIT_COUNT" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#cbd5e1] uppercase tracking-wider mb-1.5">
                  Target Medicine
                </label>
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-sm text-white font-semibold"
                >
                  {medicines.map((m) => (
                    <option key={m.medicine.id} value={m.medicine.id} className="bg-[#131722]">
                      {m.medicine.name} (Current on hand: {m.on_hand_stock} {m.medicine.unit_label})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#cbd5e1] uppercase tracking-wider mb-1.5">
                  Actual Physical Count On Hand Today
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={exactCount}
                    onChange={(e) => setExactCount(parseFloat(e.target.value) || 0)}
                    className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-xl font-bold font-mono text-white"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-[#94a3b8]">
                    {unitLabel}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. ADD MEDICINE INTENT */}
          {payload.intent === "ADD_MEDICINE" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#cbd5e1] uppercase tracking-wider mb-1">
                  Medicine Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full liquid-glass-input rounded-2xl px-4 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#cbd5e1] uppercase tracking-wider mb-1">
                    Strength / Dose
                  </label>
                  <input
                    type="text"
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value)}
                    placeholder="e.g. 75mg"
                    className="w-full liquid-glass-input rounded-2xl px-4 py-2 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#cbd5e1] uppercase tracking-wider mb-1">
                    Pack Size (Tabs)
                  </label>
                  <input
                    type="number"
                    value={newPackSize}
                    onChange={(e) => setNewPackSize(parseInt(e.target.value) || 10)}
                    className="w-full liquid-glass-input rounded-2xl px-4 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-[#94a3b8] hover:text-white rounded-full transition-colors spring-tap"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold liquid-btn-primary rounded-full shadow-lg transition-all spring-tap disabled:opacity-50"
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>{isPending ? "Applying to Supabase..." : "Confirm & Apply"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
