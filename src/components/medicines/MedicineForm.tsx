"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pill,
  Clock,
  Plus,
  Trash2,
  Check,
  Building2,
  Layers,
} from "lucide-react";
import {
  Medicine,
  DoseSchedule,
  ChannelConfig,
  MedicineForm as MedicineFormType,
  ChannelType,
} from "@/lib/types";
import { createMedicineAction, updateMedicineAction } from "@/app/actions";
import { format } from "date-fns";

interface MedicineFormProps {
  initialData?: {
    medicine: Medicine;
    schedules: DoseSchedule[];
    channel_configs: ChannelConfig[];
  };
}

export function MedicineForm({ initialData }: MedicineFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(initialData);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Form State
  const [name, setName] = useState(initialData?.medicine.name || "");
  const [strength, setStrength] = useState(initialData?.medicine.strength || "");
  const [form, setForm] = useState<MedicineFormType>(initialData?.medicine.form || "tablet");
  const [unitLabel, setUnitLabel] = useState(initialData?.medicine.unit_label || "tablets");
  const [unitsPerPack, setUnitsPerPack] = useState(initialData?.medicine.units_per_pack || 10);
  const [baselineStock, setBaselineStock] = useState(initialData?.medicine.baseline_stock ?? 30);
  const [baselineDate, setBaselineDate] = useState(initialData?.medicine.baseline_date || todayStr);
  const [safetyBuffer, setSafetyBuffer] = useState<string>(
    initialData?.medicine.safety_buffer_days !== null && initialData?.medicine.safety_buffer_days !== undefined
      ? String(initialData.medicine.safety_buffer_days)
      : ""
  );
  const [notes, setNotes] = useState(initialData?.medicine.notes || "");

  // Dose Schedules State
  const [schedules, setSchedules] = useState<
    Array<{
      id?: string;
      time_of_day: string;
      quantity: number;
      interval_days: number;
      instructions: string;
    }>
  >(
    initialData?.schedules && initialData.schedules.length > 0
      ? initialData.schedules.map((s) => ({
          id: s.id,
          time_of_day: s.time_of_day,
          quantity: s.quantity,
          interval_days: s.interval_days || 1,
          instructions: s.instructions || "",
        }))
      : [
          { time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Before breakfast" },
        ]
  );

  // Channels State
  const getChannelConfig = (chan: ChannelType, defaultMin: number, defaultMax: number) => {
    const found = initialData?.channel_configs.find((c) => c.channel === chan);
    return {
      channel: chan,
      lead_time_min_days: found ? found.lead_time_min_days : defaultMin,
      lead_time_max_days: found ? found.lead_time_max_days : defaultMax,
      available: found ? found.available : true,
    };
  };

  const [apolloConfig, setApolloConfig] = useState(getChannelConfig("apollo", 7, 10));
  const [mrMedConfig, setMrMedConfig] = useState(getChannelConfig("mr_med", 3, 5));
  const [offlineConfig, setOfflineConfig] = useState(getChannelConfig("offline", 0, 1));

  // Schedule Helpers
  const addScheduleRow = () => {
    setSchedules([
      ...schedules,
      { time_of_day: "night", quantity: 1, interval_days: 1, instructions: "After dinner" },
    ]);
  };

  const updateScheduleRow = (
    index: number,
    field: "time_of_day" | "quantity" | "interval_days" | "instructions",
    value: unknown
  ) => {
    const copy = [...schedules];
    copy[index] = { ...copy[index], [field]: value };
    setSchedules(copy);
  };

  const removeScheduleRow = (index: number) => {
    if (schedules.length <= 1) return;
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  // Computed live previews
  const dailyRate = schedules.reduce((total, s) => {
    const q = Number(s.quantity) || 0;
    const i = Math.max(1, Number(s.interval_days) || 1);
    return total + q / i;
  }, 0);
  const monthlyNeed = Math.round(dailyRate * 30 * 10) / 10;
  const packsPerMonth = unitsPerPack > 0 ? Math.ceil(monthlyNeed / unitsPerPack) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        strength: strength.trim() || null,
        form,
        unit_label: unitLabel.trim() || "tablets",
        units_per_pack: Number(unitsPerPack) || 1,
        baseline_stock: Number(baselineStock) || 0,
        baseline_date: baselineDate || todayStr,
        safety_buffer_days: safetyBuffer !== "" ? parseInt(safetyBuffer) : null,
        notes: notes.trim() || null,
        schedules: schedules.map((s) => ({
          time_of_day: s.time_of_day,
          quantity: Number(s.quantity) || 1,
          interval_days: Number(s.interval_days) || 1,
          instructions: s.instructions.trim() || null,
        })),
        channel_configs: [apolloConfig, mrMedConfig, offlineConfig],
      };

      if (isEditing && initialData) {
        await updateMedicineAction(initialData.medicine.id, payload);
        router.push(`/medicines/${initialData.medicine.id}`);
      } else {
        const res = await createMedicineAction(payload);
        router.push(`/medicines/${res.id}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* 1. Basic Information */}
      <section className="liquid-glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="p-2.5 rounded-2xl bg-[#ff385c]/15 text-[#ff4d6d] border border-[#ff385c]/30">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Medicine Profile</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1.5">
              Medicine / Brand Name <span className="text-[#ff385c]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Thyronorm, Telma 40, Glycomet-GP 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1.5">
              Strength / Dosage
            </label>
            <input
              type="text"
              placeholder="e.g. 50mcg, 40mg, 500mg/2mg"
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1.5">Form</label>
            <select
              value={form}
              onChange={(e) => setForm(e.target.value as MedicineFormType)}
              className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-sm text-white capitalize"
            >
              <option value="tablet" className="bg-[#131722]">Tablet</option>
              <option value="capsule" className="bg-[#131722]">Capsule</option>
              <option value="syrup" className="bg-[#131722]">Syrup / Suspension</option>
              <option value="drops" className="bg-[#131722]">Drops</option>
              <option value="sachet" className="bg-[#131722]">Sachet / Powder</option>
              <option value="injection" className="bg-[#131722]">Injection</option>
              <option value="cream" className="bg-[#131722]">Cream / Gel</option>
              <option value="inhaler" className="bg-[#131722]">Inhaler</option>
              <option value="other" className="bg-[#131722]">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1.5">Unit Label</label>
            <input
              type="text"
              placeholder="tablets, capsules, ml, sachets"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1.5">
              Units per Pack / Strip
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={unitsPerPack}
              onChange={(e) => setUnitsPerPack(parseInt(e.target.value) || 1)}
              className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-sm text-white font-mono"
            />
          </div>
        </div>
      </section>

      {/* 2. Dose Schedule Builder */}
      <section className="liquid-glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-white border border-white/15">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Dosage Schedule</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={addScheduleRow}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white liquid-glass-pill rounded-full transition-all spring-tap"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Add Dose</span>
          </button>
        </div>

        <div className="space-y-3">
          {schedules.map((row, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-black/40 border border-white/10 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center backdrop-blur-md"
            >
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1">
                  Time of Day
                </label>
                <select
                  value={row.time_of_day}
                  onChange={(e) => updateScheduleRow(idx, "time_of_day", e.target.value)}
                  className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs text-white capitalize"
                >
                  <option value="morning" className="bg-[#131722]">Morning</option>
                  <option value="afternoon" className="bg-[#131722]">Afternoon</option>
                  <option value="evening" className="bg-[#131722]">Evening</option>
                  <option value="night" className="bg-[#131722]">Night</option>
                  <option value="with_breakfast" className="bg-[#131722]">With Breakfast</option>
                  <option value="before_breakfast" className="bg-[#131722]">Before Breakfast</option>
                  <option value="after_dinner" className="bg-[#131722]">After Dinner</option>
                  <option value="as_needed" className="bg-[#131722]">As Needed / SOS</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1">
                  Qty / Dose
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={row.quantity}
                  onChange={(e) => updateScheduleRow(idx, "quantity", parseFloat(e.target.value) || 0)}
                  className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1">
                  Frequency
                </label>
                <select
                  value={row.interval_days}
                  onChange={(e) => updateScheduleRow(idx, "interval_days", parseInt(e.target.value) || 1)}
                  className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value={1} className="bg-[#131722]">Every Day (Daily)</option>
                  <option value={2} className="bg-[#131722]">Every 2 Days (Alternate)</option>
                  <option value={7} className="bg-[#131722]">Once a Week (Weekly)</option>
                  <option value={14} className="bg-[#131722]">Every 2 Weeks</option>
                  <option value={30} className="bg-[#131722]">Once a Month</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1">
                  Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Empty stomach"
                  value={row.instructions}
                  onChange={(e) => updateScheduleRow(idx, "instructions", e.target.value)}
                  className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="sm:col-span-1 flex justify-end">
                <button
                  type="button"
                  disabled={schedules.length <= 1}
                  onClick={() => removeScheduleRow(idx)}
                  className="p-2 text-[#94a3b8] hover:text-[#fb7185] hover:bg-white/10 rounded-full disabled:opacity-30 transition-colors spring-tap"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Live Summary Preview */}
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-white">
            <span className="font-bold">Daily Consumption:</span>
            <span className="font-mono font-bold text-sm text-[#ff385c]">
              {dailyRate} {unitLabel}/day
            </span>
          </div>

          <div className="flex items-center gap-4 text-[#94a3b8]">
            <div>
              30-Day Need: <strong className="text-white font-mono">{monthlyNeed} {unitLabel}</strong>
            </div>
            <div>
              Packs Required: <strong className="text-white font-mono">{packsPerMonth} pack(s)</strong>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Physical Stock Anchor */}
      <section className="liquid-glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="p-2.5 rounded-2xl bg-white/10 text-white border border-white/15">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Current Physical Stock Anchor</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1.5">
              Physical Count on Hand <span className="text-[#ff385c]">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.5"
                value={baselineStock}
                onChange={(e) => setBaselineStock(parseFloat(e.target.value) || 0)}
                required
                className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-base font-bold text-white font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#94a3b8] font-mono font-medium">
                {unitLabel}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1.5">Count Date</label>
            <input
              type="date"
              value={baselineDate}
              onChange={(e) => setBaselineDate(e.target.value)}
              className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1.5">
              Safety Buffer (Days)
            </label>
            <input
              type="number"
              min="0"
              placeholder="Default: 2 days"
              value={safetyBuffer}
              onChange={(e) => setSafetyBuffer(e.target.value)}
              className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-sm text-white font-mono"
            />
          </div>
        </div>
      </section>

      {/* 4. Channel Lead Time Overrides */}
      <section className="liquid-glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="p-2.5 rounded-2xl bg-white/10 text-white border border-white/15">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Purchase Channels & Lead Times</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Apollo */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              apolloConfig.available
                ? "bg-white/[0.04] border-white/10"
                : "bg-white/[0.02] border-white/5 opacity-40"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-xs text-white">Apollo 24|7 (Online)</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#94a3b8]">
                <input
                  type="checkbox"
                  checked={apolloConfig.available}
                  onChange={(e) => setApolloConfig({ ...apolloConfig, available: e.target.checked })}
                  className="rounded border-white/20 text-[#ff385c] focus:ring-0"
                />
                <span>Available</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-[#94a3b8] block mb-1">Min Days</span>
                <input
                  type="number"
                  min="0"
                  value={apolloConfig.lead_time_min_days}
                  onChange={(e) =>
                    setApolloConfig({ ...apolloConfig, lead_time_min_days: parseInt(e.target.value) || 0 })
                  }
                  className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#94a3b8] block mb-1">Max Days</span>
                <input
                  type="number"
                  min="1"
                  value={apolloConfig.lead_time_max_days}
                  onChange={(e) =>
                    setApolloConfig({ ...apolloConfig, lead_time_max_days: parseInt(e.target.value) || 1 })
                  }
                  className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Mr. Med */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              mrMedConfig.available
                ? "bg-white/[0.04] border-white/10"
                : "bg-white/[0.02] border-white/5 opacity-40"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-xs text-white">Mr. Med (Online)</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#94a3b8]">
                <input
                  type="checkbox"
                  checked={mrMedConfig.available}
                  onChange={(e) => setMrMedConfig({ ...mrMedConfig, available: e.target.checked })}
                  className="rounded border-white/20 text-[#ff385c] focus:ring-0"
                />
                <span>Available</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-[#94a3b8] block mb-1">Min Days</span>
                <input
                  type="number"
                  min="0"
                  value={mrMedConfig.lead_time_min_days}
                  onChange={(e) =>
                    setMrMedConfig({ ...mrMedConfig, lead_time_min_days: parseInt(e.target.value) || 0 })
                  }
                  className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#94a3b8] block mb-1">Max Days</span>
                <input
                  type="number"
                  min="1"
                  value={mrMedConfig.lead_time_max_days}
                  onChange={(e) =>
                    setMrMedConfig({ ...mrMedConfig, lead_time_max_days: parseInt(e.target.value) || 1 })
                  }
                  className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Offline */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              offlineConfig.available
                ? "bg-white/[0.04] border-white/10"
                : "bg-white/[0.02] border-white/5 opacity-40"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-xs text-white">Local Pharmacy (Offline)</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#94a3b8]">
                <input
                  type="checkbox"
                  checked={offlineConfig.available}
                  onChange={(e) => setOfflineConfig({ ...offlineConfig, available: e.target.checked })}
                  className="rounded border-white/20 text-[#ff385c] focus:ring-0"
                />
                <span>Available</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-[#94a3b8] block mb-1">Min Days</span>
                <input
                  type="number"
                  min="0"
                  value={offlineConfig.lead_time_min_days}
                  onChange={(e) =>
                    setOfflineConfig({ ...offlineConfig, lead_time_min_days: parseInt(e.target.value) || 0 })
                  }
                  className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#94a3b8] block mb-1">Max Days</span>
                <input
                  type="number"
                  min="0"
                  value={offlineConfig.lead_time_max_days}
                  onChange={(e) =>
                    setOfflineConfig({ ...offlineConfig, lead_time_max_days: parseInt(e.target.value) || 0 })
                  }
                  className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Doctor Notes */}
      <section className="liquid-glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl">
        <label className="block text-[12px] font-bold text-white mb-2">
          Doctor / Prescription Remarks & Notes
        </label>
        <textarea
          rows={3}
          placeholder="e.g. Prescribed for hypertension. Take empty stomach 30 mins before breakfast."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full liquid-glass-input rounded-2xl p-4 text-sm text-white placeholder:text-[#64748b]"
        />
      </section>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 text-sm font-semibold text-[#94a3b8] hover:text-white rounded-full transition-colors spring-tap"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="inline-flex items-center gap-2 px-8 py-3 text-sm font-semibold liquid-btn-primary rounded-full shadow-lg transition-all spring-tap disabled:opacity-50"
        >
          <Check className="h-4 w-4 stroke-[2.5]" />
          <span>{isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Medicine"}</span>
        </button>
      </div>
    </form>
  );
}
