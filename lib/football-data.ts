import { FDMatch, FDMatchResponse, Match } from "./types";
import { getTeamMeta } from "./teams";
import { getChannel } from "./channels";

const API_BASE = "https://api.football-data.org/v4";

const FRENCH_DAYS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

const FRENCH_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function toParisTime(utcDate: string): Date {
  return new Date(
    new Date(utcDate).toLocaleString("en-US", { timeZone: "Europe/Paris" })
  );
}

function formatDateFR(utcDate: string): string {
  const d = toParisTime(utcDate);
  const day = FRENCH_DAYS[d.getDay()];
  const num = d.getDate();
  const month = FRENCH_MONTHS[d.getMonth()];
  return `${day} ${num} ${month}`;
}

function formatTimeFR(utcDate: string): string {
  const d = toParisTime(utcDate);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}h${m}`;
}

const LIVE_STATUSES = new Set(["IN_PLAY", "PAUSED"]);

export function getCurrentWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { from: fmt(monday), to: fmt(sunday) };
}

export async function fetchMatches(
  competitionCode: string,
  from: string,
  to: string
): Promise<FDMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_KEY is not set");
  }

  const url = `${API_BASE}/competitions/${competitionCode}/matches?dateFrom=${from}&dateTo=${to}`;

  const res = await fetch(url, {
    headers: {
      "X-Auth-Token": apiKey,
    },
    next: { revalidate: 300 }, // Cache 5 minutes
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data.org ${res.status}: ${body}`);
  }

  const data: FDMatchResponse = await res.json();
  return data.matches;
}

export function transformMatches(matches: FDMatch[]): Match[] {
  return matches
    .sort(
      (a, b) =>
        new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
    )
    .map((m) => {
      const homeMeta = getTeamMeta(m.homeTeam.shortName || m.homeTeam.name);
      const awayMeta = getTeamMeta(m.awayTeam.shortName || m.awayTeam.name);
      const channelInfo = getChannel(m.competition.code, m.utcDate);
      const live = LIVE_STATUSES.has(m.status);

      return {
        id: m.id,
        home: {
          name: m.homeTeam.shortName || m.homeTeam.name,
          abbr: m.homeTeam.tla || homeMeta.abbr,
          color: homeMeta.color,
          crest: m.homeTeam.crest || homeMeta.crest,
        },
        away: {
          name: m.awayTeam.shortName || m.awayTeam.name,
          abbr: m.awayTeam.tla || awayMeta.abbr,
          color: awayMeta.color,
          crest: m.awayTeam.crest || awayMeta.crest,
        },
        date: formatDateFR(m.utcDate),
        time: formatTimeFR(m.utcDate),
        channel: channelInfo.channel,
        channelSub: channelInfo.channelSub,
        live,
        scoreHome: m.score.fullTime.home,
        scoreAway: m.score.fullTime.away,
        favorite: false,
        competition: `${m.competition.name} · J${m.matchday}`,
      };
    });
}
