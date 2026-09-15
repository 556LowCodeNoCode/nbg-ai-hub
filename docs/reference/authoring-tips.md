---
doc: authoring-tips
audience: project contributors + Claude sessions
last_updated: 2026-05-29
related:
  - tips/ (the pillar this guide governs)
  - CLAUDE.md (project tone rule)
  - SCOPE.md ("Content at a glance" — tips count)
---

# Authoring a new tip

The standing rule for adding or rewriting an entry under `tips/`. Every contributor — human or Claude — must clear the beginner test below before merging.

This pillar exists for bank colleagues who are new to Claude Code. The "what I wish I knew a year ago" voice is load-bearing: it's why a newcomer reads a tip and walks away knowing what to do next, instead of knowing what a feature *is*. A tip that explains a concept without telling the reader **how to act on it** has failed the test.

## The beginner test (apply before merging any tip)

Read the tip with the eyes of someone who installed Claude Code yesterday. After they finish reading, can they answer:

1. **What is this thing?** (one-sentence mental model)
2. **When do I reach for it?** (the trigger / the situation)
3. **What do I do next?** (the concrete action — keystroke, prompt, command, or "ask Claude to do X")

If any of the three is missing, the tip isn't done.

The third one is the most commonly skipped. A tip on hooks that explains the JSON schema but never says *how a beginner makes their first hook* is incomplete. A tip on subagents that defines what they are but never shows how to scaffold one is incomplete. The fix is almost always: add an "ask Claude to do this for you" cue.

## The "ask Claude to do it for you" cue

For any tip that involves configuration, file format, or syntax (hooks, slash commands, subagents, CLAUDE.md edits, CLI installs, settings.json), include a short paragraph telling the reader they can describe the outcome and let Claude wire it up. Shape:

```markdown
## You don't have to write the [X] by hand — ask Claude

[one sentence framing why a beginner would be intimidated by the format]

> [a sample one-line prompt the reader can copy]

Claude [does the concrete steps], shows you the diff, and you stay in the "describe the outcome" lane.
```

Why this matters more than teaching the syntax: the hub's audience is colleagues who came to Claude Code to *not* memorise config formats. Telling them they have to learn the JSON schema misses the whole point of the assistant they're holding. The right takeaway from a hook tip is "hooks are for deterministic enforcement; ask Claude to add one when you need it", not "here is the matcher key syntax".

This does not mean *drop the syntax* — the worked snippet is still useful for the reader who wants to look under the hood. It means *bracket the syntax with an ask-Claude cue* so the beginner has a path that doesn't require parsing the snippet.

## Worked examples — when to include them

Not every tip needs one. The rule of thumb:

- **Tip is abstract advice** ("describe the business value, not the steps", "pin constraints not method") → include a Bad vs. Good example in the body. Most prompting tips already do this.
- **Tip introduces a new format or file** (hook config, slash command, subagent frontmatter) → include the full file snippet *and* an ask-Claude cue.
- **Tip is a single keystroke or single command** (`Esc`, `/clear`, `Shift+Tab`) → skip the worked example. The mechanic is the point; padding it dilutes the keystroke.

When in doubt, lean toward including one short example over none. Beginners read examples; they skim prose.

## Format the example as a collapsible only if it would distract from the body

Default: keep the example inline as a fenced code block or block-quote. The reader is already in the right place; making them click "show example" adds friction without benefit.

Reach for `<details><summary>` only when the example is genuinely long (10+ lines of JSON or YAML) and would visually break the flow of a tight tip. Most tips don't need this.

**Never** link to a downloadable file. The hub is read in a browser, in Claude Code, and in a plugin snapshot — none of which behave well with downloads. Inline the example as text.

## Tone

Plainspoken, opinionated, no marketing voice. Assume the reader is a smart colleague new to Claude Code. The hub-wide rule (see CLAUDE.md) applies to every tip:

