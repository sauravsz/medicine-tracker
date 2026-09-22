import {
  initDb,
  seedSampleData,
  getAllCalculatedStates,
} from "../lib/db";

export async function seedUserPrescriptionData() {
  await initDb();
  console.log("Seeding sample replenishment inventory data...");
  await seedSampleData();

  const { states } = await getAllCalculatedStates();
  console.log(`\nSuccessfully seeded ${states.length} demo medicines:\n`);
  for (const s of states) {
    console.log(
      `[${s.urgency.toUpperCase().padEnd(8)}] ${s.medicine.name.padEnd(24)}: ${String(s.on_hand_stock).padStart(3)} ${s.medicine.unit_label.padEnd(8)} on hand | ${String(s.days_remaining).padStart(3)}d left | Action: ${s.recommended_action}`
    );
  }
}

// Auto-run if executed directly
if (import.meta.main || process.argv[1]?.includes("seed-user-prescription")) {
  seedUserPrescriptionData().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
