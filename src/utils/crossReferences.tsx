import React from 'react'
import type { Norma, Figura } from './search'

// Tipo para tablas técnicas manuales
export interface TablaTecnicaData {
  id: string
  numero_tabla?: string
  titulo: string
  capitulo?: string
  capitulo_titulo?: string
  articulo?: string
  articulo_titulo?: string
  anexo?: string
  apartado_anexo?: string
  apartado_anexo_titulo?: string
  descripcion: string
  pagina_referencia?: number
  columnas: string[]
  notas?: string[]
  datos: Record<string, string | number>[]
}

// Interfaces para navegación
export interface NavigationHandlers {
  handleSelectSeccion: (numero: string) => void
  handleSelectTablaTecnica: (id: string) => void
  handleSelectGaleria: () => void
}

// Mapas de validación para referencias
export interface ValidationMaps {
  secciones: Set<string>
  anexos: Set<string>
  tablas: Map<string, string>
  figuras: Map<string, string>
}

// Tipo de referencia detectada
interface ReferenceMatch {
  type: 'anexo' | 'anexo-section' | 'chapter' | 'section' | 'tabla' | 'figura'
  text: string
  start: number
  end: number
  target: string
  priority: number // Para resolver conflictos de solapamiento
}

// Patrones regex para detectar referencias
const PATTERNS = {
  // "anexo B", "Anexo A" - prioridad alta para evitar conflictos con secciones
  anexo: /\banexo\s+([A-D])\b/gi,

  // "A.5.3.8", "(véase A.6.2.2.1)" - secciones de anexo
  anexoSection: /\b([A-D])\.(\d+(?:\.\d+)*)\b/g,

  // "capítulo 6", "capítulo 11"
  chapter: /\bcapítulo\s+(\d+)\b/gi,

  // "apartado 5.6", "apartado 10.1"
  apartado: /\bapartado\s+(\d+\.\d+(?:\.\d+)?)\b/gi,

  // "véase 5.6" sin "apartado" - más permisivo
  vease: /\bvéase\s+(\d+\.\d+(?:\.\d+)?)\b/gi,

  // "tabla A.1", "Tabla 3.2"
  tabla: /\btabla\s+([A-D])?\.?\s?(\d+(?:\.\d+)*)\b/gi,

  // "figura A.2.1", "Figura C.5"
  figura: /\bfigura\s+([A-D])?\.?\s?(\d+(?:\.\d+)*)\b/gi,
}

/**
 * Construye mapas de validación para verificar que las referencias existen
 */
export function buildValidationMaps(
  norma: Norma,
  tablasTecnicas: TablaTecnicaData[],
  figuras: Figura[]
): ValidationMaps {
  // Set de todas las secciones disponibles
  const secciones = new Set<string>()
  for (const seccion of norma.secciones) {
    secciones.add(seccion.numero)
  }

  // Set de anexos disponibles
  const anexos = new Set<string>(['A', 'B', 'C', 'D'])

  // Map de tablas: "A.1" -> "id_de_tabla"
  const tablas = new Map<string, string>()
  for (const tabla of tablasTecnicas) {
    // Extraer número de tabla del ID o numero_tabla
    const match = tabla.id.match(/tabla[_\s]+([A-D])?[_\s]?(\d+(?:[_\s]\d+)*)/)
    if (match) {
      const letra = match[1] || ''
      const numero = match[2].replace(/_/g, '.')
      const key = letra ? `${letra}.${numero}` : numero
      tablas.set(key, tabla.id)
      // También agregar sin letra para tablas numéricas
      if (letra) {
        tablas.set(numero, tabla.id)
      }
    }
  }

  // Map de figuras: "A.2.1" -> "figura_id"
  const figurasMap = new Map<string, string>()
  for (const figura of figuras) {
    // Intentar extraer número de figura del ID
    const match = figura.id.match(/([A-D])?[_\s]?(\d+(?:[_\s]\d+)*)/)
    if (match) {
      const letra = match[1] || ''
      const numero = match[2].replace(/_/g, '.')
      const key = letra ? `${letra}.${numero}` : numero
      figurasMap.set(key, figura.id)
    }
  }

  return {
    secciones,
    anexos,
    tablas,
    figuras: figurasMap,
  }
}

/**
 * Detecta todas las referencias en un texto
 */
