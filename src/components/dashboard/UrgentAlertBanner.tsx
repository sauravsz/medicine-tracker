import { AlertOctagon, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CalculatedMedicineState } from "@/lib/types";

interface UrgentAlertBannerProps {
  medicines: CalculatedMedicineState[];
  onRestockClick: (medicine: CalculatedMedicineState) => void;
}

export function UrgentAlertBanner({ medicines, onRestockClick }: UrgentAlertBannerProps) {
  const urgentList = medicines.filter(
    (m) =>
      (m.urgency === "CRITICAL" || m.urgency === "ORDER_NOW" || m.urgency === "ORDER_SOON") &&
      !m.in_transit.covers_stockout
  );

  if (urgentList.length === 0) return null;

  const criticalCount = urgentList.filter((m) => m.urgency === "CRITICAL").length;
  const isSevere = criticalCount > 0;

  return (
    <div
      className={`rounded-3xl border p-5 transition-all liquid-glass-panel relative overflow-hidden ${
        isSevere
          ? "border-rose-500/30 shadow-2xl shadow-rose-950/30"
          : "border-amber-500/30 shadow-2xl shadow-amber-950/30"
      }`}
    >
      {/* Background ambient radial highlight */}
      <div
        className={`absolute -right-20 -top-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none opacity-40 ${
          isSevere ? "bg-[#ff385c]" : "bg-[#f59e0b]"
        }`}
      />

      <div className="relative z-10 flex items-start gap-3.5">
        <div
          className={`p-2.5 rounded-2xl shrink-0 backdrop-blur-md border ${
            isSevere
              ? "bg-rose-500/20 text-[#ff4d6d] border-rose-500/30"
              : "bg-amber-500/20 text-[#fde047] border-amber-500/30"
          }`}
        >
          {isSevere ? <AlertOctagon className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className={`font-bold text-[15px] tracking-tight ${isSevere ? "text-[#fda4af]" : "text-[#fef08a]"}`}>
              {isSevere
                ? `Immediate Reorder Attention: ${criticalCount} medicine(s) near cutoff`
                : `Lead-Time Ordering Window Open (${urgentList.length} items)`}
            </h3>
            <span className="text-[12px] font-mono font-bold text-[#94a3b8] px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
              {urgentList.length} action item{urgentList.length > 1 ? "s" : ""}
            </span>
          </div>


          <div className="mt-3.5 divide-y divide-white/5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            {urgentList.map((item) => (
              <div
                key={item.medicine.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      item.urgency === "CRITICAL"
                        ? "bg-[#ff385c] animate-pulse shadow-sm shadow-[#ff385c]"
                        : item.urgency === "ORDER_NOW"
                        ? "bg-[#fb923c] shadow-sm shadow-[#fb923c]"
                        : "bg-[#facc15] shadow-sm shadow-[#facc15]"
                    }`}
                  />
                  <div>
                    <Link
                      href={`/medicines/${item.medicine.id}`}
                      className="font-bold text-[14px] text-white hover:text-[#ff385c] transition-colors flex items-center gap-1.5"
                    >
                      {item.medicine.name}
                      {item.medicine.strength && (
                        <span className="text-[11px] text-[#94a3b8] font-normal font-mono">({item.medicine.strength})</span>
                      )}
                    </Link>
                    <div className="text-[12px] text-[#94a3b8] mt-0.5">{item.recommended_action}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="font-mono font-bold text-white text-[13px]">{item.on_hand_stock}</span>
                    <span className="text-[#94a3b8] text-[11px] ml-1">{item.medicine.unit_label}</span>
                    <span className="text-white/20 mx-1.5">|</span>
                    <span className="text-[#ff4d6d] font-mono font-bold text-[12px]">{item.days_remaining}d left</span>
                  </div>
                  <button
                    onClick={() => onRestockClick(item)}
                    className="px-4 py-1.5 liquid-btn-primary rounded-full font-semibold text-[12px] spring-tap"
                  >
                    Log Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
