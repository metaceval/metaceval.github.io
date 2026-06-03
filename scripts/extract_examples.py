#!/usr/bin/env python3
"""
Extrae el bloque ## Ejemplo/Exemple/Example de cada técnica en metac.json
y lo mueve al campo 'example'. Genera un informe de casos sin ejemplo.
Uso: python3 scripts/extract_examples.py [es|ca|en] [--apply]
  --apply  Escribe el JSON modificado. Sin este flag solo muestra el informe.
"""

import json, re, sys
from pathlib import Path

# Patrón que marca el inicio del bloque de ejemplo en cualquiera de los tres idiomas
# Captura la línea completa del encabezado
EXAMPLE_START = re.compile(
    r'\n## ('
    r'[Ee]jemplo[^\n]*'     # es: Ejemplo, Ejemplos, Ejemplo de..., Un ejemplo...
    r'|[Ee]xemple[^\n]*'    # ca: Exemple, Exemples, Exemple d'aplicació...
    r'|[Ee]xample[^\n]*'    # en: Example, Examples, Example of...
    r')'
)

# Patrón para reconocer si una sección ## es de ejemplo o no
EXAMPLE_SECTION = re.compile(
    r'^## (?:[Ee]jemplo|[Ee]xemple|[Ee]xample)'
)


def split_example(desc):
    """
    Divide desc en (desc_clean, example).
    El bloque de ejemplo comienza en el primer ## Ejemplo/Exemple/Example
    y termina al encontrar otra sección ## que NO sea de ejemplo, o al final.
    """
    m = EXAMPLE_START.search(desc)
    if not m:
        return desc, ''

    # Todo lo anterior al primer \n## Ejemplo → queda en desc
    desc_before = desc[:m.start()].rstrip()

    # Texto desde el ## Ejemplo hasta el final
    rest = desc[m.start() + 1:]   # +1 para saltar el \n inicial

    # Dividir 'rest' en secciones delimitadas por \n##
    sections = re.split(r'\n(?=## )', rest)

    example_parts = []
    tail_parts = []   # secciones ## no-ejemplo que vienen TRAS el bloque de ejemplo

    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue
        if EXAMPLE_SECTION.match(sec):
            example_parts.append(sec)
        else:
            # Sección no-ejemplo: si ya hemos recogido ejemplo, va a la cola de desc
            if example_parts:
                tail_parts.append(sec)
            # Si no hemos encontrado ejemplo aún (raro), ignorar — el match inicial
            # asegura que lo siguiente a 'before' es una sección de ejemplo

    example = '\n\n'.join(example_parts)

    # Secciones no-ejemplo posteriores vuelven a desc
    if tail_parts:
        desc_before = desc_before + '\n\n' + '\n\n'.join(tail_parts)

    return desc_before, example


def process(lang='es', apply=False):
    path = Path(f'data/{lang}/metac.json')
    data = json.loads(path.read_text(encoding='utf-8'))

    results = []
    missing = []

    for item in data:
        item = dict(item)  # copia superficial para no mutar el original

        # Si ya tiene example poblado, no tocar
        if item.get('example'):
            results.append(item)
            continue

        desc = item.get('desc', '')
        new_desc, example = split_example(desc)

        if not example:
            missing.append((item['id'], item.get('name', '')))

        item['desc'] = new_desc
        item['example'] = example
        results.append(item)

    with_ex = len(data) - len(missing)
    print(f'\n=== Informe [{lang}] ===')
    print(f'Total: {len(data)}  |  Con ejemplo: {with_ex}  |  Sin ejemplo: {len(missing)}')

    if missing:
        print(f'\nSin ejemplo ({len(missing)}):')
        for id_, name in missing:
            print(f'  {id_}  ({name})')

    if apply:
        path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'\nEscrito: {path}')
    else:
        print('\n[Modo simulación — usa --apply para escribir el archivo]')

    return with_ex, missing


if __name__ == '__main__':
    lang = 'es'
    apply = False
    for arg in sys.argv[1:]:
        if arg == '--apply':
            apply = True
        elif arg in ('es', 'ca', 'en'):
            lang = arg
    process(lang, apply)
