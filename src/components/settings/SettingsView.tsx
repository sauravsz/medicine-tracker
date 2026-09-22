"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Settings as SettingsIcon,
  Bell,
  Building2,
  Database,
  Check,
  Copy,
  Send,
  Sparkles,
  Key,
  Cpu,
  Globe,
  Bot,
  MessageSquare,
} from "lucide-react";
import { AppSettings } from "@/lib/types";
import { updateSettingsAction, sendTestTelegramAction } from "@/app/actions";

interface SettingsViewProps {
  initialSettings: AppSettings;
  sqlSchema: string;
}

const GROQ_PRESETS = [
  { id: "openai/gpt-oss-120b", label: "GPT OSS 120B (OpenAI)" },
  { id: "qwen/qwen3.8-27b", label: "Qwen 3.8 27B" },
];

const OLLAMA_PRESETS = [
  { id: "ollamacloud/gemma4:31b", label: "Gemma 4 31B" },
  { id: "ollamacloud/nemotron-3-super", label: "Nemotron 3 Super" },
];

export function SettingsView({ initialSettings, sqlSchema }: SettingsViewProps) {
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [copiedSql, setCopiedSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testCronResult, setTestCronResult] = useState<string | null>(null);
  const [testAiResult, setTestAiResult] = useState<string | null>(null);
  const [testTelegramResult, setTestTelegramResult] = useState<string | null>(null);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  // 1. Load client-side browser storage on mount
  useEffect(() => {
    try {
      const gKey = localStorage.getItem("trackmed_groq_api_key") ?? localStorage.getItem("medtrack_groq_api_key");
      const gModel = localStorage.getItem("trackmed_groq_model") ?? localStorage.getItem("medtrack_groq_model");
      const oKey = localStorage.getItem("trackmed_ollama_api_key") ?? localStorage.getItem("medtrack_ollama_api_key");
      const oUrl = localStorage.getItem("trackmed_ollama_base_url") ?? localStorage.getItem("medtrack_ollama_base_url");
      const oModel = localStorage.getItem("trackmed_ollama_model") ?? localStorage.getItem("medtrack_ollama_model");
      const prov = localStorage.getItem("trackmed_ai_provider") ?? localStorage.getItem("medtrack_ai_provider");
      const tgToken = localStorage.getItem("trackmed_telegram_bot_token");
      const tgChat = localStorage.getItem("trackmed_telegram_chat_id");
      const tgEnabled = localStorage.getItem("trackmed_telegram_enabled");

      setSettings((prev) => ({
        ...prev,
        groq_api_key: gKey !== null ? gKey : prev.groq_api_key,
        groq_model: gModel !== null ? gModel : (prev.groq_model || "openai/gpt-oss-120b"),
        ollama_api_key: oKey !== null ? oKey : prev.ollama_api_key,
        ollama_base_url: oUrl !== null ? oUrl : (prev.ollama_base_url || "https://ollama.com"),
        ollama_model: oModel !== null ? oModel : (prev.ollama_model || "ollamacloud/gemma4:31b"),
        ai_provider: (prov as AppSettings["ai_provider"]) || prev.ai_provider || "groq",
        telegram_bot_token: tgToken !== null ? tgToken : prev.telegram_bot_token,
        telegram_chat_id: tgChat !== null ? tgChat : prev.telegram_chat_id,
        telegram_enabled: tgEnabled !== null ? tgEnabled === "true" : (prev.telegram_enabled ?? true),
      }));
    } catch {}
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // 2. Persist to browser localStorage
    try {
      localStorage.setItem("trackmed_groq_api_key", settings.groq_api_key || "");
      localStorage.setItem("trackmed_groq_model", settings.groq_model || "openai/gpt-oss-120b");
      localStorage.setItem("trackmed_ollama_api_key", settings.ollama_api_key || "");
      localStorage.setItem("trackmed_ollama_base_url", settings.ollama_base_url || "https://ollama.com");
      localStorage.setItem("trackmed_ollama_model", settings.ollama_model || "ollamacloud/gemma4:31b");
      localStorage.setItem("trackmed_ai_provider", settings.ai_provider || "groq");
      localStorage.setItem("trackmed_telegram_bot_token", settings.telegram_bot_token || "");
      localStorage.setItem("trackmed_telegram_chat_id", settings.telegram_chat_id || "");
      localStorage.setItem("trackmed_telegram_enabled", settings.telegram_enabled ? "true" : "false");
    } catch {}

    // 3. Save standard settings to server safely
    startTransition(async () => {
      try {
        await updateSettingsAction({
          default_apollo_lead_min: Number(settings.default_apollo_lead_min),
          default_apollo_lead_max: Number(settings.default_apollo_lead_max),
          default_mr_med_lead_min: Number(settings.default_mr_med_lead_min),
          default_mr_med_lead_max: Number(settings.default_mr_med_lead_max),
          default_offline_lead_min: Number(settings.default_offline_lead_min),
          default_offline_lead_max: Number(settings.default_offline_lead_max),
          default_safety_buffer_days: Number(settings.default_safety_buffer_days),
          app_passcode: settings.app_passcode?.trim() || null,
          reminder_email: settings.reminder_email?.trim() || null,
          reminder_time: settings.reminder_time || "08:00",
          reminders_enabled: settings.reminders_enabled,
          telegram_bot_token: settings.telegram_bot_token?.trim() || null,
          telegram_chat_id: settings.telegram_chat_id?.trim() || null,
          telegram_enabled: settings.telegram_enabled,
        });
      } catch {}

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    });
  };

  const handleTestAi = async () => {
    setTestAiResult("Testing natural language intent extraction...");
    try {
      const clientConfig = {
        groq_api_key: settings.groq_api_key || undefined,
        groq_model: settings.groq_model || undefined,
        ollama_api_key: settings.ollama_api_key || undefined,
        ollama_base_url: settings.ollama_base_url || undefined,
        ollama_model: settings.ollama_model || undefined,
        ai_provider: settings.ai_provider || undefined,
      };

      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Bought 4 strips of Cardio-Guard 40 from Apollo for 480",
          ...clientConfig,
        }),
      });
      const json = await res.json();
      if (json.success && json.payload) {
        setTestAiResult(
          `Success [${json.source}]: ${json.payload.summary_explanation}`
        );
      } else {
        setTestAiResult(`Notice: ${json.error || "Failed to decode intent."}`);
      }
    } catch (err: unknown) {
      setTestAiResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleTestTelegram = async () => {
    const token = settings.telegram_bot_token?.trim();
    const chatId = settings.telegram_chat_id?.trim();

    if (!token || !chatId) {
      setTestTelegramResult("Notice: Please enter both Bot Token and Chat ID first.");
      return;
    }

    setIsTestingTelegram(true);
    setTestTelegramResult("Sending test ping to Telegram...");
    try {
      const res = await sendTestTelegramAction(token, chatId);
      if (res.success) {
        setTestTelegramResult(`Success: Test ping delivered to Telegram! (Message ID: ${res.messageId})`);
      } else {
        setTestTelegramResult(`Failed: ${res.error || "Could not reach Telegram API."}`);
      }
    } catch (err: unknown) {
      setTestTelegramResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleTestCron = async () => {
    setTestCronResult("Triggering reminder engine...");
    try {
      const res = await fetch("/api/cron/daily-digest");
      const json = await res.json();
      if (json.success) {
        const tgInfo = json.dispatches?.telegram;
        const emailInfo = json.dispatches?.email;
        const tgPart = tgInfo?.attempted
          ? tgInfo.success
            ? "Telegram: Sent"
            : `Telegram: Failed (${tgInfo.error})`
          : "Telegram: Off";
        const emailPart = emailInfo?.attempted
          ? emailInfo.success
            ? "Email: Sent"
            : `Email: Failed (${emailInfo.error})`
          : "Email: Off";
        setTestCronResult(
          `Evaluated ${json.alerts_count} alert(s). [${tgPart} | ${emailPart}]`
        );
      } else {
        setTestCronResult(`Notice: ${json.error || json.message || "Completed evaluation."}`);
      }
    } catch (err: unknown) {
      setTestCronResult(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3 font-sans">
          <SettingsIcon className="h-7 w-7 text-[#ff385c]" />
          <span>Settings</span>
        </h1>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-7 py-2.5 text-sm font-semibold liquid-btn-primary rounded-full shadow-lg transition-all spring-tap disabled:opacity-50"
        >
          <Check className="h-4 w-4 stroke-[2.5]" />
          <span>{isPending ? "Saving..." : saveSuccess ? "Saved to Browser!" : "Save Settings"}</span>
        </button>
      </div>

      {/* 1. Groq & Ollama Cloud AI Settings (Browser Storage) */}
      <section className="liquid-glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-[#ff385c]/15 text-[#ff4d6d] border border-[#ff385c]/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">AI Engine (Browser Storage)</h2>
          </div>
          <span className="text-[10px] font-mono text-[#34d399] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-bold">
            Client Local Storage
          </span>
        </div>

        <div className="space-y-4">
          {/* Provider Tabs */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                const prov = "groq";
                setSettings({ ...settings, ai_provider: prov });
                try { localStorage.setItem("trackmed_ai_provider", prov); } catch {}
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all spring-tap ${
                settings.ai_provider === "groq" || !settings.ai_provider
                  ? "border-[#ff385c] bg-[#ff385c]/15 text-white ring-1 ring-[#ff385c]/40 shadow-lg shadow-[#ff385c]/15"
                  : "border-white/10 bg-black/30 text-[#94a3b8] hover:border-white/20"
              }`}
            >
              <div className="font-bold text-white flex items-center gap-2 text-xs sm:text-sm">
                <Cpu className="h-4 w-4 text-[#ff385c]" />
                <span>Groq LPU</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                const prov = "ollama";
                setSettings({ ...settings, ai_provider: prov });
                try { localStorage.setItem("trackmed_ai_provider", prov); } catch {}
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all spring-tap ${
                settings.ai_provider === "ollama"
                  ? "border-[#38bdf8] bg-[#38bdf8]/15 text-white ring-1 ring-[#38bdf8]/40 shadow-lg shadow-[#38bdf8]/15"
                  : "border-white/10 bg-black/30 text-[#94a3b8] hover:border-white/20"
              }`}
            >
              <div className="font-bold text-white flex items-center gap-2 text-xs sm:text-sm">
                <Globe className="h-4 w-4 text-[#38bdf8]" />
                <span>Ollama Cloud</span>
              </div>
            </button>
          </div>

          {/* GROQ CONFIGURATION */}
          {(settings.ai_provider === "groq" || !settings.ai_provider) && (
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                    Groq API Key
                  </label>
                  <input
                    type="password"
                    placeholder="gsk_..."
                    value={settings.groq_api_key || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings({ ...settings, groq_api_key: val });
                      try { localStorage.setItem("trackmed_groq_api_key", val); } catch {}
                    }}
                    className="w-full liquid-glass-input rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                    Model Name
                  </label>
                  <input
                    type="text"
                    placeholder="openai/gpt-oss-120b"
                    value={settings.groq_model || "openai/gpt-oss-120b"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings({ ...settings, groq_model: val });
                      try { localStorage.setItem("trackmed_groq_model", val); } catch {}
                    }}
                    className="w-full liquid-glass-input rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Groq Presets */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider mr-1">
                  Groq Models:
                </span>
                {GROQ_PRESETS.map((p) => {
                  const isSelected = (settings.groq_model || "openai/gpt-oss-120b") === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSettings({ ...settings, groq_model: p.id });
                        try { localStorage.setItem("trackmed_groq_model", p.id); } catch {}
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all spring-tap ${
                        isSelected
                          ? "bg-[#ff385c] text-white font-bold shadow-sm"
                          : "bg-white/5 hover:bg-white/10 text-[#cbd5e1] border border-white/10"
                      }`}
                    >
                      {p.id}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* OLLAMA CONFIGURATION */}
          {settings.ai_provider === "ollama" && (
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                    Ollama Base URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://ollama.com"
                    value={settings.ollama_base_url || "https://ollama.com"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings({ ...settings, ollama_base_url: val });
                      try { localStorage.setItem("trackmed_ollama_base_url", val); } catch {}
                    }}
                    className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    placeholder="Bearer token or leave empty"
                    value={settings.ollama_api_key || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings({ ...settings, ollama_api_key: val });
                      try { localStorage.setItem("trackmed_ollama_api_key", val); } catch {}
                    }}
                    className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                    Model Name
                  </label>
                  <input
                    type="text"
                    placeholder="ollamacloud/gemma4:31b"
                    value={settings.ollama_model || "ollamacloud/gemma4:31b"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings({ ...settings, ollama_model: val });
                      try { localStorage.setItem("trackmed_ollama_model", val); } catch {}
                    }}
                    className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Ollama Presets */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider mr-1">
                  Ollama Cloud Models:
                </span>
                {OLLAMA_PRESETS.map((p) => {
                  const isSelected = (settings.ollama_model || "ollamacloud/gemma4:31b") === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSettings({ ...settings, ollama_model: p.id });
                        try { localStorage.setItem("trackmed_ollama_model", p.id); } catch {}
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all spring-tap ${
                        isSelected
                          ? "bg-[#38bdf8] text-black font-bold shadow-sm"
                          : "bg-white/5 hover:bg-white/10 text-[#cbd5e1] border border-white/10"
                      }`}
                    >
                      {p.id}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Test AI */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleTestAi}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white liquid-glass-pill rounded-full transition-colors spring-tap"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#ff385c]" />
              <span>Test AI Intent Parser</span>
            </button>
          </div>

          {testAiResult && (
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono text-[#34d399] leading-relaxed">
              {testAiResult}
            </div>
          )}
        </div>
      </section>

      {/* 2. Channel Lead Times */}
      <section className="liquid-glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <div className="p-2 rounded-2xl bg-[#ff385c]/15 text-[#ff4d6d] border border-[#ff385c]/30">
            <Building2 className="h-5 w-5" />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">Channel Lead Times</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Apollo */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-2">
            <span className="font-bold text-xs text-white block">Apollo 24|7 (Online)</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#94a3b8] block mb-0.5">Min Days</label>
                <input
                  type="number"
                  min="0"
                  value={settings.default_apollo_lead_min}
                  onChange={(e) =>
                    setSettings({ ...settings, default_apollo_lead_min: parseInt(e.target.value) || 0 })
                  }
                  className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#94a3b8] block mb-0.5">Max Days</label>
                <input
                  type="number"
                  min="1"
                  value={settings.default_apollo_lead_max}
                  onChange={(e) =>
                    setSettings({ ...settings, default_apollo_lead_max: parseInt(e.target.value) || 1 })
                  }
                  className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Mr. Med */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-2">
            <span className="font-bold text-xs text-white block">Mr. Med (Online)</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#94a3b8] block mb-0.5">Min Days</label>
                <input
                  type="number"
                  min="0"
                  value={settings.default_mr_med_lead_min}
                  onChange={(e) =>
                    setSettings({ ...settings, default_mr_med_lead_min: parseInt(e.target.value) || 0 })
                  }
                  className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#94a3b8] block mb-0.5">Max Days</label>
                <input
                  type="number"
                  min="1"
                  value={settings.default_mr_med_lead_max}
                  onChange={(e) =>
                    setSettings({ ...settings, default_mr_med_lead_max: parseInt(e.target.value) || 1 })
                  }
                  className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Offline Store */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-2">
            <span className="font-bold text-xs text-white block">Offline Local Store</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#94a3b8] block mb-0.5">Min Days</label>
                <input
                  type="number"
                  min="0"
                  value={settings.default_offline_lead_min}
                  onChange={(e) =>
                    setSettings({ ...settings, default_offline_lead_min: parseInt(e.target.value) || 0 })
                  }
                  className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#94a3b8] block mb-0.5">Max Days</label>
                <input
                  type="number"
                  min="0"
                  value={settings.default_offline_lead_max}
                  onChange={(e) =>
                    setSettings({ ...settings, default_offline_lead_max: parseInt(e.target.value) || 0 })
                  }
                  className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Global Safety Buffer */}
        <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between">
          <span className="text-xs font-bold text-white">Global Safety Buffer</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="14"
              value={settings.default_safety_buffer_days}
              onChange={(e) =>
                setSettings({ ...settings, default_safety_buffer_days: parseInt(e.target.value) || 0 })
              }
              className="w-16 liquid-glass-input rounded-xl px-2.5 py-1 text-xs text-white font-mono text-center font-bold"
            />
            <span className="text-xs text-[#94a3b8] font-mono">days</span>
          </div>
        </div>
      </section>

      {/* 3. Telegram Bot Notifications */}
      <section className="liquid-glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-[#0088cc]/15 text-[#38bdf8] border border-[#0088cc]/30">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Telegram Daily Briefing</h2>
              <p className="text-[11px] text-[#94a3b8]">Quiet daily summary delivered directly to your Telegram chat</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSettings({ ...settings, telegram_enabled: !(settings.telegram_enabled ?? true) })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.telegram_enabled !== false ? "bg-[#38bdf8]" : "bg-white/20"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.telegram_enabled !== false ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                Telegram Bot Token
              </label>
              <input
                type="password"
                placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                value={settings.telegram_bot_token || ""}
                onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                className="w-full liquid-glass-input rounded-xl px-3.5 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                Your Chat ID
              </label>
              <input
                type="text"
                placeholder="e.g. 987654321"
                value={settings.telegram_chat_id || ""}
                onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                className="w-full liquid-glass-input rounded-xl px-3.5 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Setup Guide */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-1.5 text-[11px] text-[#94a3b8] leading-relaxed">
            <div className="font-bold text-[#cbd5e1] flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-[#38bdf8]" />
              <span>Quick 2-Step Telegram Setup:</span>
            </div>
            <p>
              1. Open <strong className="text-white">@BotFather</strong> on Telegram, send <code className="text-[#38bdf8]">/newbot</code>, and copy the HTTP API Token into the field above.
            </p>
            <p>
              2. Open your new bot (or <strong className="text-white">@userinfobot</strong>) on Telegram, click <strong className="text-white">Start</strong>, and paste your numerical Chat ID.
            </p>
          </div>

          {/* Test Telegram Action */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={isTestingTelegram}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white liquid-glass-pill rounded-full transition-colors spring-tap disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5 text-[#38bdf8]" />
              <span>{isTestingTelegram ? "Sending..." : "Send Test Ping to Telegram"}</span>
            </button>
          </div>

          {testTelegramResult && (
            <div
              className={`p-3 rounded-2xl border text-xs font-mono leading-relaxed ${
                testTelegramResult.startsWith("Success")
                  ? "bg-emerald-950/40 border-emerald-500/30 text-[#34d399]"
                  : testTelegramResult.startsWith("Notice")
                  ? "bg-amber-950/40 border-amber-500/30 text-[#fbbf24]"
                  : "bg-rose-950/40 border-rose-500/30 text-[#f87171]"
              }`}
            >
              {testTelegramResult}
            </div>
          )}
        </div>
      </section>

      {/* 4. Daily Schedule & Email Digest */}
      <section className="liquid-glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-[#ff385c]/15 text-[#ff4d6d] border border-[#ff385c]/30">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Daily Schedule & Email Digest</h2>
              <p className="text-[11px] text-[#94a3b8]">Automated 24h stock evaluation and optional email dispatch</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSettings({ ...settings, reminders_enabled: !settings.reminders_enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.reminders_enabled ? "bg-[#ff385c]" : "bg-white/20"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.reminders_enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                Recipient Email (Optional)
              </label>
              <input
                type="email"
                placeholder="your.email@gmail.com"
                value={settings.reminder_email || ""}
                onChange={(e) => setSettings({ ...settings, reminder_email: e.target.value })}
                className="w-full liquid-glass-input rounded-xl px-3.5 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                Dispatch Time (Daily)
              </label>
              <input
                type="time"
                value={settings.reminder_time}
                onChange={(e) => setSettings({ ...settings, reminder_time: e.target.value })}
                className="w-full liquid-glass-input rounded-xl px-3.5 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleTestCron}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white liquid-glass-pill rounded-full transition-colors spring-tap"
            >
              <Send className="h-3.5 w-3.5 text-[#ff385c]" />
              <span>Run Test Briefing Dispatch</span>
            </button>
          </div>

          {testCronResult && (
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono text-[#38bdf8]">
              {testCronResult}
            </div>
          )}
        </div>
      </section>

      {/* 5. Supabase Database Schema */}
      <section className="liquid-glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#ff385c]/15 text-[#ff4d6d] border border-[#ff385c]/30">
              <Database className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">Supabase Schema</h2>
          </div>

          <button
            type="button"
            onClick={handleCopySql}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white liquid-glass-pill rounded-full transition-colors spring-tap"
          >
            {copiedSql ? <Check className="h-3.5 w-3.5 text-[#34d399]" /> : <Copy className="h-3.5 w-3.5 text-[#94a3b8]" />}
            <span>{copiedSql ? "Copied!" : "Copy SQL"}</span>
          </button>
        </div>

        <div className="relative rounded-2xl bg-black/50 border border-white/10 p-4 font-mono text-[11px] text-[#cbd5e1] max-h-48 overflow-y-auto">
          <pre>{sqlSchema}</pre>
        </div>
      </section>
    </form>
  );
}
