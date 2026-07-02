-- Outreach: phone, follow-up, demo link tracking
alter table email_recipients add column if not exists phone text;
alter table email_recipients add column if not exists follow_up_sent_at timestamptz;

create index if not exists activity_events_outreach_id
  on activity_events ((meta->>'outreach_id'))
  where (meta->>'outreach_id') is not null;
