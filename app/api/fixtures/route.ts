import { NextResponse } from "next/server";
import {
  fetchMatches,
  transformMatches,
  getCurrentWeekRange,
} from "@/lib/football-data";
import { COMPETITION_CODES } from "@/lib/channels";
import { readSchedule } from "@/lib/schedule-reader";

const LEAGUE_MAP: Record<string, string> = {
  L1: COMPETITION_CODES.L1,
  PL: COMPETITION_CODES.PL,
  SA: COMPETITION_CODES.SA,
  BL: COMPETITION_CODES.BL,
  LL: COMPETITION_CODES.LL,
  LP: COMPETITION_CODES.LP,
  CL: COMPETITION_CODES.CL,
  EL: COMPETITION_CODES.EL,
  UECL: COMPETITION_CODES.UECL,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get("league") || "L1";

  const competitionCode = LEAGUE_MAP[league];
  if (!competitionCode) {
    return NextResponse.json({ error: "Unknown league" }, { status: 400 });
  }

  try {
    const { from, to } = getCurrentWeekRange();
    const [raw, { last_synced_at }] = await Promise.all([
      fetchMatches(competitionCode, from, to),
      readSchedule(),
    ]);
    const matches = transformMatches(raw);

    return NextResponse.json({ matches, from, to, last_synced_at });
  } catch (error) {
    console.error("Failed to fetch fixtures:", error);
    return NextResponse.json(
      { error: "Failed to fetch fixtures", details: String(error) },
      { status: 500 }
    );
  }
}
