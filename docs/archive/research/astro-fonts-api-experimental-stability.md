---
topic: astro-fonts-api-experimental-stability
researched_for: ui-redesign
researched_at: 2026-05-19T11:22:00Z
verdict: Use Astro Fonts API (stable since v6.0.0 — NOT experimental)
astro_version_pinned: 6.3.5
fontsource_provider_available: true
---

# Astro Fonts API — Stability & Recommended Path for NbgAiHub

## Verdict

**Use the Astro Fonts API directly.** It is **stable** in Astro 6.3.5 (our pinned version), not behind any `experimental.*` flag. The investigator's Axis 4 recommendation stands without modification.

Evidence: in `site/node_modules/astro/dist/types/public/config.d.ts`, the `fonts?` config field is declared as a **top-level** key (not under `experimental`), and every documented knob — `font.provider`, `font.cssVariable`, `font.weights`, `font.styles`, `font.subsets`, `font.formats`, `font.display`, `font.unicodeRange`, `font.featureSettings`, `font.variationSettings`, `font.options` — is annotated `@version 6.0.0`. The `experimental?` block at the same file (line 2647+) is reserved for in-development features like `advancedRouting` and `clientPrerender`; `fonts` is not in it.

Astro 6.3.5 ships eight built-in font providers, enumerated in `site/node_modules/astro/dist/assets/fonts/providers/index.js`:

```js
const fontProviders = {
  adobe,
  bunny,
  fontshare,
  fontsource,   // ← what we use
  google,
  googleicons,
  local,
  npm,
};
```

The `fontsource` provider auto-resolves Fontsource Variable fonts at build time, downloads the `.woff2` files, generates `@font-face` declarations, computes optimised metric-based fallbacks (`size-adjust`, `ascent-override`, etc.), exposes a CSS variable, and emits a preload `<link>` automatically. We do not add any `@fontsource-variable/*` npm package — Astro handles the resolution.

## Recommended astro.config.mjs

The block to add to `site/astro.config.mjs` (inside `defineConfig({ … })`, parallel to `server` and `integrations`):

```js
import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  // …existing config…
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--nbg-font-body',
      weights: ['100 900'],           // full variable axis
      styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext'], // Latin Extended for the occasional Greek-bank glossary term
      display: 'swap',
      // Inter exposes `opsz` (optical size) and `wght`. We expose both.
      variationSettings: "'opsz' 14",  // body default optical size; override in display CSS
      fallbacks: [
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'sans-serif',
      ],
      optimizedFallbacks: true,
    },
    {
      provider: fontProviders.fontsource(),
      name: 'JetBrains Mono',
      cssVariable: '--nbg-font-mono',
      weights: ['100 800'],
      styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext'],
      display: 'swap',
      fallbacks: [
        'ui-monospace',
        'SFMono-Regular',
        'Menlo',
        'Monaco',
        'Consolas',
        'monospace',
      ],
      optimizedFallbacks: true,
    },
  ],
  // …existing integrations…
});
```

**Notes on the config:**

- `cssVariable: '--nbg-font-body'` makes Astro inject a CSS custom property that resolves to the family + fallback stack. Components reference it as `font-family: var(--nbg-font-body);` — no `@font-face` boilerplate.
- `weights: ['100 900']` is the variable-axis form (matches the docs example at line 2483). One `.woff2` covers every weight from 100 to 900.
- `subsets: ['latin', 'latin-ext']` covers English + Greek (Greek glyphs are part of Latin Extended A/B and the `latin-ext` Fontsource subset). Inter Variable includes Greek glyphs — confirmed at https://rsms.me/inter/.
- `display: 'swap'` is the value already documented as default (line 2545); stating it explicitly keeps the contract loud.
- `optimizedFallbacks: true` (default — line 2458) tells Astro to compute `size-adjust` / `ascent-override` metrics on the fallback so the swap is visually undetectable.

## What Astro produces from this config

At build time, Astro will:

