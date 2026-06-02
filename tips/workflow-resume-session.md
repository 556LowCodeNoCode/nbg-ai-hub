---
type: tip
title: Resume yesterday's session instead of starting from scratch
audience: beginner
topics: [workflow]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: https://code.claude.com/docs/en/common-workflows
deeper_link: null
ai_summary: You don't have to lose context overnight. `claude --continue` picks up your last session; `claude --resume` opens a session picker. The codebase knowledge Claude built up is worth more than the 30 seconds of re-grounding.
---

Most newcomers don't realise Claude Code remembers sessions and that you can come back to them. Three commands cover most cases:

- **`claude --continue`** — resumes the most recent session in the current directory. The fastest way back to "where I was last night".
- **`claude --resume`** — opens a picker showing your recent sessions. Use when you have several going (one per feature) and want to pick.
- **`claude --from-pr 142`** — jumps back into the session that produced PR #142 (Claude links sessions to PRs you open with `gh pr create`).

Why this matters: a session that's worked through a feature has already read the relevant files, understood the conventions, and built up the working mental model. Starting fresh means re-grounding all of that from your CLAUDE.md and a cold prompt. The resumed session is *better-informed*, not just faster.

A small trick when you resume: ask Claude to summarise where you left off.

> Quick recap — what were we doing in this session and what's the next step?

Forty words of Claude's own context, written by Claude in its own words, is a better re-entry point than your half-remembered notes.

When *not* to resume: when the topic has changed. Pulling yesterday's "fix the auth bug" session into today's "design the cart API" task gives you the worst of both worlds — Claude has stale context AND mixed topics. Start fresh for unrelated work.

Pair this with the *One session, one task* tip. The sessions you keep should be the focused ones; the unfocused ones should have ended yesterday.
