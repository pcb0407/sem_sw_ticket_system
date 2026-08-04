# SEM SW Ticket System

Starter web application template for future SEM SW apps. Built on the [SEM SW common web platform](./common-platform/README.md) and able to reuse a sibling `sem_sw_common_web_platform` checkout through the local `common-platform` path.

## Status

**Phase 1 common template baseline.** Common platform packages are wired up and consumable, and the app now keeps app-owned behavior to the starter dashboard and platform composition. This repository is intended to serve as the baseline template for future SEM SW web applications.

## Repository layout

```text
sem_sw_ticket_system/
|- common-platform/ # local common platform workspace path, either checked out here or linked to ../sem_sw_common_web_platform
|- shared/          # @ticket-system/shared - reserved for future app DTOs/shared contracts
|- backend/         # @ticket-system/backend - NestJS app composing @sem/platform-backend
|- frontend/        # @ticket-system/frontend - React app composing @sem/platform-frontend + starter pages
|- package.json     # npm workspaces root
`- README.md
```

## Common platform via submodule

The reusable platform code lives in [`./common-platform/`](./common-platform/). You can keep that path as a git submodule, or, when `../sem_sw_common_web_platform` already exists, let `npm install`, `npm run deps:install`, or `npm run platform:link` create a junction automatically so the app reuses the shared checkout instead of maintaining a second full copy. When the current `common-platform` worktree is clean and you want to replace it in-place, run `npm run platform:adopt`; it will refuse to touch the directory if there are uncommitted changes.

```text
# After cloning this repo for the first time:
git submodule update --init --recursive

# To pull the latest common platform changes later:
git submodule update --remote
```

The three platform packages are referenced as `file:` dependencies from the application workspaces:

- `@sem/platform-shared` -> `common-platform/packages/platform-shared`
- `@sem/platform-backend` -> `common-platform/packages/platform-backend`
- `@sem/platform-frontend` -> `common-platform/packages/platform-frontend`

## Template validation

Run the full static validation gate from the repository root:

```text
npm run deps:ci
npm run verify
```

`deps:ci` performs a clean dependency install and then explicitly refreshes/builds the linked platform packages. `verify` runs workspace tests and then the full shared/backend/frontend build.

For the commercial-product readiness score and the path to 100%, see
[SEM SW Ticket System Commercial Readiness](docs/sem-sw-ticket-system-commercial-readiness.md).
For release-candidate evidence and deployed-environment smoke checks, see
[SEM SW Ticket System Release Readiness Checklist](docs/sem-sw-ticket-system-release-readiness.md).
For final 100% launch approval evidence, see
[SEM SW Ticket System Launch Readiness Record](docs/sem-sw-ticket-system-launch-readiness.md).

When the app is running with `npm run dev`, run the local smoke check:

```text
npm run smoke
```

If the default ports are already in use, start and smoke the template with matching overrides:

```powershell
$env:DEV_FRONTEND_PORT = "5174"
$env:DEV_BACKEND_PORT = "3002"
npm run dev

# in another terminal with the same port overrides
$env:DEV_FRONTEND_PORT = "5174"
$env:DEV_BACKEND_PORT = "3002"
npm run smoke
```

## Template scope

### In scope

- Main navigation: `Overview > Dashboard`
- Reusable dashboard shell, placeholder workflows, and starter page composition
- Template settings/customization points for future apps

### Reused from common platform (NOT duplicated here)

- Authentication, registration, login flow, RBAC, sessions, audit, users admin
- Theme management, common settings, user profile
- Generic RDB CRUD admin, log trace, system information, about page
- Email inquiry, notifications
- App shell layout, navigation framework, sidebar/topbar/breadcrumb, API client

### Explicitly excluded

- Engineering Change (EC) module, EC dashboard, EC tracker settings, EC database pages
- Permit module, Permit dashboard, Permit database pages
- Any EC/Permit-related navigation entries or `...` menu items

## Template navigation surface

```text
Sidebar main:
- Overview
  `- Dashboard

"..." menu (Workspace / Administration / Master / Reference):
- Common Setting          (platform)
- Theme Management        (platform)
- User Management         (platform)
- Audit Logs              (platform, Master only)
- User Activity           (platform, Master only)
- RDB CRUD                (platform, Master only)
- Log Trace               (platform, Master only)
- Information             (platform, Admin only)
- About                   (platform, User+)
```

EC/Permit related settings (`Scoped DB Setting`, EC Tracker management, Permit management) are excluded from this template baseline.

## VS Code debug window reload

When VS Code needs to be reloaded before debugging, run the registered task `apphost:reload-window` from `Terminal > Run Task...`.

This task executes the same internal command as `Developer: Reload Window` without using `Ctrl + Shift + P`:

```text
cmd.exe /c start "" "vscode://command/workbench.action.reloadWindow"
```

Run it before starting the normal debug profile. Do not wire it directly into a debug `preLaunchTask`; reloading the VS Code window can interrupt the debug request that launched the task.
