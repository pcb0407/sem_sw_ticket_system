# SEM SW Ticket System TDD Guide

The template currently has a small behavioral surface. Test coverage should grow with each product feature that is derived from it.

## Current validation commands

From the repository root:

```text
npm run verify
npm run build
npm run test
npm run smoke
```

`npm run verify` runs tests and then the full build. `npm run smoke` checks a running local frontend/backend pair. `npm run test` delegates to workspace test scripts. The template includes package-level tests for shared contract normalization, backend DTO/service behavior, and frontend API path wiring. New feature work should add package-level tests instead of relying only on a root build.

## Test ownership

| Layer | Test focus |
| --- | --- |
| `shared` | DTO shape, enum exports, serialization helpers |
| `backend` | controller guards, service behavior, repository boundaries, migrations |
| `frontend` | page composition, route behavior, API integration states, accessibility-critical interactions |
| `scripts` | platform linking and local environment guards when logic becomes complex |

## Backend test expectations

Add backend tests when:

- a new controller route is introduced;
- role or guard behavior changes;
- a service mutates database state;
- migrations are added or changed;
- platform services are composed in app-specific ways.

Recommended cases for the current sample module if it becomes more than a placeholder:

- list returns records newest first;
- read returns `404` for a missing id;
- create/update/delete require `UserRole.Master`;
- DTO validation rejects empty or overlong values;
- migration creates the intended unique index.

## Frontend test expectations

Add frontend tests when:

- the dashboard gains real product widgets;
- navigation expands beyond `Overview > Dashboard`;
- API loading, empty, error, or permission states become user-visible;
- forms or filters are introduced;
- local storage keys or screenshot/export behavior changes.

## TDD workflow

1. Write or update the shared DTO first.
2. Add the backend test that describes the API behavior.
3. Implement the backend service/controller/migration.
4. Add the frontend test for the user-visible state.
5. Implement the frontend view.
6. Run the package test, then the root build.
7. Update the docs that describe the changed behavior.

## Template guardrails

- Do not add EC or Permit tests to this repository.
- Keep tests focused on reusable starter behavior and the current sample module.
- When a derived product replaces the sample module, replace this guide's examples with product-specific critical paths.