function detectAllReferences(text: string, maps: ValidationMaps): ReferenceMatch[] {
  const matches: ReferenceMatch[] = []

  // 1. Detectar referencias a anexos completos
  PATTERNS.anexo.lastIndex = 0
  let match
  while ((match = PATTERNS.anexo.exec(text)) !== null) {
    const letra = match[1].toUpperCase()
    if (maps.anexos.has(letra)) {
      matches.push({
        type: 'anexo',
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        target: `ANEXO_${letra}`,
        priority: 5, // Alta prioridad
      })
    }
  }

  // 2. Detectar secciones de anexo (A.5.3.8)
  PATTERNS.anexoSection.lastIndex = 0
  while ((match = PATTERNS.anexoSection.exec(text)) !== null) {
    const letra = match[1].toUpperCase()
    const numero = match[2]
    const seccionNum = `${letra}.${numero}`

    if (maps.secciones.has(seccionNum)) {
      matches.push({
        type: 'anexo-section',
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        target: seccionNum,
        priority: 4,
      })
    }
  }

  // 3. Detectar capítulos
  PATTERNS.chapter.lastIndex = 0
  while ((match = PATTERNS.chapter.exec(text)) !== null) {
    const numero = match[1]

    if (maps.secciones.has(numero)) {
      matches.push({
        type: 'chapter',
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        target: numero,
        priority: 4,
      })
    }
  }

  // 4. Detectar apartados explícitos
  PATTERNS.apartado.lastIndex = 0
  while ((match = PATTERNS.apartado.exec(text)) !== null) {
    const numero = match[1]

    if (maps.secciones.has(numero)) {
      matches.push({
        type: 'section',
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        target: numero,
        priority: 4,
      })
    }
  }

  // 5. Detectar "véase X.X" sin "apartado"
  PATTERNS.vease.lastIndex = 0
  while ((match = PATTERNS.vease.exec(text)) !== null) {
    const numero = match[1]

    if (maps.secciones.has(numero)) {
      matches.push({
        type: 'section',
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        target: numero,
        priority: 3,
      })
    }
  }

  // 6. Detectar tablas
  PATTERNS.tabla.lastIndex = 0
  while ((match = PATTERNS.tabla.exec(text)) !== null) {
    const letra = match[1] ? match[1].toUpperCase() : ''
    const numero = match[2]
    const key = letra ? `${letra}.${numero}` : numero

    const tablaId = maps.tablas.get(key)
    if (tablaId) {
      matches.push({
        type: 'tabla',
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        target: tablaId,
        priority: 4,
      })
    }
  }

  // 7. Detectar figuras
  PATTERNS.figura.lastIndex = 0
  while ((match = PATTERNS.figura.exec(text)) !== null) {
    const letra = match[1] ? match[1].toUpperCase() : ''
    const numero = match[2]
    const key = letra ? `${letra}.${numero}` : numero

    // Si existe la figura específica, o si simplemente queremos abrir la galería
    if (maps.figuras.has(key) || maps.figuras.size > 0) {
      matches.push({
        type: 'figura',
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        target: key,
        priority: 4,
      })
    }
  }

  return matches
}

/**
 * Resuelve conflictos de solapamiento entre matches
 */
function resolveOverlaps(matches: ReferenceMatch[]): ReferenceMatch[] {
  if (matches.length === 0) return matches

  // Ordenar por posición y prioridad
  const sorted = [...matches].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start
    return b.priority - a.priority // Mayor prioridad primero
  })

  const resolved: ReferenceMatch[] = []
  let lastEnd = 0

  for (const match of sorted) {
    // Solo agregar si no solapa con el anterior
    if (match.start >= lastEnd) {
      resolved.push(match)
      lastEnd = match.end
    }
  }

  return resolved
}

/**
 * Procesa texto y convierte referencias en enlaces React
 */
export function processTextWithLinks(
  text: string,
  maps: ValidationMaps,
  handlers: NavigationHandlers
): React.ReactNode {
  // Detectar todas las referencias
  const allMatches = detectAllReferences(text, maps)

  // Resolver solapamientos
  const matches = resolveOverlaps(allMatches)

  // Si no hay matches, devolver texto plano
  if (matches.length === 0) {
    return text
  }

  // Construir array de elementos React
  const elements: React.ReactNode[] = []
  let lastIndex = 0
  let keyCounter = 0

  for (const match of matches) {
    // Texto antes del enlace
    if (match.start > lastIndex) {
      elements.push(text.slice(lastIndex, match.start))
    }

    // Validar que el texto del enlace no esté vacío
    const linkText = match.text.trim()
    if (!linkText) {
      // Si el texto está vacío, renderizar como texto plano
      elements.push(text.slice(match.start, match.end))
      lastIndex = match.end
      continue
    }

    // Crear enlace
    elements.push(
      <button
        key={`ref-${keyCounter++}-${match.start}`}
        onClick={(e) => {
          e.preventDefault()
          handleNavigation(match, handlers)
        }}
        className="text-blue-600 hover:text-blue-800 underline decoration-1 hover:decoration-2 underline-offset-2 cursor-pointer font-medium transition-colors"
        title={`Ir a ${getDestinationLabel(match)}`}
        type="button"
      >
        {linkText}
      </button>
    )

    lastIndex = match.end
  }

  // Texto después del último enlace
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex))
  }

  return React.createElement(React.Fragment, null, ...elements)
}

/**
 * Maneja la navegación según el tipo de referencia
 */
function handleNavigation(match: ReferenceMatch, handlers: NavigationHandlers): void {
  switch (match.type) {
    case 'anexo':
      handlers.handleSelectSeccion(match.target)
      break
    case 'anexo-section':
      handlers.handleSelectSeccion(match.target)
      break
    case 'chapter':
      handlers.handleSelectSeccion(match.target)
      break
    case 'section':
      handlers.handleSelectSeccion(match.target)
      break
    case 'tabla':
      handlers.handleSelectTablaTecnica(match.target)
      break
    case 'figura':
      handlers.handleSelectGaleria()
      // TODO futuro: scroll a figura específica si se implementa
      break
  }
}

/**
 * Obtiene etiqueta descriptiva para el tooltip
 */
function getDestinationLabel(match: ReferenceMatch): string {
  switch (match.type) {
    case 'anexo':
      return `Anexo ${match.target.replace('ANEXO_', '')}`
    case 'anexo-section':
      return `Sección ${match.target}`
    case 'chapter':
      return `Capítulo ${match.target}`
    case 'section':
      return `Sección ${match.target}`
    case 'tabla':
      return `Tabla ${match.target.replace('tabla_', '').replace(/_/g, '.')}`
    case 'figura':
      return `Figura ${match.target}`
    default:
      return match.target
  }
}
