#!/usr/bin/env python3
"""
Extractor de Normas UNE (PDF a JSON) - Version mejorada

Extrae texto y tablas de archivos PDF de normas UNE
y genera archivos JSON estructurados.

Mejoras v2:
- Deteccion de secciones mas precisa
- Filtrado de falsos positivos
- Ordenacion numerica de secciones
- Limpieza de texto (encabezados, pies de pagina)

Uso:
    python extract.py                     # Procesa todos los PDFs
    python extract.py --archivo une.pdf   # Procesa un PDF especifico
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("Error: pdfplumber no esta instalado.")
    print("Ejecuta: pip install -r requirements.txt")
    sys.exit(1)


# Directorios
SCRIPT_DIR = Path(__file__).parent
PDFS_DIR = SCRIPT_DIR / "pdfs"
OUTPUT_NORMAS_DIR = SCRIPT_DIR / "output" / "normas"
OUTPUT_TABLAS_DIR = SCRIPT_DIR / "output" / "tablas"

# Palabras que NO son titulos de seccion (falsos positivos)
PALABRAS_EXCLUIDAS = [
    'pagina', 'paginas', 'página', 'páginas',
    'tabla', 'tablas', 'figure', 'figura', 'figuras',
    'nota', 'notas', 'ejemplo', 'ejemplos',
    'aenor', 'une', 'iso', 'en',
    'reproduccion', 'reproducción', 'prohibida',
    'este documento', 'adquirido', 'licencia'
]

# Patrones de texto a eliminar (ruido de encabezados/pies de pagina)
PATRONES_RUIDO = [
    # Licencias y avisos de adquisicion (varios formatos)
    r'Este documento ha sido adquirido por[^\n]*\d{4}\.',  # \"...ONDOAN, S.COOP. el 4 de Febrero de 2014.\"
    r'Este documento ha sido adquirido por.*?AENOR',
    r'Para poder utilizarlo en un sistema de red.*?AENOR',
    r'© AENOR \d{4}[^\n]*',
    r'G.nova,?\s*6[^\n]*',  # Direccion AENOR completa
    r'Reproducción prohibida[^\n]*',
    # Encabezados/pies con codigo de norma y numero de pagina
    r'-\s*\d+\s*-\s*UNE[^\n]*',  # \"- 13 - UNE 23007-14:2014\" (pagina antes de norma)
    r'^UNE\s*\d+[-:]?\d*[-:]?\d*\s*-\s*\d+\s*-\s*$',  # \"UNE 23007-14:2014 - 5 -\"
    r'^UNE[\s-]+\d+[^\n]*-\s*\d+\s*-\s*$',  # Variaciones del encabezado
    r'^-\s*\d+\s*-\s*$',  # Numeros de pagina tipo \"- 5 -\"
    r'^\d+\s*$',  # Lineas con solo numeros de pagina
    # Lineas de indice/TOC (texto con puntos y numero de pagina)
    r'^[^\n]*\.{3,}\s*\d+\s*$',
    # Titulos de anexos que aparecen en contenido
    r'^ANEXO\s+[A-Z]\s*\([^)]+\)\s*$',
    r'^REQUISITOS ESPECÍFICOS\s*$',
    r'^FALSAS ALARMAS\s*$',
]


def limpiar_texto(texto: str) -> str:
    """Elimina ruido del texto extraido (encabezados, pies, licencias)."""
    for patron in PATRONES_RUIDO:
        texto = re.sub(patron, '', texto, flags=re.MULTILINE | re.IGNORECASE)

    # Eliminar lineas vacias multiples
    texto = re.sub(r'\n{3,}', '\n\n', texto)

    return texto.strip()


def limpiar_contenido_seccion(contenido: str, numero_seccion: str) -> str:
    """
    Limpia el contenido de una seccion eliminando texto que pertenece a secciones siguientes.
    Esto ocurre cuando el PDF tiene encabezados de siguiente seccion al final de pagina.
    """
    if not contenido:
        return contenido
    
    lineas = contenido.split('\n')
    
    # Patrones que indican inicio de siguiente seccion (deben estar al final del contenido)
    patrones_siguiente_seccion = [
        r'^ANEXO\s+[A-Z]\s*\(',  # "ANEXO A ("
        r'^NOTA\s+En la numeraci',  # Nota del anexo
        r'^\d{1,2}\s+[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+$',  # "13 FUNCIONAMIENTO DE..."
        r'^[A-Z]\.\d+\s+[A-Z]',  # "A.1 Objeto..."
    ]
    
    # Encontrar donde empieza contenido de siguiente seccion
    corte = len(lineas)
    for i in range(len(lineas) - 1, max(0, len(lineas) - 20), -1):  # Revisar ultimas 20 lineas
        linea = lineas[i].strip()
        for patron in patrones_siguiente_seccion:
            if re.match(patron, linea):
                # Verificar que no es una referencia legitima (debe ser al final y en mayusculas)
                if i > len(lineas) * 0.8:  # Solo en el ultimo 20% del contenido
                    corte = i
                    break
        if corte < len(lineas):
            break
    
    return '\n'.join(lineas[:corte]).strip()


def extraer_titulo_norma(texto_primera_pagina: str) -> dict:
    """Intenta extraer el codigo y titulo de la norma UNE."""
    resultado = {
        "codigo": "",
        "titulo": ""
    }

    # Buscar patron UNE XXXXX o UNE-EN XXXXX
    patron_une = r"(UNE(?:-EN)?[\s-]*\d+(?:[:-]\d+)*(?::\d{4})?)"
    match = re.search(patron_une, texto_primera_pagina, re.IGNORECASE)
    if match:
        resultado["codigo"] = match.group(1).strip().upper().replace(" ", "")

    # Buscar titulo despues del codigo
    if resultado["codigo"]:
        patron_titulo = r"(?:Sistemas de [^\n]+|Componentes [^\n]+)"
        match_titulo = re.search(patron_titulo, texto_primera_pagina, re.IGNORECASE)
        if match_titulo:
            resultado["titulo"] = match_titulo.group(0).strip()

    return resultado


def es_titulo_valido(titulo: str) -> bool:
    """Verifica si un titulo es valido (no es falso positivo)."""
    titulo_lower = titulo.lower()

    # Verificar palabras excluidas
    for palabra in PALABRAS_EXCLUIDAS:
        if titulo_lower.startswith(palabra):
            return False

    # Debe tener al menos 3 caracteres alfabeticos
    letras = sum(1 for c in titulo if c.isalpha())
    if letras < 3:
        return False

    return True


def ordenar_numero_seccion(numero: str) -> tuple:
    """
    Convierte numero de seccion a tupla para ordenacion.
    Ej: "1" -> (0, 1, 0)
        "A.1" -> (1, 1, 0)
        "A.1.2" -> (1, 1, 2)
    """
    # Separar parte alfabetica y numerica
    match = re.match(r'^([A-Z])?\.?(\d+)?\.?(\d+)?\.?(\d+)?', numero.upper())
    if not match:
        return (999, 999, 999)

    letra, n1, n2, n3 = match.groups()

    # Anexos van despues de secciones principales
    prefijo = 0 if not letra else ord(letra) - ord('A') + 1

    return (
        prefijo,
        int(n1) if n1 else 0,
        int(n2) if n2 else 0,
        int(n3) if n3 else 0
    )


def detectar_secciones(texto: str) -> list:
    """
    Detecta secciones numeradas en el texto de normas UNE.

    Patrones reconocidos:
    - Secciones principales: "0 INTRODUCCION", "1 OBJETO Y CAMPO..."
    - Subsecciones: "1.1 Generalidades", "6.5.2 Detectores"
    - Anexos: "A.1 Objeto", "ANEXO A (Normativo)"
    """
    secciones = []

    # Patron mejorado para secciones UNE
    # Captura: numero + espacio(s) + titulo en mayusculas o mixto
    patrones = [
        # Secciones principales (0-16) con titulo en mayusculas
        r'^(\d{1,2})\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,]+)$',
        # Subsecciones (1.1, 6.5.2, etc.)
        r'^(\d{1,2}(?:\.\d{1,2}){1,3})\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][^\n]{3,80})$',
        # Anexos (A.1, B.2, etc.)
        r'^([A-D]\.\d{1,2}(?:\.\d{1,2})?)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][^\n]{3,80})$',
    ]

    lineas = texto.split('\n')
    seccion_actual = None
    contenido_actual = []
    secciones_vistas = set()  # Para evitar duplicados

    for linea in lineas:
        linea_strip = linea.strip()

        # Probar cada patron
        encontrado = False
        for patron in patrones:
            match = re.match(patron, linea_strip)
            if match:
                numero = match.group(1)
                titulo = match.group(2).strip()

                # Validar titulo
                if not es_titulo_valido(titulo):
                    continue

                # Evitar duplicados
                clave = f"{numero}_{titulo[:20]}"
                if clave in secciones_vistas:
                    continue
                secciones_vistas.add(clave)

                # Guardar seccion anterior
                if seccion_actual:
                    seccion_actual["contenido"] = limpiar_contenido_seccion(limpiar_texto('\n'.join(contenido_actual)), seccion_actual['numero'])
                    secciones.append(seccion_actual)

                # Nueva seccion
                seccion_actual = {
                    "numero": numero,
                    "titulo": titulo,
                    "contenido": ""
                }
                contenido_actual = []
                encontrado = True
                break

        if not encontrado and seccion_actual:
            contenido_actual.append(linea)

    # Guardar ultima seccion
    if seccion_actual:
        seccion_actual["contenido"] = limpiar_contenido_seccion(limpiar_texto('\n'.join(contenido_actual)), seccion_actual['numero'])
        secciones.append(seccion_actual)

    # Ordenar secciones numericamente
    secciones.sort(key=lambda s: ordenar_numero_seccion(s["numero"]))

    return secciones


def extraer_tablas(pdf_path: Path) -> list:
    """Extrae tablas del PDF con mejor manejo de celdas."""
    tablas = []

    with pdfplumber.open(pdf_path) as pdf:
        for i, pagina in enumerate(pdf.pages):
            # Configuracion mejorada para extraccion de tablas
            tablas_pagina = pagina.extract_tables({
                "vertical_strategy": "lines",
                "horizontal_strategy": "lines",
                "snap_tolerance": 5,
                "join_tolerance": 5,
            })

            for j, tabla in enumerate(tablas_pagina):
                if not tabla or len(tabla) < 2:
                    continue

                # Limpiar tabla
                tabla_limpia = []
                for fila in tabla:
                    if not fila:
                        continue
                    fila_limpia = []
                    for celda in fila:
                        if celda:
                            # Limpiar celda: quitar saltos de linea extra, espacios
                            celda_limpia = ' '.join(celda.split())
                            fila_limpia.append(celda_limpia)
                        else:
                            fila_limpia.append("")

                    # Solo añadir fila si tiene contenido
                    if any(c.strip() for c in fila_limpia):
                        tabla_limpia.append(fila_limpia)

                # Filtrar tablas muy pequeñas o sin datos utiles
                if len(tabla_limpia) < 2:
                    continue

                # Verificar que la tabla tiene contenido significativo
                total_celdas = sum(len(f) for f in tabla_limpia)
                celdas_vacias = sum(1 for f in tabla_limpia for c in f if not c.strip())
                if celdas_vacias / total_celdas > 0.7:  # Mas del 70% vacio
                    continue

                tablas.append({
                    "id": f"tabla_p{i+1}_{j+1}",
                    "pagina": i + 1,
                    "cabecera": tabla_limpia[0],
                    "datos": tabla_limpia[1:]
                })

    return tablas


def extraer_texto_completo(pdf_path: Path) -> str:
    """Extrae todo el texto del PDF."""
    texto_completo = []

    with pdfplumber.open(pdf_path) as pdf:
        for pagina in pdf.pages:
            texto = pagina.extract_text()
            if texto:
                texto_completo.append(texto)

    texto = '\n\n'.join(texto_completo)
    return limpiar_texto(texto)


def procesar_pdf(pdf_path: Path) -> dict:
    """Procesa un archivo PDF y retorna la estructura JSON."""
    print(f"Procesando: {pdf_path.name}")

    with pdfplumber.open(pdf_path) as pdf:
        num_paginas = len(pdf.pages)

    # Extraer texto completo
    texto = extraer_texto_completo(pdf_path)

    if not texto:
        print(f"  Advertencia: No se pudo extraer texto de {pdf_path.name}")
        return None

    # Extraer metadatos de la norma
    info_norma = extraer_titulo_norma(texto[:3000])

    # Detectar secciones
    secciones = detectar_secciones(texto)
    print(f"  Secciones detectadas: {len(secciones)}")

    # Mostrar primeras secciones para verificacion
    if secciones:
        print(f"  Primeras secciones: {[s['numero'] + ' ' + s['titulo'][:30] for s in secciones[:5]]}")

    # Extraer tablas
    tablas = extraer_tablas(pdf_path)
    print(f"  Tablas extraidas: {len(tablas)}")

    # Construir resultado (sin texto_completo para reducir tamaño)
    resultado = {
        "norma": info_norma["codigo"] or pdf_path.stem,
        "titulo": info_norma["titulo"],
        "archivo_origen": pdf_path.name,
        "fecha_extraccion": datetime.now().isoformat(),
        "paginas_totales": num_paginas,
        "secciones": secciones,
        "tablas": tablas
    }

    return resultado


def guardar_json(datos: dict, nombre_base: str):
    """Guarda los datos en archivos JSON."""
    # Archivo principal
    archivo_norma = OUTPUT_NORMAS_DIR / f"{nombre_base}.json"
    with open(archivo_norma, 'w', encoding='utf-8') as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    print(f"  Guardado: {archivo_norma}")

    # Archivo separado solo con tablas
    if datos.get("tablas"):
        archivo_tablas = OUTPUT_TABLAS_DIR / f"{nombre_base}_tablas.json"
        datos_tablas = {
            "norma": datos["norma"],
            "tablas": datos["tablas"]
        }
        with open(archivo_tablas, 'w', encoding='utf-8') as f:
            json.dump(datos_tablas, f, ensure_ascii=False, indent=2)
        print(f"  Guardado: {archivo_tablas}")


def main():
    parser = argparse.ArgumentParser(
        description="Extrae contenido de PDFs de normas UNE a JSON (v2)"
    )
    parser.add_argument(
        "--archivo",
        type=str,
        help="Nombre del archivo PDF a procesar (dentro de pdfs/)"
    )
    args = parser.parse_args()

    # Verificar directorios
    if not PDFS_DIR.exists():
        print(f"Error: No existe el directorio {PDFS_DIR}")
        sys.exit(1)

    OUTPUT_NORMAS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_TABLAS_DIR.mkdir(parents=True, exist_ok=True)

    # Obtener lista de PDFs
    if args.archivo:
        pdfs = [PDFS_DIR / args.archivo]
        if not pdfs[0].exists():
            print(f"Error: No se encuentra {pdfs[0]}")
            sys.exit(1)
    else:
        pdfs = list(PDFS_DIR.glob("*.pdf"))

    if not pdfs:
        print("No se encontraron archivos PDF en pdfs/")
        print("Coloca los archivos PDF de normas UNE en la carpeta pdfs/")
        sys.exit(0)

    print(f"Encontrados {len(pdfs)} archivo(s) PDF\n")

    # Procesar cada PDF
    for pdf_path in pdfs:
        try:
            datos = procesar_pdf(pdf_path)
            if datos:
                nombre_base = pdf_path.stem.lower().replace(" ", "_").replace("=", "-")
                guardar_json(datos, nombre_base)
            print()
        except Exception as e:
            print(f"Error procesando {pdf_path.name}: {e}")
            import traceback
            traceback.print_exc()
            continue

    print("Proceso completado.")


if __name__ == "__main__":
    main()
