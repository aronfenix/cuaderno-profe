# AulaOS — Product Brief

Status: active product specification
Date: 2026-08-31

## Product thesis

AulaOS is a personal, local-first operating system for classroom work. Its purpose is not to force disciplined journaling. It should adapt to the teacher's real workflow by making capture almost frictionless, turning spontaneous notes into reliable memory, and returning useful context before action.

## Core jobs

1. Capture observations, reflections, tasks and administrative notes with minimal friction, primarily through voice.
2. Preserve source/provenance so automated interpretation never becomes indistinguishable from what was actually recorded.
3. Retrieve recent and historical information quickly by date, student code, subject/context and full-text search.
4. Provide context before a class or action: what happened last time, what remained pending, what should be remembered.
5. Support a persistent professional library across academic years while cohort/student data remains year-scoped.
6. Later, use local and optional external AI to surface patterns, missing evidence and weekly reflections without making AI the source of truth.

## Product principles

- Capture must feel closer to sending a voice note than filling in a form.
- Normal speech with real student names is allowed at the input boundary; operational text must be pseudonymized before indexing/export.
- Reliability beats sophistication during the pilot.
- Deterministic work belongs in code, not in an LLM.
- Every machine-derived statement must retain a path back to its source.
- Low-confidence automation should fail visibly and conservatively.
- External models are optional supervisors, not required infrastructure.
- The app must remain useful if all AI integrations are removed.
- Data from one academic year must not silently contaminate another.
- Reusable professional capital (materials, sequences, reflections on teaching) should survive yearly cohort turnover.

## Pilot scope

### In scope

- Android-native audio capture through a synchronized folder.
- Local audio ingestion and faster-whisper transcription.
- Raw/work transcript separation.
- Deterministic pseudonymization with alias map and review flags.
- Minimal mobile-accessible timeline.
- Academic year/group/student-code/subject foundations.
- Structured timetable/session model, but conservative/nullable association.
- SQLite operational persistence and FTS5 when the core pipeline is stable.
- Manual/curated notes and later review queue.
- Local backup/restore.

### Explicitly deferred

- Semantic embeddings/RAG.
- Multimodal student-work analysis.
- Automatic grading.
- Weekly AI supervisor reports.
- External Claude/OpenAI agents touching the master dataset.
- Offline-read caching/service worker complexity.
- End-of-year assistant and cross-year analytics.
- Fine LOMLOE ontology.
- Custom native Android application.

## Initial semantic extraction classes

When a real corpus exists, automated extraction starts with only:

- observation
- interpretation
- action
- reflection
- administrative

No finer taxonomy is authoritative before real usage shows a need.

## Privacy model

Data classes:

### PRIVATE SOURCE
- raw audio
- raw transcript
- identity/alias map

Never full-text indexed or externally exported by default.

### OPERATIONAL DERIVED
- pseudonymized work transcript
- machine-derived segments/candidates
- schedule links
- operational search index

Can be searched locally. External export remains blocked when possible PII is unresolved.

### CURATED
- teacher-confirmed observations/actions/communications
- reviewed corrections

May be used for local reports and later sanitized exports according to policy.

## Product success gates

### Day 0
The teacher can record a note on the phone and later read the pseudonymized transcription in AulaOS without touching the computer between those steps.

### Week 4
Targets:
- >=5 notes/week without deliberate forcing;
- >=80% capture-to-transcription success without manual intervention;
- >=70% retrieval of remembered notes in <30 seconds.

Failure of capture usage triggers capture redesign, not feature expansion.

## Long-term direction

Once capture and retrieval are reliable, AulaOS can expand into:

- agenda/tasks and family-communication memory;
- pre-session context;
- deterministic attention/proactivity;
- weekly local reports;
- reusable activity/material/sequences library;
- student-work evidence capture;
- multimodal pattern analysis;
- controlled external-model audits;
- multi-year professional memory.
