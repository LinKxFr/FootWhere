export interface TeamInfo {
  name: string;
  abbr: string;
  color: string;
  crest?: string; // URL to club crest (football-data.org CDN)
}

export interface Match {
  id: number;
  home: TeamInfo;
  away: TeamInfo;
  date: string;
  time: string;
  channel: string;
  channelSub: string;
  live: boolean;
  scoreHome?: number | null;
  scoreAway?: number | null;
  favorite: boolean;
  competition: string;
}

export interface League {
  id: string;
  code: string; // football-data.org competition code
  name: string;
  country: string;
  color: string;
}

export interface StandingRow {
  pos: number;
  team: string;
  pts: number;
  w: number;
  d: number;
  l: number;
}

/* ── football-data.org v4 types ── */

export interface FDMatchResponse {
  matches: FDMatch[];
}

export interface FDMatch {
  id: number;
  utcDate: string;
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "SUSPENDED" | "POSTPONED" | "CANCELLED" | "AWARDED";
  matchday: number;
  competition: {
    name: string;
    code: string;
  };
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest?: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest?: string;
  };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
}
