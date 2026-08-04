# SEM SW Ticket System Test Evidence Record

Use this record for each derived product release candidate. Replace every `TBD`, `pending`, and `not run` value with actual evidence before release approval.

## Test run identity

| Field | Value |
| --- | --- |
| Product name | TBD |
| Release version | TBD |
| Commit SHA | TBD |
| Environment | staging / production |
| Test owner | TBD |
| Test date | TBD |
| Overall decision | pending |

## Required test evidence

| Gate | Command or source | Required evidence | Status |
| --- | --- | --- | --- |
| Dependency install | `npm run deps:ci` | Hosted CI run URL or captured log. | not run |
| Unit and package tests | `npm run test` | CI run URL and package summaries. | not run |
| Release verification | `npm run verify:release` | CI run URL for the release commit. | not run |
| Product profile | `npm run check:product-profile` | Passing output after derived product identity, owners, runtime, database, roles, journeys, and approval are recorded. | not run |
| Productization | `npm run check:productization` | Passing output from the derived product. | not run |
| Production env | `npm run check:production-env` | Passing output with target env vars loaded from the deployment system. | not run |
| Environment matrix | `npm run check:environment-matrix` | Passing output after staging and production deployment evidence is recorded. | not run |
| Release evidence | `npm run check:release-evidence` | Passing output after productization profile, environment matrix, release, security, and operations records are completed. | not run |
| Deployment smoke | `npm run smoke:deployment` | Passing staging and production smoke run URLs. | not run |
| Auth and RBAC e2e | Product-specific e2e suite | Login, logout, role-gated navigation, unauthorized route, and master-only workflow evidence. | TBD |
| Accessibility | Product-specific accessibility suite | Keyboard navigation, focus order, contrast, labels, and critical screen-reader checks. | TBD |
| Migration | Product-specific migration test | Forward migration and rollback rehearsal against staging clone. | TBD |
| Backend performance | Product-specific load test | Latency, error-rate, and saturation results for critical API routes. | TBD |
| Frontend performance | Browser or synthetic measurement | Core Web Vitals or equivalent results for critical routes. | TBD |

## Exception log

| Exception | Risk | Mitigation | Owner | Expiry |
| --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD |

## Signoff

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Test owner | TBD | pending | TBD |
| Product owner | TBD | pending | TBD |
| Release owner | TBD | pending | TBD |
