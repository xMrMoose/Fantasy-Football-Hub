# Runbook

## Season rollover

Sleeper issues a new `league_id` each season and links back via
`previous_league_id`. When a new season starts:

1. Create/obtain the new AFC and NFC league IDs from Sleeper.
2. Update the `SEASON`, `AFC_SLEEPER_LEAGUE_ID`, `NFC_SLEEPER_LEAGUE_ID` repo
   variables (`gh variable set ...`).
3. Run `discovery-spike.yml` to sanity-check the new leagues' payloads before
   trusting the first real sync.
4. Run `sync-data.yml` manually once and review the resulting commit's diff
   under `data/` before letting the scheduled cron take over.
5. Prior seasons' committed JSON is left in place (not deleted) — history is
   available via git tags/branches if you want to snapshot a season before
   rollover, or simply via `git log` on the `data/` files.

## Applying a manual override

1. Edit `config/overrides.json` — add an entry with `entityType`, `entityId`,
   `field`, `before`, `after`, a **non-empty `reason`**, and your name as
   `actor`. The sync script refuses to run if `reason` or `actor` is empty.
2. Open a PR (or commit directly if you have push access) — the PR/commit
   itself is the audit trail, since there's no separate admin UI.
3. Once merged to `main`, the next `sync-data.yml` run (scheduled or
   `workflow_dispatch`) applies the override on top of the raw Sleeper data.
4. For Super Bowl overrides specifically, the override also gets appended to
   `data/superbowl/week17-superbowl.json`'s `overrideHistory`, which is
   rendered on the public Super Bowl page.

## Troubleshooting a failed sync

- Check the `sync-data.yml` run logs in the Actions tab — the sync script logs
  `WARNING:` and `ERROR:` lines per issue.
- Check `data/meta/sync-log.json`'s latest entry — `leagues.afc`/`leagues.nfc`
  each report `status` (`ok`/`failed`) and an `error` message if failed.
- A single conference failing does not block the other — the site renders a
  degraded-data banner and keeps the last known-good data for the failed side
  (see `FreshnessBanner`).
- If a sync run produces no diff, no commit is made (this is expected/normal,
  not a failure) — this happens when nothing has changed since the last run.

## Local development without real league IDs

`npm run dev -w apps/web` works against whatever is currently committed under
`/data` — including the empty-state seed files checked in at project start.
To exercise the app with realistic data before real league IDs are wired up,
hand-edit files under `/data` (they're plain JSON) or write a small script
that runs the domain-layer functions against the fixtures in `fixtures/`.
