import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Learning } from "../src/types.js";

// Mock the @honcho-ai/sdk module
const mockChat = vi.fn();
const mockMessage = vi.fn();
const mockAddPeers = vi.fn();
const mockAddMessages = vi.fn();
const mockSetPeerConfiguration = vi.fn();

const mockEnginePeer = {
  id: "engine",
  chat: mockChat,
  message: mockMessage,
};

const mockDomainPeer = {
  id: "domain-peer-id",
  chat: mockChat,
  message: mockMessage,
};

const mockSession = {
  id: "session-id",
  addPeers: mockAddPeers,
  addMessages: mockAddMessages,
  setPeerConfiguration: mockSetPeerConfiguration,
};

const mockPeer = vi.fn();
const mockSessionFn = vi.fn();

vi.mock("@honcho-ai/sdk", () => {
  return {
    Honcho: vi.fn().mockImplementation(() => ({
      peer: mockPeer,
      session: mockSessionFn,
    })),
  };
});

// Import after mock
import { createMemory } from "../src/memory.js";

describe("createMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: peer("engine") returns engine peer, peer("domain") returns domain peer
    mockPeer.mockImplementation(async (id: string) => {
      if (id === "engine") return mockEnginePeer;
      return { ...mockDomainPeer, id: `peer-${id}`, chat: mockChat, message: mockMessage };
    });

    mockSessionFn.mockResolvedValue(mockSession);
    mockAddPeers.mockResolvedValue(undefined);
    mockAddMessages.mockResolvedValue([]);
    mockSetPeerConfiguration.mockResolvedValue(undefined);
    mockMessage.mockImplementation((content: string) => ({
      peerId: "engine",
      content,
    }));
  });

  describe("remember()", () => {
    it("groups learnings by domain and creates one session per domain", async () => {
      const memory = createMemory({ apiKey: "test-key" });

      const learnings: Learning[] = [
        { domain: "eventbrite.com", insight: "Uses infinite scroll" },
        { domain: "eventbrite.com", insight: "Has JSON-LD data" },
        { domain: "meetup.com", insight: "Requires auth for some pages" },
      ];

      await memory.remember(learnings);

      // Should create session for each unique domain
      expect(mockSessionFn).toHaveBeenCalledWith("domain:eventbrite.com");
      expect(mockSessionFn).toHaveBeenCalledWith("domain:meetup.com");
      expect(mockSessionFn).toHaveBeenCalledTimes(2);
    });

    it("adds engine and domain peers to each session", async () => {
      const memory = createMemory({ apiKey: "test-key" });

      await memory.remember([{ domain: "eventbrite.com", insight: "Uses infinite scroll" }]);

      // Engine peer and domain peer should be added to the session
      expect(mockAddPeers).toHaveBeenCalled();
      const peersArg = mockAddPeers.mock.calls[0]![0];
      expect(peersArg).toHaveLength(2);
    });

    it("configures engine peer with observeMe: false", async () => {
      const memory = createMemory({ apiKey: "test-key" });

      await memory.remember([{ domain: "eventbrite.com", insight: "Uses infinite scroll" }]);

      expect(mockSetPeerConfiguration).toHaveBeenCalled();
      const [peer, config] = mockSetPeerConfiguration.mock.calls[0]!;
      expect(peer).toBe(mockEnginePeer);
      expect(config).toEqual({ observeMe: false });
    });

    it("each learning insight becomes a message from the engine peer", async () => {
      const memory = createMemory({ apiKey: "test-key" });

      await memory.remember([
        { domain: "eventbrite.com", insight: "Uses infinite scroll" },
        { domain: "eventbrite.com", insight: "Has JSON-LD data" },
      ]);

      // Engine peer's message() should be called for each learning
      expect(mockMessage).toHaveBeenCalledTimes(2);
      expect(mockMessage).toHaveBeenCalledWith(expect.stringContaining("Uses infinite scroll"));
      expect(mockMessage).toHaveBeenCalledWith(expect.stringContaining("Has JSON-LD data"));
    });

    it("includes context in message content when provided", async () => {
      const memory = createMemory({ apiKey: "test-key" });

      await memory.remember([
        {
          domain: "eventbrite.com",
          insight: "Uses infinite scroll",
          context: "Experiment #42",
        },
      ]);

      const messageContent = mockMessage.mock.calls[0]![0] as string;
      expect(messageContent).toContain("Uses infinite scroll");
      expect(messageContent).toContain("Experiment #42");
    });

    it("adds messages to the domain session", async () => {
      const memory = createMemory({ apiKey: "test-key" });

      await memory.remember([{ domain: "eventbrite.com", insight: "Uses infinite scroll" }]);

      expect(mockAddMessages).toHaveBeenCalledTimes(1);
      const messages = mockAddMessages.mock.calls[0]![0];
      expect(messages).toHaveLength(1);
    });

    it("handles empty learnings array gracefully", async () => {
      const memory = createMemory({ apiKey: "test-key" });
      await memory.remember([]);

      expect(mockSessionFn).not.toHaveBeenCalled();
      expect(mockAddMessages).not.toHaveBeenCalled();
    });
  });

  describe("recall()", () => {
    it("calls peer.chat() once per pattern", async () => {
      mockChat.mockResolvedValue("Some insight about pagination");

      const memory = createMemory({ apiKey: "test-key" });
      await memory.recall("eventbrite.com", ["pagination strategy", "selector patterns"]);

      expect(mockChat).toHaveBeenCalledTimes(2);
    });

    it("returns answers keyed by pattern string", async () => {
      mockChat
        .mockResolvedValueOnce("Uses infinite scroll")
        .mockResolvedValueOnce("CSS selectors: .event-card");

      const memory = createMemory({ apiKey: "test-key" });
      const result = await memory.recall("eventbrite.com", [
        "pagination strategy",
        "selector patterns",
      ]);

      expect(result.domain).toBe("eventbrite.com");
      expect(result.answers).toBeInstanceOf(Map);
      expect(result.answers.get("pagination strategy")).toBe("Uses infinite scroll");
      expect(result.answers.get("selector patterns")).toBe("CSS selectors: .event-card");
    });

    it("queries the domain peer (not engine peer)", async () => {
      mockChat.mockResolvedValue("answer");

      const memory = createMemory({ apiKey: "test-key" });
      await memory.recall("eventbrite.com", ["some pattern"]);

      // Should create/get the domain peer
      expect(mockPeer).toHaveBeenCalledWith("eventbrite.com");
    });

    it("empty patterns array returns empty answers", async () => {
      const memory = createMemory({ apiKey: "test-key" });
      const result = await memory.recall("eventbrite.com", []);

      expect(result.domain).toBe("eventbrite.com");
      expect(result.answers.size).toBe(0);
      expect(mockChat).not.toHaveBeenCalled();
    });

    it("handles null response from peer.chat() as empty string", async () => {
      mockChat.mockResolvedValue(null);

      const memory = createMemory({ apiKey: "test-key" });
      const result = await memory.recall("eventbrite.com", ["unknown pattern"]);

      expect(result.answers.get("unknown pattern")).toBe("");
    });
  });

  describe("error handling", () => {
    it("propagates Honcho API errors from remember()", async () => {
      mockSessionFn.mockRejectedValue(new Error("Honcho API error"));

      const memory = createMemory({ apiKey: "test-key" });
      await expect(
        memory.remember([{ domain: "eventbrite.com", insight: "test" }])
      ).rejects.toThrow("Honcho API error");
    });

    it("propagates Honcho API errors from recall()", async () => {
      mockPeer.mockRejectedValue(new Error("Honcho API error"));

      const memory = createMemory({ apiKey: "test-key" });
      await expect(memory.recall("eventbrite.com", ["test"])).rejects.toThrow("Honcho API error");
    });
  });
});
