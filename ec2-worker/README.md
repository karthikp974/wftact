# EC2 follow up worker

Runs the **follow up email watcher** 24/7 on EC2 so you do not need your PC open.

The **hub dashboard** stays on Vercel. Only this small worker runs on EC2.

## What it does

Every 5 minutes:

1. Reads Supabase (who opened mail 45+ min ago, no follow up yet)
2. Sends follow up via Titan SMTP
3. Logs to console

## Deploy on KIET production EC2

SSH into `18.60.211.186` (or use AWS Instance Connect).

```bash
# one time
sudo apt-get update -y
sudo apt-get install -y git

git clone https://github.com/karthikp974/wftact.git
cd wftact/ec2-worker
cp .env.example .env
nano .env   # paste Supabase + SMTP secrets from your PC .env.local
```

Start worker:

```bash
docker compose up -d
docker compose logs -f followup-watcher
```

You should see: `Follow up watcher started`

## Commands

```bash
cd ~/wftact/ec2-worker
docker compose logs -f          # live logs
docker compose restart          # after .env change
docker compose down             # stop worker
```

## Update after code changes

```bash
cd ~/wftact
git pull origin main
cd ec2-worker
docker compose restart
```

## Notes

- Uses very little RAM (Node script only)
- Safe to run on KIET EC2 alongside kieterp Docker stack
- Does **not** send first outreach emails — only follow ups
- First emails still run once from your PC: `npm run send:campaign`
