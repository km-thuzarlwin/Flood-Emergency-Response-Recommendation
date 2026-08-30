import Link from "next/link";

/** Display name + tagline. Change here only. */
export const APP_NAME = "AQUA";
export const APP_TAGLINE = "Flood Emergency Response Recommendation System";

export type HeaderContext = "home" | "report" | "results" | "overview";

type Action = { href: string; label: string; kind: "primary" | "plain" };

const ACTION: Record<HeaderContext, Action | null> = {
  home: null,
  report: { href: "/", label: "Back", kind: "plain" },
  results: { href: "/overview", label: "Regional overview", kind: "primary" },
  overview: { href: "/report", label: "File a report", kind: "primary" },
};

export function AppHeader({ context = "home" }: { context?: HeaderContext }) {
  const action = ACTION[context];
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            width={34}
            height={34}
            className="h-[34px] w-[34px] shrink-0"
          />
          <span className="min-w-0 leading-none">
            <span className="block text-2xl font-extrabold tracking-tight text-accent-ink">
              {APP_NAME}
            </span>
            <span className="mt-1 hidden text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-muted sm:block">
              {APP_TAGLINE}
            </span>
            <span className="mt-1 block text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-muted sm:hidden">
              Flood Emergency Response
            </span>
          </span>
        </Link>

        {action && (
          <Link
            href={action.href}
            data-btn
            className={
              action.kind === "primary"
                ? "shrink-0 rounded-lg bg-accent-strong px-4 py-2 text-sm font-semibold text-white"
                : "flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold"
            }
          >
            {action.kind === "plain" && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            )}
            {action.label}
          </Link>
        )}
      </div>
    </header>
  );
}
