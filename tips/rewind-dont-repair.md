---
type: tip
title: When Claude goes wrong, rewind — don't try to talk it out of the hole
audience: beginner
topics: [control]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: /rewind restores the code and conversation to an earlier point. It beats arguing with a session that has gone off the rails. Critical caveat - rewind does not undo files deleted by shell commands; that needs git.
---

The classic beginner afternoon: Claude makes a wrong turn, you correct it, it over-corrects, you correct *that*, and forty minutes later the code is worse than when you started.

Stop doing that. Rewind instead.

```
/rewind
```

Claude Code describes it as *"Restore the code and/or conversation to a previous point."* You pick a moment before things went wrong and go back to it. The bad turns don't have to be argued away — they just stop having happened.

**Why this beats correcting:** once a conversation contains three wrong attempts, every new answer is shaped by those attempts. You're not just fighting the original mistake, you're fighting the accumulated context around it. Rewinding removes the context. Correcting adds to it.

**When to reach for it:** the second correction. If your first "no, not like that" didn't land, don't type a third. Rewind.

## The caveat that actually matters

**Rewind does not undo shell commands.**

Rewind covers Claude's own edits to your code and the conversation. If Claude ran a shell command that deleted files, moved a directory, or dropped a database table, rewinding the conversation does **not** bring any of that back. That's `git` territory — and if the work was never committed, it may be gone for good.

This is the single most expensive gap between what people assume rewind does and what it does.

The practical consequence, and it's the whole reason this tip exists: **commit before you let Claude do anything destructive.** A commit takes five seconds and is the only real undo for shell-level damage.

> Before we start — commit the current state with a message describing where we are, so I have something to go back to.

## Related keys

- **Esc** — stop Claude mid-action. See the esc-to-stop tip.
- **Esc Esc** — clears the input box when your half-written prompt is a mess.
