import { Honcho } from "@honcho-ai/sdk";
import type { Memory, MemoryConfig, Learning, RecallResult } from "./types.js";

/**
 * Creates a Memory instance that abstracts Honcho's peer/session model
 * into simple remember() and recall() operations keyed by domain.
 *
 * Internally:
 * - One "engine" peer (E1) with observeMe: false — the AI doing the learning
 * - One peer per domain — Honcho builds representations of these
 * - One session per domain — auto-created, keyed by "domain:{domain}"
 * - remember() adds messages to the domain's session from the engine peer
 * - recall() calls peer.chat() on the domain peer to query synthesized knowledge
 */
export function createMemory(config?: MemoryConfig): Memory {
  const honcho = new Honcho({
    workspaceId: config?.workspace ?? "unlock-events",
    apiKey: config?.apiKey ?? process.env["HONCHO_API_KEY"],
    environment: config?.environment ?? "production",
  });

  return {
    async recall(domain: string, patterns: string[]): Promise<RecallResult> {
      const answers = new Map<string, string>();

      if (patterns.length === 0) {
        return { domain, answers };
      }

      const domainPeer = await honcho.peer(domain);

      for (const pattern of patterns) {
        const response = await domainPeer.chat(pattern);
        answers.set(pattern, response ?? "");
      }

      return { domain, answers };
    },

    async remember(learnings: Learning[]): Promise<void> {
      if (learnings.length === 0) {
        return;
      }

      // Group learnings by domain
      const byDomain = new Map<string, Learning[]>();
      for (const learning of learnings) {
        const existing = byDomain.get(learning.domain);
        if (existing) {
          existing.push(learning);
        } else {
          byDomain.set(learning.domain, [learning]);
        }
      }

      const enginePeer = await honcho.peer("engine");

      for (const [domain, domainLearnings] of byDomain) {
        const domainPeer = await honcho.peer(domain);
        const session = await honcho.session(`domain:${domain}`);

        // Add both peers to the session
        await session.addPeers([enginePeer, domainPeer]);

        // Engine peer should not be observed — it's the AI, not the subject
        await session.setPeerConfiguration(enginePeer, {
          observeMe: false,
        });

        // Create messages from engine peer about this domain
        const messages = domainLearnings.map((learning) => {
          const content = learning.context
            ? `${learning.insight} (Context: ${learning.context})`
            : learning.insight;
          return enginePeer.message(content);
        });

        await session.addMessages(messages);
      }
    },
  };
}
