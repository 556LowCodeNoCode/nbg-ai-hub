---
type: skill
title: deploy — deploy to NBG Azure
audience: advanced
topics: [deployment, azure]
internal: true
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: "https://github.com/556LowCodeNoCode/Skills"
deeper_link: "https://556lowcodenocode.github.io/Onboarding/"
ai_summary: Automates end-to-end deployment of NBG Azure-hosted web applications via the Azure Management Portal REST API — first-deploy (provision), auth-setup (identity team credentials + proxy + Kafka), and redeploy (rebuild + push).
install_command: "/plugin install deploy@556LowCodeNoCode-skills"
skill_id: deploy
origin: internal
category: integration
status: active
maintainer: "@nbg-ai-team"
---

`deploy` handles the full deployment lifecycle for NBG Azure-hosted apps. Three modes:

- **first-deploy** — provision a new app + Azure resources from scratch
- **auth-setup** — wire identity-team credentials, proxy authentication, Kafka audit configuration
- **redeploy** — rebuild, push, and update existing components

Also covers environment-variable management, health checks, and container error troubleshooting. Talks to the Azure Management Portal REST API behind the scenes so you don't have to click through the portal.

Triggers: "deploy", "redeploy", "first deploy", "push to Azure", "configure proxy", "check deployment status", "fix deployment errors".
