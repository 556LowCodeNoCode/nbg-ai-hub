import { bootstrap, run, fail } from "./lib/bootstrap.js";
import { loadSkills } from "./lib/content.js";
import { ContentNotFoundError, InstallCommandMissingError } from "./lib/errors.js";
import { DIVIDER } from "./lib/output.js";

run(() => {
  const skillId = process.argv[2];
  if (!skillId) {
    process.stderr.write("Usage: /hub-install <skill-id>\n");
    process.exit(2);
  }
  const { snapshotPath } = bootstrap();
  const all = loadSkills(snapshotPath);
  const lc = skillId.toLowerCase();
  const match = all.find(
    (s) => s.data.skill_id.toLowerCase() === lc || s.slug.toLowerCase() === lc,
  );

  if (!match) {
    fail(new ContentNotFoundError("skill", skillId));
  }

  if (!match.data.install_command) {
    fail(new InstallCommandMissingError(match.data.skill_id));
  }

  const out: string[] = [];
  out.push(`Install: ${match.data.title}`);
  out.push(DIVIDER);
  out.push(`Run the following command in Claude Code:`);
  out.push("");
  out.push(`  ${match.data.install_command}`);
  out.push("");
  out.push(`Maintainer: ${match.data.maintainer}    Status: ${match.data.status}`);
  process.stdout.write(out.join("\n") + "\n");
});
