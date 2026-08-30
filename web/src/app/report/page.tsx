import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { FloodReportForm } from "@/components/FloodReportForm";

export const metadata = { title: "Report a flood situation — AQUA" };

export default function ReportPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-8">
        <Link href="/" className="text-sm font-semibold text-accent-ink underline">
          ← Home
        </Link>
        <h1 className="mt-3 text-2xl font-extrabold">Report a flood situation</h1>
        <p className="mt-2 text-muted">
          Answer what you can see from where you are. Everything is a choice — no typing needed
          except the number of people.
        </p>
        <div className="mt-6">
          <FloodReportForm />
        </div>
      </main>
    </>
  );
}
