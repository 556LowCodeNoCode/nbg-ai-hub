// site/src/lib/pin-store.ts
//
// Joins the user's favourites list (read from their gist via gist.ts) with the
// build-time pin indices (one JSON per content type emitted by
// scripts/build-pin-index.ts and served from /_data/<type>-index.json).
//
// Responsibilities (per project-design.md §P.4.4, F-P11):
//   - Fetch /_data/<type>-index.json files (root-relative, optionally rebased
//     under a baseUrl for tests / non-root deployments).
//   - Validate the index shape — throw a named error rather than silently
//     coercing.
//   - Join FavoriteEntry[] with the indices, preserving the favourites order
//     and surfacing stale references (slug no longer in the catalogue) as
//     `display: null` rather than dropping them.
//   - Group by type into the F-P11 display order: skill, tip, use-case,
//     journey-step, glossary.
//
// No localStorage access, no module-level mutable state. Pure functions plus
// `fetch` side-effects; tests stub `globalThis.fetch` via vi.stubGlobal.

import type { FavoriteEntry } from './gist.js';

/** Shape of one entry inside an emitted /_data/<type>-index.json file. */
export type PinIndexItem = {
  slug: string;
  title: string;
  audience: 'beginner' | 'advanced' | 'both';
  topics: string[];
};

/** Shape of one /_data/<type>-index.json file. */
export type PinIndexFile = {
  schema_version: 1;
  type: FavoriteEntry['type'];
  items: PinIndexItem[];
};

/** A favourite entry joined with its catalogue display data (or null if stale). */
export type HydratedPin = FavoriteEntry & {
  display: PinIndexItem | null;
};

/** Grouped output, keys ordered per F-P11 + use-case (skill, tip, use-case,
 *  journey-step, glossary). */
export type GroupedPins = Record<FavoriteEntry['type'], HydratedPin[]>;

/** /_data/<type>-index.json returned 404. */
export class PinIndexNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PinIndexNotFoundError';
  }
}

/** /_data/<type>-index.json returned 2xx but JSON / schema validation failed. */
export class PinIndexSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PinIndexSchemaError';
  }
}

/** F-P11 + use-case display order for grouped output. Use-cases sit after
 *  tips since they're "tips you can do end-to-end" — natural reading order. */
export const PIN_TYPE_ORDER: ReadonlyArray<FavoriteEntry['type']> = [
  'skill',
  'tip',
  'use-case',
  'journey-step',
  'glossary',
] as const;

const ALLOWED_AUDIENCES: ReadonlySet<string> = new Set([
  'beginner',
  'advanced',
  'both',
]);

function isPinType(value: unknown): value is FavoriteEntry['type'] {
  return (
    value === 'skill' ||
    value === 'tip' ||
    value === 'use-case' ||
    value === 'journey-step' ||
    value === 'glossary'
  );
}

/**
 * Narrow a freshly-parsed `unknown` into a PinIndexFile, throwing
 * PinIndexSchemaError on any structural mismatch. Returns a clean copy
 * (no mutable references to the input object).
 */
function narrowIndexFile(
  raw: unknown,
  expectedType: FavoriteEntry['type'],
  url: string,
): PinIndexFile {
  if (raw === null || typeof raw !== 'object') {
    throw new PinIndexSchemaError(
      `pin index ${url}: response is not a JSON object.`,
    );
  }
  const obj = raw as Record<string, unknown>;

  if (obj['schema_version'] !== 1) {
    throw new PinIndexSchemaError(
      `pin index ${url}: schema_version must be 1, got ${String(obj['schema_version'])}.`,
    );
  }
  if (!isPinType(obj['type'])) {
    throw new PinIndexSchemaError(
      `pin index ${url}: missing or invalid 'type' field.`,
    );
  }
  if (obj['type'] !== expectedType) {
    throw new PinIndexSchemaError(
      `pin index ${url}: type mismatch — expected '${expectedType}', got '${String(obj['type'])}'.`,
    );
  }

  const itemsRaw = obj['items'];
  if (!Array.isArray(itemsRaw)) {
    throw new PinIndexSchemaError(
      `pin index ${url}: 'items' must be an array.`,
    );
  }

  const items: PinIndexItem[] = [];
  for (let i = 0; i < itemsRaw.length; i += 1) {
    const it = itemsRaw[i];
    if (it === null || typeof it !== 'object') {
      throw new PinIndexSchemaError(
        `pin index ${url}: items[${i}] is not an object.`,
      );
    }
    const itObj = it as Record<string, unknown>;
    const slug = itObj['slug'];
    const title = itObj['title'];
    const audience = itObj['audience'];
    const topics = itObj['topics'];
    if (typeof slug !== 'string' || slug.length === 0) {
      throw new PinIndexSchemaError(
        `pin index ${url}: items[${i}].slug missing or empty.`,
      );
    }
    if (typeof title !== 'string' || title.length === 0) {
      throw new PinIndexSchemaError(
        `pin index ${url}: items[${i}].title missing or empty.`,
      );
    }
    if (typeof audience !== 'string' || !ALLOWED_AUDIENCES.has(audience)) {
      throw new PinIndexSchemaError(
        `pin index ${url}: items[${i}].audience must be 'beginner' | 'advanced' | 'both'.`,
      );
    }
    if (!Array.isArray(topics)) {
      throw new PinIndexSchemaError(
        `pin index ${url}: items[${i}].topics must be an array.`,
      );
    }
    const topicsStr: string[] = [];
    for (let j = 0; j < topics.length; j += 1) {
      const t = topics[j];
      if (typeof t !== 'string') {
        throw new PinIndexSchemaError(
          `pin index ${url}: items[${i}].topics[${j}] must be a string.`,
        );
      }
      topicsStr.push(t);
    }
    items.push({
      slug,
      title,
      audience: audience as PinIndexItem['audience'],
      topics: topicsStr,
    });
  }

  return {
    schema_version: 1,
    type: obj['type'],
    items,
  };
}

