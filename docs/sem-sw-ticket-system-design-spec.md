# SEM SW Ticket System Design Spec

See the project root [README](../README.md) for quick start and current workspace/runtime details.

This document is the planning and design reference for the SEM SW Ticket System. It follows the same role as a product design-spec document, but its purpose is to preserve a clean baseline for future SEM SW web applications.

## Document role

- Use this file as the single source of truth for template scope, architecture boundaries, API shape, and extension expectations.
- Update this file when template behavior, package boundaries, navigation, security assumptions, or platform integration changes.
- Keep environment-specific details in [sem-sw-ticket-system-developer-config.md](sem-sw-ticket-system-developer-config.md) and deployment details in [sem-sw-ticket-system-deployment.md](sem-sw-ticket-system-deployment.md).

## Goals

- Provide a starter full-stack SEM SW web application.
- Reuse `@sem/platform-shared`, `@sem/platform-backend`, and `@sem/platform-frontend`.
- Keep platform features available without copying their implementation into app code.
- Provide starter dashboard composition and clear extension points for app-specific modules.
- Give future apps a safe place to replace placeholder content with product-specific features.

## Non-goals

- This template does not implement Engineering Change tracking.
- This template does not implement Permit workflows.
- This template does not include product-specific database integrations.
- This template does not own common platform features such as auth, user management, theme management, audit, RDB admin, log trace, information, or about pages.

## Repository layout

```text
sem_sw_ticket_system
|- common-platform
|- applications
|- backend
|- frontend
|- shared
|- docs
`- scripts
```

Recommended ownership:

| Area | Owns |
| --- | --- |
| `common-platform` | Reusable SEM platform packages, preferably linked to `../sem_sw_common_web_platform` |
| `shared` | App DTOs and app exports for future product-specific contracts |
| `backend` | NestJS app composition, app modules, app entities, app migrations |
| `frontend` | React app composition, app-specific pages, and dashboard wiring |
| `scripts` | Workspace setup, platform linking, local runtime guards, local HTTPS helpers |
| `docs` | Template planning, API, configuration, deployment, design-token, and TDD guidance |

## Technology stack

| Layer | Stack |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router, TanStack Query, Axios, Tailwind CSS |
| Backend | NestJS, TypeScript, TypeORM, Swagger/OpenAPI, platform session auth |
| Shared | TypeScript DTOs and exports |
| Platform | `@sem/platform-shared`, `@sem/platform-backend`, `@sem/platform-frontend` |

## Current template scope

In scope:

- Main navigation: `Overview > Dashboard`
- Platform app shell and common navigation framework
- Starter dashboard cards and placeholder copy
- Verification gate (`npm run verify`) and local smoke check (`npm run smoke`)
- Local Windows developer workflow and common-platform linking

Out of scope:

- EC dashboard, EC detail, EC settings, EC CSV export, EC databases
- Permit dashboard, Permit detail, Permit databases
- Any application-specific production workflow

## Architecture principles

- App code composes platform packages; it does not fork platform behavior.
- Shared DTOs should live in `shared` before duplicated frontend/backend types appear.
- Backend owns app data access and migrations.
- Frontend owns product composition and app-specific page wiring.
- New product work should add product-specific features intentionally instead of reviving placeholder sample domains.
- Documentation is part of the template contract and should change with material behavior.

## Authentication and authorization

Authentication, sessions, users, roles, and common admin surfaces are provided by the platform backend. Future application modules should declare guards and role requirements explicitly on their controllers.

## Data model

No app-specific table is currently defined in this template baseline. Derived products should add their own entities and migrations with production rollback expectations documented beside the feature.

## Frontend composition

The frontend renders `PlatformAppShell` from `@sem/platform-frontend/app` with a small app-owned navigation tree:

- `Overview > Dashboard`

Template-specific values are held in `frontend/src/App.tsx`:

- product name, tag, and root breadcrumb label
- storage key and screenshot file prefixes
- starter dashboard cards

When creating a product from this template, replace these values first so generated screenshots, local storage keys, breadcrumbs, and visible product names no longer identify the template.

## Extension path for new apps

1. Rename package names and display names.
2. Add the first product feature under app-owned frontend, backend, and shared modules.
3. Move product DTOs into `shared/src`.
4. Add frontend pages or feature modules that compose platform layout components.
5. Update API, config, deployment, and TDD docs as behavior becomes product-specific.
6. Remove template-only placeholder copy after the product has a real first screen.
