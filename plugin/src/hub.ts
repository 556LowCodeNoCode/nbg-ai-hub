import { bootstrap, run } from "./lib/bootstrap.js";
import { loadAll } from "./lib/content.js";
import { filterByAudience } from "./lib/audience.js";
import { DIVIDER, renderSnapshotFooter } from "./lib/output.js";

run(() => {
  const { config, snapshotPath, meta, state } = bootstrap();
  const all = loadAll(snapshotPath);
  const userAudience = state.audience;

  const counts = {
    glossary: filterByAudience(all.glossary, userAudience).length,
    tips: filterByAudience(all.tips, userAudience).length,
    skills: filterByAudience(all.skills, userAudience).length,
    journeys: filterByAudience(all.journeys, userAudience).length,
  };

  const lines: string[] = [];
  lines.push("NbgAiHub — Claude Code knowledge hub");
  lines.push(DIVIDER);
  lines.push(`Audience filter: ${state.audience.toUpperCase()}    Last journey: ${state.lastJourney ?? "—"}`);
  lines.push(`Site URL (devMode=${config.devMode}): ${config.devMode ? config.devUrl : config.productionUrl}`);
  lines.push("");
  lines.push("Pillars:");
  lines.push(`  /hub-glossary <term>       — ${counts.glossary} glossary entries`);
  lines.push(`  /hub-tips [topic]          — ${counts.tips} tips`);
  lines.push(`  /hub-skills [topic]        — ${counts.skills} skills`);
  lines.push(`  /hub-onboard <journey>     — ${counts.journeys} journeys`);
  lines.push("");
  lines.push("Discovery:");
  lines.push("  /hub-search <query>        — full-text search across all pillars");
  lines.push("  /hub-open [section]        — open the hub website in your browser");
  lines.push("");
  lines.push("Settings:");
  lines.push("  /hub-audience <b|a|both>   — set your audience filter");
  lines.push("  /hub-install <skill-id>    — install a skill from the catalog");
  lines.push("  /hub-refresh               — pull the latest snapshot from the hub repo");
  lines.push("");
  lines.push(renderSnapshotFooter(meta));

  process.stdout.write(lines.join("\n") + "\n");
});
