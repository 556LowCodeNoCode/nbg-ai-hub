// site/src/lib/slug.ts
//
// Duplicated from pipeline/src/slug.ts. The two copies MUST stay byte-for-byte
// identical for the `slugify(title)` function. A drift test in
// site/tests/slug.test.ts asserts parity against a shared fixture table.
// See `Issues - Pending Items.md` follow-up for dedup once monorepo tooling
// lands (per project-design.md §P.2.1 + plan-003 Step 4).

export const SLUG_MAX_LENGTH = 60;

/**
 * Title -> kebab-case slug:
 *  - lowercase
 *  - non-alphanumerics replaced with "-"
 *  - collapse runs of "-"; trim leading/trailing "-"
 *  - truncate to SLUG_MAX_LENGTH at a word boundary (last "-" before cap),
 *    falling back to a hard truncate if no word boundary exists.
 */
export function slugify(title: string): string {
  const lowered = title.toLowerCase();
  // Replace any non-alphanumeric (treating ASCII a-z 0-9 only) with "-".
  const replaced = lowered.replace(/[^a-z0-9]+/g, "-");
  // Collapse runs of "-" (already done by the regex above), trim.
  const trimmed = replaced.replace(/^-+/, "").replace(/-+$/, "");

  if (trimmed.length <= SLUG_MAX_LENGTH) {
    return trimmed;
  }

  // Truncate at last "-" before the cap.
  const window = trimmed.slice(0, SLUG_MAX_LENGTH);
  const lastDash = window.lastIndexOf("-");
  if (lastDash > 0) {
    return window.slice(0, lastDash);
  }
  return window;
}
