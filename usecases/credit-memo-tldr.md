---
type: usecase
title: Compress a 15-page SME credit memo into a 3-bullet summary
audience: beginner
topics: [risk, credit, summarisation]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: null
deeper_link: null
ai_summary: A relationship manager hands you a fifteen-page credit memo and the committee meets in an hour. Claude reads it and produces a three-bullet exec summary plus a risk-flag list — the structured starting point your senior credit officer actually wants, not a paraphrase of the whole memo.
business_unit: risk
time_estimate: "~20 min"
difficulty: beginner
order: 7
outcome: A one-page markdown brief — 3-bullet exec summary, top 5 risk flags with severity (HIGH/MED/LOW), and an "open questions for the RM" list.
inputs:
  - Nothing — Claude will invent a realistic 15-page synthetic credit memo for a fictional Greek SME. (Once you trust the loop, you can swap in a real memo your line manager has cleared.)
  - Claude Code installed and a terminal open (see Day 1)
---

Credit committees run on density. The deck wants a one-pager, the memo from the relationship manager is fifteen. Junior risk analysts spend a Tuesday morning condensing it; senior officers re-read the whole thing because they don't trust the condensed version.

This use case is the version where the condensed version is trustworthy because the prompt itself names what "trustworthy" means.

> **Compliance check before you start.** Credit memos contain client-confidential financials, security details, and sometimes director-level information. Confirm the classification with your line manager before putting a real memo into a Claude-readable folder. For your first run, use a sanitised or training-deck memo — same shape, no real client data. The point is to learn the loop; you can graduate to real memos once you trust the output.

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

Then:

```
mkdir ~/Desktop/credit-memo-review
cd ~/Desktop/credit-memo-review
claude --dangerously-skip-permissions
```

- `mkdir ~/Desktop/credit-memo-review` — make a fresh folder on your Desktop.
- `cd ~/Desktop/credit-memo-review` — move into it.
- `claude --dangerously-skip-permissions` — start Claude Code here. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.)

---

## Step 2 — Ask Claude to invent a realistic credit memo

You don't have a real memo to hand and you don't need one. Tell Claude:

