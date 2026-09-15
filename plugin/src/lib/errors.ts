export abstract class HubError extends Error {
  static readonly code: string;
  abstract readonly code: string;
  override readonly cause: Error | string | undefined;

  constructor(message: string, cause?: Error | string) {
    super(message);
    this.name = new.target.name;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfigMissingError extends HubError {
  readonly code = "E_CONFIG_MISSING";
  constructor(key: string, cause?: Error | string) {
    super(`Required config key missing: ${key}`, cause);
  }
}

export class ConfigInvalidError extends HubError {
  readonly code = "E_CONFIG_INVALID";
  constructor(key: string, expected: string, actual: string, cause?: Error | string) {
    super(`Config key ${key} invalid: expected ${expected}, got ${actual}`, cause);
  }
}

export class SnapshotMissingError extends HubError {
  readonly code = "E_SNAPSHOT_MISSING";
  constructor(path: string, cause?: Error | string) {
    super(`Snapshot directory missing or empty: ${path}. Run /hub-refresh.`, cause);
  }
}

export class FrontmatterInvalidError extends HubError {
  readonly code = "E_FRONTMATTER_INVALID";
  constructor(sourcePath: string, problems: string[], cause?: Error | string) {
    super(
      `Frontmatter invalid in ${sourcePath}: ${problems.join("; ")}`,
      cause,
    );
  }
}

export class ContentNotFoundError extends HubError {
  readonly code = "E_CONTENT_NOT_FOUND";
  constructor(pillar: string, id: string, cause?: Error | string) {
    super(`No ${pillar} entry matching "${id}"`, cause);
  }
}

export class NetworkError extends HubError {
  readonly code = "E_NETWORK";
  constructor(message: string, cause?: Error | string) {
    super(`Network error: ${message}`, cause);
  }
}

export class GitUnavailableError extends HubError {
  readonly code = "E_GIT_UNAVAILABLE";
  constructor(cause?: Error | string) {
    super(
      "git binary not found on PATH. /hub-refresh requires git. Install git or set PATH.",
      cause,
    );
  }
}

export class StateInvalidError extends HubError {
  readonly code = "E_STATE_INVALID";
  constructor(path: string, problem: string, cause?: Error | string) {
    super(`State file invalid at ${path}: ${problem}`, cause);
  }
}

export class UrlBuildError extends HubError {
  readonly code = "E_URL_BUILD";
  constructor(section: string, cause?: Error | string) {
    super(`Cannot build hub URL: unknown section "${section}"`, cause);
  }
}

export class JourneyMissingError extends HubError {
  readonly code = "E_JOURNEY_MISSING";
  constructor(slug: string, cause?: Error | string) {
    super(`Journey "${slug}" not found in snapshot.`, cause);
  }
}

export class InstallCommandMissingError extends HubError {
  readonly code = "E_INSTALL_COMMAND_MISSING";
  constructor(skillId: string, cause?: Error | string) {
    super(`Skill "${skillId}" has no install_command in its frontmatter.`, cause);
  }
}

export function isHubError(err: unknown): err is HubError {
  return err instanceof HubError;
}

const EXIT_CODES: Record<string, number> = {
  E_CONFIG_MISSING: 2,
  E_CONFIG_INVALID: 2,
  E_SNAPSHOT_MISSING: 2,
  E_STATE_INVALID: 2,
  E_FRONTMATTER_INVALID: 3,
  E_URL_BUILD: 3,
  E_CONTENT_NOT_FOUND: 1,
  E_JOURNEY_MISSING: 1,
  E_INSTALL_COMMAND_MISSING: 1,
  E_NETWORK: 4,
  E_GIT_UNAVAILABLE: 4,
};

export function exitCodeFor(err: HubError): number {
  return EXIT_CODES[err.code] ?? 1;
}
