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
ai_summary: A five-step walkthrough for someone who just got Claude Code access — install, first session, survival keys, CLAUDE.md, GitHub account. Designed to be done in under an hour.
---

You just got Claude Code. Here's the path that takes you from "installed" to "actually productive" in under an hour. Five steps. Don't skip any.

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

For a new project, run `/claudemd` (a team skill — once it's installed). For an existing project, ask Claude: *"propose a `CLAUDE.md` for this project."*

Keep it under two pages. Lead with hard rules. Add to it whenever you find yourself correcting Claude on the same thing twice.

---

## Step 5 — Get a GitHub account

**Do I need a GitHub account?** Yes — but don't worry. You don't need to "be a coder" to have one, and Claude Code does the heavy lifting from here. `gh` (the GitHub CLI you installed in step 1) is what Claude uses under the hood every time it touches GitHub. You'll see commands like `gh pr create` or `gh repo clone` flash past in sessions — you don't have to type them. Claude proposes, you approve.

**What is GitHub and why does the team use it?** GitHub is where every line of code, every script, every Claude skill, every document the team writes lives. It's the industry standard — every software team in the world uses it for the same reasons:

- **It's the shared filing cabinet.** Every team project lives in a *repository* (a GitHub folder). Clone one to your laptop and you have the whole thing — no "can you email me the latest version?", no version-confusion, no "which folder is current?". Whoever pushes a change, everyone gets it.
- **It's how work gets reviewed.** Changes go through a *pull request* — a side-by-side diff your colleagues can comment on before it lands. The whole team's knowledge gets baked into the review trail.
- **It's how Claude Code knows what to work on.** Claude reads a project from a GitHub-cloned folder on your laptop. Without GitHub, there's nothing for it to read and nowhere for its work to go.
- **It's the team's collective memory.** Every decision, every issue, every conversation about why the code looks the way it does — it's all searchable, forever. Newcomers (you, today) can read the trail and catch up without bothering anyone.

Once you have an account, you can also pin favourites and submit your own skills to this hub.

**Don't be intimidated.** Signing up takes five minutes. From there, Claude Code makes GitHub feel like a quiet utility, not a wall of jargon.

**What to do:**

1. Go to [github.com](https://github.com/) and sign up. Five minutes. No credit card, no technical questions, use your bank email.
2. In a terminal, run:
   ```
   gh auth login
   ```
   Pick `GitHub.com` → `HTTPS` → `Login with a web browser`. Copy the code it shows, hit return, log in in the browser. Done.
3. Ping the team channel to be added to the team org — that's where the team's repositories live.

If anything in those three steps confuses you, just ask Claude: *"walk me through setting up my GitHub account."* It does this all day long.
