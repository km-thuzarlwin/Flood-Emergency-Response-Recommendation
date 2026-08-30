import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          FERRS
          <span className="ml-2 font-normal text-muted">Flood response</span>
        </Link>
        <nav className="flex gap-2 text-sm">
          <Link
            href="/report"
            data-btn
            className="rounded-lg bg-accent-strong px-4 py-2 font-semibold text-white"
          >
            File a Report
          </Link>
          <Link
            href="/overview"
            data-btn
            className="rounded-lg border border-border px-4 py-2 font-semibold"
          >
            Overview
          </Link>
        </nav>
      </div>
    </header>
  );
}
