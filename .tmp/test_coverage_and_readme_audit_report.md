# Unified Test Coverage + README Audit Report

**Project:** Diagram Studio
**Audit Date:** 2026-04-16 (refreshed)
**Auditor Mode:** Strict, static-only
**Project Type:** **web** (pure frontend) — explicitly declared at README line 3: `**Project type: web** (pure frontend Angular SPA)`

---

# PART 1: TEST COVERAGE AUDIT

---

## 1. Project Type Classification

**Declared type: `web` (pure frontend)**

Evidence:
- `repo/README.md` line 3: `**Project type: web** (pure frontend Angular SPA)`
- `repo/README.md` line 6: "All data stays on-device — no backend, no cloud, no external APIs."
- `repo/package.json`: Angular-only dependencies. No backend framework.
- No server-side files, no API routes. Data persistence entirely via browser IndexedDB and LocalStorage.

**Conclusion:** Pure frontend SPA. **Zero HTTP API endpoints** to inventory.

---

## 2. Backend Endpoint Inventory

**Total endpoints: 0**

This project has no backend. The only routes are Angular client-side routes:

| Route | Component | Guard |
|---|---|---|
| `/login` | LoginComponent | none |
| `/` (default) | ShellComponent | authGuard |
| `/**` (wildcard) | redirect to `/` | none |

These are SPA routes handled by the Angular router in-browser. They are not HTTP endpoints.

**Evidence:** `repo/src/app/app.routes.ts`

---

## 3. API Test Mapping Table

**Not applicable.** No API endpoints exist.

---

## 4. API Test Classification

**Not applicable.** Pure frontend project.

---

## 5. Mock Detection Rules

Mocking approach varies by test layer:

| Test file | Mocks used | What is mocked |
|---|---|---|
| `csv-parser.spec.ts` | None | Pure function tests |
| `skills-normalizer.spec.ts` | None | Pure function tests |
| `metadata-normalizer.spec.ts` | None | Pure function tests |
| `row-validator.spec.ts` | None | Pure function tests |
| `publish-checklist.spec.ts` | None | Pure function tests with factory helpers |
| `snap-utils.spec.ts` | None | Pure function tests |
| `auth.service.spec.ts` | `jasmine.createSpyObj` | IndexedDbService and LocalStorageService mocked |
| `history.service.spec.ts` | None | Service tested directly via TestBed |
| `notification.service.spec.ts` | `jasmine.createSpyObj` | IndexedDbService and LocalStorageService mocked |
| `auth.guard.spec.ts` | `jasmine.createSpyObj` | AuthService and Router mocked |
| `login.component.spec.ts` | `jasmine.createSpyObj` | AuthService and Router mocked |
| `canvas-workspace.component.spec.ts` | Signal-based mock objects | CanvasStoreService, HistoryService, ExportService mocked |
| `import-wizard.component.spec.ts` | Signal-based mock objects | ImportService and CanvasStoreService mocked |
| `diff.worker.spec.ts` | None | Pure logic replicated from worker for testing |
| `export.worker.spec.ts` | None | Pure logic replicated from worker for testing |

**Classification:** Service and component tests use dependency injection overrides with spy objects — standard Angular TestBed practice appropriate for unit testing. Utility and worker-logic tests are pure function tests with no mocking.

---

## 6. Coverage Summary

| Metric | Value |
|---|---|
| Total HTTP API endpoints | 0 |
| Endpoints with HTTP tests | N/A |
| True API coverage % | N/A (no backend) |

---

## 7. Unit Test Analysis

### 7.1 Backend Unit Tests

**Not applicable.** No backend exists.

### 7.2 Frontend Unit Tests

#### Test files found: 15

