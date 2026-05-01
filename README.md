# FootWhere

Tell French TV viewers which channel broadcasts which football match.

## Broadcast schedule sync

### How the job runs
A GitHub Actions workflow (`.github/workflows/sync-schedule.yml`) runs every Monday at approximately 06:00 Europe/Paris (05:00 UTC).
It fetches the next 7 days of French football broadcast data from two independent public sources, cross-checks the channel information, and commits the result to `data/schedule.json`.

The job also runs on `workflow_dispatch`, meaning it can be triggered manually from the GitHub Actions UI at any time.

### How to trigger manually (CLI)
```bash
npm run sync
```
This fetches both sources, cross-checks channels, and overwrites `data/schedule.json` locally.
Run `npm run sync:dry` to fetch without writing to disk.

### How to swap a source
Open `scripts/scrape-schedule.ts`. The comment block at the top of the file explains which sources are used and why.
To replace Source A or Source B: implement a new function matching the `scrapeSourceA()` or `scrapeSourceB()` signature and swap the call inside `fetchBroadcastSchedule()`. The cross-check logic is source-agnostic and requires no changes.

### What channel_uncertain means
When the two sources disagree on which channel broadcasts a match, or when only one source has the information, the match is stored with `channelUncertain: true`.
The UI displays these matches with a "channel TBD" indicator rather than silently picking one source.
If neither source has channel information, `channel` is stored as `null` and the UI shows "channel TBD".

## Classements automatiques

**Source :** [football-data.org](https://www.football-data.org) (tier gratuit, free forever)
**Fréquence :** tous les jours à 23h30 Europe/Paris
**Ligues couvertes :** L1, PL, SA, BL, LL, LP

### Déclencher manuellement
- GitHub : Actions → sync-schedule → Run workflow
- Local : `npm run sync:standings` (nécessite `FOOTBALL_DATA_KEY` dans `.env.local`)

### Ajouter une ligue
Éditer `LEAGUE_MAP` dans `src/jobs/scrape-standings.ts` — ajouter
`{ clé FootWhere }: { code API football-data.org }`.

### Remplacer la source
Remplacer la fonction `fetchLeague()` dans `src/jobs/scrape-standings.ts`.
La boucle, la gestion d'erreur et la persistance sont indépendantes de la source.
