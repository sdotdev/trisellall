# Vision: Multi-User Vintage + Gumtree Monitoring MVP

## One-line product idea
A multi-user monitoring platform that lets people create saved searches for resale items on **Vinted** and **Gumtree**, then receives fast Discord alerts when matching listings appear, with a Next.js dashboard for managing watches, billing, and results.

## Product goal
The MVP should help resellers find newly listed, low-to-mid priced items quickly enough to be useful in competitive categories like trainers, streetwear, phones, consoles, tools, and other frequently reposted items.

## Core promise
Users can:
1. Sign in with Discord.
2. Connect a Discord server/channel for alerts.
3. Create multiple searches.
4. Get fast alerts when new matching items appear.
5. Manage everything from a clean dashboard.
6. Pay monthly through Stripe.

---

## Opinionated stack

### Frontend
- **Next.js App Router** for the dashboard.
- Use server components for data-heavy pages.
- Use route handlers for API endpoints.
- Use server actions for dashboard mutations where it is a good fit.

### Backend data and auth
- **Supabase Postgres** for the main database.
- **Supabase Auth** for dashboard login.
- **Row Level Security (RLS)** for tenant isolation.

### Worker / monitor engine
- A separate always-on worker on **Oracle Free Tier**.
- The worker must be independent from the Next.js app.
- It owns polling, matching, dedupe, and alert dispatch.

### Billing
- **Stripe subscriptions** for monthly billing.
- Stripe webhooks drive subscription state changes.

### Alerts
- **Discord bot** for posting alerts into the user’s chosen server/channel.
- Bot also handles future slash commands.

---

## Important architectural rules

1. **Dashboard and worker are separate systems.**
   The dashboard is request/response. The worker is continuous.

2. **Every watch is tenant-scoped.**
   All data must belong to a user or workspace.

3. **Billing gates access.**
   Watches, alerting, and server connections should only work when the subscription is active or the account is in trial.

4. **Source adapters are isolated.**
   Vinted and Gumtree must both implement the same internal interface.

5. **No source-specific logic in the UI.**
   The dashboard should deal with generic “watches”, not adapter internals.

6. **Store raw payloads.**
   Save raw listing data for debugging and future reprocessing.

---

## MVP scope

### In scope
- Discord login.
- Stripe monthly subscription.
- One user can manage multiple watches.
- One user can connect one or more Discord servers.
- Create / edit / pause / delete watches.
- Vinted adapter.
- Gumtree adapter.
- Fast dedupe so the same item is not alerted twice.
- Discord bot posts new matches to a channel.
- Dashboard shows recent matches and watch health.

### Out of scope for MVP
- Mobile apps.
- Email alerts.
- Push notifications.
- Advanced analytics.
- ML-based item ranking.
- Seller reputation enrichment unless it is easy and stable.
- Complex team permissions beyond basic workspace ownership.
- Public marketplace or discovery feed.

---

## Product model

### Entities
- **User**: the person who pays and manages watches.
- **Workspace**: optional grouping for one or more Discord servers and watches.
- **Discord installation**: link between a workspace and the Discord server/bot.
- **Subscription**: Stripe billing state.
- **Watch**: a saved search definition.
- **Source adapter**: Vinted or Gumtree.
- **Listing**: a normalized item from any source.
- **Alert**: a record that a listing matched a watch and was sent.
- **Seen item**: dedupe marker to prevent repeat alerts.

### Watch fields
- Source: Vinted, Gumtree, or both.
- Query text.
- Region / location.
- Categories.
- Brand filters.
- Price min / max.
- Condition filters.
- Included keywords.
- Excluded keywords.
- Poll interval.
- Discord destination channel.
- Active / paused state.

---

## Source strategy

### Vinted
- Build a Vinted adapter that converts source data into the normalized listing shape.
- Keep the adapter behind an interface so it can be replaced without touching the rest of the system.
- Do not let Vinted-specific assumptions leak into the dashboard or billing.

### Gumtree
- Keep the current HTML-fetch-and-parse approach.
- Use a parser that can survive small layout changes.
- Treat Gumtree as a separate adapter, but with identical output shape.

### Common adapter interface
Each adapter should expose roughly the same methods:
- `validateWatchConfig()`
- `buildQuery()`
- `fetchLatest()`
- `normalizeListing()`
- `extractStableId()`

This makes both sources share the same downstream processing pipeline.

---

## Worker design

### Worker responsibilities
- Pull active watches from the database.
- Run each watch on a schedule.
- Fetch source listings.
- Normalize results.
- Match results against watch filters.
- Deduplicate.
- Save new matches.
- Send Discord alerts.
- Update watch run status and errors.

