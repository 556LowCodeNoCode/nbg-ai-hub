import { bootstrap, run } from "./lib/bootstrap.js";
import { loadTips, filterByTopic } from "./lib/content.js";
import { filterByAudience } from "./lib/audience.js";
import {
  DIVIDER,
  renderListItem,
  renderSnapshotFooter,
  renderEmptyPillar,
} from "./lib/output.js";

run(() => {
  const topic = process.argv[2];
  const { snapshotPath, meta, state } = bootstrap();
  const all = loadTips(snapshotPath);
  const audienceFiltered = filterByAudience(all, state.audience);
  const filtered = filterByTopic(audienceFiltered, topic);

  const out: string[] = [];
  out.push(`Tips${topic ? ` — topic: ${topic}` : ""} (${filtered.length})`);
  out.push(DIVIDER);
  if (filtered.length === 0) {
    out.push(renderEmptyPillar("matching tips"));
  } else {
    for (const t of filtered) {
      out.push(
        renderListItem({
          title: t.data.title,
          audience: t.data.audience,
          topics: t.data.topics,
          description: t.data.ai_summary,
        }),
      );
      out.push("");
    }
  }
  out.push(renderSnapshotFooter(meta));
  process.stdout.write(out.join("\n") + "\n");
});
