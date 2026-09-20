import {
  differenceInCalendarDays,
  addDays,
  format,
  parseISO,
  isBefore,
  isSameDay,
} from "date-fns";
import {
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
  groq_model: "llama-3.3-70b-versatile",
  ollama_api_key: null,
  ollama_base_url: "https://ollama.com",
  ollama_model: "llama3.3",
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

export function safeParseDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === "string") {
    try {
      const clean = val.split("T")[0].split(" ")[0];
      const parsed = parseISO(clean);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch {}
    try {
      const fallback = new Date(val);
      if (!isNaN(fallback.getTime())) return fallback;
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
 * Calculates the current real-time stock state using the time-anchored depletion formula.
 */
export function computeMedicineState(
  medicine: Medicine,
  schedules: DoseSchedule[],
  channelConfigs: ChannelConfig[],
  restocks: RestockEvent[],
  adjustments: StockAdjustment[],
  settings: AppSettings = DEFAULT_SETTINGS,
  referenceDate: Date = new Date()
): CalculatedMedicineState {
  const todayStr = safeFormatDate(referenceDate, "yyyy-MM-dd");
  const baselineDate = safeParseDate(medicine.baseline_date || todayStr);

  const dailyConsumption = calculateDailyConsumption(schedules);
  const safetyBuffer =
    typeof medicine.safety_buffer_days === "number" && medicine.safety_buffer_days !== null
      ? medicine.safety_buffer_days
      : settings.default_safety_buffer_days ?? 2;

  // 1. Time elapsed since baseline anchor
  const daysElapsed = Math.max(0, differenceInCalendarDays(referenceDate, baselineDate));
  const consumedSinceBaseline = dailyConsumption * daysElapsed;

  // 2. Sum received restocks recorded on or after the baseline date
  const receivedRestocksSinceBaseline = restocks
    .filter((r) => r.received_date && !isBefore(safeParseDate(r.received_date), baselineDate))
    .reduce((sum, r) => sum + (Number(r.quantity_added) || 0), 0);

  // 3. Sum manual adjustments recorded on or after baseline date
  const adjustmentsSinceBaseline = adjustments
    .filter((a) => !isBefore(safeParseDate(a.date), baselineDate))
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
      .map((o) => safeFormatDate(o.expected_arrival_date || o.ordered_date))
      .sort();
    earliestEta = etas[0] || null;
    latestEta = etas[etas.length - 1] || null;
  }

  // 6. Days remaining & stockout dates
  const daysRemaining =
    dailyConsumption > 0 ? Math.floor(onHandStock / dailyConsumption) : 999;
  const stockOutDate = safeFormatDate(addDays(referenceDate, daysRemaining));

  const effectiveStock = onHandStock + inTransitUnits;
  const effectiveDaysRemaining =
    dailyConsumption > 0 ? Math.floor(effectiveStock / dailyConsumption) : 999;
  const effectiveStockOutDate = safeFormatDate(addDays(referenceDate, effectiveDaysRemaining));

  // Check if in-transit order arrives before physical stock-out
  const inTransitCovers = Boolean(
    inTransitOrders.length > 0 &&
      earliestEta &&
      (isBefore(safeParseDate(earliestEta), safeParseDate(stockOutDate)) ||
        isSameDay(safeParseDate(earliestEta), safeParseDate(stockOutDate)))
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
    const available = override ? override.available : true;

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

    // Formula: order_by_date = stock_out_date - lead_time_max - safety_buffer
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

  // 8. Urgency Status & Action Resolver
  const availableDeadlines = deadlines
    .filter((d) => d.available)
    .sort((a, b) => b.lead_time_max - a.lead_time_max);

  const apolloDeadline = deadlines.find((d) => d.channel === "apollo");
  const mrMedDeadline = deadlines.find((d) => d.channel === "mr_med");

  let urgency: UrgencyStatus = "OK";
  let urgencyLabel = "OK — Stock Healthy";
  let urgencyColor: "emerald" | "amber" | "orange" | "rose" = "emerald";
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
    if (inTransitCovers) {
      urgency = "ORDER_NOW";
      urgencyLabel = "Stock Empty — Order in Transit";
      urgencyColor = "orange";
      recommendedAction = `Current stock 0, but ${inTransitUnits} ${medicine.unit_label} arriving ~${earliestEta}.`;
      recommendedChannel = "offline";
    } else {
      urgency = "CRITICAL";
      urgencyLabel = "Critical — Stock Depleted";
      urgencyColor = "rose";
      recommendedAction = "Stock is 0! Purchase immediately from local offline pharmacy.";
      recommendedChannel = "offline";
    }
  } else if (availableDeadlines.length === 0) {
    urgency = "CRITICAL";
    urgencyLabel = "No Active Purchase Channel";
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
          urgencyLabel = "Order Soon — Apollo Cutoff Passed";
          urgencyColor = "amber";
          recommendedChannel = "mr_med";
          recommendedOrderBy = firstViableChannel.order_by_date;
          recommendedAction = `Apollo window passed. Order via Mr. Med by ${safeFormatDate(
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
        if (inTransitCovers) {
          urgency = "ORDER_SOON";
          urgencyLabel = "Refill in Transit";
          urgencyColor = "amber";
          recommendedAction = `Reorder window passed, but ${inTransitUnits} ${medicine.unit_label} arriving by ${earliestEta}.`;
          recommendedChannel = "offline";
        } else {
          urgency = "CRITICAL";
          urgencyLabel = "Critical — Stockout Risk";
          urgencyColor = "rose";
          recommendedChannel = "offline";
          recommendedOrderBy = todayStr;
          recommendedAction = `CRITICAL: Stockout in ${daysRemaining} days (${stockOutDate}). Buy immediately from local store.`;
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
  const { on_hand_stock, daily_consumption, deadlines } = state;
  const today = new Date();
  const points = [];

  const maxLead = Math.max(
    ...deadlines.filter((d) => d.available).map((d) => d.lead_time_max + d.safety_buffer_days),
    5
  );
  const safetyStockThreshold = Math.round(maxLead * daily_consumption);

  for (let i = 0; i <= daysCount; i++) {
    const d = addDays(today, i);
    const dateStr = safeFormatDate(d, "MMM dd");
    const stockAtDay = Math.max(0, Math.round((on_hand_stock - daily_consumption * i) * 10) / 10);
    points.push({
      dayIndex: i,
      date: dateStr,
      projectedStock: stockAtDay,
      safetyThreshold: safetyStockThreshold,
    });
  }

  return points;
}