### Worker loop behavior
- Poll watches in short intervals.
- Use concurrency across watches.
- Limit concurrency per source so the worker stays stable.
- Make alert delivery asynchronous.
- Keep the scan loop fast and isolated from dashboard latency.

### Persistence in the worker
- Use Postgres for durable state.
- Use Redis later if needed for faster dedupe or queueing.
- For MVP, Postgres may be enough if the watch count is low.

---

## Dashboard design

### Main pages
- **Login / callback page**
- **Onboarding page**
- **Billing page**
- **Watches list**
- **Create watch page**
- **Watch detail page**
- **Alerts feed**
- **Discord server connection page**
- **Settings page**

### Dashboard responsibilities
- Let users create and manage watches.
- Show subscription status.
- Show Discord connection status.
- Show recent alerts and failed runs.
- Show watch health: active, paused, rate-limited, error.

### UX principles
- Keep forms short.
- Use templates for common resale searches.
- Let users duplicate a watch and edit it.
- Show a preview of matched examples when possible.
- Make the first-success path obvious: sign in -> subscribe -> connect Discord -> create watch.

---

## Billing design

### Stripe model
- Monthly subscription only for MVP.
- One plan is enough at first.
- Access is granted when the subscription is active.
- Grace period or trial can be added later.

### Stripe best-practice flow
- Use Stripe Checkout for purchase.
- Use webhooks to update subscription state.
- Do not trust the browser for subscription state.
- The database should be the source of truth for whether a user is active.

### Webhook events to handle
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_failed

### Billing gating rules
- Unpaid users can sign in and view billing.
- Unpaid users cannot create active watches.
- If a subscription lapses, pause scans and keep data read-only until payment resumes.

---

## Discord design

### Discord login
- Use Discord OAuth for dashboard authentication.
- The Discord identity should be linked to the app user.

### Discord bot
- The bot is what posts alerts into servers.
- The bot should be installable into a user’s server.
- The bot needs clear permissions only for what it actually does.

### Discord MVP commands
- `/setup` connect a channel.
- `/status` show subscription and watch health.
- `/pause` pause alerts.
- `/resume` resume alerts.
- `/test` send a test notification.

### Discord alert content
Each alert should include:
- Title
- Price
- Source name
- Location
- Watch name
- Listing URL
- Small image preview if available
- Why it matched, if easy to explain

---

## Data model sketch

### Tables
- `users`
- `workspaces`
- `workspace_members`
- `discord_installations`
- `subscriptions`
- `watches`
- `watch_sources`
- `listing_snapshots`
- `seen_listings`
- `alerts`
- `worker_runs`
- `source_errors`

### Key relationships
- One user can own many workspaces.
- One workspace can own many watches.
- One watch can target one or both sources.
- One listing can match many watches.
- One alert belongs to exactly one watch and one listing.

### Indexing priorities
- `watches(workspace_id, active)`
- `seen_listings(workspace_id, source, external_id)`
- `alerts(workspace_id, created_at desc)`
- `listing_snapshots(source, external_id)`
- `subscriptions(user_id, status)`

---

## Security and access control

### RLS rules
- Users can only see their own workspaces and watches.
- Discord installation records must be scoped to the owning workspace.
- Subscription records should only be readable by the owner and trusted server-side code.
- The worker should use a server-side service role or trusted backend credentials, never public client credentials.

### Secret management
- Never expose Stripe secret keys to the browser.
- Never expose Discord bot tokens to the browser.
- Never expose source adapter secrets to the dashboard.
- Put all secrets in server environment variables.

### Auditability
- Log watch creation, edits, pauses, and resume events.
- Log webhook failures.
- Log worker errors with enough context to debug the adapter that failed.

---

## Performance goals

### Target
- New listings should be detected quickly enough to be useful in competitive resale categories.
- Keep the fetch cycle short and bounded.

### Practical speed rules
- Fetch only the newest relevant results.
- Avoid expensive enrichment before alerting.
- Deduplicate early.
- Send Discord alerts asynchronously.
- Keep adapter parsing lightweight.

### Reliability rules
- Every watch should have backoff when source errors happen.
- A watch should not crash the whole worker.
- A bad source response should only affect that watch.

---

## What can be built in parallel

### Parallel workstream A: Dashboard
Can be built independently once the data model is agreed.
- Layout
- Auth screens
- Watches CRUD
- Billing page
- Alerts feed
- Discord connection page

### Parallel workstream B: Database and RLS
Can start at the same time as the dashboard.
- Schema
- RLS policies
- Migrations
- Seed data
- Basic analytics queries

### Parallel workstream C: Stripe billing
Can be built in parallel with the dashboard shell.
- Checkout session creation
- Webhook handler
- Subscription state sync
- Access gating helpers

