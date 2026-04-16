# questions.md

## 1) The Gap
The prompt requires a local-only username + password “pseudo-login” stored on the device, but it does not specify whether the app should support only one device-level user or multiple local profiles.

### The Interpretation
The app will support multiple local profiles on the same device/browser, with one active session at a time.

### Proposed Implementation
Implement a local profile store in browser storage with per-profile credentials, failed-attempt tracking, cooldown timestamps, and session state. This remains a convenience login only, not a secure multi-user identity system.

---

## 2) The Gap
The prompt says publish/rollback may require a Reviewer confirmation through a configurable local approval toggle, but it does not define how reviewer identity should work in a fully local-only app.

### The Interpretation
Reviewer confirmation will be treated as a local role/permission within the app rather than a secure enterprise identity boundary.

### Proposed Implementation
Support reviewer capability as a local profile role/permission flag. When approval is enabled, publish and rollback actions require confirmation through a reviewer-authorized local workflow, and the approval metadata is stored in local version records.

---

## 3) The Gap
The prompt requires structured parsing and field standardization for values such as salary in USD, but it does not define how unsupported or non-USD values should be normalized in a fully offline app.

### The Interpretation
The app should not silently invent offline currency conversions or normalization rules where no trustworthy local rule exists.

### Proposed Implementation
Normalize only values that can be handled deterministically offline. Preserve unsupported raw values, flag them in preview/validation, and allow acceptance only with explicit user visibility rather than guessed conversion.

---

## 4) The Gap
The prompt requires auto-saving the most recent 30 versions every 10 seconds and also separates Draft canvases from Published snapshots, but it does not specify whether published snapshots count toward the 30-version limit.

### The Interpretation
The 30-version cap applies to rolling autosave/history versions for an open draft canvas, while published snapshots are retained separately.

### Proposed Implementation
Store draft autosave/history versions in a capped rolling set of 30 per canvas, and persist published snapshots in a separate collection used for comparison, replay, and rollback.

---

## 5) The Gap
The prompt says BroadcastChannel should warn on concurrent multi-tab edits and prompt the user to choose the latest local version, but it does not define the practical conflict-resolution behavior.

### The Interpretation
The app should detect concurrent edits, compare local modification timestamps/versions, and let the user either accept the latest local version or preserve the current work as a separate restored version.

### Proposed Implementation
Use BroadcastChannel to exchange canvas edit state and version timestamps. On conflict, show a warning modal comparing local candidates and allow the user to continue with the latest version or keep the current tab’s work by saving it as a new version branch/restore point.