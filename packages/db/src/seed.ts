/**
 * Seed data for development and testing.
 *
 * Run with: npx tsx src/seed.ts
 * Requires DATABASE_URL environment variable.
 */

import { createDatabase } from "./index.js";
import { tenant, source, organization, person, location, event } from "./schema/index.js";

async function seed() {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const db = createDatabase(databaseUrl);

  console.log("Seeding database...");

  // Create tenant
  const tenantResult = await db
    .insert(tenant)
    .values({
      name: "UnlockAlabama",
      slug: "alabama",
      settings: {
        timezone: "America/Chicago",
        region: "Alabama, USA",
      },
    })
    .returning();

  const alabamaTenant = tenantResult[0];
  if (!alabamaTenant) throw new Error("Failed to create tenant");
  console.log("Created tenant:", alabamaTenant.id);

  // Create sources
  const sourceResult = await db
    .insert(source)
    .values({
      tenantId: alabamaTenant.id,
      category: "web_page",
      platform: "eventbrite",
      name: "Eventbrite Birmingham",
      url: "https://www.eventbrite.com/d/al--birmingham/events/",
      crawlConfig: {
        depth: 2,
        frequencyHours: 24,
        rateLimitMs: 1000,
      },
    })
    .returning();

  const eventbriteSource = sourceResult[0];
  if (!eventbriteSource) throw new Error("Failed to create source");
  console.log("Created source:", eventbriteSource.id);

  // Create organization
  const orgResult = await db
    .insert(organization)
    .values({
      tenantId: alabamaTenant.id,
      name: "Birmingham Business Alliance",
      description: "Regional economic development organization for the Birmingham metro area",
      website: "https://birminghambusinessalliance.com",
    })
    .returning();

  const chamberOrg = orgResult[0];
  if (!chamberOrg) throw new Error("Failed to create organization");
  console.log("Created organization:", chamberOrg.id);

  // Create person
  const personResult = await db
    .insert(person)
    .values({
      tenantId: alabamaTenant.id,
      fullName: "Jane Smith",
      bio: "Tech entrepreneur and speaker",
    })
    .returning();

  const speakerPerson = personResult[0];
  if (!speakerPerson) throw new Error("Failed to create person");
  console.log("Created person:", speakerPerson.id);

  // Create location
  const locationResult = await db
    .insert(location)
    .values({
      tenantId: alabamaTenant.id,
      name: "BJCC",
      venueName: "Birmingham-Jefferson Convention Complex",
      addressLine1: "2100 Richard Arrington Jr Blvd N",
      city: "Birmingham",
      state: "AL",
      postalCode: "35203",
      country: "US",
      timezone: "America/Chicago",
      isVirtual: false,
    })
    .returning();

  const venueLocation = locationResult[0];
  if (!venueLocation) throw new Error("Failed to create location");
  console.log("Created location:", venueLocation.id);

  // Create event
  const eventResult = await db
    .insert(event)
    .values({
      tenantId: alabamaTenant.id,
      title: "Birmingham Tech Summit 2024",
      description:
        "Annual gathering of tech professionals, entrepreneurs, and investors in Birmingham. " +
        "Features keynotes, workshops, and networking opportunities focused on growing the " +
        "tech ecosystem in Alabama.",
      startsAt: new Date("2024-06-15T09:00:00-05:00"),
      endsAt: new Date("2024-06-15T17:00:00-05:00"),
      timezone: "America/Chicago",
      status: "published",
      isFree: false,
      priceMin: "50.00",
      priceMax: "150.00",
      priceCurrency: "USD",
      registrationUrl: "https://example.com/register",
    })
    .returning();

  const sampleEvent = eventResult[0];
  if (!sampleEvent) throw new Error("Failed to create event");
  console.log("Created event:", sampleEvent.id);

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
