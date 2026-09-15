// site/tests/gist.test.ts
//
// Unit tests for the favourites gist module.
// Strategy: vi.stubGlobal('fetch', ...) with a per-test mock that returns a
// queued sequence of Response objects keyed off (method,url).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  findOrCreateFavoritesGist,
  readFavoritesGist,
  addFavorite,
  removeFavorite,
  GistSchemaError,
  FAVORITES_FILENAME,
  __resetLegacyWarnFlagForTests,
  type FavoriteEntry,
  type FavoritesDocument,
} from '../src/lib/gist.js';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Simple in-memory localStorage shim. */
function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => {
      map.clear();
    },
  };
}

const GIST_ID = 'gist_abc';
const OTHER_GIST_ID = 'gist_other';

function gistWithFavoritesFile(
  id: string,
  content: string,
): { id: string; files: Record<string, { filename: string; content: string }> } {
  return {
    id,
    files: {
      [FAVORITES_FILENAME]: { filename: FAVORITES_FILENAME, content },
    },
  };
}

function gistWithoutFavoritesFile(
  id: string,
): { id: string; files: Record<string, { filename: string; content: string }> } {
  return {
    id,
    files: { 'other.json': { filename: 'other.json', content: '{}' } },
  };
}

const SAMPLE_DOC: FavoritesDocument = {
  schema_version: 1,
  favourites: [
    { type: 'skill', slug: 'foo', pinned_at: '2026-05-18' },
    { type: 'tip', slug: 'bar', pinned_at: '2026-05-17' },
  ],
};

