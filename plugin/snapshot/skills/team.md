---
type: skill
title: /team — multi-agent build orchestrator
audience: both
topics: [workflow, orchestration, agents]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: "https://github.com/556LowCodeNoCode/Skills"
deeper_link: null
ai_summary: Orchestrates a multi-agent team — refiner, scanner, investigator, planner, designer, parallel coders, reviewer, dependency validator, test builder, integration verifier — to take a request from idea to merged code in one sitting.
install_command: "/plugin install team@556LowCodeNoCode-skills"
skill_id: team
origin: internal
category: workflow
status: active
maintainer: "@nbg-ai-team"
---

`/team` is the team's flagship skill for delivering an end-to-end change in one sitting. You give it a request; it runs through ten phases (refine → scan → investigate → plan → design → implement → review → validate deps → build tests → integrate-verify) and reports back with an AC-by-AC verdict.

When to reach for it: a request that's bigger than "fix this one line" but smaller than "multi-week project". The sweet spot is "deliver a feature this week".

When NOT to reach for it: trivial fixes (use plain Claude Code) or long multi-phase work (use GSD).
