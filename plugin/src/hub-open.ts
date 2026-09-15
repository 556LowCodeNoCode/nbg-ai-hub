import { run } from "./lib/bootstrap.js";
import { loadConfig, resolveBaseUrl } from "./lib/config.js";
import { buildHubUrl } from "./lib/url-builder.js";
import { openInBrowser, probeUrl } from "./lib/browser.js";

const SKIP_OPEN = process.env["HUB_OPEN_SKIP"] === "1";

run(async () => {
  const config = loadConfig();
  const args = process.argv.slice(2);
  const section = args[0];
  const subsection = args[1];

  const baseUrl = resolveBaseUrl(config);
  const target = buildHubUrl({
    baseUrl,
    ...(section !== undefined ? { section } : {}),
    ...(subsection !== undefined ? { subsection } : {}),
  });

  if (config.devMode) {
    const reachable = await probeUrl(target);
    if (!reachable) {
      process.stderr.write(
        `Dev URL ${baseUrl} is not reachable. Start the site:\n  cd site && npm run dev\n` +
          `Once the dev server is up (port 4321), re-run /hub-open.\n`,
      );
      process.exit(4);
    }
  }

  if (SKIP_OPEN) {
    process.stdout.write(`Would open: ${target}\n`);
    return;
  }
  await openInBrowser(target);
  process.stdout.write(`Opened: ${target}\n`);
});
