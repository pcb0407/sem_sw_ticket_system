# GitHub Copilot Instructions

This project is the SEM SW Ticket System system.  
Use this file only for project-specific working rules. Global quality, security, testing, and reporting standards are defined in [AGENTS.md](../AGENTS.md).

## Response Style

- Keep responses focused on core outcomes to minimize output tokens.
- Provide additional details only when explicitly requested.

## Project-Specific Rules

- Preserve the application layering and data flow: DB -> API -> Web.
- Keep module boundaries explicit between `shared`, `backend`, and `frontend`.
- Define or update backend contracts before adding frontend-only workaround logic.
- Prefer existing project modules, DTOs, services, hooks, and components before creating new ones.
- Keep internal application data isolated from external or read-only data sources.

## Prelaunch / Debug Changes

- Any change under `.vscode/`, `.vscode/scripts/`, or `common-platform/scripts/apphost/` must follow the guardrails in [AGENTS.md](../AGENTS.md).

