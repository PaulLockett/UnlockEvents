# UnlockAlabama Event Scraper - Claude Code Context

## Working with Paul

### Communication Style

- **Be direct and efficient.** Skip preamble and get to the point.
- **Show reasoning, not just conclusions.** Externalize thinking so Paul can push back or adopt frameworks.
- **Mutual respect over status games.** Neither condescending nor falsely humble—just accurate signal.
- **Notice drift, name it.** When exploring tangents, flag it: "We've drifted into X. Continue or return to Y?"

### What Paul Values

- **Depth AND velocity.** He wants to understand WHY things work while also shipping fast.
- **Build to understand.** Creating things IS the learning, not preparation for it.
- **Reduce "what to do" ambiguity.** Clear next steps > vague directions. Help structure ambiguous tasks.
- **Concrete solutions + better ways of thinking.** Both outcomes matter.

### The Depth vs Velocity Tension

Paul operates with two drives that create productive tension:

**Depth:** He loves first-principles thinking, understanding _why_ things work, connecting ideas across domains. He wants to understand the system, not just build it.

**Velocity:** He also wants to move fast, ship work, iterate on real feedback rather than endless planning.

Neither is wrong. The best work honors both—deep enough to be sound, fast enough to get feedback. Help Paul find the right balance for each task rather than defaulting to one mode.

### Growth Edge

Paul is actively building conscientiousness—following through on commitments, especially small recurring ones. Support this with systems that reduce willpower load rather than pushing harder. When he seems stuck on a low-interest task, help break it into smaller steps rather than lecturing about mindset.

### Mindset Triggers

**Critical feedback** hits hardest. If something isn't working, frame it as "the approach" not "you."

**High-effort + low-interest tasks** create a conscientiousness trap. For boring-but-important work, help build systems that reduce willpower load rather than pushing harder.

### Task-Switching Depletes Willpower

Paul can code for hours without noticing time pass. But switching between cognitively different tasks drains willpower fast. The more ambiguity about _what to do_ (vs _how to perform_), the faster it depletes.

**What helps:**

- Clear systems and frameworks that reduce in-the-moment decision-making
- Having context on tasks before starting (not figuring it out on the fly)
- The task structure in Monday.com exists precisely for this

---

## Righting Software Principles

### Decompose by Volatility, Not Function

Components encapsulate what might change. If a component is named after a function (ReportingService), that's a smell. Ask: "What volatility does this contain?"

### Architecture IS the Project

One activity per component. Dependencies between activities = dependencies between components.

### PERT Estimation

```
Expected = (Optimistic + 4×MostLikely + Pessimistic) / 6
```

Use 5-day quantum. Map to Fibonacci: 2, 3, 5, 8, 13.

### Risk Target: 0.50

Target project risk ≤ 0.50. Risk > 0.75 = unacceptable. Mitigate with decompressed schedule or phased approach.

---

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy (Keep Main Context Clean)

- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution
- Critical path items can be parallelized by spawning subagents for non-critical dependencies

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -> then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

---

## Core Principles

### Simplicity First

- Make every change as simple as possible
- Impact minimal code
- No features beyond what was asked
- No abstractions for single-use code
- If you write 200 lines and it could be 50, rewrite it

### No Laziness

- Find root causes
- No temporary fixes
- Senior developer standards

### Minimal Impact

- Changes should only touch what's necessary
- Avoid introducing bugs

### Karpathy Guidelines

**Think Before Coding:**

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them—don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

**Surgical Changes:**

- Don't "improve" adjacent code, comments, or formatting
- Don't refactor things that aren't broken
- Match existing style, even if you'd do it differently
- If you notice unrelated dead code, mention it—don't delete it
- Remove imports/variables/functions that YOUR changes made unused
- Don't remove pre-existing dead code unless asked

**Goal-Driven Execution:**

- Transform tasks into verifiable goals
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

---

## When You're Unsure

1. **Architecture question?** Check if component encapsulates a volatility. If named after function, reconsider.
2. **Where does this code go?** Use the WHO/WHAT/HOW/WHERE questions from layered architecture.
3. **How to test this AI feature?** Define success criteria first (AI Engineering principle).
4. **Dependencies unclear?** Check the dependency table below or Monday.com board.

---

## Anti-Patterns to Catch Yourself On

These are the traps. When you notice them, stop and reconsider:

1. **Functional decomposition** - Naming things by what they do (ReportingService). Ask "what might change?" instead.

2. **Client orchestration** - Client code calling multiple services and stitching results. Clients should call ONE Manager.

3. **Service chaining** - A→B→C creates tight coupling. Use Manager orchestration instead.

4. **The "Reporting Component" trap** - Reports are CLIENTS that read data and render it. There is no "Reporting" component.

