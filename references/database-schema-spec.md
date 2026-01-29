# UnlockEvents Database Schema Specification

## Overview

This document captures all design decisions for the UnlockEvents database schema. It serves as the authoritative reference for understanding _why_ the schema is structured the way it is, not just _what_ it contains.

**ORM**: Drizzle (TypeScript), with SQL migrations portable to Python (SQLAlchemy) and Go (sqlc)
**Database**: PostgreSQL via Supabase
**Extensions Required**: `uuid-ossp`, `postgis`, `pg_trgm`

---

## Design Principles

### 1. Multi-Tenancy First

Every table includes `tenant_id UUID NOT NULL REFERENCES tenant(id)`.

**Rationale**: While the initial use case is single-tenant (Alabama events), building multi-tenancy from the start is cheaper than retrofitting. This enables future expansion to other regions or white-label deployments.

**Implementation**:

- Row-level security (RLS) policies on all tables
- All queries must include tenant_id in WHERE clause
- Indexes include tenant_id as prefix

### 2. Soft Deletes Everywhere

Every entity table includes `deleted_at TIMESTAMPTZ DEFAULT NULL`.

**Rationale**:

- Recoverable deletion for accidental mistakes
- Audit trail for compliance
- Referential integrity without cascade complications
- Historical analysis ("what events were we tracking last quarter?")

**Implementation**:

- Active records: `deleted_at IS NULL`
- Query wrappers filter soft-deleted rows by default
- Hard delete available via explicit operation (admin only)

### 3. Versioning for Audit

Core entities include `version INT NOT NULL DEFAULT 1`.

**Rationale**:

- Optimistic locking for concurrent updates
- Track how many times an entity changed
- Foundation for future version history table

**Implementation**:

- Increment version on every UPDATE
- If version doesn't match expected, reject update (optimistic lock)
- Consider version history table for full audit trail (future enhancement)

### 4. Temporal Validity on Relationships

Junction tables include `valid_from TIMESTAMPTZ`, `valid_until TIMESTAMPTZ`.

**Rationale**: Relationships change over time:

- A sponsor only sponsors for 2024
- A speaker is confirmed for the first session but cancels for the second
- A venue changes mid-event series

**Implementation**:

- Both fields nullable (null = unbounded)
- Query with `(valid_from IS NULL OR valid_from <= NOW()) AND (valid_until IS NULL OR valid_until > NOW())`

### 5. Provenance Tracking

Core entities include `provenance JSONB`.

**Rationale**: Know where data came from:

- Which source discovered this event?
- What crawl job extracted it?
- Was it manually entered or AI-extracted?
- What was the confidence score?

**Structure**:

```json
{
  "source_id": "uuid",
  "crawled_page_id": "uuid",
  "extraction_method": "ai|manual|structured",
  "confidence": 0.95,
  "extracted_at": "2024-01-15T10:30:00Z",
  "model_version": "claude-3-sonnet-20241022"
}
```

### 6. Free-Form Descriptions, Not Categories

Event descriptions are natural language text, not enum categories.

**Rationale**:

- Categories are rigid and require maintenance
- Users search in natural language
- AI can extract structure from natural language as needed
- Supports full-text search via `tsvector`

**Anti-pattern avoided**: No `event_type` enum like `conference|workshop|networking|...`

---

## Entity Specifications

### tenant

The top-level organizational unit for multi-tenancy.

| Column     | Type        | Constraints                    | Description                   |
| ---------- | ----------- | ------------------------------ | ----------------------------- |
| id         | uuid        | PK, DEFAULT uuid_generate_v4() | Primary identifier            |
| name       | text        | NOT NULL                       | Display name                  |
| slug       | text        | NOT NULL, UNIQUE               | URL-safe identifier           |
| settings   | jsonb       | DEFAULT '{}'                   | Tenant-specific configuration |
| created_at | timestamptz | NOT NULL, DEFAULT NOW()        | Creation timestamp            |
| updated_at | timestamptz | NOT NULL, DEFAULT NOW()        | Last update timestamp         |
| deleted_at | timestamptz | NULL                           | Soft delete marker            |

