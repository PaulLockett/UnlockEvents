// Re-export all schema
export * from "./schema/index.js";

// Database client setup
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export type Database = ReturnType<typeof createDatabase>;

/**
 * Connection pool configuration options.
 * postgres.js manages connection pooling automatically.
 */
export interface DatabaseConfig {
  /**
   * Maximum number of connections in the pool.
   * Default: 10 (suitable for most workloads)
   */
  max?: number;

  /**
   * Idle connection timeout in seconds.
   * Connections idle longer than this are closed.
   * Default: 30
   */
  idleTimeout?: number;

  /**
   * Connection timeout in seconds.
   * How long to wait for a connection from the pool.
   * Default: 30
   */
  connectTimeout?: number;

  /**
   * Enable SSL/TLS for connections.
   * Required for Supabase Cloud. Set to 'require' for production.
   */
  ssl?: boolean | "require" | "prefer";
}

/**
 * Create a database connection with connection pooling.
 *
 * For production (Supabase Cloud):
 * ```typescript
 * const db = createDatabase(process.env.DATABASE_URL!, {
 *   max: 20,
 *   ssl: 'require'
 * });
 * ```
 *
 * For local development (Supabase CLI):
 * ```typescript
 * const db = createDatabase('postgresql://postgres:postgres@localhost:54322/postgres');
 * ```
 */
export function createDatabase(connectionString: string, config: DatabaseConfig = {}) {
  const ssl =
    config.ssl === true || config.ssl === "require"
      ? "require"
      : config.ssl === "prefer"
        ? "prefer"
        : undefined;

  const client = postgres(connectionString, {
    max: config.max ?? 10,
    idle_timeout: config.idleTimeout ?? 30,
    connect_timeout: config.connectTimeout ?? 30,
    ssl,
  });

  return drizzle(client, { schema });
}

/**
 * Create a database connection for migrations.
 * Uses a single connection instead of a pool.
 */
export function createMigrationClient(connectionString: string) {
  const client = postgres(connectionString, { max: 1 });
  return drizzle(client, { schema });
}
