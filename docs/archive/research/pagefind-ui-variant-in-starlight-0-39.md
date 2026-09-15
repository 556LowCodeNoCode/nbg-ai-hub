---
topic: pagefind-ui-variant-in-starlight-0-39
researched_for: ui-redesign
researched_at: 2026-05-19T11:28:00Z
verdict: Default UI bundled — but Starlight already pipes its own tokens through it. Override Starlight tokens; Pagefind retints automatically. Zero new Pagefind-specific code.
starlight_version_pinned: 0.39.2
pagefind_variant: "@pagefind/default-ui (legacy Default UI, not Component UI)"
pagefind_version_resolved: "^1.3.0"
---

# Pagefind UI Variant in Starlight 0.39.2 — Findings & Override Path

## Variant detected

**Starlight 0.39.2 bundles `@pagefind/default-ui@^1.3.0`** — Pagefind's **Default UI** (Svelte-built, BEM-classed widget), NOT the modern Component UI. Verified at `site/node_modules/@astrojs/starlight/package.json:59`:

```json
"dependencies": {
  "@pagefind/default-ui": "^1.3.0",
  …
  "pagefind": "^1.3.0",
}
```

The Default UI is loaded dynamically by Starlight's `Search.astro` (file: `site/node_modules/@astrojs/starlight/components/Search.astro`, line 140):

```js
const { PagefindUI } = await import('@pagefind/default-ui');
new PagefindUI({
  ...pagefindUserConfig,
  element: '#starlight__search',
  baseUrl: import.meta.env.BASE_URL,
  bundlePath: import.meta.env.BASE_URL.replace(/\/$/, '') + '/pagefind/',
  showImages: false,
  translations,
  showSubResults: true,
  processResult: …,
});
```

The Default UI's full CSS is imported as a global stylesheet inside `@layer starlight.core`:

```css
@import url('@pagefind/default-ui/css/ui.css') layer(starlight.core);
```

## Key insight — Starlight already does the work

The investigator's Axis 5 recommendation ("alias Pagefind's native CSS variables in `tokens.css`") needs **refinement**, not rejection. Starlight's `Search.astro` already aliases Starlight's own variables into Pagefind's variables (lines 257–270):

```css
#starlight__search {
  --pagefind-ui-primary:       var(--sl-color-text);
  --pagefind-ui-text:          var(--sl-color-gray-2);
  --pagefind-ui-font:          var(--__sl-font);
  --pagefind-ui-background:    var(--sl-color-black);
  --pagefind-ui-border:        var(--sl-color-gray-5);
  --pagefind-ui-border-width:  1px;
  --pagefind-ui-tag:           var(--sl-color-gray-5);
  --sl-search-cancel-space:    5rem;
}

:root[data-theme='light'] #starlight__search {
  --pagefind-ui-tag: var(--sl-color-gray-6);
}
```

Plus Starlight scatters additional overrides through the global `<style is:global>` block (lines 294–488) that wire `--sl-color-accent`, `--sl-color-accent-high`, `--sl-color-accent-low`, `--sl-color-text-accent`, `--sl-color-white`, `--sl-color-gray-*` into Pagefind's BEM selectors (`.pagefind-ui__search-input`, `.pagefind-ui__result-link`, `.pagefind-ui__filter-value::before`, etc.).

**The implication**: if our redesign's `tokens.css` overrides Starlight's `--sl-color-*` tokens, the Pagefind modal **automatically inherits** the new look. No `--pagefind-ui-*` overrides needed. No new code. Zero Pagefind-specific surface in the redesign.

## Pagefind UI variables (full surface, for completeness)

The Default UI's `@pagefind/default-ui/css/ui.css` exposes these custom properties (sourced from `site/node_modules/@pagefind/default-ui/svelte/*.svelte` and the bundled `ui.css`):

| Variable | Purpose | Default |
|---|---|---|
| `--pagefind-ui-scale` | Master scale factor — multiplies every internal `px` value | `1` |
| `--pagefind-ui-primary` | Accent / button color | `#393939` |
| `--pagefind-ui-text` | Body text color | `#393939` |
| `--pagefind-ui-background` | Modal background | `#ffffff` |
| `--pagefind-ui-border` | Borders + dividers | `#eeeeee` |
| `--pagefind-ui-border-width` | Border thickness | `2px` |
| `--pagefind-ui-border-radius` | Card / input corners | `8px` |
| `--pagefind-ui-image-border-radius` | Result-image corners | `0` |
| `--pagefind-ui-image-box-ratio` | Result-image aspect | `4 / 3` |
| `--pagefind-ui-font` | Font family | `sans-serif` |
| `--pagefind-ui-tag` | Result-tag background | `#eeeeee` |

