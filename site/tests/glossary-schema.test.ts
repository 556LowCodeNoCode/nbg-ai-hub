// site/tests/glossary-schema.test.ts
//
// Tests for the extended glossary schema (AC1, AC2, AC3, AC4, AC5).
// Validates the `tldr` (required, ≤160 chars) and `aliases` (optional array)
// fields that power the glossary-tooltips feature (§S.14).
//
// Related: site/src/content.config.ts lines 135-153
//          docs/refined-requests/glossary-tooltips.md

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Reconstruct the glossary schema matching content.config.ts lines 135-153.
// The base shape is not exported, so we inline the minimal glossary-specific
// fields we're testing plus a few base fields to make parse succeed.
const glossarySchema = z.object({
  type: z.literal('glossary').default('glossary'),
  title: z.string().min(1),
  audience: z.enum(['beginner', 'advanced', 'both']).default('both'),
  tldr: z
    .string()
    .min(1, { message: 'tldr is required (≤160 chars, plain text)' })
    .max(160, { message: 'tldr must be ≤160 characters' }),
  aliases: z.array(z.string()).default([]),
});

describe('glossary schema validation', () => {
  it('accepts valid glossary frontmatter (AC1)', () => {
    const valid = {
      type: 'glossary',
      title: 'Test Term',
      audience: 'both' as const,
      tldr: 'A test term that fits within 160 chars.',
      aliases: ['test-alias', 'testing'],
    };
    const result = glossarySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tldr).toBe('A test term that fits within 160 chars.');
      expect(result.data.aliases).toEqual(['test-alias', 'testing']);
    }
  });

  it('accepts missing aliases (defaults to []) (AC2)', () => {
    const withoutAliases = {
      type: 'glossary',
      title: 'Test Term',
      audience: 'both' as const,
      tldr: 'A test term.',
    };
    const result = glossarySchema.safeParse(withoutAliases);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aliases).toEqual([]);
    }
  });

  it('rejects missing tldr (AC3)', () => {
    const withoutTldr = {
      type: 'glossary',
      title: 'Test Term',
      audience: 'both' as const,
      aliases: [],
    };
    const result = glossarySchema.safeParse(withoutTldr);
    expect(result.success).toBe(false);
    if (!result.success) {
      const tldrError = result.error.issues.find((i) => i.path[0] === 'tldr');
      expect(tldrError).toBeDefined();
      // Zod's default message is "expected string, received undefined" —
      // the custom message only appears when the string IS present but too short/long.
      expect(tldrError?.message).toMatch(/string|required/i);
    }
  });

  it('rejects empty tldr (AC3)', () => {
    const emptyTldr = {
      type: 'glossary',
      title: 'Test Term',
      audience: 'both' as const,
      tldr: '',
      aliases: [],
    };
    const result = glossarySchema.safeParse(emptyTldr);
    expect(result.success).toBe(false);
    if (!result.success) {
      const tldrError = result.error.issues.find((i) => i.path[0] === 'tldr');
      expect(tldrError).toBeDefined();
    }
  });

  it('rejects tldr > 160 chars (AC3)', () => {
    const longTldr = {
      type: 'glossary',
      title: 'Test Term',
      audience: 'both' as const,
      tldr: 'x'.repeat(161),
      aliases: [],
    };
    const result = glossarySchema.safeParse(longTldr);
    expect(result.success).toBe(false);
    if (!result.success) {
      const tldrError = result.error.issues.find((i) => i.path[0] === 'tldr');
      expect(tldrError).toBeDefined();
      expect(tldrError?.message).toContain('≤160');
    }
  });

  it('rejects non-array aliases (AC3)', () => {
    const badAliases = {
      type: 'glossary',
      title: 'Test Term',
      audience: 'both' as const,
      tldr: 'Valid tldr.',
      aliases: 'not an array' as any,
    };
    const result = glossarySchema.safeParse(badAliases);
    expect(result.success).toBe(false);
    if (!result.success) {
      const aliasError = result.error.issues.find((i) => i.path[0] === 'aliases');
      expect(aliasError).toBeDefined();
    }
  });

  it('rejects non-string in aliases array (AC3)', () => {
    const badAlias = {
      type: 'glossary',
      title: 'Test Term',
      audience: 'both' as const,
      tldr: 'Valid tldr.',
      aliases: [123] as any,
    };
    const result = glossarySchema.safeParse(badAlias);
    expect(result.success).toBe(false);
    if (!result.success) {
      const aliasError = result.error.issues.find((i) => i.path.includes('aliases'));
      expect(aliasError).toBeDefined();
    }
  });
});

describe('content files invariant (AC4 + AC5)', () => {
  const glossaryDir = join(import.meta.dirname, '..', '..', 'glossary');

  function parseFrontmatter(raw: string): Record<string, any> {
    if (!raw.startsWith('---')) return {};
    const end = raw.indexOf('\n---', 3);
    if (end === -1) return {};
    const block = raw.slice(3, end);
    const lines = block.split('\n');
    const data: Record<string, any> = {};
    for (const line of lines) {
      const m = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
      if (!m || !m[1] || m[2] === undefined) continue;
      const key: string = m[1];
      let val: string = m[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        const inner = val.slice(1, -1).trim();
        data[key] = inner
          ? inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))
          : [];
      } else if (val.startsWith('"') && val.endsWith('"')) {
        data[key] = val.slice(1, -1);
      } else if (val.startsWith("'") && val.endsWith("'")) {
        data[key] = val.slice(1, -1);
      } else {
        data[key] = val;
      }
    }
    return data;
  }

  it('every glossary file has valid tldr ≤160 chars (AC4)', () => {
    const files = readdirSync(glossaryDir).filter((n) => n.endsWith('.md'));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const raw = readFileSync(join(glossaryDir, file), 'utf-8');
      const fm = parseFrontmatter(raw);
      expect(
        fm.tldr,
        `${file}: tldr must be a non-empty string`,
      ).toBeTruthy();
      expect(
        typeof fm.tldr,
        `${file}: tldr must be string`,
      ).toBe('string');
      expect(
        (fm.tldr as string).length,
        `${file}: tldr must be ≤160 chars, got ${(fm.tldr as string).length}`,
      ).toBeLessThanOrEqual(160);
      expect(
        (fm.tldr as string).length,
        `${file}: tldr must be non-empty`,
      ).toBeGreaterThan(0);
    }
  });

  it('7 new glossary files exist with valid frontmatter (AC5)', () => {
    const expectedNew = [
      'cli.md',
      'frontmatter.md',
      'yaml.md',
      'markdown.md',
      'rss.md',
      'model.md',
      'hook.md',
    ];
    for (const file of expectedNew) {
      const path = join(glossaryDir, file);
      expect(existsSync(path), `${file} must exist`).toBe(true);
      const raw = readFileSync(path, 'utf-8');
      const fm = parseFrontmatter(raw);
      expect(fm.tldr, `${file}: must have tldr`).toBeTruthy();
      expect(typeof fm.tldr, `${file}: tldr must be string`).toBe('string');
      expect(
        (fm.tldr as string).length,
        `${file}: tldr must be ≤160 chars`,
      ).toBeLessThanOrEqual(160);
    }
  });

  it('glossary corpus is non-empty (AC5)', () => {
    // Count was 32; per the AUTO block in CLAUDE.md the canonical source of
    // truth is `node scripts/sync-doc-counts.mjs`. Tests should not pin a
    // hard count — they should just enforce the corpus exists.
    const files = readdirSync(glossaryDir).filter((n) => n.endsWith('.md'));
    expect(files.length, 'Glossary corpus has entries').toBeGreaterThan(0);
  });
});
