"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Pill,
  LayoutDashboard,
  CalendarDays,
  Settings as SettingsIcon,
  Plus,
  RotateCcw,
} from "lucide-react";
import { seedSampleDataAction } from "@/app/actions";
import { useState, useTransition } from "react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [seeded, setSeeded] = useState(false);

  const handleSeed = () => {
    startTransition(async () => {
      await seedSampleDataAction();
      setSeeded(true);
      router.refresh();
      window.location.reload();
    });
  };

  const navItems = [
    { label: "Inventory", href: "/", icon: LayoutDashboard, isNew: false },
    { label: "Monthly Planning", href: "/planning", icon: CalendarDays, isNew: true },
    { label: "Settings", href: "/settings", icon: SettingsIcon, isNew: false },
  ];

  return (
    <header className="sticky top-0 z-40 w-full liquid-glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo with Liquid Glass Lens */}
        <Link href="/" className="flex items-center gap-3 group spring-tap">
          <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-[#ff385c] via-[#e00b41] to-[#92174d] p-0.5 shadow-lg shadow-[#ff385c]/30 group-hover:scale-105 transition-transform">
            <div className="h-full w-full bg-[#0a0e18]/80 backdrop-blur-md rounded-[14px] flex items-center justify-center border border-white/20">
              <Pill className="h-5 w-5 text-[#ff385c] group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div>
            <span className="font-bold text-[20px] tracking-tight text-white flex items-center gap-1.5 font-sans">
              medtrack
            </span>
            <p className="text-[11px] text-[#94a3b8] -mt-1 font-medium tracking-tight">
              multi-channel reorder system
            </p>
          </div>
        </Link>

        {/* Centered Product Tabs with Fluid Underline */}
        <nav className="hidden md:flex items-center gap-2 h-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 rounded-full text-[14px] font-semibold flex items-center gap-2 transition-all spring-tap ${
                  isActive
                    ? "bg-white/10 text-white border border-white/15 shadow-sm shadow-black/20"
                    : "text-[#94a3b8] hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-[#ff385c]" : "text-[#94a3b8]"}`} />
                <span>{item.label}</span>
                {item.isNew && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#ff385c]/20 border border-[#ff385c]/30 text-[9px] font-bold text-[#ff4d6d] uppercase tracking-wider">
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={isPending}
            title="Reload 15 user prescription medicines"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-[#cbd5e1] hover:text-white liquid-glass-pill rounded-full transition-all spring-tap"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isPending ? "animate-spin text-[#ff385c]" : "text-[#94a3b8]"}`} />
            <span>{seeded ? "Loaded!" : "Reset Prescription"}</span>
          </button>

          <Link
            href="/medicines/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold liquid-btn-primary rounded-full transition-all spring-tap"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add Medicine</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
