---
type: usecase
title: Capture how a colleague does a manual process so you can hand it off
audience: beginner
topics: [process-improvement, documentation, knowledge-sharing]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-06-11"
external_link: null
deeper_link: null
ai_summary: Someone on the team is the only person who knows how the month-end reconciliation actually works. They're going on holiday. Interview them on Teams (recorded transcript), then ask Claude to turn that transcript into a step-by-step runbook anyone on the team could follow.
business_unit: process-improvement
time_estimate: "~30 min"
difficulty: beginner
order: 12
outcome: A markdown runbook with numbered steps, named tools at each step, decision points called out explicitly, and a "common errors" section — ready to be reviewed by the original colleague and put in the team SharePoint.
inputs:
  - Nothing — Claude will invent a realistic 30-minute interview transcript for you to practise on. (Once you trust the loop, run a real Teams interview, download the transcript, and substitute it.)
  - Claude Code installed and a terminal open (see Day 1)
---

Every team has a process that lives in one person's head. The month-end reconciliation. The quarterly regulatory return. The customer-segment refresh. The person who runs it isn't hiding it — they've just done it so many times that the steps have fused together, and when you ask *"can you write that down?"* they freeze.

This use case is the workaround: don't ask them to write it down. Ask them to *do* it on a Teams call while they narrate. Claude turns the messy transcript into a runbook a junior could follow.

> **Compliance check before you start.** A process runbook may reference internal systems, account schemas, or operational thresholds. Treat the runbook with the same classification as the underlying process. Avoid pasting actual account numbers or customer IDs into the transcript — when the colleague is demonstrating, ask them to use test data or to mask the screen.

---

## Step 1 — Understand the real-world setup (then we'll simulate it)

In real life this use case starts with a 30–45 minute Teams call where the colleague who owns the process shares their screen, runs the process end-to-end while narrating, and you interrupt only with clarifying questions ("what do you do if it IS zero?", "why this filter and not that one?", "what does 'usually' mean — every time, or sometimes?"). Teams records, and you download the transcript.

For this walkthrough we'll skip the call entirely — Claude will invent a realistic transcript so you can practise the *runbook-from-transcript* loop, which is where the actual leverage is. When you do this for real, the interview is the load-bearing part — don't skip the clarifying questions.

---

## Step 2 — Build the workspace

**Open the Terminal app.**

<div data-os="mac">

Press ⌘+Space, type "Terminal", and press Enter.

</div>

<div data-os="windows">

Open the Start menu (press the Windows key), type "Ubuntu", and press Enter. If you don't see Ubuntu listed, [install WSL first](/start-here/day-1/#d1).

In Ubuntu, `~/Desktop` is a folder inside WSL's Linux home (`/home/<your-Linux-username>/Desktop`) — **not** the Windows desktop you see in File Explorer at `C:\Users\...\Desktop`. That's fine: the files are real and Claude can read and write them. Anywhere this use case says "open in Finder / File Explorer", run `explorer.exe .` from your Ubuntu terminal — Windows opens that exact WSL folder in Explorer.


</div>

Type each line:

```
mkdir -p ~/Desktop/claude-lab/runbook-monthend-recon
cd ~/Desktop/claude-lab/runbook-monthend-recon
claude --dangerously-skip-permissions
```

- `mkdir -p ~/Desktop/claude-lab/runbook-monthend-recon` — make a folder named after the process, inside `claude-lab` on your Desktop (`-p` creates `claude-lab` too if it's not there yet — it's the one home for all hub use cases).
- `cd ~/Desktop/claude-lab/runbook-monthend-recon` — move into it.
- `claude --dangerously-skip-permissions` — start Claude Code. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.)

---

## Step 3 — Ask Claude to invent the interview transcript

Tell Claude:

