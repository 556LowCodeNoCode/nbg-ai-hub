---
type: tip
title: Permission modes — what Shift+Tab toggles
audience: beginner
topics: [survival, workflow]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: null
deeper_link: null
ai_summary: Press Shift+Tab in the prompt to cycle Claude's permission mode between default (confirm everything), auto-accept edits (just watch), and plan mode (read-only). Saves dozens of confirmations once you trust the plan.
---

By default, Claude pauses to ask before every file edit and every shell command. That's the safe mode — and the slow one. You can change how often Claude asks, per session, by cycling the **permission mode**.

Press **Shift+Tab** in the prompt to cycle through three modes:

- **Default** — confirms before every file edit and every shell command. Safest, slowest.
- **Auto-accept edits** — file edits go through without confirmation; shell commands still pause. The middle ground: you've reviewed the plan, now let it execute while you watch.
- **Plan mode** — read-only. Claude can look at files and talk through what it *would* do, but can't change anything. Best for exploring an unfamiliar codebase or getting a proposal before any work begins.

The current mode shows at the bottom of the terminal. Shift+Tab again to cycle forward; the three modes loop.

Common rhythm: start in **plan mode**, get a proposal, agree on direction, then Shift+Tab into **auto-accept edits** and let Claude work while you scan the diffs. Saves twenty individual `y` confirmations on a multi-file change — and you stay in control because shell commands still need approval.

The mode is per-session and resets when you start a new conversation. If you want a per-machine default, that lives in your global `CLAUDE.md` or Claude Code settings — but the per-session toggle is the one you'll actually reach for.
