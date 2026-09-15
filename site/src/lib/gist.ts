// site/src/lib/gist.ts
//
// Favourites gist CRUD (per project-design.md §P.4.3).
//
// Single source of truth: a private gist on the signed-in user's GitHub account,
// containing one file `nbgaihub-favorites.json` with the schema
//   { schema_version: 1, favourites: FavoriteEntry[] }
//
// All network calls go through apiFetch. The discovered gist id is cached in
// localStorage under `nbgaihub.gist_id`. A legacy gist (missing schema_version)
// is tolerated as schema_version=1 and triggers a one-shot console.warn.

import { apiFetch } from './api-fetch.js';

export type FavoriteEntry = {
  type: 'skill' | 'tip' | 'glossary' | 'journey-step' | 'use-case';
  slug: string;
  pinned_at: string; // YYYY-MM-DD
};

export type FavoritesDocument = {
  schema_version: 1;
  favourites: FavoriteEntry[];
};

export class GistNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GistNotFoundError';
  }
}

export class GistSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GistSchemaError';
  }
}

export const FAVORITES_FILENAME = 'nbgaihub-favorites.json' as const;
const GIST_ID_KEY = 'nbgaihub.gist_id';

/** Shape of a single file inside a gist payload, per GitHub Gist API. */
interface GistFile {
  filename?: string;
  content?: string;
  truncated?: boolean;
}

/** Shape of the gist resource returned by GET /gists/<id> and GET /gists. */
interface GistResource {
  id: string;
  files: Record<string, GistFile>;
}

/** Module-level flag: warn at most once across the page lifetime. */
let legacyWarned = false;

/** Test hatch — reset module-level warn flag between tests. Not part of public API. */
export function __resetLegacyWarnFlagForTests(): void {
  legacyWarned = false;
}

function tryGetLocalStorage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

/** Parse + validate a gist file's content into a FavoritesDocument. */
function parseDocument(raw: string): FavoritesDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new GistSchemaError(`favorites gist content is not valid JSON: ${msg}`);
  }
  if (parsed === null || typeof parsed !== 'object') {
    throw new GistSchemaError('favorites gist content must be a JSON object.');
  }
  const obj = parsed as Record<string, unknown>;
  const favourites = obj.favourites;
  if (!Array.isArray(favourites)) {
    throw new GistSchemaError('favorites gist missing `favourites` array.');
  }
  // Legacy (no schema_version) -> warn-once and coerce to v1.
  if (obj.schema_version === undefined) {
    if (!legacyWarned) {
      legacyWarned = true;
      // eslint-disable-next-line no-console
      console.warn(
        '[nbgaihub/gist] favourites gist has no schema_version; treating as schema_version=1.',
      );
    }
  }
  return {
    schema_version: 1,
    favourites: favourites as FavoriteEntry[],
  };
}

/** Pretty-print a FavoritesDocument with the canonical 2-space JSON indent. */
function serializeDocument(doc: FavoritesDocument): string {
  return JSON.stringify(doc, null, 2);
}

/** Extract the favourites file from a fetched gist resource. */
function extractFavoritesFile(gist: GistResource): GistFile | null {
  const file = gist.files[FAVORITES_FILENAME];
  return file === undefined ? null : file;
}

/**
 * Discover the favourites gist for the signed-in user, or create one if absent.
 *
 * Algorithm (per §P.4.3):
 *   1. Paginate GET /gists?per_page=100&page=N (start N=1, increment until
 *      response is an empty array). Scan each page for a gist whose
 *      `files[FAVORITES_FILENAME]` is present.
 *   2. If found, GET /gists/<id> to fetch the full (untruncated) content,
 *      parse, return.
 *   3. If not found, POST /gists with public:false and an initial document.
 *      Cache the id in localStorage.
 */
export async function findOrCreateFavoritesGist(
  token: string,
): Promise<{ gistId: string; document: FavoritesDocument }> {
  // Step 1+2: paginated scan.
  let page = 1;
  // Cap defensively at 100 pages (10 000 gists) — far beyond any realistic user.
  while (page <= 100) {
    const url = `https://api.github.com/gists?per_page=100&page=${page}`;
    const list = await apiFetch<GistResource[]>(url, { token });
    if (!Array.isArray(list) || list.length === 0) {
      break;
    }
    const match = list.find((g) => extractFavoritesFile(g) !== null);
    if (match !== undefined) {
      const full = await apiFetch<GistResource>(
        `https://api.github.com/gists/${match.id}`,
        { token },
      );
      const file = extractFavoritesFile(full);
      if (file === null || file.content === undefined) {
        throw new GistSchemaError(
          `gist ${match.id} no longer contains ${FAVORITES_FILENAME}`,
        );
      }
      const document = parseDocument(file.content);
      const storage = tryGetLocalStorage();
      if (storage !== null) {
        storage.setItem(GIST_ID_KEY, match.id);
      }
      return { gistId: match.id, document };
    }
    if (list.length < 100) {
      // Last page (less than per_page returned).
      break;
    }
    page += 1;
  }

  // Step 3: create.
  const initial: FavoritesDocument = { schema_version: 1, favourites: [] };
  const body = {
    description: 'NbgAiHub favourites',
    public: false,
    files: {
      [FAVORITES_FILENAME]: { content: serializeDocument(initial) },
    },
  };
  const created = await apiFetch<GistResource>('https://api.github.com/gists', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  });
  const storage = tryGetLocalStorage();
  if (storage !== null) {
    storage.setItem(GIST_ID_KEY, created.id);
  }
  return { gistId: created.id, document: initial };
}

/** GET /gists/<id> and parse the favourites file. */
export async function readFavoritesGist(
  token: string,
  gistId: string,
): Promise<FavoritesDocument> {
  const gist = await apiFetch<GistResource>(
    `https://api.github.com/gists/${gistId}`,
    { token },
  );
  const file = extractFavoritesFile(gist);
  if (file === null || file.content === undefined) {
    throw new GistSchemaError(
      `gist ${gistId} does not contain ${FAVORITES_FILENAME}`,
    );
  }
  return parseDocument(file.content);
}

/**
 * Read-modify-write: prepend an entry, deduped on (type, slug).
 * If the same (type, slug) already exists, the operation is a no-op AND no
 * PATCH is issued (callers rely on idempotency without side effects).
 */
export async function addFavorite(
  token: string,
  gistId: string,
  item: FavoriteEntry,
): Promise<FavoritesDocument> {
  const current = await readFavoritesGist(token, gistId);
  const exists = current.favourites.some(
    (f) => f.type === item.type && f.slug === item.slug,
  );
  if (exists) {
    return current;
  }
  const next: FavoritesDocument = {
    schema_version: 1,
    favourites: [item, ...current.favourites],
  };
  await apiFetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({
      files: {
        [FAVORITES_FILENAME]: { content: serializeDocument(next) },
      },
    }),
  });
  return next;
}

/**
 * Read-modify-write: remove entries matching (type, slug). Idempotent; if
 * nothing matches, no PATCH is issued.
 */
export async function removeFavorite(
  token: string,
  gistId: string,
  ref: { type: FavoriteEntry['type']; slug: string },
): Promise<FavoritesDocument> {
  const current = await readFavoritesGist(token, gistId);
  const filtered = current.favourites.filter(
    (f) => !(f.type === ref.type && f.slug === ref.slug),
  );
  if (filtered.length === current.favourites.length) {
    // Nothing changed — no PATCH.
    return current;
  }
  const next: FavoritesDocument = {
    schema_version: 1,
    favourites: filtered,
  };
  await apiFetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({
      files: {
        [FAVORITES_FILENAME]: { content: serializeDocument(next) },
      },
    }),
  });
  return next;
}
