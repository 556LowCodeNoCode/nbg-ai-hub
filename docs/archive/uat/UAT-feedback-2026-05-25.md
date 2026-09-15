# NBG AI Hub — UAT feedback

**Tester:** A colleague who knows nothing about this project, browsing as if I just got the link in a Teams message.
**Date:** 2026-05-25
**Method:** Visual scroll-through only. I did not look at the code. I clicked things a colleague would click. I tested at desktop (1280px), tablet (820px), and phone (420px).
**Brief I was given:** *"Be honest, focus on what's bad, don't praise me."* That's what this is.

---

## TL;DR — what I would tell you over coffee

The site **looks** considered. The typography is nice, the layout is clean, you clearly cared about it. But once I tried to *use* it like a real first-timer, three things hit me, in this order:

1. **I can't actually read most of the content.** The Tips page shows me 14 little card blurbs in a 3-column grid. None of them are clickable. The Skills page is the same. So I get a 2-line tease for each item and nowhere to go. **This is the single biggest problem on the site.**
2. **The mobile experience is broken.** Half of every line of text on the homepage is cut off on the right edge of my phone. I would close the tab.
3. **I don't know what this site *is* until I read the second sentence carefully.** The headline "What I wish I knew sooner about Claude Code" is charming but doesn't tell me whether this is an internal NBG resource, a personal blog, a marketing site, or what. The NBG logo at top-left next to "NBG AI Hub" implies official — but the handwritten-italic vibe says personal. The two signals fight.

If you fix only those three before sending the link, the site goes from "this is half-done" to "this is usable." Everything else below is sequenced as I noticed it.

---

## Critical — fix before you send the link

### 1. Tips and Skills cards go nowhere

| What I see | What I expected |
|---|---|
| 14 tip cards on `/tips/` with 2-line summaries and a "Sign in to pin" link below each | Clicking the card title takes me to the full tip with examples and explanation |
| Same on `/skills/` — 9 skills, summary only, "Sign in to pin" | Click → full skill page with install instructions, when-to-use, screenshots |
| Visiting `/tips/prompt-six-rules/` directly → **404** | A real article |
| Same for any skill: `/skills/claudemd/` → **404** | A real article |
| Cards from the homepage point to `/tips/#esc-to-stop` etc. — but the anchor doesn't exist; you just land at the top of the listing | The anchor scrolls to the card; better, takes me to a full page |

**Why this is the worst bug:** a knowledge hub whose content you cannot actually open is not a knowledge hub. From a first-time visitor's perspective, the site is a beautifully-typeset index of articles that don't exist. After two or three clicks I would assume the site is unfinished and not bother again.

**The "Sign in to pin" call-to-action on every single card makes it worse** — it implies the *only* action available on a tip is to bookmark it, which is absurd before I've ever read one.

### 2. Mobile horizontal overflow

On a 420px-wide phone screen, the homepage headline "What I wish I knew sooner about Claude Code." extends past the right edge — I see "What I wish I knew sooner about *Claude Code.*" with the last few letters chopped. Same for the lede paragraph. Same for the two router cards underneath ("Start with Foundations" / "Jump straight in"). The grid columns under that look like they overflow too.

On a phone I would screenshot this and send it back to whoever shared the link with the caption *"is this broken?"*

### 3. Detail pages return 404 even from direct URLs

Confirmed `/tips/<id>/` → 404 and `/skills/<id>/` → 404 across every entry I tried. Even if you don't link them from the listing, anyone who saw a URL pasted in chat would dead-end.

### 4. The homepage doesn't tell me what NBG AI Hub *is*

I read the headline. I read the lede ("A practical guide to Claude Code at NBG"). I still don't know:

- **Who this is for.** "Bank colleagues"? Everyone? External readers?
- **Who built it.** A team? One person? Officially blessed by NBG?
- **Whether the content is bank-approved.** As a business colleague I'd worry — can I share this with my manager? Is it sanctioned?
- **What "Claude Code" even is.** Yes, you have a glossary, and yes, the term is auto-linked (nice touch). But the headline assumes I already know what Claude Code is. I don't, on day zero.

The two-door landing ("Newcomer" vs "Already using it") is a great idea, but the cards don't visually scream "different audience" — they look like twin boxes. A newcomer might not realise they're meant to go *left*, not right.

---

## High — would visibly improve the next visit

### 5. Tips listing is a wall of dense text

14 cards × ~30 words each × 3 columns × no images = your eye doesn't know where to land. There's a filter row (`Beginner / Advanced / Both`) but I don't know what changes when I click them — they look like passive labels, not interactive buttons. And "Both" as a filter option is confusing — I expected the default to *be* both.

What works better elsewhere: a single-column list of titles with one-line teasers, grouped by section (Prompting / Survival keys / Context discipline), each title clickable. Like Stripe Docs or a blog index.

### 6. Skills listing — same density problem, plus jargon

