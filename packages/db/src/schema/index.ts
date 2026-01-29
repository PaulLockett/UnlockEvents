// Core entities
export { tenant } from "./tenant.js";

export {
  source,
  crawledPage,
  type SourceCategory,
  type SourceStatus,
  type CrawlConfig,
  type Provenance,
  type CrawledPageStatus,
} from "./source.js";

export { organization, organizationSocial } from "./organization.js";

export {
  person,
  personEmail,
  personPhone,
  personSocial,
  type EmailLabel,
  type PhoneLabel,
} from "./person.js";

export { location } from "./location.js";

export {
  event,
  eventSource,
  eventLocation,
  eventOrganization,
  eventPerson,
  eventRelationship,
  eventAttendance,
  type EventStatus,
  type LocationRole,
  type OrganizationRole,
  type PersonRole,
  type EventRelationshipType,
  type AttendanceSource,
} from "./event.js";

export {
  dedupMatch,
  dedupConfig,
  type DedupStatus,
  type MatchReasons,
  type FieldWeights,
} from "./dedup.js";