> Create a file called `transcript.md` in this folder. Generate a realistic Teams-style interview transcript (~100 lines) for a 30-minute call between **A. Petrou** (you, asking questions) and **M. Vassilas** (the colleague who runs the month-end GL reconciliation for the SME lending portfolio).
>
> Format: speaker label on each line (`M. Vassilas: …`). Mix of substance and mess:
>
> - Greeting + screen-share setup ("can you see my screen?", "let me share").
> - M. Vassilas walks through the process step by step: opens SAP-FI tx FB03, runs a specific report, downloads the output, opens the internal "ReconView" Excel macro, pastes the data in, hits Refresh, compares totals against the Power BI dashboard.
> - At least 4 "I usually" or "I tend to" moments — undocumented judgement calls. Examples: "I usually wait until 7am because the overnight job is sometimes late", "I tend to pull a 3-month rolling view to compare", "if the difference is under €1,000 I just note it; if it's bigger I escalate to M. Costa".
> - At least 2 specific error states M. Vassilas mentions ("if you see error E-204 it means the GL post hasn't completed; just wait 10 minutes"; "if ReconView shows zero rows, the macro lost the connection — restart Excel and retry").
> - At least one vague moment where M. Vassilas waves their hand and says something like "and then you just check the thing and it's usually fine" — A. Petrou should ask "what thing?" and M. Vassilas should give a slightly clearer but still incomplete answer.
> - At the end: who gets the output (the regional CFO's office), how (PDF emailed to a shared mailbox), by when (10am the next business day).
> - Realistic filler ("yeah", "um", "let me just"), one tangent about coffee, one moment where the screen freezes.
>
> Don't sanitise — the messiness is the point. The whole exercise is Claude turning a messy transcript into a clean runbook.

Claude writes the file straight away.

That's the trick: Claude can invent the *input* document, not just process it. When you do this for real, the only thing that changes is the contents of `transcript.md`.

---

## Step 4 — Let Claude create the context file

Tell Claude:

> Create a file called `context.md` in this folder. Put these 5 lines inside it:
>
> ```
> Process: Month-end GL reconciliation for the SME lending portfolio
> Run by: M. Vassilas (originally); we want to enable anyone on the SME ops team to run it
> Frequency: Last business day of every month
> Tools used in the demo: SAP-FI, the internal "ReconView" Excel macro, a Power BI dashboard
> Reader level: someone who knows banking ops but has never run THIS process before
> ```

Claude writes the file straight away.

The "reader level" line matters. A runbook written *"as if for a complete beginner"* is patronising and unreadable; one *"as if for a peer"* skips steps. Pick the level honestly.

---

## Step 5 — Ask Claude for the runbook

Send this to Claude:

> Read `transcript.md` and `context.md`.
>
> Produce `runbook.md` with this structure:
>
> **1. One-paragraph overview** — what this process does, why it exists, who needs the output. 4 sentences max.
>
> **2. Prerequisites** — bullets. Systems the reader needs access to, files they need to have ready, any timing constraint (e.g. "must run after the overnight GL post completes, usually by 7am").
>
> **3. Steps** — numbered. Each step:
>
> - The action (single concrete verb)
> - The tool / system / file
> - What "done" looks like for this step (a number, a green tick, an exported file)
> - If the colleague mentioned a decision point ("if X, do Y; if not, do Z"), surface it as a labelled sub-bullet — don't bury it in the action sentence.
>
> **4. Common errors and what they mean** — a table with columns: `What you see | What it means | What to do`. Use only errors the colleague mentioned in the transcript — don't invent any.
>
> **5. What to send and to whom** — at the end. The deliverable, the recipient, the deadline.
>
> Hard rules:
>
> - Skip every *"um", "yeah, so", "let me just"*. The runbook reads like a careful person wrote it, not a transcript.
> - If the colleague said *"I usually"* or *"I tend to"* — those are signals of an undocumented decision. Promote them to explicit decision points: *"Decision: if X then Y, else Z. The original runner notes they choose [Y / Z] most of the time when …"*
> - If the colleague said something incomplete *("you check the thing, then it's fine")*, flag it as `[NEEDS VERIFICATION — author was vague]` rather than guessing.

Press Enter. A 30-minute interview transcript takes 60–120 seconds to process.

### Make Claude prove nothing fell through the cracks

Before the colleague spends their time reviewing, make Claude audit its own coverage. Paste:

> Audit `runbook.md` against `transcript.md`. (1) List every "I usually" / "I tend to" moment in the transcript and show me, side by side, where each one became an explicit decision point in the runbook — quote both. (2) Confirm the errors table contains exactly the errors the transcript mentions — no more, no fewer. (3) List anything in the transcript with operational content that did **not** make it into the runbook, and justify each omission. Fix whatever the audit turns up.

The audit's third list is the safety net: the throwaway remark at minute 27 ("oh, and never run it on the first of the month") is exactly what a summarising pass drops and exactly what the next runner needed to know.

---

## Step 6 — Have the colleague review the runbook

This is the most important step. Send the colleague:

> Here's the first draft runbook from our session — `runbook.md`. Two asks:
>
> 1. Anywhere you see `[NEEDS VERIFICATION]`, fill in what's missing.
> 2. Anywhere the runbook *doesn't* match what you actually do — even if it's a small thing — tell me. Those small things are usually where the next person trips up.

They send back tweaks. Open the file (it's in `~/Desktop/claude-lab/runbook-monthend-recon/`) and ask Claude to apply them:

> The colleague reviewed the runbook. Apply these corrections:
>
> - Step 3: the threshold is 100,000 not 10,000.
> - Step 7: should be SAP-FI tx FB03, not FB02.
> - Add a new step between 9 and 10: "Email the reconciliation summary PDF to the operations mailbox."

Claude edits `runbook.md`. One more pass with the colleague — usually only one — and the runbook is shippable.

*In real life this is where you'd put `runbook.md` on the team SharePoint or wiki so the next person can find it. We're pretending here — the file on your Desktop is the deliverable.* The next time the colleague is on holiday, someone else runs the process from the runbook. The first time that happens, you'll know whether the runbook is actually good. (It will need one more revision after that first real-world use. That's normal.)

The deeper win: you've now done one process. The pattern works for every other single-person-of-failure process in the team. Once the team sees one runbook land, the second one gets easier to schedule.

### Build a runbook-generation `CLAUDE.md` for the next process

The *runbook structure* you used today — Overview → Prerequisites → Steps with done-conditions → Common errors → Deliverable — is the same for every team process. The *transcript* changes. Save the structure as `CLAUDE.md`:

> Create a `CLAUDE.md` in `~/Desktop/claude-lab/runbooks/`. Put in it my stable rules for runbook generation from interview transcripts:
>
> - Five sections: One-paragraph overview, Prerequisites bullets, numbered Steps (each step = action verb + tool + "done when" + decision sub-bullets), Common errors table (`What you see | What it means | What to do`), final "Deliverable / recipient / deadline" block
> - Skip every "um", "yeah", "let me just" — runbook reads like a careful person wrote it
> - "I usually" / "I tend to" in the transcript = undocumented decision point. Promote to an explicit `Decision: if X then Y, else Z`. Note what the original runner chooses most often
> - Anything vague ("you check the thing, then it's fine") gets `[NEEDS VERIFICATION — author was vague]` rather than a guess
> - Errors table uses ONLY errors the transcript mentioned — don't invent

`CLAUDE.md` is the magic filename Claude Code reads automatically when you start `claude` in a folder containing it. Next single-person-of-failure process: new folder, copy `CLAUDE.md` over, drop in the new interview transcript, run `claude --dangerously-skip-permissions`, and say *"produce the runbook"*. The format is already loaded.

---

## Step 7 — Level up — a runbook you run, not read

Optional: the markdown goes on SharePoint for the record; this version is for the person actually executing at 7am on the last business day. One prompt:

> Read `runbook.md`. Build a single self-contained file `runbook.html` that I can open by double-clicking — no server, no internet, no external libraries. "Execution mode": each step is a collapsible card with a checkbox, and the checkbox state **persists** when the page is closed and reopened (browser local storage) — so a half-finished run survives a lunch break. The common-errors table lives in a slide-out panel that's always one click away. The deliverable block sits at the end with a "Mark run complete" button that stamps today's date and clears the checkboxes for next month. `[NEEDS VERIFICATION]` flags render in loud amber so nobody executes an unverified step silently. Accent colour `#007a8a`.

The person covering the process double-clicks the file, works the checkboxes top to bottom, and the runbook itself tracks where they are. The amber flags do the nagging until the original owner fills them in.

**The pattern to remember** — any output Claude can produce as text, it can also produce as a small interactive page. The upgrade prompt is always the same shape: *"turn this into a single self-contained interactive HTML file I can open by double-clicking."* It works on every use case in this hub.
