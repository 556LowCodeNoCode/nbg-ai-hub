---
investigation: agentnews-aesthetic-match
target_aesthetic_source: https://biks2013.github.io/AgentNews/
primary_source_files:
  - docs/research/agentnews-source/home.html
  - docs/research/agentnews-source/home-inline-styles.css
  - docs/research/agentnews-source/sample-article.html
codebase_scan: docs/reference/codebase-scan-agentnews-aesthetic.md
refined_request: docs/refined-requests/agentnews-aesthetic-match.md
recommendation: direct-retune-of-three-tier-tokens + lift-agentnews-class-names-as-second-layer
research_needed: No
status: complete
---

# Investigation — AgentNews aesthetic match

The AgentNews homepage (`https://biks2013.github.io/AgentNews/`) renders its entire design system from a **single 13,636-byte inline `<style>` block** plus three Google Fonts (`IBM Plex Sans`, `IBM Plex Mono`, `Newsreader`). There is no build step, no CSS framework, no component library. The published article pages are byte-identical embeds that intentionally preserve each source's original CSS — they do **not** share the AgentNews chrome and are therefore out of scope as an aesthetic source.

This investigation captures the AgentNews design system completely (so downstream phases need no further fetching), maps it onto the existing NbgAiHub three-tier token architecture, and recommends an implementation approach.

## §1 — Palette

AgentNews ships **two complete palettes** of 14 tokens each, plus a `--header-bg` semi-transparent variant for the sticky header. Mode selection: light is default; dark applies when `:root[data-theme="dark"]` is set explicitly, OR when `prefers-color-scheme: dark` AND `data-theme` is not `"light"`. Theme choice is persisted in `localStorage` under key `agent-news-theme`.

| Token         | Light value                | Dark value                 | Role                                          |
|---------------|----------------------------|----------------------------|-----------------------------------------------|
| `--bg`        | `#f4f6f9`                  | `#0b1419`                  | App background (off-white / near-black-blue)  |
| `--bg-2`      | `#eef2f7`                  | `#0f1c24`                  | Subdued bg accent                             |
| `--surface`   | `#ffffff`                  | `#14232c`                  | Card / panel base                             |
| `--surface-2` | `#f8fafc`                  | `#1a2d38`                  | Card art bg, search-trigger bg                |
| `--ink`       | `#0b1e2e`                  | `#e6edf3`                  | Primary text                                  |
| `--ink-2`     | `#1a3148`                  | `#c5d1dc`                  | Secondary text                                |
| `--muted`     | `#5b6b80`                  | `#8b9aab`                  | Muted text                                    |
| `--muted-2`   | `#8392a6`                  | `#6b7a8c`                  | Hairline icons                                |
| `--border`    | `#dce3eb`                  | `#243441`                  | Solid borders (dashed empty state, etc.)      |
| `--hairline`  | `#ebeff5`                  | `#1c2b36`                  | 1px section dividers, header bottom border    |
| `--accent`    | `#007a8a` (teal)           | `#2dd4bf` (brighter teal)  | Active nav, link hover, accents               |
| `--accent-ink`| `#00525c`                  | `#67e8f9`                  | Darker accent for high-emphasis link state    |
| `--accent-soft`| `#e0f2f4`                 | `#0a3a42`                  | Tag-as-link background                        |
| `--header-bg` | `rgba(244,246,249,.82)`    | `rgba(11,20,25,.85)`       | Sticky-nav semi-transparent backdrop          |

**Shadow:** `--shadow-md` is the only shadow — soft drop + 1px hairline outline. Light: `0 4px 18px -8px rgba(11,30,46,.18), 0 0 0 1px rgba(11,30,46,.05)`. Dark: `0 4px 18px -8px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.04)`.

**Radii:** `--radius-sm: 6px`, `--radius: 10px`, `--radius-lg: 16px`. Pills use the literal `999px`.

**Contrast (informational, light mode):**
- `--ink` (`#0b1e2e`) on `--bg` (`#f4f6f9`) ≈ 16.4:1 (AAA)
- `--ink` on `--surface` (`#ffffff`) ≈ 17.3:1 (AAA)
- `--muted` (`#5b6b80`) on `--bg` ≈ 5.0:1 (AA)
- `--accent` (`#007a8a`) on `--bg` ≈ 4.7:1 (AA for normal text)

## §2 — Type

**Three font families, loaded from Google Fonts CDN with `display=swap`:**
1. **IBM Plex Sans** — weights 400/500/600/700 — primary sans, used for body, h3 card titles, nav links, footer body
2. **IBM Plex Mono** — weights 400/500/600 — eyebrows, tags, kbd, dates, section h2, counts, footer h4, brand mark
3. **Newsreader** — opsz 6..72, weights 400/500/600 — display serif, used for hero h1, feature title, empty-state title

**Base body:** `font-family: 'IBM Plex Sans', system-ui, -apple-system, sans-serif; font-size: 16px; line-height: 1.55;` with `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;`.

**Type scale (extracted from the CSS):**

