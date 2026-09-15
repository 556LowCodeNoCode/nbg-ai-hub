---
type: skill
title: deploy — deploy to NBG Azure
audience: advanced
topics: [deployment, azure]
internal: true
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: "https://github.com/556LowCodeNoCode/Skills"
deeper_link: null
ai_summary: Automates end-to-end deployment of NBG Azure-hosted web applications via the Azure Management Portal REST API — first-deploy (provision), auth-setup (identity team credentials + proxy + Kafka), and redeploy (rebuild + push).
when_to_use: Use this when shipping to NBG Azure — provisioning a brand-new app, wiring identity-team auth and Kafka audit, or pushing changes to an existing one. Skips the click-through portal grind.
install_command: "/plugin install deploy@556LowCodeNoCode-skills"
skill_id: deploy
origin: internal
category: integration
status: active
maintainer: "@nbg-ai-team"
time_saved: "~45 min per deploy; ~half a day for a first-deploy"
worked_scenario: "Shipping a new internal API: provision the Azure resources, wire identity-team auth, set environment variables, push the container, verify the health check. Without `/deploy`: an afternoon of clicking through the Azure portal and copy-pasting credentials from email. With `/deploy first-deploy`: ten minutes of approving prompts and one health check at the end."
---

`deploy` handles the full deployment lifecycle for NBG Azure-hosted apps. Three modes:

- **first-deploy** — provision a new app + Azure resources from scratch
- **auth-setup** — wire identity-team credentials, proxy authentication, Kafka audit configuration
- **redeploy** — rebuild, push, and update existing components

Also covers environment-variable management, health checks, and container error troubleshooting. Talks to the Azure Management Portal REST API behind the scenes so you don't have to click through the portal.

Triggers: "deploy", "redeploy", "first deploy", "push to Azure", "configure proxy", "check deployment status", "fix deployment errors".
