"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pill,
  Clock,
  Truck,
  Plus,
  Sliders,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ChevronLeft,
  PackageCheck,
  Building2,
  TrendingDown,
} from "lucide-react";
import {
  CalculatedMedicineState,
  Medicine,
  DoseSchedule,
  ChannelConfig,
  RestockEvent,
  StockAdjustment,
} from "@/lib/types";
import {
  deleteMedicineAction,
  markRestockReceivedAction,
  deleteRestockAction,
} from "@/app/actions";
import { QuickRestockModal } from "@/components/dashboard/QuickRestockModal";
import { QuickAdjustModal } from "@/components/dashboard/QuickAdjustModal";
import { generateStockTrajectory } from "@/lib/calculations";
import { format, parseISO } from "date-fns";

interface MedicineDetailViewProps {
  data: {
    full: {
      medicine: Medicine;
      schedules: DoseSchedule[];
      channel_configs: ChannelConfig[];
      restocks: RestockEvent[];
      adjustments: StockAdjustment[];
    };
    state: CalculatedMedicineState;
  };
}

export function MedicineDetailView({ data }: MedicineDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { full, state } = data;
  const { medicine, schedules, restocks, adjustments } = full;

  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const trajectory = generateStockTrajectory(state, 30);
  const maxStock = Math.max(...trajectory.map((t) => t.projectedStock), state.on_hand_stock, 10);

  const handleDelete = () => {
    startTransition(async () => {
      await deleteMedicineAction(medicine.id);
      router.push("/");
    });
  };

  const handleMarkReceived = (restockId: string) => {
    startTransition(async () => {
      await markRestockReceivedAction(restockId, medicine.id);
      router.refresh();
    });
  };

  const handleDeleteRestock = (restockId: string) => {
    startTransition(async () => {
      await deleteRestockAction(restockId, medicine.id);
      router.refresh();
    });
  };

  const urgencyConfig = {
    OK: { badgeBg: "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]", dot: "bg-[#10b981]" },
    ORDER_SOON: { badgeBg: "bg-[#fefce8] text-[#854d0e] border-[#fef08a]", dot: "bg-[#eab308]" },
    ORDER_NOW: { badgeBg: "bg-[#fff7ed] text-[#9a3412] border-[#fed7aa]", dot: "bg-[#f97316]" },
    CRITICAL: { badgeBg: "bg-[#fff1f2] text-[#9f1239] border-[#fecdd3]", dot: "bg-[#e11d48] animate-pulse" },
  }[state.urgency];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6a6a6a] hover:text-[#222222] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Inventory</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/medicines/${medicine.id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#222222] hover:bg-[#f7f7f7] border border-[#dddddd] rounded-full transition-colors"
          >
            <Edit className="h-3.5 w-3.5 text-[#6a6a6a]" />
            <span>Edit Medicine</span>
          </Link>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#c13515] hover:bg-[#fff1f2] border border-[#ffd1da] rounded-full transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#fff1f2] border border-[#fecdd3] p-1 rounded-full">
              <span className="text-[11px] font-semibold text-[#9f1239] px-2">Confirm?</span>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-3 py-1 bg-[#e11d48] hover:bg-[#be123c] text-white text-[11px] font-bold rounded-full"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1 bg-white hover:bg-[#f7f7f7] text-[#222222] text-[11px] font-semibold rounded-full border border-[#dddddd]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white border border-[#ebebeb] rounded-3xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#ebebeb]">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-[#ff385c] flex items-center justify-center text-white shadow-lg shadow-[#ff385c]/25 shrink-0">
              <Pill className="h-7 w-7" />
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight">
                  {medicine.name}
                </h1>
                {medicine.strength && (
                  <span className="text-sm px-3 py-0.5 rounded-full bg-[#f7f7f7] text-[#222222] font-mono border border-[#ebebeb] font-semibold">
                    {medicine.strength}
                  </span>
                )}
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${urgencyConfig.badgeBg}`}
                >
                  <span className={`h-2 w-2 rounded-full ${urgencyConfig.dot}`} />
                  <span>{state.urgency_label}</span>
                </div>
              </div>

              <p className="text-xs text-[#6a6a6a] mt-1.5 flex items-center gap-2">
                <span className="capitalize font-medium">{medicine.form}</span>
                <span>•</span>
                <span>
                  {medicine.units_per_pack > 1
                    ? `${medicine.units_per_pack} ${medicine.unit_label}/pack`
                    : medicine.unit_label}
                </span>
                <span>•</span>
                <span>Anchor: {medicine.baseline_stock} {medicine.unit_label} on {medicine.baseline_date}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRestockModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#ff385c] hover:bg-[#e00b41] active:scale-98 rounded-full shadow-md transition-all"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Log Restock</span>
            </button>
            <button
              onClick={() => setShowAdjustModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#222222] hover:bg-[#f7f7f7] border border-[#dddddd] rounded-full transition-colors"
            >
              <Sliders className="h-4 w-4 text-[#6a6a6a]" />
              <span>Audit Count</span>
            </button>
          </div>
        </div>

        {/* 4 Core KPI Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-[#f7f7f7] border border-[#ebebeb]">
            <span className="text-[12px] font-medium text-[#6a6a6a] block">Current On-Hand</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-extrabold font-mono text-[#222222]">{state.on_hand_stock}</span>
              <span className="text-xs text-[#6a6a6a]">{medicine.unit_label}</span>
            </div>
            <span className="text-[11px] text-[#929292] mt-1 block">Live balance</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#f7f7f7] border border-[#ebebeb]">
            <span className="text-[12px] font-medium text-[#6a6a6a] block">Depletion Horizon</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`text-3xl font-extrabold font-mono ${
                  state.days_remaining <= 3
                    ? "text-[#c13515]"
                    : state.days_remaining <= 7
                    ? "text-[#ca8a04]"
                    : "text-[#16a34a]"
                }`}
              >
                {state.days_remaining}
              </span>
              <span className="text-xs text-[#6a6a6a]">days</span>
            </div>
            <span className="text-[11px] text-[#929292] mt-1 block">
              Runs dry: {format(parseISO(state.stock_out_date), "dd MMM")}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#f7f7f7] border border-[#ebebeb]">
            <span className="text-[12px] font-medium text-[#6a6a6a] block">Daily Rate</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-extrabold font-mono text-[#222222]">{state.daily_consumption}</span>
              <span className="text-xs text-[#6a6a6a]">{medicine.unit_label}/d</span>
            </div>
            <span className="text-[11px] text-[#929292] mt-1 block">
              {schedules.length} slot(s)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#f7f7f7] border border-[#ebebeb]">
            <span className="text-[12px] font-medium text-[#6a6a6a] block">30-Day Need</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-extrabold font-mono text-[#ff385c]">
                {state.monthly_planning.packs_needed}
              </span>
              <span className="text-xs text-[#6a6a6a]">
                pk ({state.monthly_planning.monthly_units} {medicine.unit_label})
              </span>
            </div>
            <span className="text-[11px] text-[#929292] mt-1 block">
              {medicine.units_per_pack} {medicine.unit_label}/pack
            </span>
          </div>
        </div>

        {/* Action Callout Banner */}
        <div className="mt-6 p-4 rounded-2xl bg-[#f7f7f7] border border-[#ebebeb] flex items-center justify-between gap-4 flex-wrap text-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-white text-[#ff385c] shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#6a6a6a] block uppercase tracking-wider font-bold">
                Recommended Action
              </span>
              <p className="font-semibold text-[#222222] mt-0.5">{state.recommended_action}</p>
            </div>
          </div>

          {state.recommended_order_by !== "N/A" && (
            <div className="text-right">
              <span className="text-xs text-[#6a6a6a] block">Target Order Cutoff</span>
              <span className="font-mono font-bold text-[#ff385c] text-sm">
                {format(parseISO(state.recommended_order_by), "dd MMMM yyyy")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Channel Deadlines & Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Channel Deadlines Matrix (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#ebebeb] rounded-3xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#222222] mb-1 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#ff385c]" />
              <span>Channel Lead-Time Deadlines</span>
            </h2>
            <p className="text-xs text-[#6a6a6a] mb-4">
              Latest safe order date factoring lead time and safety buffer ({state.deadlines[0]?.safety_buffer_days || 2}d)
            </p>

            <div className="space-y-3">
              {state.deadlines.map((dl) => {
                const isPassed = !dl.is_viable_today && dl.available;
                return (
                  <div
                    key={dl.channel}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      !dl.available
                        ? "bg-[#f7f7f7] border-[#ebebeb] text-[#929292] opacity-50"
                        : isPassed
                        ? "bg-[#fff1f2] border-[#fecdd3] text-[#9f1239]"
                        : "bg-[#f7f7f7] border-[#ebebeb] text-[#222222]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            !dl.available
                              ? "bg-[#929292]"
                              : isPassed
                              ? "bg-[#c13515]"
                              : "bg-[#16a34a]"
                          }`}
                        />
                        <span className="font-bold text-xs">{dl.channel_name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#6a6a6a]">
                        {dl.lead_time_min}–{dl.lead_time_max}d delivery
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#ebebeb] text-xs">
                      <span className="text-[#6a6a6a]">Latest Safe Order Date:</span>
                      <span
                        className={`font-mono font-bold ${
                          !dl.available
                            ? "text-[#929292]"
                            : isPassed
                            ? "text-[#c13515]"
                            : "text-[#16a34a]"
                        }`}
                      >
                        {!dl.available ? "Not Available" : format(parseISO(dl.order_by_date), "dd MMM yyyy")}
                      </span>
                    </div>

                    {dl.available && (
                      <div className="mt-1 text-[11px] text-right font-mono font-medium">
                        {dl.days_until_deadline >= 0 ? (
                          <span className="text-[#16a34a]">
                            {dl.days_until_deadline} day{dl.days_until_deadline !== 1 ? "s" : ""} left to order
                          </span>
                        ) : (
                          <span className="text-[#c13515]">
                            Deadline passed {Math.abs(dl.days_until_deadline)} day{Math.abs(dl.days_until_deadline) !== 1 ? "s" : ""} ago
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {medicine.notes && (
            <div className="mt-4 p-3.5 rounded-2xl bg-[#f7f7f7] border border-[#ebebeb] text-xs text-[#3f3f3f]">
              <span className="font-bold text-[#222222] block mb-0.5">Doctor Notes:</span>
              <p className="italic leading-relaxed">{medicine.notes}</p>
            </div>
          )}
        </div>

        {/* Right: 30-day Stock Depletion Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#ebebeb] rounded-3xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-[#222222] flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-[#ff385c]" />
                <span>30-Day Depletion Curve</span>
              </h2>
              <span className="text-xs font-mono text-[#6a6a6a]">-{state.daily_consumption} {medicine.unit_label}/day</span>
            </div>
            <p className="text-xs text-[#6a6a6a] mb-6">
              Projected inventory curve with safe reorder buffer zone
            </p>

            {/* Custom SVG stock burn-down chart */}
            <div className="bg-[#f7f7f7] rounded-2xl p-4 border border-[#ebebeb]">
              <div className="h-44 w-full relative flex items-end">
                {trajectory.map((point, i) => {
                  const heightPercent = maxStock > 0 ? (point.projectedStock / maxStock) * 100 : 0;
                  const isZero = point.projectedStock === 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-[#222222] text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg pointer-events-none transition-opacity z-20 whitespace-nowrap">
                        {point.date}: {point.projectedStock} {medicine.unit_label}
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${Math.max(2, heightPercent)}%` }}
                        className={`w-full max-w-[8px] mx-auto rounded-t transition-all ${
                          isZero
                            ? "bg-[#ffd1da]"
                            : point.projectedStock <= point.safetyThreshold
                            ? "bg-[#eab308]"
                            : "bg-[#ff385c]"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="flex justify-between text-[10px] font-mono text-[#6a6a6a] mt-2 pt-2 border-t border-[#ebebeb]">
                <span>Today ({trajectory[0]?.date})</span>
                <span>Day 10 ({trajectory[10]?.date})</span>
                <span>Day 20 ({trajectory[20]?.date})</span>
                <span>Day 30 ({trajectory[30]?.date})</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-[#f7f7f7] border border-[#ebebeb]">
              <span className="text-[10px] text-[#6a6a6a] block">Today's Stock</span>
              <span className="font-mono font-bold text-[#222222]">{state.on_hand_stock}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#f7f7f7] border border-[#ebebeb]">
              <span className="text-[10px] text-[#6a6a6a] block">Day 15 Stock</span>
              <span className="font-mono font-bold text-[#222222]">
                {trajectory[15]?.projectedStock ?? 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#f7f7f7] border border-[#ebebeb]">
              <span className="text-[10px] text-[#6a6a6a] block">Day 30 Stock</span>
              <span className="font-mono font-bold text-[#222222]">
                {trajectory[30]?.projectedStock ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dose Schedules */}
      <section className="bg-white border border-[#ebebeb] rounded-3xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#222222] flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#ff385c]" />
            <span>Dose Schedules</span>
          </h2>
          <span className="text-xs font-mono font-semibold text-[#222222]">
            Total: {state.daily_consumption} {medicine.unit_label}/day
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {schedules.map((s, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-[#f7f7f7] border border-[#ebebeb] flex items-start justify-between"
            >
              <div>
                <div className="font-bold text-xs text-[#222222] capitalize">{s.time_of_day.replace("_", " ")}</div>
                <div className="text-[11px] text-[#6a6a6a] mt-0.5">
                  {s.instructions || "No specific instructions"}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono text-[#222222]">
                  {s.quantity} {medicine.unit_label}
                </span>
                <span className="text-[10px] text-[#6a6a6a] block font-medium">
                  {s.interval_days === 1
                    ? "Daily"
                    : s.interval_days === 7
                    ? "Weekly"
                    : `Every ${s.interval_days}d`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* In-Transit & Restock History */}
      <section className="bg-white border border-[#ebebeb] rounded-3xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#222222] flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#ff385c]" />
            <span>Restock Orders & In-Transit Log</span>
          </h2>
          <button
            onClick={() => setShowRestockModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#ff385c] hover:bg-[#e00b41] rounded-full transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Add Restock</span>
          </button>
        </div>

        {restocks.length === 0 ? (
          <div className="p-8 text-center bg-[#f7f7f7] rounded-2xl border border-[#ebebeb] text-xs text-[#6a6a6a]">
            No restock orders logged yet. Initial stock was recorded as {medicine.baseline_stock} {medicine.unit_label}.
          </div>
        ) : (
          <div className="divide-y divide-[#ebebeb] bg-[#f7f7f7] rounded-2xl border border-[#ebebeb] overflow-hidden">
            {restocks.map((r) => {
              const isInTransit = !r.received_date;
              return (
                <div
                  key={r.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-full ${
                        isInTransit ? "bg-[#e0f2fe] text-[#0369a1]" : "bg-white text-[#6a6a6a] border border-[#ebebeb]"
                      }`}
                    >
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#222222] capitalize">{r.channel.replace("_", " ")}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            isInTransit
                              ? "bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]"
                              : "bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]"
                          }`}
                        >
                          {isInTransit ? "In Transit" : `Delivered on ${r.received_date}`}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6a6a6a] mt-0.5">
                        Ordered on {r.ordered_date} {r.cost && `• ₹${r.cost}`} {r.notes && `• ${r.notes}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <span className="font-mono font-bold text-[#222222] text-sm">
                        +{r.quantity_added} {medicine.unit_label}
                      </span>
                      {r.pack_count && (
                        <span className="text-[10px] text-[#6a6a6a] block">({r.pack_count} packs)</span>
                      )}
                    </div>

                    {isInTransit && (
                      <button
                        onClick={() => handleMarkReceived(r.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-full text-xs font-semibold transition-colors shadow-sm"
                      >
                        <PackageCheck className="h-3.5 w-3.5" />
                        <span>Received</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteRestock(r.id)}
                      disabled={isPending}
                      className="p-1.5 text-[#6a6a6a] hover:text-[#c13515] rounded-full transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Manual Stock Adjustments Audit Log */}
      <section className="bg-white border border-[#ebebeb] rounded-3xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <h2 className="text-base font-bold text-[#222222] mb-4 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-[#ff385c]" />
          <span>Manual Adjustments & Audit Recounts</span>
        </h2>

        {adjustments.length === 0 ? (
          <div className="p-8 text-center bg-[#f7f7f7] rounded-2xl border border-[#ebebeb] text-xs text-[#6a6a6a]">
            No manual corrections logged yet.
          </div>
        ) : (
          <div className="divide-y divide-[#ebebeb] bg-[#f7f7f7] rounded-2xl border border-[#ebebeb] overflow-hidden">
            {adjustments.map((a) => (
              <div key={a.id} className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#222222] capitalize">{a.reason.replace("_", " ")}</span>
                  <span className="text-[11px] text-[#6a6a6a] ml-2">on {a.date}</span>
                  {a.notes && <p className="text-[11px] text-[#6a6a6a] mt-0.5">{a.notes}</p>}
                </div>
                <div
                  className={`font-mono font-bold text-sm ${
                    a.delta >= 0 ? "text-[#16a34a]" : "text-[#c13515]"
                  }`}
                >
                  {a.delta >= 0 ? `+${a.delta}` : a.delta} {medicine.unit_label}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {showRestockModal && (
        <QuickRestockModal
          item={state}
          onClose={() => setShowRestockModal(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {showAdjustModal && (
        <QuickAdjustModal
          item={state}
          onClose={() => setShowAdjustModal(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
