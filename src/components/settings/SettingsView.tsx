"use client";

import { useState, useTransition } from "react";
import {
  Settings as SettingsIcon,
  Bell,
  Building2,
  Database,
  Check,
  Copy,
  Send,
} from "lucide-react";
import { AppSettings } from "@/lib/types";
import { updateSettingsAction } from "@/app/actions";

interface SettingsViewProps {
  initialSettings: AppSettings;
  sqlSchema: string;
}

export function SettingsView({ initialSettings, sqlSchema }: SettingsViewProps) {
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [copiedSql, setCopiedSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testCronResult, setTestCronResult] = useState<string | null>(null);

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
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
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    });
  };

  const handleTestCron = async () => {
    setTestCronResult("Triggering reminder engine...");
    try {
      const res = await fetch("/api/cron/daily-digest");
      const json = await res.json();
      setTestCronResult(
        json.success
          ? `Success: ${json.alerts_count} alert(s) evaluated. ${json.message}`
          : `Notice: ${json.message || "Completed evaluation."}`
      );
    } catch (err: unknown) {
      setTestCronResult(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3 font-sans">
            <SettingsIcon className="h-7 w-7 text-[#ff385c]" />
            <span>Settings & Preferences</span>
          </h1>
          <p className="text-sm text-[#94a3b8] mt-1">
            Global channel lead times, safety buffers, Supabase database migration, and daily email reminders.
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-7 py-2.5 text-sm font-semibold liquid-btn-primary rounded-full shadow-lg transition-all spring-tap disabled:opacity-50"
        >
          <Check className="h-4 w-4 stroke-[2.5]" />
          <span>{isPending ? "Saving..." : saveSuccess ? "Saved!" : "Save Settings"}</span>
        </button>
      </div>

      {/* 1. Global Channel Lead Times */}
      <section className="liquid-glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="p-2.5 rounded-2xl bg-[#ff385c]/15 text-[#ff4d6d] border border-[#ff385c]/30">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Default Channel Delivery Windows</h2>
            <p className="text-[13px] text-[#94a3b8]">
              Global delivery turnaround applied when calculating order-by deadlines
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Apollo */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
            <span className="font-bold text-xs text-white block">Apollo 24|7 (Online)</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#94a3b8] block mb-1">Min Days</label>
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
                <label className="text-[10px] font-bold text-[#94a3b8] block mb-1">Max Days</label>
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
            <p className="text-[11px] text-[#64748b]">Default: 7–10 days</p>
          </div>

          {/* Mr. Med */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
            <span className="font-bold text-xs text-white block">Mr. Med (Online)</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#94a3b8] block mb-1">Min Days</label>
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
                <label className="text-[10px] font-bold text-[#94a3b8] block mb-1">Max Days</label>
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
            <p className="text-[11px] text-[#64748b]">Default: 3–5 days</p>
          </div>

          {/* Offline Store */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
            <span className="font-bold text-xs text-white block">Offline Local Store</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#94a3b8] block mb-1">Min Days</label>
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
                <label className="text-[10px] font-bold text-[#94a3b8] block mb-1">Max Days</label>
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
            <p className="text-[11px] text-[#64748b]">Default: 0–1 days</p>
          </div>
        </div>

        {/* Global Safety Buffer */}
        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-white block">Global Safety Buffer (Days)</span>
            <p className="text-[12px] text-[#94a3b8] mt-0.5">
              Additional cushion added to lead times to prevent running out during transit delays
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="14"
              value={settings.default_safety_buffer_days}
              onChange={(e) =>
                setSettings({ ...settings, default_safety_buffer_days: parseInt(e.target.value) || 0 })
              }
              className="w-20 liquid-glass-input rounded-xl px-3 py-1.5 text-sm text-white font-mono text-center font-bold"
            />
            <span className="text-xs text-[#94a3b8] font-mono">days</span>
          </div>
        </div>
      </section>

      {/* 2. Daily Reminders & Email Digest */}
      <section className="liquid-glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="p-2.5 rounded-2xl bg-[#ff385c]/15 text-[#ff4d6d] border border-[#ff385c]/30">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Automated Daily Reorder Digest</h2>
            <p className="text-[13px] text-[#94a3b8]">
              Evaluates inventory every morning and sends a single email when any medicine requires reordering
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/5">
            <div>
              <span className="text-xs font-bold text-white block">Enable Daily Reorder Digest</span>
              <span className="text-[12px] text-[#94a3b8]">
                Only sends on days when at least one medicine has reached Yellow, Orange, or Red status
              </span>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1.5">
                Recipient Email Address
              </label>
              <input
                type="email"
                placeholder="your.email@gmail.com"
                value={settings.reminder_email || ""}
                onChange={(e) => setSettings({ ...settings, reminder_email: e.target.value })}
                className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-sm text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#cbd5e1] mb-1.5">
                Daily Cron Trigger Time
              </label>
              <input
                type="time"
                value={settings.reminder_time}
                onChange={(e) => setSettings({ ...settings, reminder_time: e.target.value })}
                className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-sm text-white font-mono"
              />
            </div>
          </div>

          {/* Test Trigger */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">Test Cron Route</span>
              <span className="text-[12px] text-[#94a3b8]">
                Executes the <code>/api/cron/daily-digest</code> inventory evaluation immediately
              </span>
            </div>
            <button
              type="button"
              onClick={handleTestCron}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white liquid-glass-pill rounded-full transition-colors spring-tap"
            >
              <Send className="h-3.5 w-3.5 text-[#ff385c]" />
              <span>Run Digest Now</span>
            </button>
          </div>

          {testCronResult && (
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-[#38bdf8]">
              {testCronResult}
            </div>
          )}
        </div>
      </section>

      {/* 3. Supabase & Database Setup */}
      <section className="liquid-glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#ff385c]/15 text-[#ff4d6d] border border-[#ff385c]/30">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Database & Supabase Deployment</h2>
              <p className="text-[13px] text-[#94a3b8]">
                One-click Supabase Postgres SQL migration script ready to paste in Supabase SQL Editor
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopySql}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white liquid-glass-pill rounded-full transition-colors spring-tap"
          >
            {copiedSql ? <Check className="h-3.5 w-3.5 text-[#34d399]" /> : <Copy className="h-3.5 w-3.5 text-[#94a3b8]" />}
            <span>{copiedSql ? "Copied SQL!" : "Copy Supabase SQL"}</span>
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-[#94a3b8] leading-relaxed">
            When you create your project on Supabase, navigate to <strong>SQL Editor</strong>, paste the schema script below and click Run. Then add your Supabase connection string to <code>DATABASE_URL</code> in Vercel.
          </p>

          <div className="relative rounded-2xl bg-black/50 border border-white/10 p-4 font-mono text-[11px] text-[#cbd5e1] max-h-60 overflow-y-auto">
            <pre>{sqlSchema}</pre>
          </div>
        </div>
      </section>
    </form>
  );
}
