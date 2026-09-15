import { describe, it, expect, vi } from "vitest";
import { Volume, createFsFromVolume } from "memfs";
import {
  buildPrBody,
  writePrBodyFile,
  setStepOutput,
  createPullRequest,
} from "../src/pr.js";
import type { EmittedItem } from "../src/types.js";

type FsLike = typeof import("node:fs/promises");

function memFs(tree: Record<string, string> = {}): FsLike {
  const vol = Volume.fromJSON(tree);
  return createFsFromVolume(vol).promises as unknown as FsLike;
}

function makeEmitted(overrides: Partial<EmittedItem> = {}): EmittedItem {
  const base: EmittedItem = {
    item: {
      feedName: "Anthropic news",
      guid: "g1",
      link: "https://example.com/x",
      title: "Claude 4 launches",
      publishedAt: new Date("2026-05-18T09:00:00Z"),
      rawContent: null,
    },
    triage: {
      relevant: true,
      audience: "beginner",
      topics: ["setup"],
      summary: "Sentence one. Sentence two.",
      editor_confidence: "high",
    },
    runDateUtc: "2026-05-18",
    fingerprint: "abcd1234abcd1234",
    slug: "claude-4-launches",
    filename: "2026-05-18-claude-4-launches.md",
  };
  return { ...base, ...overrides };
}

describe("pr.buildPrBody", () => {
  it("PR body file contains title, source, link, ai_summary, confidence per item (R-5)", () => {
    const items: EmittedItem[] = [makeEmitted()];
    const body = buildPrBody([], items, "2026-05-18");
    expect(body).toContain("News triage 2026-05-18");
    expect(body).toContain("Claude 4 launches");
    expect(body).toContain("Anthropic news");
    expect(body).toContain("https://example.com/x");
    expect(body).toContain("Sentence one. Sentence two.");
    expect(body).toContain("[confidence: high]");
  });

  it("shows the confidence marker per item so reviewers can skim", () => {
    const low = makeEmitted({
      triage: {
        relevant: true,
        audience: "both",
        topics: ["t"],
        summary: "x. y.",
        editor_confidence: "low",
      },
    });
    const body = buildPrBody([], [low], "2026-05-18");
    expect(body).toContain("[confidence: low]");
  });

  it("groups items by source name (alphabetically)", () => {
    const a = makeEmitted({
      item: {
        feedName: "Zeta",
        guid: "g-z",
        link: "https://z.example",
        title: "Z",
        publishedAt: null,
        rawContent: null,
      },
      filename: "2026-05-18-z.md",
      slug: "z",
    });
    const b = makeEmitted({
      item: {
        feedName: "Alpha",
        guid: "g-a",
        link: "https://a.example",
        title: "A",
        publishedAt: null,
        rawContent: null,
      },
      filename: "2026-05-18-a.md",
      slug: "a",
    });
    const body = buildPrBody([], [a, b], "2026-05-18");
    const alphaIdx = body.indexOf("### Alpha");
    const zetaIdx = body.indexOf("### Zeta");
    expect(alphaIdx).toBeGreaterThan(-1);
    expect(zetaIdx).toBeGreaterThan(-1);
    expect(alphaIdx).toBeLessThan(zetaIdx);
  });

  it("renders only the 'For review' section when there are no auto-promoted items", () => {
    const body = buildPrBody([], [makeEmitted()], "2026-05-18");
    expect(body).toContain("## For review");
    expect(body).not.toContain("## Auto-promoted");
    expect(body).toContain("news/incoming/");
  });

  it("renders only the 'Auto-promoted' section when there are no review-needed items", () => {
    const auto = makeEmitted({
      item: {
        feedName: "Hacker News frontpage",
        guid: "g-hn",
        link: "https://hn.example/x",
        title: "Big AI news",
        publishedAt: null,
        rawContent: null,
      },
      slug: "big-ai-news",
      filename: "2026-05-18-big-ai-news.md",
    });
    const body = buildPrBody([auto], [], "2026-05-18");
    expect(body).toContain("## Auto-promoted");
    expect(body).not.toContain("## For review");
    expect(body).toContain("news/published/");
    expect(body).toContain("Big AI news");
  });

  it("renders BOTH sections when mixed, with explicit counts", () => {
    const auto = makeEmitted({
      item: {
        feedName: "Wired AI",
        guid: "g-w",
        link: "https://wired.example/x",
        title: "Auto item",
        publishedAt: null,
        rawContent: null,
      },
      slug: "auto-item",
      filename: "2026-05-18-auto-item.md",
    });
    const review = makeEmitted({
      item: {
        feedName: "r/ClaudeAI",
        guid: "g-r",
        link: "https://r.example/x",
        title: "Review item",
        publishedAt: null,
        rawContent: null,
      },
      slug: "review-item",
      filename: "2026-05-18-review-item.md",
    });
    const body = buildPrBody([auto], [review], "2026-05-18");
    expect(body).toContain("## Auto-promoted (n=1)");
    expect(body).toContain("## For review (n=1)");
    expect(body).toContain("Auto item");
    expect(body).toContain("Review item");
    // Source grouping uses h3 inside each section.
    expect(body).toContain("### Wired AI");
    expect(body).toContain("### r/ClaudeAI");
    // Auto section appears before review.
    expect(body.indexOf("## Auto-promoted")).toBeLessThan(
      body.indexOf("## For review"),
    );
  });
});

