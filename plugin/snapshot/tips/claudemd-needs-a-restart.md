---
type: tip
title: Editing CLAUDE.md mid-session does nothing — you have to restart
audience: beginner
topics: [context]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: CLAUDE.md is read once, when the session starts. Adding a rule to it in the middle of a conversation has no effect until you start a new session — which is why people conclude CLAUDE.md "doesn't work" when it does.
---

Here's a trap that makes people give up on CLAUDE.md entirely.

Claude does something you don't like. You do the right thing — you open `CLAUDE.md` and add a rule saying "don't do that". You go back to the session. Claude does it again. You conclude CLAUDE.md is decorative and stop maintaining it.

**CLAUDE.md is read once, at session start.** The session you're in is running on the version that existed when it began. Your edit is real, it's just not loaded.

## What to do instead

Add the rule, then start a new session. The rule takes effect there.

If you need the behaviour to stop *right now*, in the session you're already in, say so in the prompt — that works immediately:

> From now on in this session, don't touch files under `migrations/` without asking me first.

Then put the same rule in `CLAUDE.md` so the next session starts with it. Prompt for now, file for next time.

## Why this is worth knowing on day one

The whole loop of *"when Claude does something wrong, add a line to CLAUDE.md"* depends on knowing this. Without it, the loop appears not to work, and the natural conclusion is that the file is ignored. It isn't — it's just loaded at a moment you weren't thinking about.

A quick way to confirm your file is being read at all: start a fresh session and ask.

> What rules are you working under from CLAUDE.md right now?
