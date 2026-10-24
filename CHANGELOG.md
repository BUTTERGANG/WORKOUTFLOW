# Changelog

All notable changes to WORKOUTFLOW. Newest first.

## 2026-10-23 — Security: dependency vulnerability fixes

Known advisories (OSV) in lockfiles: **1 critical, 29 high, 26 moderate, 5 low → 1 high, 3 moderate**.

- **`drizzle-orm` ^0.45.4** (SQL injection fix) and **`vite` ^6.4.5**
- `npm audit fix` — `proxy-addr` (critical), `body-parser`, `compression`, `lodash`, `path-to-regexp`, `ws`, …
- Critical/high advisories cleared in: `proxy-addr`, `body-parser`, `brace-expansion`, `browserslist`, `compression`, `drizzle-orm`, `lodash`, `minimatch`, `nanoid`, `path-to-regexp`, `picomatch`, `postcss`, `rollup`, `source-map-js`, `vite`, `ws`
- Verified: `npm run check` and `npm run build` pass
- Remaining: `zod` (high) — zod 3 has no patched release (fix is zod 4, a breaking migration) — deferred