| Element                  | Size                         | Weight | Line-height | Tracking      | Family       |
|--------------------------|------------------------------|--------|-------------|---------------|--------------|
| Hero h1                  | `clamp(40px, 5vw, 64px)`     | 500    | 1.05        | `-.025em`     | Newsreader   |
| Feature title (lead)     | `clamp(28px, 3vw, 40px)`     | 500    | 1.10        | `-.02em`      | Newsreader   |
| Empty state title        | 28px                         | 500    | (default)   | `-.015em`     | Newsreader   |
| Card title (h3)          | 22px                         | 600    | 1.20        | `-.015em`     | IBM Plex Sans|
| Body                     | 16px                         | 400    | 1.55        | —             | IBM Plex Sans|
| Hero lede                | 16px                         | 400    | 1.60        | —             | IBM Plex Sans|
| Card summary             | 14.5px                       | 400    | 1.55        | —             | IBM Plex Sans|
| Nav link                 | 14px                         | 400    | —           | —             | IBM Plex Sans|
| Footer link              | 14px                         | 400    | —           | —             | IBM Plex Sans|
| Section h2 (eyebrow)     | 14px                         | 500    | —           | `.14em` upper | IBM Plex Mono|
| Section count            | 13px                         | 500    | —           | —             | IBM Plex Mono|
| Feature CTA              | 13px                         | 500    | —           | —             | IBM Plex Mono|
| Search-trigger label     | 13px                         | 400    | —           | —             | IBM Plex Sans|
| Date value               | 12px (13px in feature)       | 500    | —           | tabular-nums  | IBM Plex Mono|
| Eyebrow / tag / footer h4| 11px                         | 500    | 1           | `.12em` upper | IBM Plex Mono|
| Tag (item type)          | 11px                         | 500    | —           | `.04em`       | IBM Plex Mono|
| Date label               | 10px                         | 500    | —           | `.12em` upper | IBM Plex Mono|
| kbd                      | 11px                         | 500    | 1           | —             | IBM Plex Mono|

**Italic-as-accent:** `.hero__title em` → italic + `color: var(--accent)` + `font-weight: 500`. The hero title says "News from the **agent stack**." with the `em` styling the highlighted phrase.

**Link decoration:** underlines are intentionally absent on most links. Body links rely on `color: inherit` and accent on hover. The hero-lede small-text link is the exception — it uses `border-bottom: 1px solid color-mix(in srgb, var(--accent) 40%, transparent)` for a thinner-than-underline rule that goes solid on hover.

## §3 — Spacing & layout

**Box model:** universal `box-sizing: border-box`. No CSS reset beyond `margin: 0; padding: 0` on `html, body`.

**Container — `.wrap`:** `max-width: 1240px; margin: 0 auto; padding: 0 32px;`. Mobile (≤720px): `padding: 0 20px;`. This is the canonical content gutter — used inside every `<section>` and inside the header/footer.

**Full-bleed strategy:** the **sections** (`<header class="site-header">`, `<section class="hero">`, `<section class="section">`, `<footer class="site-footer">`) span full viewport width with their background colour. The `.wrap` inside each section limits the content to 1240px. So the layout is "full-bleed surfaces with contained content" — not edge-to-edge content.

**Vertical rhythm:**
- Hero: `padding: 56px 0 40px;` with `border-bottom: 1px solid var(--hairline)`
- Section: `padding: 56px 0;` with `border-bottom: 1px solid var(--hairline)` (last-of-type drops the border)
- Section head → content gap: `margin-bottom: 32px`
- Footer: `padding: 56px 0 32px;` with `border-top: 1px solid var(--hairline)` and `background: var(--surface-2)`
- Footer bottom row: `padding-top: 24px; border-top: 1px solid var(--hairline)`

**Grid — `.grid-3`:** `display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px 32px;`. Mobile (≤880px): `grid-template-columns: 1fr;`. There is no 2-column intermediate.

**Feature (lead story):** `grid-template-columns: 1.4fr 1fr; gap: 56px; align-items: center;`. Mobile (≤880px): `1fr; gap: 24px`.

**Hero intro:** `grid-template-columns: 2fr 1fr; gap: 80px;`. Mobile (≤880px): `1fr; gap: 24px`.

**Footer grid:** `grid-template-columns: 2fr repeat(3, 1fr); gap: 48px; padding-bottom: 32px;`. Mobile (≤880px): `1fr 1fr`.

**Card internal gaps:** `.card` flex column gap 16; `.card__body` flex column gap 10; `.card__meta` flex row gap 10 with wrap; `.feature__body` flex column gap 18; `.feature__meta` flex row gap 12 with wrap.

**Breakpoints in use:** 720px (container padding), 880px (grid collapse + footer collapse + hero/feature collapse), 920px (nav hide + search-trigger shrink). The site has effectively **three breakpoints** (small, medium, large) — there is no `>=1440px` distinct treatment.

## §4 — Card / item patterns

The site has **three item types** with intentionally minimal style differences:

**Card (`.card`):** vertical layout — `art` (16:9 surface-2 background with image cover) → `body` (gap 10) → `meta` row (gap 10, wrap) → `dates` row → `title` 22px. Hover state on title: `color: var(--accent)`. No box shadow on card itself. No border on card itself. The art block carries `border-radius: var(--radius)` (10px) and `overflow: hidden`. Cards live inside `.grid-3`.

