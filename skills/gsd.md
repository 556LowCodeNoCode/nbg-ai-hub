---
type: skill
title: gsd-* — Get Shit Done framework family
audience: advanced
topics: [workflow, planning, multi-phase]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-06-02"
external_link: "https://github.com/gsd-build/get-shit-done"
deeper_link: https://github.com/gsd-build/get-shit-done
ai_summary: A light-weight meta-prompting, context-engineering and spec-driven development system for Claude Code. A family of commands (`gsd:new-project`, `gsd:plan-phase`, `gsd:execute-phase`, `gsd:progress`, etc.) for managing multi-week projects with persistent `.planning/` state and per-phase artefacts.
when_to_use: Use this for multi-week projects where you'll pause, resume, and need an audit trail. Persistent `.planning/` folder with roadmap and per-phase artefacts. Overkill for one-sitting work — try `/team` instead.
marketplace_command: "/plugin marketplace add gsd-build/get-shit-done"
install_command: "/plugin install gsd@get-shit-done"
skill_id: gsd
origin: community
category: workflow
status: active
maintainer: "@TÂCHES"
time_saved: "~half a day per phase on multi-week projects"
worked_scenario: "Building a multi-phase internal service over four weeks: roadmap, six phases, parallel workstreams. Without GSD: re-explaining the same context every Monday and losing decisions between sessions. With GSD: each phase has its own `discuss/plan/execute/verify` artefacts, the project state lives in `.planning/` next to the code, and you can resume next week with full continuity."
---

The `gsd-*` skill family is the heaviest workflow option in the team's toolbox — for projects that genuinely span weeks or months, not one sitting.

What you get: a persistent `.planning/` folder with roadmap, milestones, per-phase artefacts (`discuss / spec / plan / execute / verify / secure`), and an audit trail. Pick it up next week and Claude remembers exactly where you left off.

When it's right:

- Long horizon (weeks/months)
- Multiple collaborators
- Traceability matters
- You'll pause and resume

When it's overkill: one-off scripts, single-sitting prototypes — use plain Claude Code or `/team` instead.

Common entry points: `/gsd:new-project`, `/gsd:plan-phase`, `/gsd:execute-phase`, `/gsd:progress`, `/gsd:help`. See `/hub-glossary gsd` for the broader framework explanation.

## Access

Public — no access request needed. The canonical upstream is [`gsd-build/get-shit-done`](https://github.com/gsd-build/get-shit-done) by TÂCHES.
