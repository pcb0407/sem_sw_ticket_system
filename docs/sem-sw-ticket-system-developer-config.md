# SEM SW Ticket System Developer Configuration

This document lists the configuration surfaces that template developers are expected to touch during local development, debugging, platform linking, and deployment preparation.

## Configuration layers

| Layer | Primary files | Owns |
| --- | --- | --- |
| Shared local defaults | `scripts/local-dev-defaults.json` | fallback host, port, protocol, Swagger path, Docker wrapper values, browser viewport values |
| Root workspace scripts | `package.json` | install, build, dev, platform link/adopt/status, local HTTPS setup |
| Backend runtime | `backend/src/main.ts`, backend env files when present | backend host, port, CORS origin, API prefix, Swagger metadata |
| Frontend runtime | `frontend/vite.config.ts`, frontend env files when present | Vite host/port, backend proxy target, build-time package metadata |
| Platform source | `common-platform`, `SEM_PLATFORM_SOURCE_ROOT`, sibling `../sem_sw_common_web_platform` | common platform package resolution |
| Local dependency layout | `scripts/assert-local-dev-env.cjs`, `scripts/local-paths.cjs` | Windows synced-workspace-safe dependency locations |

## Local defaults

The checked-in fallback defaults are:

| Setting | Default |
| --- | --- |
| Frontend URL | `http://127.0.0.1:5173` |
| Backend URL | `http://127.0.0.1:3001` |
| API prefix | `api` |
| Swagger path | `docs` |
| Swagger URL | `http://127.0.0.1:3001/docs` |
| Backend debug port | `9231` |
| Docker project name | `sem-sw-ticket-system` |
| Required Node.js | `20.19.x` |

Run:

```text
npm run workspace:refresh
```

to verify the platform path and local development environment.

## Common platform resolution

The repository expects `common-platform` to contain the SEM common platform packages.

Resolution order:

1. Existing valid `./common-platform`.
2. `SEM_PLATFORM_SOURCE_ROOT`.
3. Sibling checkout at `../sem_sw_common_web_platform`.

Useful commands:

```text
npm run platform:status
npm run platform:link
npm run platform:adopt
```

`platform:adopt` replaces an existing clean platform directory with a junction to the reusable source. It refuses to replace a dirty platform worktree.

## Workspace scripts

| Script | Purpose |
| --- | --- |
| `npm run deps:install` | Install dependencies across workspaces |
| `npm run deps:ci` | Clean CI-style dependency install, then explicit platform refresh/build |
| `npm run dev` | Build shared, then run backend and frontend together |
| `npm run build` | Build shared, backend, and frontend |
| `npm run test` | Run workspace tests when present |
| `npm run verify` | Run tests, then the full build |
| `npm run verify:release` | Run `verify`, then enforce release-oriented frontend budget checks |
| `npm run smoke` | Check a running local frontend/backend pair |
| `npm run smoke:deployment` | Check deployed frontend/backend URLs from explicit smoke env vars |
| `npm run budget:frontend` | Enforce frontend JS/CSS production bundle budgets after build |
| `npm run check:production-env` | Validate production env vars for unsafe or placeholder values |
| `npm run check:environment-matrix` | Detect incomplete staging/production infrastructure, database, secret, observability, backup, rollback, smoke, and approval evidence |
| `npm run check:product-profile` | Detect incomplete product identity, ownership, runtime, role, route, database, and approval records |
| `npm run check:productization` | Detect unreplaced template placeholders in a derived product |
| `npm run check:release-evidence` | Detect incomplete release, security, and operations evidence records |
| `npm run check:test-evidence` | Detect incomplete release-candidate test evidence records |
| `npm run check:launch-readiness` | Detect incomplete final commercial launch approval evidence |
| `npm run prepare:https` | Generate local HTTPS assets when the workflow needs them |

## Local smoke checks

