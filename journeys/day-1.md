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
ai_summary: A six-step walkthrough for someone who just got Claude Code access — terminal, install, GitHub account, first session, control keys, CLAUDE.md. Designed to be done in about an hour.
---

You just got Claude Code. Here's the path from "installed" to "actually productive" in about an hour. Six steps. Don't skip any.

**You don't need to write code to use this.** If your job is reading requirements, summarising documents, drafting user stories, querying data, sanity-checking artefacts — that's all text in, text out, and Claude Code reads files directly. Specs, exports, meeting notes, JIRA dumps. The Day 1 path below is the same whether you write code or not.

---

## Step 1 — Open a terminal

Claude Code is a CLI tool. Before you install it, you need a terminal it runs well in.

> **Vocabulary check — four words you'll see throughout.**
>
> - **Terminal** — the window on your computer that takes typed commands instead of clicks. Black background, blinking cursor.
> - **Shell** — the program running *inside* the terminal that interprets what you type. Bash and zsh are the common ones.
> - **CLI** — command-line interface. Any program you run by typing rather than clicking. `git` is a CLI. Claude Code is a CLI.
> - **Slash command** — a shortcut inside Claude Code. You type `/`, then a name (`/clear`, `/compact`, `/help`). Built-in actions, different from a normal prompt.
>
> One line: *Terminal is the window. Shell is the brain. CLI is anything you type instead of click. Slash command is a shortcut inside a CLI tool.*

### On a Mac

