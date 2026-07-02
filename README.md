# WorkflowTech Activity Hub (wftact)

Dashboard on **Vercel** + data on **Supabase**:
- **kiet.workflowtech.info** activity
- **demo.workflowtech.info** activity
- **Email outreach** — sent / opened / not opened (day + hour, IST)
- Titan SMTP sender script with open tracking pixel

## Folder

`C:\Users\nukal\Desktop\wftact` — separate from WFT-Institutions and KIET erp.

---

## 1. Supabase (one-time, ~10 min)

1. Go to [supabase.com](https://supabase.com) → New project
2. SQL Editor → paste `supabase/schema.sql` → Run
3. Settings → API:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret)

---

## 2. Local env

Copy `.env.example` → `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_HUB_URL=http://localhost:3000
WFTACT_DASHBOARD_KEY=pick-a-long-password
WFTACT_INGEST_KEY=pick-another-secret-key

# Titan Mail
SMTP_HOST=smtp.titan.email
SMTP_PORT=465
SMTP_USER=you@workflowtech.info
SMTP_PASS=your-titan-password
EMAIL_FROM_NAME=WorkflowTech
EMAIL_FROM_ADDRESS=you@workflowtech.info

DEMO_URL=https://demo.workflowtech.info
```

---

## 3. Run locally

```powershell
cd C:\Users\nukal\Desktop\wftact
npm install
npm run dev
```

Open http://localhost:3000 → login with `WFTACT_DASHBOARD_KEY`

---

## 4. Deploy Vercel

```powershell
cd C:\Users\nukal\Desktop\wftact
npx vercel
```

Add all env vars from `.env.local` in Vercel project settings.

Optional custom domain: **hub.workflowtech.info**

Set `NEXT_PUBLIC_HUB_URL=https://hub.workflowtech.info`

---

## 5. Send emails (Titan)

Dry run first:

```powershell
npm run send:emails:dry
```

Real send (uses CSV from WFT-Institutions):

```powershell
npm run send:emails
```

Or custom CSV:

```powershell
node scripts/send-outreach-emails.mjs --csv "C:\path\to\contacts.csv"
```

Opens appear in dashboard **Email opens by day & hour**.

---

## 6. Connect KIET + demo ERPs

See `integrations/ERP-SETUP.md` — add ingest URL + key to each backend.

---

## Dashboard shows

| Section | Data |
|---------|------|
| KIET / Demo logins | Last 14 days |
| Emails sent / opened / not opened | Per campaign |
| Day × hour heatmaps | IST timezone |
| Recent activity & opens | Live tables |

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dashboard |
| `npm run send:emails:dry` | Test email list without sending |
| `npm run send:emails` | Send via Titan + Supabase tracking |