**Feature (`.feature`):** horizontal layout for the lead story — `art` (1.4fr) + `body` (1fr) with `gap: 56px`. Body has `gap: 18`. The feature title is Newsreader serif `clamp(28px, 3vw, 40px)`. Below the title, a feature CTA `.feature__cta` — mono 13px in accent colour with a 1px accent underline.

**Empty state (`.empty`):** dashed border (`1px dashed var(--border)`), centred padding `80px 24px`, `border-radius: var(--radius)`, `background: var(--surface)`. Eyebrow in accent mono uppercase, title in Newsreader serif 28px, body in muted 15px.

**No card-level hover lift, no shadow on hover, no border on hover.** The hover affordance is concentrated in the **title** (colour shift to accent) and the **art** (no explicit hover, just the cursor change from anchor wrapping the whole art block).

**Meta atoms:**
- `.tag` — mono 11px pill, `padding: 4px 9px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--hairline); color: var(--ink-2)`. Variant `.tag.tag--link` swaps in accent palette.
- `.eyebrow` — mono 11px uppercase tracked `.12em`, `color: var(--muted)`. Variant `.eyebrow.accent` switches the colour.
- `.external-host` — mono 11px with optional 4px-gap SVG icon in `--muted-2`.
- `.dot` — 3×3 circle in `--muted-2` used as a separator between date-items.
- `.dates > .date-item` — mono with `.date-label` (10px uppercase tracked `.12em` muted) + `.date-value` (12px tabular-nums in `--ink-2`).

## §5 — Page chrome

**Header (`.site-header`):** position sticky, top 0, z-index 50. Background `--header-bg` (semi-transparent). `backdrop-filter: saturate(180%) blur(14px)` (with `-webkit-` prefix). 1px `--hairline` bottom border. Inner wrap: flex row, `gap: 28px`, `height: 64px`, items vertically centred.

Header contents in order:
1. `.brand` — flex row, gap 10, font-weight 600, letter-spacing -0.02em. Contains `.brand__mark` (28×28 rounded square with `--ink` bg, `--bg` fg, mono 14px 600) + `.brand__name` (16px `--ink`, span suffix in `--muted` 400). E.g., "Agent News" with "News" muted.
2. `.nav` — flex row, gap 4, margin-left 8. Each link `padding: 8px 12px; border-radius: 6px; font-size: 14px; color: var(--ink-2)`. Hover swaps `background: var(--surface-2); color: var(--ink)`. `.active` switches `color: var(--accent)`. Hidden ≤920px.
3. `.header-actions` — `margin-left: auto`, flex row gap 4. Contains:
   - `.search-trigger` — placeholder-style search affordance, NOT a real input. Flex row gap 8, `padding: 7px 10px 7px 12px; border-radius: 8px; background: var(--surface-2); border: 1px solid var(--hairline); color: var(--muted); font-size: 13px; min-width: 220px`. Holds a search-icon SVG, label "Search articles", and `.kbd` "⌘K". The label hides ≤920px, leaving icon + kbd.
   - `.theme-toggle` — 36×36 button, `border-radius: 8px; background: var(--surface-2); border: 1px solid var(--hairline); color: var(--ink-2)`. Hover: accent colour + accent-soft border. Focus-visible: `outline: 2px solid var(--accent); outline-offset: 2px`. Holds sun + moon SVGs; visibility is flipped by `data-theme="dark"` selector and the `prefers-color-scheme: dark` media query.

**Footer (`.site-footer`):** `padding: 56px 0 32px; border-top: 1px solid var(--hairline); background: var(--surface-2)`. Inner wrap.
- `.footer-grid` — `grid-template-columns: 2fr repeat(3, 1fr); gap: 48px; padding-bottom: 32px`. Mobile (≤880px): `1fr 1fr`.
- Column headers `h4` — mono 11px uppercase tracked `.12em`, `color: var(--muted)`.
- Column links — 14px `--ink-2`, hover accent.
- `.footer-link--disabled` variant — 14px `--muted`, opacity 0.55, `cursor: not-allowed`.
- `.site-footer__bottom` — flex row space-between, `padding-top: 24px; border-top: 1px solid var(--hairline)`, mono 11px `--muted` tracked `.04em`.

## §6 — Motion

**There is no scroll-reveal motion on AgentNews.** No `IntersectionObserver`, no `animation` declarations, no `@keyframes`, no scroll-triggered transforms. The single JS block is the theme toggle (805 bytes).

**The only transitions** in the CSS:
- Nav link: `transition: background .15s, color .15s` — on hover bg/text swap.
- Theme toggle: `transition: background .15s, color .15s, border-color .15s` — same.
- Hero lede small link: `transition: border-color 120ms ease` — the accent underline thickening.

**`prefers-reduced-motion` is NOT honoured in the AgentNews CSS.** Our retune SHOULD add it (per refined-spec A14). Since motion is already minimal — only 120–150ms hover transitions — the reduced-motion path is essentially a no-op (`transition-duration: 0.01ms`).

