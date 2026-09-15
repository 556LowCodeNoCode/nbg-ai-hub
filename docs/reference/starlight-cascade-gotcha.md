# Starlight unlayered-cascade gotcha

**TL;DR** — Starlight (and `agentnews-layout.css`) ship their CSS rules **outside any `@layer`**. Per the CSS cascade spec, unlayered rules beat anything inside any `@layer` block, regardless of declared layer order. Our `@layer nbg.components` rules therefore lose to Starlight in production builds — even when they appear to "win" locally because Vite's dev bundle happens to order CSS differently.

This document is the canonical record of the symptom, diagnosis, and fix pattern. Read this BEFORE building any new component that overrides Starlight chrome or styles markdown-rendered prose.

## The trap

```
@layer reset, tokens, starlight.base, starlight.core, starlight.components,
       nbg.primitives, nbg.components, nbg.utilities;
```

We declare a layer order in `site/src/styles/tokens/layers.css` that *looks* like our `nbg.components` rules should beat Starlight. They don't. Starlight's stylesheets are not wrapped in `@layer starlight.X { }` — they ship unlayered. **Unlayered > any-layered.**

The agentnews-layout.css file (project-internal but pre-redesign) has the same problem. It defines `.section { padding-block: ... !important }`, `.wrap { padding-inline: ... }`, etc., all unlayered. Any new component reusing those class names inherits whatever agentnews chose.

## Symptoms — looks-fine-locally / wrong-on-deploy

This file is the place to add each new incident as it's caught. Format: date — what looked wrong — which property lost the cascade.

- **2026-05-19** — Search trigger rendered at 40px/16px on live vs 32px/13px on local. `SplashAwareHeader.astro`. Property: `height` + `padding`.
- **2026-05-19** — `.sl-markdown-content h3` rendered at 29px (Starlight `--sl-text-h3`) on `/my-pins/` instead of 22px (our `--nbg-fs-xl`). Property: `font-size`.
- **2026-05-19** — `⌘K` keyboard hint reappeared inside the search button on live despite `display: none` locally. Property: `display`.
- **2026-05-27 (Day 1 / Foundations, round 1)** — body-prose `<blockquote>`, `<p>`, `<h3>`, `<code>` all reverted to Starlight defaults on deploy: blockquote gray-border instead of teal-accent, h3 weight 600 instead of 500, inline code rendered at 13px instead of 15.2px. Property: every cosmetic property of every `:global(<tag>)` rule.
- **2026-05-27 (round 2)** — same pages, structural spacing: `.day-layout` / `.foundation-layout` `padding-block` reset to 0, `.day-section__head` `margin-bottom` reset to 0, intro `<section class="section">` lost its inline `style="padding-block: 2rem"`. Visual symptom: vertical breathing room between intro paragraph and "STEPS / Install and pick a terminal" header collapsed to nothing. Property: layout `padding-block`, section-head `margin-bottom`, intro-section `padding-block`.
- **2026-05-27 (round 3)** — Day 1 + Foundations intro `<hr>` (from trailing `---` in markdown). Cascade goes the OTHER way: local browser uses user-agent default `margin-block: 32px 32px` on `<hr>`; deployed has `.sl-markdown-content hr` rule applying `16px / 0px`. Local intro renders 48px taller than deployed. Visual symptom: local has obvious empty whitespace below the intro paragraphs that deployed doesn't show. Fix: `.journey-intro :global(hr) { display: none !important }` — the separator adds no value in the docs-style layout anyway. **Lesson: cascade drift can manifest as local-is-LOOSER-than-deploy too, not just local-is-TIGHTER. Any user-agent default that Starlight overrides becomes a per-environment hazard.**
- **2026-06-11** — "Next use case" primary CTA (`.usecase-next__cta--primary`) rendered dark-on-teal in preview/production builds: Starlight's unlayered `a { color }` beat the layered `color: var(--nbg-color-fg-on-accent)`. Same latent bug found on `.skill-next__cta--primary` (skills detail) and `.router-card__cta--primary` (homepage). Property: `color` (stamped `background`/`border` while there). All seven accent-CTA surfaces probe-verified white-on-teal via puppeteer-core computed styles after the fix.

## Fix pattern — default posture

For any new component that styles either (a) Starlight chrome or (b) prose rendered through `.sl-markdown-content` (any `<Content />` from a content collection, any `set:html={renderedMd}`):

1. **`!important` on every property that must win.** Not just one — every one. Starlight tends to override many properties per element (font-size, font-weight, margin-block, color, background) and you only notice the missed one after deploy.

2. **Avoid the `.section` and `.wrap` class names where possible.** They're already claimed by `agentnews-layout.css` with `!important` rules baked in. Use a custom class (e.g. `.day-intro-section`, `.foundation-next`) instead. Even with `!important` you can't beat another `!important` of equal specificity that loads later — and Starlight/agentnews stylesheets load *after* yours in the production bundle.

3. **`:global(<tag>)` selectors targeting raw HTML tags inside markdown** (`p`, `blockquote`, `h3`, `code`, `pre`, `table`, `th`, `td`, `strong`, `ul`, `ol`, `li`) are always in cascade competition with `.sl-markdown-content <tag>`. Stamp `!important` on them at write-time, don't wait for production to surface the bug.

4. **Don't try to fix this by reordering `@layer` declarations or moving rules between layers.** Starlight isn't a layer participant; its rules sit above every layer regardless. Reordering changes nothing.

## How to diagnose quickly when this recurs

Memory file `feedback_starlight_unlayered.md` and the CLAUDE.md global "Visual verification for UI work" section both prescribe the same ladder. Short version:

```bash
# Step 1 — headless screenshot of both local and deploy
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --headless \
  --disable-gpu --window-size=1280,800 \
  --screenshot=/tmp/local.png http://localhost:4321/start-here/day-1/
# repeat with the live URL → /tmp/deployed.png — eyeball-diff them

# Step 2 — puppeteer getComputedStyle on the suspect element
cd /tmp && npm i --silent --no-save puppeteer
# write a probe script that compares props between local and deployed
```

The winning property on the deploy side, when it diverges from local, is the one to `!important`. If you see a Starlight signature in the matching rules (`:not(:where(.not-content *))`) — confirmed gotcha.

The CDP path (`CSS.getMatchedStylesForNode`) is overkill for normal recurrence; reach for it only when computed styles are mysterious.

## Wider remediation (deferred)

A future cleanup could either:
- Strip `agentnews-layout.css` entirely and rebuild the layout primitives inside `@layer nbg.components` from scratch, OR
- Add a build-time post-processor that wraps Starlight + agentnews CSS in `@layer starlight, agentnews;` so our layer order finally means something.

Both are larger projects. The default posture above is the load-bearing fix for now — and the canonical doc to point new components at.
