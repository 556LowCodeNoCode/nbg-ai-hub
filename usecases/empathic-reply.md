---
type: usecase
title: Draft a customer reply that doesn't sound corporate
audience: beginner
topics: [writing, retail, customer-care]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-06-11"
external_link: null
deeper_link: null
ai_summary: A frustrated customer emails you. You have three minutes between meetings and a blank reply window. Claude gives you three draft replies in three different tones — you pick the closest one, tweak two sentences, send. The walkthrough works without a real complaint — Claude invents one to practise on.
business_unit: retail
time_estimate: "~15 min"
difficulty: beginner
order: 2
outcome: Three reply drafts in three different tones (warm / formal / apologetic) with one short rationale each — pick the closest one and polish in place.
inputs:
  - Nothing — Claude will invent a realistic customer complaint for you to practise on. (Once you trust the loop, swap in real anonymised complaints — names, account numbers, IBANs stripped first.)
  - Claude Code installed and a terminal open (see Day 1)
---

Retail branches and customer-care desks send replies all day. The good ones take ten minutes each because every reply is bespoke. The fast ones take ninety seconds because the writer pastes the same paragraph into every email. Neither is great.

This use case lands in the middle: three minutes to a polished, personal-sounding draft you'd actually send.

> **Compliance check before you start.** This walkthrough uses a synthetic complaint Claude invents — no real customer data touches the loop. When you do this for real, strip the customer's real name, account number, and any identifiers first. Use "the customer" or a placeholder like `[CUSTOMER NAME]`. The point of this exercise is the *shape* of the reply — you'll fill the real details back in before you send.

---

## Step 1 — Build the workspace

You'll make a folder on your Desktop and let Claude create the files inside it. No text editor required.

**Open the Terminal app.**

<div data-os="mac">

Press ⌘+Space, type "Terminal", and press Enter.

</div>

<div data-os="windows">

Open the Start menu (press the Windows key), type "Ubuntu", and press Enter. If you don't see Ubuntu listed, [install WSL first](/start-here/day-1/#d1).

In Ubuntu, `~/Desktop` is a folder inside WSL's Linux home (`/home/<your-Linux-username>/Desktop`) — **not** the Windows desktop you see in File Explorer at `C:\Users\...\Desktop`. That's fine: the files are real and Claude can read and write them. Anywhere this use case says "open in Finder / File Explorer", run `explorer.exe .` from your Ubuntu terminal — Windows opens that exact WSL folder in Explorer.


</div>

Type each line and press Enter.

```
mkdir -p ~/Desktop/claude-lab/replies-today
cd ~/Desktop/claude-lab/replies-today
claude --dangerously-skip-permissions
```

Plain-English translation:

- `mkdir -p ~/Desktop/claude-lab/replies-today` — make a new folder called `replies-today` inside `claude-lab` on your Desktop (`-p` creates `claude-lab` too if it's not there yet — it's the one home for all hub use cases).
- `cd ~/Desktop/claude-lab/replies-today` — move the terminal into it.
- `claude --dangerously-skip-permissions` — start Claude Code in this folder. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one where there's nothing it can damage. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.)

The blinking cursor is now Claude's. You're chatting with it.

---

## Step 2 — Ask Claude to invent a realistic complaint to practise on

You don't have a real complaint and you don't need one. Tell Claude:

> Create a file called `complaint.txt` in this folder. Write a realistic synthetic complaint email an NBG retail customer might send — about 120 words, lightly emotional but not abusive. The complaint: their debit card was charged twice for the same purchase at a supermarket three days ago. They've called the contact centre once already and felt brushed off. They want the duplicate reversed and someone to explain what happened.
>
> Use the placeholder `[CUSTOMER NAME]` instead of inventing a real name. No real IBAN — use `[ACCOUNT]`. Address it to "Dear NBG team,". Sign as "Frustrated, [CUSTOMER NAME]".

Claude writes the file straight away. You'll see `complaint.txt` appear in the folder on your Desktop.

That's the surprise: Claude can invent the input, not just process it. When you do this on real complaints next week, the only thing that changes is the file's contents — the rest of the use case is identical.

---

## Step 3 — Brief Claude for the reply

Send this briefing. Treat it as a template — the bracketed bits are the only parts you change per reply.