describe('gist.ts', () => {
  beforeEach(() => {
    __resetLegacyWarnFlagForTests();
    vi.stubGlobal('localStorage', makeStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('findOrCreateFavoritesGist', () => {
    it('discovers an existing gist on page 2 of paginated /gists', async () => {
      // Page 1: 100 gists, none matching.
      const page1 = Array.from({ length: 100 }, (_, i) =>
        gistWithoutFavoritesFile(`page1_${i}`),
      );
      // Page 2: 3 gists, the second one matches.
      const page2 = [
        gistWithoutFavoritesFile('p2_a'),
        gistWithFavoritesFile(GIST_ID, JSON.stringify(SAMPLE_DOC)),
        gistWithoutFavoritesFile('p2_c'),
      ];

      const fetchMock = vi
        .fn()
        // page=1 list
        .mockResolvedValueOnce(jsonResponse(200, page1))
        // page=2 list
        .mockResolvedValueOnce(jsonResponse(200, page2))
        // GET /gists/<id> full content
        .mockResolvedValueOnce(
          jsonResponse(200, gistWithFavoritesFile(GIST_ID, JSON.stringify(SAMPLE_DOC))),
        );
      vi.stubGlobal('fetch', fetchMock);

      const result = await findOrCreateFavoritesGist('ghp_v');

      expect(result.gistId).toBe(GIST_ID);
      expect(result.document).toEqual(SAMPLE_DOC);
      // Three calls: page 1, page 2, full GET.
      expect(fetchMock).toHaveBeenCalledTimes(3);
      const urls = fetchMock.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(urls[0]).toContain('page=1');
      expect(urls[1]).toContain('page=2');
      expect(urls[2]).toContain(`/gists/${GIST_ID}`);
      // localStorage cached the gist id.
      expect(localStorage.getItem('nbgaihub.gist_id')).toBe(GIST_ID);
    });

    it('creates a new private gist when no favourites file is found', async () => {
      const fetchMock = vi
        .fn()
        // page=1 returns empty list -> stop iteration -> create
        .mockResolvedValueOnce(jsonResponse(200, []))
        // POST /gists returns created resource
        .mockResolvedValueOnce(
          jsonResponse(
            201,
            gistWithFavoritesFile(
              OTHER_GIST_ID,
              JSON.stringify({ schema_version: 1, favourites: [] }),
            ),
          ),
        );
      vi.stubGlobal('fetch', fetchMock);

      const result = await findOrCreateFavoritesGist('ghp_v');

      expect(result.gistId).toBe(OTHER_GIST_ID);
      expect(result.document).toEqual({ schema_version: 1, favourites: [] });
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Assert POST body shape: public: false, the canonical filename.
      const postCall = fetchMock.mock.calls[1] as unknown[];
      const postInit = postCall[1] as RequestInit;
      expect(postInit.method).toBe('POST');
      expect(typeof postInit.body).toBe('string');
      const postBody = JSON.parse(postInit.body as string);
      expect(postBody.public).toBe(false);
      expect(postBody.files[FAVORITES_FILENAME]).toBeDefined();
      expect(typeof postBody.files[FAVORITES_FILENAME].content).toBe('string');

      expect(localStorage.getItem('nbgaihub.gist_id')).toBe(OTHER_GIST_ID);
    });
  });

  describe('readFavoritesGist', () => {
    it('happy path: fetches and parses the favourites document', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, gistWithFavoritesFile(GIST_ID, JSON.stringify(SAMPLE_DOC))),
        );
      vi.stubGlobal('fetch', fetchMock);

      const doc = await readFavoritesGist('ghp_v', GIST_ID);
      expect(doc).toEqual(SAMPLE_DOC);
    });

    it('tolerates legacy gist (missing schema_version) and warns exactly once', async () => {
      const legacyContent = JSON.stringify({
        favourites: [{ type: 'skill', slug: 'legacy', pinned_at: '2026-01-01' }],
      });
      // Build a fresh Response per call — Response bodies are single-use.
      const fetchMock = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            jsonResponse(200, gistWithFavoritesFile(GIST_ID, legacyContent)),
          ),
        );
      vi.stubGlobal('fetch', fetchMock);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const first = await readFavoritesGist('ghp_v', GIST_ID);
      const second = await readFavoritesGist('ghp_v', GIST_ID);

      expect(first.schema_version).toBe(1);
      expect(first.favourites).toEqual([
        { type: 'skill', slug: 'legacy', pinned_at: '2026-01-01' },
      ]);
      expect(second).toEqual(first);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('throws GistSchemaError when content is missing favourites', async () => {
      const malformed = JSON.stringify({ schema_version: 1 });
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, gistWithFavoritesFile(GIST_ID, malformed)),
        );
      vi.stubGlobal('fetch', fetchMock);

      await expect(readFavoritesGist('ghp_v', GIST_ID)).rejects.toBeInstanceOf(
        GistSchemaError,
      );
    });

    it('throws GistSchemaError when content is not JSON', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, gistWithFavoritesFile(GIST_ID, 'not-json{')),
        );
      vi.stubGlobal('fetch', fetchMock);

      await expect(readFavoritesGist('ghp_v', GIST_ID)).rejects.toBeInstanceOf(
        GistSchemaError,
      );
    });
  });

  describe('addFavorite', () => {
    it('issues GET + PATCH when adding a fresh entry', async () => {
      const fetchMock = vi
        .fn()
        // Initial GET inside readFavoritesGist
        .mockResolvedValueOnce(
          jsonResponse(200, gistWithFavoritesFile(GIST_ID, JSON.stringify(SAMPLE_DOC))),
        )
        // PATCH response
        .mockResolvedValueOnce(jsonResponse(200, { id: GIST_ID }));
      vi.stubGlobal('fetch', fetchMock);

      const newEntry: FavoriteEntry = {
        type: 'glossary',
        slug: 'mcp',
        pinned_at: '2026-05-19',
      };
      const next = await addFavorite('ghp_v', GIST_ID, newEntry);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      // PATCH method.
      const patchCall = fetchMock.mock.calls[1] as unknown[];
      const patchInit = patchCall[1] as RequestInit;
      expect(patchInit.method).toBe('PATCH');
      const patchBody = JSON.parse(patchInit.body as string);
      expect(patchBody.files[FAVORITES_FILENAME]).toBeDefined();

      expect(next.favourites[0]).toEqual(newEntry);
      expect(next.favourites).toHaveLength(SAMPLE_DOC.favourites.length + 1);
    });

    it('is a no-op (no PATCH) when adding a duplicate (type, slug)', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, gistWithFavoritesFile(GIST_ID, JSON.stringify(SAMPLE_DOC))),
        );
      vi.stubGlobal('fetch', fetchMock);

      // Same (type, slug) as the first SAMPLE_DOC entry — different pinned_at.
      const dup: FavoriteEntry = {
        type: 'skill',
        slug: 'foo',
        pinned_at: '2026-12-31',
      };
      const next = await addFavorite('ghp_v', GIST_ID, dup);

      // Only the GET — no PATCH.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      // Favourites unchanged.
      expect(next.favourites).toEqual(SAMPLE_DOC.favourites);
    });
  });

  describe('removeFavorite', () => {
    it('is a no-op when the ref is absent', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, gistWithFavoritesFile(GIST_ID, JSON.stringify(SAMPLE_DOC))),
        );
      vi.stubGlobal('fetch', fetchMock);

      const next = await removeFavorite('ghp_v', GIST_ID, {
        type: 'tip',
        slug: 'does-not-exist',
      });

      expect(fetchMock).toHaveBeenCalledTimes(1); // GET only
      expect(next.favourites).toEqual(SAMPLE_DOC.favourites);
    });

    it('filters the matching entry and issues PATCH', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, gistWithFavoritesFile(GIST_ID, JSON.stringify(SAMPLE_DOC))),
        )
        .mockResolvedValueOnce(jsonResponse(200, { id: GIST_ID }));
      vi.stubGlobal('fetch', fetchMock);

      const next = await removeFavorite('ghp_v', GIST_ID, {
        type: 'skill',
        slug: 'foo',
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const patchInit = (fetchMock.mock.calls[1] as unknown[])[1] as RequestInit;
      expect(patchInit.method).toBe('PATCH');

      expect(next.favourites).toEqual([
        { type: 'tip', slug: 'bar', pinned_at: '2026-05-17' },
      ]);
    });
  });
});
