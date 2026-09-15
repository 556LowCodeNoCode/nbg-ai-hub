// slug.ts — Title -> kebab-case slug + same-day collision resolution.
// Pure. See project-design.md §3.9.

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

/**
 * Given a base slug and the set of slugs already taken on the SAME run-date,
 * returns a unique slug: the base if untaken, else `<base>-2`, `<base>-3`, ...
 * Does NOT mutate the input set.
 */
export function resolveSlugCollision(
  baseSlug: string,
  takenSlugsForDate: Set<string>,
): string {
  if (!takenSlugsForDate.has(baseSlug)) {
    return baseSlug;
  }
  let suffix = 2;
  while (takenSlugsForDate.has(`${baseSlug}-${suffix}`)) {
    suffix++;
  }
  return `${baseSlug}-${suffix}`;
}
