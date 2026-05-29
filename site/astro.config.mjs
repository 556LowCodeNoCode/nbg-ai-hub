// site/astro.config.mjs
//
// Astro 6 + Starlight 0.39 configuration for NbgAiHub.
// See docs/design/project-design.md §S.6.1 for the contract.

import { defineConfig, fontProviders } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkGlossaryLink from './src/plugins/remark-glossary-link.ts';

export default defineConfig({
  // GitHub Pages — published as a project page under the 556LowCodeNoCode org.
  // URL: https://556lowcodenocode.github.io/NbgAiHub/
  // The trailing-slash setting matches Starlight's link generation.
  //
  // `base` is env-aware. Unset locally so the dev server runs at root
  // (`http://localhost:4321/start-here/day-1/`). The Pages workflow sets
  // `PUBLIC_BASE=/NbgAiHub` before `astro build` so the deployed site
  // resolves under `/NbgAiHub/`. The postbuild rewrite script at
  // `scripts/rewrite-base-paths.mjs` prefixes any hardcoded root-relative
  // links in built HTML to match.
  site: 'https://556lowcodenocode.github.io',
  base: process.env.PUBLIC_BASE,
  trailingSlash: 'always',

  // CLAUDE.md → Ports: dev server pinned to 4321.
  // CLI flag `--port 4322` is the escape hatch on collision (don't edit this).
  server: { port: 4321, host: false },

  // The floating Astro dev dock interferes with UAT screenshots and isn't
  // useful in this project (we're not editing Astro internals live). Off.
  devToolbar: { enabled: false },

  // News is hard-redirected to the colleague-curated AgentNews feed.
  // External URL — Astro emits a meta-refresh + JS fallback HTML page
  // at /news/ in the static build. Per the 2026-05-25 nav rework.
  redirects: {
    '/news/': 'https://biks2013.github.io/AgentNews/',
  },

  // §S.14.5 — Glossary auto-linking. See docs/refined-requests/glossary-tooltips.md
  // and docs/design/project-design.md §S.14.3 for the plugin contract.
  // The plugin walks the markdown AST at build time, matches glossary
  // slugs + aliases case-insensitively with word-boundary awareness,
  // skips fenced code / inline code / headings / existing links /
  // Starlight asides / the term's own glossary page, and wraps the first
  // match per file with a plain HTML `<button data-glossary-slug="…">`
  // that GlossaryTerm.astro's runtime registry script hydrates into a
  // popover. News under `news/published/` is excluded per OQ1 (resolved
  // 2026-05-25 — news surface routes externally, see redirects above).
  markdown: {
    remarkPlugins: [
      [
        remarkGlossaryLink,
        {
          glossaryDir: '../glossary',
          excludePaths: ['/news/published/'],
        },
      ],
    ],
    // Shiki defaults to `github-dark` which made every fenced code block on
    // light-themed pages render as a near-black slab with hard-to-read
    // syntax tokens (UAT image #14 — `claude --dangerously-skip-permissions`
    // was nearly invisible). Dual themes so dark-mode visitors still get a
    // dark code block; light-mode gets the matching light variant. The
    // surrounding <pre> background is also restyled to our --nbg-surface-2
    // token via content-prose.css so the block sits on the page like a
    // muted callout, not a black hole.
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },

  // P4.B — Astro Fonts API. Stable since Astro 6.0.0 (we are on 6.3.5).
  // See docs/research/astro-fonts-api-experimental-stability.md and
  // project-design.md §S.13.3.
  // The CSS variables --nbg-font-body and --nbg-font-mono are referenced
  // by tokens/primitives.css (--nbg-ff-body / --nbg-ff-mono) and aliased
  // to --sl-font / --sl-font-mono in tokens/aliases.css so all Starlight
  // chrome inherits the new typography.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--nbg-font-body',
      weights: ['100 900'],
      styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext'],
      display: 'swap',
      variationSettings: "'opsz' 14",
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

  integrations: [
    starlight({
      // Brand display name. The repo/package identifier remains `NbgAiHub`
      // (locked code-side), but every user-visible surface — sticky bar
      // brand, browser tab, SiteTitle on content-detail pages — renders
      // the spaced form "NBG AI Hub".
      title: 'NBG AI Hub',
      description: 'A field manual for newcomers to Claude Code.',
      customCss: [
        './src/styles/tokens/index.css',
        './src/styles/motion.css',
        './src/styles/content-prose.css',
        './src/styles/content-chrome.css',
      ],
      components: {
        // Header override (2026-05-19 unified-header refactor): on splash
        // pages, SplashAwareHeader renders ONE unified nbg-topnav (brand +
        // sections + Pagefind search + AuthControls + ThemeSelect + mobile
        // drawer + SignInModal). On content-detail pages it renders the
        // default Starlight Header markup, so SocialIcons is still slotted
        // there. Reverses the earlier "Header override rejected as fragile"
        // decision in project-design.md §S.13.14; new contract in §S.13.6.1.
        Header: './src/components/SplashAwareHeader.astro',
        // SocialIcons remains slotted into the default Starlight Header on
        // content-detail (non-splash) pages. On splash pages,
        // SocialIconsOverride internally short-circuits and renders nothing
        // because AuthControls + SignInModal are mounted by SplashAwareHeader.
        SocialIcons: './src/components/SocialIconsOverride.astro',
        // Theme overrides (2026-05-25 late-evening): collapse Starlight's
        // 3-option (auto/light/dark) <select> down to a 2-option toggle
        // (light/dark) with light as the default. See the override files
        // for the full rationale; tl;dr is that the bank-colleague audience
        // benefits from a single consistent surface, and respecting OS
        // `prefers-color-scheme` (the upstream default) caused dark-mode-OS
        // visitors to land on the dark variant against project direction.
        ThemeProvider: './src/components/overrides/ThemeProvider.astro',
        ThemeSelect: './src/components/overrides/ThemeSelect.astro',
      },
      // 2026-05-25 navigation rework: flatten the sidebar to one entry per
      // pillar. Removed: Start Here group (collapsed into single
      // Foundations link), Reference (content merged into Tips + Glossary),
      // Contribute group (unlinked — pages remain orphaned for reversal).
      // News redirects externally via the `redirects` config above.
      sidebar: [
        { label: 'Home', link: '/' },
        { label: 'Foundations', link: '/start-here/foundations/' },
        { label: 'Day 1', link: '/start-here/day-1/' },
        { label: 'Use Cases', link: '/use-cases/' },
        { label: 'Tips & Tricks', link: '/tips/' },
        { label: 'Skills', link: '/skills/' },
        { label: 'Glossary', link: '/glossary/' },
        {
          label: 'News ↗',
          link: 'https://biks2013.github.io/AgentNews/',
          attrs: { target: '_blank', rel: 'noopener' },
        },
        { label: 'My Pins', link: '/my-pins/' },
      ],
    }),
  ],
});
