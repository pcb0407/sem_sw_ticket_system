# SEM SW Ticket System Deployment Notes

## Planning status

- This repository is a starter template, not a deployed product.
- Production names, domains, Azure resources, and database targets must be chosen by the application that is created from the template.
- Replace every `ticket-system`, `example`, and `contoso` placeholder before deploying a derived application.

## Recommended production shape

Prefer a same-origin HTTPS frontend:

```text
Frontend public URL: https://example.contoso.com
Preferred API URL:   https://example.contoso.com/api
```

Route `/api/*` to the NestJS backend through Azure Front Door, Application Gateway, Azure Static Web Apps routing, App Service reverse proxy, or an equivalent edge layer.

Use a separate backend public host only when infrastructure policy requires it; otherwise keep frontend, API, and Swagger behind the same HTTPS origin.

## Build

Run the root build from the repository root:

```text
npm run build
```

The build sequence refreshes the platform path, installs local platform packages, builds `shared`, then builds `backend` and `frontend`.

For release-candidate evidence, use the [release readiness checklist](sem-sw-ticket-system-release-readiness.md) and run the deployment smoke check after staging or production deployment:

```text
npm run smoke:deployment
```

Run release checks before deployment:

```text
npm run verify:release
npm run check:production-env
```

The GitHub Actions workflow `.github/workflows/release-readiness.yml` runs the release verification gate on pull requests and mainline pushes, and can run deployment smoke checks manually against explicit staging or production URLs.

Before production launch, complete the [security review record](sem-sw-ticket-system-security-review.md) and [operations runbook](sem-sw-ticket-system-operations-runbook.md) with real environment evidence and owners.
Also complete the [productization profile](sem-sw-ticket-system-productization-profile.json) so release reviewers can verify the derived product's identity, owners, runtime URLs, database target, role model, critical journeys, and productization approval.
Complete the [environment matrix](sem-sw-ticket-system-environment-matrix.json) and make `npm run check:environment-matrix` pass so staging and production URLs, DNS/TLS ownership, hosting, database, secret-store, observability, backup/restore, rollback, and smoke evidence are reviewable together.
Before reporting 100% commercial readiness, complete the [launch readiness record](sem-sw-ticket-system-launch-readiness.md) and make `npm run check:launch-readiness` pass.

## Runtime artifacts

| Workspace | Artifact | Notes |
| --- | --- | --- |
| `shared` | `shared/dist` | CJS and ESM package output consumed by app workspaces |
| `backend` | `backend/dist` | NestJS server entrypoint is `backend/dist/main.js` |
| `frontend` | `frontend/dist` | Static Vite assets |

## Backend production environment

Recommended minimum backend settings:

```dotenv
NODE_ENV=production
PORT=5000
API_PREFIX=api
SWAGGER_ENABLED=false
CORS_ORIGIN=https://example.contoso.com

COOKIE_SECURE=true
COOKIE_SAMESITE=lax
SESSION_COOKIE_NAME=sem_sid
SESSION_SECRET=<set-in-secret-store>
JWT_SECRET=<set-in-secret-store>

DB_TYPE=mssql
DB_HOST=<app-db-host>
DB_PORT=1433
DB_NAME=<app-db-name>
DB_USER=<app-db-user>
DB_PASSWORD=<set-in-secret-store>
DB_SYNCHRONIZE=false
```

For disposable local development, SQLite is acceptable. For shared or production environments, use a managed server database and migrations.

## Frontend production environment

When the edge routes `/api` on the same public origin:

```dotenv
VITE_API_BASE_URL=/api
```

When infrastructure policy requires a separate HTTPS backend host, set the full API URL explicitly:

```dotenv
VITE_API_BASE_URL=https://<backend-host>/api
```

## Security checklist

- Set `NODE_ENV=production`.
- Set `DB_SYNCHRONIZE=false`.
- Serve browser traffic only over HTTPS.
- Set `COOKIE_SECURE=true`.
- Disable Swagger or protect it behind authenticated infrastructure.
- Restrict `CORS_ORIGIN` to the production frontend origin.
- Store `SESSION_SECRET`, `JWT_SECRET`, DB passwords, SMTP passwords, and seed passwords only in a secret store.
- Replace or remove the template seed identity before go-live.
- Rotate session secrets after incidents; this invalidates existing sessions.

## Template-to-product checklist

- Rename package names, product display names, cookie names, database names, and runtime project names.
- Replace starter dashboard content with product-specific modules.
- Review role requirements for every app-specific route.
- Add production migrations for the app-specific schema.
- Update this document with the real resource names and operational owners.
