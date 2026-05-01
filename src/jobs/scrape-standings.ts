/*
 * SOURCE: football-data.org free tier
 * Endpoint: GET https://api.football-data.org/v4/competitions/{code}/standings
 * Auth: X-Auth-Token header (env var: FOOTBALL_DATA_KEY)
 * Rate limit: 10 calls/min → 6 000 ms delay between requests (serialised, not parallel)
 *
 * LEAGUE MAPPING (FootWhere key → API competition code):
 * L1=FL1  PL=PL  SA=SA  BL=BL1  LL=PD  LP=PPL
 *
 * SWAPPING THE SOURCE:
 * Replace the fetchLeague() function below.
 * The loop, error handling, and persistence logic are source-agnostic.
 *
 * ADDING A LEAGUE:
 * Add one entry to the LEAGUE_MAP constant below.
 */

import { readFileSync } from "fs";
import { readFile, writeFile, rename } from "fs/promises";
import path from "path";
import type { StandingRow } from "../../lib/types";

// ─── Load .env.local for CLI use ──────────────────────────────────────────────
// Next.js does this automatically at runtime; for scripts we do it manually.
(function loadDotEnvLocal() {
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch {
    // .env.local not found — rely on process.env being set externally
  }
})();

// ─── Config ───────────────────────────────────────────────────────────────────

const LEAGUE_MAP: Record<string, string> = {
  L1: "FL1",
  PL: "PL",
  SA: "SA",
  BL: "BL1",
  LL: "PD",
  LP: "PPL",
};

const DATA_DIR     = path.resolve(__dirname, "../../data");
const STANDINGS_FILE = path.join(DATA_DIR, "standings.json");
const STANDINGS_TMP  = path.join(DATA_DIR, "standings.tmp.json");

const DELAY_MS = 6_000; // 10 req/min → one every 6 s

// ─── Types ────────────────────────────────────────────────────────────────────

interface StandingsStore {
  last_synced_at: string | null;
  standings: Record<string, StandingRow[]>;
}

// Minimal shape of what football-data.org returns for a standings entry
interface FDStandingEntry {
  position: number;
  team: { shortName: string };
  points: number;
  won: number;
  draw: number;
  lost: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function readExistingStandings(): Promise<StandingsStore> {
  try {
    const raw = await readFile(STANDINGS_FILE, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { last_synced_at: null, standings: {} };
    return parsed as StandingsStore;
  } catch {
    return { last_synced_at: null, standings: {} };
  }
}

// ─── Fetcher (swap this function to change source) ───────────────────────────

async function fetchLeague(code: string, apiKey: string): Promise<StandingRow[]> {
  const url = `https://api.football-data.org/v4/competitions/${code}/standings`;
  const res = await fetch(url, {
    headers: { "X-Auth-Token": apiKey },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as {
    standings: Array<{ type: string; table: FDStandingEntry[] }>;
  };

  // football-data.org returns up to three sub-tables (TOTAL, HOME, AWAY).
  // We always want TOTAL.
  const table =
    data.standings.find((s) => s.type === "TOTAL")?.table ??
    data.standings[0]?.table ??
    [];

  return table.map((row) => ({
    pos:  row.position,
    team: row.team.shortName,
    pts:  row.points,
    w:    row.won,
    d:    row.draw,
    l:    row.lost,
  }));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  if (!apiKey) {
    console.error("❌ FOOTBALL_DATA_KEY is not set. Add it to .env.local");
    process.exit(1);
  }

  const existing = await readExistingStandings();
  const result: Record<string, StandingRow[]> = {};

  const entries = Object.entries(LEAGUE_MAP);
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) await sleep(DELAY_MS);

    const [key, code] = entries[i];
    try {
      const rows = await fetchLeague(code, apiKey);
      result[key] = rows;
      console.log(`✅ ${key} (${code}): ${rows.length} rows`);
    } catch (err) {
      const kept = existing.standings?.[key] ?? [];
      result[key] = kept;
      console.error(
        `❌ ${key} (${code}): ${String(err)} — keeping ${kept.length} existing rows`
      );
    }
  }

  const store: StandingsStore = {
    last_synced_at: new Date().toISOString(),
    standings: result,
  };

  await writeFile(STANDINGS_TMP, JSON.stringify(store, null, 2) + "\n", "utf-8");
  await rename(STANDINGS_TMP, STANDINGS_FILE);
  console.log(`✅ data/standings.json written — last_synced_at: ${store.last_synced_at}`);
}

main().catch((err) => {
  console.error("[scrape-standings] Fatal:", err);
  process.exit(1);
});
