import { createMemory } from "@unlock-events/memory";
import type { Memory, Learning } from "@unlock-events/memory";

let instance: Memory | null = null;

function getInstance(): Memory {
  if (!instance) {
    instance = createMemory({
      apiKey: process.env["HONCHO_API_KEY"],
    });
  }
  return instance;
}

/** Serializable recall result (Record instead of Map for Temporal) */
interface SerializableRecallResult {
  domain: string;
  answers: Record<string, string>;
}

export async function recall(
  domain: string,
  patterns: string[]
): Promise<SerializableRecallResult> {
  const result = await getInstance().recall(domain, patterns);
  const answers: Record<string, string> = {};
  result.answers.forEach((value, key) => {
    answers[key] = value;
  });
  return {
    domain: result.domain,
    answers,
  };
}

export async function remember(learnings: Learning[]): Promise<void> {
  return getInstance().remember(learnings);
}
