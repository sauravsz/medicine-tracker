import { Navbar } from "@/components/layout/Navbar";
import { MedicineDetailView } from "@/components/medicines/MedicineDetailView";
import { getMedicineDetailsAction } from "@/app/actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MedicinePage({ params }: PageProps) {
  const { id } = await params;
  const data = await getMedicineDetailsAction(id);

  if (!data || !data.full || !data.state) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MedicineDetailView data={{ full: data.full, state: data.state }} />
      </main>
    </div>
  );
}
