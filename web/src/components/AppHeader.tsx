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

/**
 * AQUA mark — a water droplet holding a curling wave, with splash flicks.
 * Original artwork; inline SVG, no image assets. Blue vertical gradient.
 */
export function AquaMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="AQUA"
      fill="none"
    >
      <defs>
        <linearGradient id="aqua-mark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
        <clipPath id="aqua-mark-drop">
          <path d="M32 3c9 13 20 25 20 35a20 20 0 1 1-40 0C12 28 23 16 32 3Z" />
        </clipPath>
      </defs>

      {/* droplet body */}
      <path
        d="M32 3c9 13 20 25 20 35a20 20 0 1 1-40 0C12 28 23 16 32 3Z"
        fill="url(#aqua-mark-grad)"
      />

      {/* breaking wave with a spiral curl + splash flicks, carved white */}
      <g clipPath="url(#aqua-mark-drop)">
        <path
          d="M9 44C9 30 22 22 35 27c8 3 11 12 6 19-4 6-13 7-18 2-4-4-3-11 3-13 4-2 9 1 9 6 0 3-3 6-6 5 3 0 4-3 3-5-2-3-7-2-8 2-2 6 3 12 10 12 9 0 16-8 14-17-2-8-11-13-20-10C18 26 12 35 13 45c1 6 5 10 11 12-8-1-15-6-15-13Z"
          fill="#fff"
        />
        <circle cx="25" cy="17" r="2.6" fill="#fff" />
        <circle cx="20" cy="24" r="1.7" fill="#fff" />
        <circle cx="30" cy="11" r="1.7" fill="#fff" />
      </g>
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
