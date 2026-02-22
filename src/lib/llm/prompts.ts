import type { InstrumentTemplate } from '../../types'

export const SCHEMA_DESCRIPTION = `
{
  "title": "string",
  "description": "string",
  "tags": ["string"],
  "scale": { "type": "1-5", "allowNA": true },
  "finalGrade": { "scale": "1-10", "rounding": "0.5" },
  "criteria": [
    {
      "id": "<uuid v4>",
      "titleShort": "string (máx 40 chars)",
      "helpText": "string opcional",
      "weight": <número 0..1>,
      "descriptors": {
        "1": "descripción nivel 1 — lo mínimo observable",
        "2": "descripción nivel 2",
        "3": "descripción nivel 3 — el estándar esperado",
        "4": "descripción nivel 4",
        "5": "descripción nivel 5 — excelencia observable"
      }
    }
  ]
}
`

export const SYSTEM_PROMPT_GENERATE = `
Eres un experto en evaluación educativa para Educación Primaria y Secundaria en España.
Tu tarea es crear rúbricas de evaluación SOLO como JSON válido, sin texto adicional, sin bloques markdown, sin explicaciones.

REGLAS ESTRICTAS:
- Responde ÚNICAMENTE con el objeto JSON. Sin texto antes ni después.
- La suma de todos los "weight" DEBE ser exactamente 1.0 (tolerancia 0.001).
- Incluir entre 4 y 7 criterios (máximo 8).
- "titleShort" máximo 40 caracteres, en español.
- "descriptors" OBLIGATORIO para niveles 1, 2, 3, 4 y 5. Deben ser observables y no solapados.
- Genera IDs únicos (formato UUID v4) para cada criterio.
- Idioma: español.
- Si falta información, haz hasta 4 preguntas concisas ANTES de generar el JSON.

ESQUEMA REQUERIDO:
${SCHEMA_DESCRIPTION}
`.trim()

export const SYSTEM_PROMPT_ITERATE = `
Eres un experto en evaluación educativa. Recibirás una rúbrica existente en JSON y una petición de cambios en español.
Responde ÚNICAMENTE con el JSON completo y actualizado. Sin texto adicional.

REGLAS:
- Mantén los IDs de criterios existentes donde sea posible.
- Si se añaden criterios, genera nuevos UUIDs.
- Ajusta weights para que sumen exactamente 1.0 tras los cambios.
- Mantén el esquema exacto.
`.trim()

export function buildIntakeMessage(userInput: string): string {
  return `Crea una rúbrica de evaluación para la siguiente actividad:\n\n${userInput}`
}

export function buildIterateMessage(userInput: string, currentTemplate: InstrumentTemplate): string {
  const templateCopy = { ...currentTemplate }
  // Remove DB-specific fields before sending to LLM
  delete (templateCopy as Partial<InstrumentTemplate>).id
  delete (templateCopy as Partial<InstrumentTemplate>).version
  delete (templateCopy as Partial<InstrumentTemplate>).source
  delete (templateCopy as Partial<InstrumentTemplate>).conversationSummary
  delete (templateCopy as Partial<InstrumentTemplate>).syncStatus
  delete (templateCopy as Partial<InstrumentTemplate>).deviceId

  return `Rúbrica actual:\n${JSON.stringify(templateCopy, null, 2)}\n\nCambios solicitados:\n${userInput}`
}

export function validateAndFixTemplate(raw: string): InstrumentTemplate | { error: string } {
  let parsed: InstrumentTemplate

  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim()

  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    return { error: `JSON inválido: ${(e as Error).message}` }
  }

  // Structural validation
  if (!parsed.title) return { error: 'Falta el campo "title"' }
  if (!Array.isArray(parsed.criteria) || parsed.criteria.length === 0) {
    return { error: 'Falta el campo "criteria" o está vacío' }
  }

  // Validate criteria
  for (const c of parsed.criteria) {
    if (!c.id) return { error: `Criterio sin "id"` }
    if (!c.titleShort) return { error: `Criterio "${c.id}" sin "titleShort"` }
    if (!c.descriptors || typeof c.descriptors !== 'object') {
      return { error: `Criterio "${c.titleShort}" sin "descriptors"` }
    }
    for (const level of [1, 2, 3, 4, 5] as const) {
      if (!c.descriptors[level]) {
        return { error: `Criterio "${c.titleShort}" sin descriptor nivel ${level}` }
      }
    }
  }

  // Check and fix weights
  const weightSum = parsed.criteria.reduce((a, c) => a + (c.weight || 0), 0)
  if (Math.abs(weightSum - 1) > 0.01) {
    if (weightSum === 0) return { error: 'Todos los pesos son 0' }
    // Auto-fix: renormalize
    parsed.criteria = parsed.criteria.map(c => ({
      ...c,
      weight: c.weight / weightSum
    }))
  }

  // Ensure defaults
  if (!parsed.scale) {
    parsed.scale = { type: '1-5', allowNA: true }
  }
  if (!parsed.finalGrade) {
    parsed.finalGrade = { scale: '1-10', rounding: '0.5' }
  }
  if (!parsed.tags) parsed.tags = []
  if (!parsed.description) parsed.description = ''

  return parsed
}
