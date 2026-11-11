# 90-second judges' demonstration

### 0–15s · Human problem
"In Kaduna, a tenant can report a leaking roof by phone and call again for days because there's no shared record. GidaFix helps tenants and landlords know when a problem was reported and what happened next."

### 15–35s · Tenant side
Open **Simulate SMS**. Choose a registered tenant and send:
`FIX KAD101 roof leaking during rainfall`
Explain that this uses the same handler as an inbound Africa's Talking SMS. **Say explicitly if you are in mock mode.**

### 35–55s · Landlord side
Point to the new `GF-...` ticket in the dashboard. Show unit, timestamp, complaint, and status. Open **SMS activity** to show an acknowledgement to the tenant and notification to the landlord (both *simulated* unless API connected).

### 55–75s · Closing the loop
Open **Repair tickets**. Change the ticket from **Open** to **In progress**, then **Resolved**. Show automatic tenant SMS activity. Explain tenants can send `STATUS GF-...` on a basic phone.

### 75–90s · Why this fits the brief
"We've integrated Africa's Talking SMS APIs in sandbox/live configurations, and we can test the workflow without spending on real SMS. Each landlord can have their own Dockerized instance; the product is designed to become a Marketplace plugin. The next step is a field pilot with local landlords and tenants."

### Honest technical disclosure
If no live/sandbox request has been tested at judging time, say: "This is a working mock-SMS demonstration with the official Africa's Talking REST API integrated but not yet verified end-to-end against their sandbox." Do not imply that simulated SMS messages were delivered.

### Likely judges' questions
- **Why not WhatsApp?** Tenants can report issues from basic phones without internet access.
- **Who pays?** Landlords and caretakers are the proposed buyers; pricing is a hypothesis awaiting validation.
- **What is new?** SMS *inbound* issue reporting and traceable maintenance updates, not just outbound reminders.
- **What happens if the landlord does nothing?** GidaFix provides visibility, not enforcement. Future versions can measure delays and escalate to property managers.
- **Is the app marketplace-ready?** Docker packaging and metadata exist. Live rollout requires real AT shortcode provisioning, durable storage and security hardening.
