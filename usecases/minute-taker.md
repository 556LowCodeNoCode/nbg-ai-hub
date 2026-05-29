---
type: usecase
title: Turn a Teams transcript into proper meeting minutes
audience: beginner
topics: [operations, writing, meetings]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: null
deeper_link: null
ai_summary: Teams generates a transcript automatically. It is unreadable. Claude turns it into the minutes you actually want — decisions, action items with owners and deadlines, next steps — in your team's template. Five minutes after the call ends.
business_unit: operations
time_estimate: "~15 min"
difficulty: beginner
order: 5
outcome: A markdown file `minutes-YYYY-MM-DD.md` with decisions, action items (owner + deadline), and a short narrative summary — ready to send to the meeting attendees.
inputs:
  - Nothing — Claude will invent a realistic Teams-style transcript for you to practise on. (Once you trust the loop, swap in a real Teams transcript download — `.docx` or `.vtt`.)
  - Claude Code installed and a terminal open (see Day 1)
---

Meeting minutes are unpaid second-shift work. Most teams have someone who does them and most of those someones resent it. Teams transcripts are technically a solution but practically a liability — they're verbatim, full of "uh", "yeah, so", and three people talking over each other, and the action items are scattered through forty pages of "I mean, kind of".

This use case extracts the meeting from the transcript in the time it takes to make coffee.

> **Compliance check before you start.** Transcripts may contain sensitive discussion — pricing, customer names, personnel decisions. Treat the transcript file the same way you'd treat any other internal-confidential document: keep it local, don't paste it into web-based AI chat tools, delete when you're done with the minutes.

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

Type each command, press Enter after each:

```
mkdir ~/Desktop/minutes-arch-review
cd ~/Desktop/minutes-arch-review
claude --dangerously-skip-permissions
```

Plain-English translation:

- `mkdir ~/Desktop/minutes-arch-review` — make a folder for this meeting. Replace `arch-review` with whatever names this meeting.
- `cd ~/Desktop/minutes-arch-review` — move into it.
- `claude --dangerously-skip-permissions` — start Claude Code. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.) From now on you're chatting with it.

---

## Step 2 — Ask Claude to invent a realistic transcript

You don't have a Teams transcript to hand and you don't need one. Tell Claude:

> Create a file called `transcript.md` in this folder. Generate a realistic 30-minute Teams transcript for a meeting called "Architecture review — payments team" at NBG on 2026-05-28.
>
> Attendees: A. Papas (chair), M. Costa, N. Demetriou, J. Vassilas.
>
> Format: speaker label on each line, like `A. Papas: …`. Mix of:
>
> - Greeting and roll-call at the start.
> - Some procedural noise: "can you see my screen?", "you're on mute", a 30-second tangent about parking.
> - Real substance: two payment-routing options (option A: SEPA-Instant via existing rails; option B: a new third-party processor). The team debates cost vs latency vs vendor risk.
> - A clear decision: pick option A for Q3, with a fallback evaluation of B in Q4.
> - Three action items: (1) M. Costa drafts a one-pager on the SEPA-Instant volume estimates by 2026-06-03; (2) N. Demetriou contacts the option-B vendor for pricing — no deadline stated; (3) J. Vassilas books a follow-up review for 2026-06-15.
> - Realistic filler ("yeah, so", "I mean, kind of", "um", "let me just share my screen").
> - One unresolved disagreement on whether the option-B vendor's SLA is actually credible.
>
> Make it ~80 lines long. Don't sanitise — leave the messiness in. The whole point of this exercise is that Claude turns messy dialogue into clean minutes.

Claude writes the file straight away. You now have a transcript that looks and feels like what Teams would give you.

The take-away you've just earned: Claude can generate the *inputs* to a workflow, not just process them. When you do this for real next week the only thing that changes is the transcript file — the rest of the use case doesn't.

---

## Step 3 — Let Claude create the context file

The transcript is dialogue. Claude doesn't know who chaired, who the attendees were, what kind of meeting this was, or what style of minutes you want. So we tell it once, in a separate file, so the briefing is reusable next week.

