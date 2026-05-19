import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Volume, createFsFromVolume } from "memfs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AzureOpenAI } from "openai";
import { run, AllFeedsFailedError } from "../src/index.js";
import { makeLogger, type Logger } from "../src/logger.js";

type FsLike = typeof import("node:fs/promises");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.join(__dirname, "fixtures");

async function readFixture(name: string): Promise<string> {
  return fs.readFile(path.join(FIXTURES, name), "utf8");
}

function memFs(tree: Record<string, string> = {}): FsLike {
  const vol = Volume.fromJSON(tree);
  return createFsFromVolume(vol).promises as unknown as FsLike;
}

function captureLogger(): { logger: Logger; lines: string[] } {
  const lines: string[] = [];
  const stream = {
    write: (chunk: string | Uint8Array) => {
      lines.push(String(chunk));
      return true;
    },
  } as NodeJS.WritableStream;
  return { logger: makeLogger(stream), lines };
}

function makeMockClient(payloadByTitle: Record<string, string>): {
  client: AzureOpenAI;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async (args: { messages: { role: string; content: string }[] }) => {
    const user = args.messages.find((m) => m.role === "user");
    const userText = user?.content ?? "";
    let chosen = '{"relevant":true,"audience":"both","topics":["general"],"summary":"Default. Default.","editor_confidence":"high"}';
    for (const [title, payload] of Object.entries(payloadByTitle)) {
      if (userText.includes(title)) {
        chosen = payload;
        break;
      }
    }
    return { choices: [{ message: { content: chosen } }] };
  });
  const client = { chat: { completions: { create } } } as unknown as AzureOpenAI;
  return { client, create };
}

const ALL_ENV = {
  AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
  AZURE_OPENAI_DEPLOYMENT: "gpt-4o-mini",
  AZURE_OPENAI_API_VERSION: "2024-10-21",
  AZURE_OPENAI_API_KEY: "secret",
};

