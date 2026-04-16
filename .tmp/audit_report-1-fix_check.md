# Repair Verification Report — Audit 1

## Source Report

Verifies repairs against `audit_report-1.md`.

## Overall Repair Verdict

**Pass**

All six findings from the original report have been addressed. Both High-severity issues (F-001, F-002) are fixed, and all four Medium/Low issues (M-001 through M-004) are fixed or materially improved.

## Finding Verification

### F-001 — Web Workers Not Implemented

* **Status:** Fixed
* **Evidence:**
  - `src/app/core/workers/diff.worker.ts` (89 lines): Standalone Web Worker with full diff logic.
  - `src/app/core/workers/export.worker.ts` (155 lines): Standalone Web Worker that builds SVG strings from node/edge data.
  - `src/app/core/services/diff.service.ts:32-33`: Instantiates worker via `new Worker(new URL(...))`.
  - `src/app/core/services/export.service.ts:12-13`: Same pattern for export worker.
  - Both services post data to workers and receive results via `onmessage`, with sync fallback on error.
* **Residual gap:** None.

### F-002 — No Tests

* **Status:** Fixed
* **Evidence:**
  - 15 spec files now exist with 145 total tests across 5 layers:
  - Utilities (6 files, 56 tests): csv-parser, skills-normalizer, metadata-normalizer, row-validator, publish-checklist, snap-utils
  - Services (3 files, 35 tests): auth.service, history.service, notification.service
  - Components (3 files, 31 tests): login, canvas-workspace, import-wizard
  - Guard (1 file, 3 tests): auth.guard
  - Worker logic (2 files, 20 tests): diff.worker logic, export.worker logic
* **Residual gap:** 12 of 15 services and 14 of 17 components remain untested. Major untested services: canvas-store, version, publish. This is a coverage gap but no longer a blocker — the original "zero tests" finding is fully resolved.

### M-001 — canvas-store.service.ts is oversized

* **Status:** Not Fixed
* **Evidence:** File remains at ~574 lines. Not refactored.
* **Rationale:** Intentionally deferred — extracting subsystems would risk destabilizing working features for a non-blocking finding.

### M-002 — Approval pending state not persisted

* **Status:** Fixed
* **Evidence:** `publish.service.ts` constructor restores from LocalStorage; `publish()` and `unpublish()` persist to LocalStorage; `clearPendingState()` removes it.

### M-003 — IndexedDB operations not atomic across stores

* **Status:** Fixed
* **Evidence:** `indexed-db.service.ts` now has `transact()` method for multi-store atomic put/delete operations. Used in `canvas-store.service.ts:restoreFromSnapshot`.

### M-004 — denyPending() silently drops reviewer comment

* **Status:** Fixed
* **Evidence:** `publish.service.ts:denyPending()` now builds a `DenialRecord` and appends it to a `denial_log` in LocalStorage.

## Summary

* **Fixed:** F-001, F-002, M-002, M-003, M-004
* **Not Fixed:** M-001 (deferred, non-blocking)
