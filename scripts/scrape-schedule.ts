/*
 * SOURCES
 * Source A: https://www.maxifoot.fr/programme-tv-foot.htm
 *   Chosen because: static HTML, no anti-bot, channel encoded in GIF filename,
 *   covers all major competitions in one page.
 *   To swap: implement scrapeSourceA(): Promise<RawMatch[]> returning the same
 *   shape and replace the import below. Cross-check logic is source-agnostic.
 *
 * Source B: https://www.footmercato.net/programme-tv/{slug}?partial=1
 *   Chosen because: partial HTML endpoints per competition, UTC timestamps,
 *   no anti-bot, independent from Source A.
 *   To swap: implement scrapeSourceB(): Promise<RawMatch[]> and replace below.
 *
 * HEADLESS BROWSER: not needed. Both sources are server-rendered PHP/HTML.
 * If either source migrates to a JS-rendered SPA, replace fetch() with
 * Playwright in the relevant scrapeSource function only.
 */

import { writeFile } from "fs/promises";
import path from "path";
import { load } from "cheerio";

const UA = "FootWhere/1.0 (football TV schedule aggregator; open source)";
const DELAY_MS = 1500;

export type MatchBroadcast = {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoffAt: string; // ISO 8601 UTC
  channelA: string | null; // from maxifoot
  channelB: string | null; // from footmercato
  channel: string | null; // agreed value, or null if uncertain
  channelUncertain: boolean;
};

type RawMatch = {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoffAt: string; // ISO 8601 UTC
  channel: string | null;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convert a Paris local datetime to a UTC Date. */
function parisLocalToUtc(
  year: number,
  month0: number,
  day: number,
  hour: number,
  minute: number
): Date {
  // Treat the Paris local time as UTC (approx), then measure the actual Paris
  // offset at that instant and subtract it to get true UTC.
  const approx = new Date(Date.UTC(year, month0, day, hour, minute));
  const parisStr = approx.toLocaleString("sv-SE", {
    timeZone: "Europe/Paris",
  });
  const parisAsUtc = new Date(parisStr.replace(" ", "T") + "Z");
  const offsetMs = parisAsUtc.getTime() - approx.getTime();
  return new Date(approx.getTime() - offsetMs);
}

/** Returns YYYY-MM-DD in Europe/Paris timezone from an ISO UTC string. */
function isoDay(isoUtc: string): string {
  return new Date(isoUtc)
    .toLocaleString("sv-SE", { timeZone: "Europe/Paris" })
    .slice(0, 10);
}

/** UTC window covering the next 7 days starting from Paris midnight today. */
function getParisWindow(): { from: Date; to: Date } {
  const todayStr = new Date()
    .toLocaleString("sv-SE", { timeZone: "Europe/Paris" })
    .slice(0, 10); // "YYYY-MM-DD"
  const [y, m, d] = todayStr.split("-").map(Number);
  const from = parisLocalToUtc(y, m - 1, d, 0, 0);
  const to = new Date(from.getTime() + 7 * 24 * 3600 * 1000 - 1);
  return { from, to };
}

// ─── robots.txt ───────────────────────────────────────────────────────────────

async function isAllowedByRobots(
  host: string,
  path: string
): Promise<boolean> {
  try {
    const res = await fetch(`https://${host}/robots.txt`, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) return true;
    const text = await res.text();
    let applies = false;
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (/^User-agent:/i.test(line)) {
        const agent = line.replace(/^User-agent:\s*/i, "").trim().toLowerCase();
        applies = agent === "*" || agent === "footwhere";
      }
      if (applies && /^Disallow:/i.test(line)) {
        const disallowed = line.replace(/^Disallow:\s*/i, "").trim();
        if (disallowed && path.startsWith(disallowed)) return false;
      }
    }
    return true;
  } catch {
    return true; // network error → assume allowed
  }
}

// ─── Channel normalisation ────────────────────────────────────────────────────

