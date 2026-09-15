import { describe, it, expect, beforeEach } from "vitest";
import { readEnv, readRedditCreds, MissingEnvVarError } from "../src/env.js";

const ALL_PRESENT = {
  AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
  AZURE_OPENAI_DEPLOYMENT: "gpt-4o-mini",
  AZURE_OPENAI_API_VERSION: "2024-10-21",
  AZURE_OPENAI_API_KEY: "secret-key",
};

describe("env.readEnv", () => {
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    env = { ...ALL_PRESENT } as NodeJS.ProcessEnv;
  });

  it("returns the four AZURE_OPENAI_* values when all present", () => {
    const result = readEnv(env);
    expect(result).toEqual({
      endpoint: "https://example.openai.azure.com",
      deployment: "gpt-4o-mini",
      apiVersion: "2024-10-21",
      apiKey: "secret-key",
    });
  });

  it("throws MissingEnvVarError when AZURE_OPENAI_ENDPOINT missing", () => {
    delete env.AZURE_OPENAI_ENDPOINT;
    try {
      readEnv(env);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingEnvVarError);
      const e = err as MissingEnvVarError;
      expect(e.variableName).toBe("AZURE_OPENAI_ENDPOINT");
      expect(e.message).toContain("AZURE_OPENAI_ENDPOINT");
    }
  });

  it("throws MissingEnvVarError when AZURE_OPENAI_DEPLOYMENT missing", () => {
    delete env.AZURE_OPENAI_DEPLOYMENT;
    try {
      readEnv(env);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingEnvVarError);
      const e = err as MissingEnvVarError;
      expect(e.variableName).toBe("AZURE_OPENAI_DEPLOYMENT");
      expect(e.message).toContain("AZURE_OPENAI_DEPLOYMENT");
    }
  });

  it("throws MissingEnvVarError when AZURE_OPENAI_API_VERSION missing", () => {
    delete env.AZURE_OPENAI_API_VERSION;
    try {
      readEnv(env);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingEnvVarError);
      const e = err as MissingEnvVarError;
      expect(e.variableName).toBe("AZURE_OPENAI_API_VERSION");
      expect(e.message).toContain("AZURE_OPENAI_API_VERSION");
    }
  });

  it("throws MissingEnvVarError when AZURE_OPENAI_API_KEY missing", () => {
    delete env.AZURE_OPENAI_API_KEY;
    try {
      readEnv(env);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingEnvVarError);
      const e = err as MissingEnvVarError;
      expect(e.variableName).toBe("AZURE_OPENAI_API_KEY");
      expect(e.message).toContain("AZURE_OPENAI_API_KEY");
    }
  });

  it("treats empty-string as missing", () => {
    env.AZURE_OPENAI_API_KEY = "";
    expect(() => readEnv(env)).toThrow(MissingEnvVarError);
  });
});

describe("env.readRedditCreds", () => {
  it("returns both creds when present", () => {
    const env = {
      REDDIT_CLIENT_ID: "abc123",
      REDDIT_CLIENT_SECRET: "secretval",
    } as NodeJS.ProcessEnv;
    expect(readRedditCreds(env)).toEqual({
      clientId: "abc123",
      clientSecret: "secretval",
    });
  });

  it("throws MissingEnvVarError when REDDIT_CLIENT_ID missing", () => {
    const env = { REDDIT_CLIENT_SECRET: "x" } as NodeJS.ProcessEnv;
    try {
      readRedditCreds(env);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingEnvVarError);
      expect((err as MissingEnvVarError).variableName).toBe("REDDIT_CLIENT_ID");
    }
  });

  it("throws MissingEnvVarError when REDDIT_CLIENT_SECRET missing", () => {
    const env = { REDDIT_CLIENT_ID: "x" } as NodeJS.ProcessEnv;
    try {
      readRedditCreds(env);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingEnvVarError);
      expect((err as MissingEnvVarError).variableName).toBe("REDDIT_CLIENT_SECRET");
    }
  });

  it("treats empty string as missing", () => {
    const env = {
      REDDIT_CLIENT_ID: "",
      REDDIT_CLIENT_SECRET: "x",
    } as NodeJS.ProcessEnv;
    expect(() => readRedditCreds(env)).toThrow(MissingEnvVarError);
  });
});
