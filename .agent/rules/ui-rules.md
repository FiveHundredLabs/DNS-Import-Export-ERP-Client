# UI Design Rules

1. Clean enterprise aesthetic: Slate/Zinc neutral bases, functional semantic badges (Emerald for Approved/Completed, Amber for Pending/Special, Rose for Overdue/Rejected, Sky for In-transit/Draft).
2. Spacing: 4px base scale (`p-1`, `p-2`, `p-4`, `p-6`). Never create erratic arbitrary margins.
3. Typography: Clear hierarchy. Title 20-24px semi-bold, body 14px regular, captions/tables 12-13px.
4. Feedback: Use Sonner toast for state mutations with descriptive messages, never silent failures.
5. States: Always provide Loading Skeletons, Actionable Empty States, and Error States with retry actions.
