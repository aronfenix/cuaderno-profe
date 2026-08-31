# AulaOS — Existing Prototype Audit

Repository reviewed: `aronfenix/cuaderno-profe`
Audit date: 2026-08-31

This audit classifies existing modules as KEEP, ADAPT, EXTRACT or DROP for AulaOS.

## Executive decision

**Evolve the prototype. Do not rewrite from scratch.**

The current application already contains useful product work: React/Vite navigation, academic-year/group/student/subject models, enrollment/import flows, student profiles, notes, checklists, assessments, professional templates and mobile-oriented UI. The main architectural mismatch is persistence/privacy: current browser IndexedDB stores real student display names, and current cloud sync can serialize the complete local dataset to a remote service. AulaOS therefore reuses the product shell and selected domain modules while replacing or isolating the sensitive-data path.

## Current end-to-end behavior

The prototype currently supports:

- React 18 + TypeScript + Vite client.
- Hash-router navigation and lazy-loaded pages.
- Browser-side persistence with Dexie/IndexedDB.
- Academic years, class groups, students, enrollments and subjects.
- Student notes with manual categories and resolved/unresolved state.
- Classroom checklists.
- Team/grouping arrangements.
- Rubric templates, assessments, criterion scores and calculated results.
- Student profile pages including notes and subject averages.
- Local backup/synchronization workflows.
- Optional remote sync through a Node backend or Cloudflare path.
- Optional Anthropic API proxy in the Node server.
- PWA infrastructure already exists in dependencies/config, although AulaOS initial pilot must not rely on offline-read caching.

The current prototype does **not** implement the new AulaOS critical path:

- native-phone audio inbox ingestion;
- local Whisper transcription;
- raw/work transcript separation;
- deterministic pseudonymization before indexing;
- a protected identity/alias store;
- SQLite FTS5 operational search;
- source/derived/curated provenance model;
- segment-level session association;
- safe export policy for external AI.

## Module-by-module classification

### KEEP

#### React/Vite/TypeScript application shell
Reason: mature enough, already mobile-oriented, routing/error-boundary structure exists, and replacing it adds no value to the pilot.

#### AcademicYear concept
Reason: already present and matches AulaOS multi-year boundary requirement.

#### ClassGroup / Subject / Enrollment concepts
Reason: domain concepts remain valid. Their persistence implementation may change, but the conceptual model should be retained.

#### Rubric/assessment/library product work
Reason: not part of the first AulaOS capture pilot, but it represents reusable professional functionality and should survive as optional modules rather than be discarded.

#### Student profile UX patterns
Reason: longitudinal student view already exists and can later consume AulaOS curated observations/evidence.

### ADAPT

#### Student model
Current issue: stores real `displayName` in the general client database.
Target: operational student record uses a pseudonymous display code; identifying data moves to a separated local identity store.

#### Student notes
Current issue: manually entered text is treated directly as final data and categories are broader/different from the AulaOS extraction model.
Target: preserve manual note capability, but add provenance/status and distinguish source/derived/curated records.

#### Setup/import flows
Current value: substantial UI already exists for creating years/groups/students and bulk import.
Target: import should create operational pseudonymous students plus identity/alias records, rather than putting identifying names into the general operational DB.

#### Dashboard
Current value: existing home/dashboard patterns.
Target: evolve toward `Ahora / Atención / Reciente`, but only after capture pipeline reliability exists.

#### Existing PWA infrastructure
Current value: installable web shell can be useful.
Target: disable/defer offline-read caching complexity during pilot; do not delete code solely because it is deferred.

#### Backup/restore UX
Current value: existing concept and user-facing workflows.
Target: backups must respect private/operational separation and avoid accidental cloud upload of sensitive raw/identity stores.

### EXTRACT

#### Import parsing logic
Reuse parsing/validation for student/group inputs where possible, while changing persistence target.

#### Repositories/service patterns around Dexie
Reusable as a design reference for modular data access, but not authoritative for the new server-side sensitive-data model.

#### Mobile navigation/styles/components
Reuse visual/interaction components rather than redesigning the app.

#### Assessment/rubric utilities
Keep available as independent professional-capital features even if they are not wired into V0 capture.

### DROP / DO NOT CARRY FORWARD AS-IS

#### Full-dataset cloud sync as the default persistence story
Reason: conflicts with local-first privacy boundary and raw/work separation. Any future sync must be explicitly scoped and encrypted/sanitized by data class.

#### `Student.displayName` as the operational identity field
Reason: leaks identity throughout browser storage and UI data layer.

#### Anthropic proxy as part of the core server path
Reason: AulaOS core must not depend on or automatically expose operational/private data to an external model. External AI integrations, if used later, require explicit sanitized export contracts.

#### Automatic assumption that client IndexedDB is the single authoritative database
Reason: the new ingestion/transcription pipeline needs local filesystem access, Whisper, FTS5 and protected private storage. Browser IndexedDB can remain a UI cache/client store if useful, but not the source of truth for sensitive AulaOS data.

## Migration strategy

1. Freeze `main` as the working legacy prototype.
2. Develop AulaOS on `aulaos-v0`.
3. Preserve frontend/UI modules unless they actively conflict with privacy or capture reliability.
4. Introduce a local backend/storage boundary for AulaOS data rather than trying to stretch Dexie into filesystem/Whisper/FTS responsibilities.
5. Keep old assessment/rubric functionality isolated while the new capture pipeline is built.
6. Only migrate real existing data after the new privacy model is implemented and tested.

## First implementation priority

The first code slice must prove:

`Android recorder -> synced audio file -> inbox watcher -> local Whisper -> transcript_raw -> pseudonymizer -> transcript_work -> minimal timeline`

No LLM, embeddings, multimodal analysis or external AI is required for this slice.
