import { db } from './schema'
import { getDeviceId } from './repos/deviceId'

// ── Real student lists (plain arrays — safe at module level) ──────────────────

// 6ºA — 24 alumnos. Apellidos incluidos; los dos Martín se distinguen por apellido
const STUDENTS_6A = [
  'Bander Jalilita',
  'Paola Andre Beltran Ledesma',
  'Bounajm, Rami',           // Apellido primero por convención del centro
  'Cai, Xiyan',
  'Castaño Angulo, Mariam Victoria',
  'El Mansouri El Ghrissat, Mohamed Reda',
  'Flores Betanco, Elkin Manuel',
  'Flores Lavalle, Valentina Angelina',
  'García Guida, Nikko',
  'García Lemos, Ángela Lisbeth',
  'García-Porrero García, Martín',
  'González Pinilla, Ulises',
  'Hernández Gutiérrez, Erika',
  'Jiménez Velasco, Martín',
  'Lima De la Cruz, Rohan',
  'Mena Alcázar, Saray',
  'Mendoza Jiménez, Carmen',
  'Múgica Rabazo, Adrián',
  'Munilla Moreno, Ángel Arsel',
  'Pulgarín, Anthony',
  'Ruiz Candiotti, Liam Geremy',
  'Terán Romero, José Manuel',
  'Torres Álvarez, Juan Esteban',
  'Linares Menéndez, Samuel Natanael',
]

// 6ºB — 23 alumnos. Solo nombre (o nombre compuesto)
const STUDENTS_6B = [
  'Yeva',
  'Erik',
  'Douae',
  'Mateo',
  'Rayan',
  'Ciara',
  'Mohamed',
  'Abraham',
  'Alexander',
  'Sara Elizabeth',
  'Ainhoa Esther',
  'Cristal',
  'Mariana',
  'Piero Stefano',
  'Carolina',
  'Dylan',
  'Alba',
  'Matías',
  'Sofía Isabella',
  'Isabella Valentina',
  'Carlos Manuel',
  'Elianny Andrea Nailea',
  'Luissel',
]

// ── Rubric for Proyecto Energía (miniexposición oral + ficha) ─────────────────
// Task: 1-minute oral presentation + hand-written index card on an energy topic.
// Subject: Ciencias de la Naturaleza 6º Primaria, CEIP Perú, Móstoles 2024-25.

