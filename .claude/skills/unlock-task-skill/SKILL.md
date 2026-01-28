---
name: unlock-task
description: |
  Guided task execution for UnlockAlabama Event Scraper project. Invoke when:
  (1) Starting work on a project task: "/unlock-task" or "/unlock-task E1"
  (2) User says "let's work on the next task" or "what's next"
  (3) Resuming project work after a break

  This skill queries Monday.com for task status, does Exa research for up-to-date technical info,
  collaborates on systematic implementation, tracks artifacts, and updates Monday.com on completion.
---

# UnlockAlabama Task Execution

## Workflow Overview

```
1. TASK SELECTION    → Query Monday.com, present options, confirm choice
2. GATHER CONTEXT    → Fetch technical notes from dependency/integration tasks
3. RESEARCH          → Exa search for relevant docs/patterns
4. PLANNING          → Discuss approach, identify artifacts needed
5. EXECUTION         → Load karpathy-guidelines, implement systematically
6. VERIFY & APPROVE  → Review criteria, ASK user before marking complete
7. COMPLETION        → Update Monday.com status, link artifacts
8. TECHNICAL NOTES   → Document decisions, gotchas, context for future tasks
```

---

## Phase 1: Task Selection

### If task specified in invocation (e.g., "/unlock-task E1")

1. Query Monday.com for that task's details
2. Confirm: "Starting work on [Task Name]. Ready to proceed?"

### If no task specified

1. Query Monday.com board 18397622627 for items where Status != "Done"
2. Group by priority—critical path items first
3. Present options:

```
Ready to work. Here's what's available:

CRITICAL PATH (prioritize these):
○ E1: Discovery Engine - Week 3-4, depends on R1
○ E2: Extraction Engine - Week 3-4, depends on E1

HAS FLOAT (can wait without affecting timeline):
○ U3: Scheduler - Week 2
○ R2: Event Access - Week 2

Which one should we tackle?
```

4. Wait for user selection

### Monday.com Query

Use monday-api-mcp to fetch incomplete tasks:

```graphql
query {
  boards(ids: 18397622627) {
    items_page(limit: 50) {
      items {
        id
        name
        column_values {
          id
          text
          value
        }
      }
    }
  }
}
```

Key columns: Status (`color_mm01wx9b`), Critical Path (`color_mm018m9k`), Description (`long_text_mm01c9h6`), Acceptance Criteria (`long_text_mm01z5wk`)

---

## Phase 2: Gather Context from Dependencies

**REQUIRED before starting work.** Fetch and present technical notes from tasks this one depends on or integrates with.

### Task Dependency Map

| Task | Depends On | Integrates With |
| ---- | ---------- | --------------- |
| A1   | —          | —               |
| A2   | A1         | —               |
| A3   | A1, A2     | —               |
| U1   | A1         | —               |
| U2   | A1         | —               |
| U3   | A1         | —               |
| R1   | A2         | —               |
| R2   | A2         | —               |
| R3   | A2         | —               |
| E1   | R1, U1     | R3              |
| E2   | U2         | R3              |
| E3   | R2         | —               |
| M1   | E1, E2, E3 | R1, R2, R3, U3  |
| M2   | R2, E3     | —               |
| C1   | M1, M2     | R2              |
| C2   | C1         | —               |
| C3   | R1         | —               |
| T1   | M1, C1     | All             |
| T2   | T1         | All             |
| T3   | A3, T2     | All             |

### Fetch technical notes

For the current task, identify all tasks in "Depends On" and "Integrates With" columns, then query their Technical Notes:

```graphql
query {
  boards(ids: 18397622627) {
    items_page(limit: 50, query_params: { ids: [DEPENDENCY_IDS] }) {
      items {
        id
        name
        column_values(ids: ["long_text_mm01srya"]) {
          id
          text
          value
        }
      }
    }
  }
}
```

### Present context summary

Before proceeding to research, present the relevant context:

```
📋 Context from dependent tasks:

**A1: Project Setup** (depends on)
- Turborepo + pnpm monorepo structure
- DevContainer with Node 20, Python 3.12, Go 1.22
- Temporal Cloud for workflows, Supabase Cloud for DB
- [key decisions relevant to current task...]

**R1: Source Access** (integrates with)
- [relevant technical notes...]

This context informs our approach. Proceeding to research phase.
```

