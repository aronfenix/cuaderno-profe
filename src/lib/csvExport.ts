import type { StudentAssessmentResult, Student, InstrumentSnapshot, CriterionScore } from '../types'

interface ExportRow {
  student: Student
  result: StudentAssessmentResult
  scores: CriterionScore[]
}

export function generateCSV(
  rows: ExportRow[],
  snapshot: InstrumentSnapshot,
  assessmentTitle: string
): string {
  const criteria = snapshot.data.criteria

  const headers = [
    'Alumno',
    ...criteria.map(c => c.titleShort),
    'Nota (1-10)',
    'Comentario',
    'Estado',
  ]

  const dataRows = rows.map(({ student, result, scores }) => {
    const scoreMap = new Map(scores.map(s => [s.criterionId, s.score]))
    const cells = [
      csvCell(student.displayName),
      ...criteria.map(c => {
        const s = scoreMap.get(c.id)
        return s === null ? 'N/A' : (s ?? '').toString()
      }),
      result.finalGrade !== null ? result.finalGrade.toFixed(1) : '',
      csvCell(result.comment ?? ''),
      translateStatus(result.status),
    ]
    return cells.join(',')
  })

  const csvContent = [headers.join(','), ...dataRows].join('\r\n')
  return csvContent
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function translateStatus(status: string): string {
  switch (status) {
    case 'completed': return 'Completado'
    case 'in_progress': return 'En progreso'
    case 'pending': return 'Pendiente'
    default: return status
  }
}

export function downloadCSV(content: string, filename: string): void {
  // BOM (U+FEFF) ensures Excel on Windows reads UTF-8 correctly (Spanish chars)
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