5. **Open architecture** - "Any component can call any" feels flexible but creates spaghetti. Enforce layer boundaries.

6. **Speculative over-engineering** - "What if someday we need [unlikely scenario]?" If rare AND can only be encapsulated poorly, don't encapsulate.

7. **CRUD in ResourceAccess** - Read/Write/Update/Get/Set are data operations. Use business verbs instead.

8. **Assuming instead of asking** - Don't silently pick an interpretation. If ambiguous, surface the options.

9. **E1 self-triggering** - E1 only runs when M1 calls it. If you're making E1 decide when to run, stop.

---

## AI Engineering Principles

### Evaluation First

Before building any AI feature, define: "How will we know if this works?"

- What minimum accuracy makes this useful?
- What's the failure mode when AI is wrong?

### Adaptation Hierarchy

When AI performance is insufficient:

```
PROMPTING (always first)
    ↓ exhausted?
RAG (for information gaps)
    ↓ exhausted?
FINETUNING (for behavioral changes)
    ↓ still insufficient?
RECONSIDER USE CASE
```

### Progressive Architecture

Add complexity only when benefit clearly exceeds new failure modes:

```
Level 0: Query → Model → Response (start here)
Level 1: Add Retrieval (when model knowledge insufficient)
Level 2: Add Guardrails (when harmful outputs observed)
Level 3: Add Routing (when different queries need different handling)
Level 4: Add Caching (after stabilization)
Level 5: Add Agency (when multi-step reasoning required)
```

### Quality-Latency-Cost Triangle

Every optimization involves tradeoffs. Identify which is the constraint, then optimize accordingly.

### Three Gulfs Diagnostic

When AI "isn't working," diagnose via Three Gulfs:

| Gulf               | Diagnostic Question                                                            | If Yes → Action                                       |
| ------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| **Comprehension**  | Do we understand what the data looks like and how the system actually behaves? | Analyze more traces, sample diverse inputs            |
| **Specification**  | Does the prompt/pipeline make requirements explicit?                           | Tighten prompt, add constraints, specify edge cases   |
| **Generalization** | Is the LLM inconsistent despite clear specification?                           | Measure failure rate, consider stronger interventions |

---

## What We're Building

A production system that displays all professional/business events in Alabama by:

1. Using an LLM-powered Discovery Engine (E1) to figure out HOW to crawl each site
2. Converging from exploration → refinement → optimization → production
3. Browser automation via Browserbase for complex sites (R4: Page Fetcher)
4. AI-powered extraction of structured event data (E2)
5. Deduplicating events across sources (E3)
6. Exposing events via API and Dashboard

**Key Insight:** E1 synthesizes "interaction programs" that M1 interprets. Over time, programs converge from LLM-heavy exploration to pure code execution.

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

### Layered Structure (17 Building Blocks)

```
CLIENTS (WHO uses it)
├── C1: Event API - REST endpoints for external consumers
├── C2: Event Dashboard - User-facing event browser
└── C3: Source Admin UI - Operator interface for managing sources

MANAGERS (WHAT workflows/sequences)
├── M1: Ingestion Manager - Workflow Manager for crawl orchestration
└── M2: Event Manager - Event lifecycle operations

ENGINES (HOW business logic works)
├── E1: Discovery Engine - LLM program synthesis, convergence funnel
├── E2: Extraction Engine - AI-powered event parsing
└── E3: Dedup Engine - Event matching and merging

RESOURCE ACCESS (WHERE data lives)
├── R1: Source Access - Source entity operations
├── R2: Event Access - Event entity operations
├── R3: Raw Content Access - Stores fetched HTML
├── R4: Page Fetcher - Browser automation via Browserbase
└── R5: Experiment Store - Shared M1/E1 state (business verbs, NOT CRUD)

UTILITIES (cross-cutting)
├── U2: AI Gateway - LLM abstraction (Claude API)
├── U3: Scheduler - Per-source crawl cadence
├── U4: Memory - Cross-session learning (Honcho SDK)
└── U5: Web Search - Source discovery

ARCHITECTURE (foundation)
├── A1: Project Setup - Repo, CI/CD, dev environment
├── A2: Database Schema - Tables and migrations
└── A3: Deployment Infrastructure - Cloud, secrets, monitoring
```

### M1/E1 Relationship (Critical)

**M1 is a Workflow Manager** - loads state, executes workflow, persists state back.

**E1 only runs when M1 calls it** - Engines don't self-trigger. M1 orchestrates.

**R5 enables collaboration** - M1 and E1 share state via keys passed through interface:

- M1: SubmitForAnalysis → E1: PrepareAnalysisContext → ProvideVerdict → M1: AcceptVerdict

**Convergence Funnel:**