**Design Notes**:

- `slug` enables tenant-specific URLs: `/alabama/events`
- `settings` holds feature flags, branding, limits

---

### source

A place where events are discovered (website, social profile, feed, API).

| Column          | Type        | Constraints                | Description                                                           |
| --------------- | ----------- | -------------------------- | --------------------------------------------------------------------- |
| id              | uuid        | PK                         | Primary identifier                                                    |
| tenant_id       | uuid        | FK, NOT NULL               | Owning tenant                                                         |
| version         | int         | NOT NULL, DEFAULT 1        | Optimistic lock                                                       |
| category        | text        | NOT NULL                   | Type: `web_page`, `social_post`, `feed`, `api`, `manual`              |
| platform        | text        | NULL                       | Platform name: `eventbrite`, `facebook`, `linkedin`, or custom string |
| name            | text        | NOT NULL                   | Human-readable name                                                   |
| url             | text        | NOT NULL                   | Primary URL                                                           |
| feed_url        | text        | NULL                       | RSS/Atom feed URL if different from main URL                          |
| description     | text        | NULL                       | Notes about this source                                               |
| crawl_config    | jsonb       | DEFAULT '{}'               | Crawling settings (depth, frequency, selectors)                       |
| status          | text        | NOT NULL, DEFAULT 'active' | `active`, `paused`, `error`, `archived`                               |
| last_crawled_at | timestamptz | NULL                       | Last successful crawl                                                 |
| next_crawl_at   | timestamptz | NULL                       | Scheduled next crawl                                                  |
| provenance      | jsonb       | DEFAULT '{}'               | Data origin tracking                                                  |
| created_at      | timestamptz | NOT NULL                   | Creation timestamp                                                    |
| updated_at      | timestamptz | NOT NULL                   | Last update                                                           |
| deleted_at      | timestamptz | NULL                       | Soft delete                                                           |

**Design Decision: category + platform instead of type enum**

We originally considered a `source_type` enum like `eventbrite|facebook|linkedin|website`. This was rejected because:

1. **Rigidity**: New platforms require schema migration
2. **Overlap**: A Facebook page is both `social_post` and `web_page`
3. **Extensibility**: Users can add any platform string without code changes

Instead:

- `category` describes the crawling approach needed (how to fetch)
- `platform` is a freeform string for the specific service (what it is)

**Examples**:

```
category: 'web_page', platform: 'eventbrite' -- Eventbrite event pages
category: 'social_post', platform: 'linkedin' -- LinkedIn posts
category: 'feed', platform: 'meetup' -- Meetup RSS feed
category: 'api', platform: 'ticketmaster' -- Ticketmaster API
category: 'web_page', platform: NULL -- Generic website
```

**crawl_config Structure**:

```json
{
  "depth": 3,
  "frequency_hours": 24,
  "rate_limit_ms": 1000,
  "selectors": {
    "event_list": ".event-card",
    "pagination": ".next-page"
  },
  "headers": {},
  "cookies": {}
}
```

---

### crawled_page

Individual pages fetched during crawling, forming a tree structure.

| Column         | Type        | Constraints                 | Description                              |
| -------------- | ----------- | --------------------------- | ---------------------------------------- |
| id             | uuid        | PK                          | Primary identifier                       |
| tenant_id      | uuid        | FK, NOT NULL                | Owning tenant                            |
| source_id      | uuid        | FK, NOT NULL                | Parent source                            |
| parent_page_id | uuid        | FK, NULL                    | Parent page (for depth > 0)              |
| version        | int         | NOT NULL, DEFAULT 1         | Optimistic lock                          |
| url            | text        | NOT NULL                    | Full URL                                 |
| depth          | int         | NOT NULL, DEFAULT 0         | Crawl depth from source root             |
| content_hash   | text        | NULL                        | SHA-256 of content for change detection  |
| storage_path   | text        | NULL                        | Blob storage reference                   |
| status         | text        | NOT NULL, DEFAULT 'pending' | `pending`, `fetched`, `parsed`, `failed` |
| metadata       | jsonb       | DEFAULT '{}'                | Page-level metadata                      |
| provenance     | jsonb       | DEFAULT '{}'                | Fetch details                            |
| fetched_at     | timestamptz | NULL                        | When content was fetched                 |
| created_at     | timestamptz | NOT NULL                    | Record creation                          |
| updated_at     | timestamptz | NOT NULL                    | Last update                              |
| deleted_at     | timestamptz | NULL                        | Soft delete                              |

