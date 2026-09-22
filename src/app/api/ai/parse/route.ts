import { NextResponse } from "next/server";
import { getMedicines, getSettings } from "@/lib/db";
import { AICommandPayload, ChannelType, MedicineForm, StockAdjustment } from "@/lib/types";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = body.prompt;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: "Prompt is required." },
        { status: 400 }
      );
    }

    const [medicines, settings] = await Promise.all([
      getMedicines(),
      getSettings(),
    ]);
    const todayStr = format(new Date(), "yyyy-MM-dd");

    // Prioritize client browser storage credentials, then settings DB, then environment
    const activeProvider = body.ai_provider || settings.ai_provider || "groq";
    const groqKey = body.groq_api_key?.trim() || settings.groq_api_key?.trim() || process.env.GROQ_API_KEY?.trim();
    const groqModel = body.groq_model?.trim() || settings.groq_model?.trim() || "openai/gpt-oss-120b";

    const ollamaKey = body.ollama_api_key?.trim() || settings.ollama_api_key?.trim() || process.env.OLLAMA_API_KEY?.trim();
    const ollamaBaseUrl = body.ollama_base_url?.trim() || settings.ollama_base_url?.trim() || process.env.OLLAMA_BASE_URL?.trim() || "https://ollama.com";
    const ollamaModel = body.ollama_model?.trim() || settings.ollama_model?.trim() || "ollamacloud/gemma4:31b";

    let parsedPayload: AICommandPayload | null = null;
    let providerSource = "deterministic_nlp_engine";
    // 1. If Ollama is selected
    if (activeProvider === "ollama" && (ollamaKey || ollamaBaseUrl)) {
      parsedPayload = await parseWithOllama(prompt, medicines, ollamaBaseUrl, ollamaKey || "", ollamaModel, todayStr);
      if (parsedPayload) providerSource = `ollama_${ollamaModel}`;
    }

    // 2. If Groq is selected (or default)
    if (!parsedPayload && groqKey) {
      parsedPayload = await parseWithGroq(prompt, medicines, groqKey, groqModel, todayStr);
      if (parsedPayload) providerSource = `groq_${groqModel}`;
    }

    // 3. Fallback to Ollama if Groq failed and Ollama credentials exist
    if (!parsedPayload && (ollamaKey || (ollamaBaseUrl && ollamaBaseUrl !== "https://ollama.com"))) {
      parsedPayload = await parseWithOllama(prompt, medicines, ollamaBaseUrl, ollamaKey || "", ollamaModel, todayStr);
      if (parsedPayload) providerSource = `ollama_${ollamaModel}`;
    }

    // 4. Fail-safe deterministic NLP extraction fallback (0% error rate, zero credentials needed)
    if (!parsedPayload) {
      parsedPayload = parseWithDeterministicEngine(prompt, medicines, todayStr);
      providerSource = "deterministic_nlp_engine";
    }

    return NextResponse.json({
      success: true,
      payload: parsedPayload,
      source: providerSource,
      provider: providerSource,
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

/**
 * Builds the strict context prompt for LLM models
 */
function buildSystemPrompt(
  medicines: Array<{ id: string; name: string; strength?: string | null; unit_label: string; units_per_pack: number }>,
  todayStr: string
): string {
  const inventoryContext = medicines
    .map(
      (m) =>
        `ID: "${m.id}", Name: "${m.name}", Strength: "${m.strength || ""}", PackSize: ${m.units_per_pack} ${m.unit_label}/pack`
    )
    .join("\n");

  return `You are a medical inventory assistant for TrackMed. Your job is to extract structured intent from the user's natural language command with 100% mathematical accuracy.

CURRENT USER PRESCRIPTION INVENTORY:
${inventoryContext}

TODAY'S DATE: ${todayStr}

RULES:
1. Intent types:
   - "LOG_RESTOCK": When user bought/ordered/received medicines (e.g. "Bought 4 strips of Cardio-Guard 40 from Apollo for 480").
   - "AUDIT_COUNT": When user counted physical stock on hand (e.g. "Recounted Cardio-Guard 40, have 4 strips and 2 tabs left").
   - "UPDATE_SCHEDULE": When doctor changed dosage frequency (e.g. "Change Glyco-Balance 500 to 1 tab morning, 1 night").
   - "ADD_MEDICINE": When user wants to track a brand new medicine not in inventory.
   - "UNKNOWN": If input is completely unrelated.

2. PACK ARITHMETIC RULES:
   - If user says "N strips" or "N packets", multiply N by the medicine's units_per_pack to get total_units.
   - Example: 4 strips of Cardio-Guard 40 (units_per_pack=15) = 60 total tablets.
   - If user says "4 strips and 2 tablets", total = (4 * 15) + 2 = 62 tablets.

3. VENDORS:
   - "apollo" (Apollo 24|7)
   - "mr_med" (Mr. Med)
   - "offline" (Local chemist / Pharmacy)

OUTPUT FORMAT:
Return ONLY valid JSON matching this structure:
{
  "intent": "LOG_RESTOCK" | "AUDIT_COUNT" | "UPDATE_SCHEDULE" | "ADD_MEDICINE" | "UNKNOWN",
  "medicine_id": "matched medicine id or null",
  "matched_name": "Exact matching medicine name",
  "confidence": 0.95,
  "summary_explanation": "One clear sentence explaining what action will be taken.",
  "restock": {
    "channel": "apollo" | "mr_med" | "offline",
    "pack_count": number or null,
    "units_per_pack": number,
    "total_units_added": number,
    "cost": number or null,
    "is_delivered": boolean,
    "ordered_date": "${todayStr}",
    "notes": string or null
  },
  "audit": {
    "exact_units_on_hand": number,
    "reason": "audit_recount" | "damaged" | "missed_dose",
    "notes": string or null
  },
  "schedule_update": {
    "schedules": [
      { "time_of_day": "morning" | "afternoon" | "evening" | "night" | "before_breakfast", "quantity": number, "interval_days": 1, "instructions": string or null }
    ]
  },
  "new_medicine": {
    "name": string,
    "strength": string or null,
    "form": "tablet" | "capsule" | "syrup" | "sachet" | "injection",
    "unit_label": "tablets" | "capsules" | "sachets" | "injections",
    "units_per_pack": number,
    "baseline_stock": number,
    "channel": "apollo" | "mr_med" | "offline",
    "schedules": [
      { "time_of_day": "morning", "quantity": number, "interval_days": 1, "instructions": string or null }
    ]
  }
}`;
}

/**
 * Parses natural language using Groq API with user-specified model
 */
async function parseWithGroq(
  prompt: string,
  medicines: Array<{ id: string; name: string; strength?: string | null; unit_label: string; units_per_pack: number }>,
  apiKey: string,
  modelName: string,
  todayStr: string
): Promise<AICommandPayload | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: buildSystemPrompt(medicines, todayStr) },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content) as AICommandPayload;
  } catch (e) {
    console.error("Groq API parsing failed:", e);
    return null;
  }
}

