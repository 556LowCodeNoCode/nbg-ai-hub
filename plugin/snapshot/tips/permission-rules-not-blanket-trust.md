---
type: tip
title: Stop the permission prompts properly — allow rules and deny rules
audience: beginner
topics: [control, safety]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: Permission fatigue has a better cure than skipping permissions entirely. /fewer-permission-prompts pre-approves the safe read-only commands you already use, and /permissions lets you write deny rules that block things you never want touched — deny always wins.
---

Everyone hits permission fatigue in week one, and the usual escape is to turn permissions off wholesale. There's a better pair of tools.

## `/fewer-permission-prompts` — approve the boring things

*"Pre-approve safe read-only commands based on your usage."*

It looks at what you've actually been approving and offers to stop asking about the harmless ones — the `ls`, `grep`, `cat` traffic that makes up most of the noise. It's tailored to your habits rather than a blanket switch, so you keep the prompts that matter.

Run it after your first week, once there's a real usage pattern to read.

## `/permissions` — and the deny rules nobody sets up

*"Manage allow and deny tool permission rules."*

Allow rules are the obvious half. **Deny rules are the half worth your attention**, because they hold no matter what else is configured — a deny rule beats an allow rule, and it beats auto-approval.

That makes them the right place for the handful of things you never want happening by accident. The usual suspects:

- Reading `.env` files and anything else holding secrets.
- `git push` — especially to `main`.
- Anything pointed at a production connection string.

You don't have to hand-write the rules. Describe the outcome:

> Open `/permissions` and add deny rules so you never read `.env` files and never run `git push`. Show me the result.

## Why this beats turning permissions off

Skipping permissions is one decision applied to everything forever. Deny rules are a small set of decisions applied precisely, and they survive whatever mode you're in later — including the days you're moving fast and not reading carefully. That's exactly when you want them.

For bank work this is the difference that matters: a deny rule on production credentials is a control you can describe to somebody. "I'm careful" isn't.

See also the permission-modes tip for what Shift+Tab does, and dangerously-skip-permissions for what that flag actually covers.
