// site/tests/auth.test.ts
//
// Unit tests for auth.ts. Runs under the default `node` vitest environment;
// no happy-dom / jsdom dependency. We stub `localStorage` and `fetch` via
// vi.stubGlobal so the module's runtime contract is honoured in a Node REPL.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  signIn,
  signOut,
  storeToken,
  readToken,
  clearToken,
  getToken,
  getUser,
  validateToken,
  subscribe,
  __resetSubscribersForTests,
} from '../src/lib/auth.js';
import { TokenInvalidError } from '../src/lib/api-fetch.js';

type AuthState = 'signed-in' | 'signed-out';

/** In-memory Storage shim satisfying the Web Storage API surface auth.ts uses. */
function makeStorage(): Storage {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    key(i: number): string | null {
      return Array.from(map.keys())[i] ?? null;
    },
    getItem(key: string): string | null {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    setItem(key: string, value: string): void {
      map.set(key, value);
    },
    removeItem(key: string): void {
      map.delete(key);
    },
    clear(): void {
      map.clear();
    },
  };
  return storage;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textResponse(status: number, body: string): Response {
  return new Response(body, { status });
}

const VALID_USER = {
  login: 'alice',
  id: 12345,
  avatar_url: 'https://avatars.githubusercontent.com/u/12345',
};

describe('auth.ts', () => {
  beforeEach(() => {
    __resetSubscribersForTests();
    vi.stubGlobal('localStorage', makeStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('signIn with a valid token writes both keys and notifies subscriber once with "signed-in"', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, VALID_USER));
    vi.stubGlobal('fetch', fetchMock);

    const events: AuthState[] = [];
    subscribe((s) => events.push(s));

    const user = await signIn('ghp_valid');

    expect(user).toEqual(VALID_USER);
    expect(localStorage.getItem('nbgaihub.gh_token')).toBe('ghp_valid');
    const storedUser = localStorage.getItem('nbgaihub.gh_user');
    expect(storedUser).not.toBeNull();
    expect(JSON.parse(storedUser as string)).toEqual(VALID_USER);
    expect(events).toEqual(['signed-in']);
  });

  it('signIn with an invalid token throws TokenInvalidError; localStorage untouched; no notification', async () => {
    const fetchMock = vi.fn().mockResolvedValue(textResponse(401, 'Bad credentials'));
    vi.stubGlobal('fetch', fetchMock);

    const events: AuthState[] = [];
    subscribe((s) => events.push(s));

    await expect(signIn('ghp_bad')).rejects.toBeInstanceOf(TokenInvalidError);

    expect(localStorage.getItem('nbgaihub.gh_token')).toBeNull();
    expect(localStorage.getItem('nbgaihub.gh_user')).toBeNull();
    expect(events).toEqual([]);
  });

  it('signOut clears all three nbgaihub.* keys and notifies "signed-out"', async () => {
    // Prime localStorage as if already signed in + gist discovered.
    storeToken('ghp_valid', VALID_USER);
    localStorage.setItem('nbgaihub.gist_id', 'abc123');

    const events: AuthState[] = [];
    subscribe((s) => events.push(s));

    signOut();

    expect(localStorage.getItem('nbgaihub.gh_token')).toBeNull();
    expect(localStorage.getItem('nbgaihub.gh_user')).toBeNull();
    expect(localStorage.getItem('nbgaihub.gist_id')).toBeNull();
    expect(events).toEqual(['signed-out']);
  });

  it('subscribe unsubscribe stops further notifications', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, VALID_USER));
    vi.stubGlobal('fetch', fetchMock);

    const events: AuthState[] = [];
    const unsubscribe = subscribe((s) => events.push(s));

    await signIn('ghp_valid');
    expect(events).toEqual(['signed-in']);

    unsubscribe();
    signOut();
    expect(events).toEqual(['signed-in']); // no new entry after unsubscribe

    // Idempotent unsubscribe — second call is a no-op.
    unsubscribe();
    expect(events).toEqual(['signed-in']);
  });

  it('readToken returns null when absent, and the full state when present', () => {
    expect(readToken()).toBeNull();

    storeToken('ghp_v', VALID_USER);
    const state = readToken();
    expect(state).not.toBeNull();
    expect(state).toEqual({ token: 'ghp_v', user: VALID_USER });
  });

  it('getToken / getUser are convenience accessors over readToken', () => {
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();

    storeToken('ghp_v', VALID_USER);
    expect(getToken()).toBe('ghp_v');
    expect(getUser()).toEqual(VALID_USER);
  });

  it('clearToken empties all three keys but does not notify', () => {
    storeToken('ghp_v', VALID_USER);
    localStorage.setItem('nbgaihub.gist_id', 'abc');

    const events: AuthState[] = [];
    subscribe((s) => events.push(s));

    clearToken();
    expect(localStorage.getItem('nbgaihub.gh_token')).toBeNull();
    expect(localStorage.getItem('nbgaihub.gh_user')).toBeNull();
    expect(localStorage.getItem('nbgaihub.gist_id')).toBeNull();
    expect(events).toEqual([]);
  });

  it('storeToken persists only the minimal fields (login,id,avatar_url) even if extra props are present', () => {
    const noisy = { ...VALID_USER, extra: 'should_be_dropped', bio: 'hello' };
    // Cast intentional — exercising the narrowing inside storeToken.
    storeToken('ghp_v', noisy as unknown as typeof VALID_USER);
    const persisted = JSON.parse(localStorage.getItem('nbgaihub.gh_user') as string);
    expect(persisted).toEqual(VALID_USER);
    expect(persisted.extra).toBeUndefined();
  });

  it('validateToken narrows the /user response to {login,id,avatar_url}', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { ...VALID_USER, name: 'Alice', email: 'a@x', extra: 1 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const u = await validateToken('ghp_v');
    expect(u).toEqual(VALID_USER);
  });
});
