// triage.ts — Single Azure OpenAI chat completion per item.
// JSON-mode response; strict shape validation; drop irrelevant items.
// See project-design.md §3.8.

import type { AzureOpenAI } from "openai";
import type { FeedItem, TriageResult } from "./types.js";

export const DEFAULT_TRIAGE_TEMPERATURE = 0;
export const DEFAULT_TRIAGE_MAX_TOKENS = 400;

export class MalformedTriageResponseError extends Error {
  public readonly rawPayload: string;
  public readonly issue: string;

  constructor(rawPayload: string, issue: string) {
    super(`Malformed Azure OpenAI triage response: ${issue}`);
    this.name = "MalformedTriageResponseError";
    this.rawPayload = rawPayload;
    this.issue = issue;
  }
}

/**
 * System prompt: MUST contain the literal word "JSON" (Azure JSON-mode
 * requirement; see investigation §1 gotcha 2) AND enumerate the five
 * required output fields. Source-aware: the prompt branches on the
 * `Feed:` line in the user content (see buildUserContent).
 */
export const SYSTEM_PROMPT = [
  "You are an editorial triage assistant for a Claude Code knowledge hub aimed at bank colleagues who are learning Claude Code.",
  "Decide whether each item is relevant to that audience, and how confident you are.",
  "Be strict: the hub's value is signal, not coverage. When in doubt, reject. We prefer to miss one good item than admit five mediocre ones.",
  "",
  "Source-group rules (the `Feed:` line in the user message tells you which source):",
  "",
  '* Reddit feeds ("r/ClaudeAI", "r/ClaudeCode") — STRICT. Accept ONLY posts that fall into one of these four categories:',
  "    (a) Tips, tricks, prompts, workflow recipes — posts with concrete reproducible steps, prompts, or commands someone else can copy and apply.",
  "    (b) Field reports / war stories — documented failure modes with root cause and fix, or hard-won patterns from real use.",
  '    (c) Platform news — factual reporting of operational changes to Claude or Anthropic (rate limits, pricing, new model availability, feature rollouts, deprecations, outage post-mortems) with enough detail to be actionable. Reddit often surfaces these before the official blog. Example accept: "Claude Code weekly limits are increasing 50%, now through July 13."',
  '    (d) Professional / enterprise use — substantive case studies or experience reports from real workplace deployments; governance / compliance / security / audit considerations; at-scale rollout patterns; comparisons grounded in actual deployment experience. Example accept: "Claude in an Enterprise Environment" if it contains real specifics, not generic thought leadership.',
  '  REJECT (regardless of category): questions / "how do I…" / help requests; promo / "look what I built" / link-in-bio; complaints, rants, model-vs-model flamewars; screenshots without prose; memes, polls, billing or account drama; vendor pitches disguised as discussion; generic LinkedIn-style thought leadership with no specifics; pure speculation about how big-company-X uses Claude with no inside source.',
  "",
  '* Major tech / AI news ("Hacker News frontpage", "Wired AI", "The Verge") — these are general tech publications with HIGH noise. Judge the LINKED article, not the headline. Accept ONLY professional, industry-level news and breakthrough AI developments.',
  "  ACCEPT:",
  "    - Major new model launches from any significant lab (Anthropic, OpenAI, Google DeepMind, Meta, xAI, Mistral, Cohere, DeepSeek, Alibaba, etc.).",
  "    - Significant capability breakthroughs (record benchmarks, novel architectures, agentic milestones, multimodal advances, long-context records, reasoning advances).",
  "    - Major strategic moves in AI: large acquisitions, funding rounds at scale, partnerships between major labs/clouds, key personnel moves at frontier labs.",
  "    - Regulatory / policy news with concrete industry impact (EU AI Act, US executive actions, significant lawsuits or settlements affecting AI development or deployment).",
  "    - Significant AI safety / security incidents or research releases (jailbreaks at scale, alignment milestones, model exfiltration events, frontier-model risk assessments).",
  "    - New developer-facing platforms or APIs from major AI labs that affect how Claude Code users build.",
  '    - Example accept: "Anthropic acquires Stainless", "OpenAI launches GPT-6", "EU AI Act enters enforcement phase".',
  "  REJECT:",
  "    - Consumer gadget reviews, smartphone-AI features, smart-speaker stories, AI cameras, AI toys.",
  "    - Autonomous-vehicle news unless it represents a frontier breakthrough (general Tesla/Waymo operational news → reject).",
  "    - Marketing fluff and press-release-as-news.",
  "    - Opinion pieces, hot takes, op-eds — anything without a concrete factual update.",
  '    - Vague "AI will change everything" thought leadership; "Y industry is being disrupted by AI" think pieces.',
  "    - Niche, regional, or local news with no global industry impact.",
  "    - Startup funding stories below strategic significance (small seed rounds, undifferentiated AI wrappers).",
  "    - Gaming, entertainment, sports, automotive, crypto, or political content that merely uses 'AI' as a keyword.",
  "    - Articles where AI is one tangential paragraph in a larger non-AI story (politics, business profile, lifestyle).",
  "    - Paywalled articles where the meat of the story is not in the public preview.",
  '    - "Claude" name false positives (Claude Shannon, the French given name, products unrelated to Anthropic\'s Claude).',
  "    - Pure Ask-HN / Show-HN / poll threads from Hacker News.",
  "",
  "Cross-cutting rules (apply to every source):",
  "  1. English only. Reject non-English content.",
  "  2. Substance threshold: if title + content together cannot be summarized in a useful two-sentence summary, reject.",
  "  3. No retired-model content (Claude 2, Claude 3.0 specifics) unless explicitly historical/educational.",
  "  4. When in doubt, reject.",
  "",
  "Respond with a single JSON object and nothing else. The JSON object MUST have exactly these five fields:",
  '  - "relevant": boolean — true if useful for hub readers, false otherwise.',
  '  - "audience": one of "beginner" | "advanced" | "both".',
  '  - "topics": array of short kebab-case tags (e.g., "setup", "workflow", "mcp", "claudemd", "field-report", "model-launch", "policy"). Non-empty if relevant.',
  '  - "summary": a two-sentence plain-English summary of the item.',
  '  - "editor_confidence": one of "high" | "medium" | "low" — your certainty about the relevance verdict. RESERVE "high" for verdicts where you would stake your reputation (obvious accept or obvious reject). Use "medium" whenever you have ANY reservation — borderline tone, partial substance, weak signal, ambiguous category, or a judgment call. Use "low" only when you are essentially guessing. When in doubt about confidence, go LOWER, not higher.',
  "",
  'Always return well-formed JSON. If the item is irrelevant, still return a complete JSON object with "relevant": false; other fields may be defaults (audience "both", topics: [], summary: "Not relevant.", editor_confidence reflecting how sure you are about the rejection).',
].join("\n");

