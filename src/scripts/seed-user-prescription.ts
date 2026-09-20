import {
  initDb,
  createMedicine,
  logRestock,
  getMedicines,
  deleteMedicine,
  getAllCalculatedStates,
} from "../lib/db";
import { format } from "date-fns";

export async function seedUserPrescriptionData() {
  await initDb();
  const existing = await getMedicines();
  
  // Clear any placeholder demo data
  for (const m of existing) {
    await deleteMedicine(m.id);
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // =========================================================================
  // Apollo Medicines (7-10 days lead time)
  // =========================================================================

  // 1. Renolog (6 tablets/day, 15 tabs/strip, 79 on hand)
  const renologId = await createMedicine({
    name: "Renolog",
    strength: "Alpha Ketoanalogues",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 15,
    baseline_stock: 79, // 5 strips (75) + 4 tabs
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "6 tablets daily (2 tabs Morning, 2 tabs Afternoon, 2 tabs Night with meals).",
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

  // 2. Rozucor ASP 10 (1 tablet/day, 10 tabs/strip, 30 on hand)
  await createMedicine({
    name: "Rozucor ASP 10",
    strength: "Rosuvastatin 10mg + Aspirin 75mg",
    form: "capsule",
    unit_label: "capsules",
    units_per_pack: 10,
    baseline_stock: 30, // 3 strips
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

  // 3. Trajenta Duo 2.5/500 (3 tablets/day, 10 tabs/strip, 53 on hand)
  await createMedicine({
    name: "Trajenta Duo 2.5/500",
    strength: "Linagliptin 2.5mg + Metformin 500mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 10,
    baseline_stock: 53, // 5 strips (50) + 3 tabs
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

  // 4. Ferronemia 100mg (2 tablets/day, 15 tabs/strip, 18 on hand + 2 strips ordered from Mr. Med)
  const ferronemiaId = await createMedicine({
    name: "Ferronemia",
    strength: "100 mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 15,
    baseline_stock: 18, // 1 strip (15) + 3 tabs
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "2 tablets daily (1 Morning, 1 Night). Primary vendor: Apollo (higher discount); Mr. Med for fast delivery.",
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

  // Log in-transit order for Ferronemia
  await logRestock({
    medicine_id: ferronemiaId,
    channel: "mr_med",
    pack_count: 2,
    units_per_pack: 15,
    quantity_added: 30,
    ordered_date: todayStr,
    expected_arrival_date: "2026-09-24",
    notes: "Ordered 2 strips via Mr. Med (fast delivery). Expected: 23–25 Sep.",
  });

  // 5. Nicardiq XL 30 (1 tablet/day, 15 tabs/strip, 28 on hand)
  await createMedicine({
    name: "Nicardiq XL 30",
    strength: "30 mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 15,
    baseline_stock: 28, // 1 strip (15) + 13 tabs
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

  // 6. Rabifast 20 (2 tablets/day, 15 tabs/strip, 61 on hand)
  await createMedicine({
    name: "Rabifast 20",
    strength: "Rabeprazole 20mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 15,
    baseline_stock: 61, // 4 strips (60) + 1 tab
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

  // 7. Telma LN 40 (2 tablets/day, 15 tabs/strip, 29 on hand + 3 strips ordered from Mr. Med)
  const telmaLnId = await createMedicine({
    name: "Telma LN 40",
    strength: "Telmisartan 40mg + Cilnidipine 10mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 15,
    baseline_stock: 29, // 1 strip (15) + 14 tabs
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "2 tablets daily. Primary vendor: Apollo; Mr. Med for fast refill.",
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

  // Log in-transit order for Telma LN 40
  await logRestock({
    medicine_id: telmaLnId,
    channel: "mr_med",
    pack_count: 3,
    units_per_pack: 15,
    quantity_added: 45,
    ordered_date: todayStr,
    expected_arrival_date: "2026-09-24",
    notes: "Ordered 3 strips via Mr. Med. Expected: 23–25 Sep.",
  });

  // 8. Fidotox Powder (Takes 14 days from Apollo! 1 packet/day, 10 pkts/box, 18 on hand)
  await createMedicine({
    name: "Fidotox Powder",
    strength: "Dietary Toxin Binder",
    form: "sachet",
    unit_label: "sachets",
    units_per_pack: 10,
    baseline_stock: 18,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "1 packet everyday. Note: Long delivery window from Apollo (takes 14 days).",
    schedules: [
      { time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Mix with water daily" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 10, lead_time_max_days: 14, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  // =========================================================================
  // Mr. Med Medicines (3-5 days lead time)
  // =========================================================================

  // 9. Kerendia (1 tablet/day, 14 tabs/strip, 0 on hand + 2 strips ordered from Mr. Med)
  const kerendiaId = await createMedicine({
    name: "Kerendia",
    strength: "10 mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 14,
    baseline_stock: 0,
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "1 tablet daily. Currently 0 in hand; 2 strips (28 tabs) en route from Mr. Med.",
    schedules: [
      { time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Morning" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: false },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  // Log in-transit order for Kerendia
  await logRestock({
    medicine_id: kerendiaId,
    channel: "mr_med",
    pack_count: 2,
    units_per_pack: 14,
    quantity_added: 28,
    ordered_date: todayStr,
    expected_arrival_date: "2026-09-24",
    notes: "Ordered 2 strips (28 tablets) via Mr. Med. Expected: 23–25 Sep.",
  });

  // 10. Cudo Forte Capsules (1 cap/day, 10 caps/strip, 30 on hand)
  await createMedicine({
    name: "Cudo Forte",
    strength: "Probiotic Complex",
    form: "capsule",
    unit_label: "capsules",
    units_per_pack: 10,
    baseline_stock: 30, // 3 strips
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

  // 11. Anfoe 4000 IU (1 injection every Saturday, 2 in stock)
  await createMedicine({
    name: "Anfoe 4000 IU",
    strength: "Erythropoietin 4000 IU",
    form: "injection",
    unit_label: "injections",
    units_per_pack: 1,
    baseline_stock: 2, // 2 pre-filled syringes in hand
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "1 injection to be taken every Saturday. Cold-chain storage.",
    schedules: [
      { time_of_day: "morning", quantity: 1, interval_days: 7, instructions: "Every Saturday subcutaneous" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: false },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  // =========================================================================
  // Local Pharmacy Medicines (0-1 day lead time)
  // =========================================================================

  // 12. Thyronorm 50 (1 tab/day, 120 tabs/bottle, 1 full + 1 continuing = 180 on hand)
  await createMedicine({
    name: "Thyronorm 50",
    strength: "50 mcg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 120,
    baseline_stock: 180, // 1 full bottle (120) + 1 continuing (~60)
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "1 tablet empty stomach in morning with water 30 mins before breakfast. 1 full bottle + 1 continuing in stock.",
    schedules: [
      { time_of_day: "before_breakfast", quantity: 1, interval_days: 1, instructions: "Empty stomach before breakfast" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  // 13. Thyronorm 25 (1 tab/day, 120 tabs/bottle, 1 continuing = 60 on hand)
  await createMedicine({
    name: "Thyronorm 25",
    strength: "25 mcg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 120,
    baseline_stock: 60, // 1 continuing bottle
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

  // 14. Lantus Cartridge (14 units/day, 300 units/cartridge, 200 units remaining)
  await createMedicine({
    name: "Lantus Cartridge",
    strength: "Insulin Glargine 100 IU/ml (3ml)",
    form: "other",
    unit_label: "units",
    units_per_pack: 300, // 1 cartridge = 300 units
    baseline_stock: 200, // 200 units remaining
    baseline_date: todayStr,
    safety_buffer_days: 2,
    notes: "14 units insulin to be administered everyday. 1 cartridge = 300 units (3ml).",
    schedules: [
      { time_of_day: "night", quantity: 14, interval_days: 1, instructions: "Daily night subcutaneous" },
    ],
    channel_configs: [
      { channel: "apollo", lead_time_min_days: 7, lead_time_max_days: 10, available: true },
      { channel: "mr_med", lead_time_min_days: 3, lead_time_max_days: 5, available: true },
      { channel: "offline", lead_time_min_days: 0, lead_time_max_days: 1, available: true },
    ],
  });

  // 15. Dytor 10 (1 tab/day, 15 tabs/strip, 30 on hand)
  await createMedicine({
    name: "Dytor 10",
    strength: "Torsemide 10mg",
    form: "tablet",
    unit_label: "tablets",
    units_per_pack: 15,
    baseline_stock: 30, // 2 strips
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

  console.log("Successfully seeded all 15 prescription medicines with accurate dosage schedules and in-transit orders!");
}

// Auto-run if executed directly
if (import.meta.main || process.argv[1]?.includes("seed-user-prescription")) {
  seedUserPrescriptionData().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
