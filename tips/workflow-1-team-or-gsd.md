---
type: tip
title: Two skills worth knowing — `/team` for one sitting, `gsd-*` for the long haul
audience: both
topics: [workflow]
internal: false
authored: "2026-06-02"
last_reviewed: "2026-06-02"
external_link: null
deeper_link: null
ai_summary: Once you're past the plain-Claude-Code basics, the next decision is which orchestrator to reach for. /team runs a feature end-to-end in one sitting. gsd-* manages a multi-week project with persistent state. Pick by horizon, not by ambition.
---

Plain Claude Code handles a surprising amount on its own. But once a request gets bigger than "fix this one thing", you'll want one of the team's two workflow orchestrators. Pick by **how long the work will take**, not by how important it feels.

## `/team` — feature-sized work, one sitting

`/team` is the team's flagship: you describe a feature, it runs ten phases end-to-end (refine → scan → plan → design → implement → review → test → integrate-verify) and reports back with an AC-by-AC verdict. You read the report at the end, not babysit each step.

Reach for it when:

- A request is bigger than a one-line fix but smaller than a multi-week project ("ship this by Friday").
- You want plan + code + tests + review in one go, without managing the handoffs yourself.
- The work fits in **one sitting** — start in the morning, AC report at lunch.

Install: `/plugin install team@556LowCodeNoCode-skills` (after `/plugin marketplace add NBG-AI/claude-tools`).

## `gsd-*` — multi-week projects, persistent state

The `gsd-*` family (`gsd:new-project`, `gsd:plan-phase`, `gsd:execute-phase`, `gsd:progress`…) is the heaviest workflow option in the toolbox. Each phase has its own artefacts (`discuss / plan / execute / verify`), the project state lives in a `.planning/` folder next to the code, and you can pause Friday and resume Monday with full continuity.

Reach for it when:

- Horizon is **weeks or months**, not one sitting.
- You'll pause, resume, and need an audit trail.
- Traceability matters — multiple collaborators, regulatory eyes, retrospectives.

Install: `/plugin marketplace add gsd-build/get-shit-done` then `/plugin install gsd@get-shit-done`.

## Picking, in one sentence

Will you finish today? → `/team`. Will you still be at it next month? → `gsd-*`. A one-line fix or a quick spike? → neither — plain Claude Code is fine.

Both have their own pages in the Skills catalog with worked scenarios and install steps — click through for the details.
