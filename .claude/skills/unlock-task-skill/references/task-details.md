# Task Details Reference

## A1: Project Setup

**Description:** Set up foundational project structure, repository, development environment, and CI pipeline.

**Acceptance Criteria:**

- [ ] Repository created with README, LICENSE, .gitignore
- [ ] Branching strategy documented and branch protections enabled
- [ ] Docker Compose runs local dev environment with one command
- [ ] CI pipeline runs on every PR (lint, format, type check)
- [ ] Pre-commit hooks prevent badly formatted code
- [ ] Contributing guide documents development workflow
- [ ] Project structure documented in README

**Design Constraints:**

- Monorepo structure (recommend turborepo)
- TypeScript throughout
- pnpm for package management
- GitHub Actions for CI

**Exa Research Topics:**

- "turborepo monorepo setup 2024"
- "TypeScript strict config best practices"
- "GitHub Actions CI TypeScript"
- "Docker Compose development environment"

---

## A2: Database Schema + Migrations

**Description:** Design and implement database schema for events, sources, and raw content.

**Acceptance Criteria:**

- [ ] Schema supports: events, sources, raw_content, plus audit fields
- [ ] Migration framework configured and documented
- [ ] Initial migration creates all tables
- [ ] Rollback tested and working
- [ ] Connection pooling configured for production load
- [ ] Seed script creates test data for development
- [ ] ER diagram or schema documentation exists
- [ ] Indexes defined for common query patterns

**Design Constraints:**

