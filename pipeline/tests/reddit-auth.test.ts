import { describe, it, expect, vi } from "vitest";
import {
  getRedditAccessToken,
  RedditAuthError,
  REDDIT_TOKEN_URL,
} from "../src/reddit-auth.js";

function tokenResponse(body: object | string, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("reddit-auth.getRedditAccessToken", () => {
  it("returns token + expiresInSec on 200 OK", async () => {
    const fakeFetch = vi.fn(async () =>
      tokenResponse({ access_token: "tok123", expires_in: 86400, token_type: "bearer", scope: "*" }),
    );
    const result = await getRedditAccessToken("cid", "csec", fakeFetch as unknown as typeof fetch);
    expect(result).toEqual({ accessToken: "tok123", expiresInSec: 86400 });
  });

  it("hits the canonical token URL", async () => {
    const fakeFetch = vi.fn(async () =>
      tokenResponse({ access_token: "t", expires_in: 100 }),
    );
    await getRedditAccessToken("cid", "csec", fakeFetch as unknown as typeof fetch);
    expect(fakeFetch.mock.calls[0]?.[0]).toBe(REDDIT_TOKEN_URL);
  });

  it("sends Basic auth header derived from client_id:client_secret", async () => {
    const fakeFetch = vi.fn(async () =>
      tokenResponse({ access_token: "t", expires_in: 100 }),
    );
    await getRedditAccessToken("myclient", "mysecret", fakeFetch as unknown as typeof fetch);
    const init = fakeFetch.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    const expectedBasic = Buffer.from("myclient:mysecret").toString("base64");
    expect(headers["Authorization"]).toBe(`Basic ${expectedBasic}`);
  });

  it("sends grant_type=client_credentials in the body", async () => {
    const fakeFetch = vi.fn(async () =>
      tokenResponse({ access_token: "t", expires_in: 100 }),
    );
    await getRedditAccessToken("cid", "csec", fakeFetch as unknown as typeof fetch);
    const init = fakeFetch.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(String(init.body)).toBe("grant_type=client_credentials");
  });

  it("sends descriptive User-Agent", async () => {
    const fakeFetch = vi.fn(async () =>
      tokenResponse({ access_token: "t", expires_in: 100 }),
    );
    await getRedditAccessToken("cid", "csec", fakeFetch as unknown as typeof fetch);
    const init = fakeFetch.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["User-Agent"]).toContain("NbgAiHub");
  });

  it("throws RedditAuthError on 401 (bad creds)", async () => {
    const fakeFetch = vi.fn(async () => new Response("Unauthorized", { status: 401 }));
    try {
      await getRedditAccessToken("cid", "csec", fakeFetch as unknown as typeof fetch);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RedditAuthError);
      expect((err as RedditAuthError).status).toBe(401);
    }
  });

  it("throws RedditAuthError on 5xx", async () => {
    const fakeFetch = vi.fn(async () => new Response("oops", { status: 502 }));
    await expect(
      getRedditAccessToken("cid", "csec", fakeFetch as unknown as typeof fetch),
    ).rejects.toMatchObject({ name: "RedditAuthError", status: 502 });
  });

  it("throws RedditAuthError on network error", async () => {
    const fakeFetch = vi.fn(async () => {
      throw new Error("ENOTFOUND");
    });
    try {
      await getRedditAccessToken("cid", "csec", fakeFetch as unknown as typeof fetch);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RedditAuthError);
      expect((err as RedditAuthError).status).toBeNull();
    }
  });

  it("throws RedditAuthError on malformed JSON", async () => {
    const fakeFetch = vi.fn(async () => tokenResponse("not json {"));
    await expect(
      getRedditAccessToken("cid", "csec", fakeFetch as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(RedditAuthError);
  });

  it("throws RedditAuthError when access_token is missing", async () => {
    const fakeFetch = vi.fn(async () => tokenResponse({ expires_in: 86400 }));
    await expect(
      getRedditAccessToken("cid", "csec", fakeFetch as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(RedditAuthError);
  });

  it("throws RedditAuthError when expires_in is missing", async () => {
    const fakeFetch = vi.fn(async () => tokenResponse({ access_token: "t" }));
    await expect(
      getRedditAccessToken("cid", "csec", fakeFetch as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(RedditAuthError);
  });

  it("throws RedditAuthError when client_id is empty", async () => {
    const fakeFetch = vi.fn(async () => tokenResponse({ access_token: "t", expires_in: 1 }));
    await expect(
      getRedditAccessToken("", "csec", fakeFetch as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(RedditAuthError);
  });

  it("throws RedditAuthError when client_secret is empty", async () => {
    const fakeFetch = vi.fn(async () => tokenResponse({ access_token: "t", expires_in: 1 }));
    await expect(
      getRedditAccessToken("cid", "", fakeFetch as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(RedditAuthError);
  });
});
