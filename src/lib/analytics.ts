import type {
  Assessment,
  ClassGroup,
  Student,
  StudentAssessmentResult,
  Subject,
} from '../types'

export interface SubjectAverageRow {
  subjectId: number
  subjectName: string
  groupId: number
  groupName: string
  average: number
  sampleSize: number
}

export interface StudentSubjectAverageRow {
  studentId: number
  studentName: string
  subjectId: number
  subjectName: string
  average: number
  sampleSize: number
}

export interface StudentRiskRow {
  studentId: number
  studentName: string
  overallAverage: number
  completedAssessments: number
}

export interface AnalyticsSnapshot {
  subjectAverages: SubjectAverageRow[]
  studentSubjectAverages: StudentSubjectAverageRow[]
  riskStudents: StudentRiskRow[]
}

function makeKey(left: number, right: number): string {
  return `${left}:${right}`
}

export function buildAnalyticsSnapshot(params: {
  assessments: Assessment[]
  results: StudentAssessmentResult[]
  students: Student[]
  subjects: Subject[]
  groups: ClassGroup[]
}): AnalyticsSnapshot {
  const { assessments, results, students, subjects, groups } = params

  const assessmentMap = new Map(assessments.map(a => [a.id!, a]))
  const studentMap = new Map(students.map(s => [s.id!, s]))
  const subjectMap = new Map(subjects.map(s => [s.id!, s.name]))
  const groupMap = new Map(groups.map(g => [g.id!, g.name]))

  const subjectGroupBucket = new Map<string, { sum: number; count: number; subjectId: number; groupId: number }>()
  const studentSubjectBucket = new Map<string, { sum: number; count: number; studentId: number; subjectId: number }>()
  const studentTotalBucket = new Map<number, { sum: number; count: number }>()

  for (const result of results) {
    if (result.finalGrade === null || result.assessmentId === undefined) continue
    const assessment = assessmentMap.get(result.assessmentId)
    if (!assessment) continue

    const sgKey = makeKey(assessment.subjectId, assessment.groupId)
    const sg = subjectGroupBucket.get(sgKey) ?? {
      sum: 0,
      count: 0,
      subjectId: assessment.subjectId,
      groupId: assessment.groupId,
    }
    sg.sum += result.finalGrade
    sg.count += 1
    subjectGroupBucket.set(sgKey, sg)

    const ssKey = makeKey(result.studentId, assessment.subjectId)
    const ss = studentSubjectBucket.get(ssKey) ?? {
      sum: 0,
      count: 0,
      studentId: result.studentId,
      subjectId: assessment.subjectId,
    }
    ss.sum += result.finalGrade
    ss.count += 1
    studentSubjectBucket.set(ssKey, ss)

    const st = studentTotalBucket.get(result.studentId) ?? { sum: 0, count: 0 }
    st.sum += result.finalGrade
    st.count += 1
    studentTotalBucket.set(result.studentId, st)
  }

  const subjectAverages: SubjectAverageRow[] = Array.from(subjectGroupBucket.values())
    .map(entry => ({
      subjectId: entry.subjectId,
      subjectName: subjectMap.get(entry.subjectId) ?? `Asignatura ${entry.subjectId}`,
      groupId: entry.groupId,
      groupName: groupMap.get(entry.groupId) ?? `Grupo ${entry.groupId}`,
      average: entry.sum / entry.count,
      sampleSize: entry.count,
    }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName) || a.groupName.localeCompare(b.groupName))

  const studentSubjectAverages: StudentSubjectAverageRow[] = Array.from(studentSubjectBucket.values())
    .map(entry => ({
      studentId: entry.studentId,
      studentName: studentMap.get(entry.studentId)?.displayName ?? `Alumno ${entry.studentId}`,
      subjectId: entry.subjectId,
      subjectName: subjectMap.get(entry.subjectId) ?? `Asignatura ${entry.subjectId}`,
      average: entry.sum / entry.count,
      sampleSize: entry.count,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName) || a.subjectName.localeCompare(b.subjectName))

  const riskStudents: StudentRiskRow[] = Array.from(studentTotalBucket.entries())
    .map(([studentId, totals]) => ({
      studentId,
      studentName: studentMap.get(studentId)?.displayName ?? `Alumno ${studentId}`,
      overallAverage: totals.sum / totals.count,
      completedAssessments: totals.count,
    }))
    .filter(row => row.completedAssessments >= 2 && row.overallAverage < 5)
    .sort((a, b) => a.overallAverage - b.overallAverage)

  return {
    subjectAverages,
    studentSubjectAverages,
    riskStudents,
  }
}
