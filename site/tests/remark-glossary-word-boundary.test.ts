// site/tests/remark-glossary-word-boundary.test.ts
//
// Tests for AC6 (word-boundary matching) and AC14 (case-preserving display)
// from docs/design/project-design.md §S.14.3.

import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGlossaryLink from '../src/plugins/remark-glossary-link.ts';
import { resolve } from 'node:path';

const glossaryDir = resolve(import.meta.dirname, '../../glossary');

async function process(md: string, filePath = '/test/page.md'): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGlossaryLink, { glossaryDir, excludePaths: ['/news/published/'] })
    .use(remarkStringify)
    .process({ value: md, path: filePath });
  return String(file);
}

describe('Word-boundary matching (AC6)', () => {
  it('matches "cli" as standalone word', async () => {
    const result = await process('use the cli today');
    expect(result).toContain('data-glossary-slug="cli"');
  });

  it('does NOT match "cli" inside "click"', async () => {
    const result = await process('just click the link');
    expect(result).not.toContain('data-glossary-slug="cli"');
  });

  it('does NOT match "cli" inside "clip"', async () => {
    const result = await process('clip the value');
    expect(result).not.toContain('data-glossary-slug="cli"');
  });

  it('matches "agent" but not as suffix', async () => {
    const result = await process('each agent runs in');
    expect(result).toContain('data-glossary-slug="agent"');
  });

  it('matches "agents" as an alias', async () => {
    const result = await process('agents are powerful');
    expect(result).toContain('data-glossary-slug="agent"');
    expect(result).toContain('data-glossary-display="agents"');
  });

  it('does NOT match "agent" inside "agent2"', async () => {
    const result = await process('agent2 is a misnomer');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });
});

describe('Case-preserving display (AC14)', () => {
  it('case-insensitive match, casing preserved in display', async () => {
    const result = await process('a Pull Request landed');
    expect(result).toContain('data-glossary-slug="pull-request"');
    expect(result).toContain('data-glossary-display="Pull Request"');
  });

  it('case variants of alias', async () => {
    const result = await process('the PRs are stacking');
    expect(result).toContain('data-glossary-slug="pull-request"');
    expect(result).toContain('data-glossary-display="PRs"');
  });

  it('lowercase variant preserved', async () => {
    const result = await process('open a pr now');
    expect(result).toContain('data-glossary-slug="pull-request"');
    expect(result).toContain('data-glossary-display="pr"');
  });

  it('mixed case in middle of sentence', async () => {
    const result = await process('The AGENT system works');
    expect(result).toContain('data-glossary-slug="agent"');
    expect(result).toContain('data-glossary-display="AGENT"');
  });
});
