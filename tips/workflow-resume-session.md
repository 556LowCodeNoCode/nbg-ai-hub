---
type: tip
title: Resume yesterday's session instead of starting from scratch
audience: beginner
topics: [workflow]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-09-15"
external_link: https://code.claude.com/docs/en/common-workflows
deeper_link: null
ai_summary: You don't have to lose context overnight. `claude --continue` picks up your last session; `claude --resume` opens a session picker. The codebase knowledge Claude built up is worth more than the 30 seconds of re-grounding.
---

Most newcomers don't realise Claude Code remembers sessions and that you can come back to them. Three commands cover most cases:

- **`claude --continue`** — resumes the most recent session in the current directory. The fastest way back to "where I was last night".
- **`claude --resume`** — opens a picker showing your recent sessions. Use when you have several going (one per feature) and want to pick.
- **`claude --from-pr 142`** — jumps back into the session that produced PR #142 (Claude links sessions to PRs you open with `gh pr create`).

Why this matters: a session that's worked through a feature has already read the relevant files, understood the conventions, and built up the working mental model. Starting fresh means re-grounding all of that from your CLAUDE.md and a cold prompt. The resumed session is *better-informed*, not just faster.

## Name your sessions or the picker is useless

`claude --resume` shows a list. If every entry is an opaque ID, you'll pick the wrong one or give up. Name the ones worth returning to:

```
claude --name invoice-rounding-bug
```

The name shows in the prompt box, the `/resume` picker, and your terminal title. Two seconds at the start of a session, and the picker becomes navigable.

A small trick when you resume: ask Claude where you left off. There's a built-in for it —

```
/recap
```

*"Generate a one-line session recap now."* Or ask in your own words if you want more than a line:

> Quick recap — what were we doing in this session and what's the next step?

Forty words of Claude's own context, written by Claude in its own words, is a better re-entry point than your half-remembered notes.

On a very long session you may be offered a **summary-based resume** rather than a full one. That's the same lossy trade `/compact` makes — fine for picking up the thread, worse for the specifics. If the session mattered, a written handoff beats either. See the handoff-not-summary tip.

When *not* to resume: when the topic has changed. Pulling yesterday's "fix the auth bug" session into today's "design the cart API" task gives you the worst of both worlds — Claude has stale context AND mixed topics. Start fresh for unrelated work.

Pair this with the *One session, one task* tip. The sessions you keep should be the focused ones; the unfocused ones should have ended yesterday.
