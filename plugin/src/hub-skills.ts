import { bootstrap, run } from "./lib/bootstrap.js";
import { loadSkills, filterByTopic } from "./lib/content.js";
import { filterByAudience, badge } from "./lib/audience.js";
import { DIVIDER, renderSnapshotFooter, renderEmptyPillar } from "./lib/output.js";

run(() => {
  const topic = process.argv[2];
  const { snapshotPath, meta, state } = bootstrap();
  const all = loadSkills(snapshotPath);
  const audienceFiltered = filterByAudience(all, state.audience);
  const filtered = filterByTopic(audienceFiltered, topic);

  const out: string[] = [];
  out.push(`Skills${topic ? ` — topic: ${topic}` : ""} (${filtered.length})`);
  out.push(DIVIDER);

  if (filtered.length === 0) {
    out.push(renderEmptyPillar("matching skills"));
  } else {
    for (const s of filtered) {
      const d = s.data;
      const requires = d.requires && d.requires.length > 0 ? ` requires=[${d.requires.join(", ")}]` : "";
      out.push(`${d.title} ${badge(d.audience)} [${d.status}] (${d.category}, ${d.origin})`);
      out.push(`  id: ${d.skill_id}  maintainer: ${d.maintainer}${requires}`);
      out.push(`  install: ${d.install_command}`);
      out.push(`  ${d.ai_summary}`);
      out.push("");
    }
  }
  out.push(renderSnapshotFooter(meta));
  process.stdout.write(out.join("\n") + "\n");
});
