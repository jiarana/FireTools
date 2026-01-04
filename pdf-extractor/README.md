# Extractor de Normas UNE (PDF a JSON)

Herramienta para extraer contenido estructurado de archivos PDF de normas UNE.

## Requisitos

- Python 3.10+

## Instalacion

```bash
cd pdf-extractor
pip install -r requirements.txt
```

## Uso

1. Coloca los archivos PDF en la carpeta `pdfs/`

2. Ejecuta el script:

```bash
# Procesar todos los PDFs
python extract.py

# Procesar un archivo especifico
python extract.py --archivo UNE-23007.pdf
```

3. Los resultados se guardan en `output/`:
   - `output/normas/` - JSON completo con texto y tablas
   - `output/tablas/` - JSON solo con tablas extraidas

## Estructura de salida

```json
{
  "norma": "UNE 23007-14",
  "titulo": "Sistemas de deteccion y alarma de incendios",
  "fecha_extraccion": "2026-01-04T12:00:00",
  "paginas_totales": 45,
  "secciones": [
    {
      "numero": "1",
      "titulo": "Objeto y campo de aplicacion",
      "contenido": "..."
    }
  ],
  "tablas": [
    {
      "id": "tabla_p5_1",
      "pagina": 5,
      "cabecera": ["Tipo", "Cobertura m2"],
      "datos": [["Optico", "80"], ["Termico", "30"]]
    }
  ]
}
```

## Notas

- La deteccion de secciones funciona mejor con PDFs que tienen estructura clara
- Las tablas complejas pueden requerir revision manual
- No se incluye el texto completo por razones de copyright
