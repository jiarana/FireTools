import { Link, Outlet, useLocation } from 'react-router-dom'

const calculadoras = [
  { title: 'Perdida de Carga', path: '/calculadoras/perdida-carga', icon: '💧' },
  { title: 'Caudal Rociadores', path: '/calculadoras/caudal-rociadores', icon: '🚿' },
  { title: 'Espaciamiento Detectores', path: '/calculadoras/espaciamiento-detectores', icon: '🔔' },
]

export default function Calculadoras() {
  const location = useLocation()
  const isIndex = location.pathname === '/calculadoras'

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Calculadoras</h1>

      {isIndex ? (
        <div className="grid md:grid-cols-3 gap-6">
          {calculadoras.map((calc) => (
            <Link
              key={calc.path}
              to={calc.path}
              className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="text-4xl mb-4">{calc.icon}</div>
              <h3 className="text-lg font-semibold text-gray-800">{calc.title}</h3>
            </Link>
          ))}
        </div>
      ) : (
        <div>
          <Link to="/calculadoras" className="text-red-600 hover:text-red-800 mb-4 inline-block">
            ← Volver a calculadoras
          </Link>
          <Outlet />
        </div>
      )}
    </div>
  )
}
