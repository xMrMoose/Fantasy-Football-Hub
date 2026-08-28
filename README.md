# 24-Team Sleeper Fantasy Football Hub

A public, mobile-friendly site combining two 12-team Sleeper leagues (AFC and NFC)
into one 24-team competition, with combined standings, weekly matchups, six-team
conference playoffs, and a custom cross-league Week 17 Super Bowl.

## Architecture

- **Frontend**: React + TypeScript + Vite static SPA, deployed to GitHub Pages.
- **"Backend"**: a scheduled GitHub Actions workflow runs a Node/TS sync script that
  calls the read-only Sleeper API and commits normalized JSON into `/data`.
- **"Database"**: the committed JSON files under `/data`. No external DB.
- **Admin overrides**: `config/overrides.json`, human-edited.

See [`docs/decisions.md`](docs/decisions.md) for why, and
[`24-team-sleeper-fantasy-football-project-brief.md`](24-team-sleeper-fantasy-football-project-brief.md)
for the full original product brief.

## Repo layout

```
packages/domain/   pure TypeScript logic: normalization, standings, playoffs, Super Bowl
packages/sync/      Node script that calls Sleeper and writes /data (runs in Actions)
apps/web/           Vite React frontend that reads /data
data/                committed normalized "database"
config/overrides.json  manual overrides
fixtures/            sanitized sample Sleeper payloads for tests
```

## Local development

```
npm install
cp .env.example .env      # fill in real values if you have them
npm run sync -w packages/sync   # runs against fixtures if no real league IDs configured
npm run dev -w apps/web
npm test
```

## Getting live data

```
gh variable set SEASON --body <year>
gh variable set AFC_SLEEPER_LEAGUE_ID --body <id>
gh variable set NFC_SLEEPER_LEAGUE_ID --body <id>
gh workflow run discovery-spike.yml
gh workflow run sync-data.yml
```

See [`docs/runbook.md`](docs/runbook.md) for operations (season rollover, overrides,
troubleshooting a failed sync).
