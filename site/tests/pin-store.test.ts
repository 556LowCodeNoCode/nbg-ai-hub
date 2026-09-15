// site/tests/pin-store.test.ts
//
// Unit tests for pin-store.ts. Runs under the default `node` vitest
// environment. We stub `globalThis.fetch` via vi.stubGlobal to simulate the
// build-time JSON indices served from /_data/<type>-index.json.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  fetchPinIndex,
  fetchAllPinIndices,
  joinFavoritesWithIndex,
  groupFavoritesByType,
  PinIndexNotFoundError,
  PinIndexSchemaError,
  PIN_TYPE_ORDER,
  type PinIndexFile,
  type PinIndexItem,
} from '../src/lib/pin-store.js';
import type { FavoriteEntry } from '../src/lib/gist.js';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textResponse(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const TIP_FIXTURE: PinIndexFile = {
  schema_version: 1,
  type: 'tip',
  items: [
    {
      slug: 'foo',
      title: 'Foo headline',
      audience: 'both',
      topics: ['industry-news'],
    },
    {
      slug: 'bar',
      title: 'Bar headline',
      audience: 'beginner',
      topics: ['tips'],
    },
  ],
};

const SKILL_INDEX: PinIndexFile = {
  schema_version: 1,
  type: 'skill',
  items: [
    {
      slug: 'cool-skill',
      title: 'A cool skill',
      audience: 'advanced',
      topics: ['workflow'],
    },
  ],
};

function emptyIndex(type: FavoriteEntry['type']): PinIndexFile {
  return { schema_version: 1, type, items: [] };
}

describe('pin-store.ts', () => {
  beforeEach(() => {
    // Each test stubs its own fetch; default reset between tests.
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('fetchPinIndex', () => {
    it('returns a parsed PinIndexFile on 200', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, TIP_FIXTURE));
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchPinIndex('tip');
      expect(result).toEqual(TIP_FIXTURE);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/_data/tip-index.json');
    });

    it('applies baseUrl when given', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, TIP_FIXTURE));
      vi.stubGlobal('fetch', fetchMock);

      await fetchPinIndex('tip', 'https://example.org/site');
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'https://example.org/site/_data/tip-index.json',
      );
    });

    it('trims a single trailing slash on baseUrl', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, TIP_FIXTURE));
      vi.stubGlobal('fetch', fetchMock);

      await fetchPinIndex('tip', 'https://example.org/site/');
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'https://example.org/site/_data/tip-index.json',
      );
    });

    it('throws PinIndexNotFoundError on 404', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response('not found', { status: 404 }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchPinIndex('tip')).rejects.toBeInstanceOf(
        PinIndexNotFoundError,
      );
    });

    it('throws PinIndexSchemaError on malformed JSON', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(textResponse(200, 'not-json{'));
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchPinIndex('tip')).rejects.toBeInstanceOf(
        PinIndexSchemaError,
      );
    });

    it('throws PinIndexSchemaError when schema_version is missing', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, { type: 'tip', items: [] }),
        );
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchPinIndex('tip')).rejects.toBeInstanceOf(
        PinIndexSchemaError,
      );
    });

    it('throws PinIndexSchemaError when type does not match requested type', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, { schema_version: 1, type: 'skill', items: [] }),
        );
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchPinIndex('tip')).rejects.toBeInstanceOf(
        PinIndexSchemaError,
      );
    });

    it('throws PinIndexSchemaError when items entries are malformed', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, {
            schema_version: 1,
            type: 'tip',
            items: [{ slug: 'x' }], // missing title, audience, topics
          }),
        );
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchPinIndex('tip')).rejects.toBeInstanceOf(
        PinIndexSchemaError,
      );
    });
  });

  describe('joinFavoritesWithIndex', () => {
    it('hydrates display when the slug is found in the matching index', () => {
      const favourites: FavoriteEntry[] = [
        { type: 'tip', slug: 'foo', pinned_at: '2026-05-18' },
        { type: 'skill', slug: 'cool-skill', pinned_at: '2026-05-17' },
      ];
      const indices = new Map<FavoriteEntry['type'], PinIndexFile>([
        ['tip', TIP_FIXTURE],
        ['skill', SKILL_INDEX],
      ]);

      const result = joinFavoritesWithIndex(favourites, indices);

      expect(result).toHaveLength(2);
      expect(result[0]?.display).not.toBeNull();
      expect(result[0]?.display?.title).toBe('Foo headline');
      expect(result[1]?.display).not.toBeNull();
      expect(result[1]?.display?.title).toBe('A cool skill');
    });

    it('returns display: null for a stale reference (slug missing from index)', () => {
      const favourites: FavoriteEntry[] = [
        { type: 'tip', slug: 'foo', pinned_at: '2026-05-18' },
        { type: 'tip', slug: 'gone', pinned_at: '2026-05-17' },
      ];
      const indices = new Map<FavoriteEntry['type'], PinIndexFile>([
        ['tip', TIP_FIXTURE],
      ]);

      const result = joinFavoritesWithIndex(favourites, indices);

      expect(result[0]?.display).not.toBeNull();
      expect(result[0]?.display?.slug).toBe('foo');
      expect(result[1]?.display).toBeNull();
      expect(result[1]?.slug).toBe('gone');
    });

    it('returns display: null when the type has no index entry at all', () => {
      const favourites: FavoriteEntry[] = [
        { type: 'tip', slug: 'whatever', pinned_at: '2026-05-18' },
      ];
      const indices = new Map<FavoriteEntry['type'], PinIndexFile>();

      const result = joinFavoritesWithIndex(favourites, indices);
      expect(result[0]?.display).toBeNull();
    });

    it('preserves the favourites order', () => {
      const favourites: FavoriteEntry[] = [
        { type: 'tip', slug: 'bar', pinned_at: '2026-05-15' },
        { type: 'tip', slug: 'foo', pinned_at: '2026-05-18' },
      ];
      const indices = new Map<FavoriteEntry['type'], PinIndexFile>([
        ['tip', TIP_FIXTURE],
      ]);

      const result = joinFavoritesWithIndex(favourites, indices);
      expect(result.map((p) => p.slug)).toEqual(['bar', 'foo']);
    });
  });

  describe('groupFavoritesByType', () => {
    it('returns all 5 keys in F-P11 + use-case order even when some are empty', () => {
      const grouped = groupFavoritesByType([]);
      expect(Object.keys(grouped)).toEqual([
        'skill',
        'tip',
        'use-case',
        'journey-step',
        'glossary',
      ]);
      for (const key of PIN_TYPE_ORDER) {
        expect(grouped[key]).toEqual([]);
      }
    });

    it('sorts pins by pinned_at descending within each type', () => {
      const fooItem: PinIndexItem = {
        slug: 'foo',
        title: 'Foo',
        audience: 'both',
        topics: ['x'],
      };
      const grouped = groupFavoritesByType([
        {
          type: 'tip',
          slug: 'older',
          pinned_at: '2026-01-01',
          display: fooItem,
        },
        {
          type: 'tip',
          slug: 'newest',
          pinned_at: '2026-05-18',
          display: fooItem,
        },
        {
          type: 'tip',
          slug: 'middle',
          pinned_at: '2026-03-15',
          display: fooItem,
        },
      ]);
      expect(grouped.tip.map((p) => p.slug)).toEqual([
        'newest',
        'middle',
        'older',
      ]);
    });

    it('groups entries into the correct type bucket', () => {
      const item: PinIndexItem = {
        slug: 's',
        title: 't',
        audience: 'both',
        topics: ['x'],
      };
      const grouped = groupFavoritesByType([
        { type: 'skill', slug: 's', pinned_at: '2026-05-18', display: item },
        { type: 'tip', slug: 's', pinned_at: '2026-05-17', display: item },
        { type: 'glossary', slug: 's', pinned_at: '2026-05-16', display: item },
      ]);
      expect(grouped.skill).toHaveLength(1);
      expect(grouped.tip).toHaveLength(1);
      expect(grouped.glossary).toHaveLength(1);
      expect(grouped['journey-step']).toHaveLength(0);
      expect(grouped['use-case']).toHaveLength(0);
    });
  });

  describe('fetchAllPinIndices', () => {
    it('calls fetch 5 times in parallel and returns a Map of size 5', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        // Map each URL to a minimal valid index for its type.
        const match = url.match(/_data\/([a-z-]+)-index\.json$/);
        if (match === null) {
          return Promise.resolve(new Response('bad', { status: 500 }));
        }
        const type = match[1] as FavoriteEntry['type'];
        return Promise.resolve(jsonResponse(200, emptyIndex(type)));
      });
      vi.stubGlobal('fetch', fetchMock);

      const map = await fetchAllPinIndices();

      expect(fetchMock).toHaveBeenCalledTimes(5);
      expect(map.size).toBe(5);
      for (const type of PIN_TYPE_ORDER) {
        const file = map.get(type);
        expect(file).toBeDefined();
        expect(file?.type).toBe(type);
        expect(file?.items).toEqual([]);
      }
    });

    it('tolerates individual fetch failures (returns the indices that succeeded)', async () => {
      // 2026-06-02 — contract change: per-index failures are now logged
      // (not thrown) so a stale CDN or a still-propagating new content
      // type doesn't kill the whole pin display. Pins of the missing
      // type render as stale "no longer available" rows instead.
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('tip-index')) {
          return Promise.resolve(new Response('not found', { status: 404 }));
        }
        const match = url.match(/_data\/([a-z-]+)-index\.json$/);
        if (match === null) {
          return Promise.resolve(new Response('bad', { status: 500 }));
        }
        const type = match[1] as FavoriteEntry['type'];
        return Promise.resolve(jsonResponse(200, emptyIndex(type)));
      });
      vi.stubGlobal('fetch', fetchMock);

      const map = await fetchAllPinIndices();
      expect(map.size).toBe(4); // all five minus the 404-ing tip index
      expect(map.has('tip')).toBe(false);
      expect(map.has('skill')).toBe(true);
      expect(map.has('use-case')).toBe(true);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toContain('tip-index.json');
      warnSpy.mockRestore();
    });

    it('issues requests in parallel (all started before any settles)', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        // Yield to the microtask queue so other fetches start before we resolve.
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
        const match = url.match(/_data\/([a-z-]+)-index\.json$/);
        const type = (match?.[1] ?? 'tip') as FavoriteEntry['type'];
        return jsonResponse(200, emptyIndex(type));
      });
      vi.stubGlobal('fetch', fetchMock);

      await fetchAllPinIndices();
      expect(maxInFlight).toBe(5);
    });
  });
});