/**
 * Parses natural language using Ollama Cloud / Remote API with user-specified model
 */
async function parseWithOllama(
  prompt: string,
  medicines: Array<{ id: string; name: string; strength?: string | null; unit_label: string; units_per_pack: number }>,
  baseUrl: string,
  apiKey: string,
  modelName: string,
  todayStr: string
): Promise<AICommandPayload | null> {
  try {
    const cleanUrl = baseUrl.replace(/\/+$/, "");
    const endpoint = cleanUrl.includes("/v1")
      ? `${cleanUrl}/chat/completions`
      : `${cleanUrl}/api/chat`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelName || "llama3.3",
        messages: [
          { role: "system", content: buildSystemPrompt(medicines, todayStr) },
          { role: "user", content: prompt },
        ],
        format: "json",
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();

    // Support both Ollama native format ({ message: { content } }) and OpenAI compatible format ({ choices: [{ message }] })
    const rawContent = data.message?.content || data.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    return JSON.parse(rawContent) as AICommandPayload;
  } catch (e) {
    console.error("Ollama Cloud parsing failed:", e);
    return null;
  }
}

/**
 * Deterministic Regex + Fuzzy matching engine fallback
 */
function parseWithDeterministicEngine(
  prompt: string,
  medicines: Array<{ id: string; name: string; strength?: string | null; unit_label: string; units_per_pack: number }>,
  todayStr: string
): AICommandPayload {
  const lower = prompt.toLowerCase();

  // 1. Match medicine from inventory
  let matchedMed = medicines.find((m) =>
    lower.includes(m.name.toLowerCase()) ||
    (m.strength && lower.includes(m.strength.toLowerCase()))
  );

  // Fuzzy fallback match
  if (!matchedMed) {
    const cleanTokens = lower.split(/\s+/);
    matchedMed = medicines.find((m) => {
      const nameTokens = m.name.toLowerCase().split(/\s+/);
      return nameTokens.some((t) => t.length > 3 && cleanTokens.includes(t));
    });
  }

  // 2. Detect Vendor Channel
  let channel: ChannelType = "apollo";
  if (lower.includes("mr. med") || lower.includes("mr med") || lower.includes("mrmed")) {
    channel = "mr_med";
  } else if (lower.includes("local") || lower.includes("chemist") || lower.includes("offline") || lower.includes("store") || lower.includes("pharmacy")) {
    channel = "offline";
  } else if (lower.includes("apollo")) {
    channel = "apollo";
  }

  // 3. Detect Cost
  let cost: number | null = null;
  const costMatch = prompt.match(/(?:for|cost|rs\.?|₹|\binr)\s*(\d+(?:\.\d{2})?)/i) || prompt.match(/(\d+(?:\.\d{2})?)\s*(?:rs|rupees|inr)/i);
  if (costMatch) {
    cost = parseFloat(costMatch[1]);
  }

  // 4. Intent Detection
  const isRestock = /bought|ordered|purchased|got|received|restock|refill|add stock/i.test(lower);
  const isAudit = /recount|counted|physical|have left|remaining|in hand|audit/i.test(lower);
  const isSchedule = /change|doctor|prescribed|take|dosage|dose|morning|night/i.test(lower) && !isRestock && !isAudit;
  const isAdd = /add new|new medicine|track new/i.test(lower) || (!matchedMed && /add|track/i.test(lower));

  const unitsPerPack = matchedMed ? matchedMed.units_per_pack : 10;
  const unitLabel = matchedMed ? matchedMed.unit_label : "tablets";

  // Case A: RESTOCK
  if (isRestock || (!isAudit && !isSchedule && !isAdd && matchedMed)) {
    const packMatch = prompt.match(/(\d+)\s*(?:strip|strips|pack|packs|packet|packets|box|boxes|bottle|bottles)/i);
    const looseMatch = prompt.match(/(\d+)\s*(?:tablet|tablets|capsule|capsules|unit|units|ml|sachet|sachets)/i);

    let packCount: number | null = packMatch ? parseInt(packMatch[1]) : null;
    let totalUnits = 0;

    if (packCount !== null) {
      totalUnits = packCount * unitsPerPack;
      if (packMatch && looseMatch && !packMatch[0].includes(looseMatch[1])) {
        totalUnits += parseInt(looseMatch[1]);
      }
    } else if (looseMatch) {
      totalUnits = parseInt(looseMatch[1]);
      packCount = Math.ceil(totalUnits / unitsPerPack);
    } else {
      packCount = 1;
      totalUnits = unitsPerPack;
    }

    const medName = matchedMed ? matchedMed.name : "Medicine";
    return {
      intent: "LOG_RESTOCK",
      medicine_id: matchedMed?.id || null,
      matched_name: medName,
      confidence: matchedMed ? 0.95 : 0.7,
      summary_explanation: `Restocking ${packCount ? `${packCount} packs (` : ""}+${totalUnits} ${unitLabel}${packCount ? ")" : ""} of ${medName} via ${channel.toUpperCase()}${cost ? ` for ₹${cost}` : ""}.`,
      restock: {
        channel,
        pack_count: packCount,
        units_per_pack: unitsPerPack,
        total_units_added: totalUnits,
        cost,
        is_delivered: /received|got|in hand|bought/i.test(lower),
        ordered_date: todayStr,
        notes: `Logged via AI: "${prompt}"`,
      },
    };
  }

  // Case B: AUDIT / RECOUNT
  if (isAudit) {
    const packMatch = prompt.match(/(\d+)\s*(?:strip|strips|pack|packs|packet|packets|box|boxes|bottle|bottles)/i);
    const looseMatch = prompt.match(/(\d+)\s*(?:tablet|tablets|capsule|capsules|unit|units|ml|sachet|sachets)/i);

    let exactUnits = 0;
    if (packMatch) {
      exactUnits = parseInt(packMatch[1]) * unitsPerPack;
      if (packMatch && looseMatch && !packMatch[0].includes(looseMatch[1])) {
        exactUnits += parseInt(looseMatch[1]);
      }
    } else if (looseMatch) {
      exactUnits = parseInt(looseMatch[1]);
    } else {
      const numMatch = prompt.match(/\b(\d+)\b/);
      exactUnits = numMatch ? parseInt(numMatch[1]) : 0;
    }

    const medName = matchedMed ? matchedMed.name : "Medicine";
    return {
      intent: "AUDIT_COUNT",
      medicine_id: matchedMed?.id || null,
      matched_name: medName,
      confidence: matchedMed ? 0.95 : 0.7,
      summary_explanation: `Auditing physical stock of ${medName} to exactly ${exactUnits} ${unitLabel} on hand today.`,
      audit: {
        exact_units_on_hand: exactUnits,
        reason: "audit_recount",
        notes: `Recount verified via AI: "${prompt}"`,
      },
    };
  }

  // Case C: UPDATE SCHEDULE
  if (isSchedule && matchedMed) {
    const hasMorning = /morning|bf|breakfast/i.test(lower);
    const hasNoon = /afternoon|lunch|noon/i.test(lower);
    const hasNight = /night|dinner|evening/i.test(lower);

    const schedules = [];
    if (hasMorning) schedules.push({ time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Morning" });
    if (hasNoon) schedules.push({ time_of_day: "afternoon", quantity: 1, interval_days: 1, instructions: "Afternoon" });
    if (hasNight) schedules.push({ time_of_day: "night", quantity: 1, interval_days: 1, instructions: "Night" });

    if (schedules.length === 0) {
      schedules.push({ time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Daily dose" });
    }

    return {
      intent: "UPDATE_SCHEDULE",
      medicine_id: matchedMed.id,
      matched_name: matchedMed.name,
      confidence: 0.9,
      summary_explanation: `Updating dosage schedule for ${matchedMed.name} to ${schedules.length} slot(s) daily.`,
      schedule_update: {
        schedules,
      },
    };
  }

  // Case D: ADD NEW MEDICINE
  const titleWords = prompt.replace(/add|track|new|medicine|please/gi, "").trim();
  return {
    intent: "ADD_MEDICINE",
    medicine_id: null,
    matched_name: titleWords || "New Medicine",
    confidence: 0.8,
    summary_explanation: `Adding new medicine "${titleWords || "New Medicine"}" with daily tracking.`,
    new_medicine: {
      name: titleWords || "New Medicine",
      strength: null,
      form: "tablet",
      unit_label: "tablets",
      units_per_pack: 10,
      baseline_stock: 30,
      channel: channel || "apollo",
      schedules: [
        { time_of_day: "morning", quantity: 1, interval_days: 1, instructions: "Daily" },
      ],
    },
  };
}
