import { NextResponse } from "next/server";
import { seedSampleData, getAllCalculatedStates } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await seedSampleData();
    const { states } = await getAllCalculatedStates();
    return NextResponse.json({
      success: true,
      count: states.length,
      medicines: states.map((s) => ({
        name: s.medicine.name,
        on_hand: s.on_hand_stock,
        days_remaining: s.days_remaining,
        daily_consumption: s.daily_consumption,
        urgency: s.urgency,
        recommended_action: s.recommended_action,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