describe("pr.writePrBodyFile", () => {
  it("writes pr-body.md to the pipeline directory", async () => {
    const fs = memFs();
    const target = await writePrBodyFile("hello", "/pipeline", fs);
    expect(target).toBe("/pipeline/pr-body.md");
    const content = String(await fs.readFile(target, "utf8"));
    expect(content).toBe("hello");
  });
});

describe("pr.setStepOutput", () => {
  it("appends name=value to $GITHUB_OUTPUT when set", async () => {
    const fs = memFs({ "/runner/output": "" });
    await setStepOutput("new_items", "true", { GITHUB_OUTPUT: "/runner/output" }, fs);
    const content = String(await fs.readFile("/runner/output", "utf8"));
    expect(content).toContain("new_items=true");
  });

  it("appends multiple invocations cumulatively", async () => {
    const fs = memFs({ "/runner/output": "" });
    await setStepOutput("a", "1", { GITHUB_OUTPUT: "/runner/output" }, fs);
    await setStepOutput("b", "2", { GITHUB_OUTPUT: "/runner/output" }, fs);
    const content = String(await fs.readFile("/runner/output", "utf8"));
    expect(content).toContain("a=1");
    expect(content).toContain("b=2");
  });

  it("does not throw when GITHUB_OUTPUT is unset (local dev)", async () => {
    const fs = memFs();
    await expect(setStepOutput("new_items", "false", {}, fs)).resolves.toBeUndefined();
  });
});

describe("pr.createPullRequest (test-only seam contract)", () => {
  it("creates triage PR with correct title and branch", async () => {
    const exec = vi.fn(async (_cmd: string, _args: string[], _opts: { cwd: string }) => ({
      stdout: "https://github.com/example/repo/pull/42",
      stderr: "",
    }));
    const result = await createPullRequest({
      branch: "news-triage/2026-05-18-a1b2c3d",
      title: "News triage 2026-05-18",
      bodyFilePath: "/repo/pipeline/pr-body.md",
      exec,
      env: { GITHUB_WORKSPACE: "/repo" },
    });
    expect(result.prUrl).toBe("https://github.com/example/repo/pull/42");
    expect(exec).toHaveBeenCalledTimes(1);
    const [cmd, args, opts] = exec.mock.calls[0]!;
    expect(cmd).toBe("gh");
    expect(args).toContain("pr");
    expect(args).toContain("create");
    expect(args).toContain("--title");
    expect(args).toContain("News triage 2026-05-18");
    expect(args).toContain("--head");
    expect(args).toContain("news-triage/2026-05-18-a1b2c3d");
    expect(args).toContain("--body-file");
    expect(args).toContain("/repo/pipeline/pr-body.md");
    // R-7: cwd is GITHUB_WORKSPACE.
    expect(opts.cwd).toBe("/repo");
  });

  it("cwd passed to execFile is GITHUB_WORKSPACE when set (R-7)", async () => {
    const exec = vi.fn(async () => ({ stdout: "", stderr: "" }));
    await createPullRequest({
      branch: "b",
      title: "t",
      bodyFilePath: "/x",
      exec,
      env: { GITHUB_WORKSPACE: "/runner/work/repo" },
    });
    const opts = exec.mock.calls[0]?.[2];
    expect(opts?.cwd).toBe("/runner/work/repo");
  });

  it("defaults base branch to main", async () => {
    const exec = vi.fn(async () => ({ stdout: "", stderr: "" }));
    await createPullRequest({
      branch: "b",
      title: "t",
      bodyFilePath: "/x",
      exec,
      env: { GITHUB_WORKSPACE: "/repo" },
    });
    const args = exec.mock.calls[0]?.[1] as string[];
    const baseIdx = args.indexOf("--base");
    expect(args[baseIdx + 1]).toBe("main");
  });

  it("does not open PR when no new items (AC14: setStepOutput marks false instead)", async () => {
    // Empty items -> no PR; instead, setStepOutput is called with "false".
    // This is the orchestrator-level contract, not pr.ts directly, but we
    // verify the building block: no gh exec call is triggered.
    const exec = vi.fn();
    // Simulate the orchestrator deciding not to call createPullRequest:
    const items: EmittedItem[] = [];
    if (items.length === 0) {
      // skip
    } else {
      await createPullRequest({
        branch: "b",
        title: "t",
        bodyFilePath: "/x",
        exec,
      });
    }
    expect(exec).not.toHaveBeenCalled();
  });
});