All eleven are stable since Pagefind 1.0 (see https://pagefind.app/docs/css-variables/). Pagefind 1.3.x adds nothing breaking to this surface. Our pinned range `^1.3.0` is safe.

## Recommended approach in our redesign

**Do NOT add `--pagefind-ui-*` overrides to `tokens.css`.** Override Starlight's `--sl-color-*` tokens instead — they cascade through to Pagefind via Starlight's existing aliasing.

The relevant Starlight tokens to override (extracted from `Search.astro`'s usage):

```css
/* In tokens.css (or wherever the redesign's color tokens live) */
:root,
:root[data-theme='dark'] {
  /* Our new design-system tokens (sketch) */
  --nbg-color-bg-canvas:       hsl(220 25% 5%);
  --nbg-color-bg-surface:      hsl(220 22% 8%);
  --nbg-color-bg-elevated:     hsl(220 20% 12%);
  --nbg-color-fg-primary:      hsl(220 15% 95%);
  --nbg-color-fg-muted:        hsl(220 10% 70%);
  --nbg-color-accent:          hsl(265 90% 65%);
  --nbg-color-accent-high:     hsl(265 95% 75%);
  --nbg-color-accent-low:      hsl(265 60% 25%);
  --nbg-color-border:          hsl(220 15% 20%);

  /* Alias Starlight's tokens to our tokens — propagates into Pagefind */
  --sl-color-black:          var(--nbg-color-bg-surface);    /* modal bg */
  --sl-color-gray-6:         var(--nbg-color-bg-elevated);   /* search button bg */
  --sl-color-gray-5:         var(--nbg-color-border);        /* borders */
  --sl-color-gray-4:         hsl(220 12% 35%);               /* tree-diagram icon */
  --sl-color-gray-3:         hsl(220 12% 50%);               /* page icon */
  --sl-color-gray-2:         var(--nbg-color-fg-muted);      /* result-excerpt text, mark */
  --sl-color-gray-1:         hsl(220 10% 85%);               /* placeholder, button text */
  --sl-color-white:          var(--nbg-color-fg-primary);    /* result-link text */
  --sl-color-text:           var(--nbg-color-fg-primary);    /* pagefind primary */
  --sl-color-text-accent:    var(--nbg-color-accent);        /* close button, clear ::before */
  --sl-color-text-invert:    var(--nbg-color-bg-canvas);     /* filter checkbox checkmark */
  --sl-color-accent:         var(--nbg-color-accent);        /* input focus border */
  --sl-color-accent-high:    var(--nbg-color-accent-high);   /* result-card hover outline */
  --sl-color-accent-low:     var(--nbg-color-accent-low);    /* result-card focus-within bg */
  --sl-color-backdrop-overlay: hsl(220 25% 5% / 0.7);        /* dialog::backdrop */
  --sl-shadow-lg:            0 24px 60px hsl(220 30% 0% / 0.4); /* dialog shadow */
}

:root[data-theme='light'] {
  /* Light-mode alternates — same alias surface, different values */
  --nbg-color-bg-canvas:       hsl(220 25% 99%);
  --nbg-color-bg-surface:      hsl(220 22% 100%);
  /* … etc. Starlight will re-evaluate the aliases on theme toggle. */
}
```

**That's it.** No `--pagefind-ui-*` line in our CSS. No `.pagefind-ui__*` selectors to write. The Pagefind modal retints automatically when our tokens change, when the dark/light toggle flips, and when the user opens the search.

If we want to **adjust** Pagefind-specific knobs (e.g. tighten the modal's `--pagefind-ui-border-radius` to match our new card radius), we can add a single targeted override scoped to `#starlight__search`:

```css
/* Optional — only if our token system uses different radii than Starlight's */
#starlight__search {
  --pagefind-ui-border-radius: var(--nbg-radius-md);
  --pagefind-ui-font: var(--nbg-font-body);
}
```

Scoping to `#starlight__search` (not `:root`) keeps these overrides isolated to the modal and avoids accidentally affecting embedded Pagefind UIs elsewhere (we have none, but the discipline is cheap).

## Dark/light mode behaviour — verified

Starlight's dark-mode toggle sets `data-theme="dark"` / `data-theme="light"` on `<html>`. Our token system MUST use the same selector form for the aliasing to retint Pagefind:

- ✅ Right: `:root[data-theme='dark'] { --sl-color-black: … }` — Pagefind retints on toggle.
- ❌ Wrong: `@media (prefers-color-scheme: dark) { --sl-color-black: … }` — survives until user clicks Starlight's toggle, then breaks.
- ❌ Wrong: `:root { --sl-color-black: … }` with no theme scope — locks dark mode regardless of toggle.

The `Search.astro` source (line 268) is the smoking gun: `:root[data-theme='light'] #starlight__search { --pagefind-ui-tag: var(--sl-color-gray-6); }`. Starlight expects us to follow the same convention.

## Failure modes

| Failure | Symptom | Cause | Fix |
|---|---|---|---|
| Pagefind modal still uses old colors after redesign | Modal opens, retains gray/blue Starlight defaults | `tokens.css` overrode `--nbg-color-*` but didn't ALIAS `--sl-color-*` to them | Add the `--sl-color-* : var(--nbg-color-*)` aliases as shown above |
| Pagefind modal retints in dark mode but breaks in light | Light mode toggle inverts the page but the modal stays dark | `--sl-color-*` overrides applied to `:root` only, not split between `:root[data-theme='dark']` and `:root[data-theme='light']` | Duplicate the alias block under both theme scopes |
| Pagefind tag chips show as solid blocks of accent color | `--pagefind-ui-tag` defaulted to text color | We aliased `--sl-color-gray-5` to a high-contrast color (a foreground) | Re-check which Starlight tokens are foreground vs background; `--sl-color-gray-5` is BORDER, `--sl-color-text` is FOREGROUND |
| Modal text becomes unreadable | Contrast ratio <4.5:1 | We aliased `--sl-color-white` (used for result-link text) to a token that's actually a background | Use the alias map in the snippet above as the source of truth — it categorizes each `--sl-color-*` by role |
| `--__sl-font` propagation breaks | Modal renders in browser default font after we add custom fonts | `--__sl-font` is Starlight's INTERNAL alias of `--sl-font`. Override `--sl-font`, not `--__sl-font` (which has the double underscore for "private") | Set `--sl-font: var(--nbg-font-body)` in `:root` |
| Custom `--pagefind-ui-scale` change breaks layout | Modal overflows on mobile | The scale factor multiplies EVERY internal size, including padding | Only change `--pagefind-ui-scale` if you've verified mobile breakpoints |

## Findings that affect the investigator's Axis 5 recommendation

The investigator wrote: *"Alias Pagefind's native `--pf-*` variables in tokens.css. Zero new code."* Two corrections:

1. **The variable prefix is `--pagefind-ui-*`, not `--pf-*`.** (`--pf-*` is the Component UI's prefix — we have Default UI.)
2. **Don't alias Pagefind's variables directly.** Alias Starlight's `--sl-color-*` tokens, because Starlight already does the work of feeding them into Pagefind. Aliasing at Starlight's layer is one fewer indirection, picks up Starlight's existing BEM-selector overrides for free, and survives any future Starlight upgrade that adjusts its own aliasing.

The "zero new code" headline stands. The path is just one layer above where the investigator pointed.

## Sources

- `site/node_modules/@astrojs/starlight/package.json` (Pagefind variant detection)
- `site/node_modules/@astrojs/starlight/components/Search.astro` (alias map between `--sl-color-*` and `--pagefind-ui-*`, lines 257–488)
- `site/node_modules/@pagefind/default-ui/svelte/{filters,result}.svelte` (variable surface enumeration)
- `site/node_modules/@pagefind/default-ui/css/ui.css` (default values, imported by Starlight under `@layer starlight.core`)
- `site/package-lock.json` (Pagefind ^1.3.0 resolution)
- https://pagefind.app/docs/css-variables/ (Pagefind 1.x stable variable contract)
- https://pagefind.app/docs/ui/ (Default UI vs Component UI distinction)