**Design Decision: Blob Storage for Raw Content**

Raw HTML/content is stored in blob storage (Supabase Storage), not in PostgreSQL.

Rationale:

- HTML can be large (500KB+)
- PostgreSQL isn't optimized for large blobs
- Enables CDN caching for debugging
- Reduces database backup size
- `storage_path` points to blob location

**Design Decision: Self-Referential Hierarchy**

`parent_page_id` creates a tree of pages under each source. This models:

- Homepage → Category page → Event detail page
- Pagination: Page 1 → Page 2 → Page 3

Alternative considered: Flat list with just `source_id`. Rejected because:

- Loses crawl path context
- Can't reconstruct navigation for debugging
- Can't track discovery relationship (how we found this URL)

**Unique Constraint**: `UNIQUE(tenant_id, url)` - no duplicate URLs per tenant

---

### organization

Companies, groups, or entities that host/sponsor events.

| Column      | Type        | Constraints         | Description                |
| ----------- | ----------- | ------------------- | -------------------------- |
| id          | uuid        | PK                  | Primary identifier         |
| tenant_id   | uuid        | FK, NOT NULL        | Owning tenant              |
| version     | int         | NOT NULL, DEFAULT 1 | Optimistic lock            |
| name        | text        | NOT NULL            | Organization name          |
| description | text        | NULL                | About the organization     |
| website     | text        | NULL                | Primary website            |
| logo_url    | text        | NULL                | Logo image URL             |
| metadata    | jsonb       | DEFAULT '{}'        | Additional structured data |
| provenance  | jsonb       | DEFAULT '{}'        | Data origin                |
| created_at  | timestamptz | NOT NULL            | Creation timestamp         |
| updated_at  | timestamptz | NOT NULL            | Last update                |
| deleted_at  | timestamptz | NULL                | Soft delete                |

**Design Decision: Organization as Separate Entity**

Events reference organizations via junction table, not embedded fields.

Why:

- One org hosts many events
- Need to track org details once, not per-event
- Enables org-centric queries ("all events by Chamber of Commerce")
- Supports multiple orgs per event (host + sponsors)

---

### person

Individuals associated with events (organizers, speakers, performers).

| Column      | Type        | Constraints         | Description          |
| ----------- | ----------- | ------------------- | -------------------- |
| id          | uuid        | PK                  | Primary identifier   |
| tenant_id   | uuid        | FK, NOT NULL        | Owning tenant        |
| version     | int         | NOT NULL, DEFAULT 1 | Optimistic lock      |
| full_name   | text        | NOT NULL            | Display name         |
| bio         | text        | NULL                | Biography            |
| profile_url | text        | NULL                | Primary profile link |
| avatar_url  | text        | NULL                | Profile photo        |
| metadata    | jsonb       | DEFAULT '{}'        | Additional data      |
| provenance  | jsonb       | DEFAULT '{}'        | Data origin          |
| created_at  | timestamptz | NOT NULL            | Creation timestamp   |
| updated_at  | timestamptz | NOT NULL            | Last update          |
| deleted_at  | timestamptz | NULL                | Soft delete          |

**Design Decision: Normalized Contact Information**

Contact info is NOT embedded in the person record.

Why:

- A person can have multiple emails (work, personal)
- Contact info changes over time (temporal validity)
- Enables deduplication by email matching
- Same pattern for phones and social links

See `person_email`, `person_phone`, `person_social` tables.

**Design Decision: No Unique Constraint on Name**

`full_name` is NOT unique because:

- Multiple "John Smith" individuals may exist
- Deduplication uses contact info and context, not name
- Names can be spelled differently from same source

---

### person_email / person_phone / person_social

Normalized contact information for persons.

