# AGENTS.md

## Agent Instructions

Scope: entire repository.

---

# Project Goal

This repository must be developed and maintained to commercial production standards.

The objective is not merely to make code compile or complete a requested task.

All changes must improve or preserve:

- Functionality
- Reliability
- Maintainability
- Security
- Scalability
- Accessibility
- Performance
- User Experience
- Operational Readiness

---

# Architecture Rules

Before implementing any feature:

- Understand existing architecture before making changes.
- Reuse existing components whenever possible.
- Avoid duplicate business logic.
- Avoid duplicate UI components.
- Prefer composition over duplication.
- Follow separation of concerns.
- Minimize technical debt.
- Keep solutions simple and maintainable.

Never introduce architectural patterns inconsistent with the existing application without justification.

---

# Enterprise UI/UX Standards

All UI must be reviewed against modern enterprise software standards comparable to:

- Microsoft 365
- GitHub
- Atlassian
- Notion
- Figma

Every UI change must be evaluated for:

## Layout

- Visual hierarchy
- Logical grouping of information
- Clear navigation
- Consistent alignment
- Proper spacing
- Responsive behavior

## Usability

- Minimal user effort
- Reduced click count
- Discoverability
- Readability
- Error prevention
- User feedback

## User Friendly Validation

Verify:

- Can users understand the screen within a few seconds?
- Are primary actions obvious?
- Is workflow intuitive?
- Are labels self-explanatory?
- Can users recover easily from mistakes?

Provide findings under:

- High Priority Findings
- Medium Priority Findings
- Low Priority Findings
- Standardization Opportunities

---

# Accessibility Requirements

Minimum target:

WCAG 2.2 AA

Verify:

- Keyboard accessibility
- Screen reader compatibility
- Semantic HTML
- Accessible labels
- Focus visibility
- Sufficient color contrast
- Error message accessibility

Accessibility is mandatory.

---

# HTML Standards

Prefer semantic HTML.

Use:

- header
- nav
- main
- section
- article
- aside
- footer

Avoid:

- Excessive div nesting
- Non-semantic structures
- Accessibility anti-patterns

DOM hierarchy should remain simple and maintainable.

---

# CSS Standards

Prefer:

- Design tokens
- CSS variables
- Shared theme definitions
- Reusable utility classes
- Component-based styling

Avoid:

- Inline styles
- Hardcoded colors
- Arbitrary spacing
- !important
- CSS duplication

Spacing should follow a standard scale:

- 4px
- 8px
- 12px
- 16px
- 24px
- 32px
- 48px
- 64px

---

# Design System Requirements

All UI elements should be reusable.

Standardize:

- Buttons
- Inputs
- Dropdowns
- Modals
- Tables
- Cards
- Alerts
- Navigation
- Forms
- Dialogs
- Notifications

When duplicate UI patterns are found, recommend component consolidation.

---

# Performance Requirements

Evaluate:

- Rendering efficiency
- Bundle size impact
- Network requests
- API efficiency
- Database efficiency

Avoid:

- Unnecessary re-renders
- Duplicate requests
- Large client-side computations
- Blocking operations
- Excessive API calls

Performance regressions must be identified and reported.

---

# Security Requirements

Security is mandatory.

Never:

- Hardcode credentials
- Hardcode secrets
- Store tokens in source code
- Log sensitive information
- Disable authentication
- Disable authorization
- Circumvent security controls

Always evaluate:

- Input validation
- Output encoding
- Authentication
- Authorization
- Dependency vulnerabilities
- Secure storage
- Sensitive data exposure

Report all discovered security risks.

---

# CRA Security Requirements

All generated solutions should support Cyber Resilience Act (CRA) compliance objectives.

Verify where applicable:

- Secure Boot
- Secure Firmware Update
- Firmware Signing
- Vulnerability Remediation
- SBOM Compatibility
- SAST Readiness
- Dependency Traceability
- Security Logging
- Security Monitoring

Never recommend bypassing security controls for convenience.

---

# Testing Requirements

Every implementation should consider:

## Functional Testing

- Happy path
- Negative path
- Boundary conditions

## Integration Testing

- API integration
- Database integration
- Service integration

## UI Testing

- User flow validation
- Form validation
- Error handling

