import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

const ACTIONS = [
  {
    href: "/report",
    title: "Report a flood situation",
    sub: "Assess conditions and receive recommendations",
    primary: true,
  },
  {
    href: "/overview",
    title: "Regional overview",
    sub: "Review current conditions across the region",
    primary: false,
  },
];

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
          Flood response recommendations
        </h1>
        <p className="mt-3 text-muted">
          Report a situation to receive a prioritized response recommendation, suitable
          rescue boat and shelter, and supporting reasoning. A person makes the final call.
        </p>

        <div className="mt-6 grid gap-3">
          {ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              data-btn
              className={`flex items-center justify-between gap-4 rounded-xl px-5 py-4 ${
                a.primary
                  ? "bg-accent-strong text-white"
                  : "border-2 border-border bg-surface"
              }`}
            >
              <span className="min-w-0">
                <span className="block text-lg font-extrabold">{a.title}</span>
                <span
                  className={`mt-0.5 block text-sm font-medium ${
                    a.primary ? "text-white/80" : "text-muted"
                  }`}
                >
                  {a.sub}
                </span>
              </span>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="shrink-0"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-xs text-muted">
          Prototype · simulated fleet, shelter and gauge data · rule-based reasoning
        </p>
      </main>
    </>
  );
}
