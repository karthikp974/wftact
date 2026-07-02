# EC2 follow up worker

Runs the **follow up email watcher** 24/7 on EC2 so you do not need your PC open.

The **hub dashboard** stays on Vercel. Only this small worker runs on EC2.

## What it does

**Follow up watcher** (always on): every 5 minutes sends Mail 2/3 and nurture drip.

**Campaign sender** (one time): sends Mail 1 to the contact list, one by one, on EC2 so your PC can stay off.

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

## Send Mail 1 campaign on EC2 (643 contacts, one by one)

After `git pull` on EC2:

```bash
cd ~/wftact/ec2-worker
docker compose --profile campaign up campaign-sender -d
docker compose logs -f campaign-sender
```

Uses `data/aims-contacts-email-ready.csv` in the repo. Skips anyone already marked sent in Supabase.

Stop watching logs with Ctrl+C. Container exits when done.

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
- **Mail 1 campaign** runs on EC2 via `docker compose --profile campaign up campaign-sender -d`
- Follow ups and nurture run 24/7 in `wftact-followup` container