**Implication for NbgAiHub `MotionReveal` (currently no-op per Issues #5):** keep it as a no-op. AgentNews proves that the aesthetic does NOT require scroll-reveals; the calm content-first feel comes from typography and rhythm, not animation. **Recommendation: do NOT reactivate MotionReveal.** Close pending #5 with rationale "aesthetic target uses no scroll reveals — keeping no-op is consistent with target."

## §7 — Theme switching

**HTML contract:** `<button id="theme-toggle" class="theme-toggle" type="button" aria-pressed="false" title="Switch to dark theme" aria-label="Toggle dark theme">` with two SVG children `<svg class="icon-sun">` + `<svg class="icon-moon">`. CSS controls visibility based on `:root[data-theme]` and `prefers-color-scheme`.

**JS contract (805 bytes, inline at end of body):**
```js
(function(){
  var btn=document.getElementById('theme-toggle');
  if(!btn)return;
  function current(){
    var explicit=document.documentElement.getAttribute('data-theme');
    if(explicit==='light'||explicit==='dark')return explicit;
    return (window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';
  }
  function syncLabel(t){
    btn.setAttribute('aria-pressed',t==='dark'?'true':'false');
    btn.setAttribute('title',t==='dark'?'Switch to light theme':'Switch to dark theme');
  }
  syncLabel(current());
  btn.addEventListener('click',function(){
    var next=current()==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',next);
    try{localStorage.setItem('agent-news-theme',next);}catch(e){}
    syncLabel(next);
  });
})();
```

**Persistence:** `localStorage.setItem('agent-news-theme', next)`. **No early-applied script** restores the value on page load — only the toggle writes it. (This is a small AgentNews quirk; we will improve on it by adding an early-applied "no-flash" script.)

**Reconciliation with Starlight's `ThemeSelect`:** Starlight already manages `data-theme` on `:root` and writes `localStorage` key `starlight-theme`. The AgentNews mechanism is **structurally identical**. We can keep Starlight's existing ThemeSelect on content-detail pages and add an AgentNews-style **icon-only** toggle on marketing surfaces that delegates to the same `data-theme` attribute + `starlight-theme` localStorage key. Zero JS conflict.

---

## §8 — Token re-anchor table

Mapping AgentNews tokens to the NbgAiHub three-tier system. The intent: **change values, keep names**. Per A8 of the refined spec.

### Primitives (`site/src/styles/tokens/primitives.css`)

The current primitives.css holds ~135 raw tokens — palette ramps (slate, violet, emerald, amber, rose, sky), type scale steps, motion durations, easings, radii. AgentNews has only 14 palette tokens, so we **collapse** unused ramps and add a teal ramp.

| Primitive token (existing) | Current value | New value (anchored on AgentNews)  |
|----------------------------|---------------|------------------------------------|
| `--nbg-teal-50`            | NEW           | `#e0f2f4` (= AgentNews `--accent-soft`) |
| `--nbg-teal-100`           | NEW           | `#b8e0e3` (interpolated)           |
| `--nbg-teal-200`           | NEW           | `#80c8cd` (interpolated)           |
| `--nbg-teal-400`           | NEW           | `#2dd4bf` (= dark accent)          |
| `--nbg-teal-500`           | NEW           | `#007a8a` (= light accent)         |
| `--nbg-teal-600`           | NEW           | `#00525c` (= accent-ink light)     |
| `--nbg-teal-700`           | NEW           | `#003c44`                          |
| `--nbg-slate-50` (already exists in primitives) | retune | `#f4f6f9` (= AgentNews light bg) |
| `--nbg-slate-100`          | retune        | `#eef2f7`                          |
| `--nbg-slate-150`          | retune (add)  | `#ebeff5` (= hairline light)       |
| `--nbg-slate-200`          | retune        | `#dce3eb` (= border light)         |
| `--nbg-slate-400`          | retune        | `#8392a6` (= muted-2 light)        |
| `--nbg-slate-500`          | retune        | `#5b6b80` (= muted light)          |
| `--nbg-slate-700`          | retune        | `#1a3148` (= ink-2 light)          |
| `--nbg-slate-900`          | retune        | `#0b1e2e` (= ink light)            |
| `--nbg-slate-950`          | retune        | `#0b1419` (= dark bg)              |
| `--nbg-slate-925`          | retune (add)  | `#0f1c24` (= dark bg-2)            |
| `--nbg-slate-900-d`        | retune (add)  | `#14232c` (= dark surface)         |
| `--nbg-slate-850-d`        | retune        | `#1a2d38` (= dark surface-2)       |
| `--nbg-slate-800-d`        | retune        | `#243441` (= dark border)          |
| `--nbg-slate-700-d`        | retune        | `#1c2b36` (= dark hairline)        |

Other palette ramps (violet, emerald, amber, rose, sky) — **retain but mark as DEPRECATED** in `legacy.css`. They aren't used by AgentNews's chrome; they may still be useful for content semantic tokens (e.g., audience-filter colours) that are out of the marketing-surface scope.

**Type scale tokens:**

| Primitive token              | Current value | New value                                    |
|------------------------------|---------------|----------------------------------------------|
| `--nbg-font-sans`            | retune        | `'IBM Plex Sans', system-ui, -apple-system, sans-serif` |
| `--nbg-font-mono`            | retune        | `'IBM Plex Mono', ui-monospace, monospace`   |
| `--nbg-font-serif` (add)     | NEW           | `'Newsreader', Georgia, serif`               |
| `--nbg-fs-10` (add)          | NEW           | `10px`                                       |
| `--nbg-fs-11`                | retune        | `11px`                                       |
| `--nbg-fs-12`                | retune        | `12px`                                       |
| `--nbg-fs-13`                | retune        | `13px`                                       |
| `--nbg-fs-14`                | retune        | `14px`                                       |
| `--nbg-fs-145` (add)         | NEW           | `14.5px` (card summary)                      |
| `--nbg-fs-16`                | retune        | `16px`                                       |
| `--nbg-fs-22` (add)          | NEW           | `22px` (card title)                          |
| `--nbg-fs-28` (add)          | NEW           | `28px` (empty-state title)                   |
| `--nbg-fs-h2-display` (add)  | NEW           | `clamp(28px, 3vw, 40px)`                     |
| `--nbg-fs-h1-display` (add)  | NEW           | `clamp(40px, 5vw, 64px)`                     |
| `--nbg-tracking-eyebrow`     | retune        | `.12em`                                      |
| `--nbg-tracking-h2-eyebrow`  | retune        | `.14em`                                      |
| `--nbg-tracking-tag`         | retune        | `.04em`                                      |
| `--nbg-tracking-display-tight`| retune       | `-.025em` (hero)                             |
| `--nbg-tracking-display-tight-2`| retune     | `-.02em` (feature)                           |
| `--nbg-tracking-display-tight-3`| retune     | `-.015em` (card / empty-state)               |
| `--nbg-leading-tight`        | retune        | `1.05` (hero)                                |
| `--nbg-leading-feature`      | retune        | `1.10`                                       |
| `--nbg-leading-card`         | retune        | `1.20`                                       |
| `--nbg-leading-body`         | retune        | `1.55`                                       |
| `--nbg-leading-lede`         | retune        | `1.60`                                       |

**Radii / shadow:** drop the existing radius scale to 3 tokens (`--nbg-radius-sm 6px`, `--nbg-radius 10px`, `--nbg-radius-lg 16px`, plus pill `--nbg-radius-pill 999px`). Replace `--nbg-shadow-md` with the AgentNews compound shadow. Light shadow alpha 0.18/0.05 of `rgba(11,30,46,*)`. Dark shadow alpha 0.55/0.04 of black/white.

**Container / breakpoints:**
- `--nbg-container-max` = `1240px` (was 1320px or similar — re-anchor)
- `--nbg-container-pad-desktop` = `32px`
- `--nbg-container-pad-mobile` = `20px`
- `--nbg-bp-sm` = `720px` (was `40rem` = 640px — retune)
- `--nbg-bp-md` = `880px` (was `64rem` = 1024px — retune)
- `--nbg-bp-lg` = `920px` (was `80rem` = 1280px — retune)
- `--nbg-bp-xl` = `1240px` (was `96rem` = 1536px — retune, matches container max)

(Per A15 of refined spec: count stays four, values retune.)

### Semantic (`site/src/styles/tokens/semantic.css`)

Add an AgentNews semantic layer that consumes the primitives:

```css
:root,
:root[data-theme="light"] {
  --nbg-bg:          var(--nbg-slate-50);     /* #f4f6f9 */
  --nbg-bg-2:        var(--nbg-slate-100);    /* #eef2f7 */
  --nbg-surface:     #ffffff;
  --nbg-surface-2:   #f8fafc;
  --nbg-ink:         var(--nbg-slate-900);    /* #0b1e2e */
  --nbg-ink-2:       var(--nbg-slate-700);    /* #1a3148 */
  --nbg-muted:       var(--nbg-slate-500);    /* #5b6b80 */
  --nbg-muted-2:     var(--nbg-slate-400);    /* #8392a6 */
  --nbg-border:      var(--nbg-slate-200);    /* #dce3eb */
  --nbg-hairline:    var(--nbg-slate-150);    /* #ebeff5 */
  --nbg-accent:      var(--nbg-teal-500);     /* #007a8a */
  --nbg-accent-ink:  var(--nbg-teal-600);     /* #00525c */
  --nbg-accent-soft: var(--nbg-teal-50);      /* #e0f2f4 */
  --nbg-header-bg:   rgba(244, 246, 249, 0.82);
  --nbg-shadow-md:   0 4px 18px -8px rgba(11,30,46,.18), 0 0 0 1px rgba(11,30,46,.05);
}
:root[data-theme="dark"] {
  --nbg-bg:          var(--nbg-slate-950);    /* #0b1419 */
  --nbg-bg-2:        var(--nbg-slate-925);    /* #0f1c24 */
  --nbg-surface:     var(--nbg-slate-900-d);  /* #14232c */
  --nbg-surface-2:   var(--nbg-slate-850-d);  /* #1a2d38 */
  --nbg-ink:         #e6edf3;
  --nbg-ink-2:       #c5d1dc;
  --nbg-muted:       #8b9aab;
  --nbg-muted-2:     #6b7a8c;
  --nbg-border:      var(--nbg-slate-800-d);  /* #243441 */
  --nbg-hairline:    var(--nbg-slate-700-d);  /* #1c2b36 */
  --nbg-accent:      var(--nbg-teal-400);     /* #2dd4bf */
  --nbg-accent-ink:  #67e8f9;
  --nbg-accent-soft: #0a3a42;
  --nbg-header-bg:   rgba(11, 20, 25, 0.85);
  --nbg-shadow-md:   0 4px 18px -8px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.04);
  color-scheme:      dark;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* identical to [data-theme="dark"] block — duplicated for media-query inheritance */
    --nbg-bg:          var(--nbg-slate-950);
    --nbg-bg-2:        var(--nbg-slate-925);
    --nbg-surface:     var(--nbg-slate-900-d);
    --nbg-surface-2:   var(--nbg-slate-850-d);
    --nbg-ink:         #e6edf3;
    --nbg-ink-2:       #c5d1dc;
    --nbg-muted:       #8b9aab;
    --nbg-muted-2:     #6b7a8c;
    --nbg-border:      var(--nbg-slate-800-d);
    --nbg-hairline:    var(--nbg-slate-700-d);
    --nbg-accent:      var(--nbg-teal-400);
    --nbg-accent-ink:  #67e8f9;
    --nbg-accent-soft: #0a3a42;
    --nbg-header-bg:   rgba(11, 20, 25, 0.85);
    --nbg-shadow-md:   0 4px 18px -8px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.04);
    color-scheme:      dark;
  }
}
```

### Aliases (`site/src/styles/tokens/aliases.css`)

Re-anchor the 13 `--sl-color-*` aliases so Starlight chrome (Pagefind, content-detail TOC, prose) inherits the new palette without any further intervention:

```css
:root {
  --sl-color-bg:           var(--nbg-bg);
  --sl-color-bg-sidebar:   var(--nbg-surface-2);
  --sl-color-bg-nav:       var(--nbg-header-bg);
  --sl-color-text:         var(--nbg-ink);
  --sl-color-text-accent:  var(--nbg-accent);
  --sl-color-hairline:     var(--nbg-hairline);
  --sl-color-hairline-light: var(--nbg-hairline);
  --sl-color-accent:       var(--nbg-accent);
  --sl-color-accent-high:  var(--nbg-accent-ink);
  --sl-color-accent-low:   var(--nbg-accent-soft);
  --sl-color-gray-1:       var(--nbg-ink);
  --sl-color-gray-2:       var(--nbg-ink-2);
  --sl-color-gray-3:       var(--nbg-muted);
  --sl-color-gray-4:       var(--nbg-muted-2);
  --sl-color-gray-5:       var(--nbg-border);
  --sl-color-gray-6:       var(--nbg-hairline);
  --sl-color-white:        var(--nbg-surface);
  --sl-color-black:        var(--nbg-ink);
}
```

(Exact alias names per Starlight 0.39 — list curated against the codebase scan.)

---

## §9 — News-page taxonomy decision

AgentNews has **three named sections** (AI-News, Deep Dives, Articles) driven by a frontmatter section field on each item. NbgAiHub's news collection has 31 published items with a `confidence` field (`high`/`mixed`/`low`) and a `source` field but no explicit section discriminator.

**Three options:**

1. **A. Add a `section: "ai-news" | "deep-dives" | "articles"` frontmatter field** to the news content config. Migrate the 31 existing items by inferring from `source` + URL pattern (YouTube → `deep-dives`, Reddit → `ai-news`, blog domains → `articles`). Update the build-pin-index to emit the section per item. — **REJECTED.** A1 of refined spec says the news schema is unchanged; A16 says content schemas are unchanged. This violates both.

2. **B. Derive section at render time** from the existing fields. Map: `source` startsWith `r/` → AI-News; `source` includes `youtube.com|youtu.be` → Deep Dives; everything else → Articles. Then group items by section in `pages/news/index.astro` before rendering. — **RECOMMENDED.** Zero schema change. Pure render-time logic. Reversible. Fits A1/A16.

3. **C. Single chronological feed without sectioning.** Drop the AgentNews three-section pattern entirely. — Loses the aesthetic match. The three-section structure is one of AgentNews's signature traits.

**Recommendation: Option B.** Implement a tiny `lib/news-sections.ts` helper that returns `"ai-news" | "deep-dives" | "articles"` from a news entry. Use it in `pages/news/index.astro` to bucket items. Hero / feature treatment picks the most-recent item from the most-popular section (Articles by default) to be the feature; the rest grid into `.grid-3` per section.

---

## §10 — Font-loading strategy

AgentNews loads three Google Fonts families from the CDN. NbgAiHub currently uses Inter Variable + JetBrains Mono via the Astro `@font` integration (per CLAUDE.md "Astro config" + codebase scan).

**Three options:**

1. **A. CDN link with `display=swap` (AgentNews's choice).** Add a `<link>` to the `<head>` of every page. Pros: simple, no build step, easy to revert. Cons: external request on every page load, fragile to CDN outages, potential CLS during font swap.

2. **B. Astro `@astrojs/font` experimental integration** (already partially configured per `astro.config.mjs`). Add the three families to the config; Astro generates self-hosted `@font-face` rules at build time and preloads the most-critical weights. — **RECOMMENDED.** Self-hosted, no third-party dep, preload friendly, fits the existing convention.

3. **C. System font stack only.** Drop Newsreader and IBM Plex, render hero with system serif + sans. — Loses the AgentNews typography signature.

**Recommendation: Option B.** Extend `astro.config.mjs` `experimental.fonts` to include `IBM Plex Sans` (400/500/600/700), `IBM Plex Mono` (400/500/600), and `Newsreader` (400/500/600 with `opsz` variable axis 6..72). Preload `IBM Plex Sans 400` and `Newsreader 500` (hero h1). Mark `display: 'swap'` to match AgentNews's CLS posture.

**Fallback chain (preserved through retune):**
- Sans: `'IBM Plex Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Mono: `'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace`
- Serif: `'Newsreader', Georgia, 'Times New Roman', serif`

---

## §11 — Surface-to-pattern mapping (all 11 marketing surfaces)

| Surface                    | AgentNews-equivalent pattern                                                  |
|----------------------------|-------------------------------------------------------------------------------|
| `/` (home)                 | Hero + `.section` × N. Sections = "News", "Skills", "Tips", "Start here". Feature pick: most-recent news item. |
| `/news/`                   | Hero (compact) + 3 `.section` blocks (AI-News, Deep Dives, Articles). Feature = latest Articles entry. |
| `/skills/`                 | Hero + single `.section` "Skills" with `.grid-3` of skill cards (uses existing `SkillCard.astro`, restyled to `.card` shape). |
| `/tips/`                   | Hero + single `.section` "Tips" with `.grid-3` of tip cards (typographic only — no image art block; substitute a gradient placeholder `.card__art--text` to keep visual rhythm). |
| `/glossary/`               | Hero + glossary filter + single `.section` rendering term entries as `.card` (typographic). |
| `/reference/`              | Hero (compact) + single `.section` of reference link cards. Currently a placeholder per SCOPE; can stay placeholder-styled. |
| `/contribute/`             | Hero + single `.section` with prose-styled body (markdown-like rules inside a `.empty`-style outlined panel). |
| `/my-pins/`                | Hero + per-type `.section` blocks (one each: pinned-news, pinned-skills, pinned-tips, pinned-glossary). Stale-pin rows use `.empty` styling. |
| `/submit-skill/`           | Hero + single `.section` containing the existing 4-step form. Form inputs retuned to the surface-2 / hairline aesthetic. |
| `/start-here/day-1/`       | Hero + `.section` per step (6 sections) with `.feature`-style two-column layouts alternating left/right. |
| `/start-here/week-1/`      | Hero + 5 `.section` blocks (one per day) with `.grid-3` of task cards inside each. |

The **content-detail pages** (`/news/[slug]/`, plus skills/tips/glossary detail routes) use Starlight chrome — they receive the new palette via `aliases.css` and the existing `content-chrome.css` + `content-prose.css` overrides. Per AC36 of refined spec, primitives remain Starlight-free.

---

## §12 — Implementation approach recommendation

Three approaches evaluated:

1. **A. Direct edit of `primitives.css` + `semantic.css` + `aliases.css`, leaving consumer components mostly untouched.** Token names survive; values change. Add the new tokens (teal ramp, serif font var, new font-size steps, container max, breakpoint values). Add a small set of **new AgentNews class names** as utility-or-semantic CSS rules (`.site-header`, `.nav`, `.brand`, `.section`, `.section__head`, `.hero`, `.feature`, `.card`, `.card__art`, `.card__body`, `.tag`, `.eyebrow`, `.dates`, `.theme-toggle`) — these live in a new file `site/src/styles/agentnews-layout.css` aggregated by `index.css`. Components either adopt these class names directly (where they map cleanly) or compose them via the existing primitives. — **RECOMMENDED.**

2. **B. AgentNews-specific theme overlay file** that re-defines primitives at root, switchable later by toggling a `data-theme-pack="agentnews"` attribute. Pros: reversible by removing the overlay. Cons: doubles the cognitive load — two complete palettes co-existing, and the tokens we DON'T re-skin will keep their old values, producing a visual collision.

3. **C. Big-bang rewrite to mirror AgentNews's flat 14-token model.** Drops the three-tier architecture entirely. Pros: matches AgentNews's flatness exactly. Cons: rewrites ~245 declarations across 6 token files, breaks the existing alias bridge to Starlight, breaks the primitive→semantic→component pattern that the 30 components currently consume. High blast radius.

**Recommendation: Option A.** Surgical retune of token values + new layout-class CSS file + per-page rewrites of the 11 marketing surfaces' page-body markup to use the new class names. Components touched (~14): replace hardcoded values flagged in the codebase scan (`AudienceBadge`, `ConfidenceChip`, etc.) with token consumption; replace any remaining `--sl-color-*` direct uses with `--nbg-*` semantic tokens.

**Files touched (estimate):**
- `site/src/styles/tokens/primitives.css` (retune ~30 lines + add ~15 new tokens)
- `site/src/styles/tokens/semantic.css` (rewrite — new schema)
- `site/src/styles/tokens/aliases.css` (rewrite — new schema)
- `site/src/styles/agentnews-layout.css` (NEW — ~400 lines lifted from AgentNews CSS with `.nbg-` prefix)
- `site/src/styles/tokens/index.css` (add the new file to the aggregator)
- `site/src/components/MarketingShell.astro` (rewrite header + footer markup to AgentNews structure)
- `site/src/components/SplashAwareHeader.astro` (rewrite nav structure, simplify ~50% — current 643 lines → ~300 lines)
- `site/src/components/HomeHero.astro` (rewrite to AgentNews hero shape)
- `site/src/components/HomeStats.astro` (drop or restyle — AgentNews has no equivalent; recommendation: drop and replace with a `.section` containing skill/tip counts as `.card__title` numerics)
- `site/src/components/NewsList.astro` / `site/src/components/NewsPanel.astro` (rewrite to `.card` shape)
- `site/src/components/SkillCard.astro` (rewrite to `.card` shape)
- `site/src/components/AudienceBadge.astro` (use `.tag` class)
- `site/src/components/ConfidenceChip.astro` (use `.tag` class)
- `site/src/pages/index.astro` (rewrite homepage body)
- `site/src/pages/news/index.astro` (rewrite — three-section AgentNews pattern)
- `site/src/pages/skills.astro` (rewrite body — hero + section + grid-3)
- `site/src/pages/tips.astro` (rewrite body)
- `site/src/pages/glossary.astro` (rewrite body — keep filter behaviour)
- `site/src/pages/reference.astro` (rewrite body)
- `site/src/pages/contribute.astro` (rewrite body)
- `site/src/pages/my-pins.astro` (rewrite body)
- `site/src/pages/submit-skill.astro` (rewrite body — keep form behaviour)
- `site/src/pages/start-here/day-1.astro` (rewrite body)
- `site/src/pages/start-here/week-1.astro` (rewrite body)
- `site/src/styles/content-chrome.css` (no change — inherits via aliases)
- `site/src/styles/content-prose.css` (light retune for `font-family` swap)
- `site/src/lib/news-sections.ts` (NEW — section discriminator helper)
- `site/astro.config.mjs` (add three Google Fonts via experimental.fonts; preserve sidebar 11 entries)
- `site/src/components/primitives/*` (NO CHANGE — portability gate AC36 preserved)

**Estimated total LOC delta:** +~1200 / -~1400 (net negative ~200 LOC — the new layout CSS is shorter than the current shell + Linear/Vercel/Stripe specifics it replaces, but partially offset by the page-body rewrites).

---

## §13 — Risks & mitigations

1. **AudienceFilter localStorage** — risk that retune breaks the `.audience-hidden` toggle behaviour. **Mitigation:** preserve all class names and selector targets; only restyle. Cover with the existing `glossary-filter.test.ts` analogue test.
2. **Pagefind theming** — risk that re-anchored `--sl-color-*` aliases break Pagefind UI. **Mitigation:** Pagefind reads CSS variables at runtime; this is a re-paint, not a re-build. Smoke test the search modal in both modes after the swap.
3. **Theme-toggle collision** — risk that adding an AgentNews-style toggle collides with Starlight's `ThemeSelect`. **Mitigation:** delegate to the same `data-theme` attribute + `starlight-theme` localStorage key. Visual treatment differs; underlying mechanism is shared.
4. **Backdrop-filter on older Safari** — risk: `-webkit-backdrop-filter` is widely supported but degrades in some Linux Firefox builds. **Mitigation:** the fallback (opaque `--header-bg`) is still readable; document as known graceful degradation.
5. **font-size 14.5px** — most browsers round this to 15px. **Mitigation:** accept the round; AgentNews ships it as 14.5px and renders fine.
6. **Newsreader optical-sizing** — needs `font-variation-settings: 'opsz' XX` for proper rendering at small sizes. **Mitigation:** Astro's font integration handles `axes: { opsz: ['6', '72'] }` cleanly.
7. **Mobile drawer state** — risk that simplifying SplashAwareHeader breaks the mobile menu. **Mitigation:** keep the existing mobile-drawer JS path; only restyle. AgentNews's mobile pattern is "hide nav, keep brand + theme toggle + search-trigger compact" — match it.
8. **HomeStats removal** — risk of losing useful at-a-glance numerics. **Mitigation:** re-fold the counts into a `.section` with a `.feature`-style title "By the numbers" + 3 `.card` blocks each containing one big numeric.
9. **MarketingShell header markup change** — risk of breaking the 11 marketing surfaces if the shell signature changes. **Mitigation:** keep the slot API (`<MarketingShell title="..." description="...">`); only change the rendered markup inside.

---

## §14 — Technical Research Guidance

**Research needed: No.**

The single 13,636-byte inline AgentNews CSS file plus the homepage HTML structure plus the codebase scan together give us complete clarity on every implementation decision. The token re-anchor table, the surface-to-pattern mapping, the news-section discriminator, the font-loading strategy, and the implementation approach all have concrete grounding in the primary-source files. There is no remaining ambiguity that deeper external research would resolve.

**Confidence: High** for the recommendation. **Reversibility: High** — every change is concentrated in token files + page bodies; rolling back is a single revert.
