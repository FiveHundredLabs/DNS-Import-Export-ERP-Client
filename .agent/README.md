# Antigravity Agent System for Distribution ERP

This directory defines the multi-agent governance, role models, technical skills, operational workflows, business rules, and quality checklists for developing the Enterprise Distribution Company ERP frontend.

## Structure

- `agents/`: Defined sub-agents with dedicated roles and responsibilities.
- `skills/`: Standard technical skills, UI guidelines, patterns, and code practices.
- `workflows/`: Step-by-step procedures for feature development, approvals, QA, and API readiness.
- `rules/`: Non-negotiable architectural, UI, permissions, testing, and business domain rules.
- `checklists/`: Standard checklists for feature readiness, page compliance, QA, and release.

## Principles

1. **Shared Master Data**: Single source of truth for Product Master, Customer Master, User, Area, etc.
2. **Domain-Driven Architecture**: Decouple UI from data access via typed service and repository abstractions.
3. **Enterprise UI**: Shadcn/ui, Tailwind CSS, Lucide icons, responsive layout, information-dense and accessible.
4. **Strict Approval Workflows**: State-machine driven, traceable audit trail, no scattered boolean flags.
5. **Phase-by-Phase Delivery**: Rigorous progression from Foundation → Master Data → Sales → Inventory → Invoice/Payment → POS → Finance → Reporting.
