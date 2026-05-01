"use client";

import { useState, useEffect, useCallback } from "react";
import type { Match, StandingRow } from "@/lib/types";
import { getTeamMeta, CREST_BASE } from "@/lib/teams";
import { COMPETITION_CODES } from "@/lib/channels";
import standingsData from "@/data/standings.json";

/* ── STATIC CONFIG (same as prototype) ── */

const LEAGUES = [
  { id: "ALL", name: "Toutes", country: "\u{1F30D}", color: "#555" },
  { id: "L1", name: "Ligue 1", country: "\u{1F1EB}\u{1F1F7}", color: "#00A86B" },
  { id: "PL", name: "Premier League", country: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", color: "#3D195B" },
  { id: "SA", name: "Serie A", country: "\u{1F1EE}\u{1F1F9}", color: "#024494" },
  { id: "BL", name: "Bundesliga", country: "\u{1F1E9}\u{1F1EA}", color: "#D20515" },
  { id: "LL", name: "La Liga", country: "\u{1F1EA}\u{1F1F8}", color: "#EE8707" },
  { id: "LP", name: "Liga Portugal", country: "\u{1F1F5}\u{1F1F9}", color: "#006600" },
  // UEFA competitions — Canal+ holds French broadcast rights (2024–28)
  { id: "CL",   name: "C. League",  country: "\u2B50",         color: "#1D4ED8" },
  { id: "EL",   name: "Europa Lg",  country: "\uD83D\uDFE0",   color: "#EA580C" },
  { id: "UECL", name: "Conference", country: "\uD83D\uDFE2",   color: "#16A34A" },
];

const SUBS: Record<string, { label: string }> = {
  ligue1plus: { label: "Ligue 1+" },
  bein: { label: "BeIN Sports" },
  canal: { label: "Canal+" },
};

const FAV_TEAMS = ["RC Lens"];

/* Fallback static data for non-L1 leagues */
const STATIC_MATCHES: Record<string, Match[]> = {
  PL: [
    { id: 10, home: { name: "Arsenal", abbr: "ARS", color: "#EF0107" }, away: { name: "Man City", abbr: "MCI", color: "#6CABDD" }, date: "Samedi 8 mars", time: "13h30", channel: "Canal+", channelSub: "canal", live: false, favorite: false, competition: "Premier League \u00B7 GW29" },
    { id: 11, home: { name: "Liverpool", abbr: "LIV", color: "#C8102E" }, away: { name: "Chelsea", abbr: "CHE", color: "#034694" }, date: "Samedi 8 mars", time: "16h00", channel: "Canal+", channelSub: "canal", live: false, favorite: false, competition: "Premier League \u00B7 GW29" },
    { id: 12, home: { name: "Man Utd", abbr: "MNU", color: "#DA291C" }, away: { name: "Spurs", abbr: "TOT", color: "#132257" }, date: "Dimanche 9 mars", time: "15h00", channel: "Canal+", channelSub: "canal", live: false, favorite: false, competition: "Premier League \u00B7 GW29" },
  ],
  SA: [
    { id: 20, home: { name: "Inter", abbr: "INT", color: "#003DA5" }, away: { name: "Juventus", abbr: "JUV", color: "#000000" }, date: "Dimanche 9 mars", time: "18h00", channel: "BeIN Sports", channelSub: "bein", live: false, favorite: false, competition: "Serie A \u00B7 GJ29" },
    { id: 21, home: { name: "AC Milan", abbr: "MIL", color: "#FB090B" }, away: { name: "Naples", abbr: "NAP", color: "#087AC0" }, date: "Samedi 8 mars", time: "20h45", channel: "BeIN Sports", channelSub: "bein", live: false, favorite: false, competition: "Serie A \u00B7 GJ29" },
  ],
  BL: [
    { id: 30, home: { name: "Bayern", abbr: "FCB", color: "#DC052D" }, away: { name: "Dortmund", abbr: "BVB", color: "#FDE100" }, date: "Samedi 8 mars", time: "18h30", channel: "BeIN Sports", channelSub: "bein", live: false, favorite: false, competition: "Bundesliga \u00B7 J26" },
    { id: 31, home: { name: "Leverkusen", abbr: "B04", color: "#E32221" }, away: { name: "Leipzig", abbr: "RBL", color: "#DD0741" }, date: "Vendredi 7 mars", time: "20h30", channel: "BeIN Sports", channelSub: "bein", live: false, favorite: false, competition: "Bundesliga \u00B7 J26" },
  ],
  LL: [
    { id: 40, home: { name: "Barcelona", abbr: "FCB", color: "#A50044" }, away: { name: "Real Madrid", abbr: "RMA", color: "#FEBE10" }, date: "Dimanche 9 mars", time: "21h00", channel: "BeIN Sports", channelSub: "bein", live: false, favorite: false, competition: "La Liga \u00B7 J29" },
    { id: 41, home: { name: "Atl\u00E9tico", abbr: "ATM", color: "#CB3524" }, away: { name: "S\u00E9ville", abbr: "SEV", color: "#D3000D" }, date: "Samedi 8 mars", time: "21h00", channel: "BeIN Sports", channelSub: "bein", live: false, favorite: false, competition: "La Liga \u00B7 J29" },
  ],
  LP: [
    { id: 50, home: { name: "Benfica", abbr: "SLB", color: "#CC0000" }, away: { name: "Porto", abbr: "FCP", color: "#003DA5" }, date: "Samedi 8 mars", time: "21h15", channel: "Canal+", channelSub: "canal", live: false, favorite: false, competition: "Liga Portugal \u00B7 J25" },
  ],
  // UEFA competitions – live from API when available (Canal+, French rights 2024–28)
  CL:   [],
  EL:   [],
  UECL: [],
};

const STANDINGS = standingsData.standings as Record<string, StandingRow[]>;

/* ── UI COMPONENTS (exact prototype design) ── */

// Enriches a match's team data with crest URLs from our static lookup table.
// Used for static match data — API matches already carry crests from the API.
function withCrests(m: Match): Match {
  const homeMeta = getTeamMeta(m.home.name);
  const awayMeta = getTeamMeta(m.away.name);
  return {
    ...m,
    home: { ...m.home, crest: m.home.crest ?? homeMeta.crest },
    away: { ...m.away, crest: m.away.crest ?? awayMeta.crest },
  };
}

// ── Date helpers ─────────────────────────────────────────────────────────
/** Today's date as a capitalised French label, e.g. "Mardi 10 mars" */
function getTodayFrLabel(): string {
  const s = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Converts a French date label → midnight timestamp for sort/comparison */
function parseFrDate(label: string): number {
  const M: Record<string, number> = {
    janvier: 0, "février": 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, "août": 7, septembre: 8, octobre: 9, novembre: 10, "décembre": 11,
  };
  const parts = label.toLowerCase().split(" ");
  for (let i = 0; i < parts.length; i++) {
    if (M[parts[i]] !== undefined) {
      const day = parseInt(parts[i - 1], 10);
      return new Date(new Date().getFullYear(), M[parts[i]], isNaN(day) ? 1 : day).getTime();
    }
  }
  return Date.now();
}

const CrestLogo = ({ crest, abbr, color, size = 28 }: {
  crest?: string; abbr: string; color: string; size?: number;
}) => {
  const fallbackStyle: React.CSSProperties = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    background: color + "18", border: `1.5px solid ${color}50`,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const textStyle: React.CSSProperties = {
    fontSize: abbr.length > 3 ? 7 : 8, fontWeight: 700, color,
    fontFamily: "var(--font-dm-sans), sans-serif",
  };

  if (!crest) {
    return <div style={fallbackStyle}><span style={textStyle}>{abbr}</span></div>;
  }

  return (
    <div style={{ width: size, height: size, flexShrink: 0, position: "relative" }}>
      {/* Real crest — hidden via onError if it fails to load */}
      <img
        src={crest}
        alt={abbr}
        width={size}
        height={size}
        style={{ objectFit: "contain", display: "block" }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
          const fb = e.currentTarget.nextSibling as HTMLElement | null;
          if (fb) fb.style.display = "flex";
        }}
      />
      {/* Text fallback — shown only if img fails */}
      <div style={{ ...fallbackStyle, display: "none", position: "absolute", inset: 0 }}>
        <span style={textStyle}>{abbr}</span>
      </div>
    </div>
  );
};

const ChannelBadge = ({ channel, sub }: { channel: string; sub: string }) => {
  const s: Record<string, { bg: string; text: string; dot: string }> = {
    ligue1plus: { bg: "#F0F0F0", text: "#111", dot: "#111" },
    bein: { bg: "#E8F7F1", text: "#00875A", dot: "#00875A" },
    canal: { bg: "#F5F0FF", text: "#6B21A8", dot: "#7C3AED" },
  };
  const c = s[sub] || s.ligue1plus;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: c.bg, color: c.text, padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, display: "inline-block" }} />{channel}
    </span>
  );
};

