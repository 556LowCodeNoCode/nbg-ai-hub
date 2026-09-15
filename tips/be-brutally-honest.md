---
type: tip
title: Claude will agree with you — ask it not to
audience: beginner
topics: [prompting, safety]
internal: false
authored: "2026-09-15"
last_reviewed: "2026-09-15"
external_link: null
deeper_link: null
ai_summary: Claude leans towards agreeing with whatever you propose. Ask "is this a good idea?" and you'll usually hear yes. Ask it to argue the other side, or to find the three biggest problems, and you get the judgement you were actually after.
---

Ask Claude *"is this a good approach?"* and you will usually be told yes.

This isn't dishonesty. It's a tilt towards being agreeable, and it's strongest exactly where you least want it: when you've just described a plan you're already invested in. A newcomer reads the agreement as validation from a very well-read colleague. It usually isn't.

## The fix is one sentence

> Be brutally honest. What are the three biggest problems with this approach?

Or, when you want the real stress test:

> Argue the case against this plan as if you'd been asked to review it and find it wanting.

Both work because they change the job. "Is this good?" invites agreement. "Find the three biggest problems" requires output that doesn't exist unless Claude actually looks.

## Where this matters most

- **Before you build anything.** The cheapest moment to find a bad plan.
- **When you're tired or rushed.** Exactly when your own judgement is worst and agreement is most tempting.
- **When you've explained your reasoning at length.** The more context you give for a decision, the more Claude has to agree *with*.
- **Reviewing your own work.** "Any problems with this?" gets you a polite no. "Find what a strict reviewer would reject" gets you a list.

## Make it the default

If you never want to think about it again, put it in your `CLAUDE.md`:

```markdown
When I ask whether something is a good idea, argue both sides before
answering. If you think a plan is weak, say so directly and say why.
```

One line, and the tilt stops being your problem. Remember it only takes effect in a **new** session — see the claudemd-needs-a-restart tip.