**person_email**:
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary identifier |
| tenant_id | uuid | Owning tenant |
| person_id | uuid | Parent person |
| email | text | Email address |
| label | text | `work`, `personal`, `other` |
| is_primary | boolean | Primary contact flag |
| valid_from | timestamptz | When this became active |
| valid_until | timestamptz | When this was replaced |
| created_at | timestamptz | Record creation |

**person_phone**: Same structure with `phone` instead of `email`

**person_social**:
| Column | Type | Description |
|--------|------|-------------|
| platform | text | `linkedin`, `twitter`, `facebook`, etc. |
| handle | text | Username on platform |
| profile_url | text | Full profile URL |

**Design Decision: Temporal Validity on Contacts**

Why:

- People change jobs → email changes
- Phone numbers get reassigned
- Social handles can change

Enables: "What was their email when they spoke at our 2023 event?"

---

### organization_social

Social profiles for organizations (same structure as person_social).

---

### location

Physical or virtual venues where events take place.

| Column           | Type                   | Constraints             | Description                    |
| ---------------- | ---------------------- | ----------------------- | ------------------------------ |
| id               | uuid                   | PK                      | Primary identifier             |
| tenant_id        | uuid                   | FK, NOT NULL            | Owning tenant                  |
| version          | int                    | NOT NULL, DEFAULT 1     | Optimistic lock                |
| name             | text                   | NOT NULL                | Location name                  |
| venue_name       | text                   | NULL                    | Specific venue within location |
| address_line1    | text                   | NULL                    | Street address                 |
| address_line2    | text                   | NULL                    | Suite, floor, etc.             |
| city             | text                   | NULL                    | City                           |
| state            | text                   | NULL                    | State/province                 |
| postal_code      | text                   | NULL                    | ZIP/postal code                |
| country          | text                   | NULL, DEFAULT 'US'      | Country code                   |
| coordinates      | geography(Point, 4326) | NULL                    | PostGIS point                  |
| timezone         | text                   | NULL                    | IANA timezone                  |
| is_virtual       | boolean                | NOT NULL, DEFAULT FALSE | Virtual event flag             |
| virtual_url      | text                   | NULL                    | Virtual meeting URL            |
| virtual_platform | text                   | NULL                    | `zoom`, `teams`, `webex`, etc. |
| metadata         | jsonb                  | DEFAULT '{}'            | Additional data                |
| provenance       | jsonb                  | DEFAULT '{}'            | Data origin                    |
| created_at       | timestamptz            | NOT NULL                | Creation timestamp             |
| updated_at       | timestamptz            | NOT NULL                | Last update                    |
| deleted_at       | timestamptz            | NULL                    | Soft delete                    |

**Design Decision: Location as Separate Entity**

Locations are first-class entities, not embedded in events.

Why:

- Same venue hosts many events
- Venue details (address, coordinates) maintained once
- Enables location-centric queries ("events near me")
- Supports PostGIS for radius searches

**Design Decision: Support Both Physical and Virtual**

`is_virtual` flag with optional `virtual_url` and `virtual_platform`.

Why:

- Hybrid events have both physical and virtual options
- An event can have multiple locations (M:M via junction)
- Virtual platform info helps users prepare

**PostGIS Usage**:

```sql
-- Find events within 10 miles of a point
SELECT e.* FROM event e
JOIN event_location el ON e.id = el.event_id
JOIN location l ON el.location_id = l.id
WHERE ST_DWithin(
  l.coordinates,
  ST_GeogFromText('POINT(-86.8025 33.5207)'),
  16093  -- 10 miles in meters
);
```

---

### event

The core entity - professional/business events in Alabama.

