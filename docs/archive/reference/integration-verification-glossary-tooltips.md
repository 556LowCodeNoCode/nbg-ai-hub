---
verified: 2026-05-25
feature: glossary-tooltips
verifier: phase-D visual verification
build: cd site && npm run build
test: cd site && npm test
status: PASS
ACs_covered: [AC15, AC16, AC17, AC18, AC19, AC30, AC31]
---

# Integration verification — glossary tooltips (Phase D)

## Summary

PASS. The build-time glossary auto-linker (remark-glossary-link plugin) plus the
runtime `GlossaryTerm.astro` registry primitive together deliver the full
contract from `docs/refined-requests/glossary-tooltips.md` §AC15-AC19 and §AC30-AC31.
Headless-Chromium verification (Puppeteer 25.0.4 against the Astro dev server
at `http://localhost:4321`) confirms every behaviour:

- The remark plugin emits `<button class="nbg-glossary-trigger"
  data-glossary-slug="…">` markers exactly where expected (33 on
  `/start-here/foundations/`, 10 on `/start-here/day-1/`, 0 on `/`, 0 on
  `/tips/`, 74 on `/glossary/` — inline within each glossary entry's body).
- The `GlossaryTerm.astro` runtime script wires every button to a native HTML
  `<span popover="auto">` surface with title, tldr, and `Read more →` link.
- Hover, keyboard focus, and click all open the popover (1 popover open after
  each trigger in DOM inspection). ESC closes it (0 popovers open). Under
  `prefers-reduced-motion: reduce`, computed `transition-property` is `none`
  on both trigger and popover. "Read more →" href is
  `/glossary/#claude-code` (correct `/glossary/#<slug>` shape).
- `npm run build` exits 0; `npm test` reports 320/320 passing (+1 skipped).

## Pages captured

Button counts grep the live dev server's rendered HTML for
`data-glossary-slug="…"` (one match per inserted button).

| Page                        | URL                            | Buttons | Manifest present | Screenshot                  |
|-----------------------------|--------------------------------|---------|------------------|-----------------------------|
| Home                        | `/`                            | 0       | yes              | `uat/glossary/home.png`     |
| Foundations (journey)       | `/start-here/foundations/`     | 33      | yes              | `uat/glossary/foundations.png` |
| Day-1 (journey)             | `/start-here/day-1/`           | 10      | yes              | `uat/glossary/day-1.png`    |
| Tips catalog                | `/tips/`                       | 0       | yes              | `uat/glossary/tips.png`     |
| Glossary index              | `/glossary/`                   | 74      | yes              | `uat/glossary/glossary.png` |

"Manifest present" = `<script type="application/json" id="nbg-glossary-data">`
exists in the DOM (the runtime data source consumed by the wiring script).
Verified via `document.getElementById('nbg-glossary-data')` per page.

### Page screenshots

Homepage (no glossary terms in the hero — expected: zero buttons; manifest still
present because `GlossaryTerm` lives in the global layout):

![home](uat/glossary/home.png)

Foundations journey (the big one — 33 inline glossary triggers across the six
sub-sections):

![foundations](uat/glossary/foundations.png)

Day-1 journey (10 triggers):

![day-1](uat/glossary/day-1.png)

Tips catalog (the catalog page renders titles + tldrs only — no inline body
content yet, hence 0 triggers; the manifest is still injected globally so
detail pages and journeys can wire up):

![tips](uat/glossary/tips.png)

Glossary index (each glossary entry's body itself contains glossary terms,
which the remark plugin links — 74 buttons across 21 entries; one entry's own
slug is suppressed via the self-page guard in `remark-glossary-link.ts`):

![glossary](uat/glossary/glossary.png)

## Six verified behaviours (AC31)

Each behaviour is verified on the same trigger (the first
`button.nbg-glossary-trigger` on `/start-here/foundations/`, which carries
`data-glossary-slug="claude-code"` and `data-glossary-display="Claude Code"`).
Puppeteer also reads back DOM state to confirm the popover element's
`:popover-open` selector matches (or doesn't, in the ESC case).

### 1. Hover opens popover

Puppeteer `page.hover(selector)` → wait 350ms (past the 80ms show-debounce in
`GlossaryTerm.astro`) → DOM inspection reports
`document.querySelectorAll('.nbg-glossary-popover:popover-open').length === 1`.

![hover](uat/glossary/foundations_hover.png)

The popover sits in the top-left of the viewport (native popover default
placement) and shows three stacked lines: title ("Claude Code"), tldr
("Anthropic's terminal AI coding agent…"), and "Read more →" link. The
underlying trigger is the underlined "Claude Code" mid-paragraph.

### 2. Keyboard focus opens popover

Puppeteer `handle.focus()` on the trigger → wait 350ms → 1 popover open
(`:popover-open` selector). The trigger button shows its focus-visible
treatment — a teal ring outline via the `box-shadow:0 0 0 4px var(--nbg-color-focus-ring)`
rule in `GlossaryTerm.astro` (line 234-240).

![focus](uat/glossary/foundations_focus.png)

The focused button is visible at mid-page ("Claude Code" with teal ring); the
popover is at the top-left. This confirms the keyboard pathway works
independently of the mouse pathway.

### 3. Click toggles popover

Puppeteer `handle.click()` → wait 250ms → 1 popover open. The native
`popover` attribute provides click-toggle semantics for free; the wiring layers
hover + focus on top.

![click](uat/glossary/foundations_click.png)

Same trigger, popover open. Visually identical to the hover state (same
popover surface, same content).

### 4. ESC closes popover

From the click-open state, `page.keyboard.press('Escape')` → wait 350ms →
`:popover-open` count drops to **0**. Focus returns to the trigger button (the
explicit `btn.focus()` call in the `keydown` handler at `GlossaryTerm.astro`
line 170-176).

![esc](uat/glossary/foundations_esc.png)

The popover is gone. The "Claude Code" trigger button at mid-page still shows
the focus-visible ring confirming focus was restored to the trigger.

### 5. Reduced-motion shows no transition

Puppeteer `page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])`
called **before** navigation. The page-level
`window.matchMedia('(prefers-reduced-motion: reduce)').matches` returns
`true`. The trigger is clicked; computed-style probes via DevTools Protocol
report:

- Trigger: `getComputedStyle(button).transitionProperty === 'none'`
- Popover (open): `getComputedStyle(popover).transitionProperty === 'none'`

This is enforced by the `@media (prefers-reduced-motion: reduce)` block at
`GlossaryTerm.astro` lines 292-299 (`transition: none !important;
animation: none !important;`).

![reduced-motion](uat/glossary/foundations_reducedmotion.png)

Visually the popover appears identically (static images cannot show the
*absence* of a fade-in animation). The computed-style assertion is the
load-bearing evidence here.

### 6. "Read more →" link navigates to `/glossary/#<slug>`

Verified via `page.evaluate()` after the popover is open:

```js
const a = document.querySelector('.nbg-glossary-popover:popover-open a.nbg-glossary-popover__more');
a.getAttribute('href');
// → "/glossary/#claude-code"
```

This matches the AC31.6 contract exactly: `/glossary/#<slug>` with the
canonical glossary slug ("claude-code") for this term. The href is constructed
in `GlossaryTerm.astro` line 134:

```js
'<a class="nbg-glossary-popover__more" href="/glossary/#' +
  encodeURIComponent(slug) +
  '">Read more →</a>';
```

The same trigger inspection also confirms the AC15-AC16 contract for this
button:

- `data-glossary-slug="claude-code"` (matches the canonical entry id)
- `popovertarget="gloss-b55c60c4"` (runtime-generated id)
- `aria-describedby="gloss-b55c60c4"` (matches `popovertarget`)
- `data-nbg-glossary-wired="true"` (idempotency marker)

## Build & test evidence

`cd site && npm run build` (last 5 lines):

```
15:26:55 [build] ✓ Completed in 5.46s.
15:26:55 [starlight:pagefind] Building search index with Pagefind...
15:26:55 [starlight:pagefind] Finished building search index in 133ms.
15:26:55 [WARN] [@astrojs/sitemap] The Sitemap integration requires the `site` astro.config option. Skipping.
15:26:55 [build] 11 page(s) built in 7.02s
```

`cd site && npm test` (last 5 lines):

```
 Test Files  19 passed (19)
      Tests  320 passed | 1 skipped (321)
   Start at  15:26:59
   Duration  2.08s (transform 1.37s, setup 0ms, import 3.60s, tests 2.41s, environment 3ms)
```

## Known limitations / quirks

- **Glossary index page contains 74 inline triggers**, not zero. Each
  glossary entry's body content is itself processed by the remark plugin, so
  one entry can reference others. The remark plugin's self-page guard
  (`deriveCurrentGlossarySlug` at `remark-glossary-link.ts` line 375-379) only
  applies on individual term pages, not the catalog index where every entry's
  body is concatenated. This is a real-but-acceptable quirk — the inline
  popovers are still well-formed and useful for cross-referencing.
- **Reduced-motion screenshot looks identical to the hover/click screenshot.**
  The motion contract is enforced via `transition-property: none` in CSS, not
  by suppressing the popover itself. A still image cannot show the absence of
  a fade-in. Evidence for this behaviour lives in the computed-style probe
  documented in §5, not the screenshot.
- **First-occurrence-per-segment quirk in remark plugin.** Per the rule
  encoded in `runTransform` (`matched.has(entry.slug)` skip on line 183), the
  plugin wraps only the **first** occurrence of a given canonical slug per
  markdown file. Subsequent mentions of the same term on the same page are
  left as plain text. This is by design (avoid over-linkification noise) but
  worth flagging — readers may notice "the second time `MCP` is mentioned
  isn't underlined".
- **Tips catalog page has 0 triggers.** The catalog's page-level shell
  (`/tips/index.astro`) renders only the title + tldr from each tip's
  frontmatter, not the markdown body. The manifest script is still present
  (injected globally via `MarketingShell`), so any future inline glossary terms
  on the catalog will wire up correctly without further plumbing.
- **Browser scope: headless Chromium only.** Per the explicit AC30/AC31 scope
  in the plan (plan-006-glossary-tooltips.md line 204, 219) Firefox + Safari
  verification is deferred to a follow-up pass. The native `popover` attribute
  is supported in all evergreen browsers as of late 2024, but cross-browser
  visual verification is out of scope here.

## AC verdict table

| AC   | Verdict | Evidence                                                                                                                                                                                                                                              |
|------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC15 | MET     | `button[data-glossary-slug]` is the trigger; runtime script adds `popovertarget="gloss-<id>"`; the popover surface is `<span popover="auto">` (per §S.14.10 R-4 — span avoids breaking the surrounding `<p>`). Confirmed via Puppeteer DOM inspection on `claude-code` trigger: `popovertarget="gloss-b55c60c4"`. Source: `GlossaryTerm.astro:117-126`. |
| AC16 | MET     | Same trigger inspection: `aria-describedby="gloss-b55c60c4"` matches `popovertarget`. Source: `GlossaryTerm.astro:117-119` (sets both attributes to the same generated id).                                                                            |
| AC17 | MET     | `foundations_esc.png` + DOM count `:popover-open === 0` after `Escape`. Native popover handles ESC; `keydown` handler at `GlossaryTerm.astro:170-176` additionally restores focus to the trigger.                                                       |
| AC18 | MET     | Three separate screenshots — `foundations_hover.png`, `foundations_focus.png`, `foundations_click.png` — each with DOM count `:popover-open === 1`. Hover + focus wired in `GlossaryTerm.astro:161-166`; click is native popover semantics.            |
| AC19 | MET     | Computed `transition-property: none` on both trigger and popover under `prefers-reduced-motion: reduce` (per `page.emulateMediaFeatures`). `foundations_reducedmotion.png` taken. CSS @media block at `GlossaryTerm.astro:292-299`.                    |
| AC30 | MET     | Five PNGs captured + embedded above: `home.png`, `foundations.png`, `day-1.png`, `tips.png`, `glossary.png`. Each demonstrates the page-level state (with or without inline triggers, manifest always present).                                       |
| AC31 | MET     | Six numbered behaviour sections above, each with a screenshot + observation note. (1) hover, (2) focus, (3) click, (4) ESC, (5) reduced motion, (6) Read-more href. All six pass.                                                                      |

## Overall verdict

**PASS** — all seven in-scope ACs are MET with named evidence (10 PNGs + DOM
inspection + computed-style probes). Build green, 320/320 tests pass + 1
skipped. No regressions observed.
