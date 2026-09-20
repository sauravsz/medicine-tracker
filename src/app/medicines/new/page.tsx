import { Navbar } from "@/components/layout/Navbar";
import { MedicineForm } from "@/components/medicines/MedicineForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NewMedicinePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#090c14] text-white">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#94a3b8] hover:text-white transition-colors mb-2 spring-tap"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Inventory</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Add New Medicine</h1>
        </div>

        <MedicineForm />
      </main>
    </div>
  );
}