| File | Layer | Tests | What is tested |
|---|---|---|---|
| `core/utils/import/csv-parser.spec.ts` | Utility | 11 | `parseCsv` (simple, quoted, escaped quotes, CRLF, empty rows, empty input), `csvToRecords` (headers, empty, missing values, trim) |
| `core/utils/import/skills-normalizer.spec.ts` | Utility | 9 | `normalizeSkillTag` (abbreviations, case, unknown, empty), `parseAndNormalizeSkills` (comma/semi/pipe, dedup, empty) |
| `core/utils/import/metadata-normalizer.spec.ts` | Utility | 17 | `matchCanonicalField` (exact, synonyms, unknown, case), `autoMapFields` (mapping, no-double-map, unmapped), `normalizeSalary` (USD/$, non-USD flag, empty), `normalizeExperience` (years, decimal, unparseable, empty) |
| `core/utils/import/row-validator.spec.ts` | Utility | 5 | `validateRow` (mapped fields, unmapped preserve, empty flag, default accepted), `validateAllRows` (batch) |
| `core/utils/publish-checklist.spec.ts` | Utility | 7 | `evaluateChecklist` (valid, empty title, whitespace, dangling edges, valid edges), `isPublishReady` (pass/fail) |
| `core/utils/snap-utils.spec.ts` | Utility | 7 | `snapToGrid` (8px, negative, custom), `snapPosition`, `computeAlignmentGuides` (center, edge, empty, dedup) |
| `core/services/auth.service.spec.ts` | Service | 13 | Login: not-found, wrong-password, increment failedAttempts, lock after MAX_FAILED_ATTEMPTS, locked profile, clear expired lockout. Register: create+authenticate, session storage. Logout: clear. Session: expired/not-expired/no-session. |
| `core/services/history.service.spec.ts` | Service | 11 | Push entries, empty patches ignored, undo returns patches, redo after undo, null on empty undo/redo, truncate redo on new push, MAX_UNDO_STEPS cap enforcement, clear, visibleEntries tracking. |
| `core/services/notification.service.spec.ts` | Service | 11 | Create notification, unread count, template variable resolution, unresolved token preservation, IDB persistence, markRead, dismiss, DND inactive default, DND bypass for system/approval, DND settings save. |
| `core/guards/auth.guard.spec.ts` | Guard | 3 | Allow when authenticated, restore session success, redirect to /login on failure. |
| `features/login/login.component.spec.ts` | Component | 14 | Create, default login mode, toggle mode, formValid (empty/short-password/valid/register-mismatch/register-match), submit (invalid/success/failure/register), render elements, constants. |
| `features/shell/canvas-workspace/canvas-workspace.component.spec.ts` | Component | 8 | Create, empty state rendering, toolbar when canvas open, node type buttons, export buttons, export service calls, toolbarNodes data, grid CSS computation. |
| `features/shell/import-wizard/import-wizard.component.spec.ts` | Component | 9 | Create, upload step rendering, paste action, empty paste guard, mapping step, close+reset, startOver, error banner, done step. |
| `core/workers/diff.worker.spec.ts` | Worker logic | 10 | Added/removed/modified/unchanged nodes, position changes, added/removed edges, mixed complex diff, compareNode (identical, multiple changes). |
| `core/workers/export.worker.spec.ts` | Worker logic | 10 | computeBounds (empty, tight, single), esc (entities, clean), getPortPos (top, right, bottom, left, default). |

**Total: 145 tests across 15 spec files.**

#### Frameworks/tools detected:
- **Karma** (test runner) — `"test": "ng test"` in `package.json`
- **Jasmine** (assertion framework) — `@types/jasmine`, `jasmine-core`, `karma-jasmine` in devDependencies
- **Angular TestBed** — used in service, component, and guard tests
- **ChromeHeadless** — referenced in README for CI runs

#### What IS tested — by layer:

**Utilities (6 files, 56 tests):** CSV parsing, skills normalization (120+ synonyms), metadata field matching/auto-mapping, salary normalization (USD/non-USD), experience extraction, row validation with field mapping, publish checklist (title/limits/dangling connectors), snap-to-grid, alignment guides.

**Services (3 files, 35 tests):**
- `auth.service` — full login flow including lockout after 3 attempts, 15-min cooldown, expired lockout clearing, register, logout, session expiry detection
- `history.service` — push/undo/redo pointer management, 200-entry cap enforcement, redo truncation, clear, visibleEntries
- `notification.service` — send with template resolution, read/dismiss, unread count, DND behavior, IDB persistence

**Components (3 files, 31 tests):**
- `login.component` — form validation logic (5 scenarios), submit flow (login success/failure, register), mode toggling, DOM rendering verification
- `canvas-workspace.component` — empty state vs active canvas rendering, toolbar presence, node type buttons, export buttons + service delegation, grid computation
- `import-wizard.component` — step rendering (upload/mapping/done), paste/close/startOver actions, error banner, service delegation

**Guard (1 file, 3 tests):**
- `auth.guard` — authenticated pass-through, session restore, redirect-to-login

**Workers (2 files, 20 tests):**
- `diff.worker` logic — node add/remove/modify/unchanged detection, edge add/remove, position change detection, complex mixed diffs, compareNode field-level comparison
- `export.worker` logic — bounds computation, HTML entity escaping, port position calculation

#### What is NOT tested — important modules:

**Services (12 of 15 untested):**
- `canvas-store.service.ts` (577 lines) — node/edge CRUD, limit enforcement, undo/redo patch application, dirty tracking, snapshot restore, viewport management
- `version.service.ts` — snapshot creation, hash deduplication, rolling cap enforcement
- `publish.service.ts` — publish/unpublish workflow, approval pending state, denial recording
- `import.service.ts` — import orchestration, file parsing dispatch, commit flow
- `autosave.service.ts` — interval management, dirty-gate
- `diff.service.ts` — Worker delegation/fallback (logic tested via worker spec, but service wiring untested)
- `export.service.ts` — Worker delegation/fallback, SVG→PNG pipeline (logic tested via worker spec)
- `multi-tab.service.ts` — BroadcastChannel conflict detection
- `session.service.ts` — activity tracking, inactivity expiry
- `template.service.ts` — seed logic, idempotency
- `indexed-db.service.ts` — IndexedDB wrapper, transact()
- `local-storage.service.ts` — typed wrapper

