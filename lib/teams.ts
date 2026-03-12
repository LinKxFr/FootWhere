interface TeamMeta {
  abbr: string;
  color: string;
  crest?: string;
}

// Base CDN for football-data.org crests
export const CREST_BASE = "https://crests.football-data.org";
const fd = (id: number) => `${CREST_BASE}/${id}.png`;

// football-data.org team IDs — used to build crest URLs for known clubs.
// Covers both API shortNames and static match data names (all aliases).
const TEAM_CREST_ID: Record<string, number> = {
  // Ligue 1
  "Paris Saint Germain": 524, "Paris Saint-Germain": 524, "Paris SG": 524, "PSG": 524,
  "RC Lens": 546, "Lens": 546,
  "Olympique Marseille": 516, "Marseille": 516,
  "Olympique Lyonnais": 523, "Lyon": 523,
  "AS Monaco": 548, "Monaco": 548,
  "LOSC Lille": 521, "Lille": 521,
  "OGC Nice": 522, "Nice": 522,
  "Stade Rennais FC": 528, "Rennes": 528,
  "RC Strasbourg Alsace": 576, "Strasbourg": 576,
  "FC Nantes": 543, "Nantes": 543,
  "Toulouse FC": 514, "Toulouse": 514,
  "Montpellier HSC": 518, "Montpellier": 518,
  "Stade Brestois 29": 3006, "Brest": 3006,
  "Le Havre AC": 532, "Le Havre": 532,
  "AJ Auxerre": 511, "Auxerre": 511,
  "Angers SCO": 516, "Angers": 516,
  "AS Saint-Etienne": 527, "Saint-Etienne": 527,
  "Stade de Reims": 547, "Reims": 547,

  // Premier League
  "Arsenal": 57, "Arsenal FC": 57,
  "Liverpool": 64, "Liverpool FC": 64,
  "Chelsea": 61, "Chelsea FC": 61,
  "Manchester City": 65, "Man City": 65,
  "Manchester United": 66, "Man United": 66, "Man Utd": 66,
  "Tottenham Hotspur": 73, "Tottenham": 73, "Spurs": 73,
  "Newcastle United": 67, "Newcastle": 67,
  "Aston Villa": 58, "Villa": 58,
  "Brighton": 397, "Brighton & Hove Albion": 397,
  "West Ham United": 563, "West Ham": 563,

  // La Liga
  "Real Madrid": 86, "Real Madrid CF": 86,
  "Barcelona": 81, "FC Barcelona": 81,
  "Atlético Madrid": 78, "Atletico Madrid": 78, "Atlético": 78,
  "Sevilla": 559, "Sevilla FC": 559, "Séville": 559,
  "Real Betis": 90, "Betis": 90,
  "Real Sociedad": 92,
  "Athletic Club": 63,
  "Villarreal": 94, "Villarreal CF": 94,

  // Bundesliga
  "FC Bayern München": 5, "Bayern München": 5, "Bayern": 5,
  "Borussia Dortmund": 4, "Dortmund": 4,
  "Bayer Leverkusen": 3, "Leverkusen": 3,
  "RB Leipzig": 721, "Leipzig": 721,
  "Eintracht Frankfurt": 19, "Frankfurt": 19,
  "VfB Stuttgart": 10, "Stuttgart": 10,
  "SC Freiburg": 17, "Freiburg": 17,

  // Serie A
  "FC Internazionale Milano": 108, "Internazionale": 108, "Inter": 108,
  "Juventus": 109, "Juventus FC": 109,
  "AC Milan": 98, "Milan": 98,
  "SSC Napoli": 113, "Napoli": 113, "Naples": 113,
  "AS Roma": 100, "Roma": 100,
  "SS Lazio": 110, "Lazio": 110,
  "ACF Fiorentina": 99, "Fiorentina": 99,
  "Atalanta": 714, "Atalanta BC": 714,
  "Bologna FC": 103, "Bologna": 103,

  // Liga Portugal
  "SL Benfica": 1903, "Benfica": 1903,
  "FC Porto": 498, "Porto": 498,
  "Sporting CP": 498, // verify if needed
  "SC Braga": 5602, "Braga": 5602,

  // Other European clubs
  "Galatasaray": 2281,
  "Molde FK": 1007, "Molde": 1007,
  "PSV Eindhoven": 682, "PSV": 682,
  "Ajax": 610,
  "Club Brugge": 851,
  "Anderlecht": 246,
  "Celtic": 502,
  "Rangers": 503,
  "Shakhtar Donetsk": 1887,
  "Dinamo Zagreb": 1041,
  "Red Bull Salzburg": 1877, "Salzburg": 1877,
  "Olympiakos": 563,
  "Fenerbahçe": 2291,
};