The default [Terminal.app](https://support.apple.com/en-gb/guide/terminal/welcome/mac) (Applications → Utilities → Terminal) is fine for Day 1. If you want something nicer, popular choices are:

- [cmux](https://cmux.com/) — a newer macOS terminal purpose-built for AI coding agents (vertical tabs per session, agent notifications, built-in browser pane)
- [Ghostty](https://ghostty.org/) — fast, modern, opinionated
- [Warp](https://www.warp.dev/) — has its own AI features (skip those; you're using Claude Code)
- [iTerm2](https://iterm2.com/) — the long-standing alternative, free

Open whichever you pick and you'll see a prompt — that's all you need to continue.

### On Windows — read this carefully

The whole Claude Code workflow assumes a Bash-style shell. On Windows that means **WSL** (Windows Subsystem for Linux) — Microsoft's first-party way of running a Linux environment inside Windows. PowerShell works in a pinch but you'll fight the tooling. WSL is the path to take.

**The one-line install (Windows 10 build 19041+ or Windows 11, admin rights):**

Open *PowerShell as Administrator* and run:

```
wsl --install
```

That single command installs WSL 2, the virtualization layer it depends on, and Ubuntu by default. Reboot when prompted. After reboot, an Ubuntu window pops up and asks you to pick a username and password — these are your *Linux* credentials, separate from your Windows login.

Then install [Windows Terminal](https://learn.microsoft.com/en-us/windows/terminal/install) — it's the cleanest app for running Ubuntu/WSL day-to-day. Pick "Ubuntu" as the profile and you're done.

Full Microsoft instructions, including the manual install path for older Windows builds and alternative distributions: [learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/en-us/windows/wsl/install).

**If `wsl --install` fails or you don't have admin rights:**

- *"WslRegisterDistribution failed with error 0x80370102"* — virtualization is disabled in BIOS. Needs an IT/firmware change.
- *"The Microsoft Store is unavailable"* — Store installs are blocked by policy. Microsoft ships offline WSL installer packages (`.msi`) — ask IT for the offline installer.
- *"Permission denied" when running `sudo`* — you skipped the username/password step on first Ubuntu launch. Run `wsl --shutdown` then re-open Ubuntu to be re-prompted.
- *No admin rights at all* — file a request with IT to enable WSL. It's a one-time policy change, not an ongoing exception. While you wait, [Git for Windows](https://git-scm.com/download/win) ships a Bash shell that handles `cd`, `ls`, `gh`, and most basic commands — enough to read along with the next steps.

If none of those help, the [Microsoft WSL troubleshooting guide](https://learn.microsoft.com/en-us/windows/wsl/troubleshooting) covers the long tail — most exotic errors have a known fix documented there.

---

## Step 2 — Install Claude Code

Claude Code is published as an npm package, so you need Node.js installed first. Two paths depending on your platform.

### On Mac, Linux, or inside WSL

The cleanest way to install Node is via [**nvm**](https://github.com/nvm-sh/nvm) (Node Version Manager) — it keeps Node out of system folders and makes upgrades painless.

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
source ~/.bashrc       # or `source ~/.zshrc` on Mac
nvm install --lts      # installs the latest LTS Node
```

Verify:

```
node -v
npm -v
```

Then install Claude Code globally via npm:

```
npm install -g @anthropic-ai/claude-code
```

### On native Windows (no WSL)

This is the less-recommended path. If you can use WSL, use it. If you can't, install [Node.js LTS](https://nodejs.org/en/download) via the official installer (or via [`winget install OpenJS.NodeJS.LTS`](https://learn.microsoft.com/en-us/windows/package-manager/winget/) in PowerShell), then:

```
npm install -g @anthropic-ai/claude-code
```

### Pick a provider on first run

Type `claude` once. The first thing it asks is *which backend to use* — i.e. who's actually running the model. Claude Code supports four:

| Provider | When to pick it |
|---|---|
| **Claude.ai login** | The default. Sign in with your Claude account; works out of the box. Best for personal exploration and most teams. |
| **Anthropic API key** | If your team gives you an API key directly. |
| **AWS Bedrock** | If your organisation routes through Bedrock for governance. Needs AWS credentials and a region. |
| **Google Vertex AI** | If your organisation routes through Vertex. Needs the [gcloud CLI](https://cloud.google.com/sdk/docs/install) + a project ID. |

If you're not sure, pick **Claude.ai login** — you can always switch later.

**If your organisation routes through Bedrock or Vertex**, the shape is the same regardless of the team:

1. **Authenticate the cloud SDK first.** For Vertex: `gcloud auth application-default login` (install the [gcloud CLI](https://cloud.google.com/sdk/docs/install) if you don't have it). For Bedrock: `aws configure` with credentials from your team.
2. **Set the environment variables Claude Code reads before launching.** For Vertex:
   ```
   export CLAUDE_CODE_USE_VERTEX=1
   export CLOUD_ML_REGION=<your-region>
   export ANTHROPIC_VERTEX_PROJECT_ID=<your-project-id>
   export ANTHROPIC_MODEL=<your-model-id>
   ```
   For Bedrock, the equivalents are `CLAUDE_CODE_USE_BEDROCK=1` plus your AWS region and model identifier. The exact region, project ID, and model ID come from your team's internal setup guide.
3. **Launch:** `claude`.

Full provider documentation, with the up-to-date model identifiers for each backend: [docs.claude.com/en/docs/claude-code](https://docs.claude.com/en/docs/claude-code).

---

## Step 3 — Get a GitHub account

**Do I need a GitHub account?** Yes — but don't worry. You don't need to "be a coder" to have one, and Claude Code does the heavy lifting from here. `gh` (the GitHub CLI) is what Claude uses under the hood every time it touches GitHub. You'll see commands like `gh pr create` or `gh repo clone` flash past in sessions — you don't have to type them. Claude proposes, you approve.

**What is GitHub and why does every team use it?** GitHub is where every line of code, every script, every Claude skill, every document a team writes lives. It's the industry standard — every software team in the world uses it for the same reasons:

- **It's the shared filing cabinet.** Every team project lives in a *repository* (a GitHub folder). Clone one to your laptop and you have the whole thing — no "can you email me the latest version?", no version-confusion, no "which folder is current?". Whoever pushes a change, everyone gets it.
- **It's how work gets reviewed.** Changes go through a *pull request* — a side-by-side diff your colleagues can comment on before it lands. The team's knowledge gets baked into the review trail.
- **It's how Claude Code knows what to work on.** Claude reads a project from a GitHub-cloned folder on your laptop. Without GitHub, there's nothing for it to read and nowhere for its work to go.
- **It's collective memory.** Every decision, every issue, every conversation about why the code looks the way it does — it's all searchable, forever. Newcomers (you, today) read the trail and catch up without bothering anyone.

**Don't be intimidated.** Signing up takes five minutes. From there, Claude Code makes GitHub feel like a quiet utility, not a wall of jargon.

**What to do:**

1. Go to [github.com](https://github.com/) and sign up. **Any email works** — work or personal, whichever you prefer. For 2FA, prefer an authenticator app over SMS. Pick a username with your real name — this is a professional account, not a hobby one.
2. Install the GitHub CLI ([cli.github.com/manual/installation](https://cli.github.com/manual/installation)):
   - **Mac:** `brew install gh`
   - **WSL Ubuntu / Linux:** `sudo apt update && sudo apt install -y gh`
   - **Native Windows:** `winget install --id GitHub.cli`
3. Authenticate:
   ```
   gh auth login
   ```
   Pick `GitHub.com` → `HTTPS` → `Login with a web browser`. Copy the code it shows, hit return, log in in the browser. Done.

If anything in those three steps confuses you, just ask Claude: *"walk me through setting up my GitHub account."* It does this all day long.

---

## Step 4 — Start your first session

**A note before you type `claude`.** Claude operates on whatever folder you `cd` into — that folder is its playground, the only place it can read files, run commands, or make changes. **Don't run `claude` in your home directory** or anywhere generic — you'd be handing it the keys to your entire user account. Create (or pick) a dedicated folder that scopes Claude to one project at a time. That discipline is what keeps it useful and out of trouble.

### The easy path — make a new playground folder

You don't need an existing project or a GitHub repo to start. Just make a fresh folder, `cd` into it, and run Claude there:

```
mkdir ~/claude-playground
cd ~/claude-playground
claude --dangerously-skip-permissions
```

(Pick any name and any location you like — `~/projects/`, `~/work/`, `~/Documents/`, whatever fits your habits. The point is just *a folder of its own*.)

That's it. You're in. Drop a spreadsheet, a PDF, a `.txt` of meeting notes — anything — into that folder and ask Claude to read it. *"Summarise this file"*, *"what's in the third column?"*, *"draft a one-page report from this"* — all valid first prompts.

### The other path — work on an existing project from GitHub

If your team has a repo, or you want to explore an open-source one, clone it into a folder of its own first:

```
gh repo clone <org>/<repo>
cd <repo>
claude --dangerously-skip-permissions
```

Same idea, different starting content. Now Claude sees an existing codebase or document set instead of an empty room.

### About that `--dangerously-skip-permissions` flag

Yes, the flag name is alarming. It just means "don't ask permission for every single read or shell command" — you'll still review every code change before Claude applies it. Without the flag, you get prompted on every keystroke and Claude feels glacial.

> **Wait, doesn't this conflict with "always review the diff" in Tips?** No. The flag skips *permission prompts* (which mostly cover reading files and running shell commands); it does NOT skip *change reviews* (Claude still pauses on every code edit for you to accept or reject). The two pieces of advice live at different layers. For the deep version, see the [`--dangerously-skip-permissions` tip](/tips/#tip-dangerously-skip-permissions).

To resume a previous session: `claude --continue` (or `claude -c`).

### Want to share your work? Push it to GitHub

Everything above happens in a folder on your machine. That's fine forever — you don't need GitHub to *use* Claude Code.

When you do want to share, back up, or collaborate on a folder, the mechanism is GitHub. And since you ran `gh auth login` back in Step 3, **Claude can already talk to GitHub on your behalf** — you don't have to memorise the `git` and `gh` commands. Just ask:

> *"create a GitHub repo for this folder and push it"*

Claude runs the four-step plumbing (`git init` → `git add` → `git commit` → `gh repo create --source=. --push`) and the folder lands on github.com under your account.

From then on, every time you want to publish your latest changes:

> *"commit and push"*

**The two-word logic:**

- **Commit** = save a local snapshot of your changes, with a short label describing what changed. Lives on your machine only.
- **Push** = upload your accumulated commits to GitHub, where teammates can see them.

Commits are cheap; you can make ten of them before pushing once. Push when you actually want the work to leave your laptop.

---

## Step 5 — Write your `CLAUDE.md`

**The story that sells it.** Two folders, identical spreadsheet inside — say, a list of loan applications. Same one-line prompt typed in each: *"analyse this and give me a report."*

- **Without `CLAUDE.md`** — you get different reports every time you run it. Different categories, different structure, different level of detail. Every run reinvents the wheel, and each one takes a while.
- **With `CLAUDE.md`** — naming the columns, defining the statuses and risk indicators, and spelling out what "a report" should contain — re-run the same prompt and you get the same output, every time.

That's `CLAUDE.md`.

**There is no save button in Claude Code.** Each session starts fresh — what's in `CLAUDE.md` is loaded automatically; what isn't, you'd have to re-explain. (You *can* resume the previous session in a folder with `claude --continue`, but that's pick-up-where-you-left-off, not persistent memory.) `CLAUDE.md` is the **first document Claude reads** every time you start a session in a folder — make it the single source of truth for everything you don't want to re-explain.

Put project conventions there once — naming rules, tech stack, business logic, statuses, things-not-to-do — and never re-explain them again.

Two levels:

- **Global** at `~/.claude/CLAUDE.md` — applies to every project on your machine
- **Project** at `<repo-root>/CLAUDE.md` — applies to this project, overrides global

If it gets bigger, don't bloat it — reference other docs from it: scope, out-of-scope, issues, decisions, plans.

**See what one actually looks like:** the [worked CLAUDE.md example](/tips/#tip-claudemd-worked-example) tip is a real (lightly fictionalised) project-level CLAUDE.md, annotated. Read it once before you write yours.

---

## Step 6 — Learn the control keys

You'll need these in your first hour:

- **Esc** — stops Claude mid-action. If it's heading down the wrong path, press Esc. Use it freely.
- **Esc Esc** — opens the session-history scrubber so you can rewind several steps.
- **`/compact`** — summarises the conversation so far. Use when the session is long but still on-task.
- **`/clear`** — wipes the session. Use when switching to an unrelated task.
- **Showing a screenshot** — macOS: ⌘C to capture a region to the clipboard, then **control V** to paste it into Claude. Windows: save to file, drag into terminal.

The single most important key is Esc.