const LiveBadge = () => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#FEE2E2", color: "#DC2626", padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#DC2626", display: "inline-block" }} />LIVE
  </span>
);

const Toggle = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
  <div onClick={onToggle} style={{ width: 36, height: 20, borderRadius: 10, background: active ? "#111" : "#E0E0E0", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
    <div style={{ position: "absolute", top: 2, left: active ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 10, fontWeight: 700, color: "#BBB", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>{children}</p>
);

// ── Match card ────────────────────────────────────────────────────────────
const MatchCard = ({ m, i = 0 }: { m: Match; i?: number }) => (
  <div className="anim" style={{ animationDelay: `${i * 0.05}s` }}>
    <div style={{ background: m.favorite ? "#FFFDF5" : "#fff", border: m.favorite ? "1.5px solid #F5E6C0" : "1.5px solid #EBEBEB", borderRadius: 12, padding: "11px 13px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
        <span style={{ fontSize: 9, color: "#CCC", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{m.competition}</span>
        {m.live ? <LiveBadge /> : <ChannelBadge channel={m.channel} sub={m.channelSub} />}
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <CrestLogo crest={m.home.crest} abbr={m.home.abbr} color={m.home.color} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{m.home.name}</span>
        </div>
        <div style={{ padding: "0 8px", textAlign: "center", minWidth: 58 }}>
          {m.live
            ? <span style={{ fontSize: 16, fontWeight: 700, color: "#DC2626" }}>{m.scoreHome ?? 0} &ndash; {m.scoreAway ?? 0}</span>
            : <span style={{ fontSize: 11, fontWeight: 600, color: "#999", background: "#F5F5F3", padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{m.time}</span>
          }
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right" }}>{m.away.name}</span>
          <CrestLogo crest={m.away.crest} abbr={m.away.abbr} color={m.away.color} />
        </div>
      </div>
    </div>
  </div>
);

// ── Match list ────────────────────────────────────────────────────────────
const MatchList = ({ matches, pinFavorites = true }: { matches: Match[]; pinFavorites?: boolean }) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const enriched = matches.map(withCrests);
  const todayLabel = getTodayFrLabel();
  const todayTime  = parseFrDate(todayLabel);

  // Split favourites from the rest (only when pinFavorites is on)
  const favs = pinFavorites ? enriched.filter((m) => m.favorite) : [];
  const rest = pinFavorites ? enriched.filter((m) => !m.favorite) : enriched;

  // Group the rest by date
  const grouped = rest.reduce<Record<string, Match[]>>((acc, m) => {
    acc[m.date] = acc[m.date] || [];
    acc[m.date].push(m);
    return acc;
  }, {});

  // Sort: today first → future ascending → past descending
  const sortedDates = Object.keys(grouped).sort((a, b) => {
    const da = parseFrDate(a) - todayTime;
    const db = parseFrDate(b) - todayTime;
    if (da >= 0 && db >= 0) return da - db;   // both future/today → earlier first
    if (da < 0  && db < 0)  return db - da;   // both past         → more recent first
    return da >= 0 ? -1 : 1;                  // future beats past
  });

  if (favs.length === 0 && sortedDates.length === 0)
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#CCC" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>{"\u26BD"}</div>
        <p style={{ fontSize: 13 }}>Aucun match avec ces filtres</p>
      </div>
    );

  return (
    <>
      {/* ── Favourites pinned at top ── */}
      {favs.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#F59E0B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            {"\u2B50"} Favoris
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {favs.map((m, i) => <MatchCard key={m.id} m={m} i={i} />)}
          </div>
        </div>
      )}

      {/* ── Date groups: today → future → past ── */}
      {sortedDates.map((date) => {
        const isToday    = parseFrDate(date) === todayTime;
        const label      = isToday ? "Aujourd'hui" : date;
        const isCollapsed = !!collapsed[date];
        const count      = grouped[date].length;
        return (
          <div key={date} style={{ marginBottom: 22 }}>
            {/* Clickable date header */}
            <div
              onClick={() => setCollapsed((prev) => ({ ...prev, [date]: !prev[date] }))}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: isCollapsed ? 0 : 8, userSelect: "none" }}
            >
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: isToday ? "#111" : "#C0C0C0" }}>
                {label}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {isCollapsed && (
                  <span style={{ fontSize: 10, color: "#C0C0C0" }}>{count} match{count > 1 ? "s" : ""}</span>
                )}
                <span style={{ fontSize: 8, color: "#C0C0C0" }}>{isCollapsed ? "\u25B6" : "\u25BC"}</span>
              </div>
            </div>
            {/* Match cards */}
            {!isCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {grouped[date].map((m, i) => <MatchCard key={m.id} m={m} i={i} />)}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

/* ── MAIN PAGE ── */

export default function FootWhere() {
  const [screen, setScreen] = useState<"matches" | "favoris" | "profil">("matches");
  const [matchTab, setMatchTab] = useState<"matches" | "classement">("matches");
  const [activeLeague, setActiveLeague] = useState("ALL");
  const [activeSubs, setActiveSubs] = useState(["ligue1plus", "bein", "canal"]);
  const [classementLeague, setClassementLeague] = useState("L1");

  // API-fetched matches for Ligue 1
  const [l1Matches, setL1Matches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // UEFA competitions — live from API when available
  const [clMatches,   setClMatches]   = useState<Match[]>([]);
  const [elMatches,   setElMatches]   = useState<Match[]>([]);
  const [ueclMatches, setUeclMatches] = useState<Match[]>([]);

  const fetchEuropean = useCallback(async () => {
    const markFavs = (m: Match) => ({
      ...m,
      favorite: FAV_TEAMS.includes(m.home.name) || FAV_TEAMS.includes(m.away.name),
    });
    const tryFetch = async (league: string): Promise<Match[]> => {
      try {
        const res  = await fetch(`/api/fixtures?league=${league}`);
        const data = await res.json();
        return data.matches?.length > 0 ? (data.matches as Match[]).map(markFavs) : [];
      } catch {
        return [];
      }
    };
    const [cl, el, uecl] = await Promise.all([
      tryFetch("CL"), tryFetch("EL"), tryFetch("UECL"),
    ]);
    if (cl.length)   setClMatches(cl);
    if (el.length)   setElMatches(el);
    if (uecl.length) setUeclMatches(uecl);
  }, []);

  const toggleSub = (s: string) =>
    setActiveSubs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const fetchL1 = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fixtures?league=L1");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.last_synced_at !== undefined)
        setLastSyncedAt(data.last_synced_at as string | null);
      // Mark favorites
      const matches = (data.matches as Match[]).map((m) => ({
        ...m,
        favorite:
          FAV_TEAMS.includes(m.home.name) || FAV_TEAMS.includes(m.away.name),
      }));
      setL1Matches(matches);
    } catch (err) {
      console.error("Failed to fetch L1 fixtures:", err);
      setError("Impossible de charger les matchs. V\u00E9rifiez votre cl\u00E9 API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchL1();
    fetchEuropean();
    // Refresh every 5 minutes for live scores
    const interval = setInterval(() => {
      fetchL1();
      fetchEuropean();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchL1, fetchEuropean]);

  // Build matches map: L1 + UEFA → live API when available, rest → static
  const MATCHES: Record<string, Match[]> = {
    L1:   l1Matches,
    PL:   STATIC_MATCHES.PL,
    SA:   STATIC_MATCHES.SA,
    BL:   STATIC_MATCHES.BL,
    LL:   STATIC_MATCHES.LL,
    LP:   STATIC_MATCHES.LP,
    CL:   clMatches,
    EL:   elMatches,
    UECL: ueclMatches,
  };

  const ALL_MATCHES = Object.values(MATCHES).flat();
  const pool = activeLeague === "ALL" ? ALL_MATCHES : (MATCHES[activeLeague] || []);
  const visibleMatches = pool.filter((m) => activeSubs.includes(m.channelSub));
  const favMatches = ALL_MATCHES.filter(
    (m) =>
      (FAV_TEAMS.includes(m.home.name) || FAV_TEAMS.includes(m.away.name)) &&
      activeSubs.includes(m.channelSub)
  );

  const standings = STANDINGS[classementLeague] || [];

  return (
    <div style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", minHeight: "100vh", background: "#FAFAF8", color: "#111", maxWidth: 520, margin: "0 auto" }}>

      {/* ── HEADER ── */}
      <div style={{ padding: "26px 20px 0", background: "#FAFAF8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif", fontSize: 26, fontWeight: 400, letterSpacing: "-0.02em" }}>FootWhere</h1>
            <p style={{ fontSize: 12, color: "#AAA", marginTop: 2 }}>Saison 2025&ndash;26</p>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>JD</span>
          </div>
        </div>

        {screen === "matches" && (
          <div style={{ display: "flex", marginTop: 18, borderBottom: "1px solid #E8E8E8" }}>
            {[{ id: "matches" as const, label: "Programme" }, { id: "classement" as const, label: "Classement" }].map((t) => (
              <button key={t.id} onClick={() => setMatchTab(t.id)} style={{
                background: "none", border: "none", padding: "9px 0", marginRight: 22, cursor: "pointer",
                fontSize: 13, fontWeight: matchTab === t.id ? 600 : 400,
                color: matchTab === t.id ? "#111" : "#AAA",
                borderBottom: matchTab === t.id ? "2px solid #111" : "2px solid transparent",
                marginBottom: -1,
              }}>{t.label}</button>
            ))}
          </div>
        )}

        {screen === "favoris" && (
          <div style={{ marginTop: 18, borderBottom: "1px solid #E8E8E8", paddingBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{"\u2B50"} Mes \u00E9quipes favorites</p>
            <p style={{ fontSize: 11, color: "#AAA", marginTop: 3 }}>Matches \u00E0 venir pour RC Lens</p>
          </div>
        )}

        {screen === "profil" && (
          <div style={{ marginTop: 18, borderBottom: "1px solid #E8E8E8", paddingBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Mon profil</p>
          </div>
        )}
      </div>

      {/* ── MATCHES SCREEN ── */}
      {screen === "matches" && matchTab === "matches" && (
        <div style={{ padding: "14px 20px 100px" }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
            {Object.entries(SUBS).map(([key, val]) => (
              <button key={key} onClick={() => toggleSub(key)} style={{
                padding: "4px 11px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer", flexShrink: 0,
                border: activeSubs.includes(key) ? "1.5px solid #111" : "1.5px solid #E0E0E0",
                background: activeSubs.includes(key) ? "#111" : "#fff",
                color: activeSubs.includes(key) ? "#fff" : "#666", transition: "all 0.15s",
              }}>{val.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 5, overflowX: "auto", marginBottom: 18, paddingBottom: 2 }}>
            {LEAGUES.map((l) => {
              const code = l.id !== "ALL" ? COMPETITION_CODES[l.id as keyof typeof COMPETITION_CODES] : null;
              const logoUrl = code ? `${CREST_BASE}/${code}.png` : null;
              return (
                <button key={l.id} onClick={() => setActiveLeague(l.id)} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "4px 11px",
                  borderRadius: 20, flexShrink: 0, cursor: "pointer",
                  border: activeLeague === l.id ? `1.5px solid ${l.color}` : "1.5px solid #E0E0E0",
                  background: activeLeague === l.id ? l.color : "#fff",
                  color: activeLeague === l.id ? "#fff" : "#666",
                  fontSize: 11, fontWeight: 500, transition: "all 0.15s",
                }}>
                  {logoUrl
                    ? <img src={logoUrl} alt={l.name} width={14} height={14} style={{ objectFit: "contain", flexShrink: 0 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    : <span>{l.country}</span>
                  }
                  <span>{l.name}</span>
                </button>
              );
            })}
          </div>

          {/* Loading / Error states */}
          {loading && activeLeague === "L1" && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#AAA" }}>
              <p style={{ fontSize: 13 }}>Chargement des matchs...</p>
            </div>
          )}
          {error && activeLeague === "L1" && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#DC2626" }}>
              <p style={{ fontSize: 13 }}>{error}</p>
              <button onClick={fetchL1} style={{ marginTop: 10, padding: "6px 16px", borderRadius: 8, border: "1.5px solid #DC2626", background: "none", color: "#DC2626", fontSize: 12, cursor: "pointer" }}>
                R\u00E9essayer
              </button>
            </div>
          )}
          {(!loading || activeLeague !== "L1") && (
            <MatchList matches={visibleMatches} />
          )}
          <p style={{ fontSize: 10, color: "#CCC", textAlign: "center", marginTop: 16, paddingBottom: 4 }}>
            {lastSyncedAt
              ? `Données TV mises à jour le ${new Date(lastSyncedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "")}`
              : "Données TV : synchronisation en attente"}
          </p>
        </div>
      )}

      {/* ── CLASSEMENT SCREEN ── */}
      {screen === "matches" && matchTab === "classement" && (
        <div style={{ padding: "14px 20px 100px" }}>
          <div style={{ display: "flex", gap: 5, overflowX: "auto", marginBottom: 16, paddingBottom: 2 }}>
            {LEAGUES.filter((l) => l.id !== "ALL").map((l) => {
              const code = COMPETITION_CODES[l.id as keyof typeof COMPETITION_CODES];
              const logoUrl = code ? `${CREST_BASE}/${code}.png` : null;
              return (
                <button key={l.id} onClick={() => setClassementLeague(l.id)} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "4px 11px",
                  borderRadius: 20, flexShrink: 0, cursor: "pointer",
                  border: classementLeague === l.id ? `1.5px solid ${l.color}` : "1.5px solid #E0E0E0",
                  background: classementLeague === l.id ? l.color : "#fff",
                  color: classementLeague === l.id ? "#fff" : "#666",
                  fontSize: 11, fontWeight: 500, transition: "all 0.15s",
                }}>
                  {logoUrl
                    ? <img src={logoUrl} alt={l.name} width={14} height={14} style={{ objectFit: "contain", flexShrink: 0 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    : <span>{l.country}</span>
                  }
                  <span>{l.name}</span>
                </button>
              );
            })}
          </div>
          <div style={{ background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 30px 30px 30px 34px", gap: 5, padding: "9px 13px", borderBottom: "1px solid #F0F0F0" }}>
              {["#", "\u00C9quipe", "V", "N", "D", "Pts"].map((h) => (
                <span key={h} style={{ fontSize: 9, fontWeight: 700, color: "#CCC", letterSpacing: "0.08em", textTransform: "uppercase", textAlign: h === "\u00C9quipe" ? "left" : "center" }}>{h}</span>
              ))}
            </div>
            {standings.map((row, i) => (
              <div key={row.team} className="anim" style={{
                display: "grid", gridTemplateColumns: "22px 1fr 30px 30px 30px 34px",
                gap: 5, padding: "11px 13px",
                borderBottom: i < standings.length - 1 ? "1px solid #F8F8F8" : "none",
                background: row.pos <= 2 ? "#F8FFFC" : row.pos <= 5 ? "#FAFAFE" : "#fff",
                animationDelay: `${i * 0.04}s`,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", color: row.pos === 1 ? "#F59E0B" : row.pos <= 2 ? "#10B981" : row.pos <= 5 ? "#6366F1" : "#DDD" }}>{row.pos}</span>
                <span style={{ fontSize: 13, fontWeight: row.pos <= 3 ? 600 : 400, display: "flex", alignItems: "center" }}>{row.team}</span>
                {[row.w, row.d, row.l].map((v, j) => (
                  <span key={j} style={{ fontSize: 12, color: "#999", display: "flex", alignItems: "center", justifyContent: "center" }}>{v}</span>
                ))}
                <span style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{row.pts}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
            {[{ color: "#10B981", label: "Ligue des Champions" }, { color: "#6366F1", label: "Ligue Europa / Conference" }].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color + "30", border: `1.5px solid ${l.color}` }} />
                <span style={{ fontSize: 11, color: "#AAA" }}>{l.label}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: "#CCC", textAlign: "center", marginTop: 16, paddingBottom: 4 }}>
            {standingsData.last_synced_at
              ? `Classements mis à jour le ${new Date(standingsData.last_synced_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`
              : "Classements non encore synchronisés"}
          </p>
        </div>
      )}

      {/* ── FAVORIS SCREEN ── */}
      {screen === "favoris" && (
        <div style={{ padding: "14px 20px 100px" }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 18 }}>
            {Object.entries(SUBS).map(([key, val]) => (
              <button key={key} onClick={() => toggleSub(key)} style={{
                padding: "4px 11px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer", flexShrink: 0,
                border: activeSubs.includes(key) ? "1.5px solid #111" : "1.5px solid #E0E0E0",
                background: activeSubs.includes(key) ? "#111" : "#fff",
                color: activeSubs.includes(key) ? "#fff" : "#666",
              }}>{val.label}</button>
            ))}
          </div>
          <MatchList matches={favMatches} pinFavorites={false} />
          {favMatches.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#CCC" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{"\u2B50"}</div>
              <p style={{ fontSize: 13 }}>Ajoute des \u00E9quipes favorites dans ton profil</p>
            </div>
          )}
        </div>
      )}

      {/* ── PROFIL SCREEN ── */}
      {screen === "profil" && (
        <div style={{ padding: "14px 20px 100px" }}>
          <div style={{ background: "#111", borderRadius: 14, padding: "18px 20px", marginBottom: 18, color: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#2A2A2A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>JD</span>
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 15 }}>Justin D.</p>
                <p style={{ fontSize: 12, color: "#666", marginTop: 2 }}>justin@email.com</p>
              </div>
            </div>
          </div>

          <SectionLabel>{"\u00C9"}quipes favorites</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
            {["RC Lens", "Marseille", "Liverpool", "Bayern", "Barcelona"].map((team) => (
              <div key={team} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 10, padding: "11px 14px" }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{team}</span>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: FAV_TEAMS.includes(team) ? "#111" : "#F0F0F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {FAV_TEAMS.includes(team) && <span style={{ color: "#fff", fontSize: 11 }}>{"\u2713"}</span>}
                </div>
              </div>
            ))}
          </div>

          <SectionLabel>Mes abonnements</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
            {Object.entries(SUBS).map(([key, val]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 10, padding: "12px 14px" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{val.label}</span>
                  <p style={{ fontSize: 11, color: "#BBB", marginTop: 2 }}>
                    {key === "ligue1plus" ? "\u20AC14.99/mois \u00B7 Prime Video" : key === "bein" ? "\u20AC15.99/mois \u00B7 myCanal" : "\u20AC25.99/mois"}
                  </p>
                </div>
                <Toggle active={activeSubs.includes(key)} onToggle={() => toggleSub(key)} />
              </div>
            ))}
          </div>

          <SectionLabel>Alertes match</SectionLabel>
          <div style={{ background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 10, padding: "13px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Notification avant match</span>
              <Toggle active={true} onToggle={() => {}} />
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {["15 min", "30 min", "1h"].map((t) => (
                <button key={t} style={{
                  padding: "4px 11px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer",
                  border: t === "30 min" ? "1.5px solid #111" : "1.5px solid #E0E0E0",
                  background: t === "30 min" ? "#111" : "#fff",
                  color: t === "30 min" ? "#fff" : "#666",
                }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ background: "#FFFDF0", border: "1.5px solid #F5E6C0", borderRadius: 10, padding: "11px 13px", display: "flex", gap: 10 }}>
            <span style={{ fontSize: 16 }}>{"\uD83D\uDD14"}</span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600 }}>Exemple d&apos;alerte</p>
              <p style={{ fontSize: 11, color: "#888", marginTop: 3, lineHeight: 1.55 }}>
                &quot;30 min avant le d&eacute;but du match<br /><strong>RC Lens vs PSG</strong> sur <strong>Ligue 1+</strong>&quot;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 520,
        background: "rgba(250,250,248,0.94)", backdropFilter: "blur(12px)",
        borderTop: "1px solid #EBEBEB",
        display: "flex", justifyContent: "space-around", padding: "9px 0 18px",
      }}>
        {([
          { id: "matches" as const, icon: "\u26BD", label: "Matches" },
          { id: "favoris" as const, icon: "\u2B50", label: "Favoris" },
          { id: "profil" as const, icon: "\uD83D\uDC64", label: "Profil" },
        ]).map((n) => (
          <button key={n.id} onClick={() => setScreen(n.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            opacity: screen === n.id ? 1 : 0.3, transition: "opacity 0.15s",
          }}>
            <span style={{ fontSize: 18 }}>{n.icon}</span>
            <span style={{ fontSize: 10, fontWeight: screen === n.id ? 600 : 400, color: "#111" }}>{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
