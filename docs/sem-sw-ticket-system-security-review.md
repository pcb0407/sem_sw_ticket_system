# SEM SW Ticket System Security Review Record

Use this record for each derived product release candidate. Replace every `TBD` value with environment-specific evidence before go-live.

## Review identity

| Field | Value |
| --- | --- |
| Product name | TBD |
| Release version | TBD |
| Commit SHA | TBD |
| Environment | staging / production |
| Security reviewer | TBD |
| Review date | TBD |
| Decision | pending / approved / approved with exceptions / rejected |

## Required evidence

| Area | Evidence to attach | Status |
| --- | --- | --- |
| Dependency review | `npm audit` or organization-approved dependency scan result, plus accepted exceptions. | TBD |
| Secret handling | Secret-store names for `SESSION_SECRET`, `JWT_SECRET`, DB credentials, SMTP credentials, and seed credentials. | TBD |
| Production env | Passing `npm run check:production-env` output for the target environment. | TBD |
| Authentication | Login/session behavior verified for supported roles and timeout policy. | TBD |
| Authorization | RBAC acceptance evidence for user, admin, and master-only routes. | TBD |
| Cookies and CORS | `COOKIE_SECURE`, SameSite, session cookie name, and `CORS_ORIGIN` reviewed for production. | TBD |
| Swagger exposure | Swagger disabled or protected according to production policy. | TBD |
| Audit logging | Login, authorization failure, and write-path audit events visible in the target log store. | TBD |
| Seed data | Template seed account replaced, removed, or rotated with production-only credentials. | TBD |
| Incident response | Session/JWT secret rotation and user communication path documented. | TBD |

## Exception log

| Exception | Risk | Mitigation | Owner | Expiry |
| --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD |

## Signoff

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Product owner | TBD | pending | TBD |
| Security reviewer | TBD | pending | TBD |
| Operations owner | TBD | pending | TBD |

Do not approve production release when any required evidence is missing, any high-severity dependency issue is unmitigated, Swagger is publicly exposed without explicit approval, or production secrets are stored outside the approved secret store.