function buildProyectoEnergiaRubric(deviceId: string) {
  const now = Date.now()
  return {
    title: 'Miniexposición energía (Proyecto Energía)',
    description:
      'Rúbrica para evaluar la exposición oral de 1 minuto y la ficha de media cuartilla del Proyecto Energía (Tema 4, CN 6º Primaria). 6 criterios: contenido (35%), estructura (15%), expresión oral (15%), adecuación (10%), ficha (20%), diseño ficha (5%).',
    tags: ['ciencias', 'energía', '6º primaria', 'oral', 'ficha'],
    scale: { type: '1-5' as const, allowNA: true },
    finalGrade: { scale: '1-10' as const, rounding: '0.5' as const },
    criteria: [
      {
        id: crypto.randomUUID(),
        titleShort: 'Contenido científico',
        helpText: 'Explica correctamente el concepto: transformación/tipo de energía, ley de conservación, ejemplo real.',
        weight: 0.35,
        descriptors: {
          1: 'La explicación es incorrecta o tan escasa que no se entiende el concepto.',
          2: 'Menciona el tema pero con errores conceptuales o sin explicar la transformación de energía.',
          3: 'Explica el concepto principal de forma correcta, con al menos un ejemplo.',
          4: 'Explica el concepto con precisión, relaciona la transformación y añade detalle relevante.',
          5: 'Explicación completa, precisa y enriquecida (comparación, dato curioso o aplicación real).',
        }
      },
      {
        id: crypto.randomUUID(),
        titleShort: 'Estructura y tiempo',
        helpText: 'Sigue los 5 pasos: enuncia la pregunta → desarrolla → concluye. Respeta ≈1 minuto.',
        weight: 0.15,
        descriptors: {
          1: 'No hay estructura apreciable. Muy por encima o por debajo del tiempo (menos de 20 s o más de 90 s).',
          2: 'Estructura muy básica o tiempo claramente desajustado (más de 30 s de diferencia).',
          3: 'Enuncia, desarrolla y concluye. Tiempo aproximado (45-75 s).',
          4: 'Estructura clara y fluida. Tiempo bien ajustado (55-70 s).',
          5: 'Estructura impecable con transiciones naturales. Tiempo perfectamente controlado.',
        }
      },
      {
        id: crypto.randomUUID(),
        titleShort: 'Expresión oral',
        helpText: 'Voz audible, ritmo adecuado, vocabulario científico correcto, mira al público.',
        weight: 0.15,
        descriptors: {
          1: 'Voz inaudible o monotonía extrema. No usa vocabulario científico. Lee sin levantar la vista.',
          2: 'Voz poco clara o ritmo muy entrecortado. Vocabulario impreciso.',
          3: 'Voz audible y ritmo aceptable. Usa algún término científico. Contacto visual ocasional.',
          4: 'Buena voz, ritmo y vocabulario. Contacto visual frecuente.',
          5: 'Excelente expresión: natural, fluida, vocabulario científico preciso y buen contacto visual.',
        }
      },
      {
        id: crypto.randomUUID(),
        titleShort: 'Adecuación al contenido',
        helpText: 'La exposición responde específicamente a la pregunta asignada, sin divagar ni mezclar con otros temas.',
        weight: 0.10,
        descriptors: {
          1: 'No responde a la pregunta asignada o habla de otra cosa.',
          2: 'Apenas toca la pregunta; el contenido es mayormente genérico o de otro tema.',
          3: 'Responde a la pregunta aunque con algún desvío o imprecisión en el enfoque.',
          4: 'La exposición está bien centrada en la pregunta y no se desvía.',
          5: 'Responde con total precisión a la pregunta asignada, con ejemplos o datos muy ajustados al tema.',
        }
      },
      {
        id: crypto.randomUUID(),
        titleShort: 'Ficha (media cuartilla)',
        helpText: 'Tiene título, resumen (3-5 frases o esquema), dibujo/diagrama y nombre. Legible de un vistazo.',
        weight: 0.20,
        descriptors: {
          1: 'Falta la ficha o no tiene ninguno de los elementos requeridos.',
          2: 'Solo tiene 1-2 elementos (p. ej. título y nombre, sin resumen ni dibujo).',
          3: 'Tiene los 4 elementos básicos. Presentación mejorable.',
          4: 'Todos los elementos presentes, claros y bien organizados.',
          5: 'Ficha completa, muy visual, creativa y usable como referencia rápida.',
        }
      },
      {
        id: crypto.randomUUID(),
        titleShort: 'Diseño y presentación de la ficha',
        helpText: 'La ficha es visualmente atractiva, ordenada y fácil de leer. Cuida la caligrafía, el color y la disposición.',
        weight: 0.05,
        descriptors: {
          1: 'La ficha es ilegible, muy desordenada o descuidada.',
          2: 'Presentación muy básica, sin cuidado visual ni orden claro.',
          3: 'Presentación aceptable: se lee, aunque mejorable en orden o estética.',
          4: 'Ficha ordenada, limpia y con buen uso del espacio.',
          5: 'Ficha muy cuidada: caligrafía clara, uso de color, diagramas o elementos visuales destacados.',
        }
      },
    ],
    version: 1,
    createdAt: now,
    updatedAt: now,
    source: 'manual' as const,
    conversationSummary:
      'Exposición oral 1 min + ficha media cuartilla, Tema 4 Energía, CN 6º Primaria CEIP Perú.',
    syncStatus: 'pending' as const,
    deviceId,
  }
}

