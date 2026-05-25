// site/tests/build-output-glossary-tooltips.test.ts
//
// Snapshot tests for glossary auto-linking implementation (T3).
// Validates that glossary terms are auto-linked in rendered HTML,
// the JSON manifest is emitted, and the linking rules hold.
//
// Related: docs/refined-requests/beginner-foundations.md (AC1–AC18)
//          docs/design/project-design.md §F.1–F.11

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const siteRoot = join(import.meta.dirname, '..');
const distDir = join(siteRoot, 'dist');
const distIndexHtml = join(distDir, 'index.html');
const glossaryDir = join(siteRoot, '..', 'glossary');

beforeAll(() => {
  if (!existsSync(distIndexHtml)) {
    throw new Error('build-output-glossary-tooltips: dist/ not found. Run `npm run build` first.');
  }
});

describe('Glossary buttons in content pages', () => {
  it('foundations page contains ≥10 glossary buttons', () => {
    const foundationsHtml = join(distDir, 'start-here', 'foundations', 'index.html');
    expect(existsSync(foundationsHtml), 'foundations page exists').toBe(true);

    const html = readFileSync(foundationsHtml, 'utf-8');
    const buttonCount = (html.match(/data-glossary-slug=/g) || []).length;

    expect(buttonCount, 'foundations page has ≥10 data-glossary-slug buttons').toBeGreaterThanOrEqual(10);
  });

  it('day-1 page contains ≥5 glossary buttons', () => {
    const day1Html = join(distDir, 'start-here', 'day-1', 'index.html');
    expect(existsSync(day1Html), 'day-1 page exists').toBe(true);

    const html = readFileSync(day1Html, 'utf-8');
    const buttonCount = (html.match(/data-glossary-slug=/g) || []).length;

    expect(buttonCount, 'day-1 page has ≥5 data-glossary-slug buttons').toBeGreaterThanOrEqual(5);
  });
});

describe('JSON manifest emission', () => {
  const marketingPages = [
    'index.html',
    'glossary/index.html',
    'tips/index.html',
    'skills/index.html',
    'my-pins/index.html',
  ];

  it.each(marketingPages)('%s contains the JSON manifest script', (pagePath) => {
    const fullPath = join(distDir, pagePath);
    expect(existsSync(fullPath), `${pagePath} exists`).toBe(true);

    const html = readFileSync(fullPath, 'utf-8');
    const hasManifest = html.includes('id="nbg-glossary-data"');
    const hasCorrectType = html.includes('<script type="application/json" id="nbg-glossary-data">');

    expect(hasManifest, `${pagePath} has #nbg-glossary-data script`).toBe(true);
    expect(hasCorrectType, `${pagePath} script has type="application/json"`).toBe(true);
  });

  it('manifest JSON is well-formed with ≥28 terms', () => {
    const html = readFileSync(distIndexHtml, 'utf-8');
    const manifestMatch = html.match(/<script[^>]*id="nbg-glossary-data"[^>]*>(.+?)<\/script>/s);

    expect(manifestMatch, 'Manifest script found').not.toBeNull();

    const jsonContent = manifestMatch![1]!.trim();
    const parsed = JSON.parse(jsonContent);

    expect(Object.keys(parsed).length, 'Manifest has ≥28 keys').toBeGreaterThanOrEqual(28);

    // Check structure of first entry
    const firstKey = Object.keys(parsed)[0]!;
    const entry = parsed[firstKey]!;

    expect(entry, 'Entry has title string').toHaveProperty('title');
    expect(typeof entry.title, 'title is string').toBe('string');
    // Field is `tldrHtml` (pre-linked HTML, not raw tldr text) — see
    // GlossaryTerm.astro line 72 (linkGlossaryTerms(entry.data.tldr)).
    // The original `tldr` field was renamed when nested glossary tooltips
    // were added; this assertion was missed during that refactor.
    expect(entry, 'Entry has tldrHtml string').toHaveProperty('tldrHtml');
    expect(typeof entry.tldrHtml, 'tldrHtml is string').toBe('string');
    // Length check is generous because tldrHtml may contain inline
    // <button data-glossary-slug …> wrappers; raw tldr is still ≤160 chars.
    expect(entry.tldrHtml.length, 'tldrHtml is non-empty').toBeGreaterThan(0);
  });
});

describe('Button attributes (AC14 evidence)', () => {
  it('buttons have data-glossary-display attribute matching visible text', () => {
    const foundationsHtml = join(distDir, 'start-here', 'foundations', 'index.html');
    const html = readFileSync(foundationsHtml, 'utf-8');

    // Extract one button with its attributes and inner text
    const buttonMatch = html.match(
      /<button[^>]*data-glossary-slug="([^"]+)"[^>]*data-glossary-display="([^"]+)"[^>]*>([^<]+)<\/button>/
    );

    expect(buttonMatch, 'At least one button with both attributes found').not.toBeNull();

    const displayAttr = buttonMatch![2];
    const innerText = buttonMatch![3]!.trim();

    expect(displayAttr, 'data-glossary-display matches visible button text').toBe(innerText);
  });
});

