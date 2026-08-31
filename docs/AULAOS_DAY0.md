# AulaOS — Day 0 Implementation Slice

Date: 2026-08-31
Status: implementation target

## Goal

By the end of Day 0, the system should support one reliable vertical slice:

`Android recorder -> synced audio file -> inbox watcher -> local transcription -> raw/work transcript records -> minimal timeline`

The user must not need to touch the PC between recording and seeing the transcribed note later.

## Non-goals for Day 0

Do not build:

- LLM extraction;
- embeddings/RAG;
- multimodal analysis;
- external Claude/OpenAI integration;
- offline-read service worker logic;
- advanced dashboard/proactivity;
- weekly reports;
- curriculum ontology;
- custom Android recorder;
- final visual design.

## Gate 1 — Repository/specification

Required before implementation:

- accepted ADRs in `docs/AULAOS_DECISIONS.md`;
- prototype audit in `docs/AULAOS_PROTOTYPE_AUDIT.md`;
- transcript contract in `contracts/transcript.schema.json`;
- pseudonymization contract in `contracts/pseudonymization.schema.json`;
- private and operational data paths excluded from Git.

Exit criterion: implementation can be reviewed against repository files rather than chat history.

## Gate 2 — Audio inbox contract

AulaOS does not care how the mobile file is synchronized. It only requires that a supported audio file eventually appears in a configurable local inbox directory.

Required behavior:

1. Watch configured inbox.
2. Wait until file size is stable before ingesting.
3. Compute content hash.
4. Avoid duplicate ingestion by hash.
5. Create immutable source metadata.
6. Move/copy the source into protected raw-audio storage.
7. Record processing status so restart can resume safely.

Supported pilot formats should include common Android recorder outputs where feasible (`m4a`, `mp3`, `wav`, `ogg`).

Exit criterion: dropping a test audio file into the inbox creates exactly one source record even if watcher/process restarts.

## Gate 3 — Local ASR

Use faster-whisper locally.

Benchmark at least `small` and `medium` with the same Spanish test recording containing:

- normal conversational pace;
- classroom terminology;
- several invented first names;
- mild background noise.

Record benchmark results in `docs/ASR_BENCHMARK.md`:

- model;
- device/compute type;
- audio duration;
- processing duration;
- notable word/name errors;
- memory/operational observations.

No model is selected by theoretical preference alone.

Exit criterion: one model is chosen as pilot default and produces a stored raw transcript from inbox audio.

## Gate 4 — Raw/work transcript boundary

For each transcribed source:

1. Store `transcript_raw` in protected private storage.
2. Run deterministic pseudonymization using available alias data.
3. Store `transcript_work` separately with provenance to raw.
4. If possible identity tokens remain unresolved, set PII review status accordingly.
5. Never index raw text.

During Day 0 there may be no real students. Use synthetic aliases to prove the mechanism.

Exit criterion: a synthetic transcript containing `Lucía` appears operationally as `A07`; raw still contains `Lucía`; only work is visible in normal timeline/search paths.

## Gate 5 — Minimal timeline

Provide the thinnest useful web view possible. It may be server-rendered HTML or a small route integrated into the existing React shell.

Required fields:

- capture/recorded timestamp;
- processing status;
- duration if available;
- `transcript_work` text;
- obvious PII-review warning if unresolved;
- link/identifier to source record for debugging.

No visual redesign is required.

Exit criterion: after recording on Android and allowing sync/processing, the user can open a URL and read the operational transcript.

## Stretch gates, only after Gates 1–5 pass

### Stretch A — FTS5
Index `transcript_work` only and prove simple keyword/phrase retrieval.

### Stretch B — Backup
Create a local backup command for operational DB/config plus private-store metadata according to defined policy. Do not automatically cloud-sync private/raw data.

### Stretch C — Importer scaffolding
Prepare synthetic student/timetable import format for real data arriving later.

## Reliability rules

- Every processing step must be idempotent.
- Original audio is not overwritten.
- Failed jobs remain inspectable/retryable.
- A raw transcript is never silently mutated into a work transcript.
- Unknown PII cannot silently become externally exportable.
- Session association may remain null.
- Real names must not enter operational full-text search.

## Pilot audio retention

Default during calibration:

- successful normal audio: 30 days;
- QA/error/identity-problem audio: up to 60 days;
- configurable from one policy location;
- automatic deletion later, with metadata preserved as appropriate.

## Definition of Day 0 success

The following sentence must be true:

> I can record a note on my phone, leave the phone alone, and later open AulaOS and read its pseudonymized transcription without having touched the computer.

Everything beyond that is optional for Day 0.
