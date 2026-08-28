# 24-Team, Two-Conference Fantasy Football Website

## Project Brief for Claude Code Plan Mode

**Status:** Planning brief  
**League size:** 24 teams total  
**Conference structure:** Two separate 12-team Sleeper leagues: AFC and NFC  
**Data source:** Sleeper's read-only API  
**Primary reference:** [Official Sleeper API documentation](https://docs.sleeper.com/)

## 1. Product vision

Build a public, mobile-friendly website that acts as the shared home for a 24-team fantasy football competition administered as two separate Sleeper leagues. Sleeper remains the source of truth for normal league activity, rosters, lineups, regular-season results, and conference playoff scoring. The website combines the two leagues into one experience and owns the cross-league Week 17 Super Bowl logic that Sleeper cannot represent natively.

The site should let any participant:

- View AFC, NFC, and combined standings.
- View every weekly matchup across both conferences.
- Open a matchup to see starters, bench players, individual scoring, team totals, and game status in a Sleeper-like presentation.
- Follow each conference's six-team playoff bracket through Weeks 14-16.
- Follow a custom Week 17 Super Bowl between the AFC and NFC champions, using the champions' Sleeper lineups and scoring.

This project is primarily read-only. Team management, lineup changes, waivers, trades, commissioner changes, and scoring corrections remain in Sleeper.

## 2. Goals and success criteria

### Core goals

1. Present all 24 teams as one coherent league without hiding conference membership.
2. Keep displayed records, points, rosters, lineups, and weekly scores synchronized with Sleeper.
3. Make live matchup views useful during NFL games without exceeding reasonable API traffic.
4. Correctly seed and render two six-team conference brackets.
5. Create and score a reliable cross-league Week 17 Super Bowl.
6. Preserve historical results so the site remains useful after a Sleeper league rolls into a new season.

### MVP acceptance criteria

- The application accepts an AFC Sleeper league ID and an NFC Sleeper league ID through environment/configuration values.
- It verifies that both leagues exist and displays a clear configuration error if either cannot be loaded.
- AFC, NFC, and combined standings each show team name, owner, wins, losses, ties, points for, points against, and conference.
- The weekly page shows all matchups from both leagues and supports Weeks 1-17.
- A matchup detail view shows each team's starters and bench, player identity and position, per-player points when available, and current/final team total.
- Conference playoff pages show six seeds per conference, first-round byes, advancement, and conference champions.
- The Week 17 page creates one AFC champion versus NFC champion matchup and computes/displays both scores from the appropriate source-league lineup/scoring data.
- Manual overrides and anomalous states are auditable and do not overwrite raw Sleeper data.
- Loading, stale-data, unavailable-data, empty, and partial-failure states are visible to users.

## 3. Scope

### In scope

- Public read-only league hub.
- AFC and NFC branding/navigation.
- Conference and combined standings.
- Weekly scoreboards and detailed lineup views.
- NFL player directory/cache for resolving Sleeper player IDs.
- Conference playoff brackets for Weeks 14-16.
- Custom Week 17 Super Bowl.
- Configurable tie-breaking and seeding rules.
- Scheduled synchronization, on-demand refresh controls, cache timestamps, and data health indicators.
- Administrative configuration for league IDs, playoff seeds/overrides, tie decisions, and Super Bowl participants if automation cannot resolve them.

### Out of scope for the first release

- Editing Sleeper lineups or league settings.
- Running waivers, trades, drafts, or chat.
- Replacing Sleeper as the authoritative game-management platform.
- Authentication for ordinary viewers.
- Betting, projections, or proprietary live-play feeds unless separately licensed.

## 4. Required pages and user experience

### Home/dashboard

- Current NFL week and season state.
- Featured live/recent matchups from both conferences.
- Compact AFC and NFC leaders.
- Combined top teams.
- Playoff race or bracket summary when relevant.
- Data freshness timestamp and a visible degraded-data message when one source league fails.

### Standings

Provide three switchable views:

1. **Combined:** all 24 teams.
2. **AFC:** the 12 AFC teams.
3. **NFC:** the 12 NFC teams.

Columns should include rank, conference seed/rank, team, owner, W-L-T, winning percentage, points for, points against, point differential, and optional streak. Treat the published tie-break order as explicit configuration, not an accidental database sort.

The combined table is a comparison/ranking view; it does not imply that cross-conference regular-season games occurred. If the two Sleeper leagues have different scoring settings, prominently warn that raw points are not directly comparable and either disable overall ranking by points or use an explicitly approved normalization rule.

### Weekly matchups

- Week selector for Weeks 1-17.
- Conference filter: All, AFC, or NFC.
- Score cards showing both teams, records, totals, live/final status, and winner when final.
- Matchup detail showing ordered starter slots and bench players.
- Each player row should show name, NFL team, position, lineup slot, game status, fantasy points, and injury/status information when available.
- Mark commissioner-adjusted/custom team totals when the source payload indicates an override.
- Never infer a final winner merely because all currently visible players have finished; use a defensible week/game state and show `Unofficial` until finalization criteria are met.

### Playoffs

Render AFC and NFC sides separately, preferably in a mirrored bracket around the Week 17 Super Bowl.

Per conference:

- Six qualifiers, seeded 1-6.
- Week 14: seeds 1 and 2 receive byes; seed 3 plays seed 6; seed 4 plays seed 5.
- Week 15: two semifinals. The default assumption is reseeding, with seed 1 playing the lowest remaining seed and seed 2 playing the other remaining seed. Make this rule configurable because Sleeper/custom league rules may use a fixed bracket instead.
- Week 16: conference championship.
- Week 17: AFC champion versus NFC champion in the custom Super Bowl.

Show seed, team, owner, score, winner, source week, source league, and whether a participant/result was derived automatically or manually overridden.

### Week 17 Super Bowl

Sleeper cannot create a cross-league matchup, so the website must own this object and its lifecycle.

- Resolve the AFC and NFC champions from finalized Week 16 conference championship results.
- Freeze or version the selected Week 17 starter lineup for each champion based on that team's source Sleeper league Week 17 matchup payload.
- Calculate/display each team's Week 17 score using its actual starters and the scoring rules of its source league.
- If the two league scoring settings differ, treat this as a blocking configuration problem unless the commissioner has explicitly chosen a canonical Super Bowl scoring configuration and the system has a reliable way to calculate it.
- Display live/unofficial/final status and a last-updated timestamp.
- Support commissioner override of participant, lineup, score, tie resolution, and winner, with reason, timestamp, and audit history.
- Do not overwrite the custom Super Bowl merely because a later sync temporarily returns incomplete data.

## 5. Sleeper API integration

Base URL: `https://api.sleeper.app/v1`

Sleeper documents the API as read-only, token-free, and free for non-commercial use. Its documentation advises staying under 1,000 calls per minute. The application should use substantially fewer calls through server-side caching and request coalescing.

### Required endpoints

| Purpose | Endpoint | Notes |
|---|---|---|
| League configuration | `GET /league/{league_id}` | Validate season, roster count, roster positions, scoring settings, status, and previous league ID. |
| Rosters and standings totals | `GET /league/{league_id}/rosters` | Includes owner, players, starters, W-L-T, points for, and points against fields. Preserve whole and decimal score components. |
| Owners/team metadata | `GET /league/{league_id}/users` | Join user records to rosters by `owner_id`; team name may be in user metadata. |
| Weekly matchups | `GET /league/{league_id}/matchups/{week}` | Pair entries by `matchup_id`; use `starters`, `players`, `points`, and `custom_points`. Verify actual season payloads for any per-player score map before depending on it. |
| Winners bracket | `GET /league/{league_id}/winners_bracket` | Useful for checking conference bracket state; website rules remain authoritative for the requested custom format. |
| Losers bracket | `GET /league/{league_id}/losers_bracket` | Optional consolation display. The docs navigation/example uses `losers_bracket`; guard against documentation typos. |
| Transactions | `GET /league/{league_id}/transactions/{round}` | Optional activity feed and useful context for roster changes. In football, round/leg represents the week. |
| NFL state | `GET /state/nfl` | Current week, displayed week, season, and season type. Do not use this alone to declare fantasy results final. |
| Player directory | `GET /players/nfl` | Large payload; fetch infrequently, cache persistently, and resolve player IDs locally. |
| User lookup | `GET /user/{username_or_user_id}` | Optional setup helper; store stable `user_id`, not mutable username. |

Official reference: [Sleeper API documentation](https://docs.sleeper.com/).

### Integration rules

- Call Sleeper from the server/backend, not independently from every browser.
- Store league IDs as strings; do not risk precision loss by treating long IDs as JavaScript numbers.
- Namespace roster and matchup identifiers by league/conference. A `roster_id` or `matchup_id` is not globally unique.
- Retain raw JSON snapshots or hashes for debugging and replay, alongside normalized records.
- Preserve `null` as unknown/not supplied; do not silently turn it into zero.
- Correctly combine Sleeper's integer and decimal point fields where applicable. Add tests for negative points and decimal values.
- Use `custom_points` according to observed Sleeper semantics and visibly label overrides. Confirm behavior with live league payloads.
- Expect owner slots to be empty, co-owned, reassigned, or renamed during a season.
- Treat API schema as externally controlled: validate at ingestion and log unknown/missing fields without crashing the public site.

### Important live-scoring caveat

The documented matchup endpoint clearly supplies lineup player IDs and a team total. The public documentation's example does not fully specify every per-player live scoring field or guarantee play-level data. During the planning spike, inspect real Week 1-17 payloads from both configured leagues and determine whether `players_points` or equivalent per-player totals are present and sufficiently current.

If reliable per-player points are not available from the documented response, Plan Mode must identify a compliant data source or reduce the MVP to team totals plus player lineups. Do not invent points from roster totals, scrape Sleeper pages, or promise play-by-play without a supported source.

## 6. Standings and ranking logic

Create one normalized standings service that can emit conference or combined views.

Recommended default sort order, pending commissioner confirmation:

1. Winning percentage, computed as `(wins + 0.5 * ties) / games_played`.
2. Points for.
3. Point differential.
4. Stable deterministic fallback such as normalized team name or internal team ID.

This default is only a presentation order. Playoff qualification/seeding must use the league's formally approved rules, including any divisions or head-to-head tie-breakers. If head-to-head is required, derive it from historical weekly matchups and test multi-team ties explicitly.

Points for and against should be calculated consistently. Prefer authoritative roster totals for the headline standings, but compare them with aggregates of finalized weekly matchups and surface discrepancies for administrator review.

## 7. Playoff state machine

Model playoffs as persisted competition data rather than a visual transformation of the latest API response.

Suggested states:

`scheduled -> live -> unofficial -> final`

Additional exceptional states:

`awaiting_participant`, `source_incomplete`, `tied`, `overridden`, `void`

Progression rules:

- Seeds are captured in a versioned playoff-seeding record before Week 14.
- A matchup advances a winner only after it is final or an authorized override is applied.
- Re-seeding, if enabled, occurs only after both Week 14 games in that conference are final.
- Conference champions are locked/versioned after Week 16.
- The Super Bowl is created idempotently: retries update the same event rather than creating duplicates.
- Later source corrections trigger a visible reconciliation workflow. They must not silently rewrite already published advancement.

Tie handling must be configurable before the playoffs. Possible rules include bench points, higher seed, or commissioner decision. The system must not guess.

## 8. Suggested data model

Exact names can change with the chosen stack, but preserve these concepts:

- `seasons`: season, status, active week, rules version.
- `source_leagues`: season, conference, Sleeper league ID, settings snapshot/hash, sync status.
- `users`: Sleeper user ID, display name, avatar, metadata snapshot.
- `teams`: internal team ID, season, conference, source league ID, source roster ID, owner ID, display name.
- `roster_snapshots`: team, week, players, starters, reserve/taxi when present, fetched time, source hash.
- `player_directory`: Sleeper player ID, name, NFL team, positions, status, metadata, refreshed time.
- `weekly_matchups`: season, week, conference, source league, source matchup ID, team A/B, totals, custom totals, state.
- `player_week_scores`: season, week, source league, team, player, lineup slot, starter flag, points, status, source timestamp.
- `standings_snapshots`: season, week/as-of time, team, W-L-T, PF, PA, calculated metrics.
- `playoff_seeds`: season, conference, seed, team, rules version, source/override metadata.
- `playoff_matchups`: season, competition round, conference or `SUPER_BOWL`, NFL week, participants, scores, winner, state, provenance.
- `manual_overrides`: entity type/ID, field, before, after, reason, actor, timestamp.
- `sync_runs`: source, start/end, success, counts, warnings, error summary.

Use a composite source identity such as `(season, sleeper_league_id, roster_id)` rather than `roster_id` alone.

## 9. Architecture guidance

### Recommended shape

- **Frontend:** responsive web app with server-rendered or hybrid pages for fast public access and client refresh on live views.
- **Backend/API layer:** owns Sleeper calls, normalization, playoff logic, caching, reconciliation, and admin actions.
- **Relational database:** stores configuration, normalized snapshots, playoff state, overrides, and sync history.
- **Cache:** optional but useful for hot current-week pages, request coalescing, and stale-while-revalidate behavior.
- **Background scheduler:** refreshes season state, league metadata, rosters, matchups, and current-week scoring on different cadences.

Avoid making build-time data fetching the only integration strategy; live Sunday scoring requires runtime refresh. Also avoid coupling UI components directly to raw Sleeper payloads. Use typed domain objects so external schema changes are isolated to the ingestion adapter.

### Suggested service boundaries

- `SleeperClient`: transport, retries, timeouts, response validation, and caching.
- `SleeperNormalizer`: raw payloads to domain records.
- `StandingsService`: conference/combined rankings and tie-break calculations.
- `MatchupService`: pairing, lineup presentation, live status, and totals.
- `PlayoffService`: seeding, bracket progression, re-seeding, finalization, and reconciliation.
- `SuperBowlService`: cross-league participant resolution, Week 17 lineup snapshots, scoring, and overrides.
- `SyncService`: jobs, locks, idempotency, backoff, and monitoring.

### Configuration

At minimum:

```text
SEASON
AFC_SLEEPER_LEAGUE_ID
NFC_SLEEPER_LEAGUE_ID
PLAYOFF_START_WEEK=14
SUPER_BOWL_WEEK=17
PLAYOFF_TEAM_COUNT=6
PLAYOFF_RESEED=true|false
STANDINGS_TIEBREAK_RULES=...
PLAYOFF_TIE_RULE=...
DATA_REFRESH_PROFILE=...
ADMIN_AUTH_CONFIG=...
```

Do not commit secrets. The Sleeper API itself requires no token, but database, deployment, logging, and admin credentials still do.

## 10. Live refresh, caching, and resilience

Use server-managed adaptive refresh intervals rather than one browser equaling one Sleeper poller.

Suggested initial policy:

- League settings/users: every 6-24 hours and on manual refresh.
- Player directory: daily or less often, with persistent cache and conditional replacement.
- Rosters: every 5-15 minutes during active periods; less often off-season.
- Current-week matchups during game windows: every 30-60 seconds server-side, adjusted after observing payload freshness.
- Completed/past weeks: immutable cache unless a reconciliation or manual refresh is requested.
- NFL state: every 5-15 minutes during the season.

Implementation safeguards:

- Deduplicate simultaneous refreshes with a lock/single-flight mechanism.
- Add timeouts, bounded exponential backoff, and jitter.
- Serve the last successful snapshot when Sleeper is unavailable and label it `Last updated ...`.
- Permit one conference to render while the other is degraded.
- Do not cache errors as valid empty arrays.
- Track source timestamps, fetch timestamps, and application calculation timestamps separately.
- Add structured logging and health/admin views without exposing credentials or sensitive internals.
- Design polling budgets far below Sleeper's documented general ceiling of 1,000 calls per minute.

## 11. Assumptions requiring validation

Claude Code should explicitly confirm or turn these into configuration/TODO items:

1. Each Sleeper league has exactly 12 rosters, for 24 total teams.
2. A person/team participates in only one conference for a season.
3. Both leagues use identical roster positions and scoring settings.
4. Regular season ends after Week 13; conference playoffs use Weeks 14-16.
5. Six teams qualify per conference; seeds 1 and 2 receive Week 14 byes.
6. Week 15 uses reseeding, as described above.
7. Sleeper continues to produce usable Week 17 lineups/matchup scoring inside both source leagues.
8. The Super Bowl uses each champion's Week 17 submitted Sleeper starters.
9. The public site does not require viewer accounts; only administrative overrides require authentication.
10. Combined standings use the same ranking rules across conferences.
11. The site is for non-commercial league use under Sleeper's stated API terms.
12. The season year and both league IDs will be provided before implementation testing.

## 12. Edge cases and required behavior

- Duplicate or missing owner records; orphaned rosters; co-owners.
- Team/owner name or avatar changes mid-season.
- Vacant teams and commissioner-managed teams.
- Same numerical roster ID in both conferences.
- Missing `matchup_id`, bye weeks, or more/fewer than two records sharing an ID.
- Lineup changes close to kickoff and delayed source updates.
- Players moved to IR/taxi/bench, inactive players, DST identifiers, and multi-position eligibility.
- Negative, fractional, null, commissioner-adjusted, or subsequently corrected scores.
- Tied regular-season, playoff, conference championship, or Super Bowl scores.
- Different scoring/roster settings between AFC and NFC.
- League rollover creating new Sleeper league IDs via `previous_league_id`.
- Sleeper outage, timeout, throttling, malformed response, or partial payload.
- NFL game postponement, cancellation, stat correction, or week extension.
- Week 16 result corrected after a Super Bowl participant was created.
- Week 17 source matchup contains a consolation opponent; only the champion's own lineup/score belongs in the custom Super Bowl.
- Champion has no valid Week 17 lineup or a player score is unavailable.
- Browser timezone versus NFL/league timezone; store timestamps in UTC and render intentionally.
- Combined standings when conferences have played unequal numbers of games.

Every exceptional state should either resolve deterministically under documented rules or enter an explicit admin-review state.

## 13. Security, privacy, and accessibility

- Treat all upstream names/metadata as untrusted text and escape output.
- Validate route parameters and restrict weeks/seasons to allowed ranges.
- Rate-limit public refresh actions and protect admin endpoints.
- Use authenticated, role-restricted admin access with an audit log.
- Publish only information already appropriate for the league hub; do not expose private credentials or unnecessary personal data.
- Meet WCAG-oriented basics: semantic headings, keyboard navigation, color-independent winner/live indicators, adequate contrast, responsive tables/cards, accessible bracket alternatives, and screen-reader labels.
- Provide a linear list view of the bracket on small screens and for assistive technology.

## 14. Testing strategy

### Unit tests

- Decimal score reconstruction.
- Standings ranking, winning percentage, and all configured tie-breakers.
- Matchup pairing and malformed grouping.
- Six-team fixed and reseeded bracket progression.
- Tie and manual-override rules.
- Week 17 participant resolution and scoring isolation by source league.
- Idempotent sync/upsert behavior.

### Contract/fixture tests

- Capture sanitized real responses from both leagues for league, roster, users, matchups, players, and brackets.
- Include preseason, live, final, bye, playoff, and corrected-score fixtures.
- Validate payloads at the adapter boundary and preserve unknown fields.

### Integration/end-to-end tests

- One conference API fails while the other succeeds.
- Week transitions and scheduled refreshes.
- Full Weeks 14-17 playoff journey.
- Mobile standings, matchup, and bracket navigation.
- Stale snapshot display and recovery.
- Admin override followed by a source correction.

Do not rely on live Sleeper calls in the normal test suite. Use fixtures and a mocked transport; reserve live smoke tests for an explicit command/environment.

## 15. Delivery phases

1. **Discovery and payload spike:** validate both league configurations and inspect representative API responses, especially individual player points and Week 17 behavior.
2. **Foundation:** app skeleton, typed Sleeper client, validation, database schema, sync jobs, and fixture tests.
3. **Regular season MVP:** conference/combined standings, weekly scoreboard, matchup detail, caching, and stale-data handling.
4. **Conference playoffs:** six-team seeding, bracket rendering, progression, corrections, and overrides.
5. **Week 17 Super Bowl:** cross-league matchup, frozen/versioned lineups, live totals, finalization, and audit history.
6. **Hardening:** accessibility, responsive polish, observability, failure testing, security review, deployment/runbook, and historical rollover.

## 16. Plan Mode instructions for Claude Code

Claude Code should remain in Plan Mode until it has inspected the repository and produced an implementation-ready plan. Do not write application code during the planning pass.

### Required planning workflow

1. Read this entire brief and inspect the repository structure, existing source, configuration, tests, package manager, framework, database setup, deployment files, and local instruction files such as `CLAUDE.md` or `AGENTS.md`.
2. Review the [official Sleeper API documentation](https://docs.sleeper.com/) and base endpoint choices on documented behavior. Clearly label anything inferred from observed payloads rather than documented guarantees.
3. Identify the current architecture and reuse existing conventions. Do not assume a framework or replace the stack without evidence and justification.
4. Locate all existing files that would be changed. Reference concrete paths and existing modules/functions in the plan.
5. Perform a read-only discovery spike against supplied league IDs if network access and IDs are available. Redact personal or sensitive fields from saved fixtures. If IDs are not available, define exact commands/checks to run later and continue planning with placeholders.
6. Resolve or explicitly flag the consequential unknowns: scoring parity, playoff tie-breakers, fixed versus reseeded semifinals, divisions, Week 17 lineup availability, per-player live points, finalization rules, hosting, database, admin authentication, and historical seasons.
7. Propose the normalized domain model, raw snapshot strategy, API adapter, sync cadence, cache behavior, playoff state machine, override/reconciliation flow, routes/pages, and responsive UI states.
8. Separate MVP requirements from later enhancements and organize implementation into small, testable phases.
9. For each phase, list files to create/change, logic to implement, migrations/configuration, tests, validation commands, risks, and acceptance checks.
10. Include a concise data-flow description from Sleeper -> ingestion/cache -> normalized database -> domain services -> public pages, plus the separate custom Week 17 path.
11. Include failure modes and rollback/migration considerations. Protect historical/finalized playoff data from destructive resyncs.
12. End with a short list of questions that truly block implementation. Recommend defaults for non-blocking choices instead of asking broad design questions.

### Required Plan Mode output

- Repository findings and constraints.
- Confirmed assumptions versus unresolved decisions.
- Proposed architecture and data flow.
- Data model and migration plan.
- Sleeper endpoint/caching matrix.
- Page/route/component plan.
- Detailed phased implementation steps with concrete file paths.
- Test and verification plan.
- Deployment/operations considerations.
- Risks, edge cases, and blocking questions.

The plan should be specific enough that a separate implementation session can execute it without rediscovering the system.

## 17. Definition of done

The project is done when all MVP acceptance criteria pass; Weeks 14-17 can be simulated end to end with fixtures; live and stale-data modes are clearly distinguishable; a source correction can be reconciled without silently corrupting bracket history; administrators can audit every override; and deployment/runbook documentation explains configuration, synchronization, troubleshooting, backups, and annual Sleeper league rollover.

---

## Appendix A: Concise Claude Code Plan Mode starter prompt

```text
You are in Plan Mode. Do not implement code yet.

Read the repository and the complete project brief at:
outputs/24-team-sleeper-fantasy-football-project-brief.md

Create an implementation-ready plan for a public 24-team fantasy football hub built on two 12-team Sleeper leagues (AFC and NFC). It must provide separate and combined standings; Weeks 1-17 matchup views with starters, bench, team totals, and individual player scoring when supported; six-team conference playoffs across Weeks 14-16; and a custom cross-league Week 17 Super Bowl between the conference champions.

Inspect the existing stack and conventions before proposing changes. Review the official Sleeper API docs at https://docs.sleeper.com/. Base claims on documented endpoints, and clearly identify anything that requires validation against real league payloads—especially per-player live scoring, scoring-setting parity, and Week 17 lineup behavior.

Your plan must include repository findings, concrete file paths, architecture and data flow, normalized data model, endpoint/caching strategy, playoff state machine and tie/reseeding rules, Super Bowl reconciliation/override behavior, pages/components, phased implementation steps, tests and fixtures, accessibility/security/resilience, deployment considerations, risks, and only genuinely blocking questions. Separate MVP from optional enhancements. Preserve raw source data and historical/finalized playoff state, and make sync operations idempotent.

Use placeholders for AFC_SLEEPER_LEAGUE_ID, NFC_SLEEPER_LEAGUE_ID, and SEASON if they are not yet configured. Do not write application code until the plan is reviewed and approved.
```
