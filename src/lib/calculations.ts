import {
  addDays,
  format,
  parseISO,
  isBefore,
  isSameDay,
} from "date-fns";
import type {
  Medicine,
  DoseSchedule,
  ChannelConfig,
  RestockEvent,
  StockAdjustment,
  AppSettings,
  CalculatedMedicineState,
  ChannelDeadline,
  ChannelType,
  UrgencyStatus,
  InTransitSummary,
  MonthlyRequirement,
} from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  default_apollo_lead_min: 7,
  default_apollo_lead_max: 10,
  default_mr_med_lead_min: 3,
  default_mr_med_lead_max: 5,
  default_offline_lead_min: 0,
  default_offline_lead_max: 1,
  default_safety_buffer_days: 2,
  app_passcode: null,
  reminder_email: null,
  reminder_time: "08:00",
  reminders_enabled: true,
  ai_provider: "groq",
  groq_api_key: null,
  groq_model: "openai/gpt-oss-120b",
  ollama_api_key: null,
  ollama_base_url: "https://ollama.com",
  ollama_model: "ollamacloud/gemma4:31b",
  telegram_bot_token: null,
  telegram_chat_id: null,
  telegram_enabled: true,
};

export const CHANNEL_METADATA: Record<
  ChannelType,
  { name: string; defaultMin: number; defaultMax: number; badgeColor: string }
> = {
  apollo: {
    name: "Apollo 24|7",
    defaultMin: 7,
    defaultMax: 10,
    badgeColor: "bg-blue-900/60 text-blue-300 border-blue-700/50",
  },
  mr_med: {
    name: "Mr. Med",
    defaultMin: 3,
    defaultMax: 5,
    badgeColor: "bg-purple-900/60 text-purple-300 border-purple-700/50",
  },
  offline: {
    name: "Local Pharmacy",
    defaultMin: 0,
    defaultMax: 1,
    badgeColor: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50",
  },
  other: {
    name: "Other Channel",
    defaultMin: 1,
    defaultMax: 3,
    badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
  },
};

