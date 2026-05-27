---
type: journey-step
title: Day 1 — first session with Claude Code
audience: beginner
topics: [onboarding, getting-started]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-27"
external_link: null
deeper_link: null
ai_summary: A five-step walkthrough for someone who just got Claude Code access — install, GitHub account, first session, survival keys, CLAUDE.md. Designed to be done in under an hour.
---

You just got Claude Code. Here's the path that takes you from "installed" to "actually productive" in under an hour. Five steps. Don't skip any.

**You don't need to write code to use this.** If your job is reading requirements, summarising documents, drafting user stories, querying data, sanity-checking artefacts — all of that is text in, text out, and Claude Code reads files directly. Specs, exports, meeting notes, JIRA dumps. The Day 1 path below is the same whether you write code or not.

> **2026-05-27 — sequence change:** the GitHub account step moved up from Step 5 to Step 2. The clone-a-repo reference in Step 3 needs an account to point at, so the account comes first now.

---

## Step 1 — Install and pick a terminal

Claude Code is a CLI tool, so you need a terminal it runs well in.

> **Quick vocabulary check — four words you'll see throughout.**
>
> - **Terminal** — the window on your computer that takes typed commands instead of clicks. Black background, blinking cursor.
> - **Shell** — the program running *inside* the terminal that interprets what you type. Bash and zsh are the common ones.
> - **CLI** — command-line interface. Any program you run by typing rather than clicking. `git` is a CLI. Claude Code is a CLI.
> - **Slash command** — a shortcut inside Claude Code. You type `/`, then a name (`/clear`, `/compact`, `/help`). Built-in actions, different from a normal prompt.
>
> One line: *Terminal is the window. Shell is the brain. CLI is anything you type instead of click. Slash command is a shortcut inside a CLI tool.*

### If you're on a Mac

