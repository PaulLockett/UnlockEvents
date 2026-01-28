# UnlockAlabama Event Scraper - Project Context

## Working with Paul

### The Depth vs Velocity Tension

Paul operates with two drives that create productive tension:

**Depth:** He loves first-principles thinking, understanding _why_ things work, connecting ideas across domains. He wants to understand the system, not just build it.

**Velocity:** He also wants to move fast, ship work, iterate on real feedback rather than endless planning.

Neither is wrong. The best work honors both—deep enough to be sound, fast enough to get feedback. Help Paul find the right balance for each task rather than defaulting to one mode.

### Conscientiousness Growth Edge

Paul is actively developing consistency and follow-through, especially on recurring tasks. The Righting Software methodology directly supports this:

- **Clear architecture → clear tasks → less "what to do" drain**
- **PERT + critical path replaces vague guessing**
- **Network diagrams make dependencies visible, nothing gets forgotten**

When Paul seems to be avoiding a task or drifting, don't lecture. Instead: "What's one small step that would move this forward?"

### Mindset Triggers

**Critical feedback** hits hardest. If something isn't working, frame it as "the approach" not "you."

**High-effort + low-interest tasks** create a conscientiousness trap. For boring-but-important work, help build systems that reduce willpower load rather than pushing harder.

### Task-Switching Depletes Willpower

Paul can code for hours without noticing time pass. But switching between cognitively different tasks drains willpower fast. The more ambiguity about _what to do_ (vs _how to perform_), the faster it depletes.

**What helps:**

- Clear systems and frameworks that reduce in-the-moment decision-making
- Having context on tasks before starting (not figuring it out on the fly)
- The task structure in Monday.com exists precisely for this

### How Paul Learns Best

Paul learns by **building**—the act of creation IS the learning. He learns by seeing **how others frame problems**—not just conclusions but reasoning process.

**When helping Paul think through something:**

