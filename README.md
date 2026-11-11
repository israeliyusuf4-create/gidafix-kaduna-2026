# GidaFix — Housing issues, handled.

**Africa's Talking PropTech Hackathon, Kaduna • 12 November 2026**

GidaFix is an SMS-first repair reporting and landlord coordination application. Registered tenants send a basic text message to report a maintenance issue. The landlord sees a timestamped ticket in the web dashboard, changes the status, and GidaFix sends an SMS update. No mobile data or smartphone is required for the tenant.

## What works

- Register property units, a tenant phone number, and a caretaker/landlord phone number
- Receive tenant reports as `FIX <UNIT> <ISSUE>` via an inbound Africa's Talking SMS callback
- Require incoming phone to match the registered unit (basic protection against casual impersonation)
- Acknowledge the report and notify the property manager
- Dashboard with reports by state; mark open, in progress or resolved
- Tenant can query `STATUS <TICKET-ID>`
- Built-in SMS simulator for the hackathon; `AT_MODE=mock` does **not** send real SMS
- Outbound SMS through the documented Africa's Talking REST API in sandbox/live modes
- Single-tenant per deployment, packaged for Docker, configurable by environment variables
- JSON-file persistence with a Docker volume (a production Marketplace deployment must provide durable storage)
- No external npm packages required

### Quick start (Windows PowerShell)

Requires **Node.js 22+**. From the unzipped project folder:

```powershell
Copy-Item .env.example .env
notepad .env
node --env-file=.env server.mjs
```

Set `GIDAFIX_ADMIN_TOKEN` and `WEBHOOK_SECRET` to different long, random strings in `.env` before you start. For local demonstrations, leave `DEMO_MODE=true` and `AT_MODE=mock`.

Open **http://localhost:3000**, enter the value of `GIDAFIX_ADMIN_TOKEN` when asked, then click **Simulate SMS**. Use the fictional unit `KAD101` and SMS content:

```text
FIX KAD101 roof leaking after rainfall
```

Open **Repair tickets**, change the new ticket to **In progress** or **Resolved**, then check **SMS activity** for the simulated tenant notification.

### Quick start (macOS/Linux)

```bash
cp .env.example .env
# Edit .env to set GIDAFIX_ADMIN_TOKEN and WEBHOOK_SECRET
node --env-file=.env server.mjs
```

### Send a local test to the actual inbound callback handler

The test mode above bypasses the network webhook but runs the **same business logic**. To test the incoming webhook itself:

```bash
curl -X POST 'http://localhost:3000/api/at/inbound?token=YOUR_WEBHOOK_SECRET' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'from=+2348010000001' \
  --data-urlencode 'text=FIX KAD101 broken pipe in kitchen' \
  --data-urlencode 'id=sample-inbound-001'
```

The fictional demo number is registered to `KAD101`. Do not use it to send real SMS.

## Africa's Talking sandbox integration

1. Create a free sandbox application at <https://account.africastalking.com/apps/sandbox>.
2. Generate a sandbox API key from the Africa's Talking dashboard. **Do not commit keys to GitHub.**
3. Edit `.env`: `AT_MODE=sandbox`, `AT_USERNAME=sandbox`, `AT_API_KEY=...`; set `AT_SENDER_ID` only if you have configured a permitted sender/shortcode.
4. In the sandbox dashboard, create a two-way SMS shortcode and configure its inbound callback URL:
   `https://YOUR_PUBLIC_HOST/api/at/inbound?token=YOUR_WEBHOOK_SECRET`
5. Expose your local app via an HTTPS tunnel or deploy it at a public HTTPS URL. Check the callback route is reachable from outside your laptop.
6. **Register the simulator phone number in GidaFix** as a tenant on a unit; SMS reporting is restricted to pre-registered numbers.
7. Open Africa's Talking **web simulator** and send `FIX UNITCODE message` using that registered test phone. Look for the new ticket on GidaFix. The outgoing test SMS will reach the sandbox simulator, not your physical phone.

For real SMS, set `AT_MODE=live`, use your live username and key, and obtain appropriate approved sender/shortcode services. **Sandbox messages are not delivered to real mobile handsets.**

### Callback security

Africa's Talking inbound callback uses `POST /api/at/inbound?token=WEBHOOK_SECRET` and accepts standard form-encoded webhook fields `from`, `text`, `to`, and `id`. This basic MVP uses a long random token in the callback URL; use HTTPS and do not share the URL publicly. For a production integration, confirm the provider's supported request-authentication controls and harden rate-limiting, monitoring and delivery receipts.

## Docker

```bash
docker build -t gidafix:1.0 .
docker run -p 3000:3000 \
  -e DEMO_MODE=true \
  -e GIDAFIX_ADMIN_TOKEN=REPLACE_WITH_LONG_RANDOM_SECRET \
  -e WEBHOOK_SECRET=REPLACE_WITH_A_DIFFERENT_SECRET \
  -v gidafix-data:/app/data \
  gidafix:1.0
```

For **PowerShell**, put the `docker run` options on one line, not as the multiline Linux example.

You can test with:

```bash
node --test tests/*.test.mjs
```

## Marketplace packaging

The event requires an image in the **Africa's Talking Container registry** (not just a public GitHub repo). Use the registry host and push credentials shown in the official Marketplace submission form. They can vary by account—do not guess them. The image has port 3000, configurable environment variables, and a marketplace PNG logo at `assets/gidafix-logo.png` (with SVG source in `assets/logo.svg`).

Suggested submission fields are in `marketplace.md`.

**Important deployment limitation:** This MVP writes tenant data and tickets to `/app/data/gidafix.json`. It is durable **only if the host preserves/mounts that data directory**. If the Africa's Talking Marketplace runtime does not support persistent volumes, do **not** claim production-grade persistence. A production Marketplace edition must use a supported persistent external database (e.g., PostgreSQL). This prototype is intended for hackathon demo and is not yet audited for production use.

## Environment variables

| Variable | Required | Meaning |
|---|---|---|
| `PORT` | No | HTTP port (default `3000`) |
| `NODE_ENV` | No | `production` disables unauthenticated local fallback |
| `DEMO_MODE` | No | `true` enables mock inbound screen and fictional seed data on first run |
| `GIDAFIX_ADMIN_TOKEN` | **Yes, for public deployment** | Dashboard API access secret |
| `WEBHOOK_SECRET` | **Yes, for public deployment** | Protects the SMS callback URL |
| `AT_MODE` | No | `mock`, `sandbox`, or `live` |
| `AT_USERNAME` | Sandbox/live | Africa's Talking application username; `sandbox` for sandbox |
| `AT_API_KEY` | Sandbox/live | Africa's Talking secret API key |
| `AT_SENDER_ID` | No | Approved sender or short code, when assigned |
| `DATA_FILE` | No | JSON storage path; use durable volume in container |

## Security and privacy

- Tenant complaints and phone numbers are personal data. Register with consent and access restriction.
- Demo data has fictional names and synthetic phone numbers. Do not use them as real SMS destinations.
- Keep `.env` out of version control. Rotate exposed credentials immediately.
- Do not enter sensitive evidence or photos in SMS; do not include full complaint details in status updates sent to tenants.
- This is maintenance coordination, not an emergency response service; users should call local emergency services for hazardous incidents.
- The dashboard access token is a hackathon expedient, **not a production identity and permissions system**.
- No paid payments, property verification or legal notices are implemented.

## Stack

Node.js built-in HTTP server + static responsive HTML/CSS/JavaScript + JSON-file store + Africa's Talking SMS v1 REST integration. No build or install step required, so it is reproducible on an ordinary laptop and in Docker.
