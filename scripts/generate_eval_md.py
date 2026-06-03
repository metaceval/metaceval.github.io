#!/usr/bin/env python3
"""
Genera un Markdown legible por humanos de las entidades de evaluación de metaceval.
Uso: python3 scripts/generate_eval_md.py
Salida: eval-es.md, eval-ca.md, eval-en.md (en la raíz del proyecto)
"""

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_eval_example(entity_id, lang):
    """Lee examples/{lang}/{id}.html con fallback a 'es'. Devuelve texto plano."""
    for l in ([lang, 'es'] if lang != 'es' else ['es']):
        path = os.path.join(BASE_DIR, 'examples', l, f'{entity_id}.html')
        if os.path.exists(path):
            html = open(path, encoding='utf-8').read()
            # Convertir tabla HTML a texto plano tabular
            html = re.sub(r'<tr[^>]*>', '', html)
            html = re.sub(r'</tr>', '\n', html)
            html = re.sub(r'<th[^>]*>', '| ', html)
            html = re.sub(r'<td[^>]*>', '| ', html)
            html = re.sub(r'</th>|</td>', ' ', html)
            html = re.sub(r'<[^>]+>', '', html)   # resto de tags
            html = re.sub(r' {2,}', ' ', html)
            html = '\n'.join(l.strip() for l in html.splitlines() if l.strip())
            return html
    return None

# ── Category metadata per language ────────────────────────────────────────────

CATS = {
    "es": [
        {"file": "tecnicas.json",    "prefix": "TEC", "heading": "Técnicas de evaluación"},
        {"file": "evidencias.json",  "prefix": "INS", "heading": "Evidencias observables"},
        {"file": "instrumentos.json","prefix": "HER", "heading": "Instrumentos de evaluación"},
        {"file": "dimensiones.json", "prefix": "DIM", "heading": "Dimensiones de evaluación"},
    ],
    "ca": [
        {"file": "tecnicas.json",    "prefix": "TEC", "heading": "Tècniques d'avaluació"},
        {"file": "evidencias.json",  "prefix": "INS", "heading": "Evidències observables"},
        {"file": "instrumentos.json","prefix": "HER", "heading": "Instruments d'avaluació"},
        {"file": "dimensiones.json", "prefix": "DIM", "heading": "Dimensions d'avaluació"},
    ],
    "en": [
        {"file": "tecnicas.json",    "prefix": "TEC", "heading": "Evaluation techniques"},
        {"file": "evidencias.json",  "prefix": "INS", "heading": "Observable evidence"},
        {"file": "instrumentos.json","prefix": "HER", "heading": "Evaluation instruments"},
        {"file": "dimensiones.json", "prefix": "DIM", "heading": "Assessment dimensions"},
    ],
}

