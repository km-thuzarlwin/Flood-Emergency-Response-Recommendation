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

/** AQUA mark — a droplet cresting a wave, in the brand azure. No image assets. */
export function AquaMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="AQUA"
      fill="none"
    >
      <rect width="32" height="32" rx="9" fill="var(--accent-strong)" />
      <path
        d="M16 6c3 3.6 5.2 6.6 5.2 9.4A5.2 5.2 0 0 1 16 20.6a5.2 5.2 0 0 1-5.2-5.2C10.8 12.6 13 9.6 16 6Z"
        fill="#fff"
      />
      <path
        d="M6 22.5c1.7 0 1.7 1.6 3.3 1.6 1.7 0 1.7-1.6 3.4-1.6 1.6 0 1.6 1.6 3.3 1.6s1.7-1.6 3.3-1.6c1.7 0 1.7 1.6 3.4 1.6 1.6 0 1.6-1.6 3.3-1.6"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

export function AppHeader({ context = "home" }: { context?: HeaderContext }) {
  const action = ACTION[context];
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <AquaMark className="h-8 w-8 shrink-0" />
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