| Column               | Type          | Constraints               | Description                                    |
| -------------------- | ------------- | ------------------------- | ---------------------------------------------- |
| id                   | uuid          | PK                        | Primary identifier                             |
| tenant_id            | uuid          | FK, NOT NULL              | Owning tenant                                  |
| version              | int           | NOT NULL, DEFAULT 1       | Optimistic lock                                |
| title                | text          | NOT NULL                  | Event title                                    |
| description          | text          | NULL                      | Free-form description                          |
| starts_at            | timestamptz   | NOT NULL                  | Start date/time                                |
| ends_at              | timestamptz   | NULL                      | End date/time                                  |
| timezone             | text          | NOT NULL                  | IANA timezone                                  |
| is_recurring         | boolean       | NOT NULL, DEFAULT FALSE   | Recurring event flag                           |
| recurrence_rule      | text          | NULL                      | iCal RRULE string                              |
| recurrence_parent_id | uuid          | FK, NULL                  | Parent recurring event                         |
| status               | text          | NOT NULL, DEFAULT 'draft' | `draft`, `published`, `cancelled`, `postponed` |
| is_free              | boolean       | NOT NULL, DEFAULT FALSE   | Free event flag                                |
| price_min            | decimal(10,2) | NULL                      | Minimum ticket price                           |
| price_max            | decimal(10,2) | NULL                      | Maximum ticket price                           |
| price_currency       | text          | DEFAULT 'USD'             | Price currency code                            |
| registration_url     | text          | NULL                      | Where to register                              |
| image_url            | text          | NULL                      | Event image/banner                             |
| metadata             | jsonb         | DEFAULT '{}'              | Additional structured data                     |
| search_vector        | tsvector      | GENERATED                 | Full-text search                               |
| provenance           | jsonb         | DEFAULT '{}'              | Data origin                                    |
| created_at           | timestamptz   | NOT NULL                  | Creation timestamp                             |
| updated_at           | timestamptz   | NOT NULL                  | Last update                                    |
| deleted_at           | timestamptz   | NULL                      | Soft delete                                    |

**Design Decision: Free-Form Description**

`description` is natural language text, NOT structured categories.

Why:

- Categories are rigid and contentious ("Is a panel a workshop?")
- Natural language captures nuance
- Full-text search handles discovery
- AI can extract structure on-demand if needed

**Anti-pattern avoided**: No `event_type` enum. No `tags` array.

**Design Decision: Recurring Events**

Recurring events use two patterns:

1. **Template + Instances**: Parent event has `recurrence_rule` (RRULE). Child instances have `recurrence_parent_id` pointing to parent.

2. **Standalone**: One-off events have neither field set.

Why RRULE:

- Standard format (iCal RFC 5545)
- Libraries exist in all languages
- Handles complex patterns ("2nd Tuesday of each month")

Example:

```
FREQ=WEEKLY;BYDAY=TU,TH;COUNT=10  -- Tuesdays and Thursdays for 10 occurrences
```

**Design Decision: Price Range**

`price_min` and `price_max` instead of single price.

Why:

- Events have multiple ticket tiers
- Early bird vs regular pricing
- "From $50" is common display pattern

**Full-Text Search**:

```sql
-- search_vector is auto-generated from title + description
CREATE INDEX event_search_idx ON event USING GIN(search_vector);

-- Query
SELECT * FROM event
WHERE search_vector @@ plainto_tsquery('english', 'networking business');
```

---

### event_source

Junction table linking events to their discovery sources.

| Column          | Type        | Description                              |
| --------------- | ----------- | ---------------------------------------- |
| id              | uuid        | Primary identifier                       |
| tenant_id       | uuid        | Owning tenant                            |
| event_id        | uuid        | The event                                |
| source_id       | uuid        | The source                               |
| crawled_page_id | uuid        | Specific page where found                |
| external_id     | text        | Event ID at source (e.g., Eventbrite ID) |
| source_url      | text        | Canonical URL at source                  |
| discovered_at   | timestamptz | When first found                         |
| last_seen_at    | timestamptz | Most recent sighting                     |
| created_at      | timestamptz | Record creation                          |

**Design Decision: M:M Event-Source**

An event can be discovered at multiple sources.

Why:

- Same event posted on Eventbrite AND Facebook
- Enables deduplication ("these are the same event")
- Tracks where we're seeing each event

**external_id**: The source's native ID (Eventbrite event ID, etc.). Useful for:

- Deduplication
- Re-fetching specific events
- API integrations

---

### event_location

Junction table for events and their locations.

