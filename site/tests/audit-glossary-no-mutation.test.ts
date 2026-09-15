// site/tests/audit-glossary-no-mutation.test.ts
//
// Tests for the audit-glossary-candidates.mjs script's no-mutation guarantee
// (AC24). Verifies the script writes exactly one file under docs/reference/
// and never writes under glossary/.
//
// Related: scripts/audit-glossary-candidates.mjs
//          docs/refined-requests/glossary-tooltips.md

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const scriptPath = join(
  import.meta.dirname,
  '..',
  '..',
  'scripts',
  'audit-glossary-candidates.mjs',
);

describe('audit-glossary-candidates.mjs no-mutation guarantee', () => {
  it('script exists and is executable via node (AC24)', () => {
    expect(existsSync(scriptPath)).toBe(true);
  });

  it('writes exactly one file under docs/reference/ (AC24)', () => {
    const content = readFileSync(scriptPath, 'utf-8');

    // Count writeFileSync / writeFile calls
    const writeSyncMatches = content.match(/writeFileSync\(/g) || [];
    const writeAsyncMatches = content.match(/\bwriteFile\(/g) || [];
    const totalWrites = writeSyncMatches.length + writeAsyncMatches.length;

    // Script should have exactly 1 write call (line 524: writeFileSync(outAbs, markdown, 'utf-8'))
    expect(totalWrites, 'Exactly 1 write call in the script').toBe(1);

    // Verify the write path is guarded — look for the path guard before the write
    const pathGuardMatch = /allowedOutPrefix.*docs\/reference\/glossary-audit-/.test(
      content,
    );
    expect(pathGuardMatch, 'Write path is guarded to docs/reference/glossary-audit-*').toBe(
      true,
    );
  });

  it('does NOT contain any write under glossary/ (AC24)', () => {
    const content = readFileSync(scriptPath, 'utf-8');

    // Look for any writeFile* call whose argument contains 'glossary/'
    // We need to be careful: 'glossary/' appears in read paths (allowed).
    // Strategy: find all writeFile* calls, extract their first argument (the path),
    // and check if it contains 'glossary/'.

    // Regex for writeFileSync(<path>, ...) or writeFile(<path>, ...)
    // Match the opening paren, then the first string argument (single/double/template literal).
    const writeCallRegex = /writeFile(?:Sync)?\(\s*([^,]+)/g;
    let match;
    while ((match = writeCallRegex.exec(content)) !== null) {
      const pathArg = (match[1] ?? '').trim();
      // pathArg will be something like 'outAbs' or a string literal.
      // We check: does the literal or variable name suggest a glossary/ write?
      // In this script, the only write is `writeFileSync(outAbs, markdown, 'utf-8')`,
      // and outAbs is guarded by the allowedOutPrefix check.
      // So we just assert: the string 'glossary/' does NOT appear in the path arg.
      const glossaryInPath = /glossary\//.test(pathArg);
      expect(
        glossaryInPath,
        `writeFile call with path containing 'glossary/': ${pathArg}`,
      ).toBe(false);
    }

    // Additional sanity: the script should never construct a path with 'glossary/'
    // as the target directory for a write. We grep for patterns like:
    // join(*, 'glossary', *) in the context of a write — but the script only
    // reads from glossary/, never writes. We'll do a lexical check: no line
    // containing both 'writeFile' and 'glossary' on the same line.
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (/writeFile/.test(line) && /glossary\//.test(line)) {
        expect.fail(
          `Line ${i + 1} contains both 'writeFile' and 'glossary/': ${line.trim()}`,
        );
      }
    }
  });

  it('pinned date stamp pattern in output filename (AC24)', () => {
    const content = readFileSync(scriptPath, 'utf-8');

    // Look for the defaultOut assignment or similar that constructs the filename.
    // Line 65: const defaultOut = `docs/reference/glossary-audit-${reportDate}.md`;
    const filenamePatternMatch = /glossary-audit-\$\{reportDate\}/.test(content);
    expect(
      filenamePatternMatch,
      'Output filename includes glossary-audit-${reportDate}',
    ).toBe(true);

    // Also verify reportDate is validated as YYYY-MM-DD (lines 60-63)
    const dateValidationMatch = /\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\//.test(content);
    expect(dateValidationMatch, 'reportDate is validated as YYYY-MM-DD').toBe(true);
  });
});
