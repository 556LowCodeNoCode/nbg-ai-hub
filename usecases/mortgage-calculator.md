---
type: usecase
title: Build a one-page mortgage eligibility calculator
audience: beginner
topics: [mortgages, build, html]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-06-11"
external_link: null
deeper_link: null
ai_summary: A single HTML file with four sliders (income, debts, property value, interest rate) that shows the maximum mortgage amount as you move them. Built in thirty minutes by describing the rules in plain English. You don't write a line of code yourself.
business_unit: mortgages
time_estimate: "~30 min"
difficulty: beginner
order: 4
outcome: A single self-contained `index.html` file you can open in any browser — four sliders, a live result with the binding constraint named, ready to share with a colleague or screen-share on a call.
inputs:
  - The eligibility rules you want to encode (in plain English, one bullet per rule — Claude will help you turn them into code)
  - Claude Code installed and a terminal open (see Day 1)
---

This is the use case that surprises people the most: *I can build interactive tools without writing code.*

The mortgage front-line team uses a half-dozen recurring calculations — debt-service ratio, loan-to-value, max-amount-given-income. They live as Excel sheets nobody trusts because the formulas drift. A single-page HTML calculator solves the trust problem (the rules are visible and version-controlled) and the share problem (it's a file you can email).

> **Compliance check before you start.** Use a *simplified* version of the eligibility rules for your first calculator — not the production policy. The point is to learn the loop, not to replace the underwriting engine. Production calculators need risk-team sign-off, formal testing, and a hosting story. This is the prototype that wins that conversation.

---

## Step 1 — Build the workspace

You're going to make a fresh folder on your Desktop and start Claude inside it. Three lines.

**Open the Terminal app.**

<div data-os="mac">

Press ⌘+Space, type "Terminal", and press Enter.

</div>

<div data-os="windows">

Open the Start menu (press the Windows key), type "Ubuntu", and press Enter. If you don't see Ubuntu listed, [install WSL first](/start-here/day-1/#d1).

In Ubuntu, `~/Desktop` is a folder inside WSL's Linux home (`/home/<your-Linux-username>/Desktop`) — **not** the Windows desktop you see in File Explorer at `C:\Users\...\Desktop`. That's fine: the files are real and Claude can read and write them. Anywhere this use case says "open in Finder / File Explorer", run `explorer.exe .` from your Ubuntu terminal — Windows opens that exact WSL folder in Explorer.


</div>

Type each command and press Enter.

```
mkdir -p ~/Desktop/claude-lab/mortgage-calc
cd ~/Desktop/claude-lab/mortgage-calc
claude --dangerously-skip-permissions
```

Plain-English translation:

- `mkdir -p ~/Desktop/claude-lab/mortgage-calc` — make a folder called `mortgage-calc` inside `claude-lab` on your Desktop (`-p` creates `claude-lab` too if it's not there yet — it's the one home for all hub use cases).
- `cd ~/Desktop/claude-lab/mortgage-calc` — move into the folder.
- `claude --dangerously-skip-permissions` — start Claude Code here. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.)

The blinking cursor is now Claude's. You're chatting with it.

---

## Step 2 — Let Claude create the rules file

Don't write the rules in a text editor. Tell Claude what to write.

> Create a file called `rules.md` in this folder. Put the following rules inside it, exactly as I write them:
>
> ```
> Maximum mortgage amount = lower of:
>
> - 80% of property value
> - Annual income × 5
> - The amount whose monthly payment (at the input interest rate, 25-year term)
>   keeps total monthly debts under 40% of monthly net income
>
> Monthly net income = annual income / 12 × 0.7  (rough net-of-tax proxy)
>
> Input fields:
>
> - Annual income (€)
> - Existing monthly debts (€)
> - Property value (€)
> - Interest rate (%)
>
> Show the result as a single euro figure, big, with the binding constraint
> named below (e.g. "binding: income multiplier" or "binding: debt-to-income").
> ```

Claude writes the file straight away. You now have `rules.md` sitting in the folder on your Desktop.

Five minutes of work. Be explicit; ambiguity will produce a buggy calculator.

---

## Step 3 — Ask Claude to build the HTML

Still in Claude, say:

