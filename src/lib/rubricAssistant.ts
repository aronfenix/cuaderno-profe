import type { InstrumentTemplate, RoundingMode } from '../types'

export interface RubricAssistantInput {
  title: string
  subject: string
  stage: string
  activityType: string
  evidence: string
  objective: string
  criteriaCount: number
  rounding: RoundingMode
}

function splitKeywords(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeWeights(size: number): number[] {
  const base = Array.from({ length: size }, () => 1 / size)
  const rounded = base.map(value => Number(value.toFixed(4)))
  const sum = rounded.reduce((acc, value) => acc + value, 0)
  rounded[rounded.length - 1] = Number((rounded[rounded.length - 1] + (1 - sum)).toFixed(4))
  return rounded
}

function fallbackCriteria(activityType: string): string[] {
  const key = activityType.toLowerCase()
  if (key.includes('oral') || key.includes('expos')) {
    return ['Dominio del contenido', 'Estructura del discurso', 'Comunicacion oral', 'Uso de vocabulario', 'Actitud y participacion']
  }
  if (key.includes('escrit') || key.includes('redaccion')) {
    return ['Adecuacion al tema', 'Organizacion de ideas', 'Correccion linguistica', 'Riqueza de vocabulario', 'Presentacion final']
  }
  if (key.includes('proyecto') || key.includes('trabajo')) {
    return ['Planificacion', 'Calidad del producto', 'Rigor academico', 'Colaboracion', 'Presentacion de resultados']
  }
  return ['Comprension de contenidos', 'Aplicacion practica', 'Calidad de la evidencia', 'Autonomia de trabajo', 'Comunicacion de resultados']
}

function buildDescriptors(criterion: string, objective: string): { 1: string; 2: string; 3: string; 4: string; 5: string } {
  const focus = objective ? `en relacion con ${objective}` : 'segun lo esperado para la actividad'
  return {
    1: `Nivel inicial: apenas evidencia ${criterion.toLowerCase()} y necesita apoyo constante ${focus}.`,
    2: `Nivel basico: muestra avances puntuales en ${criterion.toLowerCase()}, pero con errores frecuentes ${focus}.`,
    3: `Nivel esperado: demuestra ${criterion.toLowerCase()} de forma correcta y estable ${focus}.`,
    4: `Nivel alto: aplica ${criterion.toLowerCase()} con precision y autonomia ${focus}.`,
    5: `Nivel excelente: destaca en ${criterion.toLowerCase()} con solvencia, transferencia y reflexion propia ${focus}.`,
  }
}

export function buildAssistedTemplate(input: RubricAssistantInput): Omit<InstrumentTemplate, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'source' | 'conversationSummary' | 'syncStatus' | 'deviceId'> {
  const requestedCount = clamp(Math.round(input.criteriaCount), 3, 8)
  const keywords = splitKeywords(input.evidence)
  const fallback = fallbackCriteria(input.activityType)

  const criteriaTitles = [...keywords, ...fallback].slice(0, requestedCount)
  while (criteriaTitles.length < requestedCount) {
    criteriaTitles.push(`Criterio ${criteriaTitles.length + 1}`)
  }

  const weights = normalizeWeights(criteriaTitles.length)

  return {
    title: input.title.trim() || 'Rubrica asistida',
    description: [
      input.subject ? `Asignatura: ${input.subject}.` : '',
      input.stage ? `Etapa/curso: ${input.stage}.` : '',
      input.activityType ? `Actividad: ${input.activityType}.` : '',
      input.objective ? `Objetivo principal: ${input.objective}.` : '',
    ].filter(Boolean).join(' '),
    tags: [input.subject, input.stage, input.activityType].filter(Boolean),
    scale: { type: '1-5', allowNA: true },
    finalGrade: { scale: '1-10', rounding: input.rounding },
    criteria: criteriaTitles.map((title, index) => ({
      id: crypto.randomUUID(),
      titleShort: title.slice(0, 40),
      helpText: input.evidence ? `Evidencia esperada: ${input.evidence}` : '',
      weight: weights[index],
      descriptors: buildDescriptors(title, input.objective),
    })),
  }
}
