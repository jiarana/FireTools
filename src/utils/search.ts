import Fuse from 'fuse.js'

// Tipos para las normas UNE
export interface Seccion {
  numero: string
  titulo: string
  contenido: string
}

export interface Tabla {
  id: string
  pagina: number
  cabecera: string[]
  datos: string[][]
}

export interface Figura {
  id: string
  archivo: string
  ruta_relativa: string
  pagina: number
  posicion: {
    x: number | null
    y: number | null
    ancho: number
    alto: number
  }
  seccion_cercana: {
    numero: string
    titulo: string
    estimado?: boolean
  }
  formato: string
  tamano_bytes: number
}

export interface Norma {
  norma: string
  titulo: string
  archivo_origen: string
  fecha_extraccion: string
  paginas_totales: number
  secciones: Seccion[]
  tablas: Tabla[]
  figuras?: Figura[]
  texto_completo?: string
}

// Tipo para resultados de busqueda
export interface ResultadoBusqueda {
  tipo: 'seccion' | 'tabla'
  normaId: string
  seccion?: Seccion
  tabla?: Tabla
  score: number
}

// Configuracion de Fuse.js para busqueda en secciones
export function crearIndiceBusqueda(normas: Norma[]) {
  const items: Array<{
    tipo: 'seccion' | 'tabla'
    normaId: string
    titulo: string
    contenido: string
    seccion?: Seccion
    tabla?: Tabla
  }> = []

  for (const norma of normas) {
    const normaId = norma.norma.toLowerCase().replace(/[:\s]+/g, '-')

    // Indexar secciones
    for (const seccion of norma.secciones) {
      items.push({
        tipo: 'seccion',
        normaId,
        titulo: `${seccion.numero} ${seccion.titulo}`,
        contenido: seccion.contenido.substring(0, 500), // Limitar contenido
        seccion
      })
    }

    // Indexar tablas
    for (const tabla of norma.tablas) {
      const contenidoTabla = tabla.cabecera.join(' ') + ' ' +
        tabla.datos.map(fila => fila.join(' ')).join(' ')
      items.push({
        tipo: 'tabla',
        normaId,
        titulo: `Tabla ${tabla.id} (Pagina ${tabla.pagina})`,
        contenido: contenidoTabla.substring(0, 500),
        tabla
      })
    }
  }

  const fuse = new Fuse(items, {
    keys: [
      { name: 'titulo', weight: 2 },
      { name: 'contenido', weight: 1 }
    ],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 2
  })

  return fuse
}

// Funcion de busqueda
export function buscarEnNormas(
  fuse: Fuse<{
    tipo: 'seccion' | 'tabla'
    normaId: string
    titulo: string
    contenido: string
    seccion?: Seccion
    tabla?: Tabla
  }>,
  query: string,
  limite = 20
): ResultadoBusqueda[] {
  if (!query.trim()) return []

  const resultados = fuse.search(query, { limit: limite })

  return resultados.map(r => ({
    tipo: r.item.tipo,
    normaId: r.item.normaId,
    seccion: r.item.seccion,
    tabla: r.item.tabla,
    score: r.score || 0
  }))
}
