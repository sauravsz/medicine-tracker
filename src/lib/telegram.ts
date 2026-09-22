import { format } from "date-fns";
import type { CalculatedMedicineState, ChannelType } from "./types";
import { CHANNEL_METADATA } from "./calculations";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface TelegramSendOptions {
  botToken: string;
  chatId: string;
  text: string;
  parseMode?: "HTML" | "Markdown";
  disableNotification?: boolean;
}

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Sends a message via the Telegram Bot API using native fetch.
 */
export async function sendTelegramMessage(options: TelegramSendOptions): Promise<TelegramSendResult> {
  const { botToken, chatId, text, parseMode = "HTML", disableNotification = false } = options;

  if (!botToken || !chatId) {
    return {
      success: false,
      error: "Missing Telegram botToken or chatId.",
    };
  }

  try {
    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
        disable_notification: disableNotification,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      const errMsg = data?.description || `Telegram API responded with status ${response.status}`;
      return {
        success: false,
        error: errMsg,
      };
    }

    return {
      success: true,
      messageId: data.result?.message_id,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Formats inventory calculations into a clean, structured Telegram daily briefing message.
 */
export function buildDailyDigestTelegramMessage(states: CalculatedMedicineState[]): string {
  const todayFormatted = format(new Date(), "dd MMM yyyy");
  const total = states.length;

  const criticalItems = states.filter((s) => s.urgency === "CRITICAL" && !s.in_transit.covers_stockout);
  const orderNowItems = states.filter((s) => s.urgency === "ORDER_NOW" && !s.in_transit.covers_stockout);
  const orderSoonItems = states.filter((s) => s.urgency === "ORDER_SOON" && !s.in_transit.covers_stockout);
  const inTransitItems = states.filter((s) => s.in_transit.orders.length > 0);

  const alertCount = criticalItems.length + orderNowItems.length + orderSoonItems.length;
  const healthyCount = total - alertCount;

  const lines: string[] = [];

  // Header
  lines.push(`💊 <b>TrackMed Daily Briefing</b> — <i>${todayFormatted}</i>`);
  lines.push("");

  if (alertCount === 0) {
    const minDays = states.length > 0 ? Math.min(...states.map((s) => s.days_remaining)) : 0;
    lines.push(`🟢 <b>All ${total} medicines are fully stocked</b>`);
    lines.push(`Minimum inventory runway: <b>${minDays} days</b>.`);
  } else {
    lines.push(`⚠️ <b>${alertCount} Medicine${alertCount > 1 ? "s" : ""} Require Attention</b>`);
    lines.push("");

    if (criticalItems.length > 0) {
      lines.push(`🚨 <b>CRITICAL BUFFER / STOCKOUT</b>:`);
      for (const item of criticalItems) {
        const medName = escapeHtml(item.medicine.name);
        const strength = item.medicine.strength ? ` (${escapeHtml(item.medicine.strength)})` : "";
        const unit = escapeHtml(item.medicine.unit_label || "units");
        lines.push(`• <b>${medName}</b>${strength}`);
        lines.push(`  Stock: <b>${item.on_hand_stock} ${unit}</b> (${item.days_remaining}d left)`);
        lines.push(`  👉 <i>${escapeHtml(item.recommended_action)}</i>`);
      }
      lines.push("");
    }

    if (orderNowItems.length > 0) {
      lines.push(`⚡ <b>ORDER NOW (Lead-time Window)</b>:`);
      for (const item of orderNowItems) {
        const medName = escapeHtml(item.medicine.name);
        const strength = item.medicine.strength ? ` (${escapeHtml(item.medicine.strength)})` : "";
        const unit = escapeHtml(item.medicine.unit_label || "units");
        lines.push(`• <b>${medName}</b>${strength}`);
        lines.push(`  Stock: <b>${item.on_hand_stock} ${unit}</b> (${item.days_remaining}d left)`);
        lines.push(`  👉 <i>${escapeHtml(item.recommended_action)}</i>`);
      }
      lines.push("");
    }

    if (orderSoonItems.length > 0) {
      lines.push(`⏳ <b>ORDER SOON (Upcoming)</b>:`);
      for (const item of orderSoonItems) {
        const medName = escapeHtml(item.medicine.name);
        const strength = item.medicine.strength ? ` (${escapeHtml(item.medicine.strength)})` : "";
        lines.push(`• <b>${medName}</b>${strength}: <b>${item.days_remaining} days left</b>`);
      }
      lines.push("");
    }
  }

  // In-Transit deliveries section
  if (inTransitItems.length > 0) {
    lines.push(`📦 <b>Active In-Transit Orders</b>:`);
    for (const item of inTransitItems) {
      const medName = escapeHtml(item.medicine.name);
      for (const order of item.in_transit.orders) {
        const channelMeta = CHANNEL_METADATA[order.channel as ChannelType] || { name: order.channel };
        const arrivalText = order.expected_arrival_date
          ? `Expected ${format(new Date(order.expected_arrival_date), "dd MMM")}`
          : "In transit";
        lines.push(`• <b>${medName}</b>: +${order.quantity_added} units via ${escapeHtml(channelMeta.name)} (${arrivalText})`);
      }
    }
    lines.push("");
  }

  if (alertCount > 0 && healthyCount > 0) {
    lines.push(`🟢 <i>${healthyCount} other medicine${healthyCount > 1 ? "s have" : " has"} safe stock.</i>`);
  }

  return lines.join("\n").trim();
}

/**
 * Sends a daily briefing to Telegram.
 */
export async function sendTelegramDailyDigest(
  botToken: string,
  chatId: string,
  states: CalculatedMedicineState[]
): Promise<TelegramSendResult> {
  const message = buildDailyDigestTelegramMessage(states);
  return sendTelegramMessage({
    botToken,
    chatId,
    text: message,
    parseMode: "HTML",
    disableNotification: false,
  });
}

/**
 * Sends a test ping to verify Telegram Bot credentials and chat connection.
 */
export async function sendTelegramTestPing(botToken: string, chatId: string): Promise<TelegramSendResult> {
  const timeStr = format(new Date(), "dd MMM yyyy, HH:mm:ss");
  const testText = [
    `✅ <b>TrackMed Telegram Integration Active</b>`,
    ``,
    `Your Telegram bot is successfully connected to TrackMed.`,
    `Timestamp: <code>${timeStr}</code>`,
    ``,
    `You will receive daily medicine replenishment briefings here.`,
  ].join("\n");

  return sendTelegramMessage({
    botToken,
    chatId,
    text: testText,
    parseMode: "HTML",
    disableNotification: false,
  });
}