- PostgreSQL (use Railway's managed Postgres or similar)
- Prisma or Drizzle ORM
- All timestamps in UTC

**Exa Research Topics:**

- "Prisma vs Drizzle ORM 2024 comparison"
- "PostgreSQL event sourcing schema"
- "database migration best practices"
- "PostgreSQL full text search events"

**Schema Outline:**

```
sources: id, url, name, config_json, last_crawl, status, created_at, updated_at
events: id, title, description, start_time, end_time, location, url, source_id, confidence, created_at, updated_at
raw_content: id, url, source_id, content_hash, html, fetched_at
```

---

## U1: HTTP Client

**Description:** Robust HTTP client wrapper for web scraping with retries, rate limiting, and proxy support.

**Acceptance Criteria:**

- [ ] Fetch URL with configurable timeout (default 30s)
- [ ] Retry failed requests up to 3 times with exponential backoff
- [ ] Rate limit per domain (configurable)
- [ ] Support HTTP proxy configuration
- [ ] Rotate User-Agent from configurable list
- [ ] Return structured response (status, headers, body, timing)
- [ ] Unit tests with mocked HTTP

**Design Constraints:**

- Utility layer - no business logic
- Stateless between requests
- Must handle connection resets gracefully

**Exa Research Topics:**

- "Node.js fetch retry exponential backoff"
- "web scraping rate limiting implementation"
- "rotating user agents scraping"
- "undici vs axios 2024"

---

## U2: AI Gateway

**Description:** Abstract LLM access for different providers with retry logic and usage tracking.

**Acceptance Criteria:**

- [ ] Call LLM with prompt, return structured response
- [ ] Support Claude API with API key configuration
- [ ] Retry on rate limits with backoff
- [ ] Track token usage per request
- [ ] Support different models (haiku for speed, sonnet for quality)
- [ ] Prompt template system
- [ ] Unit tests with mocked LLM responses

**Design Constraints:**

- Provider-agnostic interface
- Environment-based API key configuration
- Log token usage for cost tracking

**Exa Research Topics:**

- "Anthropic Claude API TypeScript SDK"
- "LLM abstraction layer pattern"
- "prompt template management"
- "Claude structured output JSON"

---

## U3: Scheduler

**Description:** Manage scheduled crawl jobs with per-source cadence.

**Acceptance Criteria:**

- [ ] Schedule recurring crawls per source
- [ ] Support different cadences (hourly, daily, weekly)
- [ ] Trigger Ingestion Manager when job fires
- [ ] Track job runs
- [ ] Manual trigger via API
- [ ] Unit tests

**Design Constraints:**

- Use cron-like scheduling
- Persist schedule in database
- Handle missed jobs gracefully

**Exa Research Topics:**

- "Node.js cron job scheduling"
- "node-cron vs bull queue"
- "distributed job scheduling patterns"

---

## R1: Source Access

**Description:** Data access layer for Source entities (websites/profiles to scrape).

**Acceptance Criteria:**

- [ ] Create source with all required fields
- [ ] Read source by ID, URL domain, status
- [ ] Update source configuration
- [ ] Soft delete source
- [ ] List sources with pagination
- [ ] Track crawl metrics
- [ ] Unit tests for all operations

**Design Constraints:**

- Resource Access layer - no business logic
- Use Prisma/Drizzle client
- Consistent error handling

**Exa Research Topics:**

- "Prisma CRUD patterns TypeScript"
- "repository pattern TypeScript"
- "pagination cursor vs offset"

---

## R2: Event Access

**Description:** Data access for Event entities.

**Acceptance Criteria:**

- [ ] CRUD for events
- [ ] Query by date, location, source
- [ ] Find potential duplicates (for dedup)
- [ ] Unit tests

**Design Constraints:**

- Support flexible querying
- Full-text search on title/description
- Geographic queries if location data available

**Exa Research Topics:**

- "PostgreSQL full text search TypeScript"
- "event data model best practices"
- "Prisma filtering patterns"

---

## R3: Raw Content Access

**Description:** Data access for raw crawled content.

**Acceptance Criteria:**

- [ ] Store content with url, source_id, fetch_timestamp, content_hash
- [ ] Retrieve by URL + timestamp or hash
- [ ] Deduplicate identical content
- [ ] Handle large content efficiently
- [ ] Unit tests

**Design Constraints:**

- Content-addressable storage pattern
- Consider blob storage for very large content
- TTL for old content

**Exa Research Topics:**

- "content addressable storage pattern"
- "PostgreSQL large text fields vs blob"
- "content hashing SHA256"

---

## E1: Discovery Engine

**Description:** Content discovery - finds URLs to crawl, handles pagination and depth.

**Acceptance Criteria:**

- [ ] Extract links from HTML pages
- [ ] Detect pagination patterns (page=N, next links)
- [ ] Follow pagination up to configurable limit
- [ ] Respect depth limit from starting URL
- [ ] Parse XML sitemaps when available
- [ ] Return discovered URLs with metadata
- [ ] Unit tests for link extraction

**Design Constraints:**

- Engine layer - implements HOW
- No orchestration logic
- Stateless operations

**Exa Research Topics:**

- "HTML link extraction cheerio"
- "sitemap.xml parsing Node.js"
- "pagination detection patterns"
- "web crawler depth limiting"

---

## E2: Extraction Engine

**Description:** AI-powered extraction of structured event data from HTML.

**Acceptance Criteria:**

- [ ] Given HTML, identify if page contains events
- [ ] Extract: title, date/time, location, description, URL, organizer
- [ ] Handle event listing pages (multiple events)
- [ ] Handle single event pages (detailed view)
- [ ] Normalize dates to ISO format
- [ ] Return confidence score per field
- [ ] Prompt templates for different page types
- [ ] Unit tests with sample HTML fixtures

**Design Constraints:**

- Use AI Gateway utility
- Structured output (JSON schema)
- Graceful degradation on extraction failure

**Exa Research Topics:**

- "LLM structured data extraction"
- "Claude JSON mode structured output"
- "HTML to structured data AI"
- "event extraction NLP"

---

## E3: Dedup Engine

**Description:** Identify and merge duplicate events across sources.

**Acceptance Criteria:**

- [ ] Exact match on URL returns match immediately
- [ ] Fuzzy match on title similarity (>0.8 threshold)
- [ ] Date matching with tolerance (same day)
- [ ] Location matching (same city/venue)
- [ ] Return match candidates with confidence scores
- [ ] AI-assisted disambiguation for uncertain matches
- [ ] Flag low-confidence matches for review
- [ ] Unit tests with known duplicate and distinct pairs

**Design Constraints:**

- Engine layer - matching logic only
- No persistence (R2 handles storage)
- Configurable thresholds

**Exa Research Topics:**

- "fuzzy string matching algorithms"
- "Levenshtein distance TypeScript"
- "entity resolution patterns"
- "duplicate detection machine learning"

---

## M1: Ingestion Manager

**Description:** Orchestrate complete crawl workflow.

**Acceptance Criteria:**

- [ ] Given source ID, execute complete crawl workflow
- [ ] Coordinate: fetch > discover > extract > dedup > store
- [ ] Handle errors at each stage (retry, skip, report)
- [ ] Track crawl progress and statistics
- [ ] Implement crawl batching
- [ ] Support resume after interruption
- [ ] Integration tests for full workflow

**Design Constraints:**

- Manager layer - orchestrates WHAT
- Calls Engines and Resources, never other Managers
- Stateful workflow tracking

**Exa Research Topics:**

- "workflow orchestration patterns"
- "saga pattern implementation"
- "error handling distributed systems"
- "idempotent operations"

---

## M2: Event Manager

**Description:** Manage event lifecycle operations.

**Acceptance Criteria:**

- [ ] Query events with filters
- [ ] Update events with audit
- [ ] Merge duplicates
- [ ] Integration tests

**Design Constraints:**

- Simpler than M1
- Business operations on events
- May be extended for manual curation

**Exa Research Topics:**

- "CQRS event management"
- "audit trail patterns"

---

## C1: Event API

**Description:** REST API for consuming event data.

**Acceptance Criteria:**

- [ ] GET /events with query params
- [ ] GET /events/:id for single event
- [ ] Pagination (limit, offset or cursor)
- [ ] API key authentication
- [ ] Rate limiting
- [ ] OpenAPI spec auto-generated
- [ ] Integration tests

**Design Constraints:**

- Client layer - no business logic
- Calls M2 for operations
- Versioned API (/v1/...)

**Exa Research Topics:**

- "REST API design best practices 2024"
- "OpenAPI TypeScript generation"
- "API rate limiting Node.js"
- "Hono vs Express vs Fastify 2024"

---

## C2: Event Dashboard

**Description:** User-facing web dashboard for browsing events.

**Acceptance Criteria:**

- [ ] Event listing with infinite scroll
- [ ] Filter by date, location, category
- [ ] Full-text search
- [ ] Event detail page
- [ ] Map view showing locations
- [ ] Calendar view by date
- [ ] Mobile-responsive design
- [ ] Accessibility basics

**Design Constraints:**

- React or Next.js
- Consumes C1 API
- Server-side rendering for SEO

**Exa Research Topics:**

- "Next.js 14 app router"
- "React calendar component"
- "Mapbox React integration"
- "infinite scroll React 2024"

---

## C3: Source Admin UI

**Description:** Admin interface for managing crawl sources.

**Acceptance Criteria:**

- [ ] List sources with status indicators
- [ ] Add source form (URL, name, crawl config)
- [ ] Edit source configuration
- [ ] View crawl history per source
- [ ] Trigger manual crawl
- [ ] View and filter error logs
- [ ] Basic authentication

**Design Constraints:**

- Internal tool, simpler UI acceptable
- Could be part of same app as C2 with auth
- Admin-only access

**Exa Research Topics:**

- "admin dashboard React"
- "shadcn/ui admin components"
- "internal tool authentication"

---

## T1: Integration Testing

**Description:** Test that all components work together.

**Acceptance Criteria:**

- [ ] Crawl workflow test (source to events in DB)
- [ ] API endpoint integration tests
- [ ] Deduplication test (duplicates correctly merged)
- [ ] Error recovery test (partial failures handled)
- [ ] Test fixtures for reproducibility
- [ ] CI pipeline runs integration tests
- [ ] Test coverage report

**Design Constraints:**

- Use real components, test database
- Fixtures for HTML samples
- Mocked external APIs where needed

**Exa Research Topics:**

- "integration testing Node.js 2024"
- "Vitest integration tests"
- "test containers PostgreSQL"
- "fixture management testing"

---

## T2: System Testing

**Description:** Test system in production-like environment.

**Acceptance Criteria:**

- [ ] Staging deployment successful
- [ ] All features work in staging
- [ ] Response times under threshold (< 500ms)
- [ ] System handles expected load
- [ ] Monitoring and alerts functional
- [ ] Logs captured and searchable
- [ ] No critical security vulnerabilities
- [ ] Runbook tested

**Design Constraints:**

- Staging mirrors production
- Load testing with realistic data
- Security scan before production

**Exa Research Topics:**

- "staging environment best practices"
- "load testing Node.js"
- "security scanning CI/CD"
- "monitoring observability 2024"

---

## T3: Deployment

**Description:** Deploy to production.

**Acceptance Criteria:**

- [ ] Production deployment successful
- [ ] Health checks passing
- [ ] Sample crawl executed successfully
- [ ] API responding correctly
- [ ] Dashboard accessible
- [ ] Monitoring capturing metrics
- [ ] Alerts configured and tested
- [ ] Operations team briefed

**Design Constraints:**

- Zero-downtime deployment
- Rollback capability
- Feature flags if needed

**Exa Research Topics:**

- "Railway deployment Node.js"
- "zero downtime deployment"
- "production readiness checklist"
- "incident response runbook"
