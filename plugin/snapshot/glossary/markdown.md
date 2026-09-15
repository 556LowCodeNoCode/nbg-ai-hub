---
type: glossary
title: Markdown
audience: beginner
topics: [authoring, formats]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: "https://www.markdownguide.org/basic-syntax/"
deeper_link: null
ai_summary: Markdown is a plain-text format for writing prose with light formatting — headings, lists, links, code blocks — using a handful of punctuation conventions instead of HTML tags. Every content file in this repo is a `.md`. Astro converts it to HTML at build time, and that HTML is what readers see in the browser.
tldr: "A simple way to format text using symbols like ** for bold or # for headings. Plain text you can read raw. Used everywhere on the web."
aliases: ["MD"]
---

**Markdown** is a plain-text format for writing prose with light formatting. You write `# Heading` instead of `<h1>Heading</h1>`, and a markdown processor converts it to HTML at build time. The raw `.md` file stays diff-friendly and readable; the rendered HTML is what your browser displays.

Every content file in this repo — every glossary term, tip, skill, journey, news item — is a `.md` file. Astro reads them at build time, runs them through its markdown pipeline, and emits a static HTML page per file. You never edit HTML; you edit markdown.

**The syntax you actually need on day one:**

- Headings: `# H1`, `## H2`, `### H3`
- Bold: `**bold**`; italic: `*italic*`
- Inline code: `` `code` ``
- Links: `[link text](https://example.com)`
- Lists: lines starting with `-` or `1.`
- Fenced code blocks: three backticks on a line of their own, language name after the opening fence:

```ts
const greeting = 'hello';
```

That covers maybe 90% of what you'll write. Everything else (tables, footnotes, images, blockquotes) you can look up when you need it.

The thing to remember: **readers see the rendered HTML, not your markdown.** That `**bold**` becomes a bold word in the browser — they never see the asterisks.