`npm run smoke` reads the same local defaults and env overrides as the dev servers. It checks:

- the frontend app route `/overview/dashboard`;
- the frontend proxy route `/api/auth/me`;
- the backend platform API route `/api/auth/me`;
- the backend Swagger route `/docs`.

Unauthenticated API checks accept `200`, `401`, or `403`; this proves the platform API path is reachable even when an environment adds protection.

Useful overrides:

```powershell
$env:DEV_FRONTEND_PORT = "5174"
$env:DEV_BACKEND_PORT = "3002"
npm run smoke
```

You can also bypass local-default resolution:

```powershell
$env:SMOKE_FRONTEND_URL = "http://127.0.0.1:5174"
$env:SMOKE_BACKEND_URL = "http://127.0.0.1:3002"
npm run smoke
```

## Backend config notes

`backend/src/main.ts` reads:

| Key | Fallback |
| --- | --- |
| `TICKET_SYSTEM_BACKEND_PORT` | `DEV_BACKEND_PORT`, then `3001` |
| `TICKET_SYSTEM_BACKEND_HOST` | `DEV_BACKEND_BIND_HOST`, `DEV_BACKEND_HOST`, then `0.0.0.0` |
| `API_PREFIX` | `api` |
| `CORS_ORIGIN` | `http://127.0.0.1:5173` |

Platform backend setup also receives:

- `runtimeProjectName=sem_sw_ticket_system`
- `emailProductName=SEM SW Ticket System`
- default master seed: `master@localhost` / `master`

Derived products should replace these names and seed values before production use.

## Frontend config notes

`frontend/vite.config.ts` reads local defaults and root env overrides for:

| Key | Purpose |
| --- | --- |
| `DEV_FRONTEND_HOST` | browser-visible frontend host |
| `DEV_FRONTEND_BIND_HOST` | Vite bind host |
| `DEV_FRONTEND_PORT` | Vite port |
| `DEV_BACKEND_PROTOCOL` | backend proxy protocol |
| `DEV_BACKEND_HOST` | browser-visible backend host |
| `DEV_BACKEND_PROXY_HOST` | Vite proxy backend host |
| `DEV_BACKEND_PORT` | backend proxy port |
| `DEV_BACKEND_API_PREFIX` | proxied API prefix |
| `DEV_BACKEND_SWAGGER_PROTOCOLS` | comma-separated Swagger server protocols only when matching listeners or proxies exist |
| `DEV_SYNCED_STORAGE_ROOTS` | semicolon- or comma-separated local synced-storage root paths for the dependency guard |
| `DEV_SYNCED_STORAGE_SEGMENTS` | semicolon- or comma-separated fallback path segment names for synced-storage detection |

The Vite config also injects package and dependency metadata for platform information screens.

## Windows local development guard

`scripts/assert-local-dev-env.cjs` enforces:

- Windows-only local development.
- Node.js `20.19.x`.
- `x64` or `arm64`.
- Machine-local dependency roots for synced storage workspaces.

Use the repository scripts instead of raw package commands when working inside synced storage.
Synced roots are discovered from available OS/client metadata where possible. For clients that do not publish a discoverable root, set `DEV_SYNCED_STORAGE_ROOTS` to the local sync root, or `DEV_SYNCED_STORAGE_SEGMENTS` to a distinctive path segment.

For clean installs, prefer `npm run deps:ci` over raw `npm ci`. The project script installs packages with lifecycle scripts disabled first, then runs the platform refresh/build step explicitly so Windows x64 and ARM64 layouts use the same deterministic path.

## Config placement rules

- Shared host, port, protocol, Docker, and browser viewport defaults belong in root development env or `scripts/local-dev-defaults.json`.
- Backend secrets, DB credentials, session secrets, SMTP secrets, and seed passwords belong outside source control.
- Frontend-only browser flags should use Vite `VITE_*` keys.
- New product-specific config keys should be documented here when introduced.