1. **Exploration** - E1 generates many hypotheses, high LLM usage
2. **Refinement** - E1 improves working program, replaces custom→code conditions
3. **Optimization** - E1 at checkpoints only, tuning selectors/timing
4. **Production** - No E1, pure program execution, zero LLM per crawl

### R5 Business Verbs (NOT CRUD)

ResourceAccess must expose atomic business verbs, not CRUD operations:

| Verb                       | Caller | Purpose                                     |
| -------------------------- | ------ | ------------------------------------------- |
| **BeginExperiment**        | M1     | Initialize experiment for a source          |
| **SubmitForAnalysis**      | M1     | Submit observations and request E1 analysis |
| **PrepareAnalysisContext** | E1     | Gather context needed for analysis          |
| **ProvideVerdict**         | E1     | Submit E1's analysis conclusion             |
| **AcceptVerdict**          | M1     | Accept verdict and retrieve decision        |
| **RecordOutcome**          | M1     | Log execution results                       |
| **AdvancePhase**           | M1     | Transition to next convergence phase        |
| **CompleteExperiment**     | M1     | Finalize and extract converged program      |
| **ConsumeBudget**          | M1     | Deduct from experiment budget               |

### R4 Business Verbs (Page Fetcher)

| Verb                  | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| **OpenCrawlContext**  | Start browser session via Browserbase                     |
| **NavigateTo**        | Go to URL, return PageSnapshot                            |
| **Interact**          | Perform action (click, fill, scroll), return PageSnapshot |
| **CloseCrawlContext** | End browser session                                       |

### Component Type Context

| Layer           | Role                 | What It Should Do                      | What It Should NOT Do           |
| --------------- | -------------------- | -------------------------------------- | ------------------------------- |
| Client          | Present interface    | Accept requests, return responses      | Contain business logic          |
| Manager         | Orchestrate workflow | Coordinate components, handle sequence | Implement algorithms            |
| Engine          | Execute logic        | Implement business rules               | Store data, orchestrate others  |
| Resource Access | Abstract storage     | Business verb operations               | CRUD operations, business logic |
| Utility         | Cross-cutting        | One capability, used anywhere          | Orchestrate workflows           |

**The hallmark of a bad design is when any change affects the client.** If you find yourself modifying Client code because business logic changed, something is in the wrong layer.

### Key Constraints

- **17 building blocks** - Well-factored (~10 recommended, up to ~20 acceptable)
- **2 Managers only** - 8+ Managers = design failure
- **Closed architecture** - Calls flow DOWN: Clients → Managers → Engines → Resources
- **Managers don't call Managers synchronously** - Creates hidden coupling
- **ResourceAccess exposes business verbs, NOT CRUD** - If you see Read/Write/Update, wrong abstraction

---

## Critical Path (What Determines Timeline)

```
A1(3d) → A2(3d) → R5(5d) → E1(10d) → M1(8d) → T1(8d) → T2(5d) → T3(3d) = 45 days
```

**Critical Path Items:** A1, A2, R5, E1, M1, T1, T2, T3

**Items with Float (can slip):** U2, U3, U4, U5, R1, R2, R3, R4, E2, E3, M2, C1, C2, C3, A3

**Implication:** Always prioritize critical path tasks. If blocked on critical path, that's THE problem to solve. Working on non-critical tasks while critical ones wait = wasted time.

---

## Development Workflow

1. **Pick an issue** from Monday.com (start with critical path, respect dependencies)
2. **Read the issue description** - contains acceptance criteria, technical context, dependencies
3. **Update status** - Set to "Working on it"
4. **Plan** - Enter plan mode for non-trivial tasks
5. **Implement** following the architecture (respect layer boundaries)
6. **Test** at component boundary
7. **Verify** - Run tests, check logs, demonstrate correctness
8. **Mark complete** when acceptance criteria met
9. **Update Monday.com** - Set to "Done"

---

## Monday.com Integration

**Board:** Dev Project - Event Scraper (ID: 18397622627)
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

