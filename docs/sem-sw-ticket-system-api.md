# SEM SW Ticket System API

Swagger UI is available in local development when Swagger is enabled:

```text
http://127.0.0.1:3001/docs
```

The default API base URL is:

```text
http://127.0.0.1:3001/api
```

The frontend Vite dev server proxies `/api/*` to the backend using the values in `scripts/local-dev-defaults.json` and the active root `DEV_*` environment overrides. Local development serves Swagger over HTTP by default. Add an HTTPS listener or reverse proxy before using an `https://` Swagger URL.

## Platform APIs

Authentication, sessions, users, audit, settings, theme, RDB admin, log trace, system information, email inquiry, and common app-shell APIs are provided by `@sem/platform-backend`.

This template must not duplicate those platform contracts. When a future application needs to change platform behavior, prefer extending the common platform package or adding an app-specific route that composes platform services.

## App-specific API

No app-specific API is currently defined in this template baseline. Future products should add feature routes under `backend/src/<feature>` and document their endpoint table and DTO shapes here.

## Extension rules

- Add new app-specific APIs under `backend/src/<feature>`.
- Define shared DTOs in `shared/src` before frontend and backend implementations diverge.
- Keep authentication and role checks explicit on controllers.
- Keep master/admin-only mutation routes protected with platform guards.
- Keep generated Swagger output useful by adding DTO decorators when a future feature becomes more than a placeholder.
- Do not add EC, Permit, or product-specific endpoints to this template baseline.
