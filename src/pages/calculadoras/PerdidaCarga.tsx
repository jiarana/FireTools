import { useState } from 'react'
import { calcularPerdidaCarga, coeficientesC } from '../../utils/hydraulics'

export default function PerdidaCarga() {
  const [caudal, setCaudal] = useState<string>('500')
  const [diametro, setDiametro] = useState<string>('50')
  const [longitud, setLongitud] = useState<string>('100')
  const [coeficiente, setCoeficiente] = useState<string>('120')
  const [resultado, setResultado] = useState<{
    perdidaBar: number
    velocidadMs: number
    perdidaPorMetro: number
  } | null>(null)

  const calcular = () => {
    const res = calcularPerdidaCarga(
      parseFloat(caudal),
      parseFloat(diametro),
      parseFloat(longitud),
      parseFloat(coeficiente)
    )
    setResultado(res)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Perdida de Carga (Hazen-Williams)
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caudal (L/min)
            </label>
            <input
              type="number"
              value={caudal}
              onChange={(e) => setCaudal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diametro interior (mm)
            </label>
            <input
              type="number"
              value={diametro}
              onChange={(e) => setDiametro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitud (m)
            </label>
            <input
              type="number"
              value={longitud}
              onChange={(e) => setLongitud(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coeficiente C
            </label>
            <select
              value={coeficiente}
              onChange={(e) => setCoeficiente(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {coeficientesC.map((c) => (
                <option key={c.material} value={c.valor}>
                  {c.material} (C={c.valor})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={calcular}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
          >
            Calcular
          </button>
        </div>

        <div>
          {resultado && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-700">Resultados</h3>

              <div className="bg-white p-4 rounded-md border border-gray-200">
                <p className="text-sm text-gray-500">Perdida de carga total</p>
                <p className="text-3xl font-bold text-red-600">
                  {resultado.perdidaBar} bar
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  ({(resultado.perdidaBar * 10.197).toFixed(2)} m.c.a.)
                </p>
              </div>

              <div className="bg-white p-4 rounded-md border border-gray-200">
                <p className="text-sm text-gray-500">Velocidad del flujo</p>
                <p className="text-2xl font-bold text-blue-600">
                  {resultado.velocidadMs} m/s
                </p>
                {resultado.velocidadMs > 6 && (
                  <p className="text-sm text-amber-600 mt-1">
                    Advertencia: Velocidad superior a 6 m/s
                  </p>
                )}
              </div>

              <div className="bg-white p-4 rounded-md border border-gray-200">
                <p className="text-sm text-gray-500">Perdida por metro</p>
                <p className="text-xl font-bold text-gray-700">
                  {resultado.perdidaPorMetro} m/m
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <h4 className="font-semibold mb-2">Formula de Hazen-Williams</h4>
            <p className="font-mono">J = 10.67 * Q^1.852 / (C^1.852 * D^4.87)</p>
            <ul className="mt-2 list-disc list-inside text-xs">
              <li>J = Perdida de carga (m/m)</li>
              <li>Q = Caudal (m3/s)</li>
              <li>C = Coeficiente de rugosidad</li>
              <li>D = Diametro interior (m)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
