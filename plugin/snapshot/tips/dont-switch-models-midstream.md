---
type: tip
title: Don't swap models in the middle of a conversation
audience: both
topics: [workflow, context]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: Switching models mid-session is the standard move when you're stuck, and it's usually the wrong one — it costs you the cached context and carries the same wrong assumptions into the new model. Pick the model at the start; hand off to a fresh session if you need to change.
---

You're stuck. The obvious move is to reach for a bigger model with `/model` and try again.

It rarely helps, for two reasons.

**The conversation comes with you.** Everything that led you into the dead end — the wrong assumption three turns back, the misread error message, the approach that was never going to work — is still in the context. The bigger model inherits all of it and reasons from the same flawed starting point. You changed the engine, not the map.

**You pay for the switch.** Each model builds its own cache of the conversation. Switching means the new model reads everything from scratch, and switching back does it again. On a long session that's a real cost for no new information.

## What to do instead

**Pick the model at the start, for the task.** Opus-class for architecture, ambiguous problems, and hard debugging. Sonnet-class for multi-file edits and building from a clear spec. Decide once, at launch:

```
claude --model opus
```

**When you're genuinely stuck, hand off — don't escalate.** Write a handoff describing what you tried and why it failed, then start a fresh session with the model you want. Fresh context plus the right model beats polluted context plus a bigger model, every time. See the handoff-not-summary tip.

## Turning up reasoning without switching models

Often what you actually want isn't a different model, it's more thinking from the one you have:

- **`/effort`** — set the reasoning level for the session. The levels are `low`, `medium`, `high`, `xhigh` and `max`.
- **Alt+T** — toggle thinking for the next turn only.
- **"think harder"** in the prompt.

All three keep your cache and your context intact. Reach for these before reaching for `/model`.
