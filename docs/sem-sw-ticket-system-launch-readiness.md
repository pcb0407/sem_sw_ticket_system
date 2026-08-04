# SEM SW Ticket System Launch Readiness Record

Use this record as the final commercial launch gate for a derived product. Replace every `TBD`, `pending`, and `not run` value with real evidence before reporting commercial-product readiness as 100%.

## Launch identity

| Field | Value |
| --- | --- |
| Product name | TBD |
| Release version | TBD |
| Commit SHA | TBD |
| Environment | staging / production |
| Launch owner | TBD |
| Product approver | TBD |
| Operations approver | TBD |
| Security approver | TBD |
| Launch decision | pending |

## Required 100% evidence

| Area | Required evidence | Status |
| --- | --- | --- |
| Product acceptance | Product owner approval for all critical user journeys, roles, copy, and navigation. | TBD |
| Productization | `npm run check:productization` passes for the derived product with template identity removed. | not run |
| Windows ARM64 build | `npm run deps:ci` and `npm run verify:release` pass on Windows ARM64. | not run |
| Windows x64 build | `npm run deps:ci` and `npm run verify:release` pass on native or hosted Windows x64. | not run |
| Release verification | GitHub Actions `Release Readiness / Verify Release Gate` passes for the release commit. | not run |
| Release evidence | `npm run check:release-evidence` passes against completed productization profile, environment matrix, release, security, and operations records. | not run |
| Test evidence | `npm run check:test-evidence` passes against completed release-candidate test evidence. | not run |
| Production environment | `npm run check:production-env` passes with target environment variables loaded from the deployment system. | not run |
| Environment matrix | `npm run check:environment-matrix` passes against completed staging and production evidence. | not run |
| Deployment smoke | `npm run smoke:deployment` passes against staging and production URLs. | not run |
| Database readiness | Migrations, rollback, backup policy, and restore drill are verified against a staging clone of the target database. | TBD |
| Security signoff | Security review is approved with dependency, secret-store, auth, RBAC, audit-log, and Swagger exposure evidence. | TBD |
| Performance signoff | Frontend bundle, Core Web Vitals, backend latency, error rate, and saturation are inside approved budgets or signed exceptions. | TBD |
| Observability | Logs, metrics, alerts, dashboards, and incident routing are visible to the operations owner. | TBD |
| Support handover | Support owner, escalation channel, incident response steps, and rollback owner are documented. | TBD |
| Artifact retention | Frontend, backend, migration, and release evidence artifacts are retained according to product policy. | TBD |
| Go-live approval | Product, operations, security, and release owners approve launch or explicitly record signed exceptions. | pending |

## External blockers

| Blocker | Category | Owner | Resolution evidence | Target date |
| --- | --- | --- | --- | --- |
| TBD | environment | TBD | TBD | TBD |

## Final signoff

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Product owner | TBD | pending | TBD |
| Release owner | TBD | pending | TBD |
| Operations owner | TBD | pending | TBD |
| Security owner | TBD | pending | TBD |

Do not report 100% commercial readiness while this file contains placeholders, unresolved choices, incomplete test results, or unsigned launch approvals.
