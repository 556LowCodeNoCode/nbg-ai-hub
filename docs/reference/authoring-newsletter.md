# Authoring a newsletter

This is a recurring two-file drop. The site picks it up automatically.

## The two files

For every newsletter, add **two** sibling files to `newsletters/`:

| File | Purpose |
|---|---|
| `<NN>-<slug>.md`   | Frontmatter only (metadata) — empty body. |
| `<NN>-<slug>.html` | The raw email HTML, kept verbatim. |

`<NN>` is the zero-padded issue number (`01`, `02`, …) and `<slug>` is a short kebab-case identifier. The two filenames must match exactly except for the extension — the page wiring looks up `<slug>.html` from the `.md`'s slug.

## Frontmatter shape

```yaml
---
type: newsletter
issue: 1
title: "NBG-GPT — 6 μήνες μαζί"
summary: "Έξι μήνες μετά την έναρξη του NBG-GPT — νέα μοντέλα (GPT 5.4, Gemini 3.1, Claude 4.6) και νέες δυνατότητες."
language: el                                # 'el' or 'en'
audience: both                              # 'beginner' | 'advanced' | 'both'
topics: [nbg-gpt, models, prompting]
internal: true
authored: "2026-06-08"                      # ISO date — used for the listing label (renders DD/MM/YYYY)
last_reviewed: "2026-06-08"
external_link: null
deeper_link: null
ai_summary: "1–2 sentence summary used by future search / AI tooling."
---
```

Zod validates the schema at build time (`site/src/content.config.ts` → `newsletters` collection). Missing or malformed fields fail the build with a named error — no silent fallback.

## What the page does

- `/newsletter/` is one single page — no per-issue routes.
- Left rail: every issue listed, newest first, format `DD/MM/YYYY | Title`.
- Right column: the selected issue's HTML rendered inside an `iframe srcdoc`. Newest auto-loads on visit.
- Clicking a left-rail item swaps the iframe to that issue and updates `window.location.hash` so the URL is shareable.
- The iframe auto-resizes to its content height so there's no inner scrollbar.

## Why an iframe

Email HTML uses generic class names like `.container`, `.cta`, `.hero-title`, `.px`, `.model-cell`. Rendering it as part of the page would either need every class scoped (lots of work, brittle) or risk style leakage. The iframe is total isolation in both directions and preserves the email design 1:1.

## Adding a new issue — the checklist

1. Drop `newsletters/<NN>-<slug>.html` — the email HTML.
2. Drop `newsletters/<NN>-<slug>.md` — fill in the frontmatter above. Empty body.
3. `node scripts/sync-doc-counts.mjs` to regenerate the AUTO block in SCOPE.md / CLAUDE.md.
4. Commit and push. The next deploy lists the new issue at the top of the rail.

That's it.
