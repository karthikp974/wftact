-- Follow up variant + nurture drip tracking
alter table email_recipients add column if not exists follow_up_type text;
alter table email_recipients add column if not exists nurture_step int not null default 0;
alter table email_recipients add column if not exists last_nurture_sent_at timestamptz;
alter table email_recipients add column if not exists nurture_opened_at timestamptz;
alter table email_recipients add column if not exists nurture_open_count int not null default 0;
alter table email_recipients add column if not exists nurture_last_open_at timestamptz;