| Column      | Type        | Description                        |
| ----------- | ----------- | ---------------------------------- |
| id          | uuid        | Primary identifier                 |
| tenant_id   | uuid        | Owning tenant                      |
| event_id    | uuid        | The event                          |
| location_id | uuid        | The location                       |
| role        | text        | `primary`, `secondary`, `overflow` |
| sort_order  | int         | Display ordering                   |
| valid_from  | timestamptz | When this location applies         |
| valid_until | timestamptz | When it stops applying             |
| created_at  | timestamptz | Record creation                    |

**Design Decision: M:M Event-Location**

Why:

- Multi-day conference at hotel + convention center
- Overflow venue for popular events
- Hybrid: physical location + virtual link
- Different locations for different sessions

---

### event_organization

Junction table for events and organizations.

| Column           | Type        | Description                            |
| ---------------- | ----------- | -------------------------------------- |
| role             | text        | `host`, `sponsor`, `partner`, `vendor` |
| sort_order       | int         | Display ordering (host first)          |
| valid_from/until | timestamptz | Temporal validity                      |

**Design Decision: Role-Based Relationships**

Multiple organizations can be associated with different roles.

Example:

- Birmingham Chamber of Commerce (host)
- Local Bank (sponsor)
- Catering Co (vendor)

---

### event_person

Junction table for events and people.

| Column           | Type        | Description                                                  |
| ---------------- | ----------- | ------------------------------------------------------------ |
| role             | text        | `organizer`, `speaker`, `performer`, `panelist`, `moderator` |
| sort_order       | int         | Display ordering (keynote first)                             |
| valid_from/until | timestamptz | Temporal validity                                            |

**Design Decision: Temporal Validity for People**

Why:

- Speaker confirms, then cancels
- Replacement speaker added
- Historical accuracy ("who was originally scheduled?")

---

### event_relationship

Generalized event-to-event relationships.

| Column            | Type        | Description              |
| ----------------- | ----------- | ------------------------ |
| id                | uuid        | Primary identifier       |
| tenant_id         | uuid        | Owning tenant            |
| from_event_id     | uuid        | Source event             |
| to_event_id       | uuid        | Target event             |
| relationship_type | text        | Type of relationship     |
| metadata          | jsonb       | Additional context       |
| valid_from        | timestamptz | When relationship starts |
| valid_until       | timestamptz | When relationship ends   |
| created_at        | timestamptz | Record creation          |

**Relationship Types**:

- `parent`: to_event is a session/sub-event of from_event
- `series`: Events are part of the same series
- `sequel`: to_event follows from_event (Part 1 → Part 2)
- `related`: Loosely related events
- `supersedes`: to_event replaces cancelled from_event

**Design Decision: Generalized Relationships Instead of parent_event_id**

Original design had `parent_event_id` on event for session hierarchy. Changed to junction table.

Why:

- Supports multiple relationship types
- An event can be in multiple series
- Relationship semantics are explicit
- Temporal validity ("was part of series until...")
- Metadata per relationship

Example:

```
Annual Conference 2024 --parent--> Keynote Session
Annual Conference 2024 --parent--> Workshop A
Annual Conference 2024 --series--> Annual Conference 2023
Annual Conference 2024 --related--> Industry Mixer
```

---

### event_attendance

Track attendance expectations and actuals.

| Column         | Type        | Description                          |
| -------------- | ----------- | ------------------------------------ |
| id             | uuid        | Primary identifier                   |
| tenant_id      | uuid        | Owning tenant                        |
| event_id       | uuid        | The event                            |
| expected_count | int         | Expected attendance                  |
| actual_count   | int         | Actual attendance                    |
| source         | text        | `registration`, `manual`, `estimate` |
| recorded_at    | timestamptz | When this was recorded               |
| created_at     | timestamptz | Record creation                      |

**Design Decision: Separate Table for Attendance**

Why:

- Multiple estimates at different times
- Expected vs actual comparison
- Source of data matters
- Not cluttering event table with optional data

---

### dedup_match

Tracks potential and confirmed duplicate events.

