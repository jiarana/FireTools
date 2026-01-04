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

# PyMuPDF para extraccion de imagenes/figuras
try:
    import fitz  # PyMuPDF
    PYMUPDF_DISPONIBLE = True
except ImportError:
    PYMUPDF_DISPONIBLE = False
    print("Advertencia: PyMuPDF no instalado. Extraccion de figuras deshabilitada.")


# Directorios
SCRIPT_DIR = Path(__file__).parent
PDFS_DIR = SCRIPT_DIR / "pdfs"
OUTPUT_NORMAS_DIR = SCRIPT_DIR / "output" / "normas"
OUTPUT_TABLAS_DIR = SCRIPT_DIR / "output" / "tablas"
OUTPUT_FIGURAS_DIR = SCRIPT_DIR / "output" / "figuras"

# Configuracion de extraccion de figuras
MIN_IMAGEN_WIDTH = 50   # Ignorar imagenes menores a 50px
MIN_IMAGEN_HEIGHT = 50
MAX_FIGURAS_POR_PDF = 100  # Limite razonable
FORMATOS_IMAGEN_VALIDOS = ['png', 'jpeg', 'jpg', 'bmp', 'tiff']

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
    # Pie de pagina con direccion AENOR
    r'^\d{5}\s+MADRID.*(?:aenor|Fax)[^\n]*$',
    # Encabezados/pies con codigo de norma y numero de pagina
    r'-\s*\d+\s*-\s*UNE[^\n]*',  # \"- 13 - UNE 23007-14:2014\" (pagina antes de norma)
    r'^UNE\s*\d+[-:]?\d*[-:]?\d*\s*-\s*\d+\s*-\s*$',  # \"UNE 23007-14:2014 - 5 -\"
    r'^UNE[\s-]+\d+[^\n]*-\s*\d+\s*-\s*$',  # Variaciones del encabezado
    r'^-\s*\d+\s*-\s*$',  # Numeros de pagina tipo \"- 5 -\"
    r'^\d+\s*$',  # Lineas con solo numeros de pagina
    # Lineas de indice/TOC (texto con puntos y numero de pagina)
    r'^[^\n]*\.{3,}\s*\d+\s*$',
    # Titulos de anexos que aparecen en contenido (solo A y B que tienen subsecciones)
    r'^ANEXO\s+[AB]\s*\([^)]+\)\s*$',
    r'^REQUISITOS ESPECÍFICOS\s*$',
    r'^FALSAS ALARMAS\s*$',
]


def limpiar_texto(texto: str) -> str:
    """Elimina ruido del texto extraido (encabezados, pies, licencias)."""
    for patron in PATRONES_RUIDO:
        texto = re.sub(patron, '', texto, flags=re.MULTILINE | re.IGNORECASE)

    # Unir lineas que terminan en guion (palabras partidas)
    # Ej: "Dispositi-\nvos" -> "Dispositivos"
    texto = re.sub(r'-\n([a-záéíóúñ])', r'\1', texto)

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
        # Anexos numerados (A.1, B.2, etc.)
        r'^([A-D]\.\d{1,2}(?:\.\d{1,2})?)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][^\n]{3,80})$',
    ]

    # Patron especial para encabezados de anexo completos (sin subsecciones)
    # Ej: "ANEXO C (Informativo)" - debe terminar ahi, sin puntos del TOC
    patron_anexo_titulo = r'^ANEXO\s+([A-Z])\s*\((?:Normativo|Informativo)\)\s*$'

    lineas = texto.split('\n')
    seccion_actual = None
    contenido_actual = []
    secciones_vistas = set()  # Para evitar duplicados

    # Titulos conocidos de anexos sin subsecciones
    titulos_anexos = {
        'C': 'MODELOS DE DOCUMENTOS',
        'D': 'BIBLIOGRAFIA'
    }

    for linea in lineas:
        linea_strip = linea.strip()
        encontrado = False

        # 1. Verificar primero si es un encabezado de anexo completo (solo C y D que no tienen subsecciones)
        match_anexo = re.match(patron_anexo_titulo, linea_strip)
        if match_anexo:
            letra_anexo = match_anexo.group(1)

            # Solo crear seccion para anexos sin subsecciones numeradas (C y D)
            if letra_anexo in titulos_anexos:
                # Guardar seccion anterior
                if seccion_actual:
                    seccion_actual["contenido"] = limpiar_contenido_seccion(limpiar_texto('\n'.join(contenido_actual)), seccion_actual['numero'])
                    secciones.append(seccion_actual)

                # Crear seccion para el anexo completo (usar letra como numero)
                titulo_anexo = titulos_anexos.get(letra_anexo, '')
                seccion_actual = {
                    "numero": f"{letra_anexo}.0",  # C.0, D.0 para anexos sin subsecciones
                    "titulo": titulo_anexo or f"Anexo {letra_anexo}",
                    "contenido": ""
                }
                contenido_actual = []
                encontrado = True

        # 2. Probar patrones normales de seccion
        if not encontrado:
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


