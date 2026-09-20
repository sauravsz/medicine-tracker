import { Navbar } from "@/components/layout/Navbar";
import { MonthlyPlanningView } from "@/components/planning/MonthlyPlanningView";
import { getDashboardData } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MonthlyPlanningView medicines={data.medicines} />
      </main>
    </div>
  );
}
