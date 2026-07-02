-- Follow up open tracking
alter table email_recipients add column if not exists follow_up_opened_at timestamptz;
alter table email_recipients add column if not exists follow_up_open_count int not null default 0;
alter table email_recipients add column if not exists follow_up_last_open_at timestamptz;
