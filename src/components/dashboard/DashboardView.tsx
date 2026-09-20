"use client";

import { useState, useMemo } from "react";
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  Pill,
} from "lucide-react";
import Link from "next/link";
import { AICommandPayload, CalculatedMedicineState, DashboardSummary } from "@/lib/types";
import { StatCards } from "./StatCards";
import { UrgentAlertBanner } from "./UrgentAlertBanner";
import { MedicineCard } from "./MedicineCard";
import { MedicineTableView } from "./MedicineTableView";
import { QuickRestockModal } from "./QuickRestockModal";
import { QuickAdjustModal } from "./QuickAdjustModal";
import { AIAssistantBar } from "./AIAssistantBar";
import { AIConfirmationModal } from "./AIConfirmationModal";

interface DashboardViewProps {
  initialData: DashboardSummary;
}

export function DashboardView({ initialData }: DashboardViewProps) {
  const [medicines, setMedicines] = useState<CalculatedMedicineState[]>(initialData.medicines);
  const [summary, setSummary] = useState(initialData.summary);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"urgency" | "days_left" | "name" | "stock">("urgency");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [selectedForRestock, setSelectedForRestock] = useState<CalculatedMedicineState | null>(null);
  const [selectedForAdjust, setSelectedForAdjust] = useState<CalculatedMedicineState | null>(null);
  const [pendingAICommand, setPendingAICommand] = useState<AICommandPayload | null>(null);

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
        if (statusFilter === "URGENT") {
          return item.urgency === "CRITICAL" || item.urgency === "ORDER_NOW" || item.urgency === "ORDER_SOON";
        }
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
      {/* 1. AI Natural Language Voice/Text Command Bar */}
      <AIAssistantBar onParsedCommand={(payload) => setPendingAICommand(payload)} />

      {/* 2. Top Filter Chips & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <StatCards
          summary={summary}
          activeFilter={statusFilter}
          onSelectFilter={(f) => setStatusFilter(f)}
        />

        {/* Liquid Glass View Mode Switcher */}
        <div className="flex items-center gap-1 p-1 liquid-glass-pill rounded-full shrink-0 self-end sm:self-auto">
          <button
            onClick={() => setViewMode("grid")}
            title="Grid View"
            className={`p-2 rounded-full transition-all spring-tap ${
              viewMode === "grid" ? "bg-white/20 text-white shadow-sm" : "text-[#94a3b8] hover:text-white"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            title="Dense Table View"
            className={`p-2 rounded-full transition-all spring-tap ${
              viewMode === "table" ? "bg-white/20 text-white shadow-sm" : "text-[#94a3b8] hover:text-white"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 3. Urgent Alert Banner */}
      <UrgentAlertBanner
        medicines={medicines}
        onRestockClick={(item) => setSelectedForRestock(item)}
      />

      {/* 4. Liquid Glass Search Bar */}
      <div className="liquid-glass-panel rounded-full h-16 p-2 shadow-2xl flex items-center justify-between transition-all">
        {/* Search Input */}
        <div className="flex-1 flex items-center px-4 sm:px-6">
          <Search className="h-4 w-4 text-[#94a3b8] mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Filter medicine by name, dose, or strength..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-[13px] text-white placeholder:text-[#64748b] focus:outline-none font-medium"
          />
        </div>

        {/* Divider hairline */}
        <div className="hidden sm:block h-7 w-[1px] bg-white/10" />

        {/* Sort selector */}
        <div className="hidden sm:flex items-center px-6 text-xs">
          <span className="text-[#94a3b8] mr-2 font-medium">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-transparent text-[13px] text-white font-semibold focus:outline-none cursor-pointer"
          >
            <option value="urgency" className="bg-[#10141e] text-white">Urgency (Lowest stock)</option>
            <option value="days_left" className="bg-[#10141e] text-white">Days Left</option>
            <option value="stock" className="bg-[#10141e] text-white">Current Stock</option>
            <option value="name" className="bg-[#10141e] text-white">Name (A–Z)</option>
          </select>
        </div>
      </div>

      {/* 5. Main Content: Grid or Table View */}
      {filteredMedicines.length === 0 ? (
        <div className="rounded-3xl liquid-glass-panel p-12 text-center shadow-2xl">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-3 border border-white/15">
            <Pill className="h-7 w-7 text-[#ff385c]" />
          </div>
          <h3 className="text-lg font-bold text-white">No medicines found</h3>
          <p className="text-[13px] text-[#94a3b8] max-w-sm mx-auto mt-1">
            {searchQuery || statusFilter !== "all"
              ? "No medicines match your current filter or search terms."
              : "Get started by adding your prescription medicines to forecast lead times."}
          </p>
          <div className="mt-5">
            <Link
              href="/medicines/new"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-[14px] font-semibold liquid-btn-primary rounded-full shadow-md transition-all spring-tap"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add First Medicine</span>
            </Link>
          </div>
        </div>
      ) : viewMode === "grid" ? (
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
      ) : (
        <MedicineTableView
          medicines={filteredMedicines}
          onRestockClick={(it) => setSelectedForRestock(it)}
          onAdjustClick={(it) => setSelectedForAdjust(it)}
        />
      )}

      {/* AI Intent Confirmation Modal */}
      {pendingAICommand && (
        <AIConfirmationModal
          payload={pendingAICommand}
          medicines={medicines}
          onClose={() => setPendingAICommand(null)}
          onSuccess={() => window.location.reload()}
        />
      )}

      {/* Manual Modals */}
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
