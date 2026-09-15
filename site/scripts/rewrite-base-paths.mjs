#!/usr/bin/env node
/**
 * Postbuild base-path rewrite for GitHub Pages.
 *
 * Astro's `base: '/NbgAiHub'` config prefixes asset imports, sitemap URLs,
 * and `import.meta.env.BASE_URL` — but it does NOT rewrite hardcoded
 * `<a href="/glossary/">` in .astro JSX or `(/glossary/#cli)` links inside
 * authored markdown. This script walks `dist/` after the build and prepends
 * the base prefix to any root-relative URL that points at one of our known
 * top-level routes.
 *
 * Idempotent: only rewrites if the prefix isn't already present.
 * Asset paths (`/_astro/...`, `/_pagefind/...`, `/_data/...`) are already
 * base-aware via Astro so we leave them alone.
 */
import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Mirrors astro.config.mjs — both read `PUBLIC_BASE`. Unset (local build) =
// no rewrite; the Pages workflow sets `PUBLIC_BASE=/NbgAiHub` so deployed
// HTML gets the prefix.
const BASE = process.env.PUBLIC_BASE;
if (!BASE) {
  console.log('rewrite-base-paths: PUBLIC_BASE unset — skipping rewrite');
  process.exit(0);
}

// Known top-level routes — the only paths we rewrite. Anything not on this
// list is either an asset (handled by Astro) or an external link.
//
// IMPORTANT — when adding a new top-level pillar / route, add its slug
// here. Skip this and the deployed site will 404 on any `<a href="/xxx/">`
// link to it from the topnav, sidebar, or other authored content.
// Symptom: local build works, production deploy 404s at
// `https://556lowcodenocode.github.io/<route>/` (missing /NbgAiHub/ prefix).
const ROUTES = [
  'glossary',
  'skills',
  'tips',
  'news',
  'newsletter',
  'use-cases',
  'start-here',
  'my-pins',
  'about',
  '404',
];

// Match: attribute="/route" or attribute="/route/..." or attribute="/route#..."
// Captures the attribute name + the route segment, leaves the rest as-is.
const ROUTE_PATTERN = new RegExp(
  `(\\b(?:href|src|action|data-pin-href|content)=["'])/(${ROUTES.join('|')})(/|#|"|')`,
  'g',
);

function rewriteFile(path) {
  const original = readFileSync(path, 'utf8');
  const rewritten = original.replace(ROUTE_PATTERN, (_match, attr, route, tail) => {
    return `${attr}${BASE}/${route}${tail}`;
  });
  if (rewritten !== original) {
    writeFileSync(path, rewritten);
    return true;
  }
  return false;
}

function walk(dir, exts = ['.html']) {
  let touched = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      touched += walk(full, exts);
    } else if (exts.some((e) => full.endsWith(e))) {
      if (rewriteFile(full)) touched++;
    }
  }
  return touched;
}

const here = fileURLToPath(new URL('.', import.meta.url));
const distDir = join(here, '..', 'dist');

const touched = walk(distDir);
console.log(`rewrite-base-paths: prefixed ${BASE} in ${touched} file(s) under dist/`);
