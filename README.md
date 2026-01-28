# UnlockEvents

Event scraper for discovering professional and business events in Alabama.

## Overview

UnlockEvents is a production system that:

1. Scrapes websites and social profiles for event information
2. Uses AI to extract structured event data from unstructured content
3. Deduplicates events across sources
4. Exposes events via REST API and web dashboard

## Architecture

Built using **volatility-based decomposition** with clear layer boundaries:

| Layer               | Purpose                              |
| ------------------- | ------------------------------------ |
| **Clients**         | API endpoints, dashboards, admin UIs |
| **Managers**        | Workflow orchestration (max 2)       |
| **Engines**         | Business logic implementation        |
| **Resource Access** | Data storage abstractions            |
| **Utilities**       | Cross-cutting concerns               |

**Workflow Orchestration**: Temporal Cloud
**Database**: Supabase (Postgres)
**Hosting**: Railway with PR preview environments

## Project Structure

```
UnlockEvents/
├── services/          # Application services (TypeScript, Python, Go)
├── packages/          # Shared TypeScript packages
├── libs/
│   ├── python/        # Shared Python packages
│   └── go/            # Shared Go packages
├── .devcontainer/     # DevContainer for consistent dev environment
├── .github/workflows/ # CI/CD pipelines
├── turbo.json         # Turborepo monorepo configuration
└── CLAUDE.md          # Project context for AI assistants
```

## Quick Start

### Using DevContainer (Recommended)

1. Open in VS Code
2. Install "Dev Containers" extension
3. Click "Reopen in Container"
4. Environment auto-configures with all dependencies

### Manual Setup

```bash
# Install dependencies
pnpm install

# Start local services
docker compose -f .devcontainer/docker-compose.yml up -d
supabase start

# Run development
pnpm dev
```

## Development

```bash
pnpm lint          # Run linter
pnpm format        # Format code
pnpm typecheck     # TypeScript checks
pnpm build         # Build all packages
pnpm dev           # Start development servers
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed development workflow.

## Tech Stack

- **Languages**: TypeScript, Python, Go
- **Monorepo**: Turborepo + pnpm
- **Workflows**: Temporal Cloud
- **Database**: Supabase (Postgres)
- **Hosting**: Railway
- **CI/CD**: GitHub Actions

## License

MIT - see [LICENSE](./LICENSE)
