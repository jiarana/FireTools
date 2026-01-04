import { useState } from 'react'
import { calcularCaudalRociador, factoresK } from '../../utils/hydraulics'

export default function CaudalRociadores() {
  const [factorK, setFactorK] = useState<string>('80')
  const [presion, setPresion] = useState<string>('0.5')
  const [resultado, setResultado] = useState<{ caudalLpm: number } | null>(null)

  const calcular = () => {
    const res = calcularCaudalRociador(parseFloat(factorK), parseFloat(presion))
    setResultado(res)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Caudal de Rociadores
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Factor K del rociador
            </label>
            <select
              value={factorK}
              onChange={(e) => setFactorK(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {factoresK.map((f) => (
                <option key={f.tipo} value={f.k}>
                  {f.tipo} (K={f.k})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Factor K personalizado
            </label>
            <input
              type="number"
              value={factorK}
              onChange={(e) => setFactorK(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Presion (bar)
            </label>
            <input
              type="number"
              value={presion}
              onChange={(e) => setPresion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              step="0.1"
              min="0"
            />
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
              <h3 className="font-semibold text-gray-700">Resultado</h3>

              <div className="bg-white p-4 rounded-md border border-gray-200">
                <p className="text-sm text-gray-500">Caudal del rociador</p>
                <p className="text-3xl font-bold text-red-600">
                  {resultado.caudalLpm} L/min
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  ({(resultado.caudalLpm / 60).toFixed(2)} L/s)
                </p>
              </div>

              <div className="bg-white p-4 rounded-md border border-gray-200">
                <p className="text-sm text-gray-500">Datos de entrada</p>
                <ul className="mt-2 text-sm">
                  <li>Factor K: <span className="font-medium">{factorK}</span></li>
                  <li>Presion: <span className="font-medium">{presion} bar</span></li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <h4 className="font-semibold mb-2">Formula</h4>
            <p className="font-mono text-lg">Q = K * sqrt(P)</p>
            <ul className="mt-2 list-disc list-inside text-xs">
              <li>Q = Caudal (L/min)</li>
              <li>K = Factor K del rociador</li>
              <li>P = Presion (bar, convertida a m.c.a.)</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-amber-50 rounded-lg text-sm text-amber-800">
            <h4 className="font-semibold mb-2">Nota</h4>
            <p>
              El factor K depende del orificio del rociador. Consulta la ficha
              tecnica del fabricante para obtener el valor exacto.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
