import { AlertOctagon, AlertTriangle } from "lucide-react";
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
      className={`rounded-2xl border p-5 transition-all shadow-lg ${
        isSevere
          ? "bg-[#1c1114] border-[#4c1620] shadow-rose-950/20"
          : "bg-[#1c170f] border-[#452a12] shadow-amber-950/20"
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`p-2 rounded-full shrink-0 ${
            isSevere ? "bg-[#3d141b] text-[#fb7185]" : "bg-[#3d2711] text-[#fde047]"
          }`}
        >
          {isSevere ? <AlertOctagon className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className={`font-bold text-[15px] ${isSevere ? "text-[#fecdd3]" : "text-[#fef08a]"}`}>
              {isSevere
                ? `Reorder Alert: ${criticalCount} medicine(s) at risk of running dry`
                : `Order Window Open: ${urgentList.length} medicine(s) need replenishment`}
            </h3>
            <span className="text-[12px] font-semibold text-[#94a3b8]">
              {urgentList.length} action item{urgentList.length > 1 ? "s" : ""}
            </span>
          </div>

          <p className="text-[13px] text-[#cbd5e1] mt-1 leading-relaxed">
            Apollo 24|7 takes 7–10 days and Mr. Med takes 3–5 days. Order now to ensure delivery arrives before physical stock reaches zero.
          </p>

          <div className="mt-3.5 divide-y divide-[#1e2536] bg-[#121622] rounded-xl border border-[#1e2536] overflow-hidden">
            {urgentList.map((item) => (
              <div
                key={item.medicine.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[#171d2c] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      item.urgency === "CRITICAL"
                        ? "bg-[#f43f5e] animate-pulse"
                        : item.urgency === "ORDER_NOW"
                        ? "bg-[#fb923c]"
                        : "bg-[#facc15]"
                    }`}
                  />
                  <div>
                    <Link
                      href={`/medicines/${item.medicine.id}`}
                      className="font-semibold text-[14px] text-white hover:text-[#ff385c] transition-colors flex items-center gap-1.5"
                    >
                      {item.medicine.name}
                      {item.medicine.strength && (
                        <span className="text-[12px] text-[#94a3b8] font-normal font-mono">({item.medicine.strength})</span>
                      )}
                    </Link>
                    <div className="text-[12px] text-[#94a3b8] mt-0.5">{item.recommended_action}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="font-mono font-bold text-white text-[13px]">{item.on_hand_stock}</span>
                    <span className="text-[#94a3b8] text-[11px] ml-1">{item.medicine.unit_label}</span>
                    <span className="text-[#334155] mx-1.5">|</span>
                    <span className="text-[#fb7185] font-semibold text-[12px]">{item.days_remaining}d left</span>
                  </div>
                  <button
                    onClick={() => onRestockClick(item)}
                    className="px-3.5 py-1.5 bg-[#ff385c] hover:bg-[#e00b41] text-white rounded-full font-semibold text-[12px] shadow-sm transition-all"
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
