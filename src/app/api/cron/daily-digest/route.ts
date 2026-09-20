import { NextResponse } from "next/server";
import { getAllCalculatedStates } from "@/lib/db";
import { Resend } from "resend";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { settings, states } = await getAllCalculatedStates();

    if (!settings.reminders_enabled) {
      return NextResponse.json({
        success: true,
        message: "Daily reminders are currently disabled in Settings.",
        alerts_count: 0,
      });
    }

    // Filter medicines that require reorder attention and are NOT covered by in-transit orders
    const alertItems = states.filter(
      (s) =>
        (s.urgency === "CRITICAL" || s.urgency === "ORDER_NOW" || s.urgency === "ORDER_SOON") &&
        !s.in_transit.covers_stockout
    );

    if (alertItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All medicines are currently healthy (Green/Covered). No email needed.",
        alerts_count: 0,
      });
    }

    const emailTo = settings.reminder_email || process.env.REMINDER_EMAIL;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!emailTo) {
      return NextResponse.json({
        success: true,
        message: `Found ${alertItems.length} alert(s), but no recipient email is configured in Settings.`,
        alerts_count: alertItems.length,
        items: alertItems.map((a) => ({
          name: a.medicine.name,
          urgency: a.urgency,
          days_remaining: a.days_remaining,
          recommended_action: a.recommended_action,
        })),
      });
    }

    if (!resendApiKey) {
      return NextResponse.json({
        success: true,
        message: `Found ${alertItems.length} alert(s) for ${emailTo}. RESEND_API_KEY not set in env (simulated delivery).`,
        alerts_count: alertItems.length,
        items: alertItems.map((a) => ({
          name: a.medicine.name,
          urgency: a.urgency,
          days_remaining: a.days_remaining,
          recommended_action: a.recommended_action,
        })),
      });
    }

    const resend = new Resend(resendApiKey);
    const todayFormatted = format(new Date(), "dd MMMM yyyy");

    const criticalItems = alertItems.filter((a) => a.urgency === "CRITICAL");
    const orderNowItems = alertItems.filter((a) => a.urgency === "ORDER_NOW");
    const orderSoonItems = alertItems.filter((a) => a.urgency === "ORDER_SOON");

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
        <div style="background: #0f172a; padding: 20px; border-radius: 12px; color: white; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: bold; color: #2dd4bf;">MedTrack — Daily Reorder Digest</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">${todayFormatted} • Multi-Channel Lead Time Report</p>
        </div>

        <p style="font-size: 14px; line-height: 1.5; color: #334155;">
          The following <strong>${alertItems.length} medicine(s)</strong> have reached their ordering window based on channel lead times:
        </p>

        <div style="margin: 20px 0;">
          ${alertItems
            .map((item) => {
              const badgeColor =
                item.urgency === "CRITICAL"
                  ? "#ef4444"
                  : item.urgency === "ORDER_NOW"
                  ? "#f97316"
                  : "#f59e0b";

              return `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${badgeColor}; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="font-size: 15px; color: #0f172a;">${item.medicine.name} ${
                item.medicine.strength ? `(${item.medicine.strength})` : ""
              }</strong>
                    <span style="font-size: 11px; font-weight: bold; color: ${badgeColor}; text-transform: uppercase;">${
                item.urgency_label
              }</span>
                  </div>
                  <div style="font-size: 13px; color: #475569; margin-bottom: 6px;">
                    Stock on hand: <strong>${item.on_hand_stock} ${item.medicine.unit_label}</strong> (${item.days_remaining} days left)
                  </div>
                  <div style="font-size: 12px; background: #ffffff; border: 1px solid #cbd5e1; padding: 8px 10px; border-radius: 6px; color: #0f172a;">
                    <strong>Action:</strong> ${item.recommended_action}
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          Sent by personal MedTrack personal health assistant.
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: "MedTrack <onboarding@resend.dev>",
      to: emailTo,
      subject: `[MedTrack Alert] ${alertItems.length} Medicine(s) Require Reordering — ${todayFormatted}`,
      html: emailHtml,
    });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        alerts_count: alertItems.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Digest email sent successfully to ${emailTo}`,
      email_id: data?.id,
      alerts_count: alertItems.length,
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
