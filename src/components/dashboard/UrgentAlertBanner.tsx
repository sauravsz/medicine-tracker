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
      className={`rounded-2xl border p-5 transition-all shadow-sm ${
        isSevere
          ? "bg-[#fff8f6] border-[#ffd1da]"
          : "bg-[#fffdfa] border-[#fef08a]"
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`p-2 rounded-full shrink-0 ${
            isSevere ? "bg-[#ffe4e6] text-[#c13515]" : "bg-[#fef9c3] text-[#ca8a04]"
          }`}
        >
          {isSevere ? <AlertOctagon className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className={`font-bold text-[15px] ${isSevere ? "text-[#c13515]" : "text-[#854d0e]"}`}>
              {isSevere
                ? `Reorder Alert: ${criticalCount} medicine(s) at immediate risk of running out`
                : `Order Window Open: ${urgentList.length} medicine(s) need replenishment`}
            </h3>
            <span className="text-[12px] font-semibold text-[#6a6a6a]">
              {urgentList.length} action item{urgentList.length > 1 ? "s" : ""}
            </span>
          </div>

          <p className="text-[13px] text-[#3f3f3f] mt-1 leading-relaxed">
            Apollo 24|7 takes 7–10 days and Mr. Med takes 3–5 days. Order now to ensure delivery arrives before physical stock reaches zero.
          </p>

          <div className="mt-3.5 divide-y divide-[#ebebeb] bg-white rounded-xl border border-[#ebebeb] overflow-hidden">
            {urgentList.map((item) => (
              <div
                key={item.medicine.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[#f7f7f7] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      item.urgency === "CRITICAL"
                        ? "bg-[#c13515] animate-pulse"
                        : item.urgency === "ORDER_NOW"
                        ? "bg-[#f97316]"
                        : "bg-[#eab308]"
                    }`}
                  />
                  <div>
                    <Link
                      href={`/medicines/${item.medicine.id}`}
                      className="font-semibold text-[14px] text-[#222222] hover:text-[#ff385c] transition-colors flex items-center gap-1.5"
                    >
                      {item.medicine.name}
                      {item.medicine.strength && (
                        <span className="text-[12px] text-[#6a6a6a] font-normal font-mono">({item.medicine.strength})</span>
                      )}
                    </Link>
                    <div className="text-[12px] text-[#6a6a6a] mt-0.5">{item.recommended_action}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#222222] text-[13px]">{item.on_hand_stock}</span>
                    <span className="text-[#6a6a6a] text-[11px] ml-1">{item.medicine.unit_label}</span>
                    <span className="text-[#dddddd] mx-1.5">|</span>
                    <span className="text-[#c13515] font-semibold text-[12px]">{item.days_remaining}d left</span>
                  </div>
                  <button
                    onClick={() => onRestockClick(item)}
                    className="px-3.5 py-1.5 bg-[#ff385c] hover:bg-[#e00b41] text-white rounded-full font-medium text-[12px] shadow-sm transition-all"
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
