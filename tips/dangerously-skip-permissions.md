---
type: tip
title: "`--dangerously-skip-permissions` — what it actually does"
audience: beginner
topics: [control]
internal: false
authored: "2026-05-27"
last_reviewed: "2026-05-27"
external_link: null
deeper_link: null
ai_summary: The flag the team uses as its default Day-1 launch command. Skips read/shell permission prompts but does NOT skip code-edit reviews. Knowing the precise boundary defuses the "wait, isn't this dangerous?" anxiety.
---

If you followed Day 1 you launched Claude with `claude --dangerously-skip-permissions`. The flag name is alarming on purpose — it's how Anthropic flags "you are skipping a safety prompt, are you sure?". But its actual blast radius is narrower than the name suggests. Here is the precise boundary.

## What the flag DOES skip

- **Read prompts.** Without the flag, Claude asks before reading a file. With the flag, it just reads. (You shared the folder; Claude reading files inside it is the whole point.)
- **Shell-command prompts.** Without the flag, Claude asks before running `ls`, `grep`, `cat`, and other read-only shell commands. With the flag, it just runs them and you see the output flow past.

## What the flag does NOT skip

- **Code-change reviews.** Every time Claude wants to write or modify a file, it pauses and shows you the diff. You approve each change explicitly. The flag does *not* change this.
- **Destructive-action confirmations.** `rm -rf`, force-pushes, dropping a database table — these still prompt regardless of the flag.
- **External network calls.** Posting to a webhook, calling a paid API, opening a browser — still prompts.

In short: the flag mutes the *trivial-action* dialog, not the *meaningful-action* dialog.

## Why the team uses it as the Day 1 default

Without the flag, every single read and shell command opens a permission prompt. Claude feels glacial. New users bounce in the first hour because the latency feels broken. The flag removes that friction without giving away the reviews that matter.

This isn't *every* team's call. Other teams keep the prompts on and use `Shift+Tab` to cycle through permission modes mid-session. Both are reasonable. The NBG AI team's position is: the noise/signal ratio of the trivial prompts is bad enough that defaulting to the flag is the right tradeoff for the audience this hub serves.

## When you might choose differently

- **You're working with a folder you don't fully trust** (e.g. a colleague handed you their working directory). Drop the flag for that session. Permission prompts give you a chance to see what Claude is about to read.
- **You're auditing Claude's behaviour** for a write-up, a training session, or a security review. Drop the flag — every prompt becomes a visible decision.
- **You're paranoid for any reason at all.** Drop the flag. Latency-pain is real but knowable; not knowing what your tool is doing is worse.

To launch without the flag: just `claude` (no flag). The permission prompts come back. You can also press `Shift+Tab` *within* a session to flip between `default`, `auto-accept edits`, and `plan` modes — see the `permission-modes` tip.

The reconciliation you might be looking for: the "always review the diff" advice you see elsewhere on this hub refers to *code-change reviews* — which this flag does not touch. The flag and the always-review-the-diff habit live at different layers of the permission system. They coexist by design.
