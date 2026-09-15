# the-agent-daily.org — content sweep for Tips & Skills

**Reviewed:** 2026-09-15 · **Source:** <https://the-agent-daily.org/>
**Purpose:** triage list for the Tips and Skills pillars. Nothing below is in the repo yet.
**How to give feedback:** mark each number `TAKE` / `SKIP` / `MAYBE`. TAKEs get written up per `docs/reference/authoring-tips.md`.

---

## ⚠️ Reliability warning — read first

These articles are write-ups of YouTube videos and third-party blogs. Accuracy is uneven:

- **37 Cheat Codes** corrects *its own source twice* (items #17/#18: the video's `Ctrl+A` and `Ctrl+W` claims are wrong, no such shortcuts exist).
- That article lists **`Ctrl+S` twice with different meanings**; the *12 Hidden Settings* article independently confirms the "stash" meaning. So the "expand search" claim is the suspect one.
- Settings names **disagree across articles**: `cleanupPeriodDays` vs `cleanup_period_days`, `agent_push_notify_enabled`. At most one spelling is right.
- Model names and star counts across this site are wildly inconsistent (a skills repo is cited at both 3.4K and 204,742 stars in different pieces).

**I have verified none of these keybindings, commands, or settings against a real install.** Everything below is transcribed as-published. Strong recommendation: you pick the TAKEs, I verify each one against the installed CLI, and only verified items become tips. We cannot ship a beginner tip that tells a colleague to press a key that does nothing.

---

## Corpus swept

My first pass only read the homepage, which is truncated. The real structure is two parallel sections, each paginated 3 deep:

| Section | Pages | Articles | Claude Code relevance |
|---|---|---|---|
| `/agentnews/deep-dives` | 3 | 56 | **highest** |
| `/agentnews-experimental/deep-dives` | 3 | ~57 | **highest** |
| `/agentnews/articles` | 1 | 10 | medium |
| `/agentnews/news` | 1 | 14 | low (industry commentary) |
| `/agentnews-experimental/articles` | 1 | 7 | low |
| `/agentnews-experimental/news` | 1 | 4 | low |

I read ~30 articles in full. The news sections are AI-industry commentary (Harari, Karpathy, Mistral, US–China) with no hub value — skipped deliberately.

---

# PART 1 — TIPS CANDIDATES

> ## ✅ PART 1 IS DONE (2026-09-15)
>
> All of Part 1 was executed: **16 new tips written, 14 existing tips edited** to remove duplication and correct stale facts. Tips 30 → 46.
>
> Every keybinding, command and setting below was checked against the installed Claude Code binary (v2.1.235) before being written up. **Roughly a quarter of the source claims were wrong.** Corrections made to already-published tips:
> - Auto is now the default permission mode — `permission-modes.md` rewritten.
> - `Esc Esc` clears the input; it does **not** open a history scrubber — `esc-to-stop.md` corrected, `/rewind` is the restore command.
> - `/effort` levels are `low/medium/high/xhigh/max`; `auto` was never one — `prompt-think-harder.md` corrected.
>
> Items **9, 28, 60, 63, 65, 71** were dropped as unverifiable → logged as Issue #25.
> Item **76** (Workflows) was deliberately skipped — the source itself warns it "will probably nuke your entire budget".
> One item was added that appears in no article: **`/powerup`**, Claude Code's own built-in feature tour.
>
> **Parts 2–4 below are still open** and gated on the Skills-pillar question.


## A. Keyboard shortcuts beginners never discover
*Small, safe, immediately useful. Probably one "keys beyond Esc" tip, not nine files.*

| # | Tip | Why beginners care | Status |
|---|---|---|---|
| 1 | **`Ctrl+R`** — search your prompt history this session | Stops re-inventing prompts that already worked | new |
| 2 | **`Ctrl+S`** — stash a half-written prompt, do something else, `Cmd+V` restores | Corroborated by two articles. Real frustration-killer | new ✅ best-corroborated |
| 3 | **`Ctrl+T`** — toggle Claude's to-do checklist | Beginners can't see what Claude plans to do | new |
| 4 | **`Ctrl+G`** — open prompt (+ last response) in a real editor | Writing long prompts in a terminal box is miserable. Also the cheap way to edit a plan | new |
| 5 | **`Ctrl+O`** — expand full context, see every collapsed tool call | "What did it actually do?" — the transparency they ask for | new |
| 6 | **`/focus`** — inverse of Ctrl+O, strip logs back to prompt → answer | For when tool-call noise overwhelms | new |
| 7 | **`Ctrl+B`** — background a long task and keep talking | Beginners sit and wait; they don't know they needn't | new |
| 8 | **`Option+T`** — toggle thinking for one turn | Cheap counterpart to our "think harder" tip | pairs `prompt-think-harder` |
| 9 | ⚠️ **`Ctrl+S` = expand prompt search across all projects** | Conflicts with #2. Likely wrong | **verify or drop** |

## B. Slash commands hiding in plain sight
*Strong beginner material. Probably one "commands you're not using" tip.*

| # | Tip | Why beginners care | Status |
|---|---|---|---|
| 10 | **`/context`** — see exactly where tokens go | Makes the invisible context window visible | pairs `compact-and-clear` |
| 11 | **`/doctor`** — setup checkup; finds unused skills/MCPs, trims CLAUDE.md | Claimed 4–5k tokens saved/session. Self-service fix for bloat | pairs `project-hygiene` |
| 12 | **`/btw`** — side question without derailing the main thread | They either derail the session or lose context in a new one | new |
| 13 | **`/branch`** — copy the conversation here, go a different way | "What if we tried it the other way" without losing what you had | new |
| 14 | **`/recap`** — one-line recap + suggested next actions | "Where was I?" after a break | new |
| 15 | **`/rename`** — friendly session names instead of GUIDs | Makes `/resume` usable instead of a wall of IDs | pairs `workflow-resume-session` |
| 16 | **`/permissions`** mid-session — change rules without restarting | They restart the whole session to change one permission | pairs `permission-modes` |
| 17 | **`/undo`** — revert the last change | ⭐ The single most reassuring command for a nervous beginner | new — **strong TAKE** |
| 18 | **`/cost`** — track spend; set console limits | Bank colleagues will ask "what does this cost me?" on day one | new — **strong TAKE** |
| 19 | **`/status-line`** — persistent bar showing model + context % | Ambient awareness, no command needed | new |
| 20 | **`/insights`** — HTML report over recent sessions | Curiosity more than need | low priority |
| 21 | **`/effort`** low/default/high/max | We cover "think harder"; this is the real dial | extends `prompt-think-harder` |
| 22 | **`/goal`** — set a checkable finish condition; a cheap model verifies each turn | Stops Claude declaring victory early | new — audience: both |

## C. Session recovery and "I broke it"
*Highest-anxiety area for newcomers. Recommend taking most of these.*

| # | Tip | Why beginners care | Status |
|---|---|---|---|
| 23 | **Rewind beats fixing** — `Esc Esc` back to a good point | The #1 beginner failure: talking Claude out of a hole it dug | pairs `esc-to-stop` |
| 24 | ⚠️ **Rewind does NOT undo shell commands** — bash-deleted files need git | Turns a scare into a disaster. Highest-value gotcha here | new — **strong TAKE** |
| 25 | **Partial compaction** — summarise up to a point, continue | They think `/compact` is one destructive button | pairs `compact-and-clear` |
| 26 | **Resume-from-summary** on big sessions (>1hr / >100k tokens) | Explains why resume sometimes behaves oddly | new |
| 27 | **Hand off as a prompt, not a summary** — point at files, name what failed, say where to start | Reframes "write a summary for tomorrow" into something actionable | pairs `workflow-resume-session` — **strong TAKE** |
| 28 | **History auto-deletes after 30 days.** Raise it in settings.json. Setting `0` wipes everything immediately — it does not mean unlimited | Nasty footgun; a month of sessions is a real loss | ⚠️ two spellings cited — verify |

## D. CLAUDE.md — angles we don't yet cover
*We have three CLAUDE.md tips already. These add genuinely new material.*

| # | Tip | Why beginners care | Status |
|---|---|---|---|
| 29 | **Editing CLAUDE.md mid-session does nothing** — read once at start; clear/restart to apply | Huge trap: they add a rule, it's ignored, they conclude CLAUDE.md is broken | new — **strong TAKE** |
| 30 | **Write for the agent, not the human** — "all SQL lives in `database/`" beats "keep DB code organised sensibly" | The most actionable authoring rule, and it's concrete | partial `claudemd-worked-example` |
| 31 | **Keep it short** — models reliably follow ~150–200 instructions; best files ~300–350 words | We say "keep it clean"; this gives a number | strengthens `project-hygiene` |
| 32 | **Your CLAUDE.md rots** — ~1 in 4 repos with AI rules contain stale references | Nobody re-reads their own rules file | new |
| 33 | **HTML comments are free** — `<!-- … -->` costs zero tokens | Notes for teammates you don't pay for | new — small and delightful |
| 34 | **Path-scoped rules** — scope a rule to `src/api/**` so it loads only there | Keeps a big file cheap | new — audience: both |
| 35 | **The one-line concision fix** — add to CLAUDE.md: *"When reporting information to me, be extremely concise and sacrifice grammar for the sake of concision."* | ⭐ One line, instantly less wall-of-text. Verbatim and copyable | new — **strong TAKE** |
| 36 | **The "Karpathy file" three rules** — think first / minimum code / surgical edits | A ready-made starter CLAUDE.md shape for a newcomer | overlaps `claudemd-worked-example` — could extend it |
| 37 | **The deletion test** — "if removing this paragraph doesn't change behaviour, it's burning tokens" | Gives them a mechanical way to prune | new |

## E. Prompting rules
*Note #38–44 appear twice on the site — once attributed to Anthropic directly, once as a community write-up. The two versions mostly agree.*

| # | Tip | Why beginners care | Status |
|---|---|---|---|
| 38 | **Drop the persona** — "You are a senior engineer…" measurably adds nothing (2,500-prompt test; Anthropic cut their own system prompt ~80%) | They copy persona prompts off LinkedIn | pairs `prompt-bad-vs-good-openers` — **strong TAKE** |
| 39 | **Say what you want, not what you don't** — "write flowing paragraphs" beats "do NOT use markdown" | Simple, memorable, universal | new |
| 40 | **Define "done"** — Claude expands scope unless bounded ("under 300 words, top 3 in a table") | They get 4 pages when they wanted 4 bullets | partial `prompt-pin-constraints` |
| 41 | **Give the reason, not just the request** — *"I'm working on [X] for [who]. They need [outcome]. With that in mind, [request]."* | A literal fill-in template | overlaps `prompt-describe-business-value` — **merge** |
| 42 | **Drop CRITICAL / ALWAYS / NEVER and CAPS** — they over-trigger | Counterintuitive; everyone shouts at Claude at first | new — **strong TAKE** |
| 43 | **Stop asking it to "walk me through your reasoning"** — it already thinks | Contradicts folk advice | ⚠️ tension with `prompt-think-harder` — decide |
| 44 | **Set an action boundary** — "report findings and stop" vs "operate autonomously" | Stops Claude changing things during a question | new — **strong TAKE** |
| 45 | **"Be brutally honest"** — Claude defaults to agreeing with you ("yes-man mode") | ⭐ Beginners don't know they're being flattered. Critical for judgment | new — **strong TAKE** |
| 46 | **"Give me a quick answer"** — skip deep reasoning for one turn | Inverse of "think harder"; the pair teaches the dial | pairs `prompt-think-harder` |
| 47 | **Structure with XML tags** — `<role>`, `<guidelines>`, `<policy>` sections | *"If you can't tell guidelines from policy, the model can't either"* | advanced — audience: both |
| 48 | **Present both sides of a trade-off** — "escalation costs €8, but an error costs refund + trust" | One-sided instructions produce one-sided behaviour | advanced |

## F. Working habits — research-backed
| # | Tip | Why beginners care | Status |
|---|---|---|---|
| 49 | **Never let the writer approve the work** — review in a *fresh* session | The agent that wrote it is biased and validates itself | strengthens `always-review-changes` — **strong TAKE** |
| 50 | **You can over-revise** — in 85% of runs an *earlier* iteration beat the final one | They iterate forever. "Stop and go back" is permission they need | new — **strong TAKE** |
| 51 | **Don't escalate mid-task** — a bigger model inherits the same wrong assumptions; hand off and restart | Everyone's instinct when stuck is "try Opus" | pairs 27 |
| 52 | **Don't switch models mid-conversation** — each has its own cache; you re-pay | Pure cost gotcha | new |
| 53 | **Verification ladder** — (1) ask in-prompt (2) `/goal` (3) stop hooks (4) adversarial reviewer | Gives `make-claude-prove-it` four concrete rungs | extends it — **strong TAKE** |
| 54 | ⚠️ **`/compact` may not be worth it** — only ~10% of specifics survive | **Contradicts our `compact-and-clear.md`.** Your call | **conflict — decide** |
| 55 | **Subagents cost ~7× more than expected** | Our subagents tip doesn't mention cost | extends `workflow-subagents` |
| 56 | **Subagents don't read your CLAUDE.md** | Explains "why did it ignore my rules?" | extends `workflow-subagents` |
| 57 | **Require proof artifacts** — screenshots/recordings of it working, verified outside the system that produced them | From the CEO-focused piece. Fits our non-engineer readers exactly | extends `make-claude-prove-it` |
| 58 | **The alt-tab test** — log every app you switch to for one day; each switch is a missing integration | ⭐ Concrete exercise a business colleague can do with no code | new — **strong TAKE** |

## G. Settings worth changing on day one
*From "12 Hidden Settings". Would make a strong single tip.*

| # | Tip | Why beginners care | Status |
|---|---|---|---|
| 59 | **Notification sound / terminal bell** — know when Claude needs you | They babysit the terminal for 20 minutes | new — **strong TAKE** |
| 60 | **Mobile push when Claude needs approval** | Same problem, away from the desk | verify setting name |
| 61 | **`/fewer-permission-prompts`** — auto-builds an allowlist from your own recent transcripts | Kills permission fatigue *without* `--dangerously-skip-permissions` | new — **strong TAKE**, ties to our existing tip |
| 62 | **Deny rules** — block `.env` reads, `git push *`. Deny always wins | ⭐ Compliance-shaped. Safe default for bank colleagues | new — **strong TAKE** |
| 63 | **Concise output style** — `/config` → output style → concise | Drops commentary, keeps errors/warnings | new — **strong TAKE** |
| 64 | **Model per task** — Opus to plan, Sonnet to execute | Claimed ~half the usage, no quality loss | overlaps our global model-selection rules |
| 65 | **Privacy / telemetry env vars** (4 flags) | Relevant to a bank. Worth naming even if we don't recommend it | verify — audience: both |
| 66 | **Auto-compact override** — compact earlier; "context rot starts at 70–80%" | Explains quality decay they'd otherwise blame on the model | verify |
| 67 | **Remove AI attribution from commits** | Some teams need this; ours may not | low priority |

## H. Feature news to fold into existing tips
| # | Item | Suggested home |
|---|---|---|
| 68 | **Auto mode is now default** on paid plans; a classifier vets actions first | `permission-modes.md` may now describe stale defaults — **verify before editing** |
| 69 | **Built-in sandboxed browser** — reads real docs instead of guessing API syntax | new short tip, or fold in |
| 70 | **`/code-review` with effort levels** (low → ultra) | `always-review-changes.md` |
| 71 | **`show clear context on plan accept`** — drops exploration tokens once a plan is accepted | `workflow-plan-first.md` |
| 72 | **Annotate a screenshot** instead of describing a visual change | extends `prompt-show-dont-describe` — **strong TAKE** |
| 73 | **Paste images directly** for "make it look like this" | same tip as 72 |
| 74 | **`/loop` and `/routines`** — scheduled and recurring tasks | new tip, audience both |
| 75 | **Cross-session messaging + `/list agents`** (macOS/Linux only) | advanced — defer |
| 76 | **Claude Code Workflows** (JS orchestration, up to 1,000 agents) | ❌ **explicitly skip** — source itself warns it "will probably nuke your entire budget" |

---

# PART 2 — SKILLS CATALOG CANDIDATES

Our Skills pillar has 6 entries, all from our own `556LowCodeNoCode/Skills` marketplace. Everything below is **external and public**.

> **Gating question:** does the Skills pillar catalog external skills at all? If it's our marketplace only, all of Part 2 is SKIP regardless of merit.

## The four source repos worth knowing

| # | Repo | What it is | Beginner fit |
|---|---|---|---|
| 77 | **`anthropics/skills`** — 18 official skills (Word, PDF, PowerPoint, Excel, skill-creator, web artifacts, brand guidelines, internal comms…). 13 Apache-2.0, 4 source-available | ✅✅ **Start here.** Official, document-centric, and the Office-file skills map directly onto bank colleagues' actual work |
| 78 | **`mattpocock/skills`** — the `/grill-me` `/write-a-prd` `/vertical-slice` `/tdd` `/improve` `/handoff` `/teach` `/prototype` family, installed via `skills.sh` | ✅ high — several are beginner-perfect (see below) |
| 79 | **`addyosmani/agent-skills`** — 23 markdown skills, zero dependencies, by a Google Director / O'Reilly author | ✅ high credibility, medium difficulty |
| 80 | **`google/skills`** — 124 skills, Apache-2.0. Attach the file, say what you want, send. No terminal needed | ✅✅ **no-code path** — strongest fit for non-developer colleagues |

## Individual skills

| # | Skill | What it does | Beginner fit |
|---|---|---|---|
| 81 | **`/teach`** (Pocock) | Turns Claude into a persistent tutor — interactive HTML lessons, glossaries, progress across sessions | ✅✅ **top pick.** Learning-shaped, and it matches our `level-up-to-interactive` tip exactly |
| 82 | **`/handoff`** (Pocock) | Compresses the relevant context slice to a markdown file for a fresh session. Plain markdown, so it works across tools | ✅✅ **top pick** — the executable form of tip #27 |
| 83 | **`/grill-me`** (Pocock) | Asks 16–50 probing questions before any code gets written | ✅ high — forces the thinking beginners skip. ⚠️ one article argues against it for coding |
| 84 | **`/prototype`** (Pocock) | Throwaway code answering a design question; generates options A/B/C to react to | ✅ high — "prototypes are now cheaper than specs" |
| 85 | **Global Agent Guardrails** (`davidondrej`) | Pre-tool-call hooks that *block* `rm -rf`, git-history wipes, fork bombs, piping from untrusted sources | ✅✅ **top pick** — safety net + compliance angle |
| 86 | **Decisions** (`davidondrej`) | Forces Claude to surface the key decisions and trade-offs it made | ✅ high — auditability; mirrors how we use DECISIONS.md |
| 87 | **Doubt-Driven Development** (`addyosmani`) | A second agent attacks the first's claim without seeing its reasoning | ✅ medium — the rigorous version of tip #49 |
| 88 | **Source-Driven Development** (`addyosmani`) | Bans blogs/training data as sources; demands official-doc citations; `[UNVERIFIED]` blocks | ✅ high — **anti-hallucination, strong compliance fit** |
| 89 | **Diagram design** (`cathrynlavery/diagram-design`, MIT) | 27 diagram types as standalone HTML+SVG — flowcharts, swim lanes, org charts, Gantt | ✅✅ **top pick** — business colleagues want diagrams, not code |
| 90 | **`/write-a-prd`** (Pocock) | Scans the codebase, asks follow-ups, emits goals / non-goals / acceptance criteria | ✅ medium-high — familiar artifact for business analysts |
| 91 | **Stop Slop** | Scores a draft, strips "AI tells", revises below 35/50 | ✅ high — relevant to anyone writing customer-facing text |
| 92 | **Simple English** | Rewrites output terse and skimmable | ⚠️ mostly redundant with #35 and #63 |
| 93 | **Focus-group** | Clones real customers from sales-call transcripts into agents that react to your idea | ⚠️ needs sales-call data; gated behind an email capture |
| 94 | **Caveman** | Aggressive token reduction, joke-shaped | ⚠️ novelty — questionable for bank work |
| 95 | **`/vertical-slice`, `/tdd`, `/improve`** (Pocock) | Slice work → test-first → refactor | ❌ developer-only |
| 96 | **Git Worktree** (`davidondrej`) | Isolated repo copies for parallel agents | ❌ advanced — "once you have more than five agents" |

**Explicitly not recommending:** ECC (68 agents / 286 skills — the opposite of beginner, though its line *"Optimize the context window. Persist everything else"* is quotable) · Research Agent & Web Search (depend on third-party `deepapi.co`) · VPS Management (sponsored) · Anti-sleep · function hooks (`CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`, experimental) · SkillOpt/GEPA/EvoSkill (research, nothing copyable) · Wayfinder (needs Jira/Linear discipline) · memory plugins MemArch/GBrain/Hermes (third-party, unvetted).

## If we ever write our own skills

| # | Guidance | Source |
|---|---|---|
| 97 | **Description field is the whole game** — one-line summary + triggers + **anti-triggers** | 37 Cheat Codes |
| 98 | **Three-layer structure** — metadata ~100 words always loaded; body <500 lines on trigger; unlimited bundled scripts. Official template is 6 lines | `anthropics/skills` |
| 99 | **Decide user-invoked vs model-invoked explicitly** | Pocock |
| 100 | **Less is more** — one team deleted 10,000 lines of generated skills for 553 hand-written gotchas; accuracy went **77% → 97%** | Nick Nisi / WorkOS |

---

# PART 3 — BONUS: a gift for the Glossary pillar

| # | Item | Why |
|---|---|---|
| 101 | **["All 35 Claude Code Concepts Explained for Non Coders"](https://the-agent-daily.org/agentnews-experimental/deep-dives/all-35-claude-code-concepts-explained-for-non-coders-chase-ai)** — a ready-made beginner glossary: terminal, `cd`/`ls`/`pwd`, project, context window, plan mode, permissions, MCP, subagents, worktrees, deployment, CLI tools, skills… | We have 47 terms. This is the single best-matched piece on the whole site for our audience and tone. **I'd take this before anything else if you want breadth fast.** Worth its own review pass |

---

# PART 4 — ORG-LEVEL (not hub content)

| # | Idea | Why it's here |
|---|---|---|
| 102 | **Tencent TeamAI** (`npm i -g teamai-cli`) — shared git repo of agent config, auto-pulled via a SessionStart hook so "the model cannot forget to sync" | Structurally *what NbgAiHub is trying to be* for the bank. Worth 10 minutes and possibly a DECISIONS entry |
| 103 | **`claude-session-management`** — SessionEnd hook + JSON log + `resume-claude` shell function + `/session-handoff` | Too advanced to publish, but the pattern feeds tips #27 and skill #82 |

---

## My shortlist

**Ten tips:** 17, 24, 29, 35, 38, 42, 45, 49, 61, 62
*(`/undo`, rewind-doesn't-undo-bash, CLAUDE.md-needs-a-restart, the concision one-liner, drop the persona, drop the CAPS, be-brutally-honest, fresh-session review, `/fewer-permission-prompts`, deny rules.)*

**Five skills:** 77 (Anthropic official), 81 (`/teach`), 85 (Guardrails), 88 (Source-Driven), 89 (diagrams).

**One freebie:** 101 — the 35-concepts glossary piece.

Every one of those is beginner-squarely, not already covered, and fixes something a colleague hits in week one.

## Open decisions for you

1. **#54 vs `compact-and-clear.md`** — the source says `/compact` loses ~90% of specifics and you should hand off + restart. Soften our tip, contradict the source, or present both?
2. **#43 vs `prompt-think-harder.md`** — "stop asking for reasoning" vs our "think harder". Not strictly contradictory, but a beginner won't see the difference. Needs one clear line.
3. **Does the Skills pillar catalog external skills?** Gates all of Part 2 (77–96).
4. **#68 auto-mode-is-default** — if true, `permission-modes.md` and `dangerously-skip-permissions.md` describe stale defaults and need updating regardless of what else we take.
5. **Verification pass** — shall I test every keybinding, command and setting against the installed Claude Code before writing anything? Strongly recommend yes.
6. **Do you want #101 (the 35 concepts) scoped as a separate glossary review?** It's a different pillar and a different-sized job.
