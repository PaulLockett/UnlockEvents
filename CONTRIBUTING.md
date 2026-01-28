# Contributing to UnlockEvents

## Development Environment Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for DevContainer or local services)

### Option 1: DevContainer (Recommended)

1. Open in VS Code with Dev Containers extension
2. Click "Reopen in Container" when prompted
3. Wait for container to build and dependencies to install

The DevContainer includes:

- Node.js 20
- Python 3.12
- Go 1.22
- Docker CLI
- Temporal CLI
- Supabase CLI

### Option 2: Local Setup

```bash
# Install dependencies
pnpm install

# Start Temporal dev server (requires Docker)
docker compose -f .devcontainer/docker-compose.yml up temporal temporal-ui -d

# Start Supabase locally
supabase start
```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature branches (branch from `develop`)
- `fix/*` - Bug fix branches

### Before Committing

Pre-commit hooks run automatically via Husky:

- ESLint checks and fixes
- Prettier formatting

To run manually:

```bash
pnpm lint        # Check for lint errors
pnpm lint:fix    # Auto-fix lint errors
pnpm format      # Format all files
pnpm typecheck   # TypeScript type checking
```

### Creating a Pull Request

1. Create a feature branch from `develop`
2. Make your changes
3. Ensure all checks pass locally
4. Push and open a PR to `develop`
5. Railway will create a preview environment for your PR

## Project Structure

```
UnlockEvents/
├── services/          # Application services (any language)
├── packages/          # Shared TypeScript packages
├── libs/
│   ├── python/        # Shared Python packages
│   └── go/            # Shared Go packages
├── .devcontainer/     # DevContainer configuration
├── .github/workflows/ # CI/CD pipelines
└── turbo.json         # Turborepo task configuration
```

## Adding a New Service

1. Create directory under `services/`
2. Add appropriate build configuration (Dockerfile, package.json, etc.)
3. Add to `pnpm-workspace.yaml` if TypeScript
4. Create `railway.json` for deployment config

## External Services

### Local Development

- **Temporal**: Runs via docker-compose (port 7233, UI on 8080)
- **Supabase**: Runs via `supabase start` (API on 54321, Studio on 54323)

### Staging/Production

- **Temporal Cloud**: Managed workflow orchestration
- **Supabase Cloud**: Managed Postgres, Auth, Storage
- **Railway**: Application hosting with PR preview environments