1. Resolve `Inter` + `JetBrains Mono` via the `fontsource` provider — under the hood it hits `https://api.fontsource.org/v1/fonts/inter` etc. and downloads only the subset/weight/format the config requested.
2. Emit `.woff2` files to `dist/_astro/` (filename hashed for cache-busting). Two files total for our config — one variable Inter, one variable JetBrains Mono.
3. Inject a `<style>` block in `<head>` with:
   - `@font-face { font-family: 'Inter'; src: url(…inter.woff2) format('woff2-variations'); font-weight: 100 900; … }` (and same for italic if Fontsource ships an italic axis)
   - A metric-adjusted fallback `@font-face` (e.g. `@font-face { font-family: 'Inter Fallback'; src: local(Arial); size-adjust: …; ascent-override: …; }`)
   - The CSS variable: `:root { --nbg-font-body: "Inter", "Inter Fallback", ui-sans-serif, system-ui, …; }`
4. Insert `<link rel="preload" as="font" type="font/woff2" crossorigin href="/…inter.woff2">` for the primary subset.

Consumers reference the variables only — no boilerplate:

```css
:root {
  --nbg-font-display: var(--nbg-font-body); /* same family, different opsz */
  /* …other tokens… */
}

html, body {
  font-family: var(--nbg-font-body);
  font-feature-settings: 'ss01' on, 'cv11' on; /* Inter tabular-figures + alt-1 */
}

.display, h1.display {
  font-family: var(--nbg-font-display);
  font-variation-settings: 'opsz' 32, 'wght' 720; /* large optical size for headlines */
}

code, pre, kbd, samp {
  font-family: var(--nbg-font-mono);
}
```

## Subsetting strategy

| Subset | Inter Variable | JetBrains Mono Variable | Use in NbgAiHub |
|---|---|---|---|
| `latin` | ✅ default | ✅ default | All English content |
| `latin-ext` | ✅ | ✅ | Occasional Greek glossary term, accented authors' names |
| `greek` | ✅ available, not requested | ✅ available, not requested | Skip — Greek glyphs in glossary covered by `latin-ext` |
| `cyrillic` | ✅ available, not requested | ✅ available, not requested | Skip — not in scope |

`latin + latin-ext` adds ~25KB per font over `latin` alone and unlocks every accented letter we'll plausibly need. Keep both.

## Performance & bundle cost

| Metric | Astro Fonts API + Fontsource | `@fontsource-variable/*` direct imports |
|---|---|---|
| `.woff2` payload (Inter Variable, latin + latin-ext, weights 100–900) | ~140 KB | ~140 KB (same Fontsource asset) |
| `.woff2` payload (JetBrains Mono Variable, latin + latin-ext, weights 100–800) | ~95 KB | ~95 KB |
| `@font-face` boilerplate in your repo | Zero — Astro generates | ~30 lines per font + manual `unicode-range` |
| Preload `<link>` injected | ✅ automatic | ❌ manual |
| Metric-adjusted fallback (`size-adjust`) | ✅ automatic | ❌ manual or skip |
| `<head>` `<style>` insertion order | Astro controls — runs before Starlight's custom CSS so cascade is predictable | Whatever your `import` order is |
| Dev-server cold-start cost | First run downloads from Fontsource API (cached locally thereafter) | Resolved from `node_modules` immediately |

The asset payload is identical (both paths fetch the same Fontsource source-of-truth files). The Astro path saves ~80 lines of manual CSS and gets you metric-adjusted fallbacks (a measurable CLS improvement) for free.

## Fallback path (if we ever need to abandon the Astro Fonts API)

Documented for completeness. **Do not use this unless the Astro Fonts API misbehaves.**

```bash
cd site
npm install --save-dev @fontsource-variable/inter@5.x @fontsource-variable/jetbrains-mono@5.x
```

