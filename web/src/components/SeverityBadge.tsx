import type { SeverityLevel } from "@/lib/schema";
import { SEVERITY } from "@/lib/format";

export function SeverityBadge({
  severity,
  size = "md",
}: {
  severity: SeverityLevel;
  size?: "sm" | "md" | "lg";
}) {
  const s = SEVERITY[severity];
  const pad = size === "lg" ? "px-5 py-3 text-2xl" : size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <span className={`inline-flex items-center rounded-lg font-extrabold uppercase tracking-wide ${s.chipClass} ${pad}`}>
      {s.label}
    </span>
  );
}
