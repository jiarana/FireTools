/**
 * Calculo de espaciamiento de detectores segun UNE 23007
 *
 * Los valores de cobertura dependen del tipo de detector y la altura del techo.
 */

export interface TipoDetector {
  nombre: string
  coberturaMaxM2: number[]  // Cobertura por rango de altura [0-6m, 6-8m, 8-10m, 10-12m]
  alturaMaxM: number
}

export const tiposDetectores: TipoDetector[] = [
  {
    nombre: 'Detector optico de humos (puntual)',
    coberturaMaxM2: [80, 80, 60, 40],
    alturaMaxM: 12
  },
  {
    nombre: 'Detector ionico de humos',
    coberturaMaxM2: [80, 80, 60, 40],
    alturaMaxM: 12
  },
  {
    nombre: 'Detector termico (clase A1)',
    coberturaMaxM2: [30, 20, 0, 0],
    alturaMaxM: 7.5
  },
  {
    nombre: 'Detector termico (clase A2)',
    coberturaMaxM2: [20, 15, 0, 0],
    alturaMaxM: 6
  },
  {
    nombre: 'Detector termovelocimetrico',
    coberturaMaxM2: [30, 20, 0, 0],
    alturaMaxM: 7.5
  },
  {
    nombre: 'Detector de llama (IR/UV)',
    coberturaMaxM2: [200, 200, 200, 200],
    alturaMaxM: 20
  }
]

function obtenerRangoAltura(alturaM: number): number {
  if (alturaM <= 6) return 0
  if (alturaM <= 8) return 1
  if (alturaM <= 10) return 2
  return 3
}

export interface ResultadoDetectores {
  // Datos de entrada calculados
  areaM2: number
  // Resultado por cobertura (minimo teorico)
  numDetectoresMinimo: number
  coberturaMaximaM2: number
  espaciamientoMaximoM: number
  // Resultado geometrico real
  numDetectoresReal: number
  detectoresLargo: number
  detectoresAncho: number
  espaciamientoLargoM: number
  espaciamientoAnchoM: number
  distanciaParedLargoM: number
  distanciaParedAnchoM: number
  // Validacion
  valido: boolean
  mensaje: string
  advertencias: string[]
}

export function calcularEspaciamientoDetectores(
  tipoDetectorIndex: number,
  alturaM: number,
  largoM: number,
  anchoM: number
): ResultadoDetectores {
  const detector = tiposDetectores[tipoDetectorIndex]
  const areaM2 = largoM * anchoM
  const advertencias: string[] = []

  // Verificar altura maxima
  if (alturaM > detector.alturaMaxM) {
    return {
      areaM2,
      numDetectoresMinimo: 0,
      coberturaMaximaM2: 0,
      espaciamientoMaximoM: 0,
      numDetectoresReal: 0,
      detectoresLargo: 0,
      detectoresAncho: 0,
      espaciamientoLargoM: 0,
      espaciamientoAnchoM: 0,
      distanciaParedLargoM: 0,
      distanciaParedAnchoM: 0,
      valido: false,
      mensaje: `La altura maxima para este detector es ${detector.alturaMaxM}m`,
      advertencias: []
    }
  }

  const rangoAltura = obtenerRangoAltura(alturaM)
  const coberturaMaximaM2 = detector.coberturaMaxM2[rangoAltura]

  if (coberturaMaximaM2 === 0) {
    return {
      areaM2,
      numDetectoresMinimo: 0,
      coberturaMaximaM2: 0,
      espaciamientoMaximoM: 0,
      numDetectoresReal: 0,
      detectoresLargo: 0,
      detectoresAncho: 0,
      espaciamientoLargoM: 0,
      espaciamientoAnchoM: 0,
      distanciaParedLargoM: 0,
      distanciaParedAnchoM: 0,
      valido: false,
      mensaje: 'Este tipo de detector no es adecuado para esta altura',
      advertencias: []
    }
  }

  // Espaciamiento maximo segun cobertura (distribucion cuadrada)
  const espaciamientoMaximoM = Math.sqrt(coberturaMaximaM2)

  // Numero minimo teorico por cobertura
  const numDetectoresMinimo = Math.ceil(areaM2 / coberturaMaximaM2)

  // Calculo geometrico real
  // Criterio: distancia a pared = espaciamiento / 2
  // Formula: L = 2*(d/2) + (n-1)*d = d*n
  // Por tanto: n = ceil(L / d)

  const detectoresLargo = Math.ceil(largoM / espaciamientoMaximoM)
  const detectoresAncho = Math.ceil(anchoM / espaciamientoMaximoM)
  const numDetectoresReal = detectoresLargo * detectoresAncho

  // Espaciamiento real (distribuido uniformemente)
  const espaciamientoLargoM = largoM / detectoresLargo
  const espaciamientoAnchoM = anchoM / detectoresAncho

  // Distancia del primer detector a la pared (mitad del espaciamiento)
  const distanciaParedLargoM = espaciamientoLargoM / 2
  const distanciaParedAnchoM = espaciamientoAnchoM / 2

  // Verificar si el espaciamiento real excede el maximo permitido
  if (espaciamientoLargoM > espaciamientoMaximoM * 1.05) {
    advertencias.push(`Espaciamiento en largo (${espaciamientoLargoM.toFixed(2)}m) supera el maximo (${espaciamientoMaximoM.toFixed(2)}m)`)
  }
  if (espaciamientoAnchoM > espaciamientoMaximoM * 1.05) {
    advertencias.push(`Espaciamiento en ancho (${espaciamientoAnchoM.toFixed(2)}m) supera el maximo (${espaciamientoMaximoM.toFixed(2)}m)`)
  }

  return {
    areaM2: Math.round(areaM2 * 100) / 100,
    numDetectoresMinimo,
    coberturaMaximaM2,
    espaciamientoMaximoM: Math.round(espaciamientoMaximoM * 100) / 100,
    numDetectoresReal,
    detectoresLargo,
    detectoresAncho,
    espaciamientoLargoM: Math.round(espaciamientoLargoM * 100) / 100,
    espaciamientoAnchoM: Math.round(espaciamientoAnchoM * 100) / 100,
    distanciaParedLargoM: Math.round(distanciaParedLargoM * 100) / 100,
    distanciaParedAnchoM: Math.round(distanciaParedAnchoM * 100) / 100,
    valido: true,
    mensaje: '',
    advertencias
  }
}
