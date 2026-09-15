---
type: glossary
title: Permission mode
audience: beginner
topics: [claude-code, foundations]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: How often Claude Code stops to ask before acting. Cycled with Shift+Tab between auto (the default — Claude vets each action itself), accept-edits, plan (read-only) and bypass.
tldr: "How often Claude stops to ask before it acts. Press Shift+Tab to cycle between auto, accept-edits, plan and bypass."
aliases: ["permission mode", "permission modes", "permissions"]
---

The **permission mode** controls how often Claude Code pauses to ask you before it does something.

Press **Shift+Tab** in the prompt to cycle through them:

- **Auto** — the current default. Claude checks each action for risk before running it, does the low-risk ones, and asks about the rest.
- **Accept edits** — file edits go through without asking; shell commands still pause.
- **Plan** — read-only. Claude can look and propose, but changes nothing.
- **Bypass permissions** — asks about nothing.

The mode is per-session and resets when you start a new conversation.

Worth separating two ideas that sound alike: the mode changes how often you're *asked*, not what's *allowed*. Things you never want happening — reading a secrets file, pushing to the main branch — belong in **deny rules**, which hold whatever mode you're in.