LANGS = {
    "es": {
        "output":   "eval-es.md",
        "title":    "Evaluación del Aprendizaje Activo",
        "subtitle": "Catálogo de técnicas, evidencias, instrumentos y dimensiones para evaluar metodologías de aprendizaje activo.",
        "toc":      "Índice",
        "intro": (
            "Este catálogo recoge las entidades de evaluación organizadas en cuatro categorías: "
            "técnicas de evaluación, evidencias observables, instrumentos y dimensiones. "
            "Cada entrada incluye descripción, metadatos y las técnicas activas con las que se relaciona."
        ),
        "labels": {
            "summary":      "Resumen",
            "phase":        "Fase",
            "participation":"Participación",
            "complexity":   "Complejidad",
            "modality":     "Modalidad",
            "location":     "Espacio",
            "grouping":     "Agrupamiento",
            "ai_resistance":"Resistencia IA",
            "type":         "Tipo",
            "category":     "Categoría",
            "purpose":      "Propósito",
            "when_to_use":  "Cuándo usarla",
            "suitable_for": "Adecuada para",
            "typical_evidence": "Evidencias típicas",
            "limitations":  "Limitaciones",
            "ped_function": "Función pedagógica",
            "tags":         "Palabras clave",
            "example":      "Ejemplo",
            "metac":        "Técnicas activas que la usan",
        },
        "cats": CATS["es"],
    },
    "ca": {
        "output":   "eval-ca.md",
        "title":    "Avaluació de l'Aprenentatge Actiu",
        "subtitle": "Catàleg de tècniques, evidències, instruments i dimensions per avaluar metodologies d'aprenentatge actiu.",
        "toc":      "Índex",
        "intro": (
            "Aquest catàleg recull les entitats d'avaluació organitzades en quatre categories: "
            "tècniques d'avaluació, evidències observables, instruments i dimensions. "
            "Cada entrada inclou descripció, metadades i les tècniques actives amb les quals es relaciona."
        ),
        "labels": {
            "summary":      "Resum",
            "phase":        "Fase",
            "participation":"Participació",
            "complexity":   "Complexitat",
            "modality":     "Modalitat",
            "location":     "Espai",
            "grouping":     "Agrupament",
            "ai_resistance":"Resistència IA",
            "type":         "Tipus",
            "category":     "Categoria",
            "purpose":      "Propòsit",
            "when_to_use":  "Quan usar-la",
            "suitable_for": "Adequada per a",
            "typical_evidence": "Evidències típiques",
            "limitations":  "Limitacions",
            "ped_function": "Funció pedagògica",
            "tags":         "Paraules clau",
            "example":      "Exemple",
            "metac":        "Tècniques actives que l'utilitzen",
        },
        "cats": CATS["ca"],
    },
    "en": {
        "output":   "eval-en.md",
        "title":    "Assessment of Active Learning",
        "subtitle": "Catalogue of techniques, evidence, instruments and dimensions for assessing active learning methodologies.",
        "toc":      "Contents",
        "intro": (
            "This catalogue brings together assessment entities organised in four categories: "
            "evaluation techniques, observable evidence, instruments and dimensions. "
            "Each entry includes a description, metadata and the active techniques it is associated with."
        ),
        "labels": {
            "summary":      "Summary",
            "phase":        "Phase",
            "participation":"Participation",
            "complexity":   "Complexity",
            "modality":     "Modality",
            "location":     "Location",
            "grouping":     "Grouping",
            "ai_resistance":"AI resistance",
            "type":         "Type",
            "category":     "Category",
            "purpose":      "Purpose",
            "when_to_use":  "When to use",
            "suitable_for": "Suitable for",
            "typical_evidence": "Typical evidence",
            "limitations":  "Limitations",
            "ped_function": "Pedagogic function",
            "tags":         "Keywords",
            "example":      "Example",
            "metac":        "Active techniques using this",
        },
        "cats": CATS["en"],
    },
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def load_json(lang, filename):
    path = os.path.join(BASE_DIR, "data", lang, filename)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def slug(text):
    value = text.lower().strip()
    for src, dst in [("àáâãäå","a"),("èéêë","e"),("ìíîï","i"),("òóôõö","o"),("ùúûü","u"),("ñ","n"),("ç","c")]:
        for c in src:
            value = value.replace(c, dst)
    value = value.replace(" ", "-")
    return re.sub(r"[^\w\-]", "", value)


def fmt_desc(raw):
    if not raw:
        return ""
    lines = raw.strip().split("\n")
    out = []
    for line in lines:
        if line.startswith("## "):
            out.append("#### " + line[3:])
        elif re.match(r'^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s]{2,}:', line):
            out.append(re.sub(r'^([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s]{2,}:)', r'**\1**', line))
        else:
            out.append(line)
    return "\n".join(out)


def meta_line(label, value):
    if not value:
        return ""
    return f"**{label}:** {value}"


# ── Entity block ───────────────────────────────────────────────────────────────

def entity_block(n, item, labels, metac_by_id, lang='es'):
    lines = []
    lines.append(f"### {n}. {item['name']} `{item['id']}`\n")

    if item.get("summary"):
        lines.append(f"_{item['summary']}_\n")

    # Metadata badges
    meta = []
    for key, label_key in [
        ("type",          "type"),
        ("category",      "category"),
        ("phase",         "phase"),
        ("participation", "participation"),
        ("complexity",    "complexity"),
        ("modality",      "modality"),
        ("location",      "location"),
        ("grouping",      "grouping"),
        ("ai_resistance", "ai_resistance"),
    ]:
        v = item.get(key)
        if v:
            meta.append(meta_line(labels[label_key], v))
    if meta:
        lines.append(" · ".join(meta) + "\n")

    if item.get("tags"):
        tags = item["tags"] if isinstance(item["tags"], list) else [item["tags"]]
        lines.append(f"_{labels['tags']}: {', '.join(tags)}_\n")

    # Description
    if item.get("desc"):
        lines.append(fmt_desc(item["desc"]) + "\n")

    # Extra fields
    for key, label_key in [
        ("purpose",            "purpose"),
        ("when_to_use",        "when_to_use"),
        ("suitable_for",       "suitable_for"),
        ("typical_evidence",   "typical_evidence"),
        ("limitations",        "limitations"),
        ("pedagogic_function", "ped_function"),
    ]:
        v = item.get(key)
        if v:
            if isinstance(v, list):
                lines.append(f"**{labels[label_key]}:** {', '.join(v)}\n")
            else:
                lines.append(f"**{labels[label_key]}:** {v}\n")

    # Example (external HTML file)
    example_text = load_eval_example(item['id'], lang)
    if example_text:
        lines.append(f"**{labels['example']}:**\n")
        lines.append(example_text + "\n")

    # Related técnicas activas
    metac_ids = item.get("metac_ids") or []
    if metac_ids and metac_by_id:
        names = [metac_by_id[mid]["name"] for mid in metac_ids if mid in metac_by_id]
        if names:
            lines.append(f"**{labels['metac']}:** {', '.join(names)}\n")

    lines.append("---\n")
    return "\n".join(l for l in lines if l) + "\n"


# ── Document header ────────────────────────────────────────────────────────────

def doc_header(cfg, cat_headings):
    toc_lines = [f"{i}. [{h}](#{slug(h)})" for i, h in enumerate(cat_headings, 1)]
    return f"""# {cfg['title']}

> {cfg['subtitle']}

## {cfg['toc']}

{chr(10).join(toc_lines)}

---

{cfg['intro']}

"""


# ── Generate one language ──────────────────────────────────────────────────────

def generate(lang, cfg):
    # Load técnicas activas for cross-reference names
    try:
        metac_items = load_json(lang, "metac.json")
        metac_by_id = {t["id"]: t for t in metac_items}
    except FileNotFoundError:
        metac_by_id = {}

    labels = cfg["labels"]
    cats   = cfg["cats"]

    # Load all entity data
    cat_data = []
    for cat in cats:
        try:
            items = load_json(lang, cat["file"])
        except FileNotFoundError:
            items = []
        cat_data.append((cat["heading"], items))

    headings = [h for h, _ in cat_data]
    out = [doc_header(cfg, headings)]

    for heading, items in cat_data:
        out.append(f"## {heading}\n\n")
        for n, item in enumerate(items, 1):
            out.append(entity_block(n, item, labels, metac_by_id, lang))

    content = "\n".join(out).rstrip() + "\n"
    output_path = os.path.join(BASE_DIR, cfg["output"])
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    total = sum(len(items) for _, items in cat_data)
    print(f"[{lang}] → {cfg['output']}")
    for heading, items in cat_data:
        print(f"  {heading}: {len(items)} entidades")
    print(f"  Total: {total}")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    for lang, cfg in LANGS.items():
        generate(lang, cfg)


if __name__ == "__main__":
    main()
