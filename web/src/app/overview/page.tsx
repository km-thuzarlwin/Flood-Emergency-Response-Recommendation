import { AppHeader } from "@/components/AppHeader";
import { OverviewView } from "@/components/OverviewView";

export const metadata = { title: "Regional overview — AQUA"};

export default function OverviewPage() {
  return (
    <>
      <AppHeader context="overview" />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-extrabold">Regional overview</h1>
        <p className="mt-2 text-muted">
          Every active case across the network, most urgent first.
        </p>
        <div className="mt-5">
          <OverviewView />
        </div>
      </main>
    </>
  );
}
