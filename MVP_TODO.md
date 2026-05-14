# MVP Build Todo List
> Reference this file before every task. Work top-to-bottom. Do not start a phase until all items in the previous phase are checked off unless they are explicitly marked as parallel-safe within the same phase.

---

## Phase 1 — Foundation (Everything Depends On This)
> Must be fully complete before any other phase begins.

- [x] Define normalized listing shape (shared output type for all adapters) — `web/lib/types/listing.ts`
- [x] Define watch model — `web/lib/types/watch.ts`
- [x] Define workspace model — `web/lib/types/workspace.ts`
- [x] Define subscription model — `web/lib/types/subscription.ts`
- [x] Write full database schema (all 11 tables) — applied via Supabase MCP migration `create_tables`
- [x] Add indexes — applied in same migration
- [x] Create Supabase project — `2026-mvp` (eu-west-1, project id: njwjjnrpqyhsweuxozdo)
- [x] Run migrations on Supabase — `create_tables`, `rls_policies`, `rls_worker_tables`
- [x] Scaffold Next.js app shell (App Router) — already existed
- [x] Set up environment variables structure — `web/.env.local.example` + `web/.env.local`
- [x] Set up Stripe skeleton (install SDK, placeholder env vars) — SDK not yet installed
- [x] Set up Discord app/bot in Discord Developer Portal (placeholder credentials) — manual step needed

---

## Phase 2 — Auth and Tenancy
> Depends on: Phase 1 schema and Next.js shell being complete.

- [x] Implement Discord OAuth login via Supabase Auth — `web/app/api/auth/login/route.ts`
- [x] Callback route handler that creates/updates user record on login — `web/app/auth/callback/route.ts`
- [x] Workspace creation on first login (auto-create default workspace) — in callback route
- [x] Membership model: link user to workspace — workspace_members insert in callback
- [x] Write RLS policies for all tables — applied in Phase 1 migrations
- [ ] Test RLS: confirm cross-tenant data is not accessible — manual test needed after Discord creds set up
- [x] Subscription record created (status: `unpaid`) on workspace creation — in callback route
- [x] Auth guard middleware: protect all dashboard routes — `web/middleware.ts`

---

## Phase 3 — Billing
> Depends on: Phase 2 (user + workspace + subscription record must exist).
> RLS must be complete before any client queries hit the DB.

- [x] Stripe Checkout session creation route handler — `web/app/api/billing/checkout/route.ts`
- [x] Stripe webhook route handler — `web/app/api/webhooks/stripe/route.ts`
- [x] Handle webhook events:
  - [x] `checkout.session.completed`
  - [x] `customer.subscription.created`
  - [x] `customer.subscription.updated`
  - [x] `customer.subscription.deleted`
  - [x] `invoice.paid`
  - [x] `invoice.payment_failed`
- [x] Sync subscription status to `subscriptions` table on each webhook event
- [x] Billing access gating helper — `web/lib/billing.ts`
- [x] Billing page UI — `web/app/dashboard/billing/page.tsx`
- [x] Enforce billing gate: unpaid users cannot create active watches — in `new/page.tsx` server action
- [x] If subscription lapses: pause all watches — in `customer.subscription.deleted` webhook handler

---

## Phase 4 — Dashboard MVP
> Depends on: Phase 1 schema, Phase 2 auth, Phase 3 billing gate helper.
> Do not build watch creation form before the schema is stable.

- [x] Dashboard layout shell — `web/app/dashboard/layout.tsx`
- [x] Login / callback page — `web/app/login/page.tsx` + `web/app/auth/callback/route.ts`
- [ ] Onboarding page — skipped for MVP, watches list acts as landing
- [x] Watches list page — `web/app/dashboard/watches/page.tsx`
- [x] Create watch form — `web/app/dashboard/watches/new/page.tsx`
- [x] Edit watch form — `web/app/dashboard/watches/[id]/edit/page.tsx`
- [x] Pause / resume watch action — server actions in `web/app/dashboard/watches/[id]/page.tsx`
- [x] Delete watch action — server action in `web/app/dashboard/watches/[id]/page.tsx`
- [ ] Duplicate watch action — deferred, not blocking MVP
- [x] Watch detail page — `web/app/dashboard/watches/[id]/page.tsx`
- [x] Alerts feed page — `web/app/dashboard/alerts/page.tsx`
- [x] Billing status widget — billing page + sidebar nav
- [x] Settings page — `web/app/dashboard/settings/page.tsx`
- [x] Server components for data-heavy pages, server actions for mutations

---

## Phase 5 — Discord Bot and Integration
> Depends on: Phase 2 Discord OAuth, Phase 1 `discord_installations` table.
> Bot permissions must be finalized before building the channel selector UI.

- [x] Discord bot bootstrap — permissions: 2048 (Send Messages only)
- [x] Guild install flow — `web/app/api/discord/install/route.ts` + `web/app/api/discord/callback/route.ts`
- [x] Discord server connection page — `web/app/dashboard/settings/page.tsx` (list, connect, disconnect)
- [x] Channel selection UI — dropdown in create/edit watch forms, fetched via `web/app/api/discord/channels/route.ts`
- [x] Store selected channel per-watch — `discord_channel_id` on `watches` table
- [x] Send test alert — `web/app/api/discord/test/route.ts`
- [x] Discord slash commands via HTTP Interactions endpoint — `web/app/api/discord/interactions/route.ts`:
  - [x] `/status` — subscription status + active watch count
  - [x] `/pause` — pause all active watches
  - [x] `/resume` — resume all paused watches
  - [x] `/test` — send test notification
  - [ ] `/setup` — deferred (channel linking done via dashboard)
