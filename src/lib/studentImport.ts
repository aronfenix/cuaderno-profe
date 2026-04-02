export interface GroupedStudentRow {
  groupName: string
  studentName: string
}

export interface ImportParseResult {
  rows: GroupedStudentRow[]
  errors: string[]
}

function normalizeHeader(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function detectDelimiter(firstLine: string): string {
  if (firstLine.includes(';')) return ';'
  if (firstLine.includes('\t')) return '\t'
  if (firstLine.includes(',')) return ','
  return ';'
}

export function parseGroupedStudents(rawText: string): ImportParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (!lines.length) return { rows: [], errors: [] }

  const delimiter = detectDelimiter(lines[0])
  const splitLine = (line: string) => line.split(delimiter).map(cell => cell.trim())

  const firstCells = splitLine(lines[0]).map(normalizeHeader)
  const headerLooksValid =
    firstCells.length >= 2 &&
    (firstCells[0] === 'grupo' || firstCells[0] === 'group') &&
    (firstCells[1] === 'alumno' || firstCells[1] === 'estudiante' || firstCells[1] === 'student' || firstCells[1] === 'nombre')

  const dataLines = headerLooksValid ? lines.slice(1) : lines
  const rows: GroupedStudentRow[] = []
  const errors: string[] = []

  dataLines.forEach((line, index) => {
    const lineNumber = headerLooksValid ? index + 2 : index + 1
    const cells = splitLine(line)
    if (cells.length < 2) {
      errors.push(`Linea ${lineNumber}: faltan columnas (esperado: grupo${delimiter}alumno)`)
      return
    }

    const [groupName, studentName] = cells
    if (!groupName || !studentName) {
      errors.push(`Linea ${lineNumber}: grupo o alumno vacio`)
      return
    }
    rows.push({ groupName, studentName })
  })

  return { rows, errors }
}
