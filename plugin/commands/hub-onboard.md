---
description: Walk through an onboarding journey (day-1, week-1, by-role)
argument-hint: "[journey-slug]"
---

Present the journey content below verbatim. Bare invocation lists available slugs; provide one to walk that journey. The plugin persists "last journey" in user state so `/hub` can show progress. If the body says "[content in progress]", surface that honestly — don't fabricate steps.

!`node "${CLAUDE_PLUGIN_ROOT}/dist/hub-onboard.mjs" $ARGUMENTS`
