// site/tests/remark-glossary-skip-rules.test.ts
//
// Tests for AC8-AC13 (skip rules) from docs/design/project-design.md §S.14.3.

import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkDirective from 'remark-directive';
import remarkGlossaryLink from '../src/plugins/remark-glossary-link.ts';
import { resolve } from 'node:path';

const glossaryDir = resolve(import.meta.dirname, '../../glossary');

async function process(md: string, filePath = '/test/page.md'): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkGlossaryLink, { glossaryDir, excludePaths: ['/news/published/'] })
    .use(remarkStringify)
    .process({ value: md, path: filePath });
  return String(file);
}

describe('Skip fenced code blocks (AC8)', () => {
  it('skips fenced code blocks', async () => {
    const result = await process('```\nagent in code\n```');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('still wraps text outside code blocks', async () => {
    const result = await process('Before code.\n```\nagent in code\n```\nAfter with agent.');
    const matches = result.match(/data-glossary-slug="agent"/g) || [];
    expect(matches.length).toBe(1);
    expect(result).toContain('After with');
  });

  it('skips code blocks with language tag', async () => {
    const result = await process('```ts\nconst agent = "value";\n```');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });
});

describe('Skip inline code (AC9)', () => {
  it('skips inline code', async () => {
    const result = await process('type `agent` to run');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('wraps text outside inline code', async () => {
    const result = await process('The agent uses `code` blocks');
    expect(result).toContain('data-glossary-slug="agent"');
  });

  it('skips multiple inline code segments', async () => {
    const result = await process('Use `agent` or `skill` commands');
    expect(result).not.toContain('data-glossary-slug="agent"');
    expect(result).not.toContain('data-glossary-slug="skill"');
  });
});

describe('Skip headings (AC10)', () => {
  it('skips h1', async () => {
    const result = await process('# agent header');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('skips h2', async () => {
    const result = await process('## agent section');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('skips h3', async () => {
    const result = await process('### agent subsection');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('skips h4', async () => {
    const result = await process('#### agent detail');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('skips h5', async () => {
    const result = await process('##### agent minor');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('skips h6', async () => {
    const result = await process('###### agent smallest');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('wraps text in paragraph after heading', async () => {
    const result = await process('# Title\n\nParagraph with agent.');
    const matches = result.match(/data-glossary-slug="agent"/g) || [];
    expect(matches.length).toBe(1);
  });
});

describe('Skip existing markdown links (AC11)', () => {
  it('skips existing markdown links', async () => {
    const result = await process('[agent](/glossary/#agent)');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('skips link text', async () => {
    const result = await process('[Read about agent here](https://example.com)');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('wraps text outside links', async () => {
    const result = await process('The agent has [documentation](https://example.com).');
    expect(result).toContain('data-glossary-slug="agent"');
  });

  it('skips reference-style links', async () => {
    const result = await process('[agent][1]\n\n[1]: /glossary');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });
});

describe('Skip self-page (AC12)', () => {
  it('skips self-page', async () => {
    const result = await process('agent is the term', '/path/glossary/agent.md');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('still wraps OTHER terms on self-page', async () => {
    const result = await process('agent and skill on the same page', '/path/glossary/agent.md');
    expect(result).not.toContain('data-glossary-slug="agent"');
    expect(result).toContain('data-glossary-slug="skill"');
  });

  it('wraps term on different glossary page', async () => {
    const result = await process('agent is mentioned', '/path/glossary/skill.md');
    expect(result).toContain('data-glossary-slug="agent"');
  });

  it('self-page detection is case-sensitive on filename', async () => {
    // Filename is "agent.md" not "Agent.md"
    const result = await process('agent term', '/path/glossary/Agent.md');
    // Should wrap because filename case doesn't match
    expect(result).toContain('data-glossary-slug="agent"');
  });
});

describe('Skip Starlight asides (AC13)', () => {
  it('skips :::tip aside', async () => {
    const result = await process(':::tip\nagent is the term\n:::');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('skips :::note aside', async () => {
    const result = await process(':::note\nagent note\n:::');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('skips :::caution aside', async () => {
    const result = await process(':::caution\nagent warning\n:::');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('skips :::danger aside', async () => {
    const result = await process(':::danger\nagent danger\n:::');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });

  it('wraps text outside asides', async () => {
    const result = await process('Before aside agent.\n\n:::tip\nInside\n:::\n\nAfter aside agent.');
    const matches = result.match(/data-glossary-slug="agent"/g) || [];
    expect(matches.length).toBe(1);
  });

  it('skips aside with custom title', async () => {
    const result = await process(':::tip[Custom Title]\nagent inside\n:::');
    expect(result).not.toContain('data-glossary-slug="agent"');
  });
});
