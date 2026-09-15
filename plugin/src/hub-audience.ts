import { run, fail } from "./lib/bootstrap.js";
import { updateAudience } from "./lib/state.js";
import { ConfigInvalidError } from "./lib/errors.js";
import type { Audience } from "./lib/state.js";

const VALID: ReadonlySet<Audience> = new Set<Audience>(["beginner", "advanced", "both"]);

function isAudience(v: string): v is Audience {
  return (VALID as Set<string>).has(v);
}

run(() => {
  const arg = process.argv[2];
  if (!arg) {
    process.stderr.write("Usage: /hub-audience <beginner|advanced|both>\n");
    process.exit(2);
  }
  if (!isAudience(arg)) {
    fail(new ConfigInvalidError("audience", "beginner|advanced|both", arg));
  }
  const next = updateAudience(arg);
  process.stdout.write(
    `Audience set to ${next.audience.toUpperCase()}. All future /hub-* commands will respect this filter until you change it.\n`,
  );
});
