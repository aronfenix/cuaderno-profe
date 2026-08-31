# AulaOS — Architectural Decision Record

Status: active specification
Last updated: 2026-08-31

This file records accepted architectural decisions. Changes must be committed as diffs. Chat conversations and generated reports are context, not source of truth.

## ADR-001 — Build AulaOS by evolving `cuaderno-profe`
**Status:** accepted

Use the existing repository as the implementation base. Preserve valuable React/Vite UI, academic-year/group/student/subject concepts, import flows and reusable professional-library features. Do not perform a from-scratch rewrite unless a concrete module cannot be safely adapted.

## ADR-002 — Academic year is a data boundary from day zero
**Status:** accepted

Cohort data must be scoped to an academic year where applicable. Cross-year professional assets may remain independent. Advanced end-of-year workflows are deferred.

## ADR-003 — Natural-language capture must not require student codes
**Status:** accepted

The teacher may speak naturally using student names. Requiring spoken codes would add unacceptable friction.

## ADR-004 — Raw and operational transcripts are separate variants
**Status:** accepted

Pipeline:

`audio_raw -> transcript_raw -> pseudonymization -> transcript_work`

- `transcript_raw`: private, never full-text indexed, never externally exported by default.
- `transcript_work`: pseudonymized operational text, eligible for FTS5 and later local extraction.
- Every work transcript must retain provenance to its raw transcript.

## ADR-005 — Identity resolution is local and separated
**Status:** accepted

Maintain an identity/alias store separate from the operational dataset. It may contain official name, common name, diminutives and confirmed ASR variants. External AI integrations must never receive the identity store automatically.

## ADR-006 — Pseudonymization is deterministic before LLM processing
**Status:** accepted

Exact and normalized aliases are replaced deterministically. Ambiguous or unknown possible person references are flagged for review rather than silently guessed. Fuzzy matching must not automatically rewrite low-confidence tokens.

A work transcript with unresolved possible PII is not externally exportable.

## ADR-007 — Deterministic logic stays out of the LLM
**Status:** accepted

Python/SQL/code resolves deterministic concerns such as calendar expansion, explicit student codes, exact aliases, known schedule rules, deadlines derived from structured calendar rules, duplicate detection and storage state.

An LLM may interpret natural-language intent or segment text, but must not replace deterministic calculations.

## ADR-008 — Source, derived and curated data are distinct
**Status:** accepted

- SOURCE: original audio/text input.
- DERIVED: transcription, pseudonymized transcript, automated segments/classifications.
- CURATED: information explicitly accepted or edited by the teacher.

Automated output must never silently overwrite source material.

## ADR-009 — Native Android recorder for pilot capture
**Status:** accepted

Do not build in-browser audio recording for the pilot. The ingestion contract is simply: a supported audio file appears in the configured inbox directory. The synchronization mechanism is replaceable.

## ADR-010 — No semantic RAG in initial pilot
**Status:** accepted

Use structured filters and SQLite FTS5 first. Embeddings/RAG are deferred until real queries demonstrate a retrieval gap.

## ADR-011 — No offline-read service worker during initial pilot
**Status:** accepted

Native audio capture already covers offline write. Offline consultation is deferred until real use demonstrates a need. Avoid stale-cache complexity during the reliability pilot.

## ADR-012 — Session association is conservative and nullable
**Status:** accepted

A whole note may contain content about several moments of the day. `session_id` must not be mandatory at note level. Temporal association can provide candidates/context; later extracted segments may each link to different sessions.

Optimize for precision over coverage. Low automatic association coverage is acceptable if false associations remain rare.

## ADR-013 — Minimal initial extraction taxonomy
**Status:** accepted

When extraction is introduced, start with at most five semantic classes:

1. observation
2. interpretation
3. action
4. reflection
5. administrative

Fine-grained pedagogy tags are learned from the real corpus later.

## ADR-014 — External models are optional supervisors, never storage dependencies
**Status:** accepted

Core capture, storage, search and retrieval must work without Claude/OpenAI APIs. External models may later review sanitized export packages. No external model receives raw audio, raw transcripts, identity maps or student work images by default.

## ADR-015 — Family communications are in scope, but specially protected
**Status:** accepted

The teacher may record a post-conversation summary and agreements. AulaOS must not be designed to record the conversation itself. Family communications default to non-exportable externally.

## ADR-016 — Audio retention is configurable and longer during calibration
**Status:** accepted

Pilot default: 30 days after successful transcription. Audio associated with transcription/identity/QA problems may be retained up to 60 days. Retention must be configurable and automated. Revisit after calibration.

## ADR-017 — FTS indexes operational text only
**Status:** accepted

`transcript_raw` must never enter the FTS index. Search operates on `transcript_work` and later curated/derived operational records.

## ADR-018 — Repository files are the specification
**Status:** accepted

Schema, contracts and ADRs in the repository are authoritative. Proposed structural changes must be represented as repository diffs, not merely discussed in chat.

## ADR-019 — Pilot success is primarily behavioral and reliability-based
**Status:** accepted

By week 4, target:
- at least 5 notes/week captured without deliberate forcing;
- >=80% of audio files reach successful transcription without manual intervention;
- >=70% of remembered notes can be retrieved in under 30 seconds.

If capture usage is low, redesign capture before adding features.

## ADR-020 — Feature freeze before classroom use
**Status:** accepted

The day before pupils enter, add no new features. Fix blockers/critical reliability problems only.
