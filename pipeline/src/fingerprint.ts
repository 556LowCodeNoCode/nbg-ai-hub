// fingerprint.ts — SHA-256(feedName + "\n" + (guid || link || title)),
// hex-encoded, truncated to 16 chars.
// Pure: same input -> same output, no I/O.
// See project-design.md §3.5.

import { createHash } from "node:crypto";

export const FINGERPRINT_HEX_LENGTH = 16;

export function computeFingerprint(item: {
  feedName: string;
  guid: string | null;
  link: string | null;
  title: string;
}): string {
  const idPart = item.guid ?? item.link ?? item.title;
  const input = `${item.feedName}\n${idPart}`;
  const hex = createHash("sha256").update(input, "utf8").digest("hex");
  return hex.slice(0, FINGERPRINT_HEX_LENGTH);
}