> Read `rules.md`. Build a single self-contained `index.html` file — no external dependencies, no CDN links — that implements those rules.
>
> Requirements:
>
> - Four inputs as sliders (with the current numeric value shown next to each)
> - One big result figure that updates live as the sliders move
> - Below the result, one line: "binding: <constraint name>" — which rule is currently capping the answer
> - Use NBG-ish colours: a teal accent (#007a8a), white background, dark text
> - Mobile-responsive (single column on phones)
> - Clean modern typography, system fonts only
>
> No frameworks. Plain HTML + CSS + JavaScript in one file.

Press Enter. Claude builds the file in 30–60 seconds and writes `index.html` straight away.

---

## Step 4 — Open it in a browser

You don't need to find the file yourself — Claude can open it for you:

> Open `index.html` in my default browser.

If that doesn't work, open the file by hand:

<div data-os="mac">

Open Finder → click "Desktop" in the sidebar → open `claude-lab`, then the `mortgage-calc` folder → double-click `index.html`. It opens in your default browser.

</div>

<div data-os="windows">

Open File Explorer → click "Desktop" in the sidebar → open `claude-lab`, then `mortgage-calc` → double-click `index.html`. It opens in your default browser.

</div>

A browser tab opens with your calculator. Move the sliders. The result should update live. The binding-constraint line should change as different rules become the cap.

---

## Step 5 — Iterate by talking to Claude

You'll see things to fix. That's expected — the rules in `rules.md` were a first pass.

Examples of follow-ups you can just type:

> The "income multiplier" cap shows the wrong number when income is below €30k. Investigate and fix.

> Add a tooltip on each slider explaining what the input means in one sentence.

> The binding-constraint label is hard to read. Make it the same colour as the result figure and put it in a bordered pill.

Each follow-up is one prompt. Claude edits the same `index.html`. Refresh the browser to see the change. The loop is: build → look → tell Claude what's wrong → look again.

This loop is the actual skill — and it's the same loop a senior developer runs, only faster because they don't type the code.

### Make Claude prove the maths

A calculator that *looks* right and a calculator that *is* right are different things. Before you email it to anyone, paste:

> Prove the calculator's maths. Pick these inputs: income €40,000, existing debts €300/month, property €250,000, rate 3.5%. Compute all three caps by hand, step by step, showing the arithmetic — including the 25-year annuity formula for the debt-to-income cap. Then read the formula in `index.html` and confirm it produces the same number and names the same binding constraint. If they disagree, find the bug and fix it.

And for the *visual* side, Claude can check its own work too:

> Take a screenshot of `index.html` in a headless browser and look at it. Is anything overlapping, cut off, or unreadable? Fix what you find and screenshot again.

Claude can drive a browser, look at the pixels, and iterate — you don't have to be the only QA in the loop.

Once you're happy, email `index.html` to a colleague — they double-click and it opens in their browser. If you want to share it more broadly, that's where your manager + risk team come in. The prototype earns the conversation.

Half an hour. Six prompts. A working interactive tool that your colleagues can actually use. You didn't write a single line of code.

### Make returning easy with `CLAUDE.md`

You'll come back to this folder. A risk officer will ask "can we add a second-borrower row?" and you'll need Claude to remember the original design intent. Rename `rules.md` to `CLAUDE.md`:

```
mv rules.md CLAUDE.md
```

`CLAUDE.md` is the magic filename Claude Code reads automatically every time it starts in this folder. Next time you `cd ~/Desktop/claude-lab/mortgage-calc && claude --dangerously-skip-permissions`, Claude already knows the eligibility rules, the input fields, the NBG-ish styling — you can jump straight to *"add a second-borrower column"* without re-briefing.

---

## Step 6 — Level up — charts and a reverse gear

This use case is already interactive, so its level-up is about going from *calculator* to *conversation tool*. Two prompts, pick either or both:

> Add an amortisation chart under the result: monthly payment split into interest and principal over the 25 years, drawn on a `<canvas>` — still no external libraries, still one file. When a slider moves, the chart redraws.

> Add a "reverse mode" toggle: instead of income → max mortgage, the user enters the mortgage they want and the calculator shows the annual income that would be needed, holding the other inputs. Show which constraint drives the answer, same as forward mode.

Reverse mode is the one that changes meetings: a customer asks *"what would I need to earn for a €200k loan?"* and the answer is one slider away instead of "let me get back to you".

**The pattern to remember** — you built this by describing rules in plain English, and you extended it the same way. Any tool you can describe, Claude can build into a single double-clickable file. Start simple, iterate by talking.
