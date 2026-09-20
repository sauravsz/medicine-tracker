import { createClient, Client } from "@libsql/client";
import postgres from "postgres";
import { format } from "date-fns";
import {
  Medicine,
  DoseSchedule,
  ChannelConfig,
  RestockEvent,
  StockAdjustment,
  AppSettings,
  CalculatedMedicineState,
} from "../types";
import {
  computeMedicineState,
  DEFAULT_SETTINGS,
  safeParseDate,
  safeFormatDate,
} from "../calculations";
import path from "path";
import fs from "fs";

let sqliteClient: Client | null = null;
let pgClient: postgres.Sql | null = null;
let isPostgres = false;
let initialized = false;

function toIsoDateString(val: unknown): string {
  if (!val) return format(new Date(), "yyyy-MM-dd");
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return format(new Date(), "yyyy-MM-dd");
    return format(val, "yyyy-MM-dd");
  }
  const s = String(val).trim();
  if (s.includes("T")) return s.split("T")[0];
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
  } catch {}
  return s;
}

function getClients() {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
    isPostgres = true;
    if (!pgClient) {
      pgClient = postgres(dbUrl, {
        ssl: "require",
        max: 10,
        idle_timeout: 20,
      });
    }
    return { isPg: true, pg: pgClient, sqlite: null };
  }

  isPostgres = false;
  if (!sqliteClient) {
    if (dbUrl && (dbUrl.startsWith("libsql://") || dbUrl.startsWith("https://") || dbUrl.startsWith("http://"))) {
      sqliteClient = createClient({
        url: dbUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      });
    } else {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.join(dataDir, "medtracker.db");
      sqliteClient = createClient({
        url: `file:${dbPath}`,
      });
    }
  }

  return { isPg: false, pg: null, sqlite: sqliteClient };
}

async function queryRows(sqlText: string, params: (string | number | null)[] = []): Promise<Record<string, unknown>[]> {
  const { isPg, pg, sqlite } = getClients();

  if (isPg && pg) {
    let pIdx = 1;
    const pgSql = sqlText.replace(/\?/g, () => `$${pIdx++}`);
    const rows = await pg.unsafe(pgSql, params);
    return rows as unknown as Record<string, unknown>[];
  }

  if (sqlite) {
    const res = await sqlite.execute({
      sql: sqlText,
      args: params,
    });
    return res.rows as unknown as Record<string, unknown>[];
  }

  return [];
}

async function executeCommand(sqlText: string, params: (string | number | null)[] = []): Promise<void> {
  const { isPg, pg, sqlite } = getClients();

  if (isPg && pg) {
    let pIdx = 1;
    const pgSql = sqlText.replace(/\?/g, () => `$${pIdx++}`);
    await pg.unsafe(pgSql, params);
    return;
  }

  if (sqlite) {
    await sqlite.execute({
      sql: sqlText,
      args: params,
    });
  }
}

