---
type: usecase
title: Get from a CSV to a chart your boss can read, in one prompt
audience: beginner
topics: [data, visualisation, reporting]
internal: false
authored: "2026-06-11"
last_reviewed: "2026-06-11"
external_link: null
deeper_link: null
ai_summary: Every team has a CSV nobody looks at — exports from some system, columns of numbers, no picture. Claude reads it and builds an interactive chart page you double-click open. No Excel wrangling, no BI-team ticket, no licence. The gateway use case — once this clicks, you'll see CSVs differently.
business_unit: data
time_estimate: "~15 min"
difficulty: beginner
order: 14
outcome: A self-contained `chart.html` — an interactive chart of your CSV with toggles for the dimensions that matter, plus a totals strip that proves the numbers match the file.
inputs:
  - Any CSV — or nothing, Claude will invent a realistic one to practise on
  - Claude Code installed and a terminal open (see Day 1)
---

Somewhere in your team's shared drive is a CSV that answers a question someone keeps asking. It stays unanswered because turning the CSV into a picture means Excel pivot tables, or a BI ticket with a three-week queue, or that one colleague who "does dashboards".

This is the shortest use case in the hub, on purpose: one synthetic file, one prompt, one chart. It's the gateway — when this clicks, you stop seeing CSVs as homework and start seeing them as one prompt away from a picture.

> **Compliance check before you start.** This walkthrough uses synthetic data. With real exports, the usual posture applies: aggregate counts and totals are normally fine on your workstation; row-level customer data (names, IBANs, balances) needs your line manager's OK before it lands in any Claude-readable folder. When in doubt, ask Claude to aggregate first and chart the aggregate.

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
mkdir -p ~/Desktop/claude-lab/csv-chart
cd ~/Desktop/claude-lab/csv-chart
claude --dangerously-skip-permissions
```

- `mkdir -p ~/Desktop/claude-lab/csv-chart` — make a folder inside `claude-lab` on your Desktop (`-p` creates `claude-lab` too if it's not there yet — it's the one home for all hub use cases).
- `cd ~/Desktop/claude-lab/csv-chart` — move into it.
- `claude --dangerously-skip-permissions` — start Claude Code here. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.)

---

## Step 2 — Ask Claude to invent a CSV worth charting

Have a real CSV? Drop it in the folder and skip to Step 3. Otherwise, tell Claude:

> Create a file called `data.csv` in this folder: 24 months (2024-07 through 2026-06) of synthetic monthly transaction counts for a Greek retail bank, broken down by region and channel. Columns: `month,region,channel,transactions`. Regions: Attica, Macedonia, Thessaly, Crete. Channels: branch, app, web, atm. One row per month × region × channel combination.
>
> Make the numbers tell a story: app transactions growing steadily and overtaking branch sometime in 2025; branch declining slowly everywhere but holding up better in Crete; a visible December spike in every channel; atm roughly flat. Plausible magnitudes for a retail bank — hundreds of thousands per month per region, not millions.

Claude writes the file. Notice you specified the *story*, not the numbers — that's what makes synthetic data useful for practising: you know what the chart *should* show before you build it.

---

## Step 3 — One prompt, one chart

Paste this:

> Read `data.csv`. Build a single self-contained file `chart.html` that I can open by double-clicking — no server, no internet, no external libraries; draw on a `<canvas>` with plain JavaScript.
>
> - A line chart of monthly transactions over time, one line per channel.
> - Toggle buttons for the regions — clicking "Crete" filters the chart to Crete; clicking "All" brings everything back.
> - Hovering a point shows the exact value in a small tooltip.
> - A totals strip above the chart: total transactions, busiest month, fastest-growing channel — recomputed live for whichever region filter is active.
> - Axis labels a non-data person can read, thousands separators on the numbers. Accent colour `#007a8a`.

Thirty to ninety seconds later, double-click `chart.html` in Finder / File Explorer. Click the region toggles. Hover the December spike. Find the month where the app line crosses the branch line — the story you ordered in Step 2, now visible.

---

## Step 4 — Make Claude prove the chart matches the file

A chart that's 3% wrong is worse than no chart — it looks authoritative. Paste:

> Verify your own chart. Recompute from `data.csv` with commands, independently of the page: the grand total of transactions, the total per channel, and the busiest month — show me the commands and their output. Then confirm the numbers embedded in `chart.html` match those figures exactly. If anything differs, fix the page and re-run the check.

Claude sums the actual file and compares it to what the page displays — arithmetic, not assurances. Same *make-the-model-prove-it* habit as every use case in this hub; it's two minutes, and it's the difference between "nice picture" and a number you'd repeat in a meeting.

---

## Step 5 — Now do it with your real CSV — and make the loop permanent

The synthetic run was calibration. The real run is: drop your actual export into the folder, then —

> Read my file `q2-export.csv` and describe it: columns, row count, date range, anything odd. Then propose the two most useful charts for it and ask me which one to build.

Letting Claude *propose* the chart matters with real data — it has read the columns, and it often spots the dimension worth splitting by that you'd have flattened.

Then lock the loop in with `CLAUDE.md` — the magic filename Claude Code reads automatically every time it starts in this folder:

> Create a `CLAUDE.md` in this folder. Put in it my charting rules: output is always a single self-contained HTML file, canvas + plain JavaScript, no external libraries; always include interactive filters for any column with 2–8 distinct values; always include a totals strip recomputed for the active filter; always verify the page's numbers against the CSV with commands before telling me it's done; accent colour #007a8a; axis labels readable by a non-data person, thousands separators on numbers.

Next CSV — any CSV, any month: drop it in, `claude --dangerously-skip-permissions`, and say *"chart this"*. That's the whole workflow. The BI queue is for the dashboards that need to live forever; this folder is for the question someone asked at standup.
