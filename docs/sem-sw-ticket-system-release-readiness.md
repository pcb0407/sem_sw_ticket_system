# SEM SW Ticket System Release Readiness Checklist

Use this checklist when turning the template into a deployable product. Keep one completed copy per release candidate in the derived product's release records.

## Release candidate identity

| Field | Value |
| --- | --- |
| Product name | TBD |
| Release version | TBD |
| Commit SHA | TBD |
| Environment | staging / production |
| Release owner | TBD |
| Product approver | TBD |
| Operations owner | TBD |

## Pre-release gate

- Product placeholders are replaced: package names, display names, seed identity, cookie names, database names, domains, and user-facing copy.
- [Productization profile](sem-sw-ticket-system-productization-profile.json) is complete and `npm run check:product-profile` passes.
- `npm run check:productization` passes after the derived product replaces template names, seed identity, sample routes, and placeholder domains.
- `npm run deps:ci` passes from a clean checkout on the target Windows architecture.
- `npm run verify` passes from a clean checkout and machine-local dependency layout.
- `npm run verify:release` passes after the production build and frontend budget check.
- GitHub Actions `Release Readiness / Verify Release Gate` passes for the release commit.
- `npm run check:production-env` passes with the target environment variables loaded from the secret store or deployment system.
- [Environment matrix](sem-sw-ticket-system-environment-matrix.json) is complete for staging and production, and `npm run check:environment-matrix` passes.
- Product-specific unit, integration, e2e, accessibility, migration, and smoke checks pass in CI.
- Production environment variables are reviewed against [deployment notes](sem-sw-ticket-system-deployment.md).
- Production secrets exist in the target secret store and are not present in repository files, CI logs, release notes, or local env examples.
- [Security review record](sem-sw-ticket-system-security-review.md) is complete and signed off.
- [Operations runbook](sem-sw-ticket-system-operations-runbook.md) has real owners, channels, dashboards, restore drill evidence, and escalation paths.
- `npm run check:release-evidence` passes against the completed productization profile, environment matrix, release, security, and operations records.
- [Test evidence record](sem-sw-ticket-system-test-evidence.md) is complete and `npm run check:test-evidence` passes.
- [Launch readiness record](sem-sw-ticket-system-launch-readiness.md) is complete and `npm run check:launch-readiness` passes before reporting 100% commercial readiness.
- Database migrations are reviewed, applied to staging, and rollback-tested against a recent staging clone.
- Swagger is disabled or protected in production.
- `CORS_ORIGIN`, cookie secure flags, SameSite policy, session name, and token/session secrets are production-specific.
- Dependency audit and license review outcomes are recorded.
- Performance budgets are reviewed for frontend bundle size and backend API latency.

## Deployment smoke check

The checked-in `Release Readiness` workflow can run this smoke check manually through `workflow_dispatch` when `frontend_url` and `backend_url` are provided.

Run the deployment smoke check after staging deployment and again after production deployment:

```powershell
$env:DEPLOY_SMOKE_FRONTEND_URL = "https://example.contoso.com"
$env:DEPLOY_SMOKE_BACKEND_URL = "https://example.contoso.com"
$env:DEPLOY_SMOKE_API_PREFIX = "api"
$env:DEPLOY_SMOKE_SWAGGER_PATH = "docs"
npm run smoke:deployment
```

When infrastructure policy requires a separate backend host, set the backend URL to that approved HTTPS origin:

```powershell
$env:DEPLOY_SMOKE_FRONTEND_URL = "https://example.contoso.com"
$env:DEPLOY_SMOKE_BACKEND_URL = "https://<backend-host>"
npm run smoke:deployment
```

By default, `smoke:deployment` expects Swagger to be protected or unavailable and accepts `401`, `403`, or `404` for the Swagger route. If a staging environment intentionally exposes Swagger, set:

```powershell
$env:DEPLOY_SMOKE_EXPECT_SWAGGER_PUBLIC = "1"
```

## Post-deployment validation

- Frontend route renders through HTTPS.
- Frontend `/api` route reaches the backend or protected API boundary.
- Backend API route responds as present and protected.
- Swagger exposure matches the environment policy.
- Database connectivity is verified by an authenticated critical-path workflow.
- Audit logs capture login, authorization, and write-path activity.
- Metrics, logs, and alerts are visible to the operations owner.
- Backup schedule is enabled and the latest restore drill result is attached to release evidence.

## Rollback runbook

1. Announce rollback decision, affected environment, and release candidate in the operations channel.
2. Stop new deployments for the affected product.
3. Restore the previous frontend artifact or static-site version.
4. Restore the previous backend artifact or app-service slot.
5. If migrations changed data or schema, execute the approved rollback migration or restore from the approved backup point.
6. Rotate secrets only if the release exposed or mishandled secret material.
7. Run `npm run smoke:deployment` against the rolled-back environment.
8. Record root cause, customer impact, data impact, final artifact versions, and follow-up owners.

## Go/no-go decision

The release can be promoted only when every required pre-release, deployment smoke, post-deployment, and rollback-readiness item is complete or explicitly waived by the product owner and operations owner. Do not report 100% commercial readiness until the launch readiness record is complete and `npm run check:launch-readiness` passes.
