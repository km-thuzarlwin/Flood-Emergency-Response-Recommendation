"use client";

import type { ReactNode } from "react";

/** A labelled block wrapper. */
export function FieldBlock({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="font-semibold">{label}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/** Native dropdown. */
export function SelectField<T extends string>({
  label,
  hint,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T | "";
  placeholder: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <FieldBlock label={label} hint={hint}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-lg border-2 border-border bg-surface px-3 py-3 font-semibold"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldBlock>
  );
}

/** Sliding on/off switch — for yes/no questions with a safe default. */
export function ToggleSwitch({
  label,
  hint,
  checked,
  onChange,
  danger = false,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-4 rounded-xl border-2 px-4 py-3 text-left ${
        checked
          ? danger
            ? "border-sev-severe bg-sev-severe text-white"
            : "border-accent bg-accent text-white"
          : "border-border bg-surface"
      }`}
    >
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className={`block text-sm ${checked ? "text-white/80" : "text-muted"}`}>{hint}</span>}
      </span>
      <span
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${
          checked ? "bg-white/30" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

/** − value + stepper for a small integer. */
export function Stepper({
  label,
  hint,
  value,
  min = 0,
  max = 7,
  onChange,
  format = (n) => String(n),
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  format?: (n: number) => string;
}) {
  return (
    <FieldBlock label={label} hint={hint}>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          aria-label="decrease"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-14 rounded-lg border-2 border-border bg-surface text-2xl font-bold"
        >
          −
        </button>
        <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-border bg-surface-2 font-semibold">
          {format(value)}
        </div>
        <button
          type="button"
          aria-label="increase"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-14 rounded-lg border-2 border-border bg-surface text-2xl font-bold"
        >
          +
        </button>
      </div>
    </FieldBlock>
  );
}

/** Vertical radio list. */
export function RadioCards<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T | null;
  options: ReadonlyArray<{ value: T; label: string; hint?: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <FieldBlock label={label} hint={hint}>
      <div className="space-y-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left ${
                active ? "border-accent bg-accent/5" : "border-border bg-surface"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
                  active ? "border-accent" : "border-border"
                }`}
              >
                {active && <span className="h-3 w-3 rounded-full bg-accent" />}
              </span>
              <span>
                <span className="font-semibold">{o.label}</span>
                {o.hint && <span className="block text-sm text-muted">{o.hint}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </FieldBlock>
  );
}

/** Compact segmented control — best for 3–4 short mutually-exclusive options. */
export function Segmented<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T | null;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <FieldBlock label={label} hint={hint}>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-lg border-2 px-2 py-3 text-center text-sm font-semibold ${
              value === o.value ? "border-accent bg-accent text-white" : "border-border bg-surface"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </FieldBlock>
  );
}
