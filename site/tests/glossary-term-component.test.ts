// site/tests/glossary-term-component.test.ts
//
// Tests for the GlossaryTerm.astro component portability and contract
// (AC15, AC16, AC20, AC21, AC22).
//
// These are file-inspection tests since .astro components cannot be directly
// imported into vitest.
//
// Related: site/src/components/primitives/GlossaryTerm.astro
//          docs/refined-requests/glossary-tooltips.md

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(
  import.meta.dirname,
  '..',
  'src',
  'components',
  'primitives',
  'GlossaryTerm.astro',
);

describe('GlossaryTerm.astro component', () => {
  it('exists at primitives path (AC20)', () => {
    expect(existsSync(componentPath)).toBe(true);
  });

  it('has zero @astrojs/starlight imports (AC21)', () => {
    const content = readFileSync(componentPath, 'utf-8');
    const starlightImportMatch = /from\s+['"]@astrojs\/starlight/.test(content);
    expect(starlightImportMatch).toBe(false);
  });

  it('uses only --nbg-* tokens, no raw colour literals (AC22)', () => {
    const content = readFileSync(componentPath, 'utf-8');

    // Extract CSS blocks (between <style> and </style>)
    const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
    expect(styleMatch).toBeTruthy();
    if (!styleMatch || !styleMatch[1]) return;

    const css: string = styleMatch[1];

    // Assert no hex colour literals (#rgb, #rgba)
    const hexMatch = /#[0-9a-fA-F]{3,8}\b/.test(css);
    expect(hexMatch, 'No hex colour literals in CSS').toBe(false);

    // Assert no rgb/rgba/hsl/hsla
    const rgbMatch = /\brgba?\(/.test(css);
    expect(rgbMatch, 'No rgb() or rgba() in CSS').toBe(false);

    const hslMatch = /\bhsla?\(/.test(css);
    expect(hslMatch, 'No hsl() or hsla() in CSS').toBe(false);

    // Sanity: at least one --nbg- token reference
    const nbgTokenMatch = /var\(--nbg-/.test(css);
    expect(nbgTokenMatch, 'At least one var(--nbg-*) reference').toBe(true);
  });

  it('emits popover + aria-describedby plumbing (AC15, AC16)', () => {
    const content = readFileSync(componentPath, 'utf-8');

    // Look for setAttribute('popovertarget', ...) in the wiring script
    const popovertargetMatch = /setAttribute\(['"]popovertarget['"]/.test(content);
    expect(popovertargetMatch, 'Sets popovertarget attribute').toBe(true);

    // Look for setAttribute('aria-describedby', ...)
    const ariaMatch = /setAttribute\(['"]aria-describedby['"]/.test(content);
    expect(ariaMatch, 'Sets aria-describedby attribute').toBe(true);
  });

  it('emits popover element with popover attribute (AC15)', () => {
    const content = readFileSync(componentPath, 'utf-8');

    // Look for setAttribute('popover', 'auto') in the popover creation logic
    const popoverAttrMatch = /setAttribute\(['"]popover['"],\s*['"]auto['"]/.test(
      content,
    );
    expect(popoverAttrMatch, 'Creates element with popover="auto"').toBe(true);

    // Look for role="tooltip"
    const roleMatch = /setAttribute\(['"]role['"],\s*['"]tooltip['"]/.test(content);
    expect(roleMatch, 'Sets role="tooltip"').toBe(true);
  });

  it('uses <span popover> not <div popover> (AC15 / §S.14.10 R-4)', () => {
    const content = readFileSync(componentPath, 'utf-8');

    // Look for createElement('span') in the popover construction logic
    const spanMatch = /createElement\(['"]span['"]/.test(content);
    expect(spanMatch, 'Creates popover with createElement("span")').toBe(true);

    // Ensure no createElement('div') followed by popover wiring on nearby lines.
    // We check for createElement('div') anywhere in the wiring script — if it
    // appears and a popover attribute is set on it, that's a violation.
    // Simplification: just assert no "createElement('div')" exists in the file
    // at all (the component has no other reason to create divs client-side).
    const divMatch = /createElement\(['"]div['"]/.test(content);
    expect(divMatch, 'Does not create <div> elements client-side').toBe(false);
  });
});
