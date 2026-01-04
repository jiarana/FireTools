import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { crearIndiceBusqueda, buscarEnNormas } from '../../utils/search'
import type { Norma, ResultadoBusqueda } from '../../utils/search'

interface SearchBarProps {
  normas: Norma[]
}

export default function SearchBar({ normas }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([])
  const [mostrarResultados, setMostrarResultados] = useState(false)

  const fuse = useMemo(() => crearIndiceBusqueda(normas), [normas])

  useEffect(() => {
    if (query.length >= 2) {
      const results = buscarEnNormas(fuse, query, 10)
      setResultados(results)
      setMostrarResultados(true)
    } else {
      setResultados([])
      setMostrarResultados(false)
    }
  }, [query, fuse])

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setMostrarResultados(true)}
          onBlur={() => setTimeout(() => setMostrarResultados(false), 200)}
          placeholder="Buscar en normativas... (ej: detectores, cobertura, altura)"
          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Resultados dropdown */}
      {mostrarResultados && resultados.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {resultados.map((r, i) => (
            <Link
              key={i}
              to={`/normativas/${r.normaId}`}
              className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-start">
                <span className={`text-xs px-2 py-0.5 rounded mr-2 ${
                  r.tipo === 'seccion'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {r.tipo === 'seccion' ? 'Seccion' : 'Tabla'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {r.seccion ? `${r.seccion.numero} ${r.seccion.titulo}` : r.tabla?.id}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {r.seccion
                      ? r.seccion.contenido.substring(0, 100) + '...'
                      : r.tabla?.cabecera.filter(c => c).join(' | ')
                    }
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {mostrarResultados && query.length >= 2 && resultados.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="text-gray-500 text-sm">No se encontraron resultados para "{query}"</p>
        </div>
      )}
    </div>
  )
}
