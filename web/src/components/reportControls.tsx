"use client";

import { useMemo, useState, type ReactNode } from "react";

/* ---------- shared ---------- */

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-base font-bold leading-tight">{label}</p>
        {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

const OPT_BASE =
  "flex min-h-[50px] items-center justify-center rounded-xl border-2 px-2.5 py-3 text-center text-sm font-semibold leading-tight transition";
const OPT_OFF = "border-border bg-surface text-foreground";
const OPT_ON = "border-accent bg-accent-tint text-accent-ink font-bold";
const OPT_ON_DANGER = "border-sev-severe bg-sev-severe text-white";

/* ---------- single-select tap grid ---------- */

export function TapGrid<T extends string>({
  value,
  options,
  onChange,
  columns = 2,
  dangerValue,
}: {
  value: T | null;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
  columns?: number;
  /** this option renders in the critical/red style when selected */
  dangerValue?: T;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
      {options.map((o) => {
        const on = value === o.value;
        const danger = on && o.value === dangerValue;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`${OPT_BASE} ${danger ? OPT_ON_DANGER : on ? OPT_ON : OPT_OFF}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- searchable / plain select ---------- */

const ChevronDown = (
  <svg className="h-5 w-5 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export function SearchSelect<T extends string>({
  value,
  placeholder,
  options,
  onChange,
  searchable = true,
}: {
  value: T | null;
  placeholder: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.label.toLowerCase().includes(s)) : options;
  }, [q, options]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-[52px] items-center justify-between gap-2 rounded-xl border-2 border-border bg-surface px-3.5 text-[15px] font-semibold"
      >
        <span className={selected ? "text-foreground" : "text-muted"}>{selected ? selected.label : placeholder}</span>
        {ChevronDown}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border-2 border-border bg-surface shadow-lg">
          {searchable && (
            <div className="sticky top-0 border-b border-border bg-surface p-2">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type to search…"
                className="w-full rounded-lg border border-border px-3 py-2 text-[15px]"
              />
            </div>
          )}
          {filtered.length === 0 && <p className="px-3.5 py-3 text-sm text-muted">No match</p>}
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
                setQ("");
              }}
              className={`block w-full px-3.5 py-3 text-left text-[15px] font-semibold ${
                o.value === value ? "bg-accent-tint text-accent-ink" : "text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- road-access status ramp ---------- */

type RampKind = "ok" | "warn" | "bad" | "unknown";

const RAMP_ICON: Record<RampKind, { bg: string; svg: ReactNode }> = {
  ok: {
    bg: "#15803d",
    svg: <path d="M20 6L9 17l-5-5" />,
  },
  warn: {
    bg: "#a15c07",
    svg: (
      <>
        <path d="M12 3L2 20h20L12 3z" />
        <path d="M12 10v4" />
        <circle cx="12" cy="17" r="0.6" fill="currentColor" />
      </>
    ),
  },
  bad: {
    bg: "#b3160f",
    svg: <path d="M18 6L6 18M6 6l12 12" />,
  },
  unknown: {
    bg: "#4b5563",
    svg: (
      <>
        <path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r="0.6" fill="currentColor" />
      </>
    ),
  },
};

export function StatusRamp<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | null;
  options: ReadonlyArray<{ value: T; kind: RampKind; title: string; sub?: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => {
        const on = value === o.value;
        const bad = on && o.kind === "bad";
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`flex min-h-[58px] items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left ${
              bad
                ? "border-sev-severe bg-[#fee2e2]"
                : on
                  ? "border-accent bg-accent-tint"
                  : "border-border bg-surface"
            }`}
          >
            <span
              className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg text-white"
              style={{ background: RAMP_ICON[o.kind].bg }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                {RAMP_ICON[o.kind].svg}
              </svg>
            </span>
            <span>
              <span className={`text-[13px] font-extrabold tracking-wide ${bad ? "text-[#7f1d1d]" : on ? "text-accent-ink" : ""}`}>
                {o.title}
              </span>
              {o.sub && <span className="block text-xs text-muted">{o.sub}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- vulnerable-groups multi-select ---------- */

const GROUP_ICON: Record<string, ReactNode> = {
  elderly: (
    <>
      <circle cx="12" cy="5" r="2.4" />
      <path d="M12 8v7M12 15l-3 6M12 15l3 6M8 12h8" />
      <path d="M17 9v13" />
    </>
  ),
  children: (
    <>
      <circle cx="12" cy="6" r="2.6" />
      <path d="M12 9v6M9 12h6M12 15l-2.5 5M12 15l2.5 5" />
    </>
  ),
  disabilities: (
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M12 6.5v6l4 1" />
      <path d="M12 12.5H8.5" />
      <circle cx="10" cy="17.5" r="4.5" />
    </>
  ),
  pregnant: (
    <>
      <circle cx="12" cy="4.5" r="2.2" />
      <path d="M12 7c-1.6 0-2.6 1.3-2.6 3.2 0 2 1.2 3.3 3.4 3.8-2 .3-3.8 1.4-3.8 4V22" />
      <path d="M12.2 14c2.4 0 3.4-1.8 3.4-3.6S14.4 7 12 7" />
    </>
  ),
};

export function MultiTiles<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T[];
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T[]) => void;
}) {
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o.value)}
              className={`relative flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-3.5 text-center ${
                on ? "border-accent bg-accent-tint" : "border-border bg-surface"
              }`}
            >
              {on && (
                <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-md bg-accent">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
              )}
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {GROUP_ICON[o.value]}
              </svg>
              <span className={`text-[13px] leading-tight ${on ? "font-bold text-accent-ink" : "font-semibold"}`}>
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-pressed={value.length === 0}
        onClick={() => onChange([])}
        className={`flex min-h-[46px] w-full items-center justify-center rounded-xl border-2 text-sm font-bold ${
          value.length === 0 ? "border-accent bg-accent-tint text-accent-ink" : "border-border bg-surface text-muted"
        }`}
      >
        None known
      </button>
    </div>
  );
}