def bboxes_adyacentes(bbox1: tuple, bbox2: tuple, tolerancia: float = 5) -> bool:
    """
    Verifica si dos bboxes estan adyacentes (se tocan o casi se tocan).

    Args:
        bbox1: Tupla (x0, y0, x1, y1) del primer bbox
        bbox2: Tupla (x0, y0, x1, y1) del segundo bbox
        tolerancia: Pixeles de margen para considerar adyacencia

    Returns:
        True si los bboxes se superponen o estan muy cerca
    """
    x0_1, y0_1, x1_1, y1_1 = bbox1
    x0_2, y0_2, x1_2, y1_2 = bbox2

    # Expandir bbox1 con tolerancia
    x0_1_exp = x0_1 - tolerancia
    y0_1_exp = y0_1 - tolerancia
    x1_1_exp = x1_1 + tolerancia
    y1_1_exp = y1_1 + tolerancia

    # Verificar si NO hay superposicion (y negar el resultado)
    no_superponen = (x1_1_exp < x0_2 or x1_2 < x0_1_exp or
                     y1_1_exp < y0_2 or y1_2 < y0_1_exp)

    return not no_superponen


def agrupar_imagenes_adyacentes(image_infos: list, tolerancia: float = 5) -> list:
    """
    Agrupa imagenes que estan adyacentes o superpuestas.

    Args:
        image_infos: Lista de diccionarios con info de imagenes (de page.get_image_info())
        tolerancia: Pixeles de margen para considerar adyacencia

    Returns:
        Lista de bboxes combinados (tuplas x0, y0, x1, y1)
    """
    if not image_infos:
        return []

    # Filtrar imagenes validas (con bbox)
    bboxes = []
    for info in image_infos:
        bbox = info.get('bbox')
        if bbox and len(bbox) == 4:
            bboxes.append(tuple(bbox))

    if not bboxes:
        return []

    # Algoritmo de agrupacion: unir bboxes que se tocan o estan muy cerca
    grupos = []
    usados = set()

    for i, bbox1 in enumerate(bboxes):
        if i in usados:
            continue

        # Iniciar nuevo grupo con este bbox
        grupo_bbox = list(bbox1)  # [x0, y0, x1, y1]
        usados.add(i)

        # Buscar bboxes adyacentes y expandir el grupo iterativamente
        cambio = True
        while cambio:
            cambio = False
            for j, bbox2 in enumerate(bboxes):
                if j in usados:
                    continue
                # Verificar si bbox2 esta adyacente al grupo actual
                if bboxes_adyacentes(tuple(grupo_bbox), bbox2, tolerancia):
                    # Expandir grupo_bbox para incluir bbox2
                    grupo_bbox[0] = min(grupo_bbox[0], bbox2[0])
                    grupo_bbox[1] = min(grupo_bbox[1], bbox2[1])
                    grupo_bbox[2] = max(grupo_bbox[2], bbox2[2])
                    grupo_bbox[3] = max(grupo_bbox[3], bbox2[3])
                    usados.add(j)
                    cambio = True

        grupos.append(tuple(grupo_bbox))

    return grupos


def obtener_seccion_cercana(pagina: int, secciones: list, paginas_totales: int) -> dict:
    """
    Estima la seccion mas cercana basandose en el numero de pagina.

    Heuristica:
    1. Paginas 1-5 suelen ser intro/indice -> seccion 0
    2. Para el resto, mapear proporcionalmente entre secciones principales
    """
    seccion_cercana = {"numero": "0", "titulo": "INTRODUCCION", "estimado": True}

    if not secciones:
        return seccion_cercana

    # Paginas iniciales (indice, portada)
    if pagina <= 5:
        return seccion_cercana

    # Obtener secciones principales (sin subsecciones)
    secciones_principales = [s for s in secciones if re.match(r'^\d+$', s['numero'])]

    if not secciones_principales:
        # Usar cualquier seccion disponible
        secciones_principales = secciones[:10]

    if not secciones_principales:
        return seccion_cercana

    # Estimar seccion basandose en posicion relativa en el documento
    # Asumimos distribucion aproximadamente uniforme
    paginas_contenido = paginas_totales - 5  # Restamos paginas de intro
    pagina_relativa = pagina - 5

    if paginas_contenido <= 0:
        return seccion_cercana

    # Calcular indice de seccion aproximado
    proporcion = pagina_relativa / paginas_contenido
    idx_seccion = int(proporcion * len(secciones_principales))
    idx_seccion = min(idx_seccion, len(secciones_principales) - 1)
    idx_seccion = max(idx_seccion, 0)

    seccion = secciones_principales[idx_seccion]
    return {
        "numero": seccion['numero'],
        "titulo": seccion['titulo'][:50],  # Truncar titulo largo
        "estimado": True
    }


