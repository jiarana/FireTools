import type { Seccion } from '../../utils/search'

interface TablaTecnicaRef {
  id: string
  numero_tabla?: string
  titulo: string
  descripcion: string
}

interface SeccionesNavProps {
  secciones: Seccion[]
  tablasTecnicas?: TablaTecnicaRef[]
  figurasCount?: number
  seccionActiva: string | null
  tablaTecnicaActiva?: string | null
  galeriaActiva?: boolean
  onSelectSeccion: (numero: string) => void
  onSelectTablaTecnica?: (id: string) => void
  onSelectGaleria?: () => void
}

// Definicion de Anexos con sus titulos oficiales
const ANEXOS_INFO: Record<string, { titulo: string; tipo: string }> = {
  'A': { titulo: 'Requisitos especificos', tipo: 'Normativo' },
  'B': { titulo: 'Falsas alarmas', tipo: 'Informativo' },
  'C': { titulo: 'Modelos de documentos', tipo: 'Informativo' },
  'D': { titulo: 'Bibliografia', tipo: 'Informativo' }
}

export default function SeccionesNav({
  secciones,
  tablasTecnicas = [],
  figurasCount = 0,
  seccionActiva,
  tablaTecnicaActiva,
  galeriaActiva,
  onSelectSeccion,
  onSelectTablaTecnica,
  onSelectGaleria
}: SeccionesNavProps) {
  // Filtrar capitulos principales (0-16)
  const capitulosPrincipales = secciones.filter(s => {
    return /^\d+$/.test(s.numero)
  })

  // Detectar anexos existentes
  const anexosExistentes = new Set<string>()
  secciones.forEach(s => {
    const match = s.numero.match(/^([A-Z])\./)
    if (match) {
      anexosExistentes.add(match[1])
    }
  })

  // Convertir a array ordenado
  const anexos = Array.from(anexosExistentes).sort()

  return (
    <nav className="space-y-4">
      {/* Capitulos principales */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">
          Capitulos
        </h3>
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {capitulosPrincipales.map(seccion => (
            <li key={seccion.numero}>
              <button
                onClick={() => onSelectSeccion(seccion.numero)}
                className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                  seccionActiva === seccion.numero
                    ? 'bg-red-100 text-red-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="font-mono text-xs mr-1">{seccion.numero}</span>
                <span className="truncate">{seccion.titulo.substring(0, 35)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Anexos */}
      {anexos.length > 0 && (
        <div>
          <h3 className="font-semibold text-blue-700 mb-2 text-sm uppercase tracking-wide">
            Anexos
          </h3>
          <ul className="space-y-1">
            {anexos.map(letra => {
              const info = ANEXOS_INFO[letra] || { titulo: '', tipo: '' }
              return (
                <li key={letra}>
                  <button
                    onClick={() => onSelectSeccion(`ANEXO_${letra}`)}
                    className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                      seccionActiva === `ANEXO_${letra}`
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="font-semibold">Anexo {letra}</span>
                    <span className="text-xs text-gray-500 ml-1">({info.tipo})</span>
                    <span className="block text-xs text-gray-500 truncate">{info.titulo}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Tablas Tecnicas Curadas */}
      {tablasTecnicas.length > 0 && (
        <div>
          <h3 className="font-semibold text-green-700 mb-2 text-sm uppercase tracking-wide">
            Tablas Curadas
          </h3>
          <ul className="space-y-1">
            {tablasTecnicas.map(tabla => (
              <li key={tabla.id}>
                <button
                  onClick={() => onSelectTablaTecnica?.(tabla.id)}
                  className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                    tablaTecnicaActiva === tabla.id
                      ? 'bg-green-100 text-green-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="truncate block">
                    {tabla.numero_tabla && (
                      <span className="font-mono text-green-700 mr-1">{tabla.numero_tabla}</span>
                    )}
                    {tabla.titulo.substring(0, 30)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Galeria de Figuras */}
      {figurasCount > 0 && (
        <div>
          <h3 className="font-semibold text-purple-700 mb-2 text-sm uppercase tracking-wide">
            Figuras
          </h3>
          <button
            onClick={() => onSelectGaleria?.()}
            className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
              galeriaActiva
                ? 'bg-purple-100 text-purple-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="truncate block">
              Ver Galeria ({figurasCount} figuras)
            </span>
          </button>
        </div>
      )}
    </nav>
  )
}
