# Marketplace submission worksheet — GidaFix

Use the fields below as **proposed** metadata, not a claim that a marketplace listing has been submitted or approved.

**Name:** GidaFix

**Slug:** gidafix-sms-repairs

**Short description:** SMS-first property maintenance requests and real-time repair status updates for landlords and tenants.

**Long description:** GidaFix helps property managers and landlords respond to tenant repair requests without asking tenants to install an app. Registered tenants text a simple complaint to an Africa's Talking shortcode. GidaFix creates a numbered ticket, alerts the designated property manager, and provides a dashboard to track repairs from reported to resolved. Tenants can check ticket status by SMS. Each deployed instance serves one property-management customer, with their own units and data. The package supports mock SMS for evaluation and Africa's Talking sandbox/live mode where configured.

**Logo:** `assets/gidafix-logo.png` (512 × 512 PNG); editable SVG source is `assets/logo.svg`.

**Industry:** Other (Property/Real Estate is not on the event's listed category menu)

**AT product tag:** Bulk SMS (plus a two-way shortcode/incoming messages; confirm the form's available tag options)

**Container port:** `3000`

**Health check:** `GET /health`

**Docker image:** Build with `docker build -t gidafix:1.0 .` and follow the **official AT registry credentials and image URL** supplied by the Marketplace portal. Do not invent registry addresses.

**Pricing plan — hypothesis to validate:** Basic Property Care | NGN 3000 | monthly | One independent landlord workspace with tenant SMS repair reporting and tracking. Carrier SMS/shortcode charges may be extra. Use an event-appropriate test plan only if the form permits it.

**Environment variables:**
- `GIDAFIX_ADMIN_TOKEN` (required secret)
- `WEBHOOK_SECRET` (required secret)
- `AT_MODE` (mock/sandbox/live)
- `AT_USERNAME` (sandbox/live)
- `AT_API_KEY` (sandbox/live; secret)
- `AT_SENDER_ID` (optional, requires approval)
- `DEMO_MODE` (true for judging; false for customer deployments)
- `PORT` (default 3000)
- `DATA_FILE` (path for durable JSON store)

**Database:** This hackathon version uses a local JSON file. **The Marketplace must provide persistent storage for `/app/data`, or the product must be upgraded to an externally managed database before real customer deployment.** Don't mark it production-ready unless that requirement is met.

**Compliance:** review Marketplace Terms and Privacy Policy during submission, explain data handling, and only accept on behalf of your own organisation/account.

**Checklist:** [ ] Build image  [ ] Test in Docker  [ ] Configure secrets  [ ] Connect actual AT sandbox  [ ] Confirm persistence across restart  [ ] Convert logo if needed  [ ] Push image to registry  [ ] Enter metadata and pricing  [ ] Submit  [ ] Check review/approval state
