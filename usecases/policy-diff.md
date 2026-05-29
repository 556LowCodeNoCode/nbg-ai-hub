---
type: usecase
title: Spot what actually changed between two versions of a policy
audience: beginner
topics: [compliance, documents, review]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: null
deeper_link: null
ai_summary: Compliance hands you v3 of a policy and asks "what's different from v2?" Word's track-changes is gone, the diff highlighter shows every comma. Claude reads both, groups the changes by significance, and tells you which two paragraphs you actually need to take to the committee.
business_unit: compliance
time_estimate: "~20 min"
difficulty: beginner
order: 3
outcome: A markdown brief that classifies every change between v1 and v2 as MATERIAL or COSMETIC, with a one-sentence "what this means" line per material change.
inputs:
  - Nothing — Claude will invent two versions of a synthetic internal policy with realistic material + cosmetic changes between them.
  - Claude Code installed and a terminal open (see Day 1)
---

Policy reviews are the part of compliance work that eats afternoons. Track-changes is rarely intact by the time it reaches you, Word's diff view flags every formatting change, and the two-page summary the author was supposed to attach is never attached.

This use case is the version where you don't burn the afternoon.

> **Compliance check before you start.** Policy documents are usually internal-only. Confirm the document classification before you put it in a folder that Claude reads — *Internal* is fine for this private repo / your workstation; *Confidential* needs a conversation with your line manager first. When in doubt, redact section numbers and stakeholder names.

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
mkdir ~/Desktop/policy-review
cd ~/Desktop/policy-review
claude --dangerously-skip-permissions
```

Plain-English translation:

- `mkdir ~/Desktop/policy-review` — make a new folder called `policy-review` on your Desktop.
- `cd ~/Desktop/policy-review` — move into it.
- `claude --dangerously-skip-permissions` — start Claude Code in the folder. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.)

---

## Step 2 — Ask Claude to invent both policy versions

You don't have real policy versions to diff and you don't need them. Tell Claude:

> Create a file `policy-v1.md` in this folder. It's a synthetic internal NBG policy: "Credit Approval Authority Policy", version 1.0, ~2 pages of markdown. Structure:
>
> - §1 Purpose · §2 Scope · §3 Definitions · §4 Approval thresholds (a table with columns: Exposure band | Authority level | Approver) · §5 Exceptions · §6 Review cadence · §7 Effective date.
>
> Realistic content for a Greek retail bank — SME and retail mortgages. Use plausible numbers (thresholds like €50k, €250k, €1M; approver titles like "Branch Manager", "Regional Credit Committee", "Group Credit Committee"). Include a §5 Exceptions section with 2 bullets.
>
> Then create `policy-v2.md` — same policy, version 2.0 — by copying v1 and making these realistic changes:
>
> 1. (MATERIAL) Lower the top tier threshold from €1M to €750k.
> 2. (MATERIAL) Add a new exception in §5 allowing the Regional Committee to approve up to 110% of their normal limit during the last 3 working days of any quarter, with mandatory Group notification within 24 hours.
> 3. (MATERIAL) §6 review cadence changed from "annually" to "annually or earlier upon material regulatory change".
> 4. (COSMETIC) Reorder the §3 Definitions alphabetically.
> 5. (COSMETIC) Fix one obvious typo in §1 ("aproval" → "approval").
> 6. (COSMETIC) Bump the §7 effective date by 6 months.
>
> Add a "Document control" footer at the bottom of each version with version, date, owner.

Claude writes both files straight away. Two files appear in the folder.

The trick you've just learned: Claude can generate the *inputs* to a workflow, not just process them. When you run this on real v1/v2 policy documents next month the prompt below doesn't change — only the filenames do.

---

## Step 3 — Ask for the structured diff

Send this prompt:

> Read `policy-v1.md` and `policy-v2.md`. They are two versions of the same internal policy.
>
> Produce a markdown brief, `policy-diff.md`, structured as follows:
>
> **Section 1 — Material changes** (substantive: new obligations, removed obligations, changed thresholds, changed approval authorities, new exceptions). For each one:
>
> - The exact paragraph reference (e.g. "§4.2.1")
> - The before text (one or two sentences)
> - The after text (one or two sentences)
> - One sentence: "what this means in practice"
>
> **Section 2 — Cosmetic changes** (typos, formatting, reordering of bullets without semantic change). Just a count and a short list.
>
> If there is any change you cannot classify with confidence, put it under Section 1 with "[UNCERTAIN — please verify]" appended.

Press Enter. Claude writes `policy-diff.md` straight away. Long documents take a minute or two.

---

## Step 4 — Cross-check every "material" entry

Open `policy-diff.md` from Finder (it's in your `~/Desktop/policy-review/` folder), or ask Claude:

> Show me what you wrote in `policy-diff.md`.

For each material change, do the two-finger test:

1. Open v1 at the cited paragraph. Confirm Claude's "before" quote matches what's actually there.
2. Open v2 at the same paragraph. Confirm the "after" matches.

If both pass, the change is real. If the quote doesn't match — Claude paraphrased — tell it:

> The "before" quote for §4.2.1 doesn't match `policy-v1.md`. Re-extract the verbatim text from the source.

Repeat for any quote that doesn't pass.

---

## Step 5 — Sanity-check the "what this means" lines, then ship

Claude is good at spotting that a word changed. It is less good at understanding the operational consequence.

> Old: "The risk committee shall approve…"
> New: "The risk committee or its delegate shall approve…"

The "what this means" Claude wrote might be *"Adds delegation flexibility."* The accurate one is *"Materially loosens the approval bar — needs treasury sign-off before it goes live."* You'd know that. Claude wouldn't.

For every material change: read Claude's "what this means", and if you'd phrase it differently, rewrite that one line. The structure stays; the judgment is yours.

*In real life you'd email `policy-diff.md` to the policy author and the committee secretary. (If you prefer PDF, ask Claude: "Save the same brief as `policy-diff.pdf` too." — it can do that.) We're pretending here — the file on your Desktop is the deliverable.*

The whole loop, including cross-checks, takes 15–25 minutes for a typical 30-page policy. Doing the same review by hand takes most of an afternoon.

### Make the rules stick with `CLAUDE.md`

If you do policy reviews more than once a quarter, save your judgement rules in a `CLAUDE.md` file in this folder. Claude Code reads it automatically next time you `cd` here and run `claude` — no need to re-explain. Ask Claude:

> Create a `CLAUDE.md` in this folder. Put in it the stable rules for policy diffs: I always want the structured brief with Material vs Cosmetic sections; for every material change I want the before/after verbatim quote with paragraph reference; uncertain calls get tagged `[UNCERTAIN — please verify]` instead of guessed; the "what this means" line should focus on operational consequences for NBG retail and SME lending, not abstract impact.

Next policy review: copy this CLAUDE.md alongside the new v1/v2 files, run `claude`, and your one-line prompt becomes *"diff policy-v1.md against policy-v2.md"*. Five minutes saved every time.
