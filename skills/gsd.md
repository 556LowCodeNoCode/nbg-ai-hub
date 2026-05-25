---
type: skill
title: gsd-* — Get Shit Done framework family
audience: advanced
topics: [workflow, planning, multi-phase]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: "https://github.com/556LowCodeNoCode/Skills"
deeper_link: null
ai_summary: A family of commands (gsd-new-project, gsd-progress, gsd-do, gsd-next, etc.) for managing multi-week Claude Code projects with persistent state in a `.planning/` folder.
install_command: "/plugin install gsd@556LowCodeNoCode-skills"
skill_id: gsd
origin: community
category: workflow
status: active
maintainer: "@nbg-ai-team"
---

The `gsd-*` skill family is the heaviest workflow option in the team's toolbox — for projects that genuinely span weeks or months, not one sitting.

What you get: a persistent `.planning/` folder with roadmap, milestones, per-phase artefacts (discuss / spec / plan / execute / verify / secure), and an audit trail. Pick it up next week and Claude remembers exactly where you left off.

When it's right:

- Long horizon (weeks/months)
- Multiple collaborators
- Traceability matters
- You'll pause and resume

When it's overkill: one-off scripts, single-sitting prototypes — use plain Claude Code or `/team` instead.

Common entry points: `/gsd-new-project`, `/gsd-progress`, `/gsd-do`, `/gsd-next`, `/gsd-help`. See `/hub-glossary gsd` for the broader framework explanation.
