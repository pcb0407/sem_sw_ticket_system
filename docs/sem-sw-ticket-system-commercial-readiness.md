# SEM SW Ticket System Commercial Readiness

Status date: 2026-06-28

## Current readiness

Commercial product readiness: 92%

This repository is commercially useful as a starter template, but it is not yet a 100% commercial product by itself. Environment-specific deployment proof is now explicit through [environment matrix evidence](sem-sw-ticket-system-environment-matrix.json) and `npm run check:environment-matrix`; the final launch gate remains explicit through [launch readiness evidence](sem-sw-ticket-system-launch-readiness.md) and `npm run check:launch-readiness`. The remaining gap is mostly external to template code: product identity, production infrastructure, real database/runtime validation, security signoff, operational ownership, and end-to-end acceptance evidence for a derived application.

## Path to 100%

| Readiness area | Current state | Required to reach 100% | Gap category |
| --- | --- | --- | --- |
| Functional scope | Starter dashboard, platform composition, and package tests are in place; `npm run check:productization` can detect unreplaced template identity in derived products; `npm run check:product-profile` can reject incomplete product identity, owner, route, role, runtime, database, and approval records. | Replace placeholder template shell with product-specific workflows, roles, copy, navigation, and critical user journeys. | code, UX, data |
| Verification | `npm run verify` passes locally; package tests cover the template's current behavioral surface; `npm run smoke:deployment` can verify deployed staging/production URLs; GitHub Actions is configured to run `npm run verify:release`; `npm run check:test-evidence` can reject incomplete release-candidate test evidence; `npm run check:launch-readiness` can reject incomplete final approval evidence. | Add product e2e tests, accessibility checks, browser coverage, migration tests, and authenticated smoke coverage in a production-like environment. | test, UX |
| Runtime and database | ARM64 Windows local verify passes; dependency install repairs npm-created platform scaffolds and postinstall re-aligns platform output junctions before hash-match skips; `npm run check:environment-matrix` can reject incomplete staging/production URL, DNS, TLS, database, secret-store, observability, backup, restore, migration, rollback, and approval evidence. | Validate Windows x64 on a native/hosted x64 runner, then validate the derived product against the production database engine, migrations, connection pooling, backup/restore, and rollback paths. | deployment, data, environment |
| Security | Baseline production security checklist exists; `npm run check:production-env` can reject unsafe production environment settings; [security review record](sem-sw-ticket-system-security-review.md) defines required signoff evidence. | Complete threat review, secret-store integration, dependency review, auth/RBAC acceptance, audit-log verification, and signed security review evidence. | security, deployment |
| Performance | Production build succeeds; `npm run budget:frontend` enforces initial frontend JS/CSS bundle budgets. | Run backend load tests, capture frontend Core Web Vitals for critical paths, and tune or approve any product-specific budget changes. | performance, UX |
| Operations | Deployment notes describe the recommended production shape; release checklist includes a rollback runbook; [operations runbook](sem-sw-ticket-system-operations-runbook.md) defines ownership, incident, and restore-drill evidence. | Define real owners, health checks, logging, metrics, alerts, incident response, backup cadence, and environment-specific support procedures. | documentation, deployment |
| Release readiness | Build artifacts are documented; [release readiness checklist](sem-sw-ticket-system-release-readiness.md) defines release evidence and deployment smoke checks; [environment matrix](sem-sw-ticket-system-environment-matrix.json) defines staging/production infrastructure evidence; [launch readiness record](sem-sw-ticket-system-launch-readiness.md) defines the 100% approval evidence; `.github/workflows/release-readiness.yml` provides the release verification workflow; `npm run check:release-evidence`, `npm run check:environment-matrix`, and `npm run check:launch-readiness` can reject incomplete productization profile, environment, release, security, operations, and launch approval records. | Produce a real environment-specific completed checklist, deployment pipeline, artifact retention policy, and go/no-go approval record. | deployment, documentation |

## Score roadmap

Use this sequence to move the score toward 100%. Do not advance a milestone until its evidence exists in the repository, CI system, staging environment, or production operations record.

