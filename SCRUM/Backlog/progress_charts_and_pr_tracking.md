---
status: backlog
priority: P2
agent_claimed: null
claimed_at: null
updated: 2026-08-20
---

# Progress Charts and PR Tracking

> **Repo:** WORKOUTFLOW
> **Description:** Volume, max lift, and bodyweight trend charts over time

---

## Context

Users need to see their progress -- estimated 1RM trends, volume load over time, bodyweight changes.

---

## Acceptance Criteria

- [ ] Estimated 1RM chart per lift using Epley/Brzycki formulas
- [ ] Weekly volume (total tonnage) trend with PR markers
- [ ] Bodyweight trend with goal zone overlay
- [ ] PR celebration animation when new personal record is set

---

## Technical Notes

- Recharts for charts; SQL window functions for PR detection; confetti animation on PR
