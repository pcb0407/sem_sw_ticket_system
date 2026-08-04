# SEM SW Ticket System Operations Runbook

Use this runbook as the starting point for a derived product. Replace every `TBD` with the real owner, channel, dashboard, or procedure before production launch.

## Ownership

| Responsibility | Primary | Backup | Channel |
| --- | --- | --- | --- |
| Product owner | TBD | TBD | TBD |
| Release manager | TBD | TBD | TBD |
| Application support | TBD | TBD | TBD |
| Database owner | TBD | TBD | TBD |
| Security reviewer | TBD | TBD | TBD |
| Infrastructure owner | TBD | TBD | TBD |

## Operational surfaces

| Surface | Location | Owner | Notes |
| --- | --- | --- | --- |
| Frontend hosting | TBD | TBD | Static artifact or app host. |
| Backend hosting | TBD | TBD | Node/Nest runtime host. |
| Database | TBD | TBD | Managed database, backup, and restore owner. |
| Secret store | TBD | TBD | Session, JWT, DB, SMTP, and seed secrets. |
| Logs | TBD | TBD | Application, access, audit, and platform logs. |
| Metrics | TBD | TBD | Availability, latency, error rate, saturation. |
| Alerts | TBD | TBD | Pager/channel, severity mapping, escalation. |

## Routine checks

- Confirm `Release Readiness / Verify Release Gate` passes for the release commit.
- Confirm `npm run smoke:deployment` passes after staging and production deployment.
- Confirm authenticated critical-path smoke checks pass for the product's real roles.
- Confirm audit logs capture login, authorization failure, and write-path activity.
- Confirm frontend bundle and backend latency remain inside approved performance budgets.
- Confirm latest database backup completed and the most recent restore drill is documented.

## Incident response

1. Triage severity, affected environment, customer impact, and data impact.
2. Assign incident commander and communication owner.
3. Freeze deployments for the affected product.
4. Preserve relevant application logs, audit logs, deployment records, and database change records.
5. Apply rollback, mitigation, or feature disablement according to the release readiness checklist.
6. Rotate session/JWT secrets if credential or token exposure is suspected.
7. Record timeline, root cause, corrective actions, owners, and due dates.

## Restore drill

Run a restore drill before production launch and at the cadence required by the product owner:

1. Select the backup point and target restore environment.
2. Restore database backup without overwriting production.
3. Run migrations forward to the current release if needed.
4. Run product critical-path checks against the restored environment.
5. Record restore duration, data freshness, failures, and remediation items.

## Release rollback

Follow the rollback runbook in [release readiness checklist](sem-sw-ticket-system-release-readiness.md). This operations runbook owns the real contact names, channels, dashboards, and database restore procedures used by that rollback.
