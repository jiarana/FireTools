import { Link, Outlet, useLocation } from 'react-router-dom'
import SearchBar from '../components/normativas/SearchBar'
import type { Norma } from '../utils/search'

// Importar datos de normas
import une23007Data from '../data/normas/une-23007-14.json'

// Lista de normas disponibles
const normasDisponibles: Norma[] = [
  une23007Data as Norma
]

export default function Normativas() {
  const location = useLocation()
  const isIndex = location.pathname === '/normativas'

  return (
    <div>
      {isIndex ? (
        <>
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Consulta de Normativas UNE
          </h1>

          {/* Barra de busqueda */}
          <div className="mb-8">
            <SearchBar normas={normasDisponibles} />
          </div>

          {/* Lista de normas */}
          <div className="grid gap-4">
            {normasDisponibles.map(norma => {
              const normaId = norma.norma.toLowerCase().replace(/[:\s]+/g, '-')
              return (
                <Link
                  key={normaId}
                  to={`/normativas/${normaId}`}
                  className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-red-600"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {norma.norma}
                      </h2>
                      <p className="text-gray-600 mt-1">
                        {norma.titulo || 'Sistemas de deteccion y alarma de incendios'}
                      </p>
                      <div className="mt-3 flex gap-4 text-sm text-gray-500">
                        <span>{norma.secciones.length} secciones</span>
                        <span>{norma.tablas.length} tablas</span>
                        <span>{norma.paginas_totales} paginas</span>
                      </div>
                    </div>
                    <span className="text-red-600 font-medium">
                      Ver &rarr;
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Info adicional */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <h3 className="font-semibold mb-2">Sobre las normativas</h3>
            <p>
              Las normas UNE son especificaciones tecnicas de aplicacion en Espana.
              Este modulo permite consultar el contenido estructurado y las tablas
              tecnicas mas relevantes para el diseno de sistemas de proteccion contra incendios.
            </p>
          </div>
        </>
      ) : (
        <Outlet />
      )}
    </div>
  )
}

// Exportar normas para uso en otros componentes
export { normasDisponibles }