/** Build the URL for a given type. baseUrl is prepended verbatim. */
function indexUrlFor(type: FavoriteEntry['type'], baseUrl: string): string {
  // Trim a single trailing slash on baseUrl so we don't emit `//_data/...`.
  const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmed}/_data/${type}-index.json`;
}

/**
 * Fetch one /_data/<type>-index.json. baseUrl defaults to `''` (root-relative).
 *
 * Outcomes:
 *   404 → PinIndexNotFoundError
 *   2xx + non-JSON or schema mismatch → PinIndexSchemaError
 *   2xx + valid → resolved PinIndexFile
 *   Other non-2xx → generic Error with status code
 */
export async function fetchPinIndex(
  type: FavoriteEntry['type'],
  baseUrl: string = '',
): Promise<PinIndexFile> {
  const url = indexUrlFor(type, baseUrl);
  const response = await fetch(url);
  if (response.status === 404) {
    throw new PinIndexNotFoundError(
      `pin index ${url} not found (404). Did the build emit it?`,
    );
  }
  if (!response.ok) {
    throw new Error(
      `pin index ${url} fetch failed with status ${response.status}.`,
    );
  }
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new PinIndexSchemaError(
      `pin index ${url}: response is not valid JSON: ${msg}`,
    );
  }
  return narrowIndexFile(parsed, type, url);
}

/**
 * For each favourite, look up its (type, slug) in the matching index. If
 * found, populate `display`; otherwise set `display: null` (stale ref).
 *
 * Order is preserved: the output index aligns 1:1 with the input.
 */
export function joinFavoritesWithIndex(
  favourites: FavoriteEntry[],
  indices: Map<FavoriteEntry['type'], PinIndexFile>,
): HydratedPin[] {
  const out: HydratedPin[] = [];
  for (const fav of favourites) {
    const idx = indices.get(fav.type);
    let display: PinIndexItem | null = null;
    if (idx !== undefined) {
      const match = idx.items.find((it) => it.slug === fav.slug);
      if (match !== undefined) {
        display = match;
      }
    }
    out.push({ ...fav, display });
  }
  return out;
}

/**
 * Group a hydrated pin list by type in display order. All keys are always
 * present, with empty arrays when that type has no pins. Within each group,
 * pins are sorted by `pinned_at` descending — newest first.
 */
export function groupFavoritesByType(hydrated: HydratedPin[]): GroupedPins {
  const grouped: GroupedPins = {
    skill: [],
    tip: [],
    'use-case': [],
    'journey-step': [],
    glossary: [],
  };
  for (const pin of hydrated) {
    // Forward-compat safety net: if a future bundle adds a content type
    // ('podcast', 'video', …) and a user pins one before their /my-pins/
    // page-load picks up the new bundle, `grouped[pin.type]` is undefined
    // — pushing onto it would throw a TypeError and freeze the page.
    // Lazily initialise unknown buckets so the older bundle just shows
    // them as a generic group rather than crashing. Iteration order still
    // honours PIN_TYPE_ORDER first, then any unknown keys after.
    const bucket = grouped[pin.type];
    if (bucket === undefined) {
      (grouped as Record<string, HydratedPin[]>)[pin.type] = [pin];
    } else {
      bucket.push(pin);
    }
  }
  for (const key of PIN_TYPE_ORDER) {
    grouped[key].sort((a, b) => {
      // Lexicographic compare on YYYY-MM-DD == chronological compare.
      if (a.pinned_at < b.pinned_at) return 1;
      if (a.pinned_at > b.pinned_at) return -1;
      return 0;
    });
  }
  return grouped;
}

/**
 * Fetch all six pin indices in parallel and return a Map<type, file>.
 *
 * Per-index failures are tolerated: if one index 404s (e.g. CDN propagation
 * race after adding a new content type, or a stale browser cache holding
 * an old expectation list), the page still renders with the indices that
 * came back — pins of the missing type just render as stale "no longer
 * available" rows rather than the whole page crashing on a Promise.all
 * rejection. Failures are logged once per call so build-time bugs still
 * surface in DevTools.
 */
export async function fetchAllPinIndices(
  baseUrl: string = '',
): Promise<Map<FavoriteEntry['type'], PinIndexFile>> {
  const results = await Promise.allSettled(
    PIN_TYPE_ORDER.map(async (type) => {
      const file = await fetchPinIndex(type, baseUrl);
      return [type, file] as const;
    }),
  );
  const map = new Map<FavoriteEntry['type'], PinIndexFile>();
  for (let i = 0; i < results.length; i += 1) {
    const r = results[i];
    if (r === undefined) continue;
    if (r.status === 'fulfilled') {
      map.set(r.value[0], r.value[1]);
    } else {
      const type = PIN_TYPE_ORDER[i];
      const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
      // eslint-disable-next-line no-console
      console.warn(
        `[nbgaihub/pin-store] failed to fetch ${type}-index.json — pins of this type will render as stale. Cause: ${reason}`,
      );
    }
  }
  return map;
}