**Components (14 of 17 untested):**
- `shell.component.ts`, `sidebar.component.ts`, `canvas-list.component.ts`, `template-list.component.ts`, `version-timeline.component.ts`, `canvas-node.component.ts`, `canvas-edge.component.ts`, `right-drawer.component.ts`, `node-properties.component.ts`, `edge-properties.component.ts`, `publish-panel.component.ts`, `diff-viewer.component.ts`, `notification-center.component.ts`, `history-panel.component.ts`

#### Mandatory Verdict

**Frontend unit tests: PRESENT**

Tests exist across all major testing layers (utilities, services, components, guard, worker logic). Coverage is concentrated on high-value business logic. Not exhaustive, but substantially beyond utility-only.

#### Strict Failure Rule Assessment

For a `web` project, frontend unit tests are present and cover meaningful business logic across multiple layers. This is **not** a critical gap.

### 7.3 Cross-Layer Observation

Single-layer project (frontend only). Testing spans utilities, services, components, guard, and worker logic — a reasonable multi-layer distribution.

---

## 8. API Observability Check

**Not applicable.** No HTTP API endpoints.

---

## 9. Test Quality & Sufficiency

### Quality assessment:

**Utility tests (56):** High quality. Real assertions with specific value comparisons. Edge cases covered (empty inputs, boundary values, case sensitivity, malformed data, non-USD currency flagging). No mocking.

**Service tests (35):** Good quality. Auth service tests cover the critical lockout lifecycle (increment → lock → expired lockout clearing). History service tests verify full push/undo/redo cycle including cap enforcement. Notification tests verify template resolution and DND logic. Appropriate use of jasmine spies for DI boundaries.

**Component tests (31):** Good quality. Verify both component logic (computed signals, submit flow) and DOM rendering (element presence). Export button tests verify service delegation. Meaningful assertions on error states and step transitions.

**Guard tests (3):** Focused and correct. Cover the three guard paths.

**Worker tests (20):** Good quality. Cover the pure diff and export computation logic. Add/remove/modify/unchanged scenarios. HTML escaping and bounds computation verified with specific values.

### `run_tests.sh`:
**Does not exist.** Tests run via `npm test` or `npx ng test`. No Docker-based test runner.

---

## 10. End-to-End Expectations

No E2E tests. Partially compensated by component-level rendering tests and service-level business logic tests.

---

## 12. Test Output Summary

### Backend Endpoint Inventory
N/A — pure frontend project.

### API Test Mapping Table
N/A — no HTTP endpoints.

### Coverage Summary

| Metric | Value |
|---|---|
| Total source files (approx.) | ~70 TypeScript files |
| Spec files | 15 |
| Total test count | 145 |
| Test framework | Karma + Jasmine + Angular TestBed |

### Unit Test Summary

| Category | Files Tested | Files Total | Test Count | Coverage |
|---|---|---|---|---|
| Pure utility functions | 6 | 6 | 56 | 100% |
| Services | 3 | 15 | 35 | 20% by file |
| Components | 3 | 17 | 31 | 18% by file |
| Guards | 1 | 1 | 3 | 100% |
| Worker logic | 2 | 2 | 20 | 100% (logic) |
| **Total** | **15** | **~41** | **145** | ~37% file coverage |

### Tests Check

- [x] Test files exist (15 spec files)
- [x] Tests are meaningful (real assertions, not superficial)
- [x] No over-mocking (spies only at DI boundaries)
- [x] Service layer tested (3 of 15 — highest-value)
- [x] Component layer tested (3 of 17 — key user-facing)
- [x] Auth/guard logic tested (auth service + auth guard)
- [x] Worker logic tested (diff + export pure computation)
- [ ] All services tested (12 of 15 remain)
- [ ] All components tested (14 of 17 remain)
- [ ] E2E / integration tests
- [ ] Docker-based test runner (`run_tests.sh`)

### Test Coverage Score: 48 / 100

### Score Rationale

| Factor | Points | Max | Rationale |
|---|---|---|---|
| Utility function coverage | 18 | 20 | 6/6 utility modules tested thoroughly |
| Service layer coverage | 12 | 30 | 3/15 tested — high-value (auth, history, notification). canvas-store, version, publish untested. |
| Component layer coverage | 8 | 20 | 3/17 tested — key user-facing (login, workspace, import-wizard). 14 remain. |
| Guard + Worker coverage | 8 | 10 | Guard 100%. Worker logic 100%. No Worker thread tests. |
| Test quality | 10 | 10 | High quality throughout — real assertions, edge cases, meaningful scenarios |
| Test infrastructure | 2 | 5 | Karma configured. README documents commands. No Docker test runner. |
| Integration / E2E | 0 | 5 | None |
| **Total** | **48** | **100** | |