- Externalize reasoning (show _how_ you're thinking about the problem)
- Explain _why_ a suggestion makes sense, not just _what_ to do
- Be open to pushback and adjusting based on his context
- Share frameworks he can adopt and use independently

### Communication Style

**Be direct, with mutual respect.** Paul wants blunt, efficient communication. But directness only works paired with mutual respect—acknowledge his context, don't play status games.

**No status games means:** Neither overplay expertise (condescension, dismissing his reasoning) nor underplay it (false humility, hedging when you actually know). When you have genuine insight or see a flaw, say so directly. When uncertain or Paul has context you lack, acknowledge that too. Accurate signal, not posturing.

**Show reasoning, not just conclusions.** Don't just say "do X." Say "I'm thinking about this as [frame]. Given that, X seems right because [reason]. Does that match how you're seeing it?"

**Notice drift, name it, let Paul decide.** Paul loves exploring tangents. Sometimes valuable, sometimes not. Notice when conversation drifts from the task and name it: "We've drifted into [tangent]. Want to keep exploring, or come back to [task]?"

---

## What We're Building

A production system that displays all professional/business events in Alabama by:

1. Scraping websites (old, new, poorly-made) up to depth 3 + pagination
2. Scraping social profiles (LinkedIn posts, etc.)
3. Using AI to extract structured event data from unstructured content
4. Deduplicating events across sources
5. Exposing events via API and Dashboard

**Output:** Events discoverable via REST API and web dashboard.

---

## Architecture (Righting Software Methodology)

This architecture was designed using **volatility-based decomposition**, NOT functional decomposition. Each component encapsulates an area of likely change—this is the core insight that makes the design resilient.

### Why This Matters

When you're implementing, constantly ask:

- "What might change here?" not "What does this do?"
- "Would this force changes elsewhere if requirements shift?"
- "Is this the right layer for this logic?"

If you catch yourself naming something by its function (ReportingService, BillingService), stop. That's functional decomposition. Name it by what volatility it encapsulates.

### Layered Structure

```
CLIENTS (WHO uses it)
├── C1: Event API - REST endpoints for external consumers
├── C2: Event Dashboard - User-facing event browser
└── C3: Source Admin UI - Operator interface for managing sources

MANAGERS (WHAT workflows/sequences)
├── M1: Ingestion Manager - Orchestrates crawl workflow
└── M2: Event Manager - Event lifecycle operations

ENGINES (HOW business logic works)
├── E1: Discovery Engine - URL finding, pagination, depth
├── E2: Extraction Engine - AI-powered event parsing
└── E3: Dedup Engine - Event matching and merging

RESOURCE ACCESS (WHERE data lives)
├── R1: Source Access - CRUD for crawl sources
├── R2: Event Access - CRUD for events
└── R3: Raw Content Access - Stores fetched HTML

UTILITIES (cross-cutting)
├── U1: HTTP Client - Retry, rate limiting, proxy rotation
├── U2: AI Gateway - LLM abstraction (Claude API)
└── U3: Scheduler - Per-source crawl cadence

ARCHITECTURE (foundation)
├── A1: Project Setup - Repo, CI/CD, dev environment
├── A2: Database Schema - Tables and migrations
└── A3: Deployment Infrastructure - Cloud, secrets, monitoring
```

### Component Type Context

| Layer           | Role                 | What It Should Do                      | What It Should NOT Do          |
| --------------- | -------------------- | -------------------------------------- | ------------------------------ |
| Client          | Present interface    | Accept requests, return responses      | Contain business logic         |
| Manager         | Orchestrate workflow | Coordinate components, handle sequence | Implement algorithms           |
| Engine          | Execute logic        | Implement business rules               | Store data, orchestrate others |
| Resource Access | Abstract storage     | CRUD operations, queries               | Business logic                 |
| Utility         | Cross-cutting        | One capability, used anywhere          | Orchestrate workflows          |

**The hallmark of a bad design is when any change affects the client.** If you find yourself modifying Client code because business logic changed, something is in the wrong layer.

### Key Constraints

- **~14 building blocks** - Right in the "well-factored" range (~10)
- **2 Managers only** - 8+ Managers = design failure
- **Closed architecture** - Calls flow DOWN: Clients → Managers → Engines → Resources
- **Managers don't call Managers synchronously** - Creates hidden coupling

---

## Anti-Patterns to Catch Yourself On

These are the traps. When you notice them, stop and reconsider:

1. **Functional decomposition** - Naming things by what they do (ReportingService). Ask "what might change?" instead.

2. **Client orchestration** - Client code calling multiple services and stitching results. Clients should call ONE Manager.

3. **Service chaining** - A→B→C creates tight coupling. Use Manager orchestration instead.

4. **The "Reporting Component" trap** - Reports are CLIENTS that read data and render it. There is no "Reporting" component.

5. **Open architecture** - "Any component can call any" feels flexible but creates spaghetti. Enforce layer boundaries.

6. **Speculative over-engineering** - "What if someday we need [unlikely scenario]?" If rare AND can only be encapsulated poorly, don't encapsulate. No SCUBA-ready high heels.

---

## Critical Path (What Determines Timeline)

The critical path runs through: **A1 → A2 → R1 → E1 → E2 → E3 → M1 → C1 → T1 → T2 → T3**

Tasks with float (can slip without affecting deadline): U1, U2, U3, R2, R3, M2, C2, C3, A3

**Implication:** Always prioritize critical path tasks. If blocked on critical path, that's THE problem to solve. Working on non-critical tasks while critical ones wait = wasted time.

---

## Monday.com Integration

**Board:** Dev Project v2 (ID: 18397622627)
**Workspace:** UnlockAlabama (Admin)

### Task Statuses

**Layer column:** Architecture, Utility, Resource Access, Engine, Manager, Client, Testing

**Critical Path column:** Yes, No

**Status column:** Working on it, Done, Stuck

### Updating Status

```graphql
# Starting work
mutation {
  change_column_value(
    board_id: 18397622627
    item_id: ITEM_ID
    column_id: "color_mm01wx9b"
    value: "{\"label\": \"Working on it\"}"
  ) {
    id
  }
}

# Completed
mutation {
  change_column_value(
    board_id: 18397622627
    item_id: ITEM_ID
    column_id: "color_mm01wx9b"
    value: "{\"label\": \"Done\"}"
  ) {
    id
  }
}

# Blocked
mutation {
  change_column_value(
    board_id: 18397622627
    item_id: ITEM_ID
    column_id: "color_mm01wx9b"
    value: "{\"label\": \"Stuck\"}"
  ) {
    id
  }
}
```

---

## Task ID Reference

| Task                          | Item ID     | Layer           | Critical Path |
| ----------------------------- | ----------- | --------------- | ------------- |
| A1: Project Setup             | 11121373306 | Architecture    | Yes           |
| A2: Database Schema           | 11121366280 | Architecture    | Yes           |
| A3: Deployment Infrastructure | 11121361651 | Architecture    | No            |
| U1: HTTP Client               | 11121366227 | Utility         | No            |
| U2: AI Gateway                | 11121366145 | Utility         | No            |
| U3: Scheduler                 | 11121361283 | Utility         | No            |
| R1: Source Access             | 11121386402 | Resource Access | Yes           |
| R2: Event Access              | 11121385501 | Resource Access | No            |
| R3: Raw Content Access        | 11121367189 | Resource Access | No            |
| E1: Discovery Engine          | 11121361741 | Engine          | Yes           |
| E2: Extraction Engine         | 11121361798 | Engine          | Yes           |
| E3: Dedup Engine              | 11121395468 | Engine          | Yes           |
| M1: Ingestion Manager         | 11121395097 | Manager         | Yes           |
| M2: Event Manager             | 11121410709 | Manager         | No            |
| C1: Event API                 | 11121391565 | Client          | Yes           |
| C2: Event Dashboard           | 11121381923 | Client          | No            |
| C3: Source Admin UI           | 11121385761 | Client          | No            |
| T1: Integration Testing       | 11121397318 | Testing         | Yes           |
| T2: System Testing            | 11121383890 | Testing         | Yes           |
| T3: Deployment                | 11121384492 | Testing         | Yes           |

---

## Column ID Reference

| Column              | ID                 |
| ------------------- | ------------------ |
| Status              | color_mm01wx9b     |
| Layer               | color_mm01kmh1     |
| Critical Path       | color_mm018m9k     |
| Description         | long_text_mm01c9h6 |
| Acceptance Criteria | long_text_mm01z5wk |
| Design Constraints  | long_text_mm014qyc |
| Integration Points  | long_text_mm01mgg7 |
| Technical Notes     | long_text_mm01srya |
| Blockers            | long_text_mm01nwzy |
| Design Doc          | link_mm01kde0      |
| GitHub PR           | link_mm01vr2d      |
| API Spec            | link_mm01pqqe      |
| Config Spec         | link_mm0188tt      |
| How-to Doc          | link_mm01hcyg      |
| Test Results        | link_mm01a1dt      |

---

## Week-by-Week Plan

| Week | Focus            | Tasks              |
| ---- | ---------------- | ------------------ |
| 1    | Foundation       | A1, A2, U1, U2     |
| 2    | Data Layer       | R1, R2, R3, U3     |
| 3-4  | Engines          | E1, E2             |
| 5    | MVP Integration  | E3, M1, M2, C1, C3 |
| 6-7  | Dashboard        | A3, C2             |
| 8-9  | Testing & Launch | T1, T2, T3         |

**MVP at Week 5:** API access to events working end-to-end.

---

## Working Agreements

1. **One task at a time** - Complete before moving to next (reduces context-switching drain)
2. **Acceptance criteria are truth** - Task done when all criteria pass
3. **Update Monday.com** - Status reflects reality
4. **Critical path first** - When choosing what to work on
5. **Artifacts prove completion** - PR, tests, docs as specified
6. **Layer boundaries matter** - Don't put logic in wrong layer
7. **Show reasoning** - When proposing an approach, explain why
8. **Name drift** - If we're off-topic, note it and decide together whether to continue
