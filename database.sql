-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.alerts (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    workspace_id uuid NOT NULL,
    watch_id uuid NOT NULL,
    listing_snapshot_id uuid NOT NULL,
    discord_message_id text,
    sent_at timestamp
    with
        time zone NOT NULL DEFAULT now(),
        CONSTRAINT alerts_pkey PRIMARY KEY (id),
        CONSTRAINT alerts_watch_id_fkey FOREIGN KEY (watch_id) REFERENCES public.watches (id),
        CONSTRAINT alerts_listing_snapshot_id_fkey FOREIGN KEY (listing_snapshot_id) REFERENCES public.listing_snapshots (id),
        CONSTRAINT alerts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id)
);

CREATE TABLE public.discord_installations (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    workspace_id uuid NOT NULL,
    guild_id text NOT NULL,
    guild_name text,
    channel_id text,
    channel_name text,
    installed_at timestamp
    with
        time zone NOT NULL DEFAULT now(),
        CONSTRAINT discord_installations_pkey PRIMARY KEY (id),
        CONSTRAINT discord_installations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id)
);

CREATE TABLE public.listing_snapshots (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  source text NOT NULL CHECK (source = ANY (ARRAY['vinted'::text, 'gumtree'::text])),
  external_id text NOT NULL,
  title text,
  price numeric,
  currency text,
  location text,
  image_url text,
  listing_url text,
  condition text,
  description text,
  posted_at timestamp with time zone,
  raw_payload jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT listing_snapshots_pkey PRIMARY KEY (id)
);

CREATE TABLE public.seen_listings (
  workspace_id uuid NOT NULL,
  source text NOT NULL CHECK (source = ANY (ARRAY['vinted'::text, 'gumtree'::text])),
  external_id text NOT NULL,
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT seen_listings_pkey PRIMARY KEY (workspace_id, source, external_id),
  CONSTRAINT seen_listings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);

CREATE TABLE public.source_errors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  watch_id uuid,
  source text NOT NULL CHECK (source = ANY (ARRAY['vinted'::text, 'gumtree'::text])),
  error_type text NOT NULL,
  error_message text NOT NULL,
  raw_context jsonb,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT source_errors_pkey PRIMARY KEY (id),
  CONSTRAINT source_errors_watch_id_fkey FOREIGN KEY (watch_id) REFERENCES public.watches(id)
);

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'unpaid'::text CHECK (status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'unpaid'::text])),
  current_period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  trial_ends_at timestamp with time zone,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);

CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    discord_id text NOT NULL UNIQUE,
    email text,
    username text,
    avatar_url text,
    created_at timestamp
    with
        time zone NOT NULL DEFAULT now(),
        updated_at timestamp
    with
        time zone NOT NULL DEFAULT now(),
        CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.watch_sources (
  watch_id uuid NOT NULL,
  source text NOT NULL CHECK (source = ANY (ARRAY['vinted'::text, 'gumtree'::text])),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT watch_sources_pkey PRIMARY KEY (watch_id, source),
  CONSTRAINT watch_sources_watch_id_fkey FOREIGN KEY (watch_id) REFERENCES public.watches(id)
);

CREATE TABLE public.watches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  source text NOT NULL CHECK (source = ANY (ARRAY['vinted'::text, 'gumtree'::text, 'both'::text])),
  query text NOT NULL,
  region text,
  categories ARRAY NOT NULL DEFAULT '{}'::text[],
  brands ARRAY NOT NULL DEFAULT '{}'::text[],
  price_min numeric,
  price_max numeric,
  condition ARRAY NOT NULL DEFAULT '{}'::text[],
  keywords ARRAY NOT NULL DEFAULT '{}'::text[],
  excluded_keywords ARRAY NOT NULL DEFAULT '{}'::text[],
  poll_interval_seconds integer NOT NULL DEFAULT 60,
  discord_channel_id text,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'paused'::text, 'error'::text, 'rate_limited'::text])),
  last_run_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT watches_pkey PRIMARY KEY (id),
  CONSTRAINT watches_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);

CREATE TABLE public.worker_runs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  watch_id uuid NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  status text NOT NULL CHECK (status = ANY (ARRAY['running'::text, 'success'::text, 'error'::text])),
  listings_found integer NOT NULL DEFAULT 0,
  alerts_sent integer NOT NULL DEFAULT 0,
  error_message text,
  CONSTRAINT worker_runs_pkey PRIMARY KEY (id),
  CONSTRAINT worker_runs_watch_id_fkey FOREIGN KEY (watch_id) REFERENCES public.watches(id)
);

CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'member'::text])),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workspace_members_pkey PRIMARY KEY (workspace_id, user_id),
  CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.workspaces (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    owner_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp
    with
        time zone NOT NULL DEFAULT now(),
        updated_at timestamp
    with
        time zone NOT NULL DEFAULT now(),
        tour_completed_at timestamp
    with
        time zone,
        CONSTRAINT workspaces_pkey PRIMARY KEY (id),
        CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users (id)
);