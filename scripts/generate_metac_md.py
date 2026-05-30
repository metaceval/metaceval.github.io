#!/usr/bin/env python3
"""
Genera un Markdown legible por humanos de las técnicas activas de metaceval.
Uso: python3 scripts/generate_metac_md.py
Salida: metac-es.md, metac-ca.md (en la raíz del proyecto)
"""

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LANGS = {
    "es": {
        "output": "metac-es.md",
        "title": "Metodologías Activas para el Aula",
        "subtitle": "Catálogo de técnicas, rutinas y metodologías de aprendizaje activo con orientaciones para su evaluación.",
        "toc": "Índice por ámbitos",
        "intro": (
            "Este catálogo recoge metodologías de aprendizaje activo organizadas por ámbitos pedagógicos. "
            "Cada técnica incluye descripción, recursos, relaciones con otras metodologías y orientaciones sobre "
            "cómo evaluarla mediante técnicas, evidencias observables, instrumentos y dimensiones de evaluación.\n\n"
            "Las relaciones entre técnicas y entidades de evaluación son orientativas y no exhaustivas: "
            "una misma técnica puede evaluarse de formas muy diversas según el contexto y la finalidad docente."
        ),
        "labels": {
            "block":    "Bloque",
            "fields":   "Ámbitos",
            "tags":     "Palabras clave",
            "programs": "Recursos",
            "related":  "Técnicas relacionadas",
            "eval":     "Cómo evaluar",
            "eval_tec": "Técnicas de evaluación",
            "eval_ins": "Evidencias observables",
            "eval_her": "Instrumentos",
            "eval_dim": "Dimensiones",
        },
    },
    "ca": {
        "output": "metac-ca.md",
        "title": "Metodologies Actives per a l'Aula",
        "subtitle": "Catàleg de tècniques, rutines i metodologies d'aprenentatge actiu amb orientacions per a la seva avaluació.",
        "toc": "Índex per àmbits",
        "intro": (
            "Aquest catàleg recull metodologies d'aprenentatge actiu organitzades per àmbits pedagògics. "
            "Cada tècnica inclou descripció, recursos, relacions amb altres metodologies i orientacions sobre "
            "com avaluar-la mitjançant tècniques, evidències observables, instruments i dimensions d'avaluació.\n\n"
            "Les relacions entre tècniques i entitats d'avaluació són orientatives i no exhaustives: "
            "una mateixa tècnica es pot avaluar de formes molt diverses segons el context i la finalitat docent."
        ),
        "labels": {
            "block":    "Bloc",
            "fields":   "Àmbits",
            "tags":     "Paraules clau",
            "programs": "Recursos",
            "related":  "Tècniques relacionades",
            "eval":     "Com avaluar",
            "eval_tec": "Tècniques d'avaluació",
            "eval_ins": "Evidències observables",
            "eval_her": "Instruments",
            "eval_dim": "Dimensions",
        },
    },
    "en": {
        "output": "metac-en.md",
        "title": "Active Learning Methodologies for the Classroom",
        "subtitle": "Catalogue of active-learning techniques, routines and methodologies with assessment guidance.",
        "toc": "Contents by field",
        "intro": (
            "This catalogue brings together active-learning methodologies organised by pedagogical field. "
            "Each technique includes a description, resources, links to related methodologies and guidance on "
            "how to assess it using evaluation techniques, observable evidence, instruments and assessment dimensions.\n\n"
            "The links between techniques and evaluation entities are indicative and non-exhaustive: "
            "any given technique can be assessed in many different ways depending on context and teaching purpose."
        ),
        "labels": {
            "block":    "Block",
            "fields":   "Fields",
            "tags":     "Keywords",
            "programs": "Resources",
            "related":  "Related techniques",
            "eval":     "How to assess",
            "eval_tec": "Evaluation techniques",
            "eval_ins": "Observable evidence",
            "eval_her": "Instruments",
            "eval_dim": "Dimensions",
        },
    },
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def load_json(lang, filename):
    path = os.path.join(BASE_DIR, "data", lang, filename)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def slug(text):
    value = text.lower().strip()
    value = re.sub(r"[àáâãäå]", "a", value)
    value = re.sub(r"[èéêë]",   "e", value)
    value = re.sub(r"[ìíîï]",   "i", value)
    value = re.sub(r"[òóôõö]",  "o", value)
    value = re.sub(r"[ùúûü]",   "u", value)
    value = re.sub(r"[ñ]",      "n", value)
    value = re.sub(r"[ç]",      "c", value)
    value = value.replace(" ", "-")
    return re.sub(r"[^\w\-]", "", value)


def fmt_desc(raw):
    """Converts metac markdown-lite to standard Markdown."""
    lines = raw.strip().split("\n")
    out = []
    for line in lines:
        # ## Heading → #### (nested under technique heading)
        if line.startswith("## "):
            out.append("#### " + line[3:])
        # ALL-CAPS label at start: "LABEL:" → "**LABEL:**"
        elif re.match(r'^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s]{2,}:', line):
            out.append(re.sub(r'^([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s]{2,}:)', r'**\1**', line))
        else:
            out.append(line)
    return "\n".join(out)


def field_line(label, value):
    if not value:
        return ""
    return f"**{label}:** {value}\n"


# ── Technique block ────────────────────────────────────────────────────────────

def technique_block(n, item, labels, by_id, eval_names):
    lines = []

    # Heading
    lines.append(f"### {n}. {item['name']} `{item['id']}`\n")

    # Summary
    if item.get("summary"):
        lines.append(f"_{item['summary']}_\n")

    # Metadata row
    meta_parts = []
    if item.get("block"):
        meta_parts.append(f"**{labels['block']}:** {item['block']}")
    if item.get("fields"):
        meta_parts.append(f"**{labels['fields']}:** {', '.join(item['fields'])}")
    if meta_parts:
        lines.append(" · ".join(meta_parts) + "\n")

    # Tags
    if item.get("tags"):
        lines.append(f"_{labels['tags']}: {', '.join(item['tags'])}_\n")

    # Description
    if item.get("desc"):
        lines.append(fmt_desc(item["desc"]) + "\n")

    # Programs / resources
    if item.get("programs"):
        prog_links = [f"[{p['label']}]({p['url']})" if p.get("url") else p["label"]
                      for p in item["programs"]]
        lines.append(field_line(labels["programs"], " · ".join(prog_links)))

    # Related techniques
    if item.get("related"):
        related_names = [by_id[rid]["name"] for rid in item["related"] if rid in by_id]
        if related_names:
            lines.append(field_line(labels["related"], ", ".join(related_names)))

    # Eval cross-references grouped by type
    if item.get("eval_ids") and eval_names:
        groups = {
            "eval_tec": [],
            "eval_ins": [],
            "eval_her": [],
            "eval_dim": [],
        }
        prefix_map = {"TEC": "eval_tec", "INS": "eval_ins", "HER": "eval_her", "DIM": "eval_dim"}
        for eid in item["eval_ids"]:
            prefix = eid.split("_")[0]
            key = prefix_map.get(prefix)
            if key and eid in eval_names:
                groups[key].append(eval_names[eid])
        eval_parts = []
        for key in ("eval_tec", "eval_ins", "eval_her", "eval_dim"):
            if groups[key]:
                eval_parts.append(f"*{labels[key]}:* {', '.join(groups[key])}")
        if eval_parts:
            lines.append(f"**{labels['eval']}:**\n")
            for part in eval_parts:
                lines.append(f"- {part}\n")

    lines.append("---\n")
    return "\n".join(l for l in lines if l) + "\n"


# ── Group techniques by field ──────────────────────────────────────────────────

def group_by_field(techniques):
    """Returns OrderedDict: field_name → [technique, ...]"""
    from collections import OrderedDict
    groups = OrderedDict()
    for t in techniques:
        fields = t.get("fields") or ["Sin ámbito"]
        primary = fields[0]
        groups.setdefault(primary, []).append(t)
    return groups


# ── Document header ────────────────────────────────────────────────────────────

def doc_header(cfg, groups):
    toc_lines = []
    for i, field_name in enumerate(groups.keys(), 1):
        toc_lines.append(f"{i}. [{field_name}](#{slug(field_name)})")
    toc = "\n".join(toc_lines)

    return f"""# {cfg['title']}

> {cfg['subtitle']}

## {cfg['toc']}

{toc}

---

{cfg['intro']}

"""


# ── Generate one language ──────────────────────────────────────────────────────

def generate(lang, cfg):
    techniques  = load_json(lang, "metac.json")

    # Build lookup dicts
    by_id = {t["id"]: t for t in techniques}

    # Eval entity names (all 4 types)
    eval_names = {}
    for entity_file, name_key in [
        ("tecnicas.json",    "name"),
        ("instrumentos.json","name"),
        ("herramientas.json","name"),
        ("dimensiones.json", "name"),
    ]:
        try:
            for e in load_json(lang, entity_file):
                eval_names[e["id"]] = e[name_key]
        except FileNotFoundError:
            pass

    labels = cfg["labels"]
    groups = group_by_field(techniques)

    out = [doc_header(cfg, groups)]

    for field_name, items in groups.items():
        out.append(f"## {field_name}\n\n")
        for n, item in enumerate(items, 1):
            out.append(technique_block(n, item, labels, by_id, eval_names))

    content = "\n".join(out).rstrip() + "\n"
    output_path = os.path.join(BASE_DIR, cfg["output"])
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    total_fields = len(groups)
    print(f"[{lang}] → {cfg['output']}")
    print(f"  Técnicas: {len(techniques)}  |  Ámbitos: {total_fields}  |  "
          f"Con eval_ids: {sum(1 for t in techniques if t.get('eval_ids'))}")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    for lang, cfg in LANGS.items():
        generate(lang, cfg)


if __name__ == "__main__":
    main()
