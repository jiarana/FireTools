/**
 * Calculo de perdida de carga usando la formula de Hazen-Williams
 *
 * Formula: J = 10.67 * Q^1.852 / (C^1.852 * D^4.87)
 *
 * Donde:
 * - J = Perdida de carga por metro (m/m)
 * - Q = Caudal (m3/s)
 * - C = Coeficiente de Hazen-Williams
 * - D = Diametro interior (m)
 */
export function calcularPerdidaCarga(
  caudalLpm: number,    // Caudal en L/min
  diametroMm: number,   // Diametro en mm
  longitudM: number,    // Longitud en metros
  coeficienteC: number  // Coeficiente C de Hazen-Williams
): { perdidaBar: number; velocidadMs: number; perdidaPorMetro: number } {
  // Convertir unidades
  const caudalM3s = caudalLpm / 60000  // L/min a m3/s
  const diametroM = diametroMm / 1000  // mm a m

  // Calcular velocidad (m/s)
  const area = Math.PI * Math.pow(diametroM / 2, 2)
  const velocidadMs = caudalM3s / area

  // Formula de Hazen-Williams para perdida de carga (m/m)
  const perdidaPorMetro = 10.67 * Math.pow(caudalM3s, 1.852) /
    (Math.pow(coeficienteC, 1.852) * Math.pow(diametroM, 4.87))

  // Perdida total en metros
  const perdidaTotalM = perdidaPorMetro * longitudM

  // Convertir a bar (1 bar = 10.197 m de columna de agua)
  const perdidaBar = perdidaTotalM / 10.197

  return {
    perdidaBar: Math.round(perdidaBar * 1000) / 1000,
    velocidadMs: Math.round(velocidadMs * 100) / 100,
    perdidaPorMetro: Math.round(perdidaPorMetro * 10000) / 10000
  }
}

/**
 * Calculo de caudal de rociadores
 *
 * Formula: Q = K * sqrt(P)
 *
 * Donde:
 * - Q = Caudal (L/min)
 * - K = Factor K del rociador
 * - P = Presion (bar)
 */
export function calcularCaudalRociador(
  factorK: number,      // Factor K del rociador
  presionBar: number    // Presion en bar
): { caudalLpm: number } {
  const caudalLpm = factorK * Math.sqrt(presionBar * 10)  // Convertir bar a mca para el calculo

  return {
    caudalLpm: Math.round(caudalLpm * 10) / 10
  }
}

/**
 * Valores tipicos del coeficiente C de Hazen-Williams
 */
export const coeficientesC = [
  { material: 'Acero negro nuevo', valor: 120 },
  { material: 'Acero galvanizado', valor: 120 },
  { material: 'Acero negro (15-20 anos)', valor: 100 },
  { material: 'Hierro fundido nuevo', valor: 130 },
  { material: 'Hierro fundido (20 anos)', valor: 100 },
  { material: 'Cobre', valor: 140 },
  { material: 'Plastico (PVC, CPVC, PE)', valor: 150 },
  { material: 'Acero inoxidable', valor: 140 },
]

/**
 * Factores K tipicos de rociadores
 */
export const factoresK = [
  { tipo: 'Rociador estandar (1/2")', k: 80 },
  { tipo: 'Rociador estandar (3/4")', k: 115 },
  { tipo: 'Rociador de cobertura extendida', k: 160 },
  { tipo: 'Rociador ESFR K14', k: 200 },
  { tipo: 'Rociador ESFR K17', k: 240 },
  { tipo: 'Rociador ESFR K25', k: 360 },
]