Tell Claude:

> Create a file called `context.md` in this folder. Put these 5 lines inside it (with my values, not the placeholders):
>
> ```
> Meeting: Architecture review — payments team
> Date: 2026-05-28
> Attendees: A. Papas (chair), M. Costa, N. Demetriou, J. Vassilas
> Goal: decide on the payment-routing approach for Q3
> Style of minutes: action-led — decisions and next steps, not a play-by-play
> ```

Claude writes the file straight away. Three minutes of work — and it saves you ten minutes of correcting the minutes after the fact.

---

## Step 4 — Ask for the minutes

Send this to Claude:

> Read `transcript.md` and `context.md`.
>
> Produce `minutes-2026-05-28.md` with these sections, in this order:
>
> **1. One-paragraph summary** — what the meeting was about and what it decided. 3–4 sentences max.
>
> **2. Decisions** — bullets. Each bullet: the decision itself, then in parentheses the person whose call it was. Order by significance, not by when it was discussed.
>
> **3. Action items** — table with columns: `What | Owner | Deadline | Notes`. The owner must be a named person from the attendee list. If a deadline wasn't stated explicitly, write "TBD" — don't invent a date.
>
> **4. Discussion notes** — short bullets capturing the substance of any disagreement or open question that didn't reach a decision. Skip the rest of the transcript content.
>
> Skip filler words, side-chats, "let me share my screen" interruptions, and anything purely procedural. The minutes should read like notes a careful person took in real time — not a verbatim record.

Press Enter. Claude writes the file in 30–90 seconds, depending on transcript length.

---

## Step 5 — Sanity-check the action items, then send

Open the minutes file from Finder (it's in your `~/Desktop/minutes-arch-review/` folder), or just ask Claude:

> Show me the action items table from `minutes-2026-05-28.md`.

This is the part that matters and the part most likely to be wrong. For each row:

- **Owner** — did this person actually agree to do this thing, or did Claude pattern-match because their name was nearby? If unsure, change the owner to "TBD" rather than guess.
- **Deadline** — did anyone actually say a date? If you wrote "TBD" in the prompt and Claude still made one up, tell it: *"Action item 3 has no deadline mentioned in the transcript — replace with TBD."*
- **What** — is the action verb clear? *"Discuss routing"* is weak. *"Draft a one-pager comparing route A vs B"* is an action item.

Tighten one or two and the minutes are ready.

*In real life you'd paste the markdown into Teams (which renders it natively) or Outlook (plain text, bold the headers) and send to attendees. We're pretending here — the file on your Desktop is the deliverable.*

Save the folder. The pattern is now repeatable: every meeting gets its own dated folder with `transcript` + `context.md` + the minutes. After a quarter you have a searchable archive of what was decided where — which is more than most teams have ever had.

### Make next week's minutes a one-liner with `CLAUDE.md`

`context.md` mixes two kinds of information. The meeting date, attendees, and goal change every week — those stay per-meeting. But the **style** ("action-led, decisions and next steps, not a play-by-play") doesn't change. Put the stable bits in a `CLAUDE.md` file in this folder:

> Create a `CLAUDE.md` here. Put in it: I want minutes in this exact structure — one-paragraph summary, then Decisions bulleted by significance, then an Action items table (`What | Owner | Deadline | Notes`, owner must be a named attendee, never invent a deadline — TBD if not stated), then short Discussion notes for unresolved disagreements. Skip filler, side-chats, screen-share interruptions. The minutes read like a careful person's real-time notes, not a transcript.

Claude reads `CLAUDE.md` automatically every time you start `claude` in a folder containing it. Next week's loop:

1. New dated folder, drop in this week's transcript
2. `cp ~/Desktop/minutes-arch-review/CLAUDE.md .` — your style rules travel with you
3. `claude --dangerously-skip-permissions` and one line: *"transcript.md is Tuesday's payments standup, attendees A. Papas, M. Costa, J. Vassilas — produce minutes-2026-06-04.md"*

Claude already knows the format from `CLAUDE.md`. You only describe what's new about this meeting.
