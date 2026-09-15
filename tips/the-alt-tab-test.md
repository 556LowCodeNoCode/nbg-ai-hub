---
type: tip
title: 'The alt-tab test — find what Claude is missing in one workday'
audience: beginner
topics: [workflow]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: For one day, note every time you switch away from Claude Code to look something up. Each switch is a piece of context Claude didn't have. The list you end up with is a ranked to-do list for making it more useful — and you don't need to write any code to produce it.
---

Here's an exercise that takes no technical skill and tells you more about your setup than any amount of reading.

**For one working day, write down every time you alt-tab away from Claude Code.**

That's it. Every switch. The ticket you opened to check the requirement. The Teams message you scrolled back through. The dashboard you checked. The colleague's email with the spec in it. The wiki page with the naming convention.

At the end of the day you have a list. Every item on it is a moment where **you** were the integration — carrying context from somewhere else into the conversation by hand.

## What to do with the list

Sort it by how often each one came up. Then work down from the top:

- **The same document, repeatedly?** It belongs in the project, or referenced from `CLAUDE.md`.
- **The same convention or rule, re-explained each time?** That's a `CLAUDE.md` line.
- **The same system, over and over?** That's where a connector or an MCP server earns its keep — `/mcp` manages those.
- **A file you keep pasting bits of?** Point Claude at it with `@` instead of pasting.
- **Something only in your head?** Write it down once. Future sessions get it for free.

## Why this beats reading a features list

Feature lists tell you what's possible. The alt-tab list tells you what *you specifically* keep needing, ranked by how much it's costing you. Most people discover their top two items are unglamorous — a naming convention and one reference document — and that fixing those two removes half the friction.

Do it again after a few months. The list will be completely different, which is the point.
