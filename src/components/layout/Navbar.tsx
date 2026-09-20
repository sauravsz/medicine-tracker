"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Pill,
  LayoutDashboard,
  CalendarDays,
  Settings as SettingsIcon,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { seedSampleDataAction } from "@/app/actions";
import { useState, useTransition } from "react";

export function Navbar() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [seeded, setSeeded] = useState(false);

  const handleSeed = () => {
    startTransition(async () => {
      await seedSampleDataAction();
      setSeeded(true);
      setTimeout(() => setSeeded(false), 3000);
    });
  };

  const navItems = [
    { label: "Inventory", href: "/", icon: LayoutDashboard, isNew: false },
    { label: "Monthly Planning", href: "/planning", icon: CalendarDays, isNew: true },
    { label: "Settings", href: "/settings", icon: SettingsIcon, isNew: false },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#ebebeb] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-10 w-10 rounded-full bg-[#ff385c] flex items-center justify-center text-white shadow-md shadow-[#ff385c]/25 group-hover:scale-105 transition-transform">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-[19px] tracking-tight text-[#ff385c] flex items-center gap-1.5">
              medtrack
            </span>
            <p className="text-[11px] text-[#6a6a6a] -mt-1 font-medium tracking-tight">
              lead-time reorder system
            </p>
          </div>
        </Link>

        {/* Center Product Navigation Tabs (Airbnb style with 2px underline rule) */}
        <nav className="hidden md:flex items-center gap-8 h-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 text-[15px] h-full transition-colors ${
                  isActive
                    ? "text-[#222222] font-semibold"
                    : "text-[#6a6a6a] font-medium hover:text-[#222222]"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-[#ff385c]" : "text-[#6a6a6a]"}`} />
                <span>{item.label}</span>
                {item.isNew && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-[9px] font-bold text-[#222222] uppercase tracking-wider">
                    NEW
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#222222] rounded-t-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Utilities */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={isPending}
            title="Load sample medicines with real dosage schedules"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-[#222222] hover:bg-[#f7f7f7] rounded-full transition-colors border border-[#dddddd]"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isPending ? "animate-spin text-[#ff385c]" : "text-[#6a6a6a]"}`} />
            <span>{seeded ? "Loaded!" : "Load Sample Meds"}</span>
          </button>

          <Link
            href="/medicines/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-white bg-[#ff385c] hover:bg-[#e00b41] active:scale-98 rounded-full shadow-sm transition-all"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add Medicine</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
