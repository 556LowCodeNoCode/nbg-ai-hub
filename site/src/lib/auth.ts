// site/src/lib/auth.ts
//
// PAT lifecycle (per project-design.md §P.4.2).
//
// localStorage contract (exact keys, prefix `nbgaihub.*`):
//   - nbgaihub.gh_token   raw PAT string
//   - nbgaihub.gh_user    JSON-stringified minimal user shape {login,id,avatar_url}
//   - nbgaihub.gist_id    cleared on sign-out (owned by gist.ts on write)
//
// All network goes through apiFetch — no raw fetch in this module.
// Subscribers are a module-level Set; notifications fire on signIn/signOut only.

import { apiFetch, TokenInvalidError } from './api-fetch.js';

export type GitHubUser = {
  login: string;
  id: number;
  avatar_url: string;
};

export type AuthState = 'signed-in' | 'signed-out';
export type AuthSubscriber = (state: AuthState) => void;

const TOKEN_KEY = 'nbgaihub.gh_token';
const USER_KEY = 'nbgaihub.gh_user';
const GIST_ID_KEY = 'nbgaihub.gist_id';
// Sticky breadcrumb left behind when we sign the user out *because GitHub
// rejected the token* (most commonly: PAT hit its expiration). Survives
// signOut() — the anonymous /my-pins panel reads it to render a clear
// "your token expired" banner instead of looking like the site silently
// forgot the user. Cleared on a fresh successful signIn().
const REJECTED_KEY = 'nbgaihub.token_rejected';

const subscribers = new Set<AuthSubscriber>();

function notify(state: AuthState): void {
  for (const cb of subscribers) {
    try {
      cb(state);
    } catch {
      // Subscriber threw — swallow; one bad subscriber must not block the rest.
    }
  }
}

function getStorage(): Storage {
  // Throw explicitly per global no-fallback rule when localStorage is unavailable.
  if (typeof localStorage === 'undefined') {
    throw new Error('auth.ts requires localStorage; running outside a browser.');
  }
  return localStorage;
}

function narrowUser(raw: unknown): GitHubUser {
  if (raw === null || typeof raw !== 'object') {
    throw new TokenInvalidError('GitHub /user response was not an object.');
  }
  const obj = raw as Record<string, unknown>;
  const login = obj.login;
  const id = obj.id;
  const avatar_url = obj.avatar_url;
  if (typeof login !== 'string' || typeof id !== 'number' || typeof avatar_url !== 'string') {
    throw new TokenInvalidError(
      'GitHub /user response missing required fields (login, id, avatar_url).',
    );
  }
  return { login, id, avatar_url };
}

/**
 * Validate a PAT by issuing GET /user. Resolves with the narrowed user shape.
 * Rethrows TokenInvalidError from apiFetch unmodified (401 -> invalid).
 */
export async function validateToken(token: string): Promise<GitHubUser> {
  const raw = await apiFetch<unknown>('https://api.github.com/user', { token });
  return narrowUser(raw);
}

/** Write nbgaihub.gh_token + nbgaihub.gh_user. Does NOT notify. */
export function storeToken(token: string, user: GitHubUser): void {
  const storage = getStorage();
  storage.setItem(TOKEN_KEY, token);
  // Minimal serialisation — keep narrow per contract.
  const minimal: GitHubUser = {
    login: user.login,
    id: user.id,
    avatar_url: user.avatar_url,
  };
  storage.setItem(USER_KEY, JSON.stringify(minimal));
}

/** Synchronous read of the persisted state, or null when signed out. */
export function readToken(): { token: string; user: GitHubUser } | null {
  const storage = getStorage();
  const token = storage.getItem(TOKEN_KEY);
  const userRaw = storage.getItem(USER_KEY);
  if (token === null || userRaw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(userRaw);
  } catch {
    return null;
  }
  try {
    const user = narrowUser(parsed);
    return { token, user };
  } catch {
    return null;
  }
}

/** Remove all three keys. Does NOT notify. */
export function clearToken(): void {
  const storage = getStorage();
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USER_KEY);
  storage.removeItem(GIST_ID_KEY);
}

/** Convenience: raw bearer string when present, else null. */
export function getToken(): string | null {
  const state = readToken();
  return state === null ? null : state.token;
}

/** Convenience: the GitHubUser when signed in, else null. */
export function getUser(): GitHubUser | null {
  const state = readToken();
  return state === null ? null : state.user;
}

/**
 * End-to-end sign-in:
 *   1. validateToken(token) — throws TokenInvalidError on 401 (untouched).
 *   2. storeToken(...)
 *   3. notify('signed-in')
 * On any thrown error, localStorage is NOT mutated and subscribers are NOT notified.
 */
export async function signIn(token: string): Promise<GitHubUser> {
  const user = await validateToken(token); // bubbles TokenInvalidError unchanged
  storeToken(token, user);
  // A fresh sign-in clears any stale "your last token expired" breadcrumb.
  clearTokenRejectedFlag();
  notify('signed-in');
  return user;
}

/** Sign out: clear all 3 keys, notify subscribers with 'signed-out'. */
export function signOut(): void {
  clearToken();
  notify('signed-out');
}

/**
 * Sticky flag: GitHub rejected our stored token (TokenInvalidError observed
 * by a downstream caller). Call this BEFORE signOut() so the breadcrumb
 * outlives the clear. The /my-pins anonymous panel reads it to explain the
 * sudden sign-out instead of looking like the site silently forgot the user.
 */
export function markTokenRejected(): void {
  const storage = getStorage();
  storage.setItem(REJECTED_KEY, '1');
}

/** True iff the previous sign-out happened because GitHub rejected the token. */
export function wasTokenRejected(): boolean {
  const storage = getStorage();
  return storage.getItem(REJECTED_KEY) === '1';
}

/** Clear the rejection breadcrumb. Idempotent. */
export function clearTokenRejectedFlag(): void {
  const storage = getStorage();
  storage.removeItem(REJECTED_KEY);
}

/**
 * Subscribe to auth state changes. Returns an idempotent unsubscribe function.
 * The subscriber is invoked synchronously from inside signIn / signOut only.
 */
export function subscribe(cb: AuthSubscriber): () => void {
  subscribers.add(cb);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    subscribers.delete(cb);
  };
}

// Test-only: a hatch to clear subscribers between tests (avoid leakage of
// module-level state across describe blocks). Intentionally not exported in
// the type contract — callers should ignore.
export function __resetSubscribersForTests(): void {
  subscribers.clear();
}