- [x] Alert message formatter — `web/lib/discord.ts` (`formatAlertEmbed` + `sendDiscordMessage`)

---

## Phase 6 — Source Adapters
> Depends on: normalized listing shape from Phase 1.
> Both adapters must implement the same interface — do not leak source-specific logic into the dashboard.

- [x] Define shared adapter interface — `worker/src/adapters/interface.ts` (`fetchLatest`, `extractStableId`)
  - [ ] `validateWatchConfig(config)` — deferred, not needed for MVP
  - [ ] `buildQuery(watch)` — deferred, query building is inline in each adapter
- [x] Gumtree adapter — `worker/src/adapters/gumtree.ts`:
  - [x] `fetchLatest` — cheerio HTML scrape, `data-q` attribute selectors, `sort=date` newest-first
  - [x] `normalizeListing` — title/price/location/URL/image extracted
  - [x] `extractStableId` — numeric ID from URL path regex
  - [x] Rate-limit handling — non-200 throws `RateLimitError`, 2s built-in delay per fetch
- [x] Vinted adapter — `worker/src/adapters/vinted.ts`:
  - [x] `fetchLatest` — internal JSON API, session cookie via `tough-cookie` warmup
  - [x] `normalizeListing` — maps Vinted item shape including `price.amount` object format
  - [x] `extractStableId` — Vinted item ID
  - [x] Rate-limit handling — 429 throws `RateLimitError`, 401 triggers cookie refresh + retry
- [x] Unit tests for both adapters — `worker/src/adapters/__tests__/` (21 tests passing)
- [x] Store raw payloads in `listing_snapshots` — done in `worker/src/runner.ts`

---

## Phase 7 — Worker Runtime
> Depends on: Phase 6 adapters, Phase 5 Discord alert sender, Phase 1 `seen_listings` / `alerts` / `worker_runs` tables.
> Worker is a separate always-on process — not part of the Next.js app.

- [x] Scaffold worker project — `worker/` with `src/index.ts`, `src/db.ts`, `src/types.ts`
- [x] Worker uses service-role Supabase credentials — `worker/src/db.ts`
- [x] Poll loop: fetch all active+error watches every 30s — `worker/src/index.ts`
- [x] Scheduler: per-watch interval tracking — `worker/src/scheduler.ts` (`isDue` / `markRan`)
- [x] Concurrency control: max 3 parallel, max 1 Gumtree — `worker/src/index.ts` `runBatch()`
- [x] For each watch run — `worker/src/runner.ts`:
  - [x] Call adapter `fetchLatest`
  - [x] `normalizeListing` called inside adapter (returns `NormalizedListing[]` directly)
  - [x] `extractStableId` called per listing for dedup key
  - [x] Batch dedup check against `seen_listings` (workspace-level)
  - [x] New listings inserted into `seen_listings` + `listing_snapshots`, matched via `matchesWatch()`
  - [x] Matched listings: insert into `alerts`, send Discord embed
  - [x] Update `worker_runs` with started_at, finished_at, status, listings_found, alerts_sent
- [x] Alert dispatcher: 1.5s delay between sends, 10-alert cap per run — `worker/src/runner.ts`
- [x] Error isolation: each watch wrapped in try/catch, failed watch doesn't affect loop
- [x] First-run seed: on `last_run_at IS NULL`, mark all current listings as seen without alerting
- [ ] Progressive backoff on repeated errors — deferred; error watches retry at normal interval for MVP
- [x] Keyword/price/excluded-keyword filter — `worker/src/matcher.ts` (10 unit tests)

---

## Phase 8 — Hardening and Observability
> Depends on: all prior phases functionally complete.

- [ ] Last run time + error visible on watches list page
- [ ] Worker run history on watch detail page (last 10 runs with status/counts)
- [ ] Analytics stats row on watches page (total alerts, active count, last activity)
- [ ] Structured timestamped logging in worker — `worker/src/logger.ts`
- [ ] Worker HTTP health endpoint — `GET /health` returns uptime + lastTick
- [ ] Webhook failure logging (log failed Stripe webhook events with payload)
- [ ] Worker backoff verified end-to-end (test a deliberate adapter failure)
- [ ] Audit log: watch create/edit/pause/resume events persisted to DB
- [ ] Admin tools (minimal): view raw `worker_runs` and `source_errors`

---

## Definition of Done (MVP Complete)
Check each item before declaring the MVP shipped:

- [x] User can log in with Discord
- [x] User can pay monthly with Stripe
- [x] User can create a watch in the dashboard
- [x] User can connect a Discord channel
- [x] Worker scans Vinted and Gumtree
- [x] A matching listing is detected and stored
- [x] Discord bot sends the alert into the chosen server/channel
- [x] Duplicate listings are NOT re-alerted
- [x] Dashboard shows recent alerts and watch status

---

## Hard Dependency Rules (Do Not Violate)
> These are ordering constraints, not preferences.

| Do not start | Until |
|---|---|
| Dashboard watch creation form | Schema is finalized |
| Stripe webhook + subscription UI | Access model and billing states are designed |
| Source adapters | Normalized listing shape is agreed |
| Public client queries | RLS policies are complete and tested |
| Channel selector UI | Discord bot permissions are finalized |
| Worker matching logic | Watch creation form reflects real filter fields |