| Task                          | Item ID     | Layer           | Critical Path | Dependencies      |
| ----------------------------- | ----------- | --------------- | ------------- | ----------------- |
| A1: Project Setup             | 11121373306 | Architecture    | Yes           | None              |
| A2: Database Schema           | 11121366280 | Architecture    | Yes           | A1                |
| A3: Deployment Infrastructure | 11121361651 | Architecture    | No            | A1                |
| U2: AI Gateway                | 11121366145 | Utility         | No            | A1                |
| U3: Scheduler                 | 11121361283 | Utility         | No            | A1, R1            |
| U4: Memory (Honcho)           | 11145816747 | Utility         | No            | A1                |
| U5: Web Search                | 11145810010 | Utility         | No            | A1                |
| R1: Source Access             | 11121386402 | Resource Access | No            | A2                |
| R2: Event Access              | 11121385501 | Resource Access | No            | A2                |
| R3: Raw Content Access        | 11121367189 | Resource Access | No            | A2                |
| R4: Page Fetcher              | 11121366227 | Resource Access | No            | A1                |
| R5: Experiment Store          | 11145816635 | Resource Access | Yes           | A2                |
| E1: Discovery Engine          | 11121361741 | Engine          | Yes           | U2, U4, U5, R5    |
| E2: Extraction Engine         | 11121361798 | Engine          | No            | U2, R3            |
| E3: Dedup Engine              | 11121395468 | Engine          | No            | R2, U2            |
| M1: Ingestion Manager         | 11121395097 | Manager         | Yes           | E1, E2, E3, R1-R5 |
| M2: Event Manager             | 11121410709 | Manager         | No            | E3, R2            |
| C1: Event API                 | 11121391565 | Client          | No            | M2, R2            |
| C2: Event Dashboard           | 11121381923 | Client          | No            | C1                |
| C3: Source Admin UI           | 11121385761 | Client          | No            | R1, U3            |
| T1: Integration Testing       | 11121397318 | Testing         | Yes           | All components    |
| T2: System Testing            | 11121383890 | Testing         | Yes           | T1, A3            |
| T3: Deployment                | 11121384492 | Testing         | Yes           | T2                |

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

| Week | Focus              | Tasks                     | Notes                       |
| ---- | ------------------ | ------------------------- | --------------------------- |
| 1    | Foundation         | A1, A2                    | Done                        |
| 2    | Utilities + Data   | U2, U4, U5, R1-R5         | R5 on critical path         |
| 3-4  | Engines            | E1 (critical), E2, E3     | E1 is largest critical task |
| 5-6  | Managers + Clients | M1 (critical), M2, C1, C3 | M1 blocks testing           |
| 7    | Dashboard          | C2, A3                    | Parallel work               |
| 8-9  | Testing & Launch   | T1, T2, T3                | All critical path           |

**MVP at Week 6:** API access to events working end-to-end via converged crawl programs.

**Project Completion:** March 26, 2026

---

## Honcho MCP Integration

Honcho provides AI-native memory—custom reasoning models that learn continually about users.

### What is Honcho?

Honcho is an infrastructure layer for building AI agents with memory and social cognition. It enables personalized AI interactions by building coherent models of user psychology over time. The Honcho MCP server simplifies the integration to just 3 essential functions.

### Step 1: Start New Conversation (First Message Only)

When a user begins a new conversation, always call `start_conversation`:

```text
start_conversation
```

**Returns**: A session ID that you must store and use for all subsequent interactions in this conversation.

### Step 2: Get Personalized Insights (When Helpful)

Before responding to any user message, you can query for personalization insights:

```text
get_personalization_insights
session_id: [SESSION_ID_FROM_STEP_1]
query: [YOUR_QUESTION]
```

This query takes a bit of time, so it's best to only perform it when you need personalized insights. If the query can be responded to effectively using what you already know about the user, just go ahead and answer it.

**Example Queries**:

- "What does this message reveal about the user's communication preferences?"
- "How formal or casual should I be with the user based on our history?"
- "What is the user really asking for beyond their explicit question?"
- "What emotional state might the user be in right now?"

### Step 3: Respond to User

Craft your response using any insights gained from Step 2.

### Step 4: Store the Conversation Turn (After Each Exchange)

**CRITICAL**: Always store both the user's message AND your response using `add_turn`:

```text
add_turn
session_id: [SESSION_ID_FROM_STEP_1]
messages: [
  {
    "role": "user",
    "content": "[USER'S_EXACT_MESSAGE]"
  },
  {
    "role": "assistant",
    "content": "[YOUR_EXACT_RESPONSE]"
  }
]
```

### Key Principles

1. **Always start with `start_conversation` for new conversations**
2. **Store every message exchange with `add_turn`**
3. **Use `get_personalization_insights` strategically for better responses**
4. **Never expose technical details to the user**
5. **The system maintains context automatically between sessions**

---

## Working Agreements

1. **Plan mode for non-trivial tasks** - Enter plan mode for 3+ step tasks
2. **One task at a time** - Complete before moving to next (reduces context-switching drain)
3. **Acceptance criteria are truth** - Task done when all criteria pass
4. **Update Monday.com** - Status reflects reality
5. **Critical path first** - When choosing what to work on
6. **Artifacts prove completion** - PR, tests, docs as specified
7. **Layer boundaries matter** - Don't put logic in wrong layer
8. **Show reasoning** - When proposing an approach, explain why
9. **Name drift** - If we're off-topic, note it and decide together whether to continue
10. **Capture lessons** - After corrections, update `tasks/lessons.md`
11. **Verify before done** - Run tests, check logs, demonstrate correctness
12. **Surgical changes only** - Touch only what the task requires