| Column           | Type         | Description                        |
| ---------------- | ------------ | ---------------------------------- |
| id               | uuid         | Primary identifier                 |
| tenant_id        | uuid         | Owning tenant                      |
| event_a_id       | uuid         | First event                        |
| event_b_id       | uuid         | Second event                       |
| confidence_score | decimal(5,4) | 0.0000 to 1.0000                   |
| status           | text         | `pending`, `confirmed`, `rejected` |
| reviewed_by      | uuid         | User who reviewed (nullable)       |
| reviewed_at      | timestamptz  | When reviewed                      |
| match_reasons    | jsonb        | Why matched                        |
| created_at       | timestamptz  | Record creation                    |
| updated_at       | timestamptz  | Last update                        |

**match_reasons Structure**:

```json
{
  "title_similarity": 0.92,
  "date_match": true,
  "location_match": true,
  "org_overlap": ["uuid1", "uuid2"],
  "url_similarity": 0.85
}
```

---

### dedup_config

Tenant-level deduplication settings.

| Column               | Type         | Description                          |
| -------------------- | ------------ | ------------------------------------ |
| id                   | uuid         | Primary identifier                   |
| tenant_id            | uuid         | Owning tenant                        |
| auto_merge_threshold | decimal(5,4) | Auto-merge above this (e.g., 0.95)   |
| review_threshold     | decimal(5,4) | Human review above this (e.g., 0.70) |
| rejection_threshold  | decimal(5,4) | Auto-reject below this (e.g., 0.30)  |
| field_weights        | jsonb        | Per-field weight configuration       |
| is_active            | boolean      | Whether dedup is enabled             |
| created_at           | timestamptz  | Record creation                      |
| updated_at           | timestamptz  | Last update                          |

**Design Decision: Configurable Thresholds**

Why:

- Different tenants have different tolerance for duplicates
- Can tune based on experience
- Field weights vary by domain

**field_weights Example**:

```json
{
  "title": 0.3,
  "date": 0.25,
  "location": 0.2,
  "organization": 0.15,
  "description": 0.1
}
```

---

## Indexes

### Primary Patterns

All tables get:

```sql
CREATE INDEX idx_{table}_tenant ON {table}(tenant_id);
CREATE INDEX idx_{table}_deleted ON {table}(tenant_id) WHERE deleted_at IS NULL;
```

### Query-Specific Indexes

```sql
-- Event search
CREATE INDEX idx_event_search ON event USING GIN(search_vector);
CREATE INDEX idx_event_dates ON event(tenant_id, starts_at, ends_at) WHERE deleted_at IS NULL;

-- Location queries
CREATE INDEX idx_location_geo ON location USING GIST(coordinates);

-- Source scheduling
CREATE INDEX idx_source_next_crawl ON source(tenant_id, next_crawl_at) WHERE status = 'active' AND deleted_at IS NULL;

-- Dedup workflow
CREATE INDEX idx_dedup_pending ON dedup_match(tenant_id, status) WHERE status = 'pending';

-- Person contact lookup
CREATE INDEX idx_person_email_lookup ON person_email(tenant_id, email) WHERE deleted_at IS NULL;
```

---

## Migrations Strategy

### Drizzle for TypeScript

Schema defined in TypeScript, migrations generated:

```bash
pnpm drizzle-kit generate:pg
pnpm drizzle-kit push:pg  # Dev only
pnpm drizzle-kit migrate  # Production
```

### Python/Go Compatibility

The same migrations are applied to the database. Python and Go services:

- Read from the same PostgreSQL database
- Use their own query libraries (SQLAlchemy, sqlc)
- Don't need Drizzle—just the migrated schema

Migration files are SQL and version-controlled. Any language can apply them.

---

## Future Considerations

### Not Implemented Yet

1. **Version History Tables**: Store full history of entity changes
2. **Event Tags**: If categories become necessary, add junction table
3. **Event Images Gallery**: Multiple images per event
4. **User/Auth Tables**: Will be handled by Supabase Auth
5. **API Keys/Webhooks**: For external integrations

### Migration Path

These can be added with new migrations without breaking existing schema. The current design doesn't preclude any of them.
