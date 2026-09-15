// azure-client.ts — Construct an AzureOpenAI client from validated env.
// Production wiring of the AzureOpenAI SDK seam.
// See project-design.md §3.7.

import { AzureOpenAI } from "openai";
import type { EnvConfig } from "./types.js";
import { readEnv } from "./env.js";

/**
 * Constructs an AzureOpenAI client from a validated EnvConfig (or from
 * process.env when called without args — env.ts is invoked internally).
 *
 * MissingEnvVarError is thrown by env.ts before the AzureOpenAI constructor
 * is reached, so AC10 fails cleanly with the variable name in the message.
 *
 * Callers MUST still pass `model: <deployment>` to chat.completions.create
 * (R-6). See triage.ts.
 */
export function makeAzureClient(env?: EnvConfig): AzureOpenAI {
  const config = env ?? readEnv();
  return new AzureOpenAI({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    apiVersion: config.apiVersion,
    deployment: config.deployment,
  });
}