// maxifoot GIF filenames → canonical channel name
const GIF_TO_CHANNEL: Record<string, string> = {
  "canal+": "canal+",
  canalplus: "canal+",
  "canal-plus": "canal+",
  "canal+sport": "canal+ sport",
  "canal-plus-sport": "canal+ sport",
  "canal+foot": "canal+ foot",
  "canal-foot": "canal+ foot",
  "canal-plus-foot": "canal+ foot",
  "canal-plus-live1": "canal+",
  "canal-plus-live2": "canal+",
  "canal-plus-live3": "canal+",
  "canal-plus-live4": "canal+",
  "canal-plus-live5": "canal+",
  bein1: "bein sports 1",
  bein2: "bein sports 2",
  bein3: "bein sports 3",
  bein4: "bein sports max",
  bein5: "bein sports max",
  beinsports: "bein sports 1",
  beinsports1: "bein sports 1",
  beinsports2: "bein sports 2",
  beinsports3: "bein sports 3",
  "bein-sports-1": "bein sports 1",
  "bein-sports-2": "bein sports 2",
  "bein-sports-3": "bein sports 3",
  "bein-max": "bein sports max",
  beinmax: "bein sports max",
  dazn: "dazn",
  dazn1: "dazn",
  tf1: "tf1",
  m6: "m6",
  amazon: "amazon prime video",
  prime: "amazon prime video",
  primevideo: "amazon prime video",
  "prime-video": "amazon prime video",
  "ligue1+": "free ligue 1+",
  "ligue-1+": "free ligue 1+",
  ligue1plus: "free ligue 1+",
  rmc: "rmc sport 1",
  rmc1: "rmc sport 1",
  "rmc-1": "rmc sport 1",
  rmcsport1: "rmc sport 1",
  rmc2: "rmc sport 2",
  "rmc-2": "rmc sport 2",
  rmcsport2: "rmc sport 2",
};

function gifToChannel(src: string): string | null {
  const filename = (src.split("/").pop() ?? "")
    .replace(/\.[^.]+$/, "")
    .toLowerCase();
  return GIF_TO_CHANNEL[filename] ?? null;
}

// footmercato img alt text → canonical channel name
const ALT_TO_CHANNEL: Record<string, string> = {
  "ligue 1+": "free ligue 1+",
  "canal+": "canal+",
  "canal+ sport": "canal+ sport",
  "canal+ foot": "canal+ foot",
  "bein sports 1": "bein sports 1",
  "bein sports 2": "bein sports 2",
  "bein sports 3": "bein sports 3",
  "bein sports max": "bein sports max",
  "bein sports": "bein sports 1",
  dazn: "dazn",
  tf1: "tf1",
  m6: "m6",
  "amazon prime video": "amazon prime video",
  "prime video": "amazon prime video",
  "rmc sport 1": "rmc sport 1",
  "rmc sport 2": "rmc sport 2",
  "rmc sport": "rmc sport 1",
};

function altToChannel(alt: string): string | null {
  let key = alt.replace(/^logo\s+/i, "").trim().toLowerCase();
  // "canal +" / "canal + foot" / "canal + sport 360" / "canal + live N"
  key = key.replace(/canal\s+\+/g, "canal+");
  // "canal+ live N" → "canal+" (numbered live sub-channels)
  key = key.replace(/^(canal\+)\s+live\s+\d+$/, "$1");
  // "canal+ sport 360" → "canal+ sport"
  key = key.replace(/^(canal\+\s+sport)\s+\d+$/, "$1");
  // "bein sport N" → "bein sports N" (site omits the 's')
  key = key.replace(/^bein\s+sport(\s|$)/, "bein sports$1");
  // "ligue 1+ 4" / "ligue 1+ 5" → "ligue 1+" (numbered sub-channels)
  key = key.replace(/^(ligue\s+\d+\+)\s+\d+$/, "$1");
  return ALT_TO_CHANNEL[key] ?? null;
}

