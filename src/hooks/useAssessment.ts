import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { AssessmentsRepo } from '../db/repos/AssessmentsRepo'
import { StudentsRepo } from '../db/repos/StudentsRepo'
import { ResultsRepo } from '../db/repos/ResultsRepo'

export function useAssessmentDetail(assessmentId: number) {
  const assessment = useLiveQuery(
    () => AssessmentsRepo.getById(assessmentId),
    [assessmentId]
  )

  const snapshot = useLiveQuery(
    () => AssessmentsRepo.getSnapshot(assessmentId),
    [assessmentId]
  )

  const students = useLiveQuery(
    async () => {
      if (!assessment?.groupId) return []
      return StudentsRepo.getByGroup(assessment.groupId)
    },
    [assessment?.groupId]
  )

  const results = useLiveQuery(
    () => ResultsRepo.getAllForAssessment(assessmentId),
    [assessmentId]
  )

  const subject = useLiveQuery(
    async () => {
      if (!assessment?.subjectId) return undefined
      return db.subjects.get(assessment.subjectId)
    },
    [assessment?.subjectId]
  )

  const group = useLiveQuery(
    async () => {
      if (!assessment?.groupId) return undefined
      return db.classGroups.get(assessment.groupId)
    },
    [assessment?.groupId]
  )

  const teamArrangement = useLiveQuery(
    async () => {
      if (!assessment?.teamArrangementId) return undefined
      return db.teamArrangements.get(assessment.teamArrangementId)
    },
    [assessment?.teamArrangementId]
  )

  return {
    assessment,
    snapshot,
    students: students ?? [],
    results: results ?? [],
    subject,
    group,
    teamArrangement,
    isLoading: assessment === undefined
  }
}
