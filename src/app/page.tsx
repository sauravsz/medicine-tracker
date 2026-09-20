import { Navbar } from "@/components/layout/Navbar";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { getDashboardData } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Inventory & Reorder Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Multi-channel lead-time forecasting across Apollo 24|7, Mr. Med, and Offline local chemists.
            </p>
          </div>
        </div>

        <DashboardView initialData={data} />
      </main>
    </div>
  );
}