describe('Canonical slug validation', () => {
  it('all data-glossary-slug values reference real glossary files', () => {
    const foundationsHtml = join(distDir, 'start-here', 'foundations', 'index.html');
    const html = readFileSync(foundationsHtml, 'utf-8');

    // Extract all slug values
    const slugMatches = html.matchAll(/data-glossary-slug="([^"]+)"/g);
    const slugs = Array.from(slugMatches).map((m) => m[1]!);

    expect(slugs.length, 'At least one slug extracted').toBeGreaterThan(0);

    for (const slug of slugs) {
      const glossaryFile = join(glossaryDir, `${slug}.md`);
      expect(existsSync(glossaryFile), `glossary/${slug}.md exists`).toBe(true);
    }
  });
});

describe('Button placement exclusions (AC2)', () => {
  it('no buttons inside heading tags <h1-h6>', () => {
    const foundationsHtml = join(distDir, 'start-here', 'foundations', 'index.html');
    const html = readFileSync(foundationsHtml, 'utf-8');

    // Extract all heading blocks (greedy closing tag match)
    const headingMatches = html.matchAll(/<h[1-6][^>]*>(.+?)<\/h[1-6]>/gs);

    for (const match of headingMatches) {
      const headingContent = match[1]!;
      const hasButton = headingContent.includes('data-glossary-slug=');

      expect(hasButton, `No glossary buttons inside heading: ${headingContent.substring(0, 50)}`).toBe(false);
    }
  });

  it('no buttons inside <pre><code> blocks', () => {
    const foundationsHtml = join(distDir, 'start-here', 'foundations', 'index.html');
    const html = readFileSync(foundationsHtml, 'utf-8');

    // Extract all code blocks
    const codeMatches = html.matchAll(/<pre[^>]*><code[^>]*>(.+?)<\/code><\/pre>/gs);

    for (const match of codeMatches) {
      const codeContent = match[1]!;
      const hasButton = codeContent.includes('data-glossary-slug=');

      expect(hasButton, `No glossary buttons inside code block: ${codeContent.substring(0, 50)}`).toBe(false);
    }
  });
});

describe('First-occurrence linking (AC7 adjusted for segmented rendering)', () => {
  it('first foundation step body has ≤1 instance of any given slug', () => {
    const foundationsHtml = join(distDir, 'start-here', 'foundations', 'index.html');
    const html = readFileSync(foundationsHtml, 'utf-8');

    // Extract first foundation section (id="f1")
    const f1Match = html.match(/<section[^>]*id="f1"[^>]*>(.+?)<\/section>/s);

    expect(f1Match, 'f1 section found').not.toBeNull();

    const f1Html = f1Match![1]!;
    const slugMatches = f1Html.matchAll(/data-glossary-slug="([^"]+)"/g);
    const slugs = Array.from(slugMatches).map((m) => m[1]!);

    // Count occurrences of each slug
    const counts = new Map<string, number>();
    for (const slug of slugs) {
      counts.set(slug, (counts.get(slug) || 0) + 1);
    }

    // Check that no slug appears more than once
    for (const [slug, count] of counts.entries()) {
      expect(count, `Slug "${slug}" appears ≤1 times in f1`).toBeLessThanOrEqual(1);
    }
  });
});

describe('Slug uniqueness within step', () => {
  it('every emitted slug is unique within foundation section f1', () => {
    const foundationsHtml = join(distDir, 'start-here', 'foundations', 'index.html');
    const html = readFileSync(foundationsHtml, 'utf-8');

    const f1Match = html.match(/<section[^>]*id="f1"[^>]*>(.+?)<\/section>/s);
    expect(f1Match, 'f1 section found').not.toBeNull();

    const f1Html = f1Match![1]!;
    const slugMatches = f1Html.matchAll(/data-glossary-slug="([^"]+)"/g);
    const slugs = Array.from(slugMatches).map((m) => m[1]!);

    const uniqueSlugs = new Set(slugs);

    expect(uniqueSlugs.size, 'All slugs in f1 are unique').toBe(slugs.length);
  });
});

describe('News exclusion (resolved OQ1)', () => {
  it('no news pages contain glossary buttons', () => {
    const newsDir = join(distDir, 'news');

    // If news directory exists, check all HTML files within it
    if (existsSync(newsDir)) {
      const htmlFiles = readdirSync(newsDir).filter((f) => f.endsWith('.html'));

      for (const filename of htmlFiles) {
        const html = readFileSync(join(newsDir, filename), 'utf-8');
        const hasButtons = html.includes('data-glossary-slug=');

        expect(hasButtons, `news/${filename} does NOT have glossary buttons`).toBe(false);
      }
    } else {
      // No news directory → test passes vacuously
      expect(true, 'No news directory exists (test passes)').toBe(true);
    }
  });
});
