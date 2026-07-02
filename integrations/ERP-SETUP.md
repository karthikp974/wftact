# ERP → wftact integration

After Supabase + Vercel hub is live, add these env vars to **each ERP** (KIET `c:\erp`, demo `demoerp` on EC2):

```env
WFTACT_INGEST_URL=https://YOUR-HUB.vercel.app/api/ingest
WFTACT_INGEST_KEY=same-as-hub-WFTACT_INGEST_KEY
```

## KIET (`c:\erp`)

1. Copy `integrations/erp-hub-forward.ts` into `apps/backend/src/common/erp-hub-forward.ts`
2. In `apps/backend/src/auth/auth.service.ts` after `spectator.recordLogin(...)`:

```ts
import { forwardActivityToHub } from "../common/erp-hub-forward";

void forwardActivityToHub({
  site: "kiet",
  kind: "LOGIN",
  userLabel: user.username ?? dto.identifier,
  portal: dto.portal ?? null,
  path: "/login"
});
```

3. In `apps/backend/src/spectator/spectator-activity.service.ts` inside `track()` after local DB write:

```ts
void forwardActivityToHub({
  site: "kiet",
  kind: dto.kind === "HEARTBEAT" ? "HEARTBEAT" : "PAGE_VIEW",
  userLabel: user.username,
  portal: dto.portal ?? null,
  path: dto.path
});
```

## Demo (`demo.workflowtech.info`)

Same steps but `site: "demo"`.

## Test ingest

```powershell
curl -X POST https://YOUR-HUB.vercel.app/api/ingest `
  -H "Content-Type: application/json" `
  -H "x-wftact-key: YOUR_KEY" `
  -d "{\"site\":\"demo\",\"kind\":\"LOGIN\",\"user_label\":\"admin\",\"path\":\"/login\"}"
```

Check dashboard → Recent portal activity.