If a dependency task has no technical notes, flag it: "⚠️ [Task] has no technical notes—may need to review its implementation directly."

---

## Phase 3: Research

Before implementation, gather current technical context using Exa.

### Research targets by task

| Task  | Exa Search Topics                                            |
| ----- | ------------------------------------------------------------ |
| A1    | "turborepo monorepo 2024", "TypeScript project structure"    |
| A2    | "Prisma vs Drizzle 2024", "PostgreSQL event schema"          |
| U1    | "Node.js web scraping rate limiting", "fetch retry patterns" |
| U2    | "Claude API TypeScript SDK", "LLM abstraction layer"         |
| E1    | "web crawler pagination patterns", "sitemap parsing Node.js" |
| E2    | "LLM structured extraction HTML", "Claude JSON mode"         |
| E3    | "fuzzy string matching", "entity resolution algorithms"      |
| M1/M2 | "workflow orchestration patterns", "saga pattern TypeScript" |
| C1    | "REST API design 2024", "OpenAPI TypeScript"                 |
| C2    | "Next.js 14 app router", "React event calendar map"          |

### Present findings

After research, summarize:

- Current best practices and recommended libraries
- Gotchas to avoid
- Relevant examples or patterns

Ask: "Based on this research, I'm thinking [approach]. Does that match what you had in mind?"

---

## Phase 4: Planning

### Display task details from Monday.com