// ─── Source A: maxifoot.fr ────────────────────────────────────────────────────

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
};

function parseFrenchDate(
  text: string
): { year: number; month0: number; day: number } | null {
  const m = text.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthRaw = m[2]
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const month0 = FRENCH_MONTHS[monthRaw];
  if (month0 === undefined) return null;
  return { year: parseInt(m[3], 10), month0, day };
}

async function scrapeSourceA(): Promise<RawMatch[]> {
  const host = "www.maxifoot.fr";
  const path = "/programme-tv-foot.htm";

  if (!(await isAllowedByRobots(host, path))) {
    console.warn(
      "[scraper] maxifoot: disallowed by robots.txt — skipping Source A"
    );
    return [];
  }
  await sleep(500);

  const res = await fetch(`https://${host}${path}`, {
    headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9" },
  });
  if (!res.ok) {
    console.warn(`[scraper] maxifoot: HTTP ${res.status} — skipping Source A`);
    return [];
  }

  // maxifoot uses iso-8859-1 encoding
  const buf = await res.arrayBuffer();
  const html = new TextDecoder("iso-8859-1").decode(buf);
  const $ = load(html);

  const { from, to } = getParisWindow();
  const results: RawMatch[] = [];

  // Structure: <div class=header>DATE TEXT</div>
  //            <ul id=lismat1><li><table><tr>
  //              <td class=h1>TIME<br><img src=CHANNEL.gif></td>
  //              <td class=t1><b>HOME - AWAY</b><br><i>competition</i></td>
  //            </tr></table></li></ul>
  $("div.header").each((_i, headerEl) => {
    const dateInfo = parseFrenchDate($(headerEl).text().trim());
    if (!dateInfo) return;

    // Walk forward to the next <ul> sibling (skipping any ads/divs between)
    let $sib = $(headerEl).next();
    while ($sib.length && $sib[0].tagName.toLowerCase() !== "ul") {
      $sib = $sib.next();
    }
    if (!$sib.length) return;

    $sib.find("tr").each((_j, tr) => {
      const $tr = $(tr);
      const $h1 = $tr.find("td.h1");
      const $t1 = $tr.find("td.t1");
      if (!$h1.length || !$t1.length) return;

      const timeMatch = $h1.text().match(/(\d{2})h(\d{2})/);
      if (!timeMatch) return;

      const hour = parseInt(timeMatch[1], 10);
      const min = parseInt(timeMatch[2], 10);
      const kickoffDate = parisLocalToUtc(
        dateInfo.year,
        dateInfo.month0,
        dateInfo.day,
        hour,
        min
      );
      if (kickoffDate < from || kickoffDate > to) return;

      const channel = gifToChannel($h1.find("img").attr("src") ?? "");

      // Bold text: "<img> HOME - <nobr>AWAY <img></nobr>"
      // .text() strips tags, leaving "HOME -  AWAY " with extra whitespace
      const boldText = $t1
        .find("b")
        .text()
        .replace(/\s+/g, " ")
        .trim();
      const sepIdx = boldText.lastIndexOf(" - ");
      if (sepIdx === -1) return;
      const homeTeam = boldText.slice(0, sepIdx).trim();
      const awayTeam = boldText.slice(sepIdx + 3).trim();
      if (!homeTeam || !awayTeam) return;

      results.push({
        homeTeam,
        awayTeam,
        competition: $t1.find("i").text().trim(),
        kickoffAt: kickoffDate.toISOString(),
        channel,
      });
    });
  });

  return results;
}

// ─── Source B: footmercato.net ────────────────────────────────────────────────

const FM_SLUGS: Array<{ slug: string; competition: string }> = [
  { slug: "france/ligue-1", competition: "Ligue 1" },
  {
    slug: "europe/ligue-des-champions-uefa",
    competition: "Champions League",
  },
  { slug: "europe/uefa-europa-league", competition: "Europa League" },
  {
    slug: "europe/uefa-europa-conference-league",
    competition: "Europa Conference League",
  },
  { slug: "angleterre/premier-league", competition: "Premier League" },
  { slug: "espagne/liga", competition: "La Liga" },
  { slug: "italie/serie-a", competition: "Serie A" },
  { slug: "allemagne/bundesliga", competition: "Bundesliga" },
];

