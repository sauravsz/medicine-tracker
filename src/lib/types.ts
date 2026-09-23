export type ChannelType = "apollo" | "mr_med" | "offline" | "other";

export type MedicineForm =
  | "tablet"
  | "capsule"
  | "syrup"
  | "drops"
  | "sachet"
  | "injection"
  | "cream"
  | "inhaler"
  | "other";

export type TimeOfDay =
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "as_needed"
  | "with_breakfast"
  | "before_breakfast"
  | "after_dinner";

export type UrgencyStatus = "OK" | "ORDER_SOON" | "ORDER_NOW" | "CRITICAL";

export interface Medicine {
  id: string;
  name: string;
  strength?: string | null; // e.g. "500mg", "50mcg", "10mg/5ml"
  form: MedicineForm;
  unit_label: string; // "tablets", "capsules", "ml", "sachets"
  units_per_pack: number; // e.g. 10 or 15 or 30 or 1
  baseline_stock: number; // physical stock recorded at baseline_date
  baseline_date: string; // "YYYY-MM-DD"
  safety_buffer_days?: number | null; // override settings if provided
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoseSchedule {
  id: string;
  medicine_id: string;
  time_of_day: string; // e.g. "morning", "night", "08:00"
  quantity: number; // e.g. 1, 0.5, 2
  interval_days: number; // 1 = daily, 2 = alternate, 7 = weekly
  instructions?: string | null; // e.g. "Take with warm water before meals"
}

export interface ChannelConfig {
  id: string;
  medicine_id: string;
  channel: ChannelType;
  lead_time_min_days: number;
  lead_time_max_days: number;
  available: boolean;
}

export interface RestockEvent {
  id: string;
  medicine_id: string;
  channel: ChannelType;
  pack_count?: number | null; // e.g. 3 strips
  units_per_pack?: number | null; // e.g. 15 tablets/strip
  quantity_added: number; // total units added (e.g. 45)
  ordered_date: string; // "YYYY-MM-DD"
  expected_arrival_date?: string | null;
  received_date?: string | null; // null = in transit, string = received
  cost?: number | null; // in INR
  notes?: string | null;
  created_at: string;
}

export interface StockAdjustment {
  id: string;
  medicine_id: string;
  delta: number; // +/- units
  reason:
    | "audit_recount"
    | "missed_dose"
    | "extra_dose"
    | "damaged_spilled"
    | "lost"
    | "prescription_change"
    | "other";
  notes?: string | null;
  date: string; // "YYYY-MM-DD"
  created_at: string;
}

export interface AppSettings {
  id: number;
  default_apollo_lead_min: number; // 7
  default_apollo_lead_max: number; // 10
  default_mr_med_lead_min: number; // 3
  default_mr_med_lead_max: number; // 5
  default_offline_lead_min: number; // 0
  default_offline_lead_max: number; // 1
  default_safety_buffer_days: number; // 2
  app_passcode?: string | null;
  reminder_email?: string | null;
  reminder_time: string; // "08:00"
  reminders_enabled: boolean;
  ai_provider?: "groq" | "ollama" | null;
  groq_api_key?: string | null;
  groq_model?: string | null; // e.g. "llama-3.3-70b-versatile"
  ollama_api_key?: string | null;
  ollama_base_url?: string | null; // e.g. "https://ollama.com"
  ollama_model?: string | null; // e.g. "llama3.3"
  telegram_bot_token?: string | null;
  telegram_chat_id?: string | null;
  telegram_enabled?: boolean;
  has_seeded?: boolean;
}

export interface ChannelDeadline {
  channel: ChannelType;
  channel_name: string;
  lead_time_min: number;
  lead_time_max: number;
  safety_buffer_days: number;
  order_by_date: string; // "YYYY-MM-DD"
  is_viable_today: boolean;
  days_until_deadline: number; // negative means deadline passed
  available: boolean;
}

export interface InTransitSummary {
  total_units: number;
  orders: RestockEvent[];
  earliest_eta: string | null;
  latest_eta: string | null;
  covers_stockout: boolean;
}

export interface MonthlyRequirement {
  daily_consumption: number;
  monthly_units: number; // daily_consumption * 30
  units_per_pack: number;
  packs_needed: number; // ceil(monthly_units / units_per_pack)
  total_units_purchased: number; // packs_needed * units_per_pack
  buffer_units: number; // total_units_purchased - monthly_units
  recommended_channel: ChannelType;
  estimated_cost?: number | null;
}

export interface CalculatedMedicineState {
  medicine: Medicine;
  schedules: DoseSchedule[];
  channel_configs: ChannelConfig[];
  restocks: RestockEvent[];
  adjustments: StockAdjustment[];
  
  // Computed metrics
  daily_consumption: number;
  frequency_label: string;
  on_hand_stock: number;
  days_remaining: number;
  stock_out_date: string;
  
  // Transit details
  in_transit: InTransitSummary;
  effective_stock: number; // on_hand + in_transit
  effective_days_remaining: number;
  effective_stock_out_date: string;

  // Channel Deadlines & Urgency
  deadlines: ChannelDeadline[];
  urgency: UrgencyStatus;
  urgency_label: string;
  urgency_color: "emerald" | "amber" | "orange" | "rose" | "blue";
  recommended_action: string;
  recommended_channel: ChannelType | "none";
  recommended_order_by: string;

  // Monthly planning
  monthly_planning: MonthlyRequirement;
}

export interface DashboardStats {
  total_medicines: number;
  ok_count: number;
  order_soon_count: number;
  order_now_count: number;
  critical_count: number;
  in_transit_orders_count: number;
}

export interface DashboardSummary {
  summary: DashboardStats;
  medicines: CalculatedMedicineState[];
}

export interface AICommandPayload {
  intent: "LOG_RESTOCK" | "AUDIT_COUNT" | "UPDATE_SCHEDULE" | "ADD_MEDICINE" | "UNKNOWN";
  medicine_id?: string | null;
  matched_name: string;
  confidence: number;
  summary_explanation: string;
  restock?: {
    channel: ChannelType;
    pack_count?: number | null;
    units_per_pack: number;
    total_units_added: number;
    cost?: number | null;
    is_delivered: boolean;
    ordered_date: string;
    notes?: string | null;
  };
  audit?: {
    exact_units_on_hand: number;
    reason: StockAdjustment["reason"];
    notes?: string | null;
  };
  schedule_update?: {
    schedules: Array<{
      time_of_day: string;
      quantity: number;
      interval_days: number;
      instructions?: string | null;
    }>;
  };
  new_medicine?: {
    name: string;
    strength?: string | null;
    form: MedicineForm;
    unit_label: string;
    units_per_pack: number;
    baseline_stock: number;
    channel: ChannelType;
    schedules: Array<{
      time_of_day: string;
      quantity: number;
      interval_days: number;
      instructions?: string | null;
    }>;
  };
}