// ── Generic "Exposición oral" template (kept as additional example) ────────────
function buildGenericOralRubric(deviceId: string) {
  const now = Date.now()
  return {
    title: 'Exposición oral (genérica)',
    description: 'Rúbrica general para evaluar exposiciones orales en Primaria.',
    tags: ['oral', 'presentación', 'primaria'],
    scale: { type: '1-5' as const, allowNA: true },
    finalGrade: { scale: '1-10' as const, rounding: '0.5' as const },
    criteria: [
      {
        id: crypto.randomUUID(),
        titleShort: 'Contenido',
        helpText: 'Rigor, profundidad y organización del contenido.',
        weight: 0.30,
        descriptors: {
          1: 'El contenido es escaso o incorrecto. No hay estructura.',
          2: 'El contenido es básico con algunos errores. Poca organización.',
          3: 'El contenido es correcto y está organizado de forma aceptable.',
          4: 'El contenido es completo, correcto y bien organizado.',
          5: 'El contenido es excelente, profundo y perfectamente estructurado.',
        }
      },
      {
        id: crypto.randomUUID(),
        titleShort: 'Claridad expositiva',
        helpText: 'Cómo de claro y comprensible es el discurso.',
        weight: 0.25,
        descriptors: {
          1: 'Es difícil entender lo que dice. No hay coherencia.',
          2: 'Se entiende con dificultad. Hay saltos o confusión.',
          3: 'Se entiende en general, aunque hay algún momento confuso.',
          4: 'El discurso es claro y fácil de seguir.',
          5: 'La exposición es extraordinariamente clara y precisa.',
        }
      },
      {
        id: crypto.randomUUID(),
        titleShort: 'Vocabulario',
        weight: 0.20,
        descriptors: {
          1: 'Vocabulario muy limitado o inapropiado.',
          2: 'Vocabulario básico con pocas palabras específicas.',
          3: 'Vocabulario adecuado con algún término específico.',
          4: 'Vocabulario variado y preciso, con términos del tema.',
          5: 'Vocabulario rico, preciso y perfectamente integrado.',
        }
      },
      {
        id: crypto.randomUUID(),
        titleShort: 'Expresión oral',
        helpText: 'Voz, ritmo, entonación y contacto visual.',
        weight: 0.15,
        descriptors: {
          1: 'Voz muy baja o inaudible. No mira al público.',
          2: 'Voz poco clara. Escaso contacto visual.',
          3: 'Voz audible. Contacto visual ocasional.',
          4: 'Buena voz y ritmo. Contacto visual frecuente.',
          5: 'Excelente expresión oral. Capta y mantiene la atención.',
        }
      },
      {
        id: crypto.randomUUID(),
        titleShort: 'Actitud y seguridad',
        weight: 0.10,
        descriptors: {
          1: 'Muy nervioso/a, inseguro/a. No responde preguntas.',
          2: 'Nerviosismo notorio que afecta a la presentación.',
          3: 'Algo nervioso/a pero lo gestiona aceptablemente.',
          4: 'Seguro/a y tranquilo/a durante la mayor parte.',
          5: 'Totalmente seguro/a, natural y confiado/a.',
        }
      },
    ],
    version: 1,
    createdAt: now,
    updatedAt: now,
    source: 'manual' as const,
    syncStatus: 'pending' as const,
    deviceId,
  }
}

// ── Main seed function ────────────────────────────────────────────────────────

export async function seedDemoData(): Promise<void> {
  let initialized: string | null = null
  try {
    initialized = localStorage.getItem('cuaderno_initialized')
  } catch {
    return // localStorage unavailable — skip silently
  }
  if (initialized) return

  const deviceId = getDeviceId()
  console.log('[seed] Seeding real class data...')

  try {
    // Academic year
    const yearId = await db.academicYears.add({
      name: '2024-2025',
      isActive: true,
      deviceId,
      syncStatus: 'pending',
      updatedAt: Date.now(),
    }) as number

    // Groups
    const groupA_Id = await db.classGroups.add({
      yearId, name: '6ºA', deviceId, syncStatus: 'pending', updatedAt: Date.now(),
    }) as number

    const groupB_Id = await db.classGroups.add({
      yearId, name: '6ºB', deviceId, syncStatus: 'pending', updatedAt: Date.now(),
    }) as number

    // Subjects
    await db.subjects.bulkAdd([
      { name: 'Ciencias de la Naturaleza', yearId, deviceId, syncStatus: 'pending', updatedAt: Date.now() },
      { name: 'Lengua Castellana', yearId, deviceId, syncStatus: 'pending', updatedAt: Date.now() },
      { name: 'Matemáticas', yearId, deviceId, syncStatus: 'pending', updatedAt: Date.now() },
      { name: 'Ciencias Sociales', yearId, deviceId, syncStatus: 'pending', updatedAt: Date.now() },
      { name: 'Inglés', yearId, deviceId, syncStatus: 'pending', updatedAt: Date.now() },
      { name: 'Educación Artística', yearId, deviceId, syncStatus: 'pending', updatedAt: Date.now() },
    ])

    // 6ºA students
    for (const name of STUDENTS_6A) {
      const studentId = await db.students.add({
        displayName: name, deviceId, syncStatus: 'pending', updatedAt: Date.now(),
      }) as number
      await db.enrollments.add({
        studentId, groupId: groupA_Id, yearId, syncStatus: 'pending', updatedAt: Date.now(),
      })
    }

    // 6ºB students
    for (const name of STUDENTS_6B) {
      const studentId = await db.students.add({
        displayName: name, deviceId, syncStatus: 'pending', updatedAt: Date.now(),
      }) as number
      await db.enrollments.add({
        studentId, groupId: groupB_Id, yearId, syncStatus: 'pending', updatedAt: Date.now(),
      })
    }

    // Rubric templates
    await db.templates.add(buildProyectoEnergiaRubric(deviceId))
    await db.templates.add(buildGenericOralRubric(deviceId))

    localStorage.setItem('cuaderno_initialized', '1')
    console.log(`[seed] Done. 6ºA: ${STUDENTS_6A.length}, 6ºB: ${STUDENTS_6B.length} alumnos.`)
  } catch (err) {
    console.error('[seed] Seeding failed:', err)
  }
}
