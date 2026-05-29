---
type: usecase
title: Generate a personalised first-week checklist for a new joiner
audience: beginner
topics: [hr, onboarding, writing]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: null
deeper_link: null
ai_summary: A new joiner starts Monday. HR sends them a generic 40-item checklist that scares everyone. Claude reads the job description, the team's standard onboarding doc, and the new joiner's CV — then produces a tailored 12-item week-one plan they can actually finish.
business_unit: hr
time_estimate: "~20 min"
difficulty: beginner
order: 10
outcome: A markdown checklist with three sections (Day 1 · Days 2–3 · Days 4–5), each item including who to talk to and why it matters. Personalised to the joiner's role and prior experience.
inputs:
  - Nothing — Claude will invent a realistic job description, generic team onboarding doc, and joiner CV for you to practise on. (Once you trust the loop, swap in your real JD + onboarding doc + the joiner's CV — handle the CV as personal data per GDPR.)
  - Claude Code installed and a terminal open (see Day 1)
---

Generic onboarding checklists are how new joiners learn that nobody really thought about their first week. Forty items, half of them only relevant to people in the office on Tuesdays, no order, no explanation of *why* anything is on the list.

This use case is a small fix with disproportionate impact: a checklist that looks like it was made for *this* person.

> **Compliance check before you start.** Job descriptions and team onboarding docs are usually internal but non-sensitive. A new joiner's CV is *personal data* under GDPR — handle it with the same posture as any other personal data. For your first run, use your *own* CV or a sanitised sample, not a candidate's. Once you trust the loop, talk to your line manager about how real CVs should flow.

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
mkdir ~/Desktop/onboarding-anna
cd ~/Desktop/onboarding-anna
claude --dangerously-skip-permissions
```

- `mkdir ~/Desktop/onboarding-anna` — make a folder named after the joiner.
- `cd ~/Desktop/onboarding-anna` — move into it.
- `claude --dangerously-skip-permissions` — start Claude Code. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.)

---

## Step 2 — Ask Claude to invent the three input documents

You don't have a real JD, team onboarding doc, or CV to hand — and you don't need them. Tell Claude:

> Create three files in this folder:
>
> **File 1: `job-description.md`** — a realistic JD (~1 page) for "SME Credit Analyst" at NBG retail bank, Athens HQ. Include: responsibilities (credit underwriting for SME loans up to €500k, portfolio monitoring, contributing to risk committee submissions), required skills (2+ years credit analysis, comfortable with financial-statement analysis, knowledge of Greek SME sector, Greek + English fluency), reporting line (Head of SME Credit), what success looks like at 6 / 12 months.
>
> **File 2: `team-onboarding.md`** — a deliberately generic 40-item bank-wide onboarding checklist (~2 pages of markdown) that HR sends every new joiner. Mix relevant items (laptop pickup, badge, mandatory KYC training, data-protection module, code-of-conduct sign-off, SAP-CRM access request, intranet account, internal phone number) with items that only apply to specific roles (cash-handling training, branch-front-line uniform fitting, ATM-vault access request, trade-desk system permissions, customer-call-recording authorisation). Order them haphazardly — that's how real generic checklists look.
>
> **File 3: `anna-cv.md`** — a realistic CV for "Anna Papas" (~1 page). Background: 2 years as a junior credit analyst at a competitor Greek bank; before that an Athens University economics degree (2:1 equivalent); strong on financial-statement analysis and Excel; some SQL exposure from a fintech internship; KYC-certified at her current bank; native Greek, C1 English. Add a "Personal" line: lives in Kifissia, 27 years old, joined cycling club.
>
> Make all three feel like real corporate documents — not bulletted summaries. The team-onboarding one in particular should have a 1990s-HR-document tone: long sentences, "the colleague shall", lots of capitalisation.

Claude writes all three files straight away.

Two minutes of synthesis from Claude that would have taken you twenty to write by hand — and the files now feel realistic enough to do the actual exercise on.

---

## Step 3 — Let Claude create the context file

The checklist quality is set by the context you give Claude. The more specific the context, the more useful the checklist.

Tell Claude:

> Create a file called `context.md` in this folder. Put these 6 lines inside it (with my values):
>
> ```
> Joiner name: Anna Papas
> Role: SME Credit Analyst, NBG retail bank, Athens HQ
> Joining team: SME Credit team (8 people)
> Manager: M. Vassilas (Head of SME Credit)
> Working pattern: 3 days on-site (Mon/Tue/Thu), 2 remote
> Banking experience: 2 years junior analyst at a competitor — knows the basics, new to NBG-specific systems and policies
> ```

Claude writes the file straight away.

Two minutes of thought here is what separates "useful checklist" from "another bureaucratic document".

---

## Step 4 — Ask for the personalised checklist

Send this to Claude:

> Read `context.md`, `job-description.md`, `team-onboarding.md`, and `anna-cv.md`.
>
> Produce `week-one-checklist.md` with these three sections, in this order:
>
> **Day 1 (Monday)** — max 4 items. Things that *must* happen before lunch on day 1: laptop pickup, the access requests that take longest to land, manager 1:1, team intro. Each item: who they need to see, where (room or Teams), why it matters in one sentence.
>
> **Days 2–3** — max 5 items. The core systems-and-policies block: which internal systems they need access to, which mandatory training modules apply to a credit analyst, the 2–3 meetings they should attend as observers. Each item: same format.
>
> **Days 4–5** — max 4 items. Their first piece of real work, paired with a buddy. Should be a small, finishable task that lets them feel useful by Friday afternoon. Each item: same format.
>
> Hard rules:
>
> - **Skip** items from `team-onboarding.md` that don't apply to a credit analyst (e.g. front-line cash-handling training).
> - **Skip** anything Anna already knows from her CV (don't put "Introduction to credit risk fundamentals" on the list if she has 2 years of credit analysis behind her).
> - **Add** an introduction to one specific NBG policy or system that her prior bank wouldn't have used.
> - Every item needs a *why*. "Mandatory KYC training (Day 2)" is incomplete; "Mandatory KYC training (Day 2) — required by Bank of Greece for anyone handling client files, takes 90 minutes" is the right shape.

Press Enter. Claude reads the files and writes the checklist in 30–90 seconds.

---

## Step 5 — Sanity-check before sending

Ask Claude:

> Show me `week-one-checklist.md`.

Read it twice — once as you, once as Anna. Questions to ask yourself:

- **Is day 1 too crowded?** Four items is the cap. If Claude wrote six, push back: *"Day 1 has too many items — Anna's manager will only have 30 minutes on Monday morning. Cut to four."*
- **Is anything on the list that her CV makes redundant?** *"Introduction to corporate banking" for a 2-year banker is condescending.*
- **Is the Friday task real?** *"Read the team's risk policy"* is not a task. *"Draft a one-page memo on borrower XYZ's covenant compliance for the credit committee — paired with M. Costa"* is.

Iterate. Three of these revisions usually produce a checklist that lands well.

---

## Step 6 — How you'd actually deliver it

*In real life, the two delivery options that land best with new joiners: (1) paste the markdown into Teams as a direct message — checkboxes, bold, headings render natively — with a one-liner like "Looking forward to Monday — this is your first week, designed for you. We'll go through Day 1 together at 10am." (2) Print it — people who get a printed checklist on day 1 keep it on their desk, people who get a PDF lose it in their inbox. We're pretending here — the file on your Desktop is the deliverable.*

Save the folder. The next joiner's checklist reuses the prompt and the team onboarding doc — only `context.md` and the CV change. Twenty minutes becomes five.

The deeper win: the joiner spends their first week *doing* instead of waiting for someone to tell them what they should be doing. That's worth a lot more than the time you saved.

### Make the next joiner's checklist faster with `CLAUDE.md`

The rules you established this time are stable — they apply to *every* SME Credit joiner. The joiner's name and CV change; the rules don't. Tell Claude:

> Create a `CLAUDE.md` in this folder. Put in it the stable rules for week-one checklists in the SME Credit team:
>
> - Three sections: Day 1 (max 4 items), Days 2–3 (max 5 items), Days 4–5 (max 4 items)
> - Each item: who they see, where (room or Teams), why it matters in one sentence
> - **Skip** items from the bank-wide onboarding doc that don't apply to a credit analyst (cash handling, branch uniform, ATM-vault access, customer-call-recording authorisation, trade-desk modules)
> - **Skip** anything redundant with the joiner's prior experience (don't put "Introduction to credit risk fundamentals" on the list for someone who already has 2 years of it)
> - **Add** at least one NBG-specific intro (e.g. the RatingPro scoring model) that a competitor bank wouldn't have used
> - Day-4/5 task must be small, finishable, and pair the joiner with a buddy
> - Every item needs a *why*

`CLAUDE.md` is the magic filename Claude Code reads automatically every time you start `claude` in a folder containing it. Next joiner: copy the CLAUDE.md and the team-onboarding doc into a new folder, drop in the new joiner's CV, write a one-line `context.md` with name and prior experience, run `claude --dangerously-skip-permissions`. Five minutes.
