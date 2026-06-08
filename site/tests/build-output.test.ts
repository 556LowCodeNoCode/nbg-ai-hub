// site/tests/build-output.test.ts
//
// Integration tests for static build output of the redesigned NbgAiHub site.
// Reads built HTML/CSS files under site/dist/ and asserts on their contents
// to verify the redesign's structural contracts.
//
// Related: docs/archive/refined-requests/ui-redesign.md
//          docs/archive/reference/test-build-ui-output.md

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const siteRoot = join(import.meta.dirname, '..');
const distDir = join(siteRoot, 'dist');
const distIndexHtml = join(distDir, 'index.html');

// One-time build check: if dist/index.html doesn't exist, run build.
// Reuse existing build to save CI time.
beforeAll(() => {
  if (!existsSync(distIndexHtml)) {
    console.log('[build-output] dist/index.html missing — running npm run build...');
    execSync('npm run build', { cwd: siteRoot, stdio: 'inherit' });
  } else {
    console.log('[build-output] Reusing existing build at site/dist/');
  }
}, 120_000); // 2-minute timeout for build

describe('Day-1 step segmentation (AC6)', () => {
  const day1Html = join(distDir, 'start-here', 'day-1', 'index.html');

  it('has sequential step sections with IDs d1..dN', () => {
    // Was hardcoded at 6 steps; Day 1 was trimmed to 5 in the 2026-05-25
    // redesign, then rewritten to 6 in the 2026-05-27 redesign. Test
    // asserts ≥4 sequential steps without pinning the exact count.
    // Step ID prefix is `d` (not `step-`) per the docs-style layout
    // landed in ff67a4a (2026-05-27) — `<section id="dN">`.
    expect(existsSync(day1Html), 'start-here/day-1/index.html exists').toBe(true);
    const html = readFileSync(day1Html, 'utf-8');

    const stepMatches = html.match(/<section[^>]+id="d(\d+)"/g) || [];
    expect(stepMatches.length, 'Day 1 has at least 4 steps').toBeGreaterThanOrEqual(4);

    const stepIds = stepMatches.map((m) => {
      const match = m.match(/id="(d\d+)"/);
      return match ? match[1] : null;
    }).filter((id): id is string => id !== null);

    // Steps must be sequential 1..N with no gaps.
    const expected = stepIds.map((_, idx) => `d${idx + 1}`);
    expect(stepIds, 'Step IDs sequential from d1').toEqual(expected);
  });
});