The "Skill ID" prefix (`/claudemd`, `/commit-work`, `/database-schema-designer`) appears under each title. A non-developer doesn't know what to do with `/claudemd`. To me that reads like a file path or a Linux command — both of which make me feel out of my depth. If you want to keep the slash-prefix (because it really is the slash command), label the area with "Type this in Claude:" so I understand the slash is a command-line cue, not a URL.

The blue/teal "internal" / "beginner" badges are unexplained. Internal to whom? Beginner relative to what?

### 7. "Sign in" gate on My Pins is too hostile

The flow is: click "My Pins" → "Sign in to see your pins" → click Sign in → asked to paste a *GitHub Personal Access Token* with `gist` scope, generated at a link.

For a non-developer bank colleague this is **dead on arrival**. Three out of four people in our office won't have a GitHub account, won't know what a PAT is, won't be willing to paste a credential into a site they've just opened. Even for the developers, "paste your PAT" looks like a phishing flow if you don't know the project.

You should either: (a) hide My Pins entirely until someone has signed in elsewhere, (b) explain on the sign-in card what a PAT is and why the site needs it, with a short safety paragraph, or (c) move pinning to client-side `localStorage` so anyone can pin without an account, and treat gist-backed sync as a power-user upgrade.

### 8. The serif italic + handwriting in headlines reads "personal blog," not "company knowledge base"

This is a taste call so weigh it accordingly. The italic *Claude Code.*, *start here if it's all new.*, *Patterns I keep reaching for.* — they look like someone's medium.com essay collection. For an *internal NBG* tool, my colleagues from business will read those headlines and assume this isn't an official source. They'll think it's one engineer's side project, not something to bookmark.

If you want it to feel official, the serif italic at headline scale needs to be balanced by at least one strong "this is NBG infrastructure" signal — an NBG-branded header strip, a "Maintained by [team name]" footer line, a version stamp, *something*.

### 9. "News ↗" in the nav is confusing

The arrow tells me it's external, fine. But what is it? An NBG news feed? Claude Code news? The world's news? I clicked it expecting a section of the site and got teleported to a completely different domain (`biks2013.github.io/AgentNews/`). No warning, no breadcrumb, no "you are now leaving NBG AI Hub."

This is also a brand integrity issue — if a colleague clicks News, lands on AgentNews, and then sends *that* link to others, you've leaked traffic away from the hub you're trying to build.

At minimum: tooltip or one-line "An external news feed curated by a colleague" on hover. Better: render it inside the site, even as an iframe or a copy of the same content.

### 10. Glossary inconsistency

The glossary is the strongest pillar — terms are auto-linked everywhere, the hover tooltips are slick. But the entries themselves are wildly uneven in length and structure:

- "Agent" has a **table** comparing chatbot vs subagent.
- "Anthropic" is one paragraph.
- "API" has a bulleted list.
- "Claude Code" has a comparison table with ChatGPT.
- "Branch" is two short lines.

To a beginner, the inconsistent structure makes some terms look fully-explained and others look like stubs. Pick one shape (e.g. *"In one line / In detail / Example / Related"*) and force every entry into it, even if a few sections are short.

### 11. Foundations page is a wall of prose

I opened `/start-here/foundations/` and saw two long paragraphs, then a table, then another wall of text. There are no subheading visuals, no images, no diagrams. For a non-IT colleague this looks like a textbook chapter. Adding even one diagram ("here's how the pieces fit: terminal → Claude Code → Anthropic API → your project") would do more for comprehension than 500 words.

### 12. Day 1 — Step 5 is jarring