export function toCalendarDateString(val: unknown): string {
  if (!val) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  if (typeof val === "string") {
    const s = val.trim();
    if (s.includes("T")) return s.split("T")[0];
    if (s.includes(" ")) return s.split(" ")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return s;
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }
    if (val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0 && val.getUTCMilliseconds() === 0) {
      return val.toISOString().split("T")[0];
    }
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, "0")}-${String(val.getDate()).padStart(2, "0")}`;
  }
  return String(val);
}

export function safeParseDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date() : new Date(val.getFullYear(), val.getMonth(), val.getDate(), 0, 0, 0, 0);
  }
  if (typeof val === "string") {
    try {
      const clean = val.split("T")[0].split(" ")[0];
      const parts = clean.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      }
      const parsed = parseISO(clean);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch {}
    try {
      const fallback = new Date(val);
      if (!isNaN(fallback.getTime())) {
        return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 0, 0, 0, 0);
      }
    } catch {}
  }
  return new Date();
}

export function safeFormatDate(val: unknown, pattern: string = "yyyy-MM-dd"): string {
  try {
    const d = safeParseDate(val);
    return format(d, pattern);
  } catch {
    return format(new Date(), pattern);
  }
}

/**
 * Timezone-neutral calendar day difference (eliminates UTC vs IST midnight off-by-one drift)
 */
export function getCalendarDaysElapsed(laterDate: Date | string, earlierDate: Date | string): number {
  const s1 = toCalendarDateString(laterDate);
  const s2 = toCalendarDateString(earlierDate);
  const [y1, m1, d1] = s1.split("-").map(Number);
  const [y2, m2, d2] = s2.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.max(0, Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24)));
}

export function getTargetWeekday(instructions?: string | null): number | null {
  if (!instructions) return null;
  const lower = instructions.toLowerCase();
  if (/\b(sun|sunday)\b/i.test(lower)) return 0;
  if (/\b(mon|monday)\b/i.test(lower)) return 1;
  if (/\b(tue|tues|tuesday)\b/i.test(lower)) return 2;
  if (/\b(wed|wednesday)\b/i.test(lower)) return 3;
  if (/\b(thu|thur|thurs|thursday)\b/i.test(lower)) return 4;
  if (/\b(fri|friday)\b/i.test(lower)) return 5;
  if (/\b(sat|saturday)\b/i.test(lower)) return 6;
  return null;
}
export function getDoseQuantityForDate(
  schedules: DoseSchedule[],
  targetDate: Date,
  baselineDate: Date
): number {
  if (!schedules || schedules.length === 0) return 0;
  let dailyTotal = 0;
  for (const s of schedules) {
    const qty = Number(s.quantity) || 0;
    const interval = Math.max(1, Number(s.interval_days) || 1);
    if (interval === 1) {
      dailyTotal += qty;
    } else {
      const targetWeekday = getTargetWeekday(s.instructions);
      if (targetWeekday !== null) {
        if (targetDate.getDay() === targetWeekday) {
          dailyTotal += qty;
        }
      } else {
        const daysFromBase = getCalendarDaysElapsed(targetDate, baselineDate);
        if (daysFromBase > 0 && daysFromBase % interval === 0) {
          dailyTotal += qty;
        }
      }
    }
  }
  return dailyTotal;
}

/**
 * Calculates actual consumed units between baseline and reference date for both daily and weekly/interval schedules.
 */
export function calculateConsumptionSinceBaseline(
  schedules: DoseSchedule[],
  baselineDate: Date,
  referenceDate: Date
): number {
  const daysElapsed = getCalendarDaysElapsed(referenceDate, baselineDate);
  if (daysElapsed <= 0) return 0;

  const allDaily = schedules.every((s) => (Number(s.interval_days) || 1) === 1);
  if (allDaily) {
    const dailyRate = schedules.reduce((total, s) => total + (Number(s.quantity) || 0), 0);
    return dailyRate * daysElapsed;
  }

  let totalConsumed = 0;
  for (let i = 1; i <= daysElapsed; i++) {
    const currDate = addDays(baselineDate, i);
    totalConsumed += getDoseQuantityForDate(schedules, currDate, baselineDate);
  }
  return totalConsumed;
}

/**
 * Projects forward how many days the remaining stock will last before depleting to 0.
 */
export function calculateDaysRemaining(
  schedules: DoseSchedule[],
  stock: number,
  referenceDate: Date,
  baselineDate: Date
): number {
  if (!schedules || schedules.length === 0) return 999;

  const dailyRate = calculateDailyConsumption(schedules);
  if (dailyRate <= 0) return 999;

  const allDaily = schedules.every((s) => (Number(s.interval_days) || 1) === 1);
  if (allDaily) {
    if (stock <= 0) return 0;
    return Math.floor(stock / dailyRate);
  }

  let remStock = Math.max(0, stock);
  let dayOffset = 0;
  const MAX_DAYS = 365;

  while (dayOffset < MAX_DAYS) {
    dayOffset++;
    const nextDate = addDays(referenceDate, dayOffset);
    const doseNeeded = getDoseQuantityForDate(schedules, nextDate, baselineDate);
    if (doseNeeded > 0) {
      if (remStock < doseNeeded) {
        return dayOffset - 1;
      }
      remStock -= doseNeeded;
    }
  }

  return 999;
}

/**
 * Formats a clean human frequency string (e.g. "1 injection/week (Sat)" instead of "0.14 injections/day").
 */
export function formatScheduleSummary(schedules: DoseSchedule[], unitLabel: string = "units"): string {
  if (!schedules || schedules.length === 0) return `0 ${unitLabel}/day`;

  if (schedules.length === 1) {
    const s = schedules[0];
    const qty = Number(s.quantity) || 1;
    const interval = Number(s.interval_days) || 1;
    const singleUnit = qty === 1 && unitLabel.endsWith("s") ? unitLabel.slice(0, -1) : unitLabel;

    if (interval === 1) {
      return `${qty} ${singleUnit}/day`;
    }
    if (interval === 7) {
      const weekday = getTargetWeekday(s.instructions);
      const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const daySuffix = weekday !== null ? ` (${weekdayNames[weekday]})` : "";
      return `${qty} ${singleUnit}/week${daySuffix}`;
    }
    return `${qty} ${singleUnit} every ${interval} days`;
  }

  const allDaily = schedules.every((s) => (Number(s.interval_days) || 1) === 1);
  if (allDaily) {
    const totalDaily = schedules.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
    const singleUnit = totalDaily === 1 && unitLabel.endsWith("s") ? unitLabel.slice(0, -1) : unitLabel;
    return `${totalDaily} ${singleUnit}/day`;
  }

  const dailyEquivalent = calculateDailyConsumption(schedules);
  const rounded = Math.round(dailyEquivalent * 100) / 100;
  return `${rounded} ${unitLabel}/day`;
}

/**
 * Calculates total daily consumption for a medicine from its dose schedules.
 */
export function calculateDailyConsumption(schedules: DoseSchedule[]): number {
  if (!schedules || schedules.length === 0) return 0;
  return schedules.reduce((total, s) => {
    const qty = Number(s.quantity) || 0;
    const interval = Math.max(1, Number(s.interval_days) || 1);
    return total + qty / interval;
  }, 0);
}

/**
 * Calculates the current real-time stock state using time-anchored depletion and smart in-transit shielding.
 */
export function computeMedicineState(
  medicine: Medicine,
  schedules: DoseSchedule[] = [],
  channelConfigs: ChannelConfig[] = [],
  restocks: RestockEvent[] = [],
  adjustments: StockAdjustment[] = [],
  settings: AppSettings = DEFAULT_SETTINGS,
  referenceDate: Date = new Date()
): CalculatedMedicineState {
  const safeSchedules = Array.isArray(schedules) ? schedules : [];
  const safeChannelConfigs = Array.isArray(channelConfigs) ? channelConfigs : [];
  const safeRestocks = Array.isArray(restocks) ? restocks : [];
  const safeAdjustments = Array.isArray(adjustments) ? adjustments : [];
  const todayStr = safeFormatDate(referenceDate, "yyyy-MM-dd");
  const baselineDate = safeParseDate(medicine.baseline_date || todayStr);

  const dailyConsumption = calculateDailyConsumption(schedules);
  const frequencyLabel = formatScheduleSummary(schedules, medicine.unit_label);
  const safetyBuffer =
    typeof medicine.safety_buffer_days === "number" && medicine.safety_buffer_days !== null
      ? medicine.safety_buffer_days
      : settings.default_safety_buffer_days ?? 2;

  // 1. Calendar-accurate units consumed since baseline anchor
  const consumedSinceBaseline = calculateConsumptionSinceBaseline(
    schedules,
    baselineDate,
    referenceDate
  );

  const baselineDateStr = toCalendarDateString(medicine.baseline_date || todayStr);

  // 2. Sum received restocks recorded on or after baseline date
  const receivedRestocksSinceBaseline = restocks
    .filter((r) => r.received_date && toCalendarDateString(r.received_date) >= baselineDateStr)
    .reduce((sum, r) => sum + (Number(r.quantity_added) || 0), 0);

  // 3. Sum manual adjustments recorded on or after baseline date (excluding baseline recount)
  const adjustmentsSinceBaseline = adjustments
    .filter((a) => {
      const aDateStr = toCalendarDateString(a.date);
      if (aDateStr < baselineDateStr) return false;
      // Recount adjustment on baseline date is what set baseline_stock itself; do not double count
      if (a.reason === "audit_recount" && aDateStr === baselineDateStr) {
        return false;
      }
      return true;
    })
    .reduce((sum, a) => sum + (Number(a.delta) || 0), 0);

  // 4. Current physical on-hand stock
  const rawOnHand =
    Number(medicine.baseline_stock || 0) -
    consumedSinceBaseline +
    receivedRestocksSinceBaseline +
    adjustmentsSinceBaseline;

  const onHandStock = Math.max(0, Math.round(rawOnHand * 10) / 10);

  // 5. In-transit orders tracking
  const inTransitOrders = restocks.filter((r) => !r.received_date);
  const inTransitUnits = inTransitOrders.reduce(
    (sum, r) => sum + (Number(r.quantity_added) || 0),
    0
  );

  let earliestEta: string | null = null;
  let latestEta: string | null = null;
  if (inTransitOrders.length > 0) {
    const etas = inTransitOrders
      .map((o) => toCalendarDateString(o.expected_arrival_date || o.ordered_date))
      .sort();
    earliestEta = etas[0] || null;
    latestEta = etas[etas.length - 1] || null;
  }

  // 6. Days remaining & stockout dates (calendar-accurate forward simulation)
  const daysRemaining = calculateDaysRemaining(
    schedules,
    onHandStock,
    referenceDate,
    baselineDate
  );
  const stockOutDate = safeFormatDate(addDays(referenceDate, daysRemaining));

  const effectiveStock = onHandStock + inTransitUnits;
  const effectiveDaysRemaining = calculateDaysRemaining(
    schedules,
    effectiveStock,
    referenceDate,
    baselineDate
  );
  const effectiveStockOutDate = safeFormatDate(addDays(referenceDate, effectiveDaysRemaining));

  // In-transit order strictly covers stockout only if it arrives on or before stock runs out
  const earliestEtaStr = earliestEta ? toCalendarDateString(earliestEta) : null;
  const stockOutDateStr = toCalendarDateString(stockOutDate);
  const hasInTransit = inTransitOrders.length > 0;
  const inTransitCovers = Boolean(
    hasInTransit &&
      earliestEtaStr &&
      earliestEtaStr <= stockOutDateStr &&
      inTransitUnits > 0
  );

  const inTransitSummary: InTransitSummary = {
    total_units: inTransitUnits,
    orders: inTransitOrders,
    earliest_eta: earliestEta,
    latest_eta: latestEta,
    covers_stockout: inTransitCovers,
  };
  // 7. Channel Deadlines computation
  const channels: ChannelType[] = ["apollo", "mr_med", "offline"];
  const deadlines: ChannelDeadline[] = channels.map((chan) => {
    const override = channelConfigs.find((c) => c.channel === chan);
    const available = override !== undefined ? Boolean(override.available) : true;

    let leadMin = CHANNEL_METADATA[chan].defaultMin;
    let leadMax = CHANNEL_METADATA[chan].defaultMax;

    if (chan === "apollo") {
      leadMin = override?.lead_time_min_days ?? settings.default_apollo_lead_min ?? 7;
      leadMax = override?.lead_time_max_days ?? settings.default_apollo_lead_max ?? 10;
    } else if (chan === "mr_med") {
      leadMin = override?.lead_time_min_days ?? settings.default_mr_med_lead_min ?? 3;
      leadMax = override?.lead_time_max_days ?? settings.default_mr_med_lead_max ?? 5;
    } else if (chan === "offline") {
      leadMin = override?.lead_time_min_days ?? settings.default_offline_lead_min ?? 0;
      leadMax = override?.lead_time_max_days ?? settings.default_offline_lead_max ?? 1;
    }

    const totalLeadAndBuffer = leadMax + safetyBuffer;
    const daysUntilOrderBy = daysRemaining - totalLeadAndBuffer;
    const orderByDate = safeFormatDate(addDays(referenceDate, daysUntilOrderBy));
    const isViableToday = daysUntilOrderBy >= 0;

    return {
      channel: chan,
      channel_name: CHANNEL_METADATA[chan].name,
      lead_time_min: leadMin,
      lead_time_max: leadMax,
      safety_buffer_days: safetyBuffer,
      order_by_date: orderByDate,
      is_viable_today: isViableToday && available,
      days_until_deadline: daysUntilOrderBy,
      available,
    };
  });

  // 8. Urgency Status & Smart False-Alarm Shielding
  const availableDeadlines = deadlines
    .filter((d) => d.available)
    .sort((a, b) => b.lead_time_max - a.lead_time_max);

  const apolloDeadline = deadlines.find((d) => d.channel === "apollo");
  const mrMedDeadline = deadlines.find((d) => d.channel === "mr_med");
  const offlineDeadline = deadlines.find((d) => d.channel === "offline");

  let urgency: UrgencyStatus = "OK";
  let urgencyLabel = "OK — Stock Healthy";
  let urgencyColor: "emerald" | "amber" | "orange" | "rose" | "blue" = "emerald";
  let recommendedAction = "";
  let recommendedChannel: ChannelType | "none" = "apollo";
  let recommendedOrderBy = apolloDeadline?.order_by_date || stockOutDate;

  if (dailyConsumption === 0) {
    urgency = "OK";
    urgencyLabel = "No active dosage schedule";
    urgencyColor = "emerald";
    recommendedAction = "Configure dose schedule to begin automated tracking.";
    recommendedChannel = "none";
    recommendedOrderBy = "N/A";
  } else if (onHandStock <= 0) {
    // Stock is depleted right now
    urgency = "CRITICAL";
    urgencyLabel = hasInTransit ? "Critical — Stock Depleted" : "Critical — Stock Depleted";
    urgencyColor = "rose";
    recommendedChannel = offlineDeadline?.available ? "offline" : (mrMedDeadline?.available ? "mr_med" : "apollo");
    recommendedOrderBy = todayStr;
    if (hasInTransit && earliestEtaStr && earliestEtaStr === todayStr) {
      recommendedAction = `Stock is 0! Refill of ${inTransitUnits} ${medicine.unit_label} arriving today. Confirm receipt once delivered.`;
    } else if (hasInTransit && earliestEta) {
      recommendedAction = `CRITICAL: Stock is 0! Refill en route arrives ~${safeFormatDate(earliestEta, "dd MMM")}, but you need an emergency bridge supply from a local pharmacy today.`;
    } else {
      recommendedAction = offlineDeadline?.available
        ? "Stock is 0! Purchase immediately from local offline pharmacy."
        : "Stock is 0! Order immediately from fastest available vendor.";
    }
  } else if (hasInTransit && inTransitCovers) {
    // Refill is ordered and arrives strictly on or before stockout
    const firstOrder = inTransitOrders[0];
    urgency = "ORDER_SOON";
    urgencyLabel = `En Route (${inTransitUnits} ${medicine.unit_label})`;
    urgencyColor = "blue";
    recommendedChannel = firstOrder.channel;
    recommendedOrderBy = earliestEta || todayStr;
    recommendedAction = `Refill en route: +${inTransitUnits} ${medicine.unit_label} arriving ~${safeFormatDate(earliestEta, "dd MMM")} via ${CHANNEL_METADATA[firstOrder.channel]?.name || firstOrder.channel}.`;
  } else if (availableDeadlines.length === 0) {
    urgency = "CRITICAL";
    urgencyLabel = "No Active Channel";
    urgencyColor = "rose";
    recommendedAction = "Enable at least one purchase channel in settings.";
    recommendedChannel = "none";
  } else {
    const slowestAvailable = availableDeadlines[0];

    if (slowestAvailable.is_viable_today) {
      urgency = "OK";
      urgencyLabel = "OK — Reorder on schedule";
      urgencyColor = "emerald";
      recommendedChannel = slowestAvailable.channel;
      recommendedOrderBy = slowestAvailable.order_by_date;
      recommendedAction = `Order via ${slowestAvailable.channel_name} by ${safeFormatDate(
        slowestAvailable.order_by_date,
        "dd MMM yyyy"
      )} (${slowestAvailable.days_until_deadline}d buffer remaining).`;
    } else {
      const firstViableChannel = availableDeadlines.find((d) => d.is_viable_today);

      if (firstViableChannel) {
        if (firstViableChannel.channel === "mr_med") {
          urgency = "ORDER_SOON";
          urgencyLabel = "Order Soon — Standard Cutoff Passed";
          urgencyColor = "amber";
          recommendedChannel = "mr_med";
          recommendedOrderBy = firstViableChannel.order_by_date;
          recommendedAction = `Order via Mr. Med by ${safeFormatDate(
            firstViableChannel.order_by_date,
            "dd MMM yyyy"
          )}.`;
        } else if (firstViableChannel.channel === "offline") {
          urgency = "ORDER_NOW";
          urgencyLabel = "Order Now — Online Cutoff Passed";
          urgencyColor = "orange";
          recommendedChannel = "offline";
          recommendedOrderBy = firstViableChannel.order_by_date;
          recommendedAction = `Online delivery lead times too long. Purchase from Local Pharmacy by ${safeFormatDate(
            firstViableChannel.order_by_date,
            "dd MMM yyyy"
          )}.`;
        } else {
          urgency = "ORDER_SOON";
          urgencyLabel = `Order via ${firstViableChannel.channel_name}`;
          urgencyColor = "amber";
          recommendedChannel = firstViableChannel.channel;
          recommendedOrderBy = firstViableChannel.order_by_date;
          recommendedAction = `Order via ${firstViableChannel.channel_name} by ${safeFormatDate(
            firstViableChannel.order_by_date,
            "dd MMM yyyy"
          )}.`;
        }
      } else {
        if (hasInTransit) {
          urgency = "CRITICAL";
          urgencyLabel = "Critical — Stockout Gap";
          urgencyColor = "rose";
          recommendedChannel = offlineDeadline?.available ? "offline" : (mrMedDeadline?.available ? "mr_med" : "apollo");
          recommendedOrderBy = todayStr;
          recommendedAction = `CRITICAL: Stockout in ${daysRemaining} days (${safeFormatDate(stockOutDate, "dd MMM")}) before refill arrives (${safeFormatDate(earliestEta, "dd MMM")}). Buy bridge supply from local store.`;
        } else {
          urgency = "CRITICAL";
          urgencyLabel = "Critical — Stockout Risk";
          urgencyColor = "rose";
          recommendedChannel = offlineDeadline?.available ? "offline" : (mrMedDeadline?.available ? "mr_med" : "apollo");
          recommendedOrderBy = todayStr;
          recommendedAction = `CRITICAL: Stockout in ${daysRemaining} days (${safeFormatDate(stockOutDate, "dd MMM yyyy")}). Buy immediately from local store.`;
        }
      }
    }
  }

  // 9. Monthly Requirement Calculations
  const monthlyUnitsNeeded = Math.round(dailyConsumption * 30 * 10) / 10;
  const unitsPerPack = Math.max(1, Number(medicine.units_per_pack) || 1);
  const packsNeeded =
    dailyConsumption > 0 ? Math.ceil(monthlyUnitsNeeded / unitsPerPack) : 0;
  const totalUnitsPurchased = packsNeeded * unitsPerPack;
  const bufferUnits = totalUnitsPurchased - monthlyUnitsNeeded;

  const apolloAvail = Boolean(deadlines.find((d) => d.channel === "apollo")?.available);
  const mrMedAvail = Boolean(deadlines.find((d) => d.channel === "mr_med")?.available);
  const offlineAvail = Boolean(deadlines.find((d) => d.channel === "offline")?.available);

  let defaultProcurementChan: ChannelType = "apollo";
  if (apolloAvail) {
    defaultProcurementChan = "apollo";
  } else if (mrMedAvail) {
    defaultProcurementChan = "mr_med";
  } else if (offlineAvail) {
    defaultProcurementChan = "offline";
  }

  const monthlyPlanning: MonthlyRequirement = {
    daily_consumption: Math.round(dailyConsumption * 100) / 100,
    monthly_units: monthlyUnitsNeeded,
    units_per_pack: unitsPerPack,
    packs_needed: packsNeeded,
    total_units_purchased: totalUnitsPurchased,
    buffer_units: Math.round(bufferUnits * 10) / 10,
    recommended_channel: defaultProcurementChan,
    estimated_cost: null,
  };

  return {
    medicine,
    schedules,
    channel_configs: channelConfigs,
    restocks,
    adjustments,
    daily_consumption: Math.round(dailyConsumption * 100) / 100,
    frequency_label: frequencyLabel,
    on_hand_stock: onHandStock,
    days_remaining: daysRemaining,
    stock_out_date: stockOutDate,
    in_transit: inTransitSummary,
    effective_stock: effectiveStock,
    effective_days_remaining: effectiveDaysRemaining,
    effective_stock_out_date: effectiveStockOutDate,
    deadlines,
    urgency,
    urgency_label: urgencyLabel,
    urgency_color: urgencyColor,
    recommended_action: recommendedAction,
    recommended_channel: recommendedChannel,
    recommended_order_by: recommendedOrderBy,
    monthly_planning: monthlyPlanning,
  };
}

/**
 * Builds a 30/60-day daily projected stock curve for visualization.
 */
export function generateStockTrajectory(
  state: CalculatedMedicineState,
  daysCount: number = 30
): Array<{
  dayIndex: number;
  date: string;
  projectedStock: number;
  safetyThreshold: number;
}> {
  const { on_hand_stock, daily_consumption, deadlines, schedules, medicine } = state;
  const today = new Date();
  const baselineDate = safeParseDate(medicine.baseline_date);
  const points = [];

  const maxLead = Math.max(
    ...deadlines.filter((d) => d.available).map((d) => d.lead_time_max + d.safety_buffer_days),
    5
  );
  const safetyStockThreshold = Math.round(maxLead * daily_consumption);

  let simStock = on_hand_stock;
  for (let i = 0; i <= daysCount; i++) {
    const d = addDays(today, i);
    const dateStr = safeFormatDate(d, "MMM dd");
    if (i > 0) {
      const doseToday = getDoseQuantityForDate(schedules, d, baselineDate);
      simStock = Math.max(0, simStock - doseToday);
    }
    points.push({
      dayIndex: i,
      date: dateStr,
      projectedStock: Math.round(simStock * 10) / 10,
      safetyThreshold: safetyStockThreshold,
    });
  }

  return points;
}
