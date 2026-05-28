---
type: tip
title: When Claude does something wrong, add a line to CLAUDE.md
audience: beginner
topics: [workflow, fundamentals]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: null
deeper_link: null
ai_summary: Boris Cherny's (Claude Code's creator) golden rule — every time Claude makes the same mistake twice, add a one-liner to CLAUDE.md so it doesn't make it a third time. The file grows as your project's tribal knowledge gets written down.
---

The most underrated habit in Claude Code is also the simplest. Boris Cherny — who built Claude Code — explained his team's rule like this:

> Anytime we see Claude do something incorrectly, we add it to CLAUDE.md so it doesn't repeat next time.

That's the whole tip.

What it looks like in practice:

- Claude keeps creating files in `src/lib/` when they belong in `src/services/`. Add to CLAUDE.md: *"New business logic lives in `src/services/`, not `src/lib/`. `lib/` is reserved for stateless helpers."*
- Claude keeps using `let` where the team writes `const`. Add: *"Prefer `const` for everything; `let` only when the variable is genuinely reassigned."*
- Claude keeps logging customer IDs in plain text. Add: *"Customer IDs (`cust_*`) are PII. Use `redactCustId()` from `src/lib/log.ts`."*

Each line is short. Each line replaces a correction you would otherwise type every session.

Two rules that keep this from bloating:

- **One line per rule.** If the rule needs five lines of explanation, it probably belongs in a real doc (`docs/conventions.md`), referenced from CLAUDE.md by one line. The CLAUDE.md is the index, not the encyclopedia.
- **Delete rules that no longer apply.** If you moved the file, changed the convention, or fixed the underlying bug — drop the line. Stale rules are worse than missing ones because Claude follows them anyway.

CLAUDE.md is shared (it's in git). When you write down a rule, you're teaching the next colleague too. The file is the team's collective memory written in a form Claude can read.

Pair this with the *Worked CLAUDE.md example* tip for the shape, and the *Keep CLAUDE.md clean* tip for what to trim.
