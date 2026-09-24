# Workflow: Multi-Tier Approval System

1. **Initiation**: Document submitted (Quotation, Sales Order, Customer creation, GRN, Expense, Payment).
2. **Rule Evaluation**:
   - Standard: Falls within rep limits & customer defaults -> Routes to primary approver (e.g. Sales Manager).
   - Special: Discount breach, credit days exceeded, or high value -> Flags `SPECIAL APPROVAL REQUIRED` and routes to Manager or Director.
3. **Escalation Path**:
   - Sales Manager may approve, reject, or escalate to Manager / Director.
   - Manager may approve, reject, or escalate to Director.
4. **Audit Trail**: Every action (Approve, Reject, Escalate) records timestamp, actor, role, comment, previous state, and new state.
5. **Execution**: On final approval, status transitions to actionable state (e.g. Approved -> Picking / Invoicing).
