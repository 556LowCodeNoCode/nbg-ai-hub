import { describe, expect, it } from "vitest";
import {
  ConfigMissingError,
  ConfigInvalidError,
  SnapshotMissingError,
  FrontmatterInvalidError,
  ContentNotFoundError,
  NetworkError,
  GitUnavailableError,
  StateInvalidError,
  UrlBuildError,
  JourneyMissingError,
  InstallCommandMissingError,
  isHubError,
  exitCodeFor,
} from "../../src/lib/errors.js";

describe("error classes", () => {
  it("each error has its declared code", () => {
    expect(new ConfigMissingError("x").code).toBe("E_CONFIG_MISSING");
    expect(new ConfigInvalidError("x", "string", "number").code).toBe("E_CONFIG_INVALID");
    expect(new SnapshotMissingError("/p").code).toBe("E_SNAPSHOT_MISSING");
    expect(new FrontmatterInvalidError("/p", ["bad"]).code).toBe("E_FRONTMATTER_INVALID");
    expect(new ContentNotFoundError("glossary", "xyz").code).toBe("E_CONTENT_NOT_FOUND");
    expect(new NetworkError("dns").code).toBe("E_NETWORK");
    expect(new GitUnavailableError().code).toBe("E_GIT_UNAVAILABLE");
    expect(new StateInvalidError("/p", "bad").code).toBe("E_STATE_INVALID");
    expect(new UrlBuildError("nope").code).toBe("E_URL_BUILD");
    expect(new JourneyMissingError("day-99").code).toBe("E_JOURNEY_MISSING");
    expect(new InstallCommandMissingError("foo").code).toBe("E_INSTALL_COMMAND_MISSING");
  });

  it("error messages are informative", () => {
    expect(new ConfigMissingError("productionUrl").message).toContain("productionUrl");
    expect(new SnapshotMissingError("/some/path").message).toContain("/some/path");
    expect(new SnapshotMissingError("/p").message).toContain("/hub-refresh");
  });

  it("preserves cause when provided", () => {
    const inner = new Error("inner");
    const err = new NetworkError("fetch failed", inner);
    expect(err.cause).toBe(inner);
  });
});

describe("isHubError", () => {
  it("discriminates Hub errors from generic errors", () => {
    expect(isHubError(new ConfigMissingError("x"))).toBe(true);
    expect(isHubError(new UrlBuildError("y"))).toBe(true);
    expect(isHubError(new Error("plain"))).toBe(false);
    expect(isHubError(null)).toBe(false);
    expect(isHubError("string")).toBe(false);
  });
});

describe("exitCodeFor", () => {
  it("maps config-class errors to exit code 2", () => {
    expect(exitCodeFor(new ConfigMissingError("x"))).toBe(2);
    expect(exitCodeFor(new ConfigInvalidError("x", "string", "number"))).toBe(2);
    expect(exitCodeFor(new SnapshotMissingError("/p"))).toBe(2);
    expect(exitCodeFor(new StateInvalidError("/p", "bad"))).toBe(2);
  });

  it("maps validation errors to exit code 3", () => {
    expect(exitCodeFor(new FrontmatterInvalidError("/p", ["x"]))).toBe(3);
    expect(exitCodeFor(new UrlBuildError("nope"))).toBe(3);
  });

  it("maps lookup misses to exit code 1", () => {
    expect(exitCodeFor(new ContentNotFoundError("glossary", "xyz"))).toBe(1);
    expect(exitCodeFor(new JourneyMissingError("nope"))).toBe(1);
    expect(exitCodeFor(new InstallCommandMissingError("foo"))).toBe(1);
  });

  it("maps environment/network errors to exit code 4", () => {
    expect(exitCodeFor(new NetworkError("dns"))).toBe(4);
    expect(exitCodeFor(new GitUnavailableError())).toBe(4);
  });
});
