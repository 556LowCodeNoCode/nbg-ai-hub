// site/tests/remark-glossary-first-occurrence.test.ts
//
// Tests for AC7 (first-occurrence wrapping) from docs/design/project-design.md §S.14.3.

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

describe('First-occurrence wrapping (AC7)', () => {
  it('wraps only the first of three occurrences', async () => {
    const result = await process('agent does X. agent runs Y. agent finishes Z.');
    // Count occurrences of data-glossary-slug="agent"
    const matches = result.match(/data-glossary-slug="agent"/g) || [];
    expect(matches.length).toBe(1);
  });

  it('tracks first-occurrence per CANONICAL slug, not per variant', async () => {
    const result = await process('PR landed. Then another PRs came in.');
    // Both "PR" and "PRs" are aliases of pull-request
    const matches = result.match(/data-glossary-slug="pull-request"/g) || [];
    expect(matches.length).toBe(1);
    // Verify the first variant won
    expect(result).toContain('data-glossary-display="PR"');
  });

  it('first-occurrence is independent across terms', async () => {
    const result = await process('agent and skill and agent again');
    const agentMatches = result.match(/data-glossary-slug="agent"/g) || [];
    const skillMatches = result.match(/data-glossary-slug="skill"/g) || [];
    expect(agentMatches.length).toBe(1);
    expect(skillMatches.length).toBe(1);
  });

  it('resets first-occurrence tracking per file', async () => {
    const md = 'agent is important';

    const result1 = await process(md, '/test/page1.md');
    const result2 = await process(md, '/test/page2.md');

    // Both files should get the button
    expect(result1).toContain('data-glossary-slug="agent"');
    expect(result2).toContain('data-glossary-slug="agent"');
  });

  it('first-occurrence survives across multiple paragraphs', async () => {
    const result = await process('First para with agent.\n\nSecond para also mentions agent.\n\nThird with agent too.');
    const matches = result.match(/data-glossary-slug="agent"/g) || [];
    expect(matches.length).toBe(1);
  });

  it('alias variant used first wins for display', async () => {
    const result = await process('Multiple agents run. The agent coordinator manages them.');
    const matches = result.match(/data-glossary-slug="agent"/g) || [];
    expect(matches.length).toBe(1);
    // "agents" appears first
    expect(result).toContain('data-glossary-display="agents"');
  });
});
