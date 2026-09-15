---
type: glossary
title: GSD (Get Shit Done) framework
audience: advanced
topics: [workflow, planning]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: null
ai_summary: A community workflow framework that adds a `.planning/` folder to your project — roadmap, milestones, phases, audit trail — so Claude can pick up multi-week work across sessions without losing the thread.
tldr: "A community add-on that helps Claude pick up long projects across many sessions by keeping the plan and progress in a folder."
aliases: []
---

GSD is an *optional* community framework for managing Claude Code projects that span weeks or months. The whole idea: persist project state in a `.planning/` folder so Claude (and you) can resume work without re-explaining context.

What lives in `.planning/`:

- `PROJECT.md` and `ROADMAP.md` — the long-horizon plan
- Per-phase folders with discuss / spec / plan / execute / verify / secure steps
- Audit trail for what was decided, why, and when

When GSD pays off:

- Multi-week project, multiple collaborators
- Traceability matters (audit, compliance)
- You need to put the work down and resume next week

When it's overkill:

- One-off scripts, single-sitting prototypes, exploratory hacking

Common commands: `/gsd-new-project`, `/gsd-progress`, `/gsd-do`, `/gsd-next`, `/gsd-help`.
