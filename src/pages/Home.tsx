import { Link } from 'react-router-dom'

const calculadoras = [
  {
    title: 'Perdida de Carga',
    description: 'Calculo de perdidas de carga en tuberias usando la formula de Hazen-Williams',
    path: '/calculadoras/perdida-carga',
    icon: '💧',
  },
  {
    title: 'Caudal de Rociadores',
    description: 'Calculo del caudal de rociadores segun el factor K y la presion',
    path: '/calculadoras/caudal-rociadores',
    icon: '🚿',
  },
  {
    title: 'Espaciamiento de Detectores',
    description: 'Calculo del numero y distribucion de detectores segun UNE 23007',
    path: '/calculadoras/espaciamiento-detectores',
    icon: '🔔',
  },
]

export default function Home() {
  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          FireTools
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Suite de herramientas para ingenieros de proteccion contra incendios.
          Calculos hidraulicos, deteccion y consulta de normativas UNE.
        </p>
      </div>

      <h2 className="text-2xl font-semibold text-gray-700 mb-6">Calculadoras</h2>

      <div className="grid md:grid-cols-3 gap-6">
        {calculadoras.map((calc) => (
          <Link
            key={calc.path}
            to={calc.path}
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="text-4xl mb-4">{calc.icon}</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{calc.title}</h3>
            <p className="text-gray-600 text-sm">{calc.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
