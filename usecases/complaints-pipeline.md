---
type: usecase
title: "Chain it together: complaints in, Monday briefing pack out"
audience: beginner
topics: [contact-center, automation, capstone]
internal: false
authored: "2026-06-11"
last_reviewed: "2026-06-11"
external_link: null
deeper_link: null
ai_summary: The capstone. You've done the heatmap, you've done the reply drafts — now chain them. One CLAUDE.md describes the whole Monday workflow, and from then on a single line ("do the Monday pack") turns a fresh complaints CSV into a themed report, reply drafts for the worst theme, an interactive dashboard, and a ready-to-send summary email. This is where Claude Code stops being a tool and becomes a workflow.
business_unit: contact-center
time_estimate: "~45 min"
difficulty: intermediate
order: 15
outcome: A reusable pipeline folder — drop in a complaints CSV, type one line, get four artifacts — heatmap report, reply drafts, interactive dashboard, summary email — all consistent with each other, every Monday.
inputs:
  - The complaint-heatmap use case done once (you'll reuse its ideas, not its files)
  - Ideally the empathic-reply use case too — the pipeline includes its drafting step
  - Claude Code installed and a terminal open (see Day 1)
---

Every use case in this hub is one task: file in, file out. This one is different — it's about *composition*. The insight: a `CLAUDE.md` isn't just remembered preferences, it's a **program you wrote in plain English**. Describe a multi-step workflow in it once, and a one-line prompt runs the whole thing.

If you've done [the complaint heatmap](/use-cases/complaint-heatmap/) and [the reply drafts](/use-cases/empathic-reply/), you've built both halves. Today you wire them together, add the dashboard and a summary email, and compress your Monday to one line.

> **Compliance check before you start.** Same posture as the heatmap use case: this walkthrough runs on a synthetic CSV that Claude invents. With real complaint exports, clear the data source with your line manager first; the pipeline itself doesn't change. The reply drafts the pipeline produces are *drafts* — a human reads and sends them, always.

---

## Step 1 — Build the workspace

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
mkdir -p ~/Desktop/claude-lab/complaints-pipeline
cd ~/Desktop/claude-lab/complaints-pipeline
claude --dangerously-skip-permissions
```

- `mkdir -p ~/Desktop/claude-lab/complaints-pipeline` — make a folder inside `claude-lab` on your Desktop (`-p` creates `claude-lab` too if it's not there yet — it's the one home for all hub use cases).
- `cd ~/Desktop/claude-lab/complaints-pipeline` — move into it.
- `claude --dangerously-skip-permissions` — start Claude Code here. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.)

---

## Step 2 — Write the pipeline as a `CLAUDE.md` — *before* any data exists

This is the step that makes this use case the capstone. In every other walkthrough, `CLAUDE.md` came last, as a way to remember what you'd already done. Here it comes **first**: you're writing the program before you run it.

Tell Claude:

> Create a `CLAUDE.md` in this folder describing my Monday complaints pipeline. When I say **"do the Monday pack"**, you will, in this order:
>
> 1. Read `complaints.csv` (columns: `date,channel,text`) — the freshest export in the folder.
> 2. Write `heatmap-report.md` — a one-pager: headline count ("X complaints across Y themes this week"), 5–7 themes sorted by count, one **verbatim** quote per theme, one resolution sentence per theme.
> 3. Write `replies-top-theme.md` — for the single biggest theme, three reply drafts (warm / formal / accountable), each under 150 words, no corporate filler phrases, only facts present in the complaints themselves, with placeholders `[CUSTOMER NAME]` and `[AGENT NAME]`.
> 4. Build `dashboard.html` — a single self-contained interactive page: stat cards, a theme-by-day heatmap grid (weekday labels computed from the dates), click any cell to see the verbatim complaints behind it. No server, no internet, no external libraries. Accent colour `#007a8a`.
> 5. Write `weekly-email.md` — a short email to the contact-centre lead: the headline, the top three themes with counts, one recommended action, and a line noting the dashboard file is attached.
> 6. **Verify the pack before declaring it done**: every quote in every artifact grep-matches the `text` column of `complaints.csv`; the theme counts are identical across report, dashboard, and email; the per-theme counts sum to the CSV row count. Show me the verification output. If a check fails, fix and re-verify — don't hand me an inconsistent pack.
>
> Stable rules: never invent complaints or counts; quotes are exact strings; if the CSV has fewer than 10 rows, say so and stop instead of inventing a trend.

Read what Claude wrote back. That file *is* the pipeline — six numbered behaviours, including the self-check. Notice step 6: the verification habit you learned in the other use cases is now baked into the program itself, so you can't forget to run it.

---

## Step 3 — Drop in a week of complaints

Practise on synthetic data first:

> Create `complaints.csv`: 40 realistic synthetic complaints for a Greek retail-bank contact centre, columns `date,channel,text`, dates spanning Monday 2026-06-01 to Sunday 2026-06-07, channels phone / email / chat. Cluster around recurring themes (duplicate card charges, app login failures, ATM errors, branch waits, transfer delays), uneven distribution, no real names or IBANs, commas inside text quoted properly.

Next Monday, this step becomes: download the real export, rename it `complaints.csv`, drop it in this folder. Nothing else changes.

---

## Step 4 — Say the magic words

Type exactly this:

> do the Monday pack

Then watch. Claude reads `CLAUDE.md`, walks the six steps in order, runs its own verification, and shows you the grep output proving the quotes are real. Two to four minutes, four files.

This is the moment the mental model shifts. You didn't paste a six-paragraph prompt — the six paragraphs live in a file, version-controlled by you, and the prompt was four words.

---

## Step 5 — Inspect the pack like a sceptic

The pipeline self-verifies the mechanical things; you check the judgment things, once per pipeline change:

- Open `dashboard.html` — do the themes match `heatmap-report.md`? Click two cells; are the complaints behind them really about that theme?
- Read `replies-top-theme.md` — would you actually send the warm one? If a draft states a "fact" that isn't in any complaint, that's a rule violation: tell Claude, and **also ask it to tighten the rule in `CLAUDE.md`** so the leak can't recur.
- Read `weekly-email.md` aloud — it goes to a human who can fire back questions; the headline number must match the dashboard they'll open.

Anything you correct, correct **in `CLAUDE.md`**, not just in the artifact. Fixing the artifact fixes this Monday; fixing the program fixes every Monday after.

---

## Step 6 — What you've actually built

Run the loop twice more with fresh synthetic CSVs (ask Claude to invent "a bad week dominated by an app outage" and "a quiet week") and watch the pack adapt while the format holds steady. That stability is what makes the team trust it by week three.

Stand back and look at the shape:

- **Input contract** — a CSV with three named columns.
- **Program** — a `CLAUDE.md` in plain English, six steps, self-verifying.
- **Invocation** — four words.
- **Output contract** — four named files, mutually consistent, quotes provably real.

That's a pipeline, by any engineer's definition — and you wrote it in your own language, in an afternoon. Every recurring multi-step task in your team is a candidate for the same shape: month-end packs, weekly KPI summaries, intake triage. Pick the one that eats your Mondays, and write its `CLAUDE.md` first.
