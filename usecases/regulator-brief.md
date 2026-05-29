---
type: usecase
title: Compress a 60-page regulator PDF into a 1-page brief
audience: beginner
topics: [compliance, summarisation, regulation]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: null
deeper_link: null
ai_summary: A new ECB / BoG / EBA paper lands in your inbox. It is 60 pages, half of it is boilerplate, the deadline is Friday. Claude reads it and writes a one-pager — what changed, who's affected, what we need to do, by when — that you can take to your team lead.
business_unit: compliance
time_estimate: "~25 min"
difficulty: beginner
order: 6
outcome: A one-page markdown brief with four labelled sections — What changed · Who's affected · What we need to do · By when — plus a links list back to the source pages for verification.
inputs:
  - Nothing — Claude will invent a realistic ~10-page synthetic regulator paper for you to practise on. (Once you trust the loop, swap in any public PDF from the ECB/BoG/EBA website.)
  - Claude Code installed and a terminal open (see Day 1)
---

Regulatory papers are written in a style that protects the regulator from misinterpretation. That makes them precise but unreadable in a single sitting. The team lead asks "is there anything in this we need to act on?" and the honest answer is "give me three hours and I'll tell you" — but the meeting is in twenty minutes.

This use case is the twenty-minute version. The point isn't to replace the careful read — it's to know whether the careful read needs to happen by Friday or by next month.

> **Compliance check before you start.** Public regulator papers (anything published on ECB / BoG / EBA websites) are fine to put in a Claude-readable folder. Internal interpretations, legal memos analysing the paper, or counsel correspondence are not — keep those out of the folder for this use case.

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
mkdir ~/Desktop/reg-brief-eba
cd ~/Desktop/reg-brief-eba
claude --dangerously-skip-permissions
```

- `mkdir ~/Desktop/reg-brief-eba` — make a folder on your Desktop.
- `cd ~/Desktop/reg-brief-eba` — move into it.
- `claude --dangerously-skip-permissions` — start Claude Code here. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.)

---

## Step 2 — Ask Claude to invent a realistic regulator paper

You don't have a real ECB or EBA paper to hand and you don't need one. Tell Claude:

> Create a file called `source.md` in this folder. Write a realistic synthetic regulator consultation paper, about 10 pages worth of markdown (~3000 words). Topic: "Consultation Paper EBA/CP/2026/04 — Strengthening underwriting standards for residential mortgages in the Single Market".
>
> Structure with numbered sections — use §1, §2, §3, §4, §5, §6, §7 and subsections like §4.2.1:
>
> - §1 Executive summary
> - §2 Background and legal basis (reference the Mortgage Credit Directive 2014/17/EU)
> - §3 Scope (which institutions; which products)
> - §4 Proposed requirements — split into §4.1 LTV caps, §4.2 LTI / DSTI thresholds, §4.3 stress-testing of borrower affordability, §4.4 documentation standards
> - §5 Implementation timeline (with concrete transition dates: consultation closes 2026-08-31; final guidelines published Q4 2026; supervisory expectation effective 2027-07-01)
> - §6 Impact assessment (a short qualitative section)
> - §7 Questions for respondents (10 numbered questions)
>
> Tone: dense regulatory English with hedges ("institutions should ensure", "competent authorities may"). Sprinkle some genuine substance worth flagging — e.g. a hard 90% LTV cap for first-time buyers in §4.1.2, a new requirement to model income stress at +200bp in §4.3, and a controversial provision in §4.2.3 that allows a 10% portfolio-level exception for "social housing programmes".
>
> Add a short title page and a footer like "EBA/CP/2026/04 — page X of 10" so it reads like a real consultation.

Claude writes the file straight away.

Renaming to `source.md` is the small trick — every regulator paper you brief uses the same filename, so the prompt in Step 4 is identical every time. Change one file, reuse the same prompt.

---

## Step 3 — Let Claude create the context file

You don't need to know how to make a file. Tell Claude:

> Create a file called `context.md` in this folder. Put these 5 lines inside it (with my values):
>
> ```
> Reader: a compliance officer at NBG (retail bank, Greece)
> Bank's main exposures relevant here: residential mortgage portfolio, SME unsecured lending, contact-centre operations
> Reader's seniority: knows the regulatory landscape, doesn't have three hours to read 60 pages today
> Goal: a one-pager I can take to the head of compliance tomorrow morning
> Tone: plainspoken, no hedging, no "it depends" without naming the things it depends on
> ```

Claude writes the file straight away. Two minutes — this is what makes the brief sound like it was written by you, not by a generic summariser.

---

## Step 4 — Ask Claude for the brief

Send this to Claude:

> Read `source.md` and `context.md`.
>
> Produce `brief.md` — a single page with these four sections, exactly in this order, each labelled:
>
> **1. What changed** — 3–5 bullets. The substantive changes only. Skip "this paper consolidates earlier guidance" boilerplate. For each bullet, in parentheses cite the section number from `source.md` (e.g. "§3.2.1").
>
> **2. Who's affected** — which parts of the bank, in plain English. Tie this to the exposures named in `context.md`.
>
> **3. What we need to do** — concrete actions. If you can't name a concrete action, write "needs legal interpretation" — don't pad.
>
> **4. By when** — deadlines explicitly named in the paper. If no deadline is stated, write "no deadline stated" — do not invent one.
>
> At the bottom, an "Open questions for legal" list — anything you read where the application to NBG specifically is genuinely ambiguous.
>
> Hard rule: every claim in the brief must be traceable to a section of `source.md`. If you find yourself writing something that isn't, delete it.

Press Enter. Larger papers take 1–3 minutes.

---

## Step 5 — Verification pass — pick three claims at random

Ask Claude to show you what it wrote:

> Show me `brief.md`.

Pick three bullets at random. For each one:

1. Note the section number Claude cited.
2. Open `source.md` (it's in your `~/Desktop/reg-brief-eba/` folder — open it in your text editor or just ask Claude *"show me §4.1 of source.md"*), jump to that section.
3. Confirm the bullet accurately reflects what's there.

If two of three pass, you have a solid brief. If one fails, ask Claude to recheck — naming the bullet that was wrong is enough:

> The "Who's affected" bullet about SME unsecured lending — recheck against §4.1 of `source.md`. I don't see that there.

Iterate until your spot-checks pass.

---

## Step 6 — Take it to the team lead

*In real life you'd send `brief.md` (or paste it into Teams — markdown renders natively) with one line: "My 25-min read of the EBA paper — flagging the SME-lending change as the one that probably needs a real review this week." We're pretending here — the file on your Desktop is the deliverable.*

You've shifted from *"I'll read it and get back to you"* to *"here's the picture, here's the priority"*. That's the work the team lead actually wanted.

The full careful read still happens — but now it happens against a hypothesis instead of from a blank page.

### Make the next brief faster with `CLAUDE.md`

The reader profile, NBG's main exposures, the tone — none of that changes between regulator papers. The paper itself does. Rename `context.md` to `CLAUDE.md`:

```
mv context.md CLAUDE.md
```

`CLAUDE.md` is the magic filename Claude Code reads automatically every time you start `claude` in a folder containing it. Next paper: copy `CLAUDE.md` into a new folder alongside the new `source.md`, run `claude --dangerously-skip-permissions`, and your prompt shrinks to a one-liner:

> Produce `brief.md` from `source.md` in the format you already know.

Claude already loaded your reader profile and the four-section template from `CLAUDE.md`. You just point at the new paper and get the brief.
