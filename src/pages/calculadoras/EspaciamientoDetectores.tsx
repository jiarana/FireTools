import { useState } from 'react'
import { calcularEspaciamientoDetectores, tiposDetectores } from '../../utils/detection'
import type { ResultadoDetectores } from '../../utils/detection'

export default function EspaciamientoDetectores() {
  const [tipoDetector, setTipoDetector] = useState<number>(0)
  const [altura, setAltura] = useState<string>('3')
  const [largo, setLargo] = useState<string>('100')
  const [ancho, setAncho] = useState<string>('50')
  const [resultado, setResultado] = useState<ResultadoDetectores | null>(null)

  const calcular = () => {
    const res = calcularEspaciamientoDetectores(
      tipoDetector,
      parseFloat(altura),
      parseFloat(largo),
      parseFloat(ancho)
    )
    setResultado(res)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Espaciamiento de Detectores (UNE 23007)
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de detector
            </label>
            <select
              value={tipoDetector}
              onChange={(e) => setTipoDetector(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {tiposDetectores.map((d, i) => (
                <option key={d.nombre} value={i}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Altura del techo (m)
            </label>
            <input
              type="number"
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              step="0.5"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Altura maxima para {tiposDetectores[tipoDetector].nombre}:{' '}
              {tiposDetectores[tipoDetector].alturaMaxM} m
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Largo (m)
              </label>
              <input
                type="number"
                value={largo}
                onChange={(e) => setLargo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                step="0.5"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ancho (m)
              </label>
              <input
                type="number"
                value={ancho}
                onChange={(e) => setAncho(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                step="0.5"
                min="0"
              />
            </div>
          </div>

          {largo && ancho && (
            <div className="bg-gray-100 p-3 rounded-md">
              <p className="text-sm text-gray-600">
                Superficie: <span className="font-semibold">{(parseFloat(largo || '0') * parseFloat(ancho || '0')).toFixed(2)} m2</span>
              </p>
            </div>
          )}

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

              {!resultado.valido ? (
                <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
                  {resultado.mensaje}
                </div>
              ) : (
                <>
                  {/* Advertencias */}
                  {resultado.advertencias.length > 0 && (
                    <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                      {resultado.advertencias.map((adv, i) => (
                        <p key={i} className="text-sm text-amber-700">{adv}</p>
                      ))}
                    </div>
                  )}

                  {/* Resultado principal */}
                  <div className="bg-white p-4 rounded-md border-2 border-red-200">
                    <p className="text-sm text-gray-500">Configuracion optima</p>
                    <p className="text-3xl font-bold text-red-600">
                      {resultado.detectoresLargo} x {resultado.detectoresAncho} = {resultado.numDetectoresReal} detectores
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ({resultado.detectoresLargo} en largo, {resultado.detectoresAncho} en ancho)
                    </p>
                  </div>

                  {/* Comparacion con minimo teorico */}
                  <div className="bg-white p-4 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-500">Minimo teorico por cobertura</p>
                    <p className="text-xl font-bold text-gray-600">
                      {resultado.numDetectoresMinimo} detectores
                    </p>
                    <p className="text-xs text-gray-500">
                      (basado en {resultado.coberturaMaximaM2} m2 por detector)
                    </p>
                  </div>

                  {/* Espaciamientos */}
                  <div className="bg-white p-4 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-500 mb-2">Espaciamiento entre detectores</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">En largo:</p>
                        <p className="font-semibold text-blue-600">{resultado.espaciamientoLargoM} m</p>
                      </div>
                      <div>
                        <p className="text-gray-500">En ancho:</p>
                        <p className="font-semibold text-blue-600">{resultado.espaciamientoAnchoM} m</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Maximo permitido: {resultado.espaciamientoMaximoM} m
                    </p>
                  </div>

                  {/* Distancia a pared */}
                  <div className="bg-white p-4 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-500 mb-2">Distancia a pared (1er detector)</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Desde largo:</p>
                        <p className="font-semibold">{resultado.distanciaParedLargoM} m</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Desde ancho:</p>
                        <p className="font-semibold">{resultado.distanciaParedAnchoM} m</p>
                      </div>
                    </div>
                  </div>

                  {/* Superficie */}
                  <div className="bg-white p-4 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-500">Superficie total</p>
                    <p className="text-lg font-semibold text-gray-700">{resultado.areaM2} m2</p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <h4 className="font-semibold mb-2">Referencia: UNE 23007</h4>
            <p>
              Los valores de cobertura estan basados en la norma UNE 23007
              para sistemas de deteccion y alarma de incendios.
            </p>
            <p className="mt-2 text-xs">
              Criterio de distancia a pared: espaciamiento / 2
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