async function scrapeSourceB(): Promise<RawMatch[]> {
  const host = "www.footmercato.net";

  if (!(await isAllowedByRobots(host, "/programme-tv/"))) {
    console.warn(
      "[scraper] footmercato: disallowed by robots.txt — skipping Source B"
    );
    return [];
  }
  await sleep(500);

  const { from, to } = getParisWindow();
  const results: RawMatch[] = [];

  for (let i = 0; i < FM_SLUGS.length; i++) {
    if (i > 0) await sleep(DELAY_MS);

    const { slug, competition } = FM_SLUGS[i];
    const url = `https://${host}/programme-tv/${slug}?partial=1`;

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9" },
      });
    } catch (err) {
      console.warn(`[scraper] footmercato ${slug}: network error — skipping`);
      continue;
    }
    if (!res.ok) {
      console.warn(
        `[scraper] footmercato ${slug}: HTTP ${res.status} — skipping`
      );
      continue;
    }

    const html = await res.text();
    const $ = load(html);

    // Each match card: <a class="matchFull ..."> or <li ...>
    //   <span class="matchFull__team matchFull__team--home">
    //     <span class="matchTeam__name">TEAM</span>
    //   </span>
    //   <span class="matchFull__infos">
    //     <time datetime="2026-05-02T13:00:00+00:00">15:00</time>
    //     <span class="matchFull__broadcasts">
    //       <img alt="Logo Ligue 1+" class="matchFull__broadcastImage" />
    //     </span>
    //   </span>
    //   <span class="matchFull__team matchFull__team--away">
    //     <span class="matchTeam__name">TEAM</span>
    //   </span>
    $("time[datetime]").each((_j, timeEl) => {
      const datetime = $(timeEl).attr("datetime");
      if (!datetime || !/^\d{4}-\d{2}-\d{2}T/.test(datetime)) return;

      const kickoffDate = new Date(datetime);
      if (isNaN(kickoffDate.getTime())) return;
      if (kickoffDate < from || kickoffDate > to) return;

      // Walk up to the match card container (div.matchFull)
      const $card = $(timeEl).closest(".matchFull");
      if (!$card.length) return;

      // Home team has no --home modifier; away team has .matchFull__team--away
      const homeTeam = $card
        .find(".matchFull__team:not(.matchFull__team--away) .matchTeam__name")
        .first()
        .text()
        .trim();
      const awayTeam = $card
        .find(".matchFull__team--away .matchTeam__name")
        .first()
        .text()
        .trim();
      if (!homeTeam || !awayTeam) return;

      const channelAlt =
        $card.find(".matchFull__broadcastImage").first().attr("alt") ?? "";
      const channel = altToChannel(channelAlt);

      results.push({
        homeTeam,
        awayTeam,
        competition,
        kickoffAt: kickoffDate.toISOString(),
        channel,
      });
    });
  }

  return results;
}

// ─── Cross-check & merge ──────────────────────────────────────────────────────