describe("orchestrator.run", () => {
  let rss20: string;
  let atom: string;

  beforeEach(async () => {
    rss20 = await readFixture("rss-2.0.xml");
    atom = await readFixture("atom.xml");
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", ALL_ENV.AZURE_OPENAI_ENDPOINT);
    vi.stubEnv("AZURE_OPENAI_DEPLOYMENT", ALL_ENV.AZURE_OPENAI_DEPLOYMENT);
    vi.stubEnv("AZURE_OPENAI_API_VERSION", ALL_ENV.AZURE_OPENAI_API_VERSION);
    vi.stubEnv("AZURE_OPENAI_API_KEY", ALL_ENV.AZURE_OPENAI_API_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("continues after individual feed failure (AC6)", async () => {
    const memFsObj = memFs({
      "/repo/config/rss-sources.json": JSON.stringify([
        { name: "Good", url: "https://good.example/feed.xml", enabled: true, auto_promote_eligible: false },
        { name: "Bad", url: "https://bad.example/feed.xml", enabled: true, auto_promote_eligible: false },
      ]),
    });
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("good")) {
        return new Response(rss20, { status: 200 });
      }
      return new Response("err", { status: 500 });
    });
    const { client } = makeMockClient({});
    const { logger, lines } = captureLogger();

    const result = await run({
      repoRoot: "/repo",
      configPath: "/repo/config/rss-sources.json",
      newsRoot: "/repo/news",
      pipelineDir: "/repo/pipeline",
      now: () => new Date("2026-05-18T06:00:00Z"),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      fs: memFsObj,
      makeClient: () => client,
      logger,
    });

    expect(result.exitCode).toBe(0);
    expect(result.feedsAttempted).toBe(2);
    expect(result.feedsFailed.length).toBe(1);
    expect(result.feedsFailed[0]?.name).toBe("Bad");
    expect(result.itemsWritten.length).toBeGreaterThan(0);

    // Workflow warning command bubbled up.
    expect(lines.some((l) => l.includes("::warning::"))).toBe(true);
  });

  it("exits non-zero (and throws AllFeedsFailedError) when all feeds fail", async () => {
    const memFsObj = memFs({
      "/repo/config/rss-sources.json": JSON.stringify([
        { name: "Bad1", url: "https://bad1.example/feed.xml", enabled: true, auto_promote_eligible: false },
        { name: "Bad2", url: "https://bad2.example/feed.xml", enabled: true, auto_promote_eligible: false },
      ]),
    });
    const fetchImpl = vi.fn(async () => new Response("err", { status: 500 }));
    const { client } = makeMockClient({});
    const { logger } = captureLogger();

    await expect(
      run({
        repoRoot: "/repo",
        configPath: "/repo/config/rss-sources.json",
        newsRoot: "/repo/news",
        pipelineDir: "/repo/pipeline",
        now: () => new Date("2026-05-18T06:00:00Z"),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        fs: memFsObj,
        makeClient: () => client,
        logger,
      }),
    ).rejects.toBeInstanceOf(AllFeedsFailedError);
  });

  it("exits non-zero with empty config (no enabled feeds)", async () => {
    const memFsObj = memFs({
      "/repo/config/rss-sources.json": JSON.stringify([
        { name: "X", url: "https://x.example/feed.xml", enabled: false, auto_promote_eligible: false },
      ]),
    });
    const { client } = makeMockClient({});
    const { logger } = captureLogger();

    const result = await run({
      repoRoot: "/repo",
      configPath: "/repo/config/rss-sources.json",
      newsRoot: "/repo/news",
      pipelineDir: "/repo/pipeline",
      now: () => new Date("2026-05-18T06:00:00Z"),
      fetchImpl: vi.fn() as unknown as typeof fetch,
      fs: memFsObj,
      makeClient: () => client,
      logger,
    });
    expect(result.exitCode).toBe(1);
  });

  it("empty-run produces no commits and sets new_items=false", async () => {
    const memFsObj = memFs({
      "/repo/config/rss-sources.json": JSON.stringify([
        { name: "Good", url: "https://good.example/feed.xml", enabled: true, auto_promote_eligible: false },
      ]),
      "/runner/output": "",
    });
    const fetchImpl = vi.fn(async () => new Response(rss20, { status: 200 }));
    // All items rated irrelevant.
    const { client } = makeMockClient({
      "Claude 4 launches": '{"relevant":false,"audience":"both","topics":[],"summary":"Not relevant.","editor_confidence":"high"}',
      "Constitutional AI 2.0 paper released": '{"relevant":false,"audience":"both","topics":[],"summary":"Not relevant.","editor_confidence":"high"}',
    });
    const { logger } = captureLogger();

    const prevOutput = process.env.GITHUB_OUTPUT;
    process.env.GITHUB_OUTPUT = "/runner/output";

    try {
      const result = await run({
        repoRoot: "/repo",
        configPath: "/repo/config/rss-sources.json",
        newsRoot: "/repo/news",
        pipelineDir: "/repo/pipeline",
        now: () => new Date("2026-05-18T06:00:00Z"),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        fs: memFsObj,
        makeClient: () => client,
        logger,
      });
      expect(result.exitCode).toBe(0);
      expect(result.itemsWritten.length).toBe(0);
      expect(result.autoPromoted.length).toBe(0);
      expect(result.reviewNeeded.length).toBe(0);

      const output = String(await memFsObj.readFile("/runner/output", "utf8"));
      expect(output).toContain("new_items=false");
      expect(output).toContain("auto_promote_count=0");
      expect(output).toContain("review_count=0");
      expect(output).toContain("mode=empty");
    } finally {
      if (prevOutput === undefined) {
        delete process.env.GITHUB_OUTPUT;
      } else {
        process.env.GITHUB_OUTPUT = prevOutput;
      }
    }
  });

  it("does NOT call Azure for items whose fingerprint is already seen (AC7)", async () => {
    // Seed an existing /news/incoming/ file with the fingerprint that will be
    // computed for the first RSS 2.0 item.
    // Fingerprint = sha256("Good\nanthropic-claude-4-2026-05-18").slice(0,16)
    // We rely on the orchestrator+fingerprint module to recompute the same.
    // The "Good" feed name is what we set in config.
    const { computeFingerprint } = await import("../src/fingerprint.js");
    const fp = computeFingerprint({
      feedName: "Good",
      guid: "anthropic-claude-4-2026-05-18",
      link: "https://www.anthropic.com/news/claude-4",
      title: "Claude 4 launches with multimodal vision",
    });

    const seenMd = `---\ntype: news\ntitle: previously seen\nfingerprint: ${fp}\n---\n\nBody.\n`;

    const memFsObj = memFs({
      "/repo/config/rss-sources.json": JSON.stringify([
        { name: "Good", url: "https://good.example/feed.xml", enabled: true, auto_promote_eligible: false },
      ]),
      "/repo/news/incoming/2026-05-17-old.md": seenMd,
    });
    const fetchImpl = vi.fn(async () => new Response(rss20, { status: 200 }));
    const { client, create } = makeMockClient({
      "Constitutional AI 2.0 paper released":
        '{"relevant":true,"audience":"both","topics":["research"],"summary":"S1. S2.","editor_confidence":"medium"}',
    });
    const { logger } = captureLogger();

    const result = await run({
      repoRoot: "/repo",
      configPath: "/repo/config/rss-sources.json",
      newsRoot: "/repo/news",
      pipelineDir: "/repo/pipeline",
      now: () => new Date("2026-05-18T06:00:00Z"),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      fs: memFsObj,
      makeClient: () => client,
      logger,
    });

    expect(result.itemsDeduped).toBeGreaterThanOrEqual(1);
    // Only ONE Azure call (for the second item) — the seen item was filtered.
    expect(create).toHaveBeenCalledTimes(1);
    const userArg = create.mock.calls[0]?.[0] as { messages: { role: string; content: string }[] };
    const userMsg = userArg.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("Constitutional AI 2.0 paper released");
  });

  it("emits NF6 log lines for feeds attempted, feeds failed, items fetched, items deduped, items written", async () => {
    const memFsObj = memFs({
      "/repo/config/rss-sources.json": JSON.stringify([
        { name: "Good", url: "https://good.example/feed.xml", enabled: true, auto_promote_eligible: false },
        { name: "Bad", url: "https://bad.example/feed.xml", enabled: true, auto_promote_eligible: false },
      ]),
    });
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("good")) return new Response(rss20, { status: 200 });
      return new Response("err", { status: 500 });
    });
    const { client } = makeMockClient({});
    const { logger, lines } = captureLogger();

    await run({
      repoRoot: "/repo",
      configPath: "/repo/config/rss-sources.json",
      newsRoot: "/repo/news",
      pipelineDir: "/repo/pipeline",
      now: () => new Date("2026-05-18T06:00:00Z"),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      fs: memFsObj,
      makeClient: () => client,
      logger,
    });

    const all = lines.join("");
    expect(all).toContain("feeds_attempted");
    expect(all).toContain("feed_failed");
    expect(all).toContain("items_fetched_total");
    expect(all).toContain("items_deduped");
    expect(all).toContain("items_written");
  });

  it("writes pr-body.md when at least one item is emitted", async () => {
    const memFsObj = memFs({
      "/repo/config/rss-sources.json": JSON.stringify([
        { name: "Good", url: "https://good.example/feed.xml", enabled: true, auto_promote_eligible: false },
      ]),
    });
    const fetchImpl = vi.fn(async () => new Response(atom, { status: 200 }));
    const { client } = makeMockClient({});
    const { logger } = captureLogger();

    const result = await run({
      repoRoot: "/repo",
      configPath: "/repo/config/rss-sources.json",
      newsRoot: "/repo/news",
      pipelineDir: "/repo/pipeline",
      now: () => new Date("2026-05-18T06:00:00Z"),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      fs: memFsObj,
      makeClient: () => client,
      logger,
    });

    expect(result.itemsWritten.length).toBeGreaterThan(0);
    const body = String(await memFsObj.readFile("/repo/pipeline/pr-body.md", "utf8"));
    expect(body).toContain("News triage 2026-05-18");
  });

  // Variant C — DECISIONS 2026-05-19.
  it("auto-promotes high-confidence items from eligible feeds to news/published/", async () => {
    const memFsObj = memFs({
      "/repo/config/rss-sources.json": JSON.stringify([
        { name: "Good", url: "https://good.example/feed.xml", enabled: true, auto_promote_eligible: true },
      ]),
      "/runner/output": "",
    });
    // Both items rated high confidence → both go to published/.
    const fetchImpl = vi.fn(async () => new Response(rss20, { status: 200 }));
    const { client } = makeMockClient({});
    const { logger } = captureLogger();

    const prevOutput = process.env.GITHUB_OUTPUT;
    process.env.GITHUB_OUTPUT = "/runner/output";

    try {
      const result = await run({
        repoRoot: "/repo",
        configPath: "/repo/config/rss-sources.json",
        newsRoot: "/repo/news",
        pipelineDir: "/repo/pipeline",
        now: () => new Date("2026-05-19T06:00:00Z"),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        fs: memFsObj,
        makeClient: () => client,
        logger,
      });
      expect(result.exitCode).toBe(0);
      expect(result.autoPromoted.length).toBeGreaterThan(0);
      expect(result.reviewNeeded.length).toBe(0);
      expect(result.itemsWritten.length).toBe(result.autoPromoted.length);

      // Files physically present under news/published/.
      for (const e of result.autoPromoted) {
        const stat = await memFsObj.stat(`/repo/news/published/${e.filename}`);
        expect(stat.isFile()).toBe(true);
      }

      const output = String(await memFsObj.readFile("/runner/output", "utf8"));
      expect(output).toContain("new_items=true");
      expect(output).toContain("mode=auto_only");
      expect(output).toContain(`auto_promote_count=${result.autoPromoted.length}`);
      expect(output).toContain("review_count=0");
    } finally {
      if (prevOutput === undefined) {
        delete process.env.GITHUB_OUTPUT;
      } else {
        process.env.GITHUB_OUTPUT = prevOutput;
      }
    }
  });

  it("routes high-confidence items from INELIGIBLE feeds to news/incoming/", async () => {
    const memFsObj = memFs({
      "/repo/config/rss-sources.json": JSON.stringify([
        { name: "Good", url: "https://good.example/feed.xml", enabled: true, auto_promote_eligible: false },
      ]),
      "/runner/output": "",
    });
    const fetchImpl = vi.fn(async () => new Response(rss20, { status: 200 }));
    const { client } = makeMockClient({});
    const { logger } = captureLogger();

    const prevOutput = process.env.GITHUB_OUTPUT;
    process.env.GITHUB_OUTPUT = "/runner/output";

    try {
      const result = await run({
        repoRoot: "/repo",
        configPath: "/repo/config/rss-sources.json",
        newsRoot: "/repo/news",
        pipelineDir: "/repo/pipeline",
        now: () => new Date("2026-05-19T06:00:00Z"),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        fs: memFsObj,
        makeClient: () => client,
        logger,
      });
      expect(result.autoPromoted.length).toBe(0);
      expect(result.reviewNeeded.length).toBeGreaterThan(0);
      for (const e of result.reviewNeeded) {
        const stat = await memFsObj.stat(`/repo/news/incoming/${e.filename}`);
        expect(stat.isFile()).toBe(true);
      }
      const output = String(await memFsObj.readFile("/runner/output", "utf8"));
      expect(output).toContain("mode=review_only");
    } finally {
      if (prevOutput === undefined) {
        delete process.env.GITHUB_OUTPUT;
      } else {
        process.env.GITHUB_OUTPUT = prevOutput;
      }
    }
  });

  it("eligible feed auto-promotes regardless of confidence (unconditional auto-promote policy)", async () => {
    // Confirms the policy reversal: with the confidence gate removed,
    // an eligible feed promotes EVERY relevant item to news/published/,
    // including medium / low confidence ones.
    const memFsObj = memFs({
      "/repo/config/rss-sources.json": JSON.stringify([
        { name: "Good", url: "https://good.example/feed.xml", enabled: true, auto_promote_eligible: true },
      ]),
      "/runner/output": "",
    });
    const fetchImpl = vi.fn(async () => new Response(rss20, { status: 200 }));
    const { client } = makeMockClient({
      "Claude 4 launches":
        '{"relevant":true,"audience":"both","topics":["news"],"summary":"S1. S2.","editor_confidence":"high"}',
      "Constitutional AI 2.0 paper released":
        '{"relevant":true,"audience":"both","topics":["research"],"summary":"S1. S2.","editor_confidence":"medium"}',
    });
    const { logger } = captureLogger();

    const prevOutput = process.env.GITHUB_OUTPUT;
    process.env.GITHUB_OUTPUT = "/runner/output";

    try {
      const result = await run({
        repoRoot: "/repo",
        configPath: "/repo/config/rss-sources.json",
        newsRoot: "/repo/news",
        pipelineDir: "/repo/pipeline",
        now: () => new Date("2026-05-19T06:00:00Z"),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        fs: memFsObj,
        makeClient: () => client,
        logger,
      });
      expect(result.autoPromoted.length).toBe(2);
      expect(result.reviewNeeded.length).toBe(0);
      expect(result.itemsWritten.length).toBe(2);

      const output = String(await memFsObj.readFile("/runner/output", "utf8"));
      expect(output).toContain("mode=auto_only");
      expect(output).toContain("auto_promote_count=2");
      expect(output).toContain("review_count=0");
    } finally {
      if (prevOutput === undefined) {
        delete process.env.GITHUB_OUTPUT;
      } else {
        process.env.GITHUB_OUTPUT = prevOutput;
      }
    }
  });
});
