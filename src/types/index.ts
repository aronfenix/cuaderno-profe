// ── Primitives ────────────────────────────────────────────────────────────────

export type SyncStatus = 'pending' | 'ok' | 'conflict'
export type Score = 1 | 2 | 3 | 4 | 5 | null  // null = N/A
export type RoundingMode = '1' | '0.5' | '0.1'
export type AssessmentStatus = 'draft' | 'active' | 'closed'
export type ResultStatus = 'pending' | 'in_progress' | 'completed'
export type LLMStudioState = 'intake' | 'generate' | 'iterate' | 'save'
export type TemplateSource = 'ai' | 'manual'

// ── Rubric internals ──────────────────────────────────────────────────────────

export interface Descriptors {
  1: string
  2: string
  3: string
  4: string
  5: string
}

export interface Criterion {
  id: string          // crypto.randomUUID()
  titleShort: string
  helpText?: string
  weight: number      // 0..1, all weights in template must sum to 1
  descriptors: Descriptors
}

// ── DB Entity interfaces ──────────────────────────────────────────────────────

export interface AcademicYear {
  id?: number
  name: string        // "2024-2025"
  isActive: boolean
  deviceId: string
  syncStatus: SyncStatus
  updatedAt: number
}

export interface ClassGroup {
  id?: number
  yearId: number
  name: string
  deviceId: string
  syncStatus: SyncStatus
  updatedAt: number
}

export interface Student {
  id?: number
  displayName: string
  deviceId: string
  syncStatus: SyncStatus
  updatedAt: number
}

export interface Enrollment {
  id?: number
  studentId: number
  groupId: number
  yearId: number
  syncStatus: SyncStatus
  updatedAt: number
}

export interface Subject {
  id?: number
  name: string
  yearId: number
  deviceId: string
  syncStatus: SyncStatus
  updatedAt: number
}

export interface InstrumentTemplate {
  id?: number
  title: string
  description: string
  tags: string[]
  scale: { type: '1-5'; allowNA: boolean }
  finalGrade: { scale: '1-10'; rounding: RoundingMode }
  criteria: Criterion[]
  version: number
  createdAt: number
  updatedAt: number
  source: TemplateSource
  conversationSummary?: string
  syncStatus: SyncStatus
  deviceId: string
}

export interface Assessment {
  id?: number
  title: string
  date: string        // ISO date "2025-03-15"
  groupId: number
  subjectId: number
  templateId: number
  snapshotId: number
  status: AssessmentStatus
  deviceId: string
  syncStatus: SyncStatus
  updatedAt: number
}

export interface InstrumentSnapshot {
  id?: number
  templateId: number
  assessmentId: number
  data: InstrumentTemplate   // frozen copy at assessment creation time
  createdAt: number
}

export interface StudentAssessmentResult {
  id?: number
  assessmentId: number
  studentId: number
  status: ResultStatus
  finalGrade: number | null   // 1..10 or null
  comment: string
  completedAt: number | null
  deviceId: string
  syncStatus: SyncStatus
  updatedAt: number
}

export interface CriterionScore {
  id?: number
  resultId: number
  criterionId: string   // matches Criterion.id (uuid string)
  score: Score          // 1|2|3|4|5|null
  updatedAt: number
}

// ── UI-only types (not persisted) ────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface GradeCalculationResult {
  avg1to5: number | null
  grade1to10: number | null
  naCount: number
  totalCount: number
}

export interface LLMSettings {
  anthropicApiKey: string
  model: string
}

// Template JSON format as produced/consumed by AI (slightly different from DB shape)
export type TemplateJSON = Omit<InstrumentTemplate, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'source' | 'conversationSummary' | 'syncStatus' | 'deviceId'>
