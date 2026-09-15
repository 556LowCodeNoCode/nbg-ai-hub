---
type: tip
title: Permission modes — what Shift+Tab toggles
audience: beginner
topics: [control, workflow]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: Press Shift+Tab in the prompt to cycle Claude's permission mode. Auto mode is now the default — Claude vets each action itself and only asks about the risky ones. Plan mode is read-only; accept-edits lets edits through while shell commands still pause.
---

Claude doesn't ask about everything any more, and how often it asks is something you control per session by cycling the **permission mode**.

Press **Shift+Tab** in the prompt to cycle through them:

- **Auto** — *the current default.* Claude checks each tool call for risky actions and prompt injection before running it, executes the ones it judges lower-risk, and blocks the rest. You get asked about the things worth asking about, and not about `ls`.
- **Accept edits** — file edits go through without confirmation; shell commands still pause. The middle ground: you've agreed the plan, now let it execute while you watch the diffs.
- **Plan** — read-only. Claude can look at files and talk through what it *would* do, but changes nothing. Best for exploring an unfamiliar codebase, or getting a proposal before any work starts.
- **Bypass permissions** — asks about nothing. See the dangerously-skip-permissions tip before using it.

The current mode shows at the bottom of the terminal. Shift+Tab again to cycle forward; the modes loop.

You can also set the mode at launch — `claude --permission-mode plan` — which is handy when you know the whole session is an exploration.

Common rhythm: start in **plan mode**, get a proposal, agree on direction, then Shift+Tab into **auto-accept edits** and let Claude work while you scan the diffs. Saves twenty individual `y` confirmations on a multi-file change — and you stay in control because shell commands still need approval.

The mode is per-session and resets when you start a new conversation.

## Modes are a dial, not a safety net

Changing mode changes how often you're *asked*. It doesn't change what's *allowed*. If there are things you never want happening — reading `.env`, pushing to `main` — those belong in deny rules, which hold regardless of the mode you're in. See the permission-rules-not-blanket-trust tip.

You can also change the rules mid-session without restarting: run **`/permissions`** to manage allow and deny rules on the spot.
