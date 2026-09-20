import { Navbar } from "@/components/layout/Navbar";
import { MedicineForm } from "@/components/medicines/MedicineForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NewMedicinePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-teal-300 transition-colors mb-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Add New Medicine</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure dosage schedule, packaging units, and channel lead times for automated inventory forecasting.
          </p>
        </div>

        <MedicineForm />
      </main>
    </div>
  );
}