## Accessibility Testing

- Keyboard navigation
- WCAG compliance

## Performance Testing

When applicable.

Never claim testing was executed unless evidence is available.

---

# Maintainability Requirements

Prefer:

- Clear naming
- Simple implementation
- Self-documenting code

Avoid:

- Premature optimization
- Magic numbers
- Dead code
- Unused code
- Excessive complexity

When complexity exists:

- Explain the reason
- Describe tradeoffs
- Suggest simplification opportunities

---

# Agent Restrictions

Never:

- Invent API responses
- Assume database schemas
- Assume business rules
- Generate fake test results
- Claim deployment success without evidence
- Claim production readiness without justification
- Ignore build errors
- Ignore security findings

Unknown information must be explicitly identified as unknown.

---

# Analysis Requirements

When reviewing code, UI, architecture, requirements, or designs, provide:

## Findings

- High Priority Issues
- Medium Priority Issues
- Low Priority Issues

## Recommendations

- Immediate Actions
- Future Improvements

## Risks

- Technical Risks
- Security Risks
- UX Risks
- Operational Risks

---

# Debug / Prelaunch Performance Guardrails

The VS Code Run/Debug prelaunch chain for this workspace is shared across:

- bundle_sw_release_dashboard
- pump_sw_ec_tracker
- pump_sw_requirement_spec
- sem_sw_service_portal
- sem_sw_ticket_system
- sem_sw_web_template

All projects delegate to the same PowerShell scripts under:

sem_sw_common_web_platform/scripts/apphost/

via each project's common-platform NTFS junction.

Changes affecting apphost, launch, debug, or prelaunch behavior must comply with the following rules.

1. Never add a new unconditional call to:

   - Resolve-LocalDependencyLayout
   - Resolve-LocalDevConfig
   - get-workspace-node.ps1

   without first implementing a fast-path cache, marker, or environment-variable skip mechanism.

2. Never spawn:

   - node -p
   - node -e

   inside a hot prelaunch path if the result is deterministic.

   Persist results in cache instead.

3. Never delete:

   - tsconfig.tsbuildinfo
   - dist/

   merely to force rebuilds.

   Respect incremental build caches.

4. Never wipe Edge debug profile directories automatically.

   Only kill running processes.

   Full profile reset must require:

   SEM_APPHOST_RESET_EDGE_PROFILES=1

5. Never add blanket:

   Get-CimInstance Win32_Process

   queries in loops.

   Prefer:

   Get-Process

   and cache results when WMI is unavoidable.

6. For Docker/local branching, always use a lightweight local-mode detection strategy before invoking Docker-related scripts.

7. Do not create multiple PowerShell tasks when the same work can be composed in a single script.

   PowerShell startup overhead must be minimized.

8. Every optimization that introduces caching must include an opt-out switch:

   SEM_APPHOST_DISABLE_*=1

9. Any modification under:

   sem_sw_common_web_platform/scripts/apphost/

   must be validated against all dependent projects before merging.

10. Any measurable debug startup regression must be treated as a release blocker until investigated and documented.

11. Record cold-start and warm-start timing measurements when introducing performance optimizations.

12. Preserve existing cache mechanisms unless evidence demonstrates they are incorrect or harmful.

---

# Completion Reporting

After every completed task, include:

## Summary

Brief description of completed work.

## Files Impacted

List modified or affected files when known.

## UX Impact

Describe any user experience impact.

## Security Impact

Describe any security impact.

## Testing Status

State what was verified and what remains unverified.

## Risks

List remaining known risks.

---

# Commercial Product Readiness Report

Always include:

Commercial product readiness: NN%

Remaining gap to 100%:

- Code
- Testing
- UX
- Security
- Performance
- Deployment
- Documentation
- Data
- Environment

Evaluate readiness using realistic enterprise-grade standards.

A completed code change does not automatically imply production readiness.

Consider:

- Functionality
- User experience
- Test coverage
- Build status
- Runtime verification
- Reliability
- Security
- Deployment readiness
- Monitoring
- Maintainability
- Operational readiness

If deployment, infrastructure, database access, VPN access, credentials, secrets, external services, production validation, or runtime environments are unavailable, clearly identify them as remaining blockers.

Never omit the readiness report, even for small changes.