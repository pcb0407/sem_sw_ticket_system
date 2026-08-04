# SEM SW Ticket System Design Tokens

The template inherits most visual tokens from `@sem/platform-frontend`. New application UI should reuse those platform primitives instead of creating one-off color, spacing, badge, or panel styles.

## Token sources

| Surface | Source of truth | Notes |
| --- | --- | --- |
| Platform theme tokens | `common-platform/packages/platform-frontend` | Theme, shell, page, card, badge, and common component styling |
| App global CSS | `frontend/src/styles.css` | Imports and app-level overrides |
| Tailwind config | `frontend/tailwind.config.js` | Local Tailwind scanning and extension point |
| Dashboard composition | `frontend/src/App.tsx` | Template labels, badges, and starter card content |

## Usage rules

- Prefer platform components and exported token classes before adding local CSS.
- Use semantic roles such as surface, border, muted text, accent, success, warning, and danger.
- Keep app-specific CSS small and scoped to product-specific needs.
- Verify new UI in light and dark themes when the platform theme switcher is available.
- Keep button, badge, and form styling consistent with platform screens.
- Do not introduce a product-specific color system in the template baseline.

## Template dashboard tokens

The current dashboard is intentionally simple:

| Element | Current value | Replace when deriving a product |
| --- | --- | --- |
| Product name | `SEM SW Ticket System` | Yes |
| Product tag | `Web Template` | Yes |
| Storage key prefix | `ticket-system` | Yes |
| Screenshot prefix | `ticket-system` | Yes |
| Dashboard badges | `Web Template`, `Starter Baseline` | Yes |
| Section badge | `Template Ready` | Yes |

## New UI checklist

- Use platform shell/page components where possible.
- Use lucide icons for icon buttons when an icon exists.
- Keep cards for repeated items or framed tools, not for every section.
- Keep table and toolbar density appropriate for operational SEM tools.
- Avoid large marketing-style hero layouts for internal work applications.
- Keep text inside controls short enough to fit at desktop, tablet, and mobile widths.