def extraer_figuras(pdf_path: Path, secciones: list, nombre_base: str, paginas_totales: int) -> list:
    """
    Extrae figuras del PDF agrupando imagenes adyacentes y renderizando como pixmap.

    Este metodo resuelve el problema de figuras fragmentadas: algunos PDFs almacenan
    figuras como multiples imagenes en cuadricula. En lugar de extraer cada imagen
    individualmente, detectamos imagenes adyacentes, combinamos sus bboxes, y
    renderizamos el area completa como una unica imagen.

    Args:
        pdf_path: Ruta al archivo PDF
        secciones: Lista de secciones ya extraidas (para mapear seccion_cercana)
        nombre_base: Nombre base para los archivos de salida
        paginas_totales: Numero total de paginas del PDF

    Returns:
        Lista de diccionarios con metadatos de cada figura
    """
    if not PYMUPDF_DISPONIBLE:
        print("  PyMuPDF no disponible, saltando extraccion de figuras")
        return []

    figuras = []

    # Crear directorio de salida para esta norma
    dir_figuras_norma = OUTPUT_FIGURAS_DIR / nombre_base
    dir_figuras_norma.mkdir(parents=True, exist_ok=True)

    # DPI para renderizado (balance entre calidad y tamano)
    DPI_RENDERIZADO = 150

    try:
        doc = fitz.open(pdf_path)

        for num_pagina in range(len(doc)):
            if len(figuras) >= MAX_FIGURAS_POR_PDF:
                print(f"  Advertencia: Limite de {MAX_FIGURAS_POR_PDF} figuras alcanzado")
                break

            # Saltar paginas de portada/indice (1-5) y ultima pagina (logos)
            if num_pagina < 5 or num_pagina >= len(doc) - 1:
                continue

            pagina = doc[num_pagina]

            # Obtener informacion de posicion de todas las imagenes en la pagina
            image_infos = pagina.get_image_info()

            if not image_infos:
                continue

            # Agrupar imagenes adyacentes en bboxes combinados
            grupos_bbox = agrupar_imagenes_adyacentes(image_infos, tolerancia=5)

            for idx, bbox in enumerate(grupos_bbox):
                try:
                    x0, y0, x1, y1 = bbox
                    ancho = x1 - x0
                    alto = y1 - y0

                    # Filtrar figuras muy pequenas (iconos, decoraciones)
                    if ancho < MIN_IMAGEN_WIDTH or alto < MIN_IMAGEN_HEIGHT:
                        continue

                    # Filtrar banners/logos (muy anchos y bajos, ratio > 4:1)
                    if ancho > 500 and alto < 200 and ancho / alto > 4:
                        continue

                    # Renderizar el area como pixmap
                    clip = fitz.Rect(bbox)
                    pix = pagina.get_pixmap(clip=clip, dpi=DPI_RENDERIZADO)

                    # Generar nombre de archivo (siempre PNG para mejor calidad)
                    nombre_figura = f"figura_p{num_pagina + 1}_{idx + 1}.png"
                    ruta_figura = dir_figuras_norma / nombre_figura

                    # Guardar imagen
                    pix.save(str(ruta_figura))

                    # Estimar seccion cercana
                    seccion_cercana = obtener_seccion_cercana(num_pagina + 1, secciones, paginas_totales)

                    # Crear metadatos de la figura
                    figura_metadata = {
                        "id": f"fig_p{num_pagina + 1}_{idx + 1}",
                        "archivo": nombre_figura,
                        "ruta_relativa": f"figuras/{nombre_base}/{nombre_figura}",
                        "pagina": num_pagina + 1,
                        "posicion": {
                            "x": round(x0, 1),
                            "y": round(y0, 1),
                            "ancho": round(ancho, 1),
                            "alto": round(alto, 1)
                        },
                        "seccion_cercana": seccion_cercana,
                        "formato": "png",
                        "tamano_bytes": len(pix.tobytes())
                    }

                    figuras.append(figura_metadata)

                except Exception as e:
                    print(f"    Error renderizando figura {idx} de pagina {num_pagina + 1}: {e}")
                    continue

        doc.close()
        print(f"  Figuras extraidas: {len(figuras)}")

    except Exception as e:
        print(f"  Error abriendo PDF con PyMuPDF: {e}")

    return figuras


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

    # Extraer figuras (imagenes embebidas)
    nombre_base = pdf_path.stem.lower().replace(" ", "_").replace("=", "-")
    figuras = extraer_figuras(pdf_path, secciones, nombre_base, num_paginas)

    # Construir resultado (sin texto_completo para reducir tamano)
    resultado = {
        "norma": info_norma["codigo"] or pdf_path.stem,
        "titulo": info_norma["titulo"],
        "archivo_origen": pdf_path.name,
        "fecha_extraccion": datetime.now().isoformat(),
        "paginas_totales": num_paginas,
        "secciones": secciones,
        "tablas": tablas,
        "figuras": figuras
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
    OUTPUT_FIGURAS_DIR.mkdir(parents=True, exist_ok=True)

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