### Key Gaps

1. **HIGH:** `canvas-store.service.ts` untested (577 lines, most complex service)
2. **HIGH:** `version.service.ts` untested (hash dedup, rolling cap)
3. **HIGH:** `publish.service.ts` untested (publish/approval workflow)
4. **MEDIUM:** 14 of 17 components untested
5. **MEDIUM:** No E2E tests
6. **LOW:** No Docker-based test runner

### Confidence & Assumptions

- **High confidence** in test count (145): verified via `grep -c "it("` across all 15 spec files
- **High confidence** in layer classification: each spec file inspected for imports and targets
- **Assumption:** Tests pass. README states 145 tests; `it()` count confirms 145. Not executed in this audit.

---

# PART 2: README AUDIT

---

## 1. README Location

**PASS** — `repo/README.md` (261 lines)

---

## 2. Hard Gate Evaluation

### Formatting
**PASS** — Clean markdown with clear hierarchy, code blocks, bullet lists, horizontal rules.

### Project Type Declaration
**PASS** — Line 3: `**Project type: web** (pure frontend Angular SPA)`

### Startup Instructions
**PASS** — Docker-based startup documented:
```bash
docker-compose up --build
```
Evidence: README lines 10–14.

Supporting files exist:
- `repo/Dockerfile` — multi-stage Node 20 Alpine build + nginx Alpine serve
- `repo/docker-compose.yml` — single service, port 4200:80
- `repo/nginx.conf` — SPA-friendly try_files config
- `repo/.dockerignore` — excludes node_modules, dist, .git

### Access Method
**PASS** — `http://localhost:4200` stated (line 16).

### Verification Method
**PASS** — 10-step walkthrough (lines 20–30): open URL → login screen → register → app shell → new canvas → add nodes → drag snap → create connector → export.

### Environment Rules
**PASS** — `docker-compose up --build` handles all dependencies. No manual installs for Docker path. Local dev instructions clearly separated under "Local Development (without Docker)".

### Demo Credentials
**PASS** — Lines 32–37 explicitly state: no preset credentials, register on first use, minimum 8 characters.

---

## 3. High Priority Issues

None.

## 4. Medium Priority Issues

1. **No Docker-based test runner.** Tests require local Chrome. Not critical for a pure frontend project but limits evaluator test reproducibility.

## 5. Low Priority Issues

None.

## 6. Hard Gate Results

| Gate | Status | Evidence |
|---|---|---|
| README exists | **PASS** | `repo/README.md` (261 lines) |
| Project type declared | **PASS** | Line 3 |
| Clean formatting | **PASS** | Well-structured markdown |
| Docker startup | **PASS** | `docker-compose up --build` + Dockerfile + docker-compose.yml |
| Access method | **PASS** | `http://localhost:4200` |
| Verification method | **PASS** | 10-step walkthrough |
| Environment rules | **PASS** | Docker-contained |
| Auth guidance | **PASS** | Explicit registration instructions |

**All 8 hard gates passed.**

## 7. Engineering Quality

| Dimension | Rating | Notes |
|---|---|---|
| Tech stack clarity | Excellent | All technologies listed including Workers, Docker, Karma |
| Architecture explanation | Excellent | Full project structure tree |
| Testing instructions | Good | Commands + layer-by-layer breakdown |
| Security/roles | Good | "Bounded Implementations" is transparent |
| Workflows | Excellent | All app workflows documented |
| Presentation quality | Excellent | Clean, honest, well-organized |

---

## README Verdict: **PASS**

All 8 hard gates satisfied. Docker-first startup. Concrete verification walkthrough. Explicit auth guidance. Excellent engineering documentation.

---

# FINAL VERDICTS

| Audit | Verdict | Score |
|---|---|---|
| **Test Coverage** | **PARTIAL PASS** | **48/100** — 145 tests across 5 layers (utilities, services, components, guard, worker logic). High-value business logic tested. Major untested services remain (canvas-store, version, publish). No E2E. |
| **README Quality** | **PASS** | All 8 hard gates satisfied. Docker-first. 10-step verification. Explicit auth. Excellent documentation. |

---

## Key Recommendations

1. Add `canvas-store.service` tests — largest/most complex service (577 lines).
2. Add `version.service` tests — hash deduplication and rolling-cap are data-integrity critical.
3. Add `publish.service` tests — publish/approval workflow is business-critical.
4. Consider E2E tests (Cypress/Playwright) for golden-path user flow.
5. Consider Docker-based test runner for evaluator reproducibility.
