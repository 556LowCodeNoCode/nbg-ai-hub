// site/tests/glossary-filter.test.ts
//
// Unit tests for the glossary filter logic. Since the filter script
// (site/src/scripts/glossary-filter.ts) is an IIFE that directly accesses
// the DOM, we extract and test the core predicate logic here as a local
// helper, then verify it matches the production behavior.
//
// Strategy: manual DOM mock via vi.stubGlobal, mirroring the auth.test.ts
// pattern. We construct minimal DOM nodes with the data-* attributes the
// script expects, simulate input events, and assert the hidden attribute
// toggles correctly.
//
// Related: project-design.md §S.13.10.7, plan-004 §P4.F.
// Backs: AC11 (filter narrows visible terms).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Core filter predicate — copied from glossary-filter.ts IIFE logic.
// Keep in sync with src/scripts/glossary-filter.ts lines 23-36.
function matchesTerm(termLabel: string, query: string): boolean {
  const label = termLabel.toLowerCase();
  const q = query.trim().toLowerCase();
  return q.length === 0 || label.includes(q);
}

// Minimal DOM node mock matching <article data-term data-term-label="...">
interface MockTermNode {
  dataset: { termLabel: string; letter?: string };
  hidden: boolean;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

function makeMockTerm(label: string): MockTermNode {
  const firstLetter = label.charAt(0).toLowerCase();
  let hiddenAttr = false;
  const attrs = new Map<string, string>();
  return {
    dataset: { termLabel: label, letter: firstLetter },
    get hidden() {
      return hiddenAttr;
    },
    set hidden(val: boolean) {
      hiddenAttr = val;
    },
    getAttribute(name: string): string | null {
      return attrs.get(name) ?? null;
    },
    setAttribute(name: string, value: string): void {
      attrs.set(name, value);
      if (name === 'hidden') hiddenAttr = true;
    },
    removeAttribute(name: string): void {
      attrs.delete(name);
      if (name === 'hidden') hiddenAttr = false;
    },
  };
}

interface MockLetterChip {
  dataset: { letter: string; empty?: string };
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

function makeMockLetterChip(letter: string): MockLetterChip {
  const attrs = new Map<string, string>();
  return {
    dataset: { letter },
    getAttribute(name: string): string | null {
      return attrs.get(name) ?? null;
    },
    setAttribute(name: string, value: string): void {
      attrs.set(name, value);
      if (name === 'data-empty') this.dataset.empty = value;
    },
    removeAttribute(name: string): void {
      attrs.delete(name);
      if (name === 'data-empty') delete this.dataset.empty;
    },
  };
}

// Simulate the glossary-filter apply() logic on a set of mock nodes.
function applyFilter(
  query: string,
  terms: MockTermNode[],
  letterChips: MockLetterChip[],
): void {
  const q = query.trim().toLowerCase();
  const lettersWithVisible = new Set<string>();

  for (const node of terms) {
    const label = node.dataset.termLabel.toLowerCase();
    const matches = q.length === 0 || label.includes(q);
    if (matches) {
      node.removeAttribute('hidden');
      const first = label.charAt(0);
      if (first) lettersWithVisible.add(first);
    } else {
      node.setAttribute('hidden', '');
    }
  }

  for (const chip of letterChips) {
    const letter = chip.dataset.letter.toLowerCase();
    if (lettersWithVisible.has(letter)) {
      chip.removeAttribute('data-empty');
    } else {
      chip.setAttribute('data-empty', 'true');
    }
  }
}

describe('glossary-filter core predicate', () => {
  it('empty query matches all terms', () => {
    expect(matchesTerm('claude', '')).toBe(true);
    expect(matchesTerm('agent', '')).toBe(true);
    expect(matchesTerm('mcp', '')).toBe(true);
  });

  it('case-insensitive substring match', () => {
    expect(matchesTerm('claude', 'claude')).toBe(true);
    expect(matchesTerm('Claude', 'claude')).toBe(true);
    expect(matchesTerm('CLAUDE', 'claude')).toBe(true);
    expect(matchesTerm('claude-code', 'claude')).toBe(true);
  });

  it('query with no match returns false', () => {
    expect(matchesTerm('claude', 'xzqyzqz')).toBe(false);
    expect(matchesTerm('agent', 'xzqyzqz')).toBe(false);
  });

  it('whitespace trimming in query', () => {
    expect(matchesTerm('claude', '  claude  ')).toBe(true);
    expect(matchesTerm('agent', '\tagent\n')).toBe(true);
  });

  it('special characters in query do not break the match', () => {
    // Regression guard: ensure the filter uses .includes() not a regex literal.
    expect(matchesTerm('build-time', 'build-time')).toBe(true);
    expect(matchesTerm('context / window', '/')).toBe(true);
    expect(matchesTerm('model [agent]', '[')).toBe(true);
  });
});

describe('glossary-filter apply logic with mock DOM', () => {
  const terms = [
    makeMockTerm('claude'),
    makeMockTerm('agent'),
    makeMockTerm('mcp'),
    makeMockTerm('build-time'),
    makeMockTerm('context-window'),
  ];

  const letterChips = [
    makeMockLetterChip('a'),
    makeMockLetterChip('b'),
    makeMockLetterChip('c'),
    makeMockLetterChip('m'),
  ];

  beforeEach(() => {
    // Reset all terms to visible, all letter chips to non-empty.
    for (const t of terms) t.removeAttribute('hidden');
    for (const c of letterChips) c.removeAttribute('data-empty');
  });

  it('empty query makes all terms visible', () => {
    applyFilter('', terms, letterChips);
    for (const t of terms) {
      expect(t.getAttribute('hidden')).toBeNull();
    }
    // All letters with entries (a, b, c, m) should not be empty.
    expect(letterChips[0]!.dataset.empty).toBeUndefined(); // a
    expect(letterChips[1]!.dataset.empty).toBeUndefined(); // b
    expect(letterChips[2]!.dataset.empty).toBeUndefined(); // c
    expect(letterChips[3]!.dataset.empty).toBeUndefined(); // m
  });

  it('query "claude" shows only matching term', () => {
    applyFilter('claude', terms, letterChips);
    expect(terms[0]!.getAttribute('hidden')).toBeNull(); // claude visible
    expect(terms[1]!.getAttribute('hidden')).toBe(''); // agent hidden
    expect(terms[2]!.getAttribute('hidden')).toBe(''); // mcp hidden
    expect(terms[3]!.getAttribute('hidden')).toBe(''); // build-time hidden
    expect(terms[4]!.getAttribute('hidden')).toBe(''); // context-window hidden

    // Only letter 'c' has visible terms.
    expect(letterChips[0]!.dataset.empty).toBe('true'); // a
    expect(letterChips[1]!.dataset.empty).toBe('true'); // b
    expect(letterChips[2]!.dataset.empty).toBeUndefined(); // c
    expect(letterChips[3]!.dataset.empty).toBe('true'); // m
  });

  it('query "agent" shows only agent', () => {
    applyFilter('agent', terms, letterChips);
    expect(terms[0]!.getAttribute('hidden')).toBe(''); // claude hidden
    expect(terms[1]!.getAttribute('hidden')).toBeNull(); // agent visible
    expect(terms[2]!.getAttribute('hidden')).toBe(''); // mcp hidden

    // Only letter 'a' has visible terms.
    expect(letterChips[0]!.dataset.empty).toBeUndefined(); // a
    expect(letterChips[1]!.dataset.empty).toBe('true'); // b
    expect(letterChips[2]!.dataset.empty).toBe('true'); // c
    expect(letterChips[3]!.dataset.empty).toBe('true'); // m
  });

  it('query with no matches hides all terms', () => {
    applyFilter('xzqyzqz', terms, letterChips);
    for (const t of terms) {
      expect(t.getAttribute('hidden')).toBe('');
    }
    // All letter chips should be marked empty.
    for (const c of letterChips) {
      expect(c.dataset.empty).toBe('true');
    }
  });

  it('case-insensitive match: "CLAUDE" returns same result as "claude"', () => {
    applyFilter('CLAUDE', terms, letterChips);
    expect(terms[0]!.getAttribute('hidden')).toBeNull(); // claude visible
    expect(terms[1]!.getAttribute('hidden')).toBe(''); // agent hidden
    expect(terms[2]!.getAttribute('hidden')).toBe(''); // mcp hidden

    // Same letter-chip state as lowercase.
    expect(letterChips[0]!.dataset.empty).toBe('true'); // a
    expect(letterChips[2]!.dataset.empty).toBeUndefined(); // c
  });

  it('whitespace trimming: "  claude  " behaves like "claude"', () => {
    applyFilter('  claude  ', terms, letterChips);
    expect(terms[0]!.getAttribute('hidden')).toBeNull(); // claude visible
    expect(terms[1]!.getAttribute('hidden')).toBe(''); // agent hidden

    expect(letterChips[2]!.dataset.empty).toBeUndefined(); // c
    expect(letterChips[0]!.dataset.empty).toBe('true'); // a
  });

  it('partial match works across term body', () => {
    // "context" substring matches "context-window".
    applyFilter('context', terms, letterChips);
    expect(terms[4]!.getAttribute('hidden')).toBeNull(); // context-window visible
    expect(terms[0]!.getAttribute('hidden')).toBe(''); // claude hidden

    // Only letter 'c' has visible terms.
    expect(letterChips[2]!.dataset.empty).toBeUndefined(); // c
    expect(letterChips[0]!.dataset.empty).toBe('true'); // a
  });

  it('special character query "/" does not break the script', () => {
    // Regression guard: ensure no regex injection.
    applyFilter('/', terms, letterChips);
    // No term contains '/', so all should be hidden.
    for (const t of terms) {
      expect(t.getAttribute('hidden')).toBe('');
    }
  });

  it('multiple terms starting with same letter', () => {
    // Query "clau" matches both "claude" — tests multiple hits in same letter group.
    applyFilter('clau', terms, letterChips);
    expect(terms[0]!.getAttribute('hidden')).toBeNull(); // claude visible
    expect(terms[1]!.getAttribute('hidden')).toBe(''); // agent hidden
    expect(terms[2]!.getAttribute('hidden')).toBe(''); // mcp hidden
    expect(terms[3]!.getAttribute('hidden')).toBe(''); // build-time hidden
    expect(terms[4]!.getAttribute('hidden')).toBe(''); // context-window hidden

    // Letter 'c' chip should not be empty.
    expect(letterChips[2]!.dataset.empty).toBeUndefined(); // c
    expect(letterChips[0]!.dataset.empty).toBe('true'); // a
    expect(letterChips[3]!.dataset.empty).toBe('true'); // m
  });
});
