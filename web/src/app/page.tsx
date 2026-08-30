import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-extrabold leading-tight">
          Flood Emergency Response Recommendation
        </h1>
        <p className="mt-3 text-lg text-muted">
          Report the flood situation in a township. FERRS assesses how serious it is, tells you
          what to do, and picks the nearest suitable rescue boat and shelter — and shows you why.
          A person still makes the final call.
        </p>

        <div className="mt-8 grid gap-4">
          <Link
            href="/report"
            data-btn
            className="rounded-2xl bg-accent-ink px-6 py-6 text-xl font-extrabold text-white"
          >
            Report a flood situation →
          </Link>
          <Link
            href="/overview"
            data-btn
            className="rounded-2xl border-2 border-border bg-surface px-6 py-6 text-xl font-extrabold"
          >
            Regional overview →
          </Link>
        </div>

        <p className="mt-10 text-sm text-muted">
          Prototype for the Ayeyarwady Delta, Myanmar. Reasoning is rule-based (no machine
          learning). Fleet, shelter, and gauge data are simulated for this version.
        </p>
      </main>
    </>
  );
}