export async function initDb() {
  if (initialized) return;
  const { isPg, pg, sqlite } = getClients();

  if (isPg && pg) {
    // For Supabase Postgres, ensure tables exist
    await pg.unsafe(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        default_apollo_lead_min INTEGER NOT NULL DEFAULT 7,
        default_apollo_lead_max INTEGER NOT NULL DEFAULT 10,
        default_mr_med_lead_min INTEGER NOT NULL DEFAULT 3,
        default_mr_med_lead_max INTEGER NOT NULL DEFAULT 5,
        default_offline_lead_min INTEGER NOT NULL DEFAULT 0,
        default_offline_lead_max INTEGER NOT NULL DEFAULT 1,
        default_safety_buffer_days INTEGER NOT NULL DEFAULT 2,
        app_passcode TEXT,
        reminder_email TEXT,
        reminder_time TEXT NOT NULL DEFAULT '08:00',
        reminders_enabled BOOLEAN NOT NULL DEFAULT true
      );

      INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS medicines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        strength TEXT,
        form TEXT NOT NULL DEFAULT 'tablet',
        unit_label TEXT NOT NULL DEFAULT 'tablets',
        units_per_pack INTEGER NOT NULL DEFAULT 1,
        baseline_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
        baseline_date DATE NOT NULL,
        safety_buffer_days INTEGER,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS dose_schedules (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
        time_of_day TEXT NOT NULL,
        quantity NUMERIC(6, 2) NOT NULL DEFAULT 1,
        interval_days INTEGER NOT NULL DEFAULT 1,
        instructions TEXT
      );

      CREATE TABLE IF NOT EXISTS channel_configs (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
        channel TEXT NOT NULL,
        lead_time_min_days INTEGER NOT NULL,
        lead_time_max_days INTEGER NOT NULL,
        available BOOLEAN NOT NULL DEFAULT true,
        UNIQUE(medicine_id, channel)
      );

      CREATE TABLE IF NOT EXISTS restock_events (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
        channel TEXT NOT NULL,
        pack_count INTEGER,
        units_per_pack INTEGER,
        quantity_added INTEGER NOT NULL,
        ordered_date DATE NOT NULL,
        expected_arrival_date DATE,
        received_date DATE,
        cost NUMERIC(10, 2),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
        delta NUMERIC(6, 2) NOT NULL,
        reason TEXT NOT NULL,
        notes TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
  } else if (sqlite) {
    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        default_apollo_lead_min INTEGER NOT NULL DEFAULT 7,
        default_apollo_lead_max INTEGER NOT NULL DEFAULT 10,
        default_mr_med_lead_min INTEGER NOT NULL DEFAULT 3,
        default_mr_med_lead_max INTEGER NOT NULL DEFAULT 5,
        default_offline_lead_min INTEGER NOT NULL DEFAULT 0,
        default_offline_lead_max INTEGER NOT NULL DEFAULT 1,
        default_safety_buffer_days INTEGER NOT NULL DEFAULT 2,
        app_passcode TEXT,
        reminder_email TEXT,
        reminder_time TEXT NOT NULL DEFAULT '08:00',
        reminders_enabled INTEGER NOT NULL DEFAULT 1
      );
    `);

    await sqlite.execute(`
      INSERT OR IGNORE INTO settings (
        id, default_apollo_lead_min, default_apollo_lead_max,
        default_mr_med_lead_min, default_mr_med_lead_max,
        default_offline_lead_min, default_offline_lead_max,
        default_safety_buffer_days, reminder_time, reminders_enabled
      ) VALUES (1, 7, 10, 3, 5, 0, 1, 2, '08:00', 1);
    `);

    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS medicines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        strength TEXT,
        form TEXT NOT NULL DEFAULT 'tablet',
        unit_label TEXT NOT NULL DEFAULT 'tablets',
        units_per_pack INTEGER NOT NULL DEFAULT 1,
        baseline_stock REAL NOT NULL DEFAULT 0,
        baseline_date TEXT NOT NULL,
        safety_buffer_days INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS dose_schedules (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL,
        time_of_day TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 1,
        interval_days INTEGER NOT NULL DEFAULT 1,
        instructions TEXT,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
      );
    `);

    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS channel_configs (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        lead_time_min_days INTEGER NOT NULL,
        lead_time_max_days INTEGER NOT NULL,
        available INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
      );
    `);

    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS restock_events (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        pack_count INTEGER,
        units_per_pack INTEGER,
        quantity_added INTEGER NOT NULL,
        ordered_date TEXT NOT NULL,
        expected_arrival_date TEXT,
        received_date TEXT,
        cost REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
      );
    `);

    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL,
        delta REAL NOT NULL,
        reason TEXT NOT NULL,
        notes TEXT,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
      );
    `);
  }

  initialized = true;
}

// ----------------------------------------------------------------------------
// Settings Operations
// ----------------------------------------------------------------------------

export async function getSettings(): Promise<AppSettings> {
  await initDb();
  const rows = await queryRows("SELECT * FROM settings WHERE id = 1;");
  if (rows.length === 0) return DEFAULT_SETTINGS;
  const row = rows[0];
  return {
    id: Number(row.id || 1),
    default_apollo_lead_min: Number(row.default_apollo_lead_min ?? 7),
    default_apollo_lead_max: Number(row.default_apollo_lead_max ?? 10),
    default_mr_med_lead_min: Number(row.default_mr_med_lead_min ?? 3),
    default_mr_med_lead_max: Number(row.default_mr_med_lead_max ?? 5),
    default_offline_lead_min: Number(row.default_offline_lead_min ?? 0),
    default_offline_lead_max: Number(row.default_offline_lead_max ?? 1),
    default_safety_buffer_days: Number(row.default_safety_buffer_days ?? 2),
    app_passcode: row.app_passcode ? String(row.app_passcode) : null,
    reminder_email: row.reminder_email ? String(row.reminder_email) : null,
    reminder_time: String(row.reminder_time || "08:00"),
    reminders_enabled: Boolean(row.reminders_enabled),
  };
}

export async function updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  await initDb();
  const current = await getSettings();
  const merged: AppSettings = { ...current, ...data };

  await executeCommand(
    `
      UPDATE settings SET
        default_apollo_lead_min = ?,
        default_apollo_lead_max = ?,
        default_mr_med_lead_min = ?,
        default_mr_med_lead_max = ?,
        default_offline_lead_min = ?,
        default_offline_lead_max = ?,
        default_safety_buffer_days = ?,
        app_passcode = ?,
        reminder_email = ?,
        reminder_time = ?,
        reminders_enabled = ?
      WHERE id = 1;
    `,
    [
      merged.default_apollo_lead_min,
      merged.default_apollo_lead_max,
      merged.default_mr_med_lead_min,
      merged.default_mr_med_lead_max,
      merged.default_offline_lead_min,
      merged.default_offline_lead_max,
      merged.default_safety_buffer_days,
      merged.app_passcode || null,
      merged.reminder_email || null,
      merged.reminder_time,
      merged.reminders_enabled ? 1 : 0,
    ]
  );

  return merged;
}

// ----------------------------------------------------------------------------
// Medicine Operations
// ----------------------------------------------------------------------------

export async function getMedicines(): Promise<Medicine[]> {
  await initDb();
  const rows = await queryRows("SELECT * FROM medicines ORDER BY name ASC;");
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    strength: row.strength ? String(row.strength) : null,
    form: (row.form as Medicine["form"]) || "tablet",
    unit_label: String(row.unit_label || "tablets"),
    units_per_pack: Number(row.units_per_pack || 1),
    baseline_stock: Number(row.baseline_stock || 0),
    baseline_date: toIsoDateString(row.baseline_date),
    safety_buffer_days:
      row.safety_buffer_days !== null && row.safety_buffer_days !== undefined
        ? Number(row.safety_buffer_days)
        : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }));
}

export async function getMedicineById(id: string): Promise<{
  medicine: Medicine;
  schedules: DoseSchedule[];
  channel_configs: ChannelConfig[];
  restocks: RestockEvent[];
  adjustments: StockAdjustment[];
} | null> {
  await initDb();

  const medRows = await queryRows("SELECT * FROM medicines WHERE id = ?;", [id]);
  if (medRows.length === 0) return null;
  const row = medRows[0];
  const medicine: Medicine = {
    id: String(row.id),
    name: String(row.name),
    strength: row.strength ? String(row.strength) : null,
    form: (row.form as Medicine["form"]) || "tablet",
    unit_label: String(row.unit_label || "tablets"),
    units_per_pack: Number(row.units_per_pack || 1),
    baseline_stock: Number(row.baseline_stock || 0),
    baseline_date: toIsoDateString(row.baseline_date),
    safety_buffer_days:
      row.safety_buffer_days !== null && row.safety_buffer_days !== undefined
        ? Number(row.safety_buffer_days)
        : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };

  const [schedRows, chanRows, restockRows, adjRows] = await Promise.all([
    queryRows("SELECT * FROM dose_schedules WHERE medicine_id = ? ORDER BY time_of_day ASC;", [id]),
    queryRows("SELECT * FROM channel_configs WHERE medicine_id = ?;", [id]),
    queryRows("SELECT * FROM restock_events WHERE medicine_id = ? ORDER BY ordered_date DESC;", [id]),
    queryRows("SELECT * FROM stock_adjustments WHERE medicine_id = ? ORDER BY date DESC, created_at DESC;", [id]),
  ]);

  const schedules: DoseSchedule[] = schedRows.map((s) => ({
    id: String(s.id),
    medicine_id: String(s.medicine_id),
    time_of_day: String(s.time_of_day),
    quantity: Number(s.quantity),
    interval_days: Number(s.interval_days || 1),
    instructions: s.instructions ? String(s.instructions) : null,
  }));

  const channel_configs: ChannelConfig[] = chanRows.map((c) => ({
    id: String(c.id),
    medicine_id: String(c.medicine_id),
    channel: c.channel as ChannelConfig["channel"],
    lead_time_min_days: Number(c.lead_time_min_days),
    lead_time_max_days: Number(c.lead_time_max_days),
    available: Boolean(c.available),
  }));

  const restocks: RestockEvent[] = restockRows.map((r) => ({
    id: String(r.id),
    medicine_id: String(r.medicine_id),
    channel: r.channel as RestockEvent["channel"],
    pack_count: r.pack_count !== null ? Number(r.pack_count) : null,
    units_per_pack: r.units_per_pack !== null ? Number(r.units_per_pack) : null,
    quantity_added: Number(r.quantity_added),
    ordered_date: toIsoDateString(r.ordered_date),
    expected_arrival_date: r.expected_arrival_date ? toIsoDateString(r.expected_arrival_date) : null,
    received_date: r.received_date ? toIsoDateString(r.received_date) : null,
    cost: r.cost !== null ? Number(r.cost) : null,
    notes: r.notes ? String(r.notes) : null,
    created_at: String(r.created_at),
  }));

  const adjustments: StockAdjustment[] = adjRows.map((a) => ({
    id: String(a.id),
    medicine_id: String(a.medicine_id),
    delta: Number(a.delta),
    reason: a.reason as StockAdjustment["reason"],
    notes: a.notes ? String(a.notes) : null,
    date: toIsoDateString(a.date),
    created_at: String(a.created_at),
  }));

  return { medicine, schedules, channel_configs, restocks, adjustments };
}

export async function createMedicine(params: {
  name: string;
  strength?: string | null;
  form?: Medicine["form"];
  unit_label?: string;
  units_per_pack?: number;
  baseline_stock: number;
  baseline_date?: string;
  safety_buffer_days?: number | null;
  notes?: string | null;
  schedules?: Array<{
    time_of_day: string;
    quantity: number;
    interval_days?: number;
    instructions?: string | null;
  }>;
  channel_configs?: Array<{
    channel: ChannelConfig["channel"];
    lead_time_min_days: number;
    lead_time_max_days: number;
    available: boolean;
  }>;
}): Promise<string> {
  await initDb();
  const id = `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const baselineDate = params.baseline_date || todayStr;

  await executeCommand(
    `
      INSERT INTO medicines (
        id, name, strength, form, unit_label, units_per_pack,
        baseline_stock, baseline_date, safety_buffer_days, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      params.name.trim(),
      params.strength?.trim() || null,
      params.form || "tablet",
      params.unit_label?.trim() || "tablets",
      Number(params.units_per_pack) || 1,
      Number(params.baseline_stock) || 0,
      baselineDate,
      params.safety_buffer_days !== undefined ? (params.safety_buffer_days ?? null) : null,
      params.notes?.trim() || null,
      now,
      now,
    ]
  );

  // Insert dose schedules
  if (params.schedules && params.schedules.length > 0) {
    for (const s of params.schedules) {
      const schedId = `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await executeCommand(
        `
          INSERT INTO dose_schedules (
            id, medicine_id, time_of_day, quantity, interval_days, instructions
          ) VALUES (?, ?, ?, ?, ?, ?);
        `,
        [
          schedId,
          id,
          s.time_of_day,
          Number(s.quantity) || 1,
          Number(s.interval_days) || 1,
          s.instructions || null,
        ]
      );
    }
  }

  // Insert channel configs
  const channels = params.channel_configs || [
    { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
    { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
    { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
  ];

  for (const c of channels) {
    const chanId = `chn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await executeCommand(
      `
        INSERT INTO channel_configs (
          id, medicine_id, channel, lead_time_min_days, lead_time_max_days, available
        ) VALUES (?, ?, ?, ?, ?, ?);
      `,
      [
        chanId,
        id,
        c.channel,
        Number(c.lead_time_min_days),
        Number(c.lead_time_max_days),
        c.available ? 1 : 0,
      ]
    );
  }

  return id;
}

export async function updateMedicine(
  id: string,
  params: {
    name?: string;
    strength?: string | null;
    form?: Medicine["form"];
    unit_label?: string;
    units_per_pack?: number;
    baseline_stock?: number;
    baseline_date?: string;
    safety_buffer_days?: number | null;
    notes?: string | null;
    schedules?: Array<{
      time_of_day: string;
      quantity: number;
      interval_days?: number;
      instructions?: string | null;
    }>;
    channel_configs?: Array<{
      channel: ChannelConfig["channel"];
      lead_time_min_days: number;
      lead_time_max_days: number;
      available: boolean;
    }>;
  }
) {
  await initDb();
  const now = new Date().toISOString();

  const current = await getMedicineById(id);
  if (!current) throw new Error(`Medicine ${id} not found`);

  await executeCommand(
    `
      UPDATE medicines SET
        name = COALESCE(?, name),
        strength = ?,
        form = COALESCE(?, form),
        unit_label = COALESCE(?, unit_label),
        units_per_pack = COALESCE(?, units_per_pack),
        baseline_stock = COALESCE(?, baseline_stock),
        baseline_date = COALESCE(?, baseline_date),
        safety_buffer_days = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    [
      params.name !== undefined ? params.name.trim() : null,
      params.strength !== undefined ? (params.strength?.trim() || null) : (current.medicine.strength ?? null),
      params.form || null,
      params.unit_label !== undefined ? params.unit_label.trim() : null,
      params.units_per_pack !== undefined ? Number(params.units_per_pack) : null,
      params.baseline_stock !== undefined ? Number(params.baseline_stock) : null,
      params.baseline_date || null,
      params.safety_buffer_days !== undefined ? (params.safety_buffer_days ?? null) : (current.medicine.safety_buffer_days ?? null),
      params.notes !== undefined ? (params.notes?.trim() || null) : (current.medicine.notes ?? null),
      now,
      id,
    ]
  );

  if (params.schedules !== undefined) {
    await executeCommand("DELETE FROM dose_schedules WHERE medicine_id = ?;", [id]);
    for (const s of params.schedules) {
      const schedId = `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await executeCommand(
        `
          INSERT INTO dose_schedules (
            id, medicine_id, time_of_day, quantity, interval_days, instructions
          ) VALUES (?, ?, ?, ?, ?, ?);
        `,
        [
          schedId,
          id,
          s.time_of_day,
          Number(s.quantity) || 1,
          Number(s.interval_days) || 1,
          s.instructions || null,
        ]
      );
    }
  }

  if (params.channel_configs !== undefined) {
    await executeCommand("DELETE FROM channel_configs WHERE medicine_id = ?;", [id]);
    for (const c of params.channel_configs) {
      const chanId = `chn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await executeCommand(
        `
          INSERT INTO channel_configs (
            id, medicine_id, channel, lead_time_min_days, lead_time_max_days, available
          ) VALUES (?, ?, ?, ?, ?, ?);
        `,
        [
          chanId,
          id,
          c.channel,
          Number(c.lead_time_min_days),
          Number(c.lead_time_max_days),
          c.available ? 1 : 0,
        ]
      );
    }
  }
}

export async function deleteMedicine(id: string) {
  await initDb();
  await executeCommand("DELETE FROM dose_schedules WHERE medicine_id = ?;", [id]);
  await executeCommand("DELETE FROM channel_configs WHERE medicine_id = ?;", [id]);
  await executeCommand("DELETE FROM restock_events WHERE medicine_id = ?;", [id]);
  await executeCommand("DELETE FROM stock_adjustments WHERE medicine_id = ?;", [id]);
  await executeCommand("DELETE FROM medicines WHERE id = ?;", [id]);
}

// ----------------------------------------------------------------------------
// Restock Operations
// ----------------------------------------------------------------------------

export async function logRestock(params: {
  medicine_id: string;
  channel: RestockEvent["channel"];
  pack_count?: number | null;
  units_per_pack?: number | null;
  quantity_added: number;
  ordered_date: string;
  expected_arrival_date?: string | null;
  received_date?: string | null;
  cost?: number | null;
  notes?: string | null;
}): Promise<string> {
  await initDb();
  const id = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  await executeCommand(
    `
      INSERT INTO restock_events (
        id, medicine_id, channel, pack_count, units_per_pack,
        quantity_added, ordered_date, expected_arrival_date,
        received_date, cost, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      params.medicine_id,
      params.channel,
      params.pack_count !== undefined ? (params.pack_count ?? null) : null,
      params.units_per_pack !== undefined ? (params.units_per_pack ?? null) : null,
      Number(params.quantity_added),
      params.ordered_date,
      params.expected_arrival_date || null,
      params.received_date || null,
      params.cost !== undefined ? (params.cost ?? null) : null,
      params.notes?.trim() || null,
      now,
    ]
  );

  return id;
}

export async function markRestockReceived(id: string, receivedDate?: string) {
  await initDb();
  const dateStr = receivedDate || format(new Date(), "yyyy-MM-dd");
  await executeCommand("UPDATE restock_events SET received_date = ? WHERE id = ?;", [dateStr, id]);
}

export async function deleteRestock(id: string) {
  await initDb();
  await executeCommand("DELETE FROM restock_events WHERE id = ?;", [id]);
}

// ----------------------------------------------------------------------------
// Stock Adjustments
// ----------------------------------------------------------------------------

export async function logStockAdjustment(params: {
  medicine_id: string;
  delta: number;
  reason: StockAdjustment["reason"];
  notes?: string | null;
  date?: string;
  reset_baseline?: boolean;
  new_baseline_stock?: number;
}): Promise<string> {
  await initDb();
  const id = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const dateStr = params.date || format(new Date(), "yyyy-MM-dd");

  await executeCommand(
    `
      INSERT INTO stock_adjustments (
        id, medicine_id, delta, reason, notes, date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      params.medicine_id,
      Number(params.delta),
      params.reason,
      params.notes?.trim() || null,
      dateStr,
      now,
    ]
  );

  if (params.reset_baseline && typeof params.new_baseline_stock === "number") {
    await executeCommand(
      "UPDATE medicines SET baseline_stock = ?, baseline_date = ?, updated_at = ? WHERE id = ?;",
      [params.new_baseline_stock, dateStr, now, params.medicine_id]
    );
  }

  return id;
}

// ----------------------------------------------------------------------------
// All State Resolver
// ----------------------------------------------------------------------------

export async function getAllCalculatedStates(referenceDate: Date = new Date()): Promise<{
  settings: AppSettings;
  states: CalculatedMedicineState[];
}> {
  await initDb();
  const settings = await getSettings();
  const medicines = await getMedicines();

  const states: CalculatedMedicineState[] = [];
  for (const m of medicines) {
    const full = await getMedicineById(m.id);
    if (full) {
      const state = computeMedicineState(
        full.medicine,
        full.schedules,
        full.channel_configs,
        full.restocks,
        full.adjustments,
        settings,
        referenceDate
      );
      states.push(state);
    }
  }

  return { settings, states };
}

// ----------------------------------------------------------------------------
// Seeding User Prescription Data
// ----------------------------------------------------------------------------

export async function seedSampleData() {
  await initDb();
  const existing = await getMedicines();
  for (const m of existing) {
    await deleteMedicine(m.id);
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Apollo Medicines
  const renologId = await createMedicine({
    name: "Renolog",
    strength: "Alpha Ketoanalogues",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 15,
    baseline_stock: 79,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "6 tablets daily (2 Morning, 2 Afternoon, 2 Night with meals).",
    schedules: [
      { time_of_day: "morning", quantity: 2, interval_days: 1, instructions: "With breakfast" },
      { time_of_day: "afternoon", quantity: 2, interval_days: 1, instructions: "With lunch" },
      { time_of_day: "night", quantity: 2, interval_days: 1, instructions: "With dinner" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  await createMedicine({
    name: "Rozucor ASP 10",
    strength: "Rosuvastatin 10mg + Aspirin 75mg",
    form: "capsule",
    unit_label: "capsules",
    units_per_pack: 10,
    baseline_stock: 30,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "1 capsule at night after dinner.",
    schedules: [
      { time_of_day: "night", quantity: 1, interval_days: 1, instructions: "After dinner" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  await createMedicine({
    name: "Trajenta Duo 2.5/500",
    strength: "Linagliptin 2.5mg + Metformin 500mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 10,
    baseline_stock: 53,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "3 tablets daily (1 Morning, 1 Afternoon, 1 Night with meals).",
    schedules: [
      { time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "With breakfast" },
      { time_of_day: "afternoon", quantity: 1, interval_days: 1, instructions: "With lunch" },
      { time_of_day: "night", quantity: 1, interval_days: 1, instructions: "With dinner" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  const ferronemiaId = await createMedicine({
    name: "Ferronemia",
    strength: "100 mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 15,
    baseline_stock: 18,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "2 tablets daily. 2 strips ordered from Mr. Med arriving 23-25 Sep.",
    schedules: [
      { time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Morning" },
      { time_of_day: "night", quantity: 1, interval_days: 1, instructions: "Night" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  await logRestock({
    medicine_id: ferronemiaId,
    channel: "mr_med",
    pack_count: 2,
    units_per_pack: 15,
    quantity_added: 30,
    ordered_date: todayStr,
    expected_arrival_date: "2026-09-24",
    notes: "2 strips en route from Mr. Med (Expected 23–25 Sep)",
  });

  await createMedicine({
    name: "Nicardiq XL 30",
    strength: "30 mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 15,
    baseline_stock: 28,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "1 tablet daily.",
    schedules: [
      { time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Morning" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  await createMedicine({
    name: "Rabifast 20",
    strength: "Rabeprazole 20mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 15,
    baseline_stock: 61,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "2 tablets daily (1 Morning empty stomach, 1 Evening before food).",
    schedules: [
      { time_of_day: "before_breakfast", quantity: 1, interval_days: 1, instructions: "Empty stomach" },
      { time_of_day: "evening", quantity: 1, interval_days: 1, instructions: "Before evening meal" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  const telmaLnId = await createMedicine({
    name: "Telma LN 40",
    strength: "Telmisartan 40mg + Cilnidipine 10mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 15,
    baseline_stock: 29,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "2 tablets daily. 3 strips ordered from Mr. Med arriving 23-25 Sep.",
    schedules: [
      { time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Morning" },
      { time_of_day: "night", quantity: 1, interval_days: 1, instructions: "Night" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  await logRestock({
    medicine_id: telmaLnId,
    channel: "mr_med",
    pack_count: 3,
    units_per_pack: 15,
    quantity_added: 45,
    ordered_date: todayStr,
    expected_arrival_date: "2026-09-24",
    notes: "3 strips en route from Mr. Med (Expected 23–25 Sep)",
  });

  await createMedicine({
    name: "Fidotox Powder",
    strength: "Dietary Toxin Binder",
    form: "sachet",
    unit_label: "sachets",
    units_per_pack: 10,
    baseline_stock: 18,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "1 packet everyday. Takes 14 days to arrive from Apollo.",
    schedules: [
      { time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Mix with water daily" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 10, lead_time_max_days: 14, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  // Mr. Med Medicines
  const kerendiaId = await createMedicine({
    name: "Kerendia",
    strength: "10 mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 14,
    baseline_stock: 0,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "1 tablet daily. 2 strips ordered from Mr. Med arriving 23-25 Sep.",
    schedules: [
      { time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Morning" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: false },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  await logRestock({
    medicine_id: kerendiaId,
    channel: "mr_med",
    pack_count: 2,
    units_per_pack: 14,
    quantity_added: 28,
    ordered_date: todayStr,
    expected_arrival_date: "2026-09-24",
    notes: "2 strips en route from Mr. Med (Expected 23–25 Sep)",
  });

  await createMedicine({
    name: "Cudo Forte",
    strength: "Probiotic Complex",
    form: "capsule",
    unit_label: "capsules",
    units_per_pack: 10,
    baseline_stock: 30,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "1 capsule everyday.",
    schedules: [
      { time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Morning with water" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: false },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  await createMedicine({
    name: "Anfoe 4000 IU",
    strength: "Erythropoietin 4000 IU",
    form: "injection",
    unit_label: "injections",
    units_per_pack: 1,
    baseline_stock: 2,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "1 injection to be taken every Saturday.",
    schedules: [
      { time_of_day: "morning", quantity: 1, interval_days: 7, instructions: "Every Saturday subcutaneous" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: false },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  // Local Pharmacy Medicines
  await createMedicine({
    name: "Thyronorm 50",
    strength: "50 mcg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 120,
    baseline_stock: 180,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "1 tablet empty stomach in morning. 1 full bottle (120) + 1 continuing (~60) in stock.",
    schedules: [
      { time_of_day: "before_breakfast", quantity: 1, interval_days: 1, instructions: "Empty stomach before breakfast" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  await createMedicine({
    name: "Thyronorm 25",
    strength: "25 mcg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 120,
    baseline_stock: 60,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "1 tablet empty stomach in morning. 1 continuing bottle in stock.",
    schedules: [
      { time_of_day: "before_breakfast", quantity: 1, interval_days: 1, instructions: "Empty stomach before breakfast" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  await createMedicine({
    name: "Lantus Cartridge",
    strength: "Insulin Glargine 100 IU/ml (3ml)",
    form: "other",
    unit_label: "units",
    units_per_pack: 300,
    baseline_stock: 200,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "14 units insulin everyday at night.",
    schedules: [
      { time_of_day: "night", quantity: 14, interval_days: 1, instructions: "Daily night subcutaneous" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  await createMedicine({
    name: "Dytor 10",
    strength: "Torsemide 10mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 15,
    baseline_stock: 30,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "1 tablet daily in the morning.",
    schedules: [
      { time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Morning after food" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });
}