> You're helping a [retail branch / customer care] specialist at NBG draft a reply to an unhappy customer.
>
> Read `complaint.txt`. The customer is complaining about [one-line summary — e.g. "a duplicate charge on their debit card"].
>
> The known facts on our side are:
>
> - [Fact 1 — e.g. "the duplicate was a Visa authorisation hold, not a real charge"]
> - [Fact 2 — e.g. "the hold released this morning"]
> - [Fact 3 — e.g. "we cannot share the merchant's internal reasoning"]
>
> Produce **three** reply drafts in three different tones:
>
> 1. **Warm and personal** — acknowledges the frustration, leads with empathy
> 2. **Formal and procedural** — leads with what we did, what the customer should do
> 3. **Apologetic and corrective** — explicitly says where the bank could have done better
>
> Each draft is under 150 words, ends with "Kind regards, [Specialist name]", and avoids: "we apologise for any inconvenience", "as per our records", "kindly note that", and any other corporate filler.
>
> Below each draft, one sentence on which kind of customer it suits best.

Press Enter.

---

## Step 4 — Pick the closest one and polish

Read all three. Don't pick the *best* — pick the one *closest* to what you'd send. You'll polish it from there.

In Claude, you can ask:

> Take draft 2 and merge in the empathy from the first paragraph of draft 1. Keep it under 150 words.

That's the move. You're not asking Claude to write your reply — you're directing a junior who's already shown you three options.

Two final passes:

1. **Read it aloud.** If a sentence sounds like a memo, change it. Customers hear the voice in their head.
2. **Check the facts.** Did Claude state anything you didn't tell it? If yes, delete it. *"We've already contacted the merchant"* is the kind of plausible-sounding claim a model invents on its own — don't ship it unless it's true.

Two minutes. Then paste the final into Outlook, fill the real customer name + your signature back in, send.

### Make Claude prove the drafts follow the rules

The fact-check above needs your judgment, but the format rules are mechanical — so delegate them. Paste:

> Verify your own drafts. (1) Count the words of each draft and show me the counts — every one must be under 150. (2) Search all three drafts for each banned phrase ("we apologise for any inconvenience", "as per our records", "kindly note that") and show me the search output — it must come back empty. (3) List every factual claim in the final draft and match each one to a fact from my briefing. Flag anything that has no source.

Claude checks with real commands and a real claim-by-claim list, not a reassuring "all good". Check 3 is the one that catches the invented *"we've already contacted the merchant"* before the customer does.

---

## Step 5 — Save your rules in `CLAUDE.md`

`CLAUDE.md` is a special file Claude Code reads automatically every time you start `claude` in a folder. Put the *stable* rules of your reply workflow in there, and tomorrow's complaint becomes a 30-second job — no re-typing the briefing.

Ask Claude:

> Create a file called `CLAUDE.md` in this folder. Put the stable parts of my reply workflow in it:
>
> - I am a [retail branch / customer care] specialist at NBG drafting replies to unhappy customers
> - For every complaint give me three reply drafts in three tones: warm and personal · formal and procedural · apologetic and corrective
> - Each draft under 150 words, ends with "Kind regards, [Specialist name]"
> - **Never** use these phrases: "we apologise for any inconvenience", "as per our records", "kindly note that", or any other corporate filler
> - Under each draft, one sentence saying which type of customer it suits best
> - Don't invent facts — only use what I tell you in the briefing

Claude writes the file. Tomorrow's loop:

1. `cp ~/Desktop/claude-lab/replies-today/CLAUDE.md ~/Desktop/claude-lab/replies-2026-05-29/` (the rules travel with you)
2. Drop the new `complaint.txt` in that folder
3. Run `claude --dangerously-skip-permissions` and just say: *"complaint.txt is about a duplicate charge. We held the funds; released this morning; can't share merchant reasoning. Three drafts."*

Claude already knows the format and the banned phrases from `CLAUDE.md`. You only describe what's *different* about today's complaint.

You've turned the worst kind of task — emotionally draining, repeated dozens of times a day, easy to get wrong — into something tractable.

---

## Step 6 — Level up — a tone studio you can click through

Optional, and a crowd-pleaser: turn the three-drafts output into a small page your whole desk can use.

> Build a single self-contained file called `tone-studio.html` that I can open by double-clicking — no server, no internet, no external libraries. Layout: the customer's complaint from `complaint.txt` on the left; on the right, my three reply drafts as tabs labelled "Warm", "Formal", "Accountable". Each tab shows the draft with a "Copy to clipboard" button and the one-line "best for" rationale underneath. Accent colour `#007a8a`, comfortable to read on a laptop.

Double-click the file — complaint on one side, three tones a tab-click apart, copy button for the winner. Tomorrow you regenerate the drafts for a new complaint and ask Claude to refresh the same page.

**The pattern to remember** — any output Claude can produce as text, it can also produce as a small interactive page. The upgrade prompt is always the same shape: *"turn this into a single self-contained interactive HTML file I can open by double-clicking."* It works on every use case in this hub.
