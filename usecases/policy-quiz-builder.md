---
type: usecase
title: Turn any policy into a quiz your team will actually take
audience: beginner
topics: [compliance, training, html]
internal: false
authored: "2026-06-11"
last_reviewed: "2026-06-11"
external_link: null
deeper_link: null
ai_summary: Nobody reads the updated anti-bribery policy until the annual attestation forces them to. Claude reads it, writes ten scenario questions with explanations, and builds them into a click-through quiz page with instant feedback — every answer citing the exact policy section. Training that takes five minutes to make and five minutes to take.
business_unit: compliance
time_estimate: "~25 min"
difficulty: beginner
order: 13
outcome: A self-contained `quiz.html` — ten scenario-based questions with instant right/wrong feedback, a score at the end, and a policy citation behind every answer — ready to drop in the team Teams channel.
inputs:
  - Nothing — Claude will invent a realistic synthetic internal policy to practise on. (Once you trust the loop, point it at any real policy your line manager has cleared.)
  - Claude Code installed and a terminal open (see Day 1)
---

Policies get published, announced, and ignored — in that order. The annual e-learning module everyone clicks through at 1.5× speed doesn't change that. What changes it is a colleague posting *"I got 7/10 on the gifts-and-hospitality quiz, beat me"* in the team channel.

This use case turns any policy into that quiz. Claude writes the questions *from the policy text*, so every answer is defensible — there's a §-citation behind each one, not quiz-writer's opinion.

> **Compliance check before you start.** This walkthrough uses a synthetic policy Claude invents. For the real thing, internal policies are usually classification *Internal* — fine in a Claude-readable folder on your workstation. If you're quizzing on a policy that quotes regulatory interpretations or legal advice, check with the policy owner first. And the quiz is a learning aid, not a formal attestation — it doesn't replace mandatory training modules.

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
mkdir -p ~/Desktop/claude-lab/policy-quiz
cd ~/Desktop/claude-lab/policy-quiz
claude --dangerously-skip-permissions
```

- `mkdir -p ~/Desktop/claude-lab/policy-quiz` — make a folder inside `claude-lab` on your Desktop (`-p` creates `claude-lab` too if it's not there yet — it's the one home for all hub use cases).
- `cd ~/Desktop/claude-lab/policy-quiz` — move into it.
- `claude --dangerously-skip-permissions` — start Claude Code here. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.)

---

## Step 2 — Ask Claude to invent a policy worth quizzing

You don't need a real policy to learn the loop. Tell Claude:

> Create a file called `policy.md` in this folder. Write a realistic synthetic internal NBG policy: "Gifts, Hospitality and Anti-Bribery Policy", version 2.1, about 2 pages of markdown. Structure with numbered sections — §1 Purpose, §2 Scope, §3 Definitions, §4 Rules (split into §4.1 Gifts received, §4.2 Gifts given, §4.3 Hospitality, §4.4 Public officials), §5 Registration and approval thresholds, §6 Consequences of breach.
>
> Plant concrete, quizzable rules: a €50 threshold above which gifts must be declared in the gift register within 5 business days; an absolute ban on cash or cash-equivalent gifts of any value; hospitality from the same counterparty capped at twice per year; anything involving a public official needs Compliance pre-approval regardless of value; one easily-misread rule — e.g. the €50 threshold applies *per counterparty per calendar year cumulatively*, not per gift.
>
> Dense corporate tone, the kind of document people skim and misremember.

Claude writes the file straight away. The "easily-misread rule" you planted is the whole point — that's the question people will get wrong, argue about, and finally remember.

---

## Step 3 — Ask for the questions, with citations

Send this to Claude:

> Read `policy.md`. Write `quiz.md` with exactly 10 quiz questions that test whether someone actually understood the policy. Rules:
>
> - Every question is a **scenario**, not a definition. Not "What is the gift threshold?" but "A supplier sends you a €45 bottle of wine in March and a €30 gift basket in November. What must you do?"
> - 4 answer options each (A–D), exactly one correct. Wrong options must be *plausible* — the answers a colleague who skimmed the policy would give.
> - Under each question: the correct letter, a one-sentence explanation, and the §-citation in `policy.md` that settles it.
> - At least 2 questions must target the cumulative-threshold rule and other commonly misread provisions.
> - Mix difficulty: 3 easy, 5 medium, 2 hard.

Press Enter. Claude writes the question bank in about a minute.

---

## Step 4 — Make Claude prove every answer against the policy

A quiz with a wrong answer key is worse than no quiz — people remember the wrong rule with confidence. Don't check it by eye. Paste:

> Verify your own quiz. For each of the 10 questions: (1) quote the exact sentence(s) from `policy.md` at the cited section that make the correct answer correct; (2) for each wrong option, state in one line *why* it's wrong under the policy — if you can't, the option is ambiguous: rewrite it; (3) confirm no two questions have contradictory implications. Show me the full audit, then fix anything that failed and re-run.

Read the audit — it's faster than re-reading the policy, and any question that can't produce its supporting quote gets rewritten or cut. This is the same *make-the-model-prove-it* habit as everywhere else in this hub; here it's what makes the quiz defensible when someone disputes a question in the team channel. (They will. That argument is the training working.)

---

## Step 5 — Build the quiz page

One prompt:

> Read `quiz.md`. Build a single self-contained file `quiz.html` that I can open by double-clicking — no server, no internet, no external libraries. One question at a time; clicking an option gives instant feedback — green for right, red for wrong — and always shows the one-sentence explanation **with the §-citation**, whether they got it right or not. Progress dots across the top. At the end: score out of 10, a "review your wrong answers" list, and a "try again" button that reshuffles the question order. Remember the best score in the browser's local storage and show it as "your best: X/10". Tone: friendly, not exam-hall. Accent colour `#007a8a`.

Double-click `quiz.html`. Take your own quiz. If a question feels off when you actually click through it — too easy, ambiguous wording — tell Claude and regenerate that one question.

Then drop the file in the team channel with one line: *"5 minutes, 10 questions, the new gifts policy. I got 8/10 — the cumulative threshold got me."* That message does more for policy awareness than the announcement email did.

---

## Step 6 — Make the next policy a one-liner with `CLAUDE.md`

The question style, the citation rule, the quiz-page design — none of that changes between policies. Tell Claude:

> Create a `CLAUDE.md` in this folder. Put in it my stable quiz-building rules: questions are scenarios, never definitions; 4 options, one correct, wrong options must be plausible; every answer carries a one-sentence explanation plus the §-citation that settles it; always audit the answer key against the policy before building the page; the quiz page is a single self-contained HTML file with instant feedback, citations shown on every answer, score + review at the end, best score in local storage.

`CLAUDE.md` is the magic filename Claude Code reads automatically every time you start `claude` in a folder containing it. Next policy update: drop the new `policy.md` in, run `claude --dangerously-skip-permissions`, and say *"quiz this policy"*. Ten minutes from policy publication to a quiz in the team channel — which is faster than most people take to *not* read the announcement.
