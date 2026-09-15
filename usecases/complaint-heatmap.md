---
type: usecase
title: Turn a stack of customer complaints into a one-page heatmap
audience: beginner
topics: [analysis, contact-center, reporting]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-06-11"
external_link: null
deeper_link: null
ai_summary: You ask Claude to invent a realistic complaints CSV (so the use case works without any system access), then a few minutes later you have a one-page markdown report showing the top five themes, how often each appears, and one verbatim quote per theme. Repeatable every Monday on real data once you have it.
business_unit: contact-center
time_estimate: "~25 min"
difficulty: beginner
order: 1
outcome: A one-page markdown report — top 5 complaint themes, counts, and one verbatim quote per theme — ready to paste into Teams or email.
inputs:
  - Nothing — Claude will create a realistic synthetic complaints CSV for you. (Once you trust the loop you can swap in a real export from your contact-centre system.)
  - Claude Code installed and a terminal open (see Day 1)
---

The contact centre collects thousands of complaints a month. Nobody reads them all. The leadership briefing wants "top themes this week" and the team lead spends two hours skim-reading rows in Excel.

This use case is the two-hour version compressed to twenty-five minutes — and it gets faster every time you run it because the prompt becomes a template you reuse.

> **Compliance check before you start.** This walkthrough never touches real customer data — you'll have Claude invent a synthetic CSV. Once you trust the loop you can talk to your line manager about which real data sources are cleared and swap in a real export. The prompt that does the work stays identical.

---

## Step 1 — Build your workspace on the Desktop

You're going to make a folder on your Desktop and start Claude Code there. Three commands.

**Open the Terminal app.**

<div data-os="mac">

Press ⌘+Space, type "Terminal", and press Enter. (Or open Finder → Applications → Utilities → Terminal.)

</div>

<div data-os="windows">

Open the Start menu (press the Windows key), type "Ubuntu", and press Enter. If you don't see Ubuntu listed, [install WSL first](/start-here/day-1/#d1) — it's a 10-minute one-time setup.

In Ubuntu, `~/Desktop` is a folder inside WSL's Linux home (`/home/<your-Linux-username>/Desktop`) — **not** the Windows desktop you see in File Explorer at `C:\Users\...\Desktop`. That's fine: the files are real and Claude can read and write them. Anywhere this use case says "open in Finder / File Explorer", run `explorer.exe .` from your Ubuntu terminal — Windows opens that exact WSL folder in Explorer.


</div>

You'll see a prompt — the blinking cursor is waiting for you. Type each line below and press Enter after each one.

```
mkdir -p ~/Desktop/claude-lab/complaint-heatmap
cd ~/Desktop/claude-lab/complaint-heatmap
claude --dangerously-skip-permissions
```

Plain-English translation:

- `mkdir -p ~/Desktop/claude-lab/complaint-heatmap` — **m**a**k**e a new **dir**ectory (folder) called `complaint-heatmap` inside a parent folder called `claude-lab` on your Desktop. The `-p` flag creates `claude-lab` too if it doesn't exist yet. Every use case in this hub lives under `claude-lab/` — one tidy home instead of a Desktop scattered with experiment folders.
- `cd ~/Desktop/claude-lab/complaint-heatmap` — **c**hange **d**irectory: move the terminal *into* that folder, so any command you type next runs there.
- `claude --dangerously-skip-permissions` — start Claude Code in this folder. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one where there's nothing it can damage. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.)

The blinking cursor is now Claude's. You're chatting with it.

---

## Step 2 — Ask Claude to invent a realistic complaints CSV

You don't have a real export, and you don't need one. Tell Claude:

> Create a file called `complaints.csv` in this folder. Generate 40 realistic synthetic complaints a Greek retail-bank contact centre might receive in a week. Columns: `date,channel,text`.
>
> - Dates between `2026-05-18` and `2026-05-24` (that's a Monday-to-Sunday week).
> - `channel` is one of `phone`, `email`, `chat`.
> - The `text` column should be the customer's verbatim message — anywhere from 8 to 60 words. Mix tone: some calm, some annoyed, some confused.
> - Cluster the complaints around realistic recurring themes: duplicate card charges, mobile app login failures, ATM cash-out errors, mortgage statement queries, branch wait times, SMS-OTP delays. Make some themes more common than others (life is uneven). Don't make every row a different theme — that's not what real complaint data looks like.
> - **No** real names, IBANs, or phone numbers. Use placeholders like "the customer", "my card", "the app".
> - Quote-escape any commas inside the `text` field with double quotes so the CSV parses cleanly.

Claude writes the file straight away (because of the `--dangerously-skip-permissions` flag from Step 1). You'll see `complaints.csv` appear in the folder on your Desktop.

This is the part that surprises people: Claude can generate *input* data, not just process it. Once you trust the loop on this synthetic file you can replace it with a real export — the rest of the use case doesn't change.

---

## Step 3 — Ask Claude for the heatmap

Paste this prompt verbatim the first time. Tweak it next week once you know what your team actually wants to see.

> Read `complaints.csv`. The `text` column holds the verbatim complaint.
>
> Cluster the complaints into 5–7 themes by what the customer is unhappy about (not by product line). For each theme give me:
>
> 1. A short label (2–4 words)
> 2. The count and percentage of complaints in that theme
> 3. One verbatim quote that's most representative
> 4. One sentence on what would resolve most of them
>
> Output a markdown file `heatmap-report.md` formatted as a one-pager I can paste into Teams. Lead with the headline number: "X complaints across Y themes this week." Order themes by count, highest first.

Press Enter. Claude reads the file, does the clustering, and writes `heatmap-report.md` straight into the folder — no permission prompt, because of the flag from Step 1. (If you started with plain `claude` instead, it asks "Create `heatmap-report.md`?" first — say yes.) It takes 30–90 seconds.

---

## Step 4 — Review what you got back

Open `heatmap-report.md` from Finder / File Explorer (it's sitting in the same folder on your Desktop) or just ask Claude:

> Open `heatmap-report.md` and show me what you wrote.

Three things to check:

1. **Do the themes make sense?** If "Card declined at till" is split across three different themes, the clustering is too granular — tell Claude *"merge themes that share the same root cause"* and let it rewrite the file.
2. **Are the counts plausible?** If one theme has 80% of the volume and the rest are tiny, the prompt may have under-clustered — ask Claude to break the dominant theme into sub-themes.
3. **Are the verbatim quotes actually verbatim?** Cross-check one or two against the CSV. If Claude is paraphrasing, tell it *"quotes must be exact strings copied from the `text` column"* and rerun.

This review *is* the work. Five minutes here saves you from sending a wrong-looking briefing.

### Don't check it by hand — make Claude prove it

Checks 2 and 3 above are mechanical, and mechanical checking is exactly what you should delegate. Paste:

> Verify your own report. (1) Every quote in `heatmap-report.md` must appear as an **exact substring** of the `text` column in `complaints.csv` — check each one with `grep` and show me the output. (2) The per-theme counts must sum to the CSV's row count. (3) Recompute every percentage. If any check fails, fix the report and re-run all three checks.

Claude runs real commands against the real files — `grep` either finds the quote or it doesn't; there's no "looks fine to me" in the loop. This habit — **make the model prove its own output with commands, not assurances** — is the single most useful verification trick in this hub. It works on every use case here, and it's what turns "I think the AI got it right" into "here's the command output that shows it did."

---

## Step 5 — Make the rules stick with `CLAUDE.md`

`CLAUDE.md` is the most useful file in Claude Code. Whenever you start `claude` inside a folder that contains a file called `CLAUDE.md`, Claude reads it automatically — no need to mention it in your prompt. It's where the *stable rules* of your workflow live, so next week's run is a one-liner instead of a re-typed brief.

Tell Claude:

> Create a file called `CLAUDE.md` in this folder. Put in it the stable rules for the heatmap workflow, in your own words, so that next week when I start Claude here it already knows:
>
> - The input file will be called `complaints.csv` with `date,channel,text` columns
> - I want a markdown one-pager with: a headline count, 5–7 themes sorted by count, one verbatim quote per theme, and a one-sentence fix per theme
> - Quotes must be **exact strings** copied from the `text` column — no paraphrasing
> - Output goes to `heatmap-report.md`
>
> Also add a one-line note at the top reminding me this is the Monday-heatmap template.

Claude writes the file. Next Monday's workflow shrinks to:

1. Drop a fresh `complaints.csv` into a new folder under `claude-lab/`.
2. `cp ~/Desktop/claude-lab/complaint-heatmap/CLAUDE.md ~/Desktop/claude-lab/heatmap-2026-06-04/` — the rules travel with you.
3. `cd` into the new folder and run `claude --dangerously-skip-permissions`.
4. Type one line: *"do the heatmap"*. Claude knows the rest because it already read `CLAUDE.md`.

You've turned a recurring two-hour task into a five-minute one, and the rules now live in a file you can edit instead of a prompt you have to re-type.

### Bonus — `~/.claude/CLAUDE.md` for rules that apply *everywhere*

The same trick works at the global level. Anything you want Claude to remember across **every** project on your machine — your team's tone, mandatory redaction rules, your preferred output format — goes in `~/.claude/CLAUDE.md`. Claude reads that file at the start of every session, anywhere on your laptop.

A short, sane starting `~/.claude/CLAUDE.md` for a banking colleague might be:

> - I work at NBG (retail bank, Greece). Default to UK English and a plainspoken tone — no marketing voice.
> - For any file containing customer data, treat IBANs, account numbers, and personal names as **already redacted** unless I explicitly say otherwise.
> - When you're unsure about a regulatory interpretation, write "needs legal interpretation" instead of guessing.

Two minutes of work, useful in every future session. Don't bloat it — one or two lines per rule is plenty.

---

## Step 6 — Level up — turn the report into an interactive heatmap

The markdown one-pager is Level 1. Here's the jump that makes Monday's meeting sit up: the same data as a clickable dashboard, built by one paragraph of prompt.

> Read `complaints.csv` and build a single self-contained file called `dashboard.html` that I can open by double-clicking — no server, no internet connection, no external libraries. It should show:
>
> - Stat cards across the top: total complaints, number of themes, number of channels, busiest theme.
> - A heatmap grid — themes as rows, days as columns, the count in each cell, darker background = more complaints. Compute the weekday labels from the actual dates; don't assume the range starts on a Monday.
> - Click any cell to list the verbatim complaints behind it underneath the grid, with date and channel.
>
> Use the same theme clustering as `heatmap-report.md`, and the accent colour `#007a8a`.

Claude writes one HTML file. Double-click it in Finder / File Explorer — it opens in your browser, works offline, and you can attach it to an email or drop it in Teams like any other file.

If something looks wrong, describe what you see ("the column labels overlap on my laptop") and let Claude fix it — or go one better and ask: *"take a screenshot of the page yourself and check the layout"*. Claude can drive a headless browser, look at the result, and iterate without you in the loop.

**The pattern to remember** — any output Claude can produce as text, it can also produce as a small interactive page. The upgrade prompt is always the same shape: *"turn this into a single self-contained interactive HTML file I can open by double-clicking."* That sentence works on every use case in this hub.
