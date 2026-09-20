"use client";

import { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Pill,
  ArrowUpDown,
  Filter,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { CalculatedMedicineState, DashboardSummary } from "@/lib/types";
import { StatCards } from "./StatCards";
import { UrgentAlertBanner } from "./UrgentAlertBanner";
import { MedicineCard } from "./MedicineCard";
import { QuickRestockModal } from "./QuickRestockModal";
import { QuickAdjustModal } from "./QuickAdjustModal";

interface DashboardViewProps {
  initialData: DashboardSummary;
}

export function DashboardView({ initialData }: DashboardViewProps) {
  const [medicines, setMedicines] = useState<CalculatedMedicineState[]>(initialData.medicines);
  const [summary, setSummary] = useState(initialData.summary);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"urgency" | "days_left" | "name" | "stock">("urgency");

  const [selectedForRestock, setSelectedForRestock] = useState<CalculatedMedicineState | null>(null);
  const [selectedForAdjust, setSelectedForAdjust] = useState<CalculatedMedicineState | null>(null);

  // Filter & sort logic
  const filteredMedicines = useMemo(() => {
    return medicines
      .filter((item) => {
        const matchesSearch =
          item.medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.medicine.strength &&
            item.medicine.strength.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        if (statusFilter === "all") return true;
        if (statusFilter === "IN_TRANSIT") return item.in_transit.orders.length > 0;
        return item.urgency === statusFilter;
      })
      .sort((a, b) => {
        if (sortBy === "urgency") {
          const urgencyWeight = { CRITICAL: 0, ORDER_NOW: 1, ORDER_SOON: 2, OK: 3 };
          const diff = urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
          if (diff !== 0) return diff;
          return a.days_remaining - b.days_remaining;
        }
        if (sortBy === "days_left") {
          return a.days_remaining - b.days_remaining;
        }
        if (sortBy === "stock") {
          return a.on_hand_stock - b.on_hand_stock;
        }
        if (sortBy === "name") {
          return a.medicine.name.localeCompare(b.medicine.name);
        }
        return 0;
      });
  }, [medicines, searchQuery, statusFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Stat Summary Cards */}
      <StatCards
        summary={summary}
        activeFilter={statusFilter}
        onSelectFilter={(f) => setStatusFilter(f)}
      />

      {/* Urgent Alert Banner */}
      <UrgentAlertBanner
        medicines={medicines}
        onRestockClick={(item) => setSelectedForRestock(item)}
      />

      {/* Airbnb Signature Pill Search Bar */}
      <div className="bg-white rounded-full border border-[#dddddd] h-16 p-2 airbnb-search-shadow flex items-center justify-between transition-all hover:border-[#c1c1c1]">
        {/* Segment 1: Search Name */}
        <div className="flex-1 flex items-center px-4 sm:px-6">
          <div className="w-full">
            <span className="block text-[11px] font-bold text-[#222222] uppercase tracking-wider">
              Search Medicine
            </span>
            <input
              type="text"
              placeholder="Thyronorm, Telma 40, Glycomet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-[13px] text-[#222222] placeholder:text-[#929292] focus:outline-none -mt-0.5 font-medium"
            />
          </div>
        </div>

        {/* Divider hairline */}
        <div className="hidden sm:block h-8 w-[1px] bg-[#ebebeb]" />

        {/* Segment 2: Sort */}
        <div className="hidden sm:flex items-center px-6">
          <div>
            <span className="block text-[11px] font-bold text-[#222222] uppercase tracking-wider">
              Sort By
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-transparent text-[13px] text-[#3f3f3f] font-medium focus:outline-none cursor-pointer -mt-0.5"
            >
              <option value="urgency">Urgency (Critical first)</option>
              <option value="days_left">Days Left (Lowest)</option>
              <option value="stock">On-hand Stock</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Divider hairline */}
        <div className="hidden md:block h-8 w-[1px] bg-[#ebebeb]" />

        {/* Segment 3: Filter */}
        <div className="hidden md:flex items-center px-6">
          <div>
            <span className="block text-[11px] font-bold text-[#222222] uppercase tracking-wider">
              Filter Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-[13px] text-[#3f3f3f] font-medium focus:outline-none cursor-pointer -mt-0.5"
            >
              <option value="all">All Medicines</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="ORDER_NOW">Order Now (Offline)</option>
              <option value="ORDER_SOON">Order Soon (Mr. Med)</option>
              <option value="OK">Healthy Stock (OK)</option>
              <option value="IN_TRANSIT">In Transit</option>
            </select>
          </div>
        </div>

        {/* Search Orb (Airbnb signature Rausch orb) */}
        <div className="h-12 w-12 rounded-full bg-[#ff385c] hover:bg-[#e00b41] text-white flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95 cursor-pointer">
          <Search className="h-4 w-4 stroke-[2.5]" />
        </div>
      </div>

      {/* Grid of Medicines */}
      {filteredMedicines.length === 0 ? (
        <div className="rounded-3xl border border-[#ebebeb] bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-14 w-14 rounded-full bg-[#f7f7f7] flex items-center justify-center text-[#6a6a6a] mb-3">
            <Pill className="h-7 w-7 text-[#ff385c]" />
          </div>
          <h3 className="text-lg font-bold text-[#222222]">No medicines found</h3>
          <p className="text-[13px] text-[#6a6a6a] max-w-sm mx-auto mt-1">
            {searchQuery || statusFilter !== "all"
              ? "No medicines match your current filter or search terms."
              : "Get started by adding your prescription medicines to forecast lead times."}
          </p>
          <div className="mt-5">
            <Link
              href="/medicines/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-white bg-[#ff385c] hover:bg-[#e00b41] rounded-full shadow-sm transition-all"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add First Medicine</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMedicines.map((item) => (
            <MedicineCard
              key={item.medicine.id}
              item={item}
              onRestockClick={(it) => setSelectedForRestock(it)}
              onAdjustClick={(it) => setSelectedForAdjust(it)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedForRestock && (
        <QuickRestockModal
          item={selectedForRestock}
          onClose={() => setSelectedForRestock(null)}
          onSuccess={() => window.location.reload()}
        />
      )}

      {selectedForAdjust && (
        <QuickAdjustModal
          item={selectedForAdjust}
          onClose={() => setSelectedForAdjust(null)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}
