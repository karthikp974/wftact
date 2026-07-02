-- WorkflowTech Activity Hub (wftact) — run in Supabase SQL editor

create extension if not exists "pgcrypto";

-- Sites: kiet, demo, main
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  base_url text not null,
  created_at timestamptz not null default now()
);

insert into sites (key, label, base_url) values
  ('kiet', 'KIET ERP', 'https://kiet.workflowtech.info'),
  ('demo', 'WFT Demo ERP', 'https://demo.workflowtech.info'),
  ('main', 'WorkflowTech', 'https://workflowtech.info')
on conflict (key) do nothing;

-- Portal / site activity events (forwarded from ERP backends)
create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  site_key text not null references sites(key),
  kind text not null,
  user_label text,
  portal text,
  path text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists activity_events_site_created on activity_events (site_key, created_at desc);
create index if not exists activity_events_kind_created on activity_events (kind, created_at desc);

-- Email campaigns
create table if not exists email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  from_address text not null,
  created_at timestamptz not null default now()
);

-- One row per recipient per campaign
create table if not exists email_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references email_campaigns(id) on delete cascade,
  email text not null,
  name text,
  institution text,
  state text,
  sent_at timestamptz,
  opened_at timestamptz,
  open_count int not null default 0,
  last_open_at timestamptz,
  status text not null default 'pending',
  error_message text,
  phone text,
  follow_up_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, email)
);

create index if not exists email_recipients_campaign on email_recipients (campaign_id);
create index if not exists email_recipients_sent on email_recipients (sent_at desc);
create index if not exists email_recipients_opened on email_recipients (opened_at desc);

-- Raw email events (sent, open, click)
create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references email_recipients(id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);

create index if not exists email_events_recipient on email_events (recipient_id, created_at desc);

create index if not exists activity_events_outreach_id
  on activity_events ((meta->>'outreach_id'))
  where (meta->>'outreach_id') is not null;

-- RLS: service role only (API uses service key). Enable if using anon client later.
alter table sites enable row level security;
alter table activity_events enable row level security;
alter table email_campaigns enable row level security;
alter table email_recipients enable row level security;
alter table email_events enable row level security;