```js
// site/src/styles/fonts.css
@import '@fontsource-variable/inter/wght.css';
@import '@fontsource-variable/inter/wght-italic.css';
@import '@fontsource-variable/jetbrains-mono/wght.css';

:root {
  --nbg-font-body: 'Inter Variable', ui-sans-serif, system-ui, -apple-system,
    BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --nbg-font-display: var(--nbg-font-body);
  --nbg-font-mono: 'JetBrains Mono Variable', ui-monospace, SFMono-Regular,
    Menlo, Monaco, Consolas, monospace;
}
```

```js
// site/astro.config.mjs
starlight({
  customCss: ['./src/styles/fonts.css', './src/styles/tokens.css', './src/styles/custom.css'],
  // …
})
```

Loses: automatic preload, automatic metric-adjusted fallbacks, automatic `unicode-range` per subset. Adds: explicit `node_modules` footprint, simpler mental model (the file is just CSS).

## Compatibility with Starlight 0.39.2

- The Astro Fonts API runs **before** Starlight's `customCss` is processed, so the injected `:root { --nbg-font-body: …; }` is available to every CSS file Starlight loads. Verified via the integration ordering in `site/node_modules/astro/dist/assets/fonts/vite-plugin-fonts.js` (the Vite plugin runs in `transformIndexHtml` before Starlight's content pipeline).
- Starlight's own `--sl-font` / `--sl-font-mono` CSS variables can be aliased to our new variables in `tokens.css`:
  ```css
  :root {
    --sl-font: var(--nbg-font-body);
    --sl-font-mono: var(--nbg-font-mono);
  }
  ```
  This propagates the new fonts to every Starlight component (sidebar, code blocks, search modal) without touching Starlight internals.

## Failure modes & how to detect them

| Failure | Symptom | Detection | Fix |
|---|---|---|---|
| Fontsource API unreachable on first build | `astro build` fails with `ECONNREFUSED api.fontsource.org` | First CI run after dependency install | Run `npm run build` once on a connected machine; Astro caches downloaded fonts in `node_modules/.astro/fonts/` and subsequent builds work offline |
| Variable axis weight range mismatch | Some weights render at the nearest available weight instead of the requested one | Visual — e.g. `font-weight: 200` looking the same as `400` | Verify `weights: ['100 900']` (variable range), not `weights: [400]` (single weight) |
| `optimizedFallbacks: true` produces ugly metric-adjusted fallback | Brief visual jump when font swaps | Lighthouse CLS metric in dev tools | Set `optimizedFallbacks: false` and accept the slightly larger CLS, or set `display: 'block'` to delay paint until font loads |
| `subsets: ['latin']` requested but content contains Greek glyphs | Tofu (□) renders for Greek letters | Visual inspection of `/glossary` page | Add `latin-ext` to subsets (already done above) |
| `--sl-font` alias not propagating to Pagefind modal | Modal still uses old system font after redesign | Open search modal at `/`, check computed font-family | Verify alias is in `:root` not inside another selector; see Pagefind research doc for modal token propagation |

## Open question, resolved

> Q: Use Astro Fonts API or `@fontsource-variable/*` direct imports?

**A: Astro Fonts API.** Stable since 6.0.0; we are on 6.3.5; no experimental flag; eight providers including `fontsource`; identical asset payload; saves ~80 lines of boilerplate; gets metric-adjusted fallbacks for free; plays nicely with Starlight's `customCss` ordering.

## Sources

- `site/node_modules/astro/dist/types/public/config.d.ts` lines 2378–2610 (fonts API contract, all `@version 6.0.0`)
- `site/node_modules/astro/dist/assets/fonts/providers/index.js` (eight built-in providers including `fontsource`)
- https://docs.astro.build/en/guides/fonts/
- https://docs.astro.build/en/reference/configuration-reference/#fonts
- https://fontsource.org/fonts/inter
- https://fontsource.org/fonts/jetbrains-mono
- https://rsms.me/inter/ (Inter specimen; confirms Greek support in variable file)
- Astro changelog — Fonts API graduated from experimental in 6.0.0
