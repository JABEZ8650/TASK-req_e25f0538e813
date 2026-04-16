# Diagram Studio

Local-first offline diagram editor built with Angular 17 and TypeScript.  
All data stays on-device — no backend, no cloud, no external APIs.

## Implementation Status — Complete

All product requirements have been implemented. The app is a fully functional
local-first diagram studio with 20 built-in templates, canvas editing, connectors,
import, versioning, publishing, notifications, export, and multi-tab conflict handling.

### Features

- **Local pseudo-login**
  - Username + password with SHA-256 hashing (Web Crypto API)
  - 8-character minimum password
  - 3 failed attempts triggers 15-minute cooldown per profile
  - 8-hour inactivity timeout returns to login
  - All credentials stored locally in IndexedDB

- **Canvas workspace**
  - Add nodes (Start, Process, Decision, End, Text) via toolbar
  - Drag nodes with 8 px snap-to-grid
  - Alignment guides during drag (center-to-center, edge-to-edge, 6 px threshold)
  - 8 px dot-grid background that scales and pans with the viewport
  - SVG-based rendering inside a transform group
  - Per-canvas limits: 500 nodes, 1,000 connections

- **Connectors / edges**
  - Create by dragging from port indicators on selected/hovered nodes
  - Three routing modes: straight, curved, orthogonal (midpoint manhattan)
  - Select, edit (label, routing type, color), and delete connectors
  - Connectors update position when connected nodes move
  - Preview line shown during drag-to-connect

- **Zoom & pan**
  - Mouse wheel zooms toward cursor, 25%–400% range
  - Toolbar +/−/Fit buttons
  - Pan via middle-click drag or Space+left-click drag

- **Undo / Redo**
  - Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) keyboard shortcuts
  - Toolbar buttons with disabled state
  - 200-entry patch-based history stack
  - Covers: add/move/delete node, add/delete connector, property edits (on blur)
  - History panel toggled from the top bar

- **20 built-in templates**
  - 8 process: Basic Flowchart, Linear Process, Approval Workflow, Two-Lane Process, Error Handling Flow, User Onboarding, CI/CD Pipeline, Data Pipeline
  - 6 mind-map: Central Topic, Brainstorm Web, Pros & Cons, Hierarchy Tree, SWOT Analysis, Project Plan
  - 6 page-layout: Dashboard Layout, Landing Page, Blog Layout, Settings Page, Email Template, Mobile App Screen
  - Browse by family in the sidebar Templates tab
  - Click to create a new canvas pre-populated with template nodes and edges

- **Import wizard**
  - Upload local CSV or JSON files, or paste HTML/JSON/CSV snippets
  - Automatic source detection (JSON by `[`/`{`, HTML by `<`, CSV fallback)
  - Guided column-to-field mapping with synonym auto-detection
  - Canonical metadata fields: role, salary, location, experience, education, skills
  - Salary normalization: USD values parsed; non-USD preserved and flagged
  - Experience normalization: numeric years extracted
  - Skill-tag normalization: 120+ synonym mappings
  - Row-level validation with per-field error/flag display
  - Accept/reject toggle per row in preview step
  - 1,000-row import limit enforced at parse time
  - Accepted rows committed as data-type nodes with normalized metadata
  - HTML table, definition list, and list parsing for pasted snippets
  - Node properties drawer shows imported metadata fields with flag indicators

- **Autosave & versioning**
  - Autosave every 10 seconds when canvas is dirty
  - Duplicate snapshot detection via content hashing
  - Rolling cap of 30 autosave versions per canvas (oldest pruned)
  - Published snapshots stored separately, never pruned
  - Manual "Save Snapshot" button
  - Version timeline in sidebar with type badges and timestamps
  - Rollback from any version with destructive-action confirmation
  - Rollback creates a new manual version, preserving history

- **Draft / Published workflow**
  - Pre-publish checklist: required title, node limit, edge limit, no dangling connectors
  - Publish blocked until all checklist items pass
  - Publish creates a separate published version snapshot
  - Draft/Published status pill visible in the top bar and canvas list
  - Unpublish (rollback to draft) preserves published snapshot in history
  - **Local approval toggle**: per-canvas, requires reviewer confirmation for publish/rollback
  - Reviewer selected from local profiles; can approve or deny with optional comment
  - Reviewer confirmation metadata stored on published version records

- **Draft vs Published comparison**
  - Diff service compares live state against latest published snapshot
  - Shows added/removed/modified nodes with per-field change details
  - Shows added/removed/modified edges and unchanged counts
  - Embedded in the publish panel

- **Notification Center**
  - Notifications with templated variable resolution (`{{canvasName}}`, `{{versionId}}`)
  - Local queue with retry-on-failure (up to 3 retries)
  - Do-not-disturb hours: configurable start/end, system notifications bypass DND
  - Read/unread tracking, dismiss, mark-all-read
  - Unread count badge in top bar
  - Sidebar Notifications tab with full list and DND settings
  - Publish/unpublish actions fire notifications automatically

