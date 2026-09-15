import { bootstrap, run, fail } from "./lib/bootstrap.js";
import { loadGlossary } from "./lib/content.js";
import { DIVIDER, renderSnapshotFooter } from "./lib/output.js";
import { badge } from "./lib/audience.js";
import { ContentNotFoundError } from "./lib/errors.js";

run(() => {
  const term = process.argv[2];
  if (!term) {
    process.stderr.write("Usage: /hub-glossary <term>\n");
    process.exit(2);
  }
  const { snapshotPath, meta } = bootstrap();
  const all = loadGlossary(snapshotPath);
  const lc = term.toLowerCase();
  const match = all.find((g) => g.slug.toLowerCase() === lc || g.data.title.toLowerCase() === lc);

  if (!match) {
    fail(new ContentNotFoundError("glossary", term));
  }

  const related = all
    .filter((g) => g !== match)
    .filter((g) => g.data.topics.some((t) => match.data.topics.includes(t)))
    .slice(0, 5);

  const out: string[] = [];
  out.push(`${match.data.title} ${badge(match.data.audience)}`);
  out.push(DIVIDER);
  out.push(match.data.ai_summary);
  out.push("");
  out.push(match.content.trim());
  out.push("");
  if (related.length > 0) {
    out.push(`Related: ${related.map((r) => r.data.title).join(", ")}`);
    out.push("");
  }
  out.push(renderSnapshotFooter(meta));
  process.stdout.write(out.join("\n") + "\n");
});