| Target score | Milestone | Evidence required |
| --- | --- | --- |
| 85% | Release enforcement baseline complete | CI workflow is configured for `npm run verify:release`; manual deployment smoke can be run from the release-readiness workflow; release checklist documents required evidence. |
| 86% | Security and operations evidence templates complete | Security review record and operations runbook exist and are linked from release readiness evidence. |
| 87% | Productization gate available | `npm run check:productization` detects unreplaced template names, sample route/entity names, placeholder domains, and default seed identity. |
| 88% | Release evidence gate available | `npm run check:release-evidence` detects incomplete release checklist, security review, and operations runbook records. |
| 89% | Test evidence gate available | `npm run check:test-evidence` detects incomplete unit, release, productization, env, smoke, e2e, accessibility, migration, and performance evidence. |
| 90% | Product profile gate available | `npm run check:product-profile` detects incomplete product identity, owners, route/entity naming, database, secret-store, role model, critical journey, and productization approval records. |
| 91% | Launch readiness gate available | `npm run check:launch-readiness` detects incomplete final launch approval evidence before any 100% readiness claim. |
| 92% | Environment matrix gate available | `npm run check:environment-matrix` detects incomplete staging/production URL, DNS, TLS, hosting, database, secret-store, observability, backup, restore, migration, rollback, smoke, and approval evidence. |
| 93% | Productization complete | Product profile is approved; placeholder names, seed identity, navigation labels, cookie names, database names, and user-facing copy are replaced for the derived product. |
| 94% | Test confidence complete | CI runs unit, integration, e2e, accessibility, migration, and smoke checks on every release candidate with completed test evidence. |
| 95% | Security review complete | Secrets, cookies, CORS, Swagger exposure, dependency risk, RBAC, audit logging, and incident rotation steps are reviewed and signed off. |
| 97% | Production-like validation complete | Staging uses the target database engine, HTTPS routing, production-style environment variables, health checks, logs, metrics, backups, and rollback rehearsal. |
| 100% | Commercial launch ready | Product owner approves acceptance tests, release checklist, deployment pipeline, monitoring, support handover, incident ownership, and rollback plan. |

## Immediate backlog

These are the highest-leverage next steps for improving readiness from 92%:

- Complete the environment matrix and make `npm run check:environment-matrix` pass.
- Complete the productization profile and make `npm run check:product-profile` pass.
- Replace template identity in a derived product and make `npm run check:productization` pass.
- Run `npm run deps:ci` and `npm run verify:release` on a native or hosted Windows x64 runner and archive the passing run URL in release evidence.
- Complete release, security, and operations evidence records and make `npm run check:release-evidence` pass.
- Complete the test evidence record and make `npm run check:test-evidence` pass.
- Complete the launch readiness record and make `npm run check:launch-readiness` pass before reporting 100%.
- Add product-specific e2e tests for login, role-gated navigation, primary workflows, and dashboard states.
- Run the GitHub Actions release-readiness workflow on a clean hosted runner and archive the passing run URL in release evidence.
- Run the manual deployment smoke job against staging after deployment and archive the run URL.
- Complete a production environment checklist with real secret names, DNS records, TLS/certificate ownership, database backup policy, and rollback command.
- Complete the security review record with real dependency scan, RBAC, audit-log, seed-data, and incident-response evidence.
- Define backend API latency budgets and run load tests against staging.
- Complete the operations runbook with real owners, channels, dashboards, restore-drill evidence, and secret-rotation procedures.

## 100% readiness gate

Before reporting a derived product as 100% ready, all of the following must be true:

- `npm run verify` passes on a clean machine-local dependency layout.
- `npm run check:environment-matrix` passes against completed staging and production evidence.
- `npm run check:launch-readiness` passes against a completed launch readiness record.
- Local smoke tests pass against a running frontend/backend pair.
- CI repeats the test, build, migration, security, and e2e gates without relying on a developer workstation.
- Production secrets are stored outside the repository and rotated from documented runbooks.
- Production database migrations have been applied and rollback-tested against a staging clone.
- The frontend and backend have passed acceptance tests for the product's real roles and critical journeys.
- Monitoring, alerts, logs, backups, restore drills, and incident owners are in place.
- Deployment, rollback, support, and handover documentation are approved by the product owner.

## Reporting rule

Do not report this template or a derived product as 100% commercially ready until external deployment and operational checks have actually been completed. If code and tests are complete but production access, DNS, VPN, secrets, or database credentials are unavailable, report the implemented portion as complete and list the external blocker in the readiness gap.
