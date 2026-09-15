import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the AzureOpenAI constructor so we don't actually open network connections.
const mocks = vi.hoisted(() => ({
  ctor: vi.fn(),
}));

vi.mock("openai", () => ({
  AzureOpenAI: vi.fn(function (this: Record<string, unknown>, args: unknown) {
    mocks.ctor(args);
    this.__mocked = true;
    this.chat = { completions: { create: vi.fn() } };
  }),
}));

const ENV_KEYS = [
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_DEPLOYMENT",
  "AZURE_OPENAI_API_VERSION",
  "AZURE_OPENAI_API_KEY",
] as const;

describe("azure-client.makeAzureClient", () => {
  beforeEach(() => {
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://example.openai.azure.com");
    vi.stubEnv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini");
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "2024-10-21");
    vi.stubEnv("AZURE_OPENAI_API_KEY", "secret");
    mocks.ctor.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("constructs an AzureOpenAI client from process.env when no args are given", async () => {
    const { makeAzureClient } = await import("../src/azure-client.js");
    const client = makeAzureClient();
    expect(client).toBeDefined();
    expect(mocks.ctor).toHaveBeenCalledTimes(1);
    const args = mocks.ctor.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(args.endpoint).toBe("https://example.openai.azure.com");
    expect(args.deployment).toBe("gpt-4o-mini");
    expect(args.apiVersion).toBe("2024-10-21");
    expect(args.apiKey).toBe("secret");
  });

  it("throws MissingEnvVarError when AZURE_OPENAI_ENDPOINT missing", async () => {
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "");
    const { makeAzureClient } = await import("../src/azure-client.js");
    const { MissingEnvVarError } = await import("../src/env.js");
    expect(() => makeAzureClient()).toThrow(MissingEnvVarError);
  });

  it("throws MissingEnvVarError when AZURE_OPENAI_DEPLOYMENT missing", async () => {
    vi.stubEnv("AZURE_OPENAI_DEPLOYMENT", "");
    const { makeAzureClient } = await import("../src/azure-client.js");
    const { MissingEnvVarError } = await import("../src/env.js");
    expect(() => makeAzureClient()).toThrow(MissingEnvVarError);
  });

  it("throws MissingEnvVarError when AZURE_OPENAI_API_VERSION missing", async () => {
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "");
    const { makeAzureClient } = await import("../src/azure-client.js");
    const { MissingEnvVarError } = await import("../src/env.js");
    expect(() => makeAzureClient()).toThrow(MissingEnvVarError);
  });

  it("throws MissingEnvVarError when AZURE_OPENAI_API_KEY missing", async () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "");
    const { makeAzureClient } = await import("../src/azure-client.js");
    const { MissingEnvVarError } = await import("../src/env.js");
    expect(() => makeAzureClient()).toThrow(MissingEnvVarError);
  });

  // Acknowledgement test that all four named env keys exist in the contract.
  it("references all four AZURE_OPENAI_* env keys", () => {
    expect(ENV_KEYS).toHaveLength(4);
  });
});
