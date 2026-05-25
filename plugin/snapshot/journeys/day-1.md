---
type: journey-step
title: Day 1 — first session with Claude Code
audience: beginner
topics: [onboarding, getting-started]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: null
ai_summary: A six-step walkthrough for someone who just got Claude Code access — install, first session, survival keys, CLAUDE.md, skills marketplace, where to go tomorrow. Designed to be done in under an hour.
---

You just got Claude Code. Here's the path that takes you from "installed" to "actually productive" in under an hour. Six steps. Don't skip any.

---

## Step 1 — Install and pick a terminal

Claude Code is a CLI tool, so you need a terminal it runs well in.

- **macOS:** any of cmux, Ghostty, iTerm2, or Warp work fine. The default Terminal.app is also OK.
- **Windows:** use WSL (Windows Subsystem for Linux). PowerShell works in a pinch but WSL is what the team uses.

Install Claude Code itself per the official docs. Then install the GitHub CLI (`gh`) — the team's whole workflow goes through GitHub, and `gh` is how Claude talks to it. Once installed, run `gh auth login` once to authenticate.

---

## Step 2 — Start your first session

In a terminal, `cd` into a real project folder (one of the team's repos — clone one if you don't have one yet). Then:

```
claude --dangerously-skip-permissions
```

Yes, the flag name is alarming. It just means "don't ask permission for every single read or shell command" — you'll still review every code change before Claude applies it. Without the flag, you get prompted on every keystroke and Claude feels glacial.

To resume a previous session: `claude --continue` (or `claude -c`).

---

## Step 3 — Learn the survival keys

You'll need these in your first hour:

- **Esc** — stops Claude mid-action. If it's heading down the wrong path, press Esc. Use it freely.
- **Esc Esc** — opens the session-history scrubber so you can rewind several steps.
- **`/compact`** — summarises the conversation so far. Use when the session is long but still on-task.
- **`/clear`** — wipes the session. Use when switching to an unrelated task.
- **Showing a screenshot** — macOS: ⌃⇧⌘4, then **Ctrl V** (not ⌘V!) pastes into Claude. Windows: save to file, drag into terminal.

The single most important key is Esc.

---

## Step 4 — Write your `CLAUDE.md`

`CLAUDE.md` is the file Claude reads automatically every time you start a session in a folder. Put project conventions there once — naming rules, tech stack, things-not-to-do — and never re-explain them again.

Two levels:

- **Global** at `~/.claude/CLAUDE.md` — applies to every project on your machine
- **Project** at `<repo-root>/CLAUDE.md` — applies to this project, overrides global

For a new project, run `/claudemd` (a team skill — see step 5) to scaffold the template. For an existing project, ask Claude: *"propose a `CLAUDE.md` for this project."*

Keep it under two pages. Lead with hard rules. Add to it whenever you find yourself correcting Claude on the same thing twice.

---

## Step 5 — Add the team skills marketplace

The team curates a marketplace of ready-made skills at `github.com/556LowCodeNoCode/Skills`. One-time install, then any team member can install individual skills.

```
/plugin marketplace add 556LowCodeNoCode/Skills
```

Then install individual skills you'll use:

```
/plugin install team@556LowCodeNoCode-skills
/plugin install claudemd@556LowCodeNoCode-skills
/plugin install deploy@556LowCodeNoCode-skills
/plugin install commit-work@556LowCodeNoCode-skills
```

You can also install this hub itself as a plugin so `/hub-search`, `/hub-glossary`, `/hub-tips` work inside Claude Code:

```
/plugin marketplace add chomovazuzana/NbgAiHub
/plugin install nbg-ai-hub@nbg-ai-hub-marketplace
```

---

## Step 6 — Where to go next

You're set up. By tomorrow, do these three things:

1. **Try `/team` on one small task** — fix a bug, add a small feature. See the multi-agent workflow end-to-end on something low-stakes.
2. **Read your project's `CLAUDE.md`** — once. Then keep it open in a tab.
3. **Bookmark this hub** — and remember `/hub-search` works inside Claude Code without leaving the terminal.

Stuck on anything? `/hub-glossary <term>` for definitions, `/hub-tips` for patterns. Or ask in the team channel — *every* newcomer hits the same walls in the first week. Asking earlier saves time.

Tomorrow: pick a real piece of work and ship it.