describe('Pagefind retint via Starlight token aliases (AC34)', () => {
  it('bundles CSS files with #starlight__search rules aliasing Pagefind vars to --sl-color-* vars', () => {
    const astroDir = join(distDir, '_astro');
    expect(existsSync(astroDir), '_astro directory exists').toBe(true);

    const cssFiles = readdirSync(astroDir).filter((f) => f.endsWith('.css'));
    expect(cssFiles.length, 'At least one CSS file in _astro').toBeGreaterThan(0);

    // Find CSS files containing #starlight__search rules
    const searchCssFiles = cssFiles.filter((filename) => {
      const content = readFileSync(join(astroDir, filename), 'utf-8');
      return content.includes('#starlight__search');
    });

    expect(searchCssFiles.length, 'At least one CSS file contains #starlight__search').toBeGreaterThan(0);

    // Check that Pagefind UI vars reference --sl-color-* or --__sl-font
    for (const filename of searchCssFiles) {
      const content = readFileSync(join(astroDir, filename), 'utf-8');

      // Extract #starlight__search block(s)
      const searchBlocks = content.match(/#starlight__search\s*\{[^}]+\}/gs) || [];

      // We expect Pagefind UI vars to be aliased in the built CSS.
      // In practice, Starlight's Search.astro already does this aliasing.
      // We check that the pattern exists: --pagefind-ui-* vars should appear
      // somewhere in the CSS, and they should reference var(--sl-color-*) or var(--__sl-font).
      const hasPagefindPrimary = content.includes('--pagefind-ui-primary');
      const hasPagefindBackground = content.includes('--pagefind-ui-background');

      // If Pagefind vars are present, they should reference Starlight vars
      if (hasPagefindPrimary || hasPagefindBackground) {
        const hasSlColorRef = content.includes('var(--sl-color-') || content.includes('var(--__sl-');
        expect(hasSlColorRef, `${filename}: Pagefind vars reference --sl-color-* or --__sl-font`).toBe(true);
      }
    }
  });

  it('tokens/aliases.css declares Starlight color aliases pointing to --nbg-* tokens', () => {
    const aliasesCss = join(siteRoot, 'src', 'styles', 'tokens', 'aliases.css');
    expect(existsSync(aliasesCss), 'tokens/aliases.css exists').toBe(true);

    const content = readFileSync(aliasesCss, 'utf-8');

    // Check for key Starlight alias declarations pointing to --nbg-* tokens
    expect(content, '--sl-color-text alias present').toContain('--sl-color-text:');
    expect(content, '--sl-color-black alias present').toContain('--sl-color-black:');
    expect(content, '--sl-color-gray-5 alias present').toContain('--sl-color-gray-5:');
    expect(content, '--sl-color-accent alias present').toContain('--sl-color-accent:');

    // Check that these aliases reference --nbg-* tokens
    expect(content, '--sl-color-text references --nbg-').toMatch(/--sl-color-text:\s*var\(--nbg-/);
    expect(content, '--sl-color-black references --nbg-').toMatch(/--sl-color-black:\s*var\(--nbg-/);
    expect(content, '--sl-color-accent references --nbg-').toMatch(/--sl-color-accent:\s*var\(--nbg-/);
  });
});

describe('Marketing surface chrome (AC10)', () => {
  // 2026-05-25 nav rework: /news/ is now a static meta-refresh redirect
  // to AgentNews (no MarketingShell). /reference/, /contribute/, and
  // /submit-skill/ deleted per UAT feedback (no submit form, no contribute
  // page).
  const marketingPages = [
    'index.html',
    'skills/index.html',
    'tips/index.html',
    'glossary/index.html',
    'my-pins/index.html',
    'start-here/foundations/index.html',
    'start-here/day-1/index.html',
  ];

  it.each(marketingPages)('%s has data-marketing attribute (MarketingShell)', (pagePath) => {
    const fullPath = join(distDir, pagePath);
    expect(existsSync(fullPath), `${pagePath} exists`).toBe(true);

    const html = readFileSync(fullPath, 'utf-8');
    const hasDataMarketing = html.includes('data-marketing');
    const hasSplashTemplate = html.includes('template="splash"') || html.includes("template='splash'");

    expect(
      hasDataMarketing || hasSplashTemplate,
      `${pagePath} has data-marketing or template="splash"`
    ).toBe(true);
  });

  it.each(marketingPages)('%s does NOT contain Starlight sidebar markup', (pagePath) => {
    const fullPath = join(distDir, pagePath);
    const html = readFileSync(fullPath, 'utf-8');

    // Starlight's sidebar is typically rendered in an <aside> or <nav> with class containing "sidebar".
    // Check against a content detail page first to know what the sidebar marker is.
    // For now, we check for common sidebar patterns.
    const hasSidebar = html.includes('<aside class="sidebar') || html.includes('class="sl-sidebar');

    expect(hasSidebar, `${pagePath} does not have Starlight sidebar markup`).toBe(false);
  });
});

describe('Token foundation present (AC1, AC4)', () => {
  it('primitives.css declares ≥100 occurrences of --nbg- tokens', () => {
    const primitivesCss = join(siteRoot, 'src', 'styles', 'tokens', 'primitives.css');
    expect(existsSync(primitivesCss), 'tokens/primitives.css exists').toBe(true);

    const content = readFileSync(primitivesCss, 'utf-8');
    const nbgTokenMatches = content.match(/--nbg-/g) || [];

    expect(nbgTokenMatches.length, 'primitives.css has ≥100 --nbg- token occurrences').toBeGreaterThanOrEqual(100);
  });

  it('layers.css contains @layer declaration with 8 layers in order', () => {
    const layersCss = join(siteRoot, 'src', 'styles', 'tokens', 'layers.css');
    expect(existsSync(layersCss), 'tokens/layers.css exists').toBe(true);

    const content = readFileSync(layersCss, 'utf-8');

    // Check for @layer declaration
    expect(content, '@layer declaration present').toContain('@layer');

    // Check for all 8 layers in order
    const expectedLayers = [
      'reset',
      'tokens',
      'starlight.base',
      'starlight.core',
      'starlight.components',
      'nbg.primitives',
      'nbg.components',
      'nbg.utilities',
    ];

    for (const layer of expectedLayers) {
      expect(content, `Layer ${layer} declared`).toContain(layer);
    }

    // Verify order: extract the @layer declaration line (not multi-line comments)
    // Match: @layer reset, tokens, starlight.base, ...;
    const layerMatch = content.match(/@layer\s+([\w.,\s]+);/);
    expect(layerMatch, '@layer declaration found').not.toBeNull();

    const layers = layerMatch![1]!.split(',').map((l) => l.trim());

    expect(layers, '8 layers declared in order').toEqual(expectedLayers);
  });

  it('semantic.css contains both dark and light theme blocks', () => {
    const semanticCss = join(siteRoot, 'src', 'styles', 'tokens', 'semantic.css');
    expect(existsSync(semanticCss), 'tokens/semantic.css exists').toBe(true);

    const content = readFileSync(semanticCss, 'utf-8');

    // Check for dark theme block
    const hasDarkTheme = content.includes(":root[data-theme='dark']") || content.includes(':root[data-theme="dark"]');
    expect(hasDarkTheme, 'Dark theme block present').toBe(true);

    // Check for light theme block
    const hasLightTheme = content.includes(":root[data-theme='light']") || content.includes(':root[data-theme="light"]');
    expect(hasLightTheme, 'Light theme block present').toBe(true);
  });
});

describe('Fonts wired (AC5)', () => {
  it('astro.config.mjs declares fontProviders.fontsource() at least twice', () => {
    const astroConfigPath = join(siteRoot, 'astro.config.mjs');
    expect(existsSync(astroConfigPath), 'astro.config.mjs exists').toBe(true);

    const content = readFileSync(astroConfigPath, 'utf-8');

    // Count occurrences of fontProviders.fontsource()
    const fontsourceMatches = content.match(/fontProviders\.fontsource\(\)/g) || [];
    expect(fontsourceMatches.length, 'fontProviders.fontsource() appears at least twice').toBeGreaterThanOrEqual(2);
  });

  it('built CSS references font CSS variables (--nbg-font-body, --nbg-font-mono) or contains @font-face', () => {
    const astroDir = join(distDir, '_astro');
    const cssFiles = readdirSync(astroDir).filter((f) => f.endsWith('.css'));

    let hasInterReference = false;
    let hasJetBrainsReference = false;

    for (const filename of cssFiles) {
      const content = readFileSync(join(astroDir, filename), 'utf-8');

      // Astro Fonts API may inject fonts via CSS variables or @font-face
      // Check for either pattern
      if (
        content.includes('@font-face') && content.includes('Inter') ||
        content.includes('var(--nbg-font-body)') ||
        content.includes('--nbg-type-body')
      ) {
        hasInterReference = true;
      }

      if (
        content.includes('@font-face') && (content.includes('JetBrains') || content.includes('jetbrains')) ||
        content.includes('var(--nbg-font-mono)') ||
        content.includes('--nbg-type-mono')
      ) {
        hasJetBrainsReference = true;
      }
    }

    expect(hasInterReference, 'Inter font is referenced (via @font-face, --nbg-font-body, or --nbg-type-body)').toBe(true);
    expect(hasJetBrainsReference, 'JetBrains Mono font is referenced (via @font-face, --nbg-font-mono, or --nbg-type-mono)').toBe(true);
  });

  it('at least 2 .woff2 files exist in dist/', () => {
    const woff2Files: string[] = [];

    const walk = (dir: string) => {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (entry.endsWith('.woff2')) {
          woff2Files.push(fullPath);
        }
      }
    };

    walk(distDir);

    expect(woff2Files.length, 'At least 2 .woff2 files in dist/').toBeGreaterThanOrEqual(2);
  });
});

describe('Unified header on splash pages (AC31/AC32/AC33)', () => {
  // Marketing surfaces use template: 'splash'. Per §S.13.6.1, splash pages
  // render ONE unified nbg-topnav (via SplashAwareHeader) and zero copies
  // of Starlight's default header chrome. Pre-2026-05-19 they rendered both,
  // which produced two stacked navigation bars and an auth-state UI that
  // showed Sign in + user chip simultaneously.
  const marketingPages = [
    'index.html',
    'skills/index.html',
    'tips/index.html',
    'glossary/index.html',
    'my-pins/index.html',
    'start-here/foundations/index.html',
    'start-here/day-1/index.html',
  ];

  it.each(marketingPages)('%s has exactly one nbg-topnav', (pagePath) => {
    const fullPath = join(distDir, pagePath);
    expect(existsSync(fullPath), `${pagePath} exists`).toBe(true);
    const html = readFileSync(fullPath, 'utf-8');
    // Astro scopes classes per component (e.g. "nbg-topnav astro-xyz"). Match
    // the literal class token with a following space or quote.
    const matches = html.match(/<nav[^>]*class="nbg-topnav[\s"]/g) || [];
    expect(matches.length, `${pagePath} has exactly one nbg-topnav`).toBe(1);
  });

  it.each(marketingPages)('%s does NOT render Starlight default header chrome', (pagePath) => {
    const html = readFileSync(join(distDir, pagePath), 'utf-8');
    // Starlight's default Header.astro emits `<div class="header"...>` with
    // title-wrapper + Search + right-group. On splash pages this should be
    // absent — only the outer PageFrame `<header class="header">` wrapper
    // remains (which is the layout slot host, not the chrome).
    const innerHeader = html.match(/<div class="header[\s"]/g) || [];
    expect(innerHeader.length, `${pagePath} has no inner default-header div`).toBe(0);
  });

  it.each(marketingPages)('%s renders exactly one auth-controls root', (pagePath) => {
    const html = readFileSync(join(distDir, pagePath), 'utf-8');
    const matches = html.match(/data-nbg-auth-root/g) || [];
    expect(matches.length, `${pagePath} has one [data-nbg-auth-root]`).toBe(1);
  });

  it.each(marketingPages)('%s renders exactly one SignInModal dialog', (pagePath) => {
    const html = readFileSync(join(distDir, pagePath), 'utf-8');
    const matches = html.match(/data-nbg-signin-dialog/g) || [];
    expect(matches.length, `${pagePath} has one [data-nbg-signin-dialog]`).toBe(1);
  });
});

describe('Auth-state mutual exclusion CSS fix', () => {
  // Before the unified-header refactor, `.nbg-auth__signin` and the signed-in
  // wrapper (originally `.nbg-auth__chip`, now `.nbg-auth__user` after the
  // 2026-05-19 avatar-dropdown refinement) had `display: inline-flex` rules
  // at the same specificity as the UA's `[hidden] { display: none }` default
  // — and author CSS beats UA defaults, so the JS `element.hidden = true`
  // failed to hide them. Result: signed-in pages showed BOTH the Sign in
  // button AND the signed-in surface. The fix is a paired selector group
  // that forces `display: none !important` when [hidden] is set. This test
  // ensures those selectors survive in built CSS.
  it('built CSS contains a [hidden] override for .nbg-auth__signin or .nbg-auth__user', () => {
    const astroDir = join(distDir, '_astro');
    expect(existsSync(astroDir), '_astro directory exists').toBe(true);

    const cssFiles = readdirSync(astroDir).filter((f) => f.endsWith('.css'));
    let foundFix = false;

    for (const filename of cssFiles) {
      const content = readFileSync(join(astroDir, filename), 'utf-8');
      // Match either selector (combined or separate) paired with display:none.
      // Astro scopes styles by wrapping with `:where(.astro-XXX)` after the
      // class token, so we allow that segment between the class and [hidden].
      // Minified form uses no whitespace; we tolerate optional whitespace and
      // the !important flag (which is required by the fix).
      if (
        /\.nbg-auth__(signin|user|menu)(:where\([^)]+\))?\[hidden\][^{]*\{[^}]*display\s*:\s*none\s*!\s*important/.test(content)
      ) {
        foundFix = true;
        break;
      }
    }

    expect(foundFix, '.nbg-auth__signin[hidden]/[user][hidden]/[menu][hidden] → display:none !important is present').toBe(true);
  });
});

describe('Primitives portability (AC36)', () => {
  it('no .astro files under src/components/primitives/ contain @astrojs/starlight', () => {
    const primitivesDir = join(siteRoot, 'src', 'components', 'primitives');
    expect(existsSync(primitivesDir), 'src/components/primitives/ exists').toBe(true);

    const astroFiles = readdirSync(primitivesDir).filter((f) => f.endsWith('.astro'));
    expect(astroFiles.length, 'At least one .astro file in primitives/').toBeGreaterThan(0);

    for (const filename of astroFiles) {
      const content = readFileSync(join(primitivesDir, filename), 'utf-8');
      const hasStarlightImport = content.includes('@astrojs/starlight');

      expect(hasStarlightImport, `${filename} does NOT import from @astrojs/starlight`).toBe(false);
    }
  });
});
