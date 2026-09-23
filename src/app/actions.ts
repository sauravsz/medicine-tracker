"use server";

import { revalidatePath } from "next/cache";
import {
  getAllCalculatedStates,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  logRestock,
  markRestockReceived,
  deleteRestock,
  logStockAdjustment,
  getSettings,
  updateSettings,
  seedSampleData,
} from "@/lib/db";
import { ChannelType, MedicineForm, StockAdjustment } from "@/lib/types";
import { sendTelegramTestPing } from "@/lib/telegram";
export async function getDashboardData() {
  let { settings, states } = await getAllCalculatedStates();

  if (states.length === 0 && !settings.has_seeded) {
    await seedSampleData();
    const res = await getAllCalculatedStates();
    settings = res.settings;
    states = res.states;
  }

  const total = states.length;
  const ok = states.filter((s) => s.urgency === "OK").length;
  const soon = states.filter((s) => s.urgency === "ORDER_SOON").length;
  const now = states.filter((s) => s.urgency === "ORDER_NOW").length;
  const crit = states.filter((s) => s.urgency === "CRITICAL").length;
  const inTransitCount = states.reduce((sum, s) => sum + s.in_transit.orders.length, 0);

  return {
    settings,
    summary: {
      total_medicines: total,
      ok_count: ok,
      order_soon_count: soon,
      order_now_count: now,
      critical_count: crit,
      in_transit_orders_count: inTransitCount,
    },
    medicines: states,
  };
}

export async function getMedicineDetailsAction(id: string) {
  const full = await getMedicineById(id);
  if (!full) return null;
  const { settings, states } = await getAllCalculatedStates();
  const state = states.find((s) => s.medicine.id === id);
  return {
    full,
    state,
    settings,
  };
}

export async function createMedicineAction(payload: {
  name: string;
  strength?: string | null;
  form: MedicineForm;
  unit_label: string;
  units_per_pack: number;
  baseline_stock: number;
  baseline_date?: string;
  safety_buffer_days?: number | null;
  notes?: string | null;
  schedules: Array<{
    time_of_day: string;
    quantity: number;
    interval_days: number;
    instructions?: string | null;
  }>;
  channel_configs: Array<{
    channel: ChannelType;
    lead_time_min_days: number;
    lead_time_max_days: number;
    available: boolean;
  }>;
}) {
  const id = await createMedicine(payload);
  revalidatePath("/");
  revalidatePath("/planning");
  revalidatePath(`/medicines/${id}`);
  return { success: true, id };
}

export async function updateMedicineAction(
  id: string,
  payload: {
    name?: string;
    strength?: string | null;
    form?: MedicineForm;
    unit_label?: string;
    units_per_pack?: number;
    baseline_stock?: number;
    baseline_date?: string;
    safety_buffer_days?: number | null;
    notes?: string | null;
    schedules?: Array<{
      time_of_day: string;
      quantity: number;
      interval_days: number;
      instructions?: string | null;
    }>;
    channel_configs?: Array<{
      channel: ChannelType;
      lead_time_min_days: number;
      lead_time_max_days: number;
      available: boolean;
    }>;
  }
) {
  await updateMedicine(id, payload);
  revalidatePath("/");
  revalidatePath("/planning");
  revalidatePath(`/medicines/${id}`);
  return { success: true };
}

export async function deleteMedicineAction(id: string) {
  await deleteMedicine(id);
  revalidatePath("/");
  revalidatePath("/planning");
  return { success: true };
}

export async function logRestockAction(payload: {
  medicine_id: string;
  channel: ChannelType;
  pack_count?: number | null;
  units_per_pack?: number | null;
  quantity_added: number;
  ordered_date: string;
  expected_arrival_date?: string | null;
  received_date?: string | null;
  cost?: number | null;
  notes?: string | null;
}) {
  const id = await logRestock(payload);
  revalidatePath("/");
  revalidatePath("/planning");
  revalidatePath(`/medicines/${payload.medicine_id}`);
  return { success: true, id };
}

export async function markRestockReceivedAction(
  restockId: string,
  medicineId: string,
  receivedDate?: string
) {
  await markRestockReceived(restockId, receivedDate);
  revalidatePath("/");
  revalidatePath(`/medicines/${medicineId}`);
  return { success: true };
}

export async function deleteRestockAction(restockId: string, medicineId: string) {
  await deleteRestock(restockId);
  revalidatePath("/");
  revalidatePath(`/medicines/${medicineId}`);
  return { success: true };
}

export async function logStockAdjustmentAction(payload: {
  medicine_id: string;
  delta: number;
  reason: StockAdjustment["reason"];
  notes?: string | null;
  date?: string;
  reset_baseline?: boolean;
  new_baseline_stock?: number;
}) {
  const id = await logStockAdjustment(payload);
  revalidatePath("/");
  revalidatePath(`/medicines/${payload.medicine_id}`);
  return { success: true, id };
}

export async function updateSettingsAction(payload: {
  default_apollo_lead_min?: number;
  default_apollo_lead_max?: number;
  default_mr_med_lead_min?: number;
  default_mr_med_lead_max?: number;
  default_offline_lead_min?: number;
  default_offline_lead_max?: number;
  default_safety_buffer_days?: number;
  app_passcode?: string | null;
  reminder_email?: string | null;
  reminder_time?: string;
  reminders_enabled?: boolean;
  ai_provider?: "groq" | "ollama" | null;
  groq_api_key?: string | null;
  groq_model?: string | null;
  ollama_api_key?: string | null;
  ollama_base_url?: string | null;
  ollama_model?: string | null;
  telegram_bot_token?: string | null;
  telegram_chat_id?: string | null;
  telegram_enabled?: boolean;
}) {
  const updated = await updateSettings(payload);
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/planning");
  return { success: true, settings: updated };
}

export async function sendTestTelegramAction(botToken: string, chatId: string) {
  return await sendTelegramTestPing(botToken, chatId);
}
export async function seedSampleDataAction() {
  await seedSampleData();
  revalidatePath("/");
  revalidatePath("/planning");
  return { success: true };
}