- **Export**
  - **JSON**: full canvas data including metadata, normalized tags, nodes, edges, settings
  - **SVG**: self-contained SVG with computed bounding box, node shapes, labels, edge paths
  - **PNG**: 2x retina resolution via SVG→Image→Canvas pipeline
  - Export buttons in the canvas workspace toolbar

- **Multi-tab conflict detection**
  - BroadcastChannel-based heartbeat and editing/saved event broadcasts
  - Conflict dialog when another tab is detected editing the same canvas
  - Three resolution options: use latest saved version, save current work as new version, dismiss
  - Autosave broadcasts save events to other tabs
  - Never silently discards user work

- **Right drawer**
  - Auto-opens on selection
  - Node properties: label (200 char), notes (1,000 char), position, size, fill/stroke colors, imported metadata
  - Edge properties: label, routing type, stroke color
  - Text fields persist on blur (not per-keystroke) with undo/redo history

- **Service Worker / PWA**
  - Web manifest for installable offline app
  - Angular service worker with prefetch strategy (production builds)

- **Persistence**
  - LocalStorage: session state, preferences, DND settings, template seed version
  - IndexedDB: 8 object stores (profiles, canvases, nodes, edges, templates, notifications, imports, versions)

## Development

```bash
npm start        # dev server at http://localhost:4200
npm run build    # production build
```

## Tech Stack

- Angular 17 (standalone components, signals, effects)
- TypeScript 5.4
- SCSS
- SVG (canvas rendering, export)
- Canvas API (PNG export rasterization)
- Web Workers (diff computation, SVG export building)
- IndexedDB (native API, no library)
- BroadcastChannel API (multi-tab)
- Web Crypto API (SHA-256 hashing)
- Angular Service Worker
- Karma + Jasmine (unit tests)

## Project Structure

```
src/app/
├── core/
│   ├── models/              # Domain interfaces & constants (8 model files)
│   ├── services/            # 14 services: auth, session, canvas-store, templates, history,
│   │                        #   import, version, autosave, publish, notification, export, diff, multi-tab,
│   │                        #   local-storage, indexed-db
│   ├── guards/              # Route guards (auth)
│   ├── workers/             # Web Workers (diff.worker.ts, export.worker.ts)
│   └── utils/
│       ├── import/          # CSV/JSON/HTML parsers, metadata normalizer, skills normalizer, row validator
│       ├── publish-checklist.ts
│       ├── node-defaults.ts
│       ├── edge-utils.ts
│       └── snap-utils.ts
├── features/
│   ├── login/               # Login/register screen
│   └── shell/               # App shell layout
│       ├── sidebar/
│       │   ├── canvas-list/       # Canvas CRUD list
│       │   ├── template-list/     # Template browser + instantiation
│       │   └── version-timeline/  # Version history + rollback
│       ├── canvas-workspace/      # SVG canvas + toolbar + export buttons
│       │   ├── canvas-node/       # Node rendering + port indicators
│       │   └── canvas-edge/       # Edge/connector rendering
│       ├── right-drawer/
│       │   ├── node-properties/   # Node property editor + metadata display
│       │   └── edge-properties/   # Edge property editor
│       ├── import-wizard/         # 4-step import modal
│       ├── publish-panel/         # Checklist, publish/unpublish, approval, diff viewer
│       ├── diff-viewer/           # Draft vs published comparison
│       ├── notification-center/   # Notification list + DND settings
│       └── history-panel/         # Undo/redo history list
├── app.component.ts
├── app.config.ts
└── app.routes.ts
```

## Testing

56 unit tests covering core business logic:

```bash
npm test             # interactive Karma runner
npx ng test --watch=false --browsers=ChromeHeadless  # CI-friendly headless run
```

Test coverage: CSV parsing, skills normalization, metadata normalization, salary/experience parsing,
row validation, publish checklist, snap-to-grid, alignment guides.

## Bounded Implementations

These features are intentionally implemented in a simplified/bounded way per the
product requirements' "local-first convenience" design philosophy:

- **Auth** is a local convenience gate, not enterprise security. SHA-256 hashing with no salt.
- **Reviewer confirmation** is a local role/permission workflow. Any profile can be designated reviewer; no access control enforcement.
- **Approval pending state** is persisted to LocalStorage and restored on page load.
- **Reviewer denial comments** are stored in a LocalStorage audit log.
- **Multi-tab conflict detection** is advisory, not a lock. Both tabs can continue editing.
- **Export SVG building and diff computation** are delegated to Web Workers with synchronous fallback for environments without Worker support.
- **PNG rendering** uses an SVG→Image→Canvas pipeline on the main thread (Worker-built SVG, main-thread rasterization since Canvas API requires DOM access).
- **IndexedDB multi-store operations** (e.g. snapshot restore) use atomic transactions.
- **Notification delivery** means the record exists in IndexedDB. No network delivery.
- **Non-USD salary values** are preserved and flagged, not converted. No external currency APIs.
