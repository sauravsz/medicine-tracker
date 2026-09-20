import { Navbar } from "@/components/layout/Navbar";
import { SettingsView } from "@/components/settings/SettingsView";
import { getSettings } from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  let sqlSchema = "";
  try {
    const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
    if (fs.existsSync(schemaPath)) {
      sqlSchema = fs.readFileSync(schemaPath, "utf-8");
    }
  } catch (e) {
    sqlSchema = "-- Schema file located at supabase/schema.sql";
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SettingsView initialSettings={settings} sqlSchema={sqlSchema} />
      </main>
    </div>
  );
}
