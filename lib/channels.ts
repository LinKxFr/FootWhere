// Channel mapping for football broadcasts in France
// Ligue 1:        Ligue 1+ (Prime Video add-on) — except Saturday 17h = BeIN Sports
// Premier League: Canal+
// Serie A:        BeIN Sports
// Bundesliga:     BeIN Sports
// La Liga:        BeIN Sports (holds Spanish football rights since 2012)
// Liga Portugal:  Canal+
// UCL / UEL / UECL: Canal+ (2024–28 UEFA deal)

// football-data.org competition codes
export const COMPETITION_CODES = {
  L1: "FL1",    // Ligue 1
  PL: "PL",     // Premier League
  SA: "SA",     // Serie A
  BL: "BL1",    // Bundesliga
  LL: "PD",     // La Liga (Primera División)
  LP: "PPL",    // Liga Portugal (Primeira Liga)
  CL: "CL",     // UEFA Champions League
  EL: "EL",     // UEFA Europa League
  UECL: "UECL", // UEFA Europa Conference League
} as const;

interface ChannelInfo {
  channel: string;
  channelSub: string;
}

export function getChannel(competitionCode: string, utcDate: string): ChannelInfo {
  // Convert UTC to Paris time for broadcast logic
  const date = new Date(utcDate);
  const parisTime = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const day = parisTime.getDay(); // 0=Sunday, 6=Saturday
  const hour = parisTime.getHours();

  // Ligue 1
  if (competitionCode === COMPETITION_CODES.L1) {
    if (day === 6 && hour === 17) {
      return { channel: "BeIN Sports", channelSub: "bein" };
    }
    return { channel: "Ligue 1+", channelSub: "ligue1plus" };
  }

  // Premier League → Canal+
  if (competitionCode === COMPETITION_CODES.PL) {
    return { channel: "Canal+", channelSub: "canal" };
  }

  // Serie A → BeIN Sports
  if (competitionCode === COMPETITION_CODES.SA) {
    return { channel: "BeIN Sports", channelSub: "bein" };
  }

  // Bundesliga → BeIN Sports
  if (competitionCode === COMPETITION_CODES.BL) {
    return { channel: "BeIN Sports", channelSub: "bein" };
  }

  // La Liga → BeIN Sports (beIN Sports holds Spanish football rights in France)
  if (competitionCode === COMPETITION_CODES.LL) {
    return { channel: "BeIN Sports", channelSub: "bein" };
  }

  // Liga Portugal → Canal+
  if (competitionCode === COMPETITION_CODES.LP) {
    return { channel: "Canal+", channelSub: "canal" };
  }

  // UEFA Champions League → Canal+
  // Canal+ holds the French broadcast rights for UCL (2024–28 deal)
  if (competitionCode === COMPETITION_CODES.CL) {
    return { channel: "Canal+", channelSub: "canal" };
  }

  // UEFA Europa League → Canal+
  if (competitionCode === COMPETITION_CODES.EL) {
    return { channel: "Canal+", channelSub: "canal" };
  }

  // UEFA Conference League → Canal+
  if (competitionCode === COMPETITION_CODES.UECL) {
    return { channel: "Canal+", channelSub: "canal" };
  }

  // Default
  return { channel: "Canal+", channelSub: "canal" };
}
