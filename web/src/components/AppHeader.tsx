import Link from "next/link";

/** Display name + tagline. Change here only. */
export const APP_NAME = "AQUA";
export const APP_TAGLINE = "Flood Emergency Response Recommendation System";

/**
 * Brand lockup only — logo + wordmark + tagline, linking home.
 * Navigation belongs to each screen's own content, not the header.
 */
export function AppHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-4xl items-center px-4 py-2.5">
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
      </div>
    </header>
  );
}
