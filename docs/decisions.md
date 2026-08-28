# Architecture decisions

These decisions override the relational-DB/live-backend architecture originally
sketched in `24-team-sleeper-fantasy-football-project-brief.md`. Recorded here so a
future session doesn't re-litigate them.

1. **Hosting is GitHub Pages** — static hosting only. No server process, no database
   server, no runtime secrets (Sleeper's API needs no token anyway).
2. **GitHub Actions is the only "backend."** A scheduled workflow (`sync-data.yml`)
   runs a Node/TypeScript script that calls the Sleeper API, normalizes the payloads,
   computes standings/playoff/Super Bowl state, and commits the results as JSON files
   under `/data`. The static frontend only ever reads committed JSON — it never calls
   Sleeper directly and never recomputes rankings/brackets client-side.
3. **Git is the database.** The committed JSON files under `/data` are the normalized
   data store. `data/meta/sync-log.json` plus git commit history stand in for the
   brief's `sync_runs` / audit-trail concept.
4. **Refresh cadence is relaxed.** Hourly syncing is more than sufficient for this
   league; even once-per-week would be acceptable. The brief's 30-60 second live-
   scoring ambitions, adaptive per-entity polling, and request-coalescing/locking
   machinery are intentionally descoped — see the full list in the plan / README.
5. **Admin overrides are a checked-in file**, `config/overrides.json`, edited by the
   commissioner directly or via PR. No admin-auth backend exists; GitHub's own
   PR/commit history is the audit log. This is weaker than real authentication but
   appropriate for a private league tool.
6. **Shared domain logic** lives in `packages/domain` as pure TypeScript (no I/O), used
   by both the sync script (`packages/sync`, Node-only, runs in Actions) and the
   frontend (`apps/web`, browser-only, reads committed JSON).

See the plan's "Descoped/altered from the original brief" section for the full list of
brief requirements that are intentionally not implemented as originally specified.