- No AI-slop hedging ("you might consider possibly", "it could be useful to").
- No human-day estimates ("a week of work", "one sprint"). Frame scope as what gets done in what order.
- Lead with the rule or the keystroke, then explain. Don't bury the action in the third paragraph.

A useful self-check: read the tip out loud as if you were telling a colleague over coffee. If it sounds like a press release, rewrite.

## Frontmatter — the 10-key contract

Same shape as the existing `tips/*.md` entries. Required keys:

```yaml
---
type: tip
title: One sharp sentence — verb-first if possible
audience: beginner | advanced | both
topics: [prompting, workflow, context, control, safety]   # 1-2 of the canonical 5; see "Topic vocabulary" below
internal: false                  # tips are public unless they encode bank-internal policy
authored: "YYYY-MM-DD"           # quoted
last_reviewed: "YYYY-MM-DD"      # same as authored on first write
external_link: null              # canonical docs URL, or null
deeper_link: null                # in-hub deeper reference, or null
ai_summary: |
  Two or three sentences. Self-contained, no markdown. This is what the
  /hub-tips command surfaces and what the catalog card shows.
---
```

`audience` is consulted by the `AudienceFilter` component. Be honest — a tip on subagents is `advanced`; a tip on `Esc` is `beginner`.

### Topic vocabulary — closed set of five

The `topics` field is enforced by a Zod enum in `site/src/content.config.ts`. Only these five values pass the build:

| Topic | Use it for | Sample tips |
|---|---|---|
| `prompting` | How to ask Claude — phrasing, structure, briefing, corrections | bad-vs-good openers, briefing template, one-thing-per-prompt |
| `workflow` | Driving Claude Code — plan-first, slash commands, sessions, subagents, hooks, CLI tools | plan-first, slash-commands, subagents, resume-session |
| `context` | Keeping Claude focused — `/compact`, `/clear`, CLAUDE.md, project hygiene, sessions | compact-and-clear, project-hygiene, claudemd-worked-example |
| `control` | Putting yourself back in the driver seat — Esc, permission modes, `--dangerously-skip-permissions` | esc-to-stop, permission-modes |
| `safety` | Bank-data handling, compliance, review-before-accept | azure-openai-for-bank-data, always-review-changes |

Each tip should declare **1-2** topics. Multi-tagging is fine when a tip genuinely lives on the seam (e.g. `permission-modes` carries `[control, workflow]`); the cluster bucket on `/tips/` uses first-match order, the topic chip filter ORs across the array.

**Don't add audience-coded topics** (`basics`, `advanced`, `fundamentals`) — that's what the `audience` field is for. **Don't add singleton labels** (e.g. `permissions`, `corrections`, `commands`, `integrations`) — they fragment the chip strip with one-tip chips. Fold them into the canonical five.

## Workflow checklist (do this every time)

1. Apply the beginner test to your draft. Rewrite until all three questions are answered.
2. If the tip touches configuration / file format / syntax: add the ask-Claude cue.
3. Add the worked example if the rule of thumb above says you should.
4. Write the frontmatter. `ai_summary` is the catalog blurb — make it earn its line.
5. Run `node scripts/sync-doc-counts.mjs` (the tip count in CLAUDE.md + SCOPE.md is CI-enforced).
6. `cd site && npm run build` to confirm the schema accepts the file. Zod errors surface here.
7. Open the tip in the dev server (`npm run dev`, then `/tips/<slug>/`) and read it once more, end to end. Catches the tone slip you wrote at 11pm.

## Forward pattern for the future

When a contributor opens a PR adding a tip, reviewers should ask one question first: *"Does a beginner know what to do after reading this?"* If the answer is "they know what it is, but I don't think they'd know what to type next" — the PR is not yet ready. Send it back with a pointer to this doc.

This is the load-bearing standing rule. The voice, the tone, the schema — those are downstream of it. Get the beginner test right; the rest tends to follow.
