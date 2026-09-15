---
type: glossary
title: Frontmatter
audience: beginner
topics: [authoring, conventions]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: null
deeper_link: null
ai_summary: Frontmatter is the YAML block fenced by `---` at the top of a markdown file that carries metadata about the file (title, date, audience, tags). The body below is the prose; the frontmatter is the structured data the build pipeline reads. Every content file in this repo opens with one.
tldr: "The little block of settings at the top of a markdown file, between two --- lines. Stores info like title, date, and tags."
aliases: ["YAML frontmatter", "front-matter", "front matter"]
---

**Frontmatter** is the block of metadata that sits at the very top of a markdown file, fenced by a pair of `---` lines. Everything between the fences is [YAML](/glossary/#yaml); everything after is the prose body. It's how a plain `.md` file carries structured data alongside its content.

You'll see frontmatter on every content file in this repo — `glossary/`, `tips/`, `skills/`, `journeys/`, `news/published/`. Here's a minimal example:

```yaml
---
type: glossary
title: Frontmatter
audience: beginner
authored: "2026-05-25"
internal: false
---
```

Why we use it:

- **Build-time validation.** The Astro site reads every frontmatter block through a Zod schema. A missing or mistyped field fails the build, not silently in production.
- **Structured query.** Pages can filter "all beginner tips" or "all glossary terms tagged `claude-code`" because the metadata is machine-readable.
- **Search and sort.** Pagefind indexes the body; the frontmatter drives ordering, badges, and audience filtering.

If you're authoring a new entry, copy the frontmatter from a neighbouring file and edit the values — that's the fastest way to stay on-schema.
