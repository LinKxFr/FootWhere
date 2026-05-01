import { readFile } from "fs/promises";
import path from "path";
import type { MatchBroadcast } from "@/scripts/scrape-schedule";

export async function readSchedule(): Promise<{
  last_synced_at: string | null;
  matches: MatchBroadcast[];
}> {
  try {
    const file = path.resolve(process.cwd(), "data/schedule.json");
    const raw = await readFile(file, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { last_synced_at: null, matches: [] };
    }
    const p = parsed as Record<string, unknown>;
    return {
      last_synced_at:
        typeof p.last_synced_at === "string" ? p.last_synced_at : null,
      matches: Array.isArray(p.matches) ? (p.matches as MatchBroadcast[]) : [],
    };
  } catch {
    return { last_synced_at: null, matches: [] };
  }
}