> Create a file called `source.md` in this folder. Write a realistic synthetic credit memo for a fictional Greek SME, ~15 pages of markdown (about 4500 words). Use page-break markers like `<!-- page 2 -->` after every ~300 words so we can cite "page X" later.
>
> Borrower: **Aegean Solar A.E.** — a 12-year-old Greek SME installing residential and commercial solar PV systems, based in Thessaloniki, ~85 employees, annual revenue ~€18M.
>
> The ask: €4M, 5-year amortising loan, secured against installation contracts and a second-ranking charge over the warehouse.
>
> Structure with numbered sections:
>
> - §1 Executive summary (RM's view: recommend approve)
> - §2 Borrower profile, history, management team
> - §3 Industry context — Greek solar market, regulatory tailwinds
> - §4 Financial analysis — 3 years of P&L, balance sheet, cash flow, with realistic numbers. Include EBITDA margin trending from 11% (2023) → 9% (2024) → 7% (2025) — a real concern.
> - §5 Customer concentration — single customer "Hellenic Public Properties" is 32% of 2025 revenue.
> - §6 Security — list collateral with realistic LTV math.
> - §7 Covenants — proposed: net debt / EBITDA < 3.0x, minimum DSCR 1.25x, no dividends if covenants breached.
> - §8 Risk factors — RM lists 4 risks but downplays them.
> - §9 Recommendation.
>
> Make sure the memo includes these tensions a senior risk officer would catch: (a) declining EBITDA margin, (b) the customer concentration, (c) covenant headroom under the new loan is tight if 2026 EBITDA doesn't recover, (d) the RM's projections assume 18% revenue growth in 2026 — well above industry consensus of 8–10%, but the memo doesn't justify why.
>
> Tone: confident RM advocacy. Use specific numbers, not ranges. Add a header on page 1 with borrower / amount / RM name / date.

Claude writes the file straight away.

Renaming the file to `source.md` keeps the prompt in Step 4 identical for the next memo. Change one file, reuse the prompt.

---

## Step 3 — Let Claude create the context file

Risk summaries are worthless without judgement about *what kind of risk matters to whom*. Tell Claude:

> Create a file called `context.md` in this folder. Put these 5 lines inside it:
>
> ```
> Reader: senior credit officer at NBG
> Portfolio: Greek SME secured + unsecured lending
> Reader's seniority: knows the sector, doesn't want the memo paraphrased — wants a triage
> Goal: a one-page brief before the credit committee in an hour
> What counts as a "risk flag": concentration > 20% of revenue, customer churn rising, covenant headroom < 15%, refinancing risk inside 18 months, declining gross margin > 200bp YoY, owner-manager succession unclear
> ```

Claude writes the file straight away.

The "what counts as a risk flag" line is the load-bearing one. Without it Claude flags everything ("interest rates may rise") and useful signal drowns. Spend two minutes tailoring this line to what your committee actually argues about.

---

## Step 4 — Ask Claude for the brief

Send this to Claude:

> Read `source.md` and `context.md`.
>
> Produce `brief.md` with these four sections, exactly in this order:
>
> **1. Exec summary** — three bullets. Lead with the headline (size + sector + ask). Bullet two: the single strongest reason to approve. Bullet three: the single strongest reason to push back. Nothing else.
>
> **2. Risk flags** — table with columns: `Flag | Severity (HIGH/MED/LOW) | Evidence (page + quote) | What this means`. Only use the flag categories defined in `context.md` — don't invent new ones. Order by severity, highest first.
>
> **3. Numbers I would double-check** — bullets. Any figure in the memo where the source (audited financials / management accounts / projections) is unclear or the year-over-year delta is suspicious. Cite the page.
>
> **4. Open questions for the RM** — bullets. The things you'd ask the relationship manager before voting. Phrased as actual questions, not statements.
>
> Hard rule: every claim must cite a page or section of `source.md`. If you can't cite it, don't write it.

Press Enter. A 15-page memo takes 60–120 seconds.

---

## Step 5 — Verify three citations before you trust the brief

Ask Claude to show you the brief:

> Show me `brief.md`.

Pick three risk flags or numbers at random. For each one:

1. Ask Claude to show you the cited page: *"Show me the `<!-- page 7 -->` block of source.md"*.
2. Confirm the evidence quote actually appears there.

If any citation doesn't match, tell Claude:

> Risk flag 2's evidence quote doesn't appear on page 7 of `source.md`. Re-extract the verbatim text, or downgrade the severity if you can't substantiate it.

Iterate until all three spot-checks pass. The brief is now a starting point your senior officer can trust enough to argue with.

---

## Step 6 — Add a one-line recommendation and ship

The brief is structured triage, not a recommendation. The recommendation is your call — but Claude can shape it once you've decided.

Tell Claude:

> Based on `brief.md` and `source.md`, draft three one-line recommendations:
>
> 1. Approve, with conditions
> 2. Decline
> 3. Defer pending [specific information]
>
> Each one in the form: "Recommendation: [verdict]. Conditions/reasons: [one sentence]."

Pick the one that matches your read. Paste it at the top of `brief.md`.

*In a real Tuesday morning you'd send `brief.md` to your senior officer — we're pretending here, so the file on your Desktop is the deliverable.*

You've turned a Tuesday morning of condensing into twenty minutes of triage. The senior officer (in your head, for now) reads three bullets, scans the risk flags, asks you the open questions — that's exactly the conversation you wanted.

### Lock the risk-flag rules in `CLAUDE.md`

The most valuable file you produced today is `context.md` — specifically the "what counts as a risk flag" line. That definition shouldn't be re-typed every memo. Rename it:

```
mv context.md CLAUDE.md
```

`CLAUDE.md` is the magic filename Claude Code reads automatically every time you start `claude` in a folder containing it. Next memo:

1. New folder, drop in `source.md`
2. `cp ~/Desktop/credit-memo-review/CLAUDE.md .` — your risk-flag thresholds, reader profile, and brief structure all travel with you
3. `claude --dangerously-skip-permissions` and one line: *"produce the brief from source.md"*

Claude already knows what counts as HIGH/MED/LOW severity from `CLAUDE.md`. The brief lands consistent across memos — which means your senior credit officer learns to trust the format, and you stop arguing about whether something is "really" a flag.
