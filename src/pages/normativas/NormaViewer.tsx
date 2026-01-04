import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import SeccionesNav from '../../components/normativas/SeccionesNav'
import TablaTecnica from '../../components/normativas/TablaTecnica'
import GaleriaFiguras from '../../components/normativas/GaleriaFiguras'
import { normasDisponibles } from '../Normativas'
import tablasManuales from '../../data/normas/tablas-une-23007-14.json'

// Tipo para tablas manuales
interface TablaTecnicaData {
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

// Info de Anexos
const ANEXOS_INFO: Record<string, { titulo: string; tipo: string }> = {
  'A': { titulo: 'Requisitos especificos', tipo: 'Normativo' },
  'B': { titulo: 'Falsas alarmas', tipo: 'Informativo' },
  'C': { titulo: 'Modelos de documentos', tipo: 'Informativo' },
  'D': { titulo: 'Bibliografia', tipo: 'Informativo' }
}

export default function NormaViewer() {
  const { normaId } = useParams<{ normaId: string }>()
  const [seccionActiva, setSeccionActiva] = useState<string | null>(null)
  const [tablaTecnicaActiva, setTablaTecnicaActiva] = useState<string | null>(null)
  const [galeriaActiva, setGaleriaActiva] = useState(false)
  const contenidoRef = useRef<HTMLDivElement>(null)

  // Obtener tablas tecnicas manuales (solo para UNE 23007-14)
  const tablasTecnicas: TablaTecnicaData[] = normaId?.includes('23007-14')
    ? tablasManuales.tablas as TablaTecnicaData[]
    : []

  // Buscar la norma
  const norma = normasDisponibles.find(n => {
    const id = n.norma.toLowerCase().replace(/[:\s]+/g, '-')
    return id === normaId
  })

  // Obtener figuras de la norma
  const figuras = norma?.figuras || []

  // Seleccionar primera seccion al cargar (solo si no hay nada seleccionado)
  useEffect(() => {
    if (norma && norma.secciones.length > 0 && !seccionActiva && !tablaTecnicaActiva && !galeriaActiva) {
      const primeraSeccion = norma.secciones.find(s => /^\d+$/.test(s.numero))
      if (primeraSeccion) {
        setSeccionActiva(primeraSeccion.numero)
      }
    }
  }, [norma, seccionActiva, tablaTecnicaActiva, galeriaActiva])

  // Calcular contenido agregado para la seccion activa
  const contenidoAgregado = useMemo(() => {
    if (!norma || !seccionActiva) return null

    // Verificar si es un Anexo (ANEXO_A, ANEXO_B, etc.)
    const anexoMatch = seccionActiva.match(/^ANEXO_([A-Z])$/)
    if (anexoMatch) {
      const letra = anexoMatch[1]
      const info = ANEXOS_INFO[letra] || { titulo: '', tipo: '' }

      // Obtener todas las secciones del anexo
      const seccionesAnexo = norma.secciones.filter(s =>
        s.numero.startsWith(`${letra}.`)
      ).sort((a, b) => {
        // Ordenar por numero de seccion
        const partsA = a.numero.split('.').map(n => parseInt(n) || 0)
        const partsB = b.numero.split('.').map(n => parseInt(n) || 0)
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          if ((partsA[i] || 0) !== (partsB[i] || 0)) {
            return (partsA[i] || 0) - (partsB[i] || 0)
          }
        }
        return 0
      })

      return {
        tipo: 'anexo',
        letra,
        titulo: `Anexo ${letra} (${info.tipo})`,
        subtitulo: info.titulo,
        secciones: seccionesAnexo
      }
    }

    // Si es un capitulo numerico (0-16)
    if (/^\d+$/.test(seccionActiva)) {
      const capituloNum = seccionActiva
      const capituloPrincipal = norma.secciones.find(s => s.numero === capituloNum)

      // Obtener subsecciones (ej: 3 -> 3.1, 3.2, 3.3, etc.)
      const subsecciones = norma.secciones.filter(s => {
        if (s.numero === capituloNum) return false
        return s.numero.startsWith(`${capituloNum}.`)
      }).sort((a, b) => {
        const partsA = a.numero.split('.').map(n => parseInt(n) || 0)
        const partsB = b.numero.split('.').map(n => parseInt(n) || 0)
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          if ((partsA[i] || 0) !== (partsB[i] || 0)) {
            return (partsA[i] || 0) - (partsB[i] || 0)
          }
        }
        return 0
      })

      return {
        tipo: 'capitulo',
        numero: capituloNum,
        titulo: capituloPrincipal?.titulo || '',
        contenidoPrincipal: capituloPrincipal?.contenido || '',
        subsecciones
      }
    }

    return null
  }, [norma, seccionActiva])

  if (!norma) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Norma no encontrada
        </h2>
        <p className="text-gray-600 mb-4">
          No se encontro la norma "{normaId}"
        </p>
        <Link
          to="/normativas"
          className="text-red-600 hover:text-red-700 font-medium"
        >
          &larr; Volver a normativas
        </Link>
      </div>
    )
  }

  const tablaTecnicaSeleccionada = tablasTecnicas.find(t => t.id === tablaTecnicaActiva)

  const handleSelectSeccion = (numero: string) => {
    setSeccionActiva(numero)
    setTablaTecnicaActiva(null)
    setGaleriaActiva(false)
    contenidoRef.current?.scrollTo(0, 0)
  }

  const handleSelectTablaTecnica = (id: string) => {
    setTablaTecnicaActiva(id)
    setSeccionActiva(null)
    setGaleriaActiva(false)
    contenidoRef.current?.scrollTo(0, 0)
  }

  const handleSelectGaleria = () => {
    setGaleriaActiva(true)
    setSeccionActiva(null)
    setTablaTecnicaActiva(null)
    contenidoRef.current?.scrollTo(0, 0)
  }

  // Renderizar contenido de una seccion con formato mejorado
  const renderSeccionContenido = (contenido: string) => {
    if (!contenido || contenido.trim() === '') return null

    const lineas = contenido.split('\n').filter(p => p.trim())
    const elementos: React.ReactNode[] = []
    let listaActual: string[] = []
    let tipoLista: 'letra' | 'numero' | 'guion' | null = null
    let keyCounter = 0

    const flushLista = () => {
      if (listaActual.length > 0) {
        elementos.push(
          <div key={`list-${keyCounter++}`} className="ml-6 my-2 space-y-1 text-sm text-gray-700">
            {listaActual.map((item, i) => (
              <p key={i} className="leading-relaxed">{item}</p>
            ))}
          </div>
        )
        listaActual = []
        tipoLista = null
      }
    }

    lineas.forEach((linea) => {
      // Filtrar líneas que parecen ser datos de tablas o figuras embebidas
      const lineaTrim = linea.trim()
      const esLineaTabla =
        // Títulos de tablas y figuras
        /^(Tabla|Figura)\s+A?\.\d+/i.test(lineaTrim) ||
        // Cabeceras de tabla con términos técnicos
        /^(Superficie|Tipo de detector|Altura|Pendiente|S \(m2\)|D \(m\)|V máx|REDUCCIÓN)/i.test(lineaTrim) ||
        // Líneas con patrón de datos de tabla: números mezclados con ≤ > etc.
        // Nota: NO filtrar "UNE-EN" porque son referencias bibliográficas válidas
        /^(SL|\d+\s*[<>≤≥]|[<>≤≥]\s*\d)/.test(lineaTrim) ||
        // Líneas cortas con solo unidades o símbolos
        /^\(m2?\)\s*\(m\)$/.test(lineaTrim) ||
        /^(m2?|máx\.|º|mm|m\))$/i.test(lineaTrim) ||
        // Filas de datos: múltiples números separados por espacios
        /^\d[\d\s,\.≤≥<>]+\d$/.test(lineaTrim) && lineaTrim.split(/\s+/).length > 3 ||
        // Líneas con muchos números y pocos caracteres de texto
        (lineaTrim.match(/\d/g) || []).length > 5 && (lineaTrim.match(/[a-zA-Z]/g) || []).length < lineaTrim.length * 0.3 ||
        // Leyendas de figuras (líneas cortas descriptivas de símbolos)
        /^(Leyenda|donde|Zona \d|CASO \d)$/i.test(lineaTrim) ||
        // Líneas con estructura de celda de tabla
        /^\d+\s+(alveolo|m2)s?$/i.test(lineaTrim)

      if (esLineaTabla) {
        return // Saltar líneas de tabla
      }

      // Detectar subtítulos embebidos:
      // - Numéricos: "9.2.2 Título", "6.5.1.2 Título"
      // - Anexos: "A.6.2.1 Título", "A.6.2.2.1 Título"
      if (/^(\d+(\.\d+)+|[A-Z](\.\d+)+)\s+[A-ZÁÉÍÓÚÑ]/.test(linea)) {
        flushLista()
        elementos.push(
          <h5 key={`sub-${keyCounter++}`} className="font-medium text-gray-800 mt-4 mb-2 text-sm">
            {linea}
          </h5>
        )
      }
      // Detectar NOTA o NOTA 1, NOTA 2, etc.
      else if (/^NOTA\s*\d*\s/i.test(linea)) {
        flushLista()
        elementos.push(
          <p key={`nota-${keyCounter++}`} className="text-gray-500 text-sm italic my-2 leading-relaxed">
            {linea}
          </p>
        )
      }
      // Detectar lista con letras: a), b), c)... - mantener texto original
      else if (/^[a-z]\)\s/.test(linea)) {
        if (tipoLista !== 'letra') flushLista()
        tipoLista = 'letra'
        listaActual.push(linea) // Mantener texto original con la letra
      }
      // Detectar lista numérica: 1), 2), 3)... - mantener texto original
      else if (/^\d+\)\s/.test(linea)) {
        if (tipoLista !== 'numero') flushLista()
        tipoLista = 'numero'
        listaActual.push(linea) // Mantener texto original con el número
      }
      // Detectar lista con guiones (−, –, -) - mantener texto original
      else if (/^[−–\-]\s/.test(linea)) {
        if (tipoLista !== 'guion') flushLista()
        tipoLista = 'guion'
        listaActual.push(linea) // Mantener texto original con el guion
      }
      // Continuación de item de lista: solo si NO empieza con mayúscula (nuevo párrafo)
      else if (tipoLista && listaActual.length > 0 && !/^[A-ZÁÉÍÓÚÑ]/.test(linea)) {
        // Agregar al último item de la lista
        listaActual[listaActual.length - 1] += ' ' + linea
      }
      // Párrafo normal
      else {
        flushLista()
        elementos.push(
          <p key={`p-${keyCounter++}`} className="text-gray-700 mb-3 leading-relaxed text-sm">
            {linea}
          </p>
        )
      }
    })

    flushLista()
    return elementos
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/normativas"
          className="text-red-600 hover:text-red-700 text-sm font-medium"
        >
          &larr; Volver a normativas
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">
          {norma.norma}
        </h1>
        <p className="text-gray-600">
          {norma.titulo || 'Sistemas de deteccion y alarma de incendios'}
        </p>
      </div>

      {/* Layout principal */}
      <div className="flex gap-6">
        {/* Sidebar - Navegacion */}
        <aside className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
            <SeccionesNav
              secciones={norma.secciones}
              tablasTecnicas={tablasTecnicas}
              figurasCount={figuras.length}
              seccionActiva={seccionActiva}
              tablaTecnicaActiva={tablaTecnicaActiva}
              galeriaActiva={galeriaActiva}
              onSelectSeccion={handleSelectSeccion}
              onSelectTablaTecnica={handleSelectTablaTecnica}
              onSelectGaleria={handleSelectGaleria}
            />
          </div>
        </aside>

        {/* Contenido principal */}
        <main
          ref={contenidoRef}
          className="flex-1 bg-white rounded-lg shadow-md p-6 max-h-[70vh] overflow-y-auto"
        >
          {/* Contenido de Capitulo */}
          {contenidoAgregado?.tipo === 'capitulo' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">
                {contenidoAgregado.numero}. {contenidoAgregado.titulo}
              </h2>

              {/* Contenido principal del capitulo */}
              {contenidoAgregado.contenidoPrincipal && (
                <div className="prose prose-sm max-w-none mb-6">
                  {renderSeccionContenido(contenidoAgregado.contenidoPrincipal)}
                </div>
              )}

              {/* Subsecciones */}
              {contenidoAgregado.subsecciones && contenidoAgregado.subsecciones.length > 0 && (
                <div className="space-y-4">
                  {contenidoAgregado.subsecciones.map(sub => (
                    <div key={sub.numero} className="border-l-2 border-gray-200 pl-4">
                      <h3 className="font-semibold text-gray-800 mb-2">
                        {sub.numero} {sub.titulo}
                      </h3>
                      <div className="prose prose-sm max-w-none">
                        {renderSeccionContenido(sub.contenido)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!contenidoAgregado.contenidoPrincipal && (!contenidoAgregado.subsecciones || contenidoAgregado.subsecciones.length === 0) && (
                <p className="text-gray-500 italic">Este capitulo no tiene contenido adicional.</p>
              )}
            </div>
          )}

          {/* Contenido de Anexo */}
          {contenidoAgregado?.tipo === 'anexo' && (
            <div>
              <h2 className="text-xl font-bold text-blue-800 mb-2">
                {contenidoAgregado.titulo}
              </h2>
              <p className="text-lg text-gray-600 mb-4 pb-2 border-b">
                {contenidoAgregado.subtitulo}
              </p>

              {/* Secciones del anexo */}
              {contenidoAgregado.secciones && contenidoAgregado.secciones.length > 0 ? (
                <div className="space-y-6">
                  {contenidoAgregado.secciones
                    .filter(s => /^[A-Z]\.\d+$/.test(s.numero)) // Primer nivel (A.1, A.2, etc.)
                    .map(seccionPrincipal => {
                      // Obtener subsecciones de esta seccion (A.5.1, A.5.2, etc.)
                      const subsecciones = contenidoAgregado.secciones.filter(sub =>
                        sub.numero.startsWith(`${seccionPrincipal.numero}.`) &&
                        sub.numero !== seccionPrincipal.numero
                      )

                      return (
                        <div key={seccionPrincipal.numero} className="border-l-2 border-blue-200 pl-4">
                          <h3 className="font-semibold text-gray-800 mb-2 text-base">
                            {seccionPrincipal.numero} {seccionPrincipal.titulo}
                          </h3>
                          {seccionPrincipal.contenido && (
                            <div className="prose prose-sm max-w-none mb-3">
                              {renderSeccionContenido(seccionPrincipal.contenido)}
                            </div>
                          )}

                          {/* Subsecciones */}
                          {subsecciones.length > 0 && (
                            <div className="ml-4 space-y-3 mt-3">
                              {subsecciones.map(sub => {
                                // Calcular nivel de anidacion (A.5.1 = 2, A.5.1.1 = 3)
                                const nivel = sub.numero.split('.').length - 1

                                return (
                                  <div
                                    key={sub.numero}
                                    className={`border-l border-gray-200 pl-3 ${nivel > 2 ? 'ml-4' : ''}`}
                                  >
                                    <h4 className={`font-medium text-gray-700 mb-1 ${nivel > 2 ? 'text-sm' : ''}`}>
                                      {sub.numero} {sub.titulo}
                                    </h4>
                                    {sub.contenido && (
                                      <div className="prose prose-sm max-w-none text-gray-600">
                                        {renderSeccionContenido(sub.contenido)}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="text-gray-500 italic">Este anexo no tiene contenido disponible.</p>
              )}
            </div>
          )}

          {/* Tabla Tecnica */}
          {tablaTecnicaSeleccionada && (
            <TablaTecnica tabla={tablaTecnicaSeleccionada} />
          )}

          {/* Galeria de Figuras */}
          {galeriaActiva && figuras.length > 0 && (
            <GaleriaFiguras figuras={figuras} />
          )}

          {/* Estado vacio */}
          {!contenidoAgregado && !tablaTecnicaSeleccionada && !galeriaActiva && (
            <div className="text-center py-12 text-gray-500">
              <p>Selecciona un capitulo, anexo o tabla del menu lateral</p>
            </div>
          )}
        </main>
      </div>

      {/* Info de la norma */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <div className="flex gap-6">
          <span>Archivo: {norma.archivo_origen}</span>
          <span>Paginas: {norma.paginas_totales}</span>
          <span>Secciones: {norma.secciones.length}</span>
          <span>Figuras: {figuras.length}</span>
        </div>
      </div>
    </div>
  )
}
