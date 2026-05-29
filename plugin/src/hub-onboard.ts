import { bootstrap, run } from "./lib/bootstrap.js";
import { findJourney, isPlaceholderBody, listJourneys } from "./lib/journeys.js";
import { updateLastJourney } from "./lib/state.js";
import { DIVIDER, renderSnapshotFooter } from "./lib/output.js";
import { badge } from "./lib/audience.js";
import type { BaseFrontmatter } from "./lib/frontmatter.js";

run(() => {
  const slug = process.argv[2];
  const { snapshotPath, meta } = bootstrap();

  if (!slug) {
    const journeys = listJourneys(snapshotPath);
    const out: string[] = [];
    out.push("Available journeys");
    out.push(DIVIDER);
    if (journeys.length === 0) {
      out.push("No journeys in this snapshot yet.");
    } else {
      for (const j of journeys) {
        const fm = j.parsed.data as unknown as BaseFrontmatter;
        out.push(`  ${j.slug.padEnd(20)} ${badge(fm.audience)}  ${fm.title}`);
      }
    }
    out.push("");
    out.push(`Usage: /hub-onboard <slug>`);
    out.push(renderSnapshotFooter(meta));
    process.stdout.write(out.join("\n") + "\n");
    return;
  }

  const entry = findJourney(snapshotPath, slug);
  updateLastJourney(slug);

  const fm = entry.parsed.data as unknown as BaseFrontmatter;
  const out: string[] = [];
  out.push(`${fm.title} ${badge(fm.audience)}`);
  out.push(DIVIDER);
  out.push(fm.ai_summary);
  out.push("");
  if (isPlaceholderBody(entry.parsed.content)) {
    out.push("[content in progress] — this journey is scaffolded but not yet authored.");
    out.push("Track or contribute via: github.com/556LowCodeNoCode/NbgAiHub/journeys/");
  } else {
    out.push(entry.parsed.content.trim());
  }
  out.push("");
  out.push(renderSnapshotFooter(meta));
  process.stdout.write(out.join("\n") + "\n");
});
