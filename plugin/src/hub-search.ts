import { bootstrap, run, fail } from "./lib/bootstrap.js";
import { loadAll } from "./lib/content.js";
import { filterByAudience } from "./lib/audience.js";
import { search } from "./lib/search.js";
import { DIVIDER, renderSearchHit, renderSnapshotFooter } from "./lib/output.js";
import { ContentNotFoundError } from "./lib/errors.js";

run(() => {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) {
    process.stderr.write(
      "Usage: /hub-search <query>\nProvide a non-empty search term.\n",
    );
    process.exit(2);
  }

  const { config, snapshotPath, meta, state } = bootstrap();
  const all = loadAll(snapshotPath);

  const items = [
    ...filterByAudience(all.glossary, state.audience).map((e) => ({ ...e, pillar: "glossary" })),
    ...filterByAudience(all.tips, state.audience).map((e) => ({ ...e, pillar: "tip" })),
    ...filterByAudience(all.skills, state.audience).map((e) => ({ ...e, pillar: "skill" })),
    ...filterByAudience(all.journeys, state.audience).map((e) => ({ ...e, pillar: "journey" })),
  ];

  const hits = search(query, items, config.search.weights, config.search.snippetLength);

  if (hits.length === 0) {
    fail(new ContentNotFoundError("hub", `no matches for "${query}"`));
  }

  const out: string[] = [];
  out.push(`Search results for "${query}" — ${hits.length} match(es)`);
  out.push(DIVIDER);
  for (const h of hits) out.push(renderSearchHit(h));
  out.push("");
  out.push(renderSnapshotFooter(meta));
  process.stdout.write(out.join("\n") + "\n");
});
