---
type: skill
title: diagram-design — real diagrams, not boxes with drop shadows
audience: beginner
topics: [diagrams, documents, design]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: "https://github.com/cathrynlavery/diagram-design"
deeper_link: "https://github.com/cathrynlavery/diagram-design"
ai_summary: Roughly forty diagram types — flowcharts, swimlanes, org charts, Gantt, sequence, ER, Sankey, Wardley maps — produced as self-contained HTML with inline SVG. It can also learn your brand colours once and apply them to everything it draws afterwards.
when_to_use: Use this when the thing you owe someone is a picture — a process flow, an org chart, a current-state architecture — and you don't have a drawing tool or the patience for one.
marketplace_command: "/plugin marketplace add cathrynlavery/diagram-design"
install_command: "/plugin install diagram-design@diagram-design"
skill_id: diagram-design
origin: community
category: docs
status: active
maintainer: "@cathrynlavery"
time_saved: "~1-2 hours per diagram"
worked_scenario: "You need a swimlane of the complaints process for a steering pack on Thursday. The options are fighting Visio, drawing boxes in PowerPoint, or asking someone in architecture nicely. Instead you describe the process in a paragraph and get back a single HTML file that opens in any browser and prints cleanly — and once you've onboarded the NBG palette, the next twelve diagrams match it without being asked."
---

This is the one on this page most likely to be useful to a colleague who never opens a terminal for anything else.

Describe the process. Get a diagram. It comes back as a **single self-contained HTML file** — inline SVG and CSS, no dependencies — which means it opens in any browser, survives being emailed, and prints without falling apart.

## What it covers

Roughly forty types, including the ones that actually come up in bank work: flowcharts, swimlanes, org charts, Gantt, sequence, state machines, ER and data models, timelines, layer stacks, dependency graphs, user journeys, Sankey, fishbone, Wardley maps, and the ordinary chart family (bar, line, waterfall, scatter, treemap).

It will also redraw what you already have — hand it a `.drawio`, Mermaid `.mmd` or Excalidraw file and ask for it at a different size or level of detail.

## Do the brand step once

The first time you run it in a project it stops and asks whether to customise the style guide before drawing anything, rather than silently shipping a diagram in its default orange. You can point it at a website and let it pull the palette. Do this once and every later diagram in that project comes out on-brand.

## Worth knowing

- **It is deliberately opinionated.** The author's stated position is no drop shadows and no Mermaid-default look. If you want the house style of your existing deck, do the brand step.
- **Version and scope drift.** The skill's own description lists around forty types and the repository blurb says thirty-eight — the count moves as types are added. Don't quote a number in a deck; open it and look.
- **Not just Claude Code.** The same repo publishes Codex and Copilot installs, if a colleague is on a different tool.

## Access

Public — no access request needed. MIT licensed.