### Parallel workstream D: Discord integration
Can be built alongside billing.
- Discord OAuth login
- Bot bootstrap
- Guild install flow
- Channel selection flow
- Message formatting

### Parallel workstream E: Source adapters
Can be worked on separately from the UI.
- Gumtree adapter
- Vinted adapter
- Shared normalization layer
- Dedupe key strategy
- Rate-limit and retry handling

### Parallel workstream F: Worker runtime
Can be built separately from the dashboard.
- Poll loop
- Scheduler
- Matching engine
- Alert dispatcher
- Error handling

---

## What should not be built in parallel

### Do not build these at the same time without contracts
1. **Database schema and dashboard forms**
   - The UI needs stable fields.
   - The schema should be agreed first.

2. **Stripe webhook handling and subscription UI logic**
   - The access model must be consistent.
   - Billing states should be designed before coding the UX.

3. **Source adapters and normalized item schema**
   - Both adapters must agree on the same output shape.

4. **RLS policies and public client queries**
   - Permission rules should be finished before exposing tables.

5. **Discord bot permissions and channel selector UI**
   - The bot permissions determine what the app can actually do.

6. **Worker matching logic and watch creation forms**
   - The watch form should reflect the real filter logic.

---

## Recommended build order

### Phase 1: Foundation
- Define schema.
- Define normalized listing shape.
- Define watch model.
- Define workspace model.
- Define subscription model.
- Set up Next.js app shell.
- Set up Supabase.
- Set up Stripe skeleton.

### Phase 2: Authentication and tenancy
- Discord login.
- Workspace creation.
- Membership model.
- RLS policies.
- Subscription record sync.

### Phase 3: Billing
- Stripe Checkout.
- Webhook handler.
- Subscription gating.
- Upgrade / cancel / renew flows.

### Phase 4: Dashboard MVP
- Watches list.
- Create watch form.
- Edit watch form.
- Alerts feed.
- Connection status.
- Billing status.

### Phase 5: Discord bot
- Install to server.
- Choose channel.
- Send test alert.
- Send real alerts.
- Add basic slash commands.

### Phase 6: Worker and adapters
- Build shared adapter interface.
- Build Gumtree adapter.
- Build Vinted adapter.
- Add dedupe.
- Add retry logic.
- Add watch scheduler.

### Phase 7: Hardening
- Logs.
- Health checks.
- Backoff.
- Failure alerts.
- Admin tools.
- Basic analytics.

---

## Claude Code execution strategy
Claude Code should work on this project in **small, self-contained chunks**:

### Chunk type 1: schema-first tasks
- Create or modify migrations.
- Add RLS.
- Add typed database access helpers.
- Add seed data.

### Chunk type 2: feature slices
- Build one page.
- Build one route handler.
- Build one webhook.
- Build one Discord command.
- Build one adapter method.

### Chunk type 3: integration slices
- Wire watch creation to database.
- Wire billing state to access control.
- Wire alert creation to Discord posting.
- Wire worker polling to listing storage.

### Chunk type 4: refactor slices
- Remove duplicated source parsing.
- Extract shared validation.
- Normalize types.
- Tighten RLS and server-side checks.

---

## Definition of done for MVP
The MVP is done when:
- A user can log in with Discord.
- A user can pay monthly with Stripe.
- A user can create a watch in the dashboard.
- A user can connect a Discord channel.
- The worker scans Vinted and Gumtree.
- A matching listing is detected and stored.
- A Discord bot sends the alert into the chosen server/channel.
- Duplicate listings are not re-alerted.
- The dashboard shows recent alerts and watch status.

---

## Non-goals for the first release
- Perfect source coverage.
- Perfect anti-bot resilience.
- Multi-region scaling.
- Large enterprise billing workflows.
- Complex team admin permissions.
- Deep seller enrichment.
- High-frequency market analytics.

---

## Practical implementation notes
- Keep the first version narrow.
- Favor reliability over cleverness.
- Favor stable abstractions over source-specific hacks.
- Favor clear data contracts over ad hoc JSON.
- Favor server-side ownership of payment and permissions.
- Favor simple, observable workflows that are easy to debug.

---

## Suggested first Claude Code tasks
1. Create the database schema and RLS policies.
2. Scaffold the Next.js dashboard shell.
3. Add Discord login.
4. Add Stripe Checkout + webhook flow.
5. Add watch CRUD.
6. Add a basic alert feed.
7. Build the shared normalized listing type.
8. Build the Gumtree adapter behind the shared interface.
9. Build the Discord bot alert sender.
10. Add the worker loop and source polling.

---

## Final product vision
This should feel like a focused reseller tool: fast, simple, multi-tenant, subscription-based, and built around Discord alerts and a clean dashboard. The winning feature is not a huge feature set; it is speed, clarity, and trust.