const TEAM_META: Record<string, Omit<TeamMeta, "crest">> = {
  // Ligue 1
  "Paris Saint Germain": { abbr: "PSG", color: "#003B7A" },
  "PSG": { abbr: "PSG", color: "#003B7A" },
  "RC Lens": { abbr: "LEN", color: "#E63B2E" },
  "Olympique Marseille": { abbr: "OM", color: "#2FB5F0" },
  "Marseille": { abbr: "OM", color: "#2FB5F0" },
  "Olympique Lyonnais": { abbr: "OL", color: "#D00027" },
  "Lyon": { abbr: "OL", color: "#D00027" },
  "AS Monaco": { abbr: "ASM", color: "#EF3340" },
  "Monaco": { abbr: "ASM", color: "#EF3340" },
  "LOSC Lille": { abbr: "LOSC", color: "#C41E3A" },
  "Lille": { abbr: "LOSC", color: "#C41E3A" },
  "OGC Nice": { abbr: "OGC", color: "#D0021B" },
  "Nice": { abbr: "OGC", color: "#D0021B" },
  "RC Strasbourg Alsace": { abbr: "RCSA", color: "#005DA8" },
  "Strasbourg": { abbr: "RCSA", color: "#005DA8" },
  "Stade Rennais FC": { abbr: "REN", color: "#E5003D" },
  "Rennes": { abbr: "REN", color: "#E5003D" },
  "FC Nantes": { abbr: "FCN", color: "#FCD615" },
  "Nantes": { abbr: "FCN", color: "#FCD615" },
  "Toulouse": { abbr: "TFC", color: "#7B2D8E" },
  "Montpellier": { abbr: "MHSC", color: "#003DA5" },
  "Stade Brestois 29": { abbr: "SB29", color: "#D20515" },
  "Brest": { abbr: "SB29", color: "#D20515" },
  "Le Havre": { abbr: "HAC", color: "#004A98" },
  "Le Havre AC": { abbr: "HAC", color: "#004A98" },
  "Metz": { abbr: "FCM", color: "#8B0000" },
  "Auxerre": { abbr: "AJA", color: "#003DA5" },
  "AJ Auxerre": { abbr: "AJA", color: "#003DA5" },
  "Angers": { abbr: "SCO", color: "#000000" },
  "Angers SCO": { abbr: "SCO", color: "#000000" },
  "Saint-Etienne": { abbr: "ASSE", color: "#00A650" },
  "AS Saint-Etienne": { abbr: "ASSE", color: "#00A650" },
  "Reims": { abbr: "SDR", color: "#D40026" },
  "Stade de Reims": { abbr: "SDR", color: "#D40026" },
  "Clermont Foot": { abbr: "CF63", color: "#B21830" },
  "Lorient": { abbr: "FCL", color: "#F26522" },

  // Premier League
  "Arsenal": { abbr: "ARS", color: "#EF0107" },
  "Arsenal FC": { abbr: "ARS", color: "#EF0107" },
  "Liverpool": { abbr: "LIV", color: "#C8102E" },
  "Liverpool FC": { abbr: "LIV", color: "#C8102E" },
  "Chelsea": { abbr: "CHE", color: "#034694" },
  "Chelsea FC": { abbr: "CHE", color: "#034694" },
  "Manchester City": { abbr: "MCI", color: "#6CABDD" },
  "Man City": { abbr: "MCI", color: "#6CABDD" },
  "Manchester United": { abbr: "MNU", color: "#DA291C" },
  "Man United": { abbr: "MNU", color: "#DA291C" },
  "Man Utd": { abbr: "MNU", color: "#DA291C" },
  "Tottenham": { abbr: "TOT", color: "#132257" },
  "Spurs": { abbr: "TOT", color: "#132257" },

  // La Liga
  "Real Madrid": { abbr: "RMA", color: "#FEBE10" },
  "Real Madrid CF": { abbr: "RMA", color: "#FEBE10" },
  "Barcelona": { abbr: "FCB", color: "#A50044" },
  "FC Barcelona": { abbr: "FCB", color: "#A50044" },
  "Atlético Madrid": { abbr: "ATM", color: "#CB3524" },
  "Atletico Madrid": { abbr: "ATM", color: "#CB3524" },
  "Atlético": { abbr: "ATM", color: "#CB3524" },
  "Villarreal": { abbr: "VIL", color: "#FCD000" },
  "Sevilla": { abbr: "SEV", color: "#D3000D" },
  "Sevilla FC": { abbr: "SEV", color: "#D3000D" },
  "Séville": { abbr: "SEV", color: "#D3000D" },
  "Real Betis": { abbr: "BET", color: "#00853E" },
  "Betis": { abbr: "BET", color: "#00853E" },
  "Real Sociedad": { abbr: "RSO", color: "#007FFF" },
  "Athletic Club": { abbr: "ATH", color: "#CC0000" },
  "Villarreal CF": { abbr: "VIL", color: "#FCD000" },

  // Bundesliga
  "Bayern München": { abbr: "FCB", color: "#DC052D" },
  "Bayern": { abbr: "FCB", color: "#DC052D" },
  "FC Bayern München": { abbr: "FCB", color: "#DC052D" },
  "Borussia Dortmund": { abbr: "BVB", color: "#FDE100" },
  "Dortmund": { abbr: "BVB", color: "#FDE100" },
  "Bayer Leverkusen": { abbr: "B04", color: "#E32221" },
  "Leverkusen": { abbr: "B04", color: "#E32221" },
  "Eintracht Frankfurt": { abbr: "SGE", color: "#E1000F" },
  "Frankfurt": { abbr: "SGE", color: "#E1000F" },
  "RB Leipzig": { abbr: "RBL", color: "#DD0741" },
  "Leipzig": { abbr: "RBL", color: "#DD0741" },

  // Serie A
  "Inter": { abbr: "INT", color: "#003DA5" },
  "Internazionale": { abbr: "INT", color: "#003DA5" },
  "FC Internazionale Milano": { abbr: "INT", color: "#003DA5" },
  "Juventus": { abbr: "JUV", color: "#000000" },
  "AC Milan": { abbr: "MIL", color: "#FB090B" },
  "Milan": { abbr: "MIL", color: "#FB090B" },
  "Napoli": { abbr: "NAP", color: "#087AC0" },
  "Naples": { abbr: "NAP", color: "#087AC0" },
  "AS Roma": { abbr: "ROM", color: "#8B0000" },
  "Roma": { abbr: "ROM", color: "#8B0000" },
  "Lazio": { abbr: "LAZ", color: "#87CEEB" },
  "SS Lazio": { abbr: "LAZ", color: "#87CEEB" },
  "Fiorentina": { abbr: "FIO", color: "#6E04AD" },
  "ACF Fiorentina": { abbr: "FIO", color: "#6E04AD" },
  "Atalanta": { abbr: "ATA", color: "#1E3A5F" },

  // Liga Portugal
  "Benfica": { abbr: "SLB", color: "#CC0000" },
  "SL Benfica": { abbr: "SLB", color: "#CC0000" },
  "Porto": { abbr: "FCP", color: "#003DA5" },
  "FC Porto": { abbr: "FCP", color: "#003DA5" },
  "Sporting CP": { abbr: "SCP", color: "#006400" },
  "Braga": { abbr: "SCB", color: "#C41E3A" },
  "SC Braga": { abbr: "SCB", color: "#C41E3A" },

  // Other European clubs
  "PSV Eindhoven": { abbr: "PSV", color: "#CC0000" },
  "PSV": { abbr: "PSV", color: "#CC0000" },
  "Ajax": { abbr: "AFC", color: "#CC0000" },
  "Galatasaray": { abbr: "GAL", color: "#F4364C" },
  "Fenerbahçe": { abbr: "FB", color: "#FDD017" },
  "Besiktas": { abbr: "BJK", color: "#000000" },
  "Celtic": { abbr: "CEL", color: "#00A650" },
  "Rangers": { abbr: "RFC", color: "#003399" },
  "Club Brugge": { abbr: "FCB", color: "#003E7E" },
  "Anderlecht": { abbr: "RSC", color: "#6E1F7A" },
  "Shakhtar Donetsk": { abbr: "SHA", color: "#F7A800" },
  "Dinamo Zagreb": { abbr: "GNK", color: "#0033A0" },
  "Red Bull Salzburg": { abbr: "RBS", color: "#CC0000" },
  "Salzburg": { abbr: "RBS", color: "#CC0000" },
  "Slavia Prague": { abbr: "SLA", color: "#CC0000" },
  "Molde": { abbr: "MFK", color: "#0060A9" },
  "Molde FK": { abbr: "MFK", color: "#0060A9" },
  "Olympiakos": { abbr: "OLY", color: "#CC0000" },
  "PAOK": { abbr: "PAO", color: "#000000" },
};

export function getTeamMeta(name: string): TeamMeta {
  const crestId = TEAM_CREST_ID[name];
  const crest = crestId ? fd(crestId) : undefined;

  if (TEAM_META[name]) {
    return { ...TEAM_META[name], crest };
  }

  // Try partial match
  const key = Object.keys(TEAM_META).find(
    (k) => name.includes(k) || k.includes(name)
  );
  if (key) {
    const crestByKey = TEAM_CREST_ID[key];
    return {
      ...TEAM_META[key],
      crest: crest ?? (crestByKey ? fd(crestByKey) : undefined),
    };
  }

  // Fallback: generate abbreviation and deterministic color from name
  const words = name.split(/\s+/);
  const abbr =
    words.length >= 2
      ? (words[0][0] + words[1][0] + (words[1][1] || "")).toUpperCase()
      : name.slice(0, 3).toUpperCase();

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `#${((hash >> 0) & 0xffffff).toString(16).padStart(6, "0")}`;

  return { abbr, color, crest };
}