1. **Description** - What we're building
2. **Acceptance Criteria** - Definition of done (the checklist we'll work through)
3. **Design Constraints** - Rules to follow
4. **Integration Points** - What this connects to

### Discuss approach with Paul

Remember Paul's style:

- **Show reasoning** - "I'm thinking about this as [frame] because [reason]"
- **Be direct** - State what you think is the right approach
- **Be open to pushback** - He'll have context you don't

Questions to align on:

1. "Here's the approach I'm thinking. Does that fit?"
2. "Any existing code or patterns in the repo we should follow?"
3. "Which acceptance criteria should we tackle first?"

### Identify required artifacts

Check the task's artifact link columns—which need to be produced:

- Design Doc, GitHub PR, API Spec, Config Spec, How-to Doc, Test Results

State: "For this task, we need to produce: [list]"

---

## Phase 5: Execution

### CRITICAL: Load karpathy-guidelines before writing code

**Before writing any code, invoke `/karpathy-guidelines` to load coding discipline rules.**

The karpathy-guidelines skill provides guardrails against common LLM coding mistakes:

- Avoid overcomplication
- Make surgical changes
- Surface assumptions explicitly
- Define verifiable success criteria

This is mandatory for all code-writing phases.

### Update Monday.com status

```graphql
mutation {
  change_column_value(
    board_id: 18397622627
    item_id: [TASK_ID]
    column_id: "color_mm01wx9b"
    value: "{\"label\": \"Working on it\"}"
  ) {
    id
  }
}
```

### Implementation discipline

For each acceptance criterion:

1. **State the criterion** - "Working on: [criterion]"
2. **Propose approach** - Brief explanation with reasoning
3. **Write code** - Following karpathy-guidelines discipline
4. **Test** - Verify this specific criterion works
5. **Check off** - "✓ [criterion] verified by [evidence]"

### Architectural guardrails

Before each piece of code, verify:

- [ ] Is this the right layer for this logic?
- [ ] Does this create unwanted coupling?
- [ ] Would this force changes elsewhere if requirements changed?
- [ ] Am I naming this by volatility or by function?

If anything feels wrong, stop and discuss.

### When blocked

1. Update Monday.com to "Stuck"
2. Add blocker to Blockers field
3. Name it clearly: "We're blocked on [X]. Options I see: [A, B, C]. What do you think?"

### Reducing willpower drain

Paul's context-switching depletes willpower. To help:

- Stay focused on one criterion at a time
- Don't jump ahead or get distracted by tangents
- If we drift, name it: "We've drifted into [X]. Keep exploring or come back to [criterion]?"
- Keep momentum—small steps forward

---

## Phase 6: Completion

### Verify ALL acceptance criteria

Walk through the full checklist:

```
Acceptance Criteria Review:
✓ [Criterion 1] - Verified by [test/evidence]
✓ [Criterion 2] - Verified by [test/evidence]
○ [Criterion 3] - Still needs [X]
```

**Only proceed when ALL criteria are verified.** Partial completion = not done.

### Collect artifact links

For each required artifact:

- "What's the GitHub PR link?"
- "Where did the tests land?"
- etc.

### ASK BEFORE MARKING COMPLETE

**CRITICAL: Do NOT mark the task as Done in Monday.com without explicit user approval.**

Present a completion summary and ask:

```
All acceptance criteria verified. Ready to mark A1 complete?

Artifacts to link:
- GitHub Repo: [url]
- PR: [url if applicable]

Before I update Monday.com to "Done", please confirm:
1. Are all criteria actually met?
2. Anything else we should address first?
```

Wait for explicit "yes" / "go ahead" / approval before updating status.

### Update Monday.com (after approval)

1. Status to "Done":

```graphql
mutation {
  change_column_value(
    board_id: 18397622627
    item_id: [TASK_ID]
    column_id: "color_mm01wx9b"
    value: "{\"label\": \"Done\"}"
  ) {
    id
  }
}
```

2. Link each artifact:

```graphql
mutation {
  change_column_value(
    board_id: 18397622627
    item_id: [TASK_ID]
    column_id: "[LINK_COLUMN_ID]"
    value: "{\"url\": \"[URL]\", \"text\": \"[Display Text]\"}"
  ) {
    id
  }
}
```

### Post-Completion: Update Technical Notes

**REQUIRED after every task completion.** Update the Technical Notes field (`long_text_mm01srya`) with:

1. **Architecture/Design Decisions** - What choices were made and why
2. **Key Implementation Details** - Important patterns, libraries, configurations
3. **Gotchas Encountered** - Problems hit and how they were solved
4. **Dependencies Created** - What future tasks now depend on from this work

This provides context for future tasks that build on this one.

```graphql
mutation {
  change_column_value(
    board_id: 18397622627
    item_id: [TASK_ID]
    column_id: "long_text_mm01srya"
    value: "{\"text\": \"[TECHNICAL_NOTES_CONTENT]\"}"
  ) {
    id
  }
}
```

### Close out

```
✅ Task Complete: [Task Name]

Artifacts:
- PR: [link]
- Tests: [link]
- Docs: [link if applicable]

Technical notes updated in Monday.com.

Next on critical path: [suggest based on dependencies]

Ready for the next one? Run /unlock-task
```

---

## Task ID Quick Reference

| Task                          | Item ID     | Critical |
| ----------------------------- | ----------- | -------- |
| A1: Project Setup             | 11121373306 | Yes      |
| A2: Database Schema           | 11121366280 | Yes      |
| A3: Deployment Infrastructure | 11121361651 | No       |
| U1: HTTP Client               | 11121366227 | No       |
| U2: AI Gateway                | 11121366145 | No       |
| U3: Scheduler                 | 11121361283 | No       |
| R1: Source Access             | 11121386402 | Yes      |
| R2: Event Access              | 11121385501 | No       |
| R3: Raw Content Access        | 11121367189 | No       |
| E1: Discovery Engine          | 11121361741 | Yes      |
| E2: Extraction Engine         | 11121361798 | Yes      |
| E3: Dedup Engine              | 11121395468 | Yes      |
| M1: Ingestion Manager         | 11121395097 | Yes      |
| M2: Event Manager             | 11121410709 | No       |
| C1: Event API                 | 11121391565 | Yes      |
| C2: Event Dashboard           | 11121381923 | No       |
| C3: Source Admin UI           | 11121385761 | No       |
| T1: Integration Testing       | 11121397318 | Yes      |
| T2: System Testing            | 11121383890 | Yes      |
| T3: Deployment                | 11121384492 | Yes      |

---

## Column IDs

| Column              | ID                 |
| ------------------- | ------------------ |
| Status              | color_mm01wx9b     |
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

## Error Handling

**Monday.com API fails:** Retry once. If still failing, continue without updates and note what needs manual update.

**Exa returns poor results:** Try alternative terms, then ask Paul for preferred resources.

**Task dependencies not met:** Warn clearly, offer to work on dependency first or proceed with risk noted.

---

## For detailed acceptance criteria and research topics per task

See `references/task-details.md`
