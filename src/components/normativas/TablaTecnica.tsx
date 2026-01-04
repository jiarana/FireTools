interface TablaTecnicaProps {
  tabla: {
    id: string
    numero_tabla?: string
    titulo: string
    capitulo?: string
    capitulo_titulo?: string
    articulo?: string
    articulo_titulo?: string
    anexo?: string
    apartado_anexo?: string
    apartado_anexo_titulo?: string
    descripcion: string
    pagina_referencia?: number
    columnas: string[]
    notas?: string[]
    datos: Record<string, string | number>[]
  }
}

export default function TablaTecnica({ tabla }: TablaTecnicaProps) {
  // Obtener las claves de los datos (excluyendo las que no son columnas)
  const claves = tabla.datos.length > 0 ? Object.keys(tabla.datos[0]) : []

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      {/* Encabezado con numero de tabla */}
      <div className="mb-4 pb-3 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-800">
          {tabla.numero_tabla && (
            <span className="text-red-600">Tabla {tabla.numero_tabla}</span>
          )}
          {tabla.numero_tabla && ' - '}
          {tabla.titulo}
        </h3>

        {/* Referencia al capitulo y articulo principal */}
        {(tabla.capitulo || tabla.articulo) && (
          <p className="text-sm text-gray-600 mt-2">
            {tabla.capitulo && (
              <span>
                <span className="font-semibold">Capitulo {tabla.capitulo}:</span>{' '}
                <span>{tabla.capitulo_titulo}</span>
              </span>
            )}
            {tabla.capitulo && tabla.articulo && ' | '}
            {tabla.articulo && (
              <span>
                <span className="font-semibold">Art. {tabla.articulo}:</span>{' '}
                <span>{tabla.articulo_titulo}</span>
              </span>
            )}
          </p>
        )}

        {/* Referencia al anexo y apartado especifico */}
        {(tabla.anexo || tabla.apartado_anexo) && (
          <p className="text-sm text-blue-700 mt-1">
            {tabla.anexo && <span className="font-medium">{tabla.anexo}</span>}
            {tabla.anexo && tabla.apartado_anexo && ' | '}
            {tabla.apartado_anexo && (
              <span>
                <span className="font-semibold">{tabla.apartado_anexo}:</span>{' '}
                <span className="italic">{tabla.apartado_anexo_titulo}</span>
              </span>
            )}
            {tabla.pagina_referencia && (
              <span className="ml-2 text-gray-400">(Pag. {tabla.pagina_referencia})</span>
            )}
          </p>
        )}
      </div>

      {/* Descripcion */}
      <p className="text-sm text-gray-600 mb-4">{tabla.descripcion}</p>

      {/* Tabla de datos */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-red-50">
              {tabla.columnas.map((col, i) => (
                <th
                  key={i}
                  className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla.datos.map((fila, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {claves.map((clave, j) => (
                  <td
                    key={j}
                    className="border border-gray-300 px-3 py-2 text-sm text-gray-700"
                  >
                    {fila[clave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notas */}
      {tabla.notas && tabla.notas.length > 0 && (
        <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-800">
          <p className="font-semibold mb-1">Notas:</p>
          <ul className="list-disc list-inside space-y-1">
            {tabla.notas.map((nota, i) => (
              <li key={i}>{nota}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