const ALLOWED_AUDIENCE = new Set<string>(["beginner", "advanced", "both"]);
const ALLOWED_CONFIDENCE = new Set<string>(["high", "medium", "low"]);

/**
 * Calls Azure OpenAI chat completions for one item. Returns:
 *  - TriageResult when the response is well-formed AND relevant === true
 *  - null when well-formed AND relevant === false (drop item, AC9)
 *
 * Throws MalformedTriageResponseError on shape mismatch (AC8 negative path).
 */
export async function triageItem(
  client: AzureOpenAI,
  deployment: string,
  item: FeedItem,
): Promise<TriageResult | null> {
  const userContent = buildUserContent(item);

  const response = await client.chat.completions.create({
    model: deployment,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: DEFAULT_TRIAGE_TEMPERATURE,
    max_tokens: DEFAULT_TRIAGE_MAX_TOKENS,
    response_format: { type: "json_object" },
  });

  const choice = response.choices?.[0];
  const rawContent = choice?.message?.content;
  if (typeof rawContent !== "string" || rawContent.length === 0) {
    throw new MalformedTriageResponseError(
      String(rawContent ?? ""),
      "empty or missing message content",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err) {
    throw new MalformedTriageResponseError(
      rawContent,
      `not valid JSON: ${String(err)}`,
    );
  }

  const validated = validate(parsed, rawContent);

  if (!validated.relevant) {
    return null;
  }

  return validated;
}

function buildUserContent(item: FeedItem): string {
  const parts: string[] = [];
  parts.push(`Feed: ${item.feedName}`);
  parts.push(`Title: ${item.title}`);
  if (item.link) parts.push(`Link: ${item.link}`);
  if (item.publishedAt) parts.push(`Published: ${item.publishedAt.toISOString()}`);
  if (item.rawContent) {
    // Truncate raw content to keep prompts cheap.
    const trimmed = item.rawContent.slice(0, 2000);
    parts.push("");
    parts.push("Content:");
    parts.push(trimmed);
  }
  return parts.join("\n");
}

function validate(parsed: unknown, raw: string): TriageResult {
  if (parsed === null || typeof parsed !== "object") {
    throw new MalformedTriageResponseError(raw, "response is not a JSON object");
  }
  const obj = parsed as Record<string, unknown>;

  const relevant = obj["relevant"];
  if (typeof relevant !== "boolean") {
    throw new MalformedTriageResponseError(raw, '"relevant" must be boolean');
  }

  const audience = obj["audience"];
  if (typeof audience !== "string" || !ALLOWED_AUDIENCE.has(audience)) {
    throw new MalformedTriageResponseError(
      raw,
      '"audience" must be one of "beginner" | "advanced" | "both"',
    );
  }

  const topics = obj["topics"];
  if (!Array.isArray(topics) || !topics.every((t) => typeof t === "string")) {
    throw new MalformedTriageResponseError(
      raw,
      '"topics" must be an array of strings',
    );
  }

  const summary = obj["summary"];
  if (typeof summary !== "string") {
    throw new MalformedTriageResponseError(raw, '"summary" must be a string');
  }

  const confidence = obj["editor_confidence"];
  if (typeof confidence !== "string" || !ALLOWED_CONFIDENCE.has(confidence)) {
    throw new MalformedTriageResponseError(
      raw,
      '"editor_confidence" must be one of "high" | "medium" | "low"',
    );
  }

  return {
    relevant,
    audience: audience as TriageResult["audience"],
    topics: topics as string[],
    summary,
    editor_confidence: confidence as TriageResult["editor_confidence"],
  };
}