Any of cmux, Ghostty, iTerm2, or Warp work fine. The default Terminal.app is also OK. Install Claude Code itself per the [official docs](https://docs.claude.com/en/docs/claude-code). Then install the GitHub CLI (`gh`):

```
brew install gh
```

`gh auth login` comes later (Step 2) once you have a GitHub account to authenticate.

### If you're on Windows — read this carefully

The team's whole workflow assumes a Bash-style shell. On Windows that means **WSL** (Windows Subsystem for Linux) — Microsoft's first-party way of running a Linux environment inside Windows. PowerShell works in a pinch but you'll fight the tooling. WSL is what the team uses.

**The happy path (admin rights, Windows 10 19041+ or Windows 11):**

Open *PowerShell as administrator* and run:

```
wsl --install
```

That single command installs WSL 2, the virtualization layer it depends on, and Ubuntu by default. Reboot when prompted. After reboot, an Ubuntu window pops up and asks you to pick a username and password — these are your *Linux* credentials, separate from your Windows login.

Inside the Ubuntu shell, install the GitHub CLI:

```
sudo apt update && sudo apt install -y gh
```

Then install Claude Code itself per the [official docs](https://docs.claude.com/en/docs/claude-code) — the install command runs inside Ubuntu, not Windows.

**If you don't have admin rights on your bank laptop** — this is the most common blocker. A few escape hatches, in order of preference:

1. **Ask IT to enable WSL for you.** Most bank IT teams have a process for this — name the request "Enable WSL for development". It's a one-time policy change, not an ongoing exception.
2. **Use Git Bash as a temporary fallback.** Install [Git for Windows](https://git-scm.com/download/win) (often pre-approved). It bundles a Bash shell that handles `cd`, `ls`, `gh`, and most basic commands. Claude Code itself may need additional setup steps that don't apply to native Linux — work through the [Windows-specific install notes](https://docs.claude.com/en/docs/claude-code) before committing.
3. **Request a developer workstation.** If your role genuinely needs full Linux tooling, the longer-term answer is a dev-class machine where WSL is enabled by default.

**Common errors and what they mean:**

- *"WslRegisterDistribution failed with error 0x80370102"* — virtualization is disabled in BIOS. Needs an IT/firmware change.
- *"The Microsoft Store is unavailable"* — bank policy is blocking Store installs. Ask IT for an offline WSL installer (`.msi` packages exist).
- *"Permission denied" when running `sudo`* — you skipped the username/password step on first Ubuntu launch. Run `wsl --shutdown` then re-open Ubuntu and you'll be re-prompted.

If none of these escape hatches work for your specific machine, ping the team channel before sinking another hour into it — someone has probably hit your exact configuration.

---

## Step 2 — Get a GitHub account

**Do I need a GitHub account?** Yes — but don't worry. You don't need to "be a coder" to have one, and Claude Code does the heavy lifting from here. `gh` (the GitHub CLI you installed in Step 1) is what Claude uses under the hood every time it touches GitHub. You'll see commands like `gh pr create` or `gh repo clone` flash past in sessions — you don't have to type them. Claude proposes, you approve.

**What is GitHub and why does the team use it?** GitHub is where every line of code, every script, every Claude skill, every document the team writes lives. It's the industry standard — every software team in the world uses it for the same reasons:

- **It's the shared filing cabinet.** Every team project lives in a *repository* (a GitHub folder). Clone one to your laptop and you have the whole thing — no "can you email me the latest version?", no version-confusion, no "which folder is current?". Whoever pushes a change, everyone gets it.
- **It's how work gets reviewed.** Changes go through a *pull request* — a side-by-side diff your colleagues can comment on before it lands. The whole team's knowledge gets baked into the review trail.
- **It's how Claude Code knows what to work on.** Claude reads a project from a GitHub-cloned folder on your laptop. Without GitHub, there's nothing for it to read and nowhere for its work to go.
- **It's the team's collective memory.** Every decision, every issue, every conversation about why the code looks the way it does — it's all searchable, forever. Newcomers (you, today) can read the trail and catch up without bothering anyone.

Once you have an account, you can also pin favourites and submit your own skills to this hub.

**Don't be intimidated.** Signing up takes five minutes. From there, Claude Code makes GitHub feel like a quiet utility, not a wall of jargon.

**What to do:**

1. Go to [github.com](https://github.com/) and sign up. **Use your bank email** (`firstname.lastname@nbg.gr` or whatever pattern your unit uses — ask if unsure). For 2FA, use the bank-issued authenticator app, not SMS. Pick a username with your real name — this is a professional account, not a hobby one.
2. In a terminal, run:
   ```
   gh auth login
   ```
   Pick `GitHub.com` → `HTTPS` → `Login with a web browser`. Copy the code it shows, hit return, log in in the browser. Done.
3. Ping the team channel to be added to the team org — that's where the team's repositories live.

If anything in those three steps confuses you, just ask Claude: *"walk me through setting up my GitHub account."* It does this all day long.

---

## Step 3 — Start your first session

In a terminal, `cd` into a real project folder. If you don't have one yet, clone one of the team's repos now that you have an account from Step 2:

```
gh repo clone 556LowCodeNoCode/NbgAiHub
cd NbgAiHub
```

Then start a session:

```
claude --dangerously-skip-permissions
```

Yes, the flag name is alarming. It just means "don't ask permission for every single read or shell command" — you'll still review every code change before Claude applies it. Without the flag, you get prompted on every keystroke and Claude feels glacial.

> **Wait, doesn't this conflict with "always review the diff" in Tips?** No. The flag skips *permission prompts* (which mostly cover reading files and running shell commands); it does NOT skip *change reviews* (Claude still pauses on every code edit for you to accept or reject). The two pieces of advice live at different layers. For the deep version, see the [`--dangerously-skip-permissions` tip](/tips/#tip-dangerously-skip-permissions).

To resume a previous session: `claude --continue` (or `claude -c`).

---

## Step 4 — Learn the survival keys

You'll need these in your first hour:

- **Esc** — stops Claude mid-action. If it's heading down the wrong path, press Esc. Use it freely.
- **Esc Esc** — opens the session-history scrubber so you can rewind several steps.
- **`/compact`** — summarises the conversation so far. Use when the session is long but still on-task.
- **`/clear`** — wipes the session. Use when switching to an unrelated task.
- **Showing a screenshot** — macOS: ⌃⇧⌘4, then **Ctrl V** (not ⌘V!) pastes into Claude. Windows: save to file, drag into terminal.

The single most important key is Esc.

---

## Step 5 — Write your `CLAUDE.md`

`CLAUDE.md` is the file Claude reads automatically every time you start a session in a folder. Put project conventions there once — naming rules, tech stack, things-not-to-do — and never re-explain them again.

Two levels:

- **Global** at `~/.claude/CLAUDE.md` — applies to every project on your machine
- **Project** at `<repo-root>/CLAUDE.md` — applies to this project, overrides global

For a new project, run `/claudemd` (a team skill — once it's installed). For an existing project, ask Claude: *"propose a `CLAUDE.md` for this project."*

Keep it under two pages. Lead with hard rules. Add to it whenever you find yourself correcting Claude on the same thing twice.

**See what one actually looks like:** the [worked CLAUDE.md example](/tips/#tip-claudemd-worked-example) tip is a real (lightly fictionalised) project-level CLAUDE.md, annotated. Read it once before you write yours.