The five-step chip row is great — clear progress, clear destinations. But Step 5 "Get a GitHub account" comes after the survival keys / CLAUDE.md material. As a complete newcomer I'd expect "Get a GitHub account" to be Step 1 — you can't even *install* Claude Code at NBG without one (right? or not? — the page doesn't make this clear).

Either move it up, or rename it to something that signals it's optional / for later ("Step 5 — Make it stick: get a GitHub account so we can save your progress").

---

## Medium — small annoyances that add up

### 13. "Sign in to pin" repeats too much

Every card in `/tips/`, `/skills/`, `/glossary/` shows a "Sign in to pin" link. On the Tips page I count fourteen of them on one screen. They're visual noise — they all say the same thing and they all point to the same place. Show them once at the top of the page, or only on hover.

### 14. The keyboard shortcut hint `⌘K` in the search bar

Two issues. (a) Windows users at the bank probably outnumber Mac users — for them, the hint should be `Ctrl + K`. (b) The search results — I tried `q=tips` and `q=esc` — show *nothing on screen until you click the bar*. From the screenshot it just looks like a styled search input.

### 15. The print icon next to "Sign in"

There's a small printer icon in the top-right of every page next to the Sign in button. I didn't recognise it on first glance — I thought it was a save-to-PDF button, or a desktop-app launcher. The icon needs a label or a tooltip.

### 16. Theme toggle hidden by default

I had to look for it. On a corporate device the default theme is whatever the OS prefers, but the toggle to flip it is squirrelled away. Not blocking, just unfound.

### 17. Filter chip row on Tips and Skills doesn't visibly do anything

"Beginner / Advanced / Both" — clicking them should dim or hide cards of the wrong audience, but the change is so subtle (or absent?) that I couldn't tell whether the click registered. If the filters do something, they need a clear visible state. If they don't, take them out.

### 18. Glossary alphabet rail invisible on smaller screens

On the desktop screenshot I can see the filter input but no visible A-Z jump rail (which I'd expect from the scope notes). On tablet/mobile it's gone entirely. A 36-term glossary really wants a jump-to-letter affordance — at minimum on desktop.

### 19. "Submit a Skill" form errors look like dev console output

The validation messages render as red lines below each field with messages like:

> *title must be a non-empty string*
> *skill_id must match ^[a-z0-9-]+$*

That's a Zod error message exposed verbatim. Real users see regex and shut down. Translate them: *"Title is required"* / *"Skill ID can only contain lowercase letters, numbers, and dashes."*

### 20. The Contribute page is hidden

I only found `/contribute/` because I checked the sitemap. It's not in the nav. The "Submit a Skill" page on the other hand is also off-nav but linked from Contribute. The whole contribution flow is undiscoverable to anyone who didn't already know the link.

If you're treating contribute-the-page as an internal tool, it should at least live behind a small "Want to contribute?" link in the footer. Right now it's an orphan.

### 21. Footer doesn't establish the project

Across every page I scrolled to the footer expecting "Built by [team], NBG Athens, 2026 — questions: chomovazuzana@…" and instead got a thin grey line with `< Previous` / `Next >` and a tiny "edit on GitHub" link. For an internal corporate site the footer is the last place to plant your flag — owner, contact, last-updated-on, version.

---

## Low — taste-level, ignore if you disagree

### 22. Two router cards on the homepage are too similar visually

Newcomer card is teal-tinted, Already-using-it card is white. The size, the spacing, the typography all look identical. They could be more obviously different — like, the newcomer card with a bigger badge and a single tall CTA button, vs the experienced card with a row of small chip-links. Right now they're equivalent in weight which means a newcomer doesn't know they're being pushed toward the left one.

### 23. "9 entries", "14 tips" — counts feel proud of themselves

Showing "9 entries" / "14 tips" next to each pillar reads like a brag. *"Look how many entries we have!"* It's a feature-completeness signal for the team, not a value signal for the visitor. If the visitor doesn't care that there are 14 tips (and they don't, they care whether *their* tip is in there), drop the count, or move it small and grey.

### 24. Article previews on the homepage truncate mid-sentence

Several preview blocks end with `…` mid-thought. *"…and is mostly painless because…"*, *"…how to manage the cost…"*, *"…what frequent noise looks like…"*. With nowhere to click to "read more," the ellipsis becomes a tease that never pays off.

### 25. The site has no images at all

Not one. Not a screenshot of Claude Code in the terminal. Not a diagram of where Claude Code fits with the API and the project folder. Not a photo of a person typing. For a knowledge hub aimed at non-IT colleagues, all-prose is a hostile choice — even a single hero-image screenshot of a real terminal session showing Claude editing code would do more for "what is this?" than three paragraphs of copy.

### 26. The headline `What I wish I knew sooner about Claude Code.` — full stop is doing too much work

Stylistically the trailing period is a design choice. It works once. But the same `.` shows up in *Foundations — start here if it's all new.*, in *Patterns I keep reaching for.*, in *The Claude Code vocabulary.* — across every page. After the third page it feels like a tic.

---

## What's actually good (I was told not to praise — keeping this short for context)

- The glossary auto-link + hover tooltip is genuinely the strongest feature on the site. Hovering "MCP" in the middle of a Tips article and getting a one-line definition is exactly the affordance a beginner needs.
- The Day 1 chip-row navigation with active-section highlighting is the best part of the journeys.
- Typography choices are coherent and the contrast/spacing of body text is comfortable to read on desktop.
- The two-door landing concept (Newcomer / Already using it) is the right *idea*, even if the execution needs more visual weight.

These three are why I think the site is salvageable — fix the critical bugs and the foundation is solid.

---

## Suggested priority order

If you want a sequenced fix-list before sending the link tomorrow:

1. **Make every tip and skill have a real detail page** that you can navigate to from the listing. *This is the deal-breaker.*
2. **Fix mobile horizontal overflow.** Half the people opening the link will do it from their phone.
3. **Add a one-sentence "what this is" block above the headline** ("Internal NBG resource for colleagues onboarding to Claude Code — maintained by [team]"). It costs nothing and removes 80% of the "is this real?" anxiety.
4. **De-jargon the Skill cards** — relabel slash IDs, explain the badges.
5. **Soften the My Pins gate** — explain what a PAT is, or fall back to local-only pinning for non-GitHub users.
6. **Make the Tips and Skills filter chips visibly do something** or remove them.
7. Everything else above, in roughly the order it appears.

---

*That's the honest review you asked for. The site has good bones; the gaps are mostly about treating the listing as the article instead of the index. Worth a second pass before you share the link.*
