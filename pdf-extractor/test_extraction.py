#!/usr/bin/env python3
"""
Batería de pruebas para verificar que los textos de encabezado/pie
de página no aparecen en el JSON extraído.
"""

import json
import re
import sys
from pathlib import Path

# Patrones de texto que NO deben aparecer
FORBIDDEN_PATTERNS = [
    r'Este documento ha sido adquirido por',
    r'ONDOAN',
    r'S\.COOP\.',
    r'UNE\s*23007-14:?\d*\s*-\s*\d+\s*-',  # "UNE 23007-14:2014 - 12 -"
    r'-\s*\d+\s*-\s*UNE',  # "- 13 - UNE 23007-14:2014" (formato invertido)
    r'^-\s*\d+\s*-$',  # "- 12 -" en línea sola
    r'© AENOR',
    r'Reproducción prohibida',
    r'Génova,\s*6',
    # Lineas de indice/TOC
    r'\.{5,}\s*\d+$',  # "Generalidades ........... 38"
    # Titulos de anexos en contenido
    r'^ANEXO\s+[A-Z]\s*\((?:Normativo|Informativo)\)',
]

# Colores para terminal
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RESET = '\033[0m'


def test_json_file(json_path: Path) -> tuple[int, int, list]:
    """
    Prueba un archivo JSON buscando patrones prohibidos.

    Returns:
        (total_tests, passed, failures)
    """
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    failures = []
    total_tests = 0
    passed = 0

    # Probar cada sección
    for section in data.get('secciones', []):
        numero = section.get('numero', '?')
        titulo = section.get('titulo', '?')[:40]
        contenido = section.get('contenido', '')

        for pattern in FORBIDDEN_PATTERNS:
            total_tests += 1
            match = re.search(pattern, contenido, re.IGNORECASE | re.MULTILINE)

            if match:
                # Encontrar contexto
                start = max(0, match.start() - 30)
                end = min(len(contenido), match.end() + 30)
                context = contenido[start:end].replace('\n', ' ')

                failures.append({
                    'section': f"{numero}: {titulo}",
                    'pattern': pattern,
                    'match': match.group(),
                    'context': f"...{context}..."
                })
            else:
                passed += 1

    # Probar tablas extraídas automáticamente
    for tabla in data.get('tablas', []):
        tabla_id = tabla.get('id', '?')

        # Verificar cabecera
        for cell in tabla.get('cabecera', []):
            for pattern in FORBIDDEN_PATTERNS:
                total_tests += 1
                if re.search(pattern, str(cell), re.IGNORECASE):
                    failures.append({
                        'section': f"Tabla {tabla_id} (cabecera)",
                        'pattern': pattern,
                        'match': cell[:50],
                        'context': cell
                    })
                else:
                    passed += 1

        # Verificar datos
        for row in tabla.get('datos', []):
            for cell in row:
                for pattern in FORBIDDEN_PATTERNS:
                    total_tests += 1
                    if re.search(pattern, str(cell), re.IGNORECASE):
                        failures.append({
                            'section': f"Tabla {tabla_id} (datos)",
                            'pattern': pattern,
                            'match': str(cell)[:50],
                            'context': str(cell)
                        })
                    else:
                        passed += 1

    return total_tests, passed, failures


def main():
    script_dir = Path(__file__).parent

    # Archivos a probar
    test_files = [
        script_dir / "output" / "normas" / "une_23007-14-2014.json",
        script_dir.parent / "src" / "data" / "normas" / "une-23007-14.json",
    ]

    print("=" * 60)
    print("PRUEBAS DE EXTRACCIÓN - Textos de Encabezado/Pie")
    print("=" * 60)
    print()

    total_failures = 0

    for json_path in test_files:
        if not json_path.exists():
            print(f"{YELLOW}SKIP{RESET} {json_path.name} - No existe")
            continue

        print(f"Probando: {json_path.name}")
        total, passed, failures = test_json_file(json_path)

        if failures:
            print(f"  {RED}FAIL{RESET} {len(failures)} errores de {total} pruebas")
            for f in failures[:10]:  # Mostrar máximo 10
                print(f"    - Sección: {f['section']}")
                print(f"      Patrón: {f['pattern']}")
                print(f"      Encontrado: {f['match']}")
                print(f"      Contexto: {f['context'][:80]}")
                print()
            if len(failures) > 10:
                print(f"    ... y {len(failures) - 10} errores más")
            total_failures += len(failures)
        else:
            print(f"  {GREEN}PASS{RESET} {passed}/{total} pruebas pasadas")
        print()

    print("=" * 60)
    if total_failures > 0:
        print(f"{RED}RESULTADO: {total_failures} FALLOS{RESET}")
        sys.exit(1)
    else:
        print(f"{GREEN}RESULTADO: TODAS LAS PRUEBAS PASARON{RESET}")
        sys.exit(0)


if __name__ == "__main__":
    main()
