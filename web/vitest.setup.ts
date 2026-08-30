import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Minimal .env loader — populate process.env from web/.env if present.
// (Next.js loads .env for the app; Vitest does not, and the integration test needs it.)
try {
  const raw = readFileSync(resolve(__dirname, ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
} catch {
  /* no .env — integration test will skip */
}
