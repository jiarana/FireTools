import { useState } from 'react'
import type { Figura } from '../../utils/search'

interface GaleriaFigurasProps {
  figuras: Figura[]
}

export default function GaleriaFiguras({ figuras }: GaleriaFigurasProps) {
  const [figuraSeleccionada, setFiguraSeleccionada] = useState<Figura | null>(null)
  const [filtroSeccion, setFiltroSeccion] = useState<string>('')

  // Obtener secciones unicas para filtro
  const seccionesUnicas = [...new Set(figuras.map(f => f.seccion_cercana.numero))]
    .sort((a, b) => {
      // Ordenar: numeros primero, luego letras (anexos)
      const aNum = parseInt(a) || 999
      const bNum = parseInt(b) || 999
      return aNum - bNum
    })

  // Filtrar figuras
  const figurasFiltradas = filtroSeccion
    ? figuras.filter(f => f.seccion_cercana.numero === filtroSeccion)
    : figuras

  // Agrupar por pagina
  const figurasPorPagina = figurasFiltradas.reduce((acc, fig) => {
    const key = fig.pagina
    if (!acc[key]) acc[key] = []
    acc[key].push(fig)
    return acc
  }, {} as Record<number, Figura[]>)

  const paginasOrdenadas = Object.keys(figurasPorPagina)
    .map(Number)
    .sort((a, b) => a - b)

  // Ruta base para imagenes
  // En desarrollo las figuras estan en pdf-extractor/output/
  // En produccion se deben copiar a public/ o servir desde otro lugar
  const getImageUrl = (figura: Figura) => {
    // Usar ruta relativa al directorio del extractor
    return `/pdf-extractor/output/${figura.ruta_relativa}`
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-purple-800 mb-2">
          Galeria de Figuras
        </h2>
        <p className="text-sm text-gray-600">
          {figuras.length} figura(s) extraida(s) del documento
        </p>

        {/* Filtro por seccion */}
        {seccionesUnicas.length > 1 && (
          <div className="mt-3">
            <label className="text-sm font-medium text-gray-700 mr-2">
              Filtrar por seccion:
            </label>
            <select
              value={filtroSeccion}
              onChange={(e) => setFiltroSeccion(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Todas las secciones</option>
              {seccionesUnicas.map(seccion => (
                <option key={seccion} value={seccion}>
                  Seccion {seccion}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grid de figuras agrupadas por pagina */}
      {paginasOrdenadas.map(pagina => (
        <div key={pagina} className="mb-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            Pagina {pagina}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {figurasPorPagina[pagina].map(figura => (
              <div
                key={figura.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setFiguraSeleccionada(figura)}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <img
                    src={getImageUrl(figura)}
                    alt={`Figura ${figura.id}`}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                    onError={(e) => {
                      // Mostrar placeholder si la imagen no carga
                      const target = e.target as HTMLImageElement
                      target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="12">Sin imagen</text></svg>'
                    }}
                  />
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-800">
                    {figura.id}
                  </p>
                  <p className="text-xs text-gray-500">
                    Seccion {figura.seccion_cercana.numero}
                    {figura.seccion_cercana.estimado && (
                      <span className="text-orange-500 ml-1" title="Seccion estimada">*</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {figura.posicion.ancho}x{figura.posicion.alto} px
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal de figura ampliada */}
      {figuraSeleccionada && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setFiguraSeleccionada(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Imagen ampliada */}
            <div className="p-4 bg-gray-50">
              <img
                src={getImageUrl(figuraSeleccionada)}
                alt={`Figura ${figuraSeleccionada.id}`}
                className="max-w-full h-auto mx-auto"
              />
            </div>

            {/* Metadatos */}
            <div className="p-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">
                {figuraSeleccionada.id}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Pagina:</span>{' '}
                  <span className="font-medium">{figuraSeleccionada.pagina}</span>
                </div>
                <div>
                  <span className="text-gray-500">Formato:</span>{' '}
                  <span className="font-medium">{figuraSeleccionada.formato.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Dimensiones:</span>{' '}
                  <span className="font-medium">
                    {figuraSeleccionada.posicion.ancho}x{figuraSeleccionada.posicion.alto} px
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Tamano:</span>{' '}
                  <span className="font-medium">
                    {(figuraSeleccionada.tamano_bytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Seccion cercana:</span>{' '}
                  <span className="font-medium">
                    {figuraSeleccionada.seccion_cercana.numero} - {figuraSeleccionada.seccion_cercana.titulo}
                  </span>
                  {figuraSeleccionada.seccion_cercana.estimado && (
                    <span className="text-orange-500 text-xs ml-1">(estimada)</span>
                  )}
                </div>
              </div>

              {/* Boton cerrar */}
              <button
                onClick={() => setFiguraSeleccionada(null)}
                className="mt-4 w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estado vacio */}
      {figurasFiltradas.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No hay figuras disponibles</p>
          {filtroSeccion && (
            <button
              onClick={() => setFiltroSeccion('')}
              className="mt-2 text-purple-600 hover:underline"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      )}
    </div>
  )
}