function mergeMatches(
  sourceA: RawMatch[],
  sourceB: RawMatch[]
): MatchBroadcast[] {
  const usedB = new Set<number>();
  const out: MatchBroadcast[] = [];

  for (const a of sourceA) {
    const nHomeA = normalizeTeamName(a.homeTeam);
    const nAwayA = normalizeTeamName(a.awayTeam);
    const dayA = isoDay(a.kickoffAt);

    let matchIdx = -1;
    for (let i = 0; i < sourceB.length; i++) {
      if (usedB.has(i)) continue;
      const b = sourceB[i];
      if (
        normalizeTeamName(b.homeTeam) === nHomeA &&
        normalizeTeamName(b.awayTeam) === nAwayA &&
        isoDay(b.kickoffAt) === dayA &&
        Math.abs(
          new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime()
        ) <=
          2 * 3600 * 1000
      ) {
        matchIdx = i;
        break;
      }
    }

    if (matchIdx !== -1) {
      usedB.add(matchIdx);
      const b = sourceB[matchIdx];
      const channelA = a.channel;
      const channelB = b.channel;
      let channel: string | null;
      let channelUncertain: boolean;

      if (channelA !== null && channelB !== null) {
        channel = channelA === channelB ? channelA : null;
        channelUncertain = channelA !== channelB;
      } else if (channelA !== null || channelB !== null) {
        channel = channelA ?? channelB;
        channelUncertain = true;
      } else {
        channel = null;
        channelUncertain = true;
      }

      out.push({
        homeTeam: a.homeTeam,
        awayTeam: a.awayTeam,
        competition: a.competition || b.competition,
        kickoffAt: a.kickoffAt,
        channelA,
        channelB,
        channel,
        channelUncertain,
      });
    } else {
      // Source A only
      out.push({
        homeTeam: a.homeTeam,
        awayTeam: a.awayTeam,
        competition: a.competition,
        kickoffAt: a.kickoffAt,
        channelA: a.channel,
        channelB: null,
        channel: a.channel,
        channelUncertain: true,
      });
    }
  }

  // Source B only (unmatched)
  for (let i = 0; i < sourceB.length; i++) {
    if (usedB.has(i)) continue;
    const b = sourceB[i];
    out.push({
      homeTeam: b.homeTeam,
      awayTeam: b.awayTeam,
      competition: b.competition,
      kickoffAt: b.kickoffAt,
      channelA: null,
      channelB: b.channel,
      channel: b.channel,
      channelUncertain: true,
    });
  }

  return out.sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchBroadcastSchedule(): Promise<MatchBroadcast[]> {
  console.error("[scraper] Fetching Source A (maxifoot) and Source B (footmercato)…");
  const [settledA, settledB] = await Promise.allSettled([
    scrapeSourceA(),
    scrapeSourceB(),
  ]);

  const a = settledA.status === "fulfilled" ? settledA.value : [];
  const b = settledB.status === "fulfilled" ? settledB.value : [];

  if (settledA.status === "rejected")
    console.warn("[scraper] Source A failed:", settledA.reason);
  if (settledB.status === "rejected")
    console.warn("[scraper] Source B failed:", settledB.reason);

  console.error(
    `[scraper] Raw counts — Source A: ${a.length}, Source B: ${b.length}`
  );
  const merged = mergeMatches(a, b);
  console.error(`[scraper] Merged: ${merged.length} matches total`);
  return merged;
}

export async function persistBroadcastSchedule(
  matches: MatchBroadcast[]
): Promise<void> {
  const file = path.resolve(__dirname, "../data/schedule.json");
  const payload = {
    last_synced_at: new Date().toISOString(),
    matches,
  };
  await writeFile(file, JSON.stringify(payload, null, 2) + "\n", "utf-8");
}

// ─── CLI entrypoint ───────────────────────────────────────────────────────────

if (require.main === module) {
  const persist = process.argv.includes("--persist");
  fetchBroadcastSchedule()
    .then(async (matches) => {
      if (persist) {
        await persistBroadcastSchedule(matches);
        const ts = new Date().toISOString();
        console.log(`✅ Synced ${matches.length} matches. last_synced_at: ${ts}`);
      } else {
        console.log(JSON.stringify(matches, null, 2));
        const days = new Set(matches.map((m) => isoDay(m.kickoffAt))).size;
        console.error(
          `\n✅ fetcher returns ${matches.length} matches across ${days} days from 2 sources`
        );
      }
    })
    .catch((err) => {
      console.error("[scraper] Fatal:", err);
      process.exit(1);
    });
}
