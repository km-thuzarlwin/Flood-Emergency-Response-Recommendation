import { AppHeader } from "@/components/AppHeader";
import { ResultsView } from "@/components/ResultsView";

export const metadata = { title: "Recommendation — AQUA"};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  return (
    <>
      <AppHeader context="results" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-extrabold">Recommendation</h1>
        <div className="mt-5">
          <ResultsView caseId={decodeURIComponent(caseId)} />
        </div>
      </main>
    </>
  );
}
