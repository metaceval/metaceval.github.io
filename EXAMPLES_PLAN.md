# Plan de ejemplos para entidades de evaluación

Este documento describe el plan completo para crear los archivos HTML de ejemplo
que se muestran en el modal de cada entidad de evaluación de Metac.

---

## Estado actual

| Categoría | Total | Hechos | Pendientes |
|---|---|---|---|
| `instrumentos.json` (HER_*) | 62 | 13 | 49 |
| `tecnicas.json` (TEC_*) | 12 | 0 | 12 |
| `evidencias.json` (INS_*) | 88 | 0 | 88 |
| `dimensiones.json` (DIM_*) | 25 | 0 | 25 |
| **Total** | **187** | **13** | **174** |

Ejemplos ya completados (en `examples/es|ca|en/`):
`HER_RUB_ANA`, `HER_RUB_HOL`, `HER_RUB_PROC`, `HER_RUB_PROD`,
`HER_RUB_ORAL`, `HER_RUB_COOP`, `HER_RUB_COMP`,
`HER_LISTA`, `HER_ESC_OBS`, `HER_DIANA`, `HER_SEMAFORO`,
`HER_ESCAL_FB`, `HER_BASE_ORIENT`

---

## Arquitectura técnica

### Dónde van los archivos

```
examples/
  es/{ID}.html    ← versión en español
  ca/{ID}.html    ← versión en catalán
  en/{ID}.html    ← versión en inglés
```

El sistema carga el archivo del idioma activo y, si no existe, usa el fallback `es`.

### Formato de los archivos HTML

Los archivos son **fragmentos HTML** (sin `<html>`, `<head>` ni `<body>`).
Se inyectan directamente en el modal mediante `innerHTML`.

**Clases CSS disponibles** (ya definidas en el proyecto):
- `desc-table` — tabla con cabecera destacada, filas alternadas, bordes sutiles
- Estilos inline para colores, tamaños, márgenes

**Estructura recomendada** para cada archivo:

```html
<p>Frase introductoria: instrumento, actividad de ejemplo, nivel/curso.</p>

<table class="desc-table">
  <thead>…</thead>
  <tbody>…</tbody>
</table>

<p style="font-size:.82rem;color:#475569;margin-top:8px">
  Nota o clave de uso al pie.
</p>
```

### Convenciones de contenido

- **Contexto real**: siempre se nombra la materia, la actividad concreta y el curso.
  Ejemplo: *"Rúbrica para evaluar un debate en 3.º de ESO"*, no genérico.
- **Ejemplo cumplimentado**: la tabla muestra datos ya rellenados (marcas ✓, comentarios, niveles),
  no una plantilla vacía. El lector ve cómo queda en uso real.
- **Nota al pie**: una o dos frases explicando la clave de uso o cómo complementar este instrumento.
- **Sin repetir el nombre del instrumento en el `<p>` inicial**: la UI ya muestra la etiqueta "Ejemplo".
- **Longitud**: entre 1 y 3 tablas o secciones. No exceder lo que cabe en el panel sin scroll excesivo.
- **Idioma**: cada archivo está completamente en su idioma (es/ca/en). Las tablas, comentarios
  y notas al pie también están traducidos. No mezclar.

### Semáforo de imágenes

Algunos instrumentos requieren imagen SVG o PNG en lugar de tabla HTML.
Estos se marcan como **DEFER** y se abordan en una fase separada:

| ID | Motivo |
|---|---|
| `HER_PERFIL_LOGRO` | Gráfico de radar/araña |
| `HER_PANEL` | Dashboard de progreso |
| `HER_ANALITICAS` | Gráficos de distribución |
| `HER_SOCIO` | Diagrama de red (sociograma) |

Las imágenes irían en `examples/{lang}/{ID}_img.png` referenciadas con ruta relativa.

---

## Bloques de trabajo para HER_* (instrumentos)

Prioridad alta — son los más usados en el aula y los que más se benefician del ejemplo.

### Bloque 1 — Escalas (6 items)

| ID | Nombre |
|---|---|
| `HER_ESC_VAL` | Escala de valoración |
| `HER_ESC_DESC` | Escala descriptiva |
| `HER_ESC_NUM` | Escala numérica |
| `HER_ESC_VERB` | Escala verbal |
| `HER_ESC_AUTO` | Escala de autoevaluación |
| `HER_ESC_PROG` | Escala de progreso |

**Formato típico**: tabla con indicadores en filas y niveles en columnas (Siempre/A veces/Nunca,
o 1/2/3/4, o descriptores). Similar a `HER_ESC_OBS` ya hecho.

Variante HER_ESC_NUM/VERB: una sola fila por criterio con la escala marcada.

---

### Bloque 2 — Registros (5 items)

| ID | Nombre |
|---|---|
| `HER_REG_ANE` | Registro anecdótico |
| `HER_REG_DESC` | Registro descriptivo |
| `HER_REG_PART` | Registro de participación |
| `HER_REG_COOP` | Registro de trabajo cooperativo |
| `HER_NOTAS_CAMPO` | Notas de campo |

**Formato típico**: tabla con columnas Alumno / Fecha / Situación observada / Valoración.
El registro anecdótico y las notas de campo son más narrativos (tarjeta con fecha + texto libre).

---

### Bloque 3 — Hojas de seguimiento (3 items)

| ID | Nombre |
|---|---|
| `HER_HOJA_IND` | Hoja de seguimiento individual |
| `HER_HOJA_GRUP` | Hoja de seguimiento grupal |
| `HER_DIARIO_PROF` | Diario del profesor |

**Formato típico**:
- HER_HOJA_IND/GRUP: tabla con alumnos/grupos en filas, criterios o fechas en columnas.
- HER_DIARIO_PROF: entrada narrativa con fecha, lo observado y la decisión docente que se toma.

---

### Bloque 4 — Guías y plantillas de corrección (4 items)

| ID | Nombre |
|---|---|
| `HER_GUIA_CORR` | Guía de corrección |
| `HER_GUIA_OBS` | Guía de observación |
| `HER_PLANT_CORR` | Plantilla de corrección |
| `HER_BAREMO` | Baremo |

**Formato típico**:
- Guía de corrección: criterio + descripción de qué se considera correcto + puntuación.
- Baremo: tabla con apartados, puntuación máxima y puntuación obtenida.

---

### Bloque 5 — Fichas de retroalimentación y coevaluación (4 items)

| ID | Nombre |
|---|---|
| `HER_FICHA_RETRO` | Ficha de retroalimentación |
| `HER_PLANT_FF` | Plantilla de feedback/feedforward |
| `HER_FICHA_COEV` | Ficha de coevaluación |
| `HER_FICHA_VAL` | Ficha de valoración |

**Formato típico**: estructura de 2-3 secciones (Lo que funciona / Lo que mejorar / Propuesta).
HER_PLANT_FF tiene dos columnas: feedback (lo que ya hiciste) y feedforward (lo que puedes hacer).

---

### Bloque 6 — Auto y coevaluación (3 items)

| ID | Nombre |
|---|---|
| `HER_RUB_AUTO` | Rúbrica de autoevaluación |
| `HER_RUB_COEV` | Rúbrica de coevaluación |
| `HER_LISTA_AUTO` | Lista de cotejo de autoevaluación |

**Formato típico**: igual que las rúbricas analíticas ya hechas, pero la voz cambia
(primera persona para auto, segunda persona para co). Se indica quién la cumplimenta.

---

### Bloque 7 — Matrices y catálogos (4 items)

| ID | Nombre |
|---|---|
| `HER_MATRIZ` | Matriz de valoración |
| `HER_MATRIZ_POND` | Matriz de ponderación |
| `HER_BANCO_DESC` | Banco de descriptores |
| `HER_IND_CRIT` | Lista de indicadores por criterio |

**Formato típico**:
- HER_MATRIZ: similar a una rúbrica pero sin niveles, con criterios y puntuaciones directas.
- HER_MATRIZ_POND: tabla con criterios, peso (%) y puntuación ponderada.
- HER_BANCO_DESC: lista de descriptores agrupados por criterio.
- HER_IND_CRIT: tabla criterio → lista de indicadores observables.

---

### Bloque 8 — Herramientas de calificación (4 items)

| ID | Nombre |
|---|---|
| `HER_CUAD_CAL` | Cuaderno de calificaciones |
| `HER_TAB_CRIT` | Tabla de calificación por criterios |
| `HER_CONV` | Conversor de niveles a calificación |
| `HER_HOJA_CALC` | Hoja de cálculo de evaluación |

**Formato típico**:
- HER_TAB_CRIT: tabla con criterios, peso y nota; fila de totales ponderados.
- HER_CONV: tabla de equivalencias nivel descriptor ↔ nota numérica.
- HER_CUAD_CAL y HER_HOJA_CALC: fragmento de tabla con alumnos, instrumentos y nota final.

---

### Bloque 9 — Actas e informes (3 items)

| ID | Nombre |
|---|---|
| `HER_ACTA` | Acta de evaluación |
| `HER_INF_IND` | Informe individual de evaluación |
| `HER_TAB_ESPEC` | Tabla de especificaciones |

**Formato típico**:
- HER_ACTA: tabla formal con alumno, instrumento, calificación y firma.
- HER_INF_IND: informe narrativo estructurado por competencias.
- HER_TAB_ESPEC: tabla que relaciona objetivos, contenidos y tipos de ítems de una prueba.

---

### Bloque 10 — Herramientas digitales (4 items)

| ID | Nombre |
|---|---|
| `HER_FORM_DIG` | Formulario digital |
| `HER_RUB_DIG` | Rúbrica digital |
| `HER_HIST_REV` | Historial de revisión |
| `HER_BANCO_EVID` | Banco digital de evidencias |

**Formato típico**:
- HER_FORM_DIG: muestra las preguntas de un formulario Google con respuestas de ejemplo.
- HER_RUB_DIG: igual que una rúbrica analítica pero mencionando la herramienta digital.
- HER_HIST_REV: tabla de versiones con fecha, cambios y valoración.
- HER_BANCO_EVID: tabla de evidencias indexadas con criterio, fecha y enlace.

---

### Bloque 11 — Formatos especiales (3 items)

| ID | Nombre |
|---|---|
| `HER_RUB_PUNTO` | Rúbrica de punto único |
| `HER_MAP_EVID` | Mapa de evidencias por criterio |
| `HER_REG_COMP` | Registro de compromisos de mejora |

**Formato típico**:
- HER_RUB_PUNTO: tabla de 3 columnas (Por debajo del estándar | Estándar | Por encima del estándar) con solo la columna central rellena.
- HER_MAP_EVID: tabla criterio × evidencia con celdas marcadas.
- HER_REG_COMP: tabla alumno + compromiso + fecha + seguimiento.

---

### Bloque 12 — Contratos y declaraciones (2 items)

| ID | Nombre |
|---|---|
| `HER_CONTR_GRUP` | Contrato de grupo |
| `HER_DECL_IA` | Declaración de uso de IA y fuentes |

**Formato típico**: documento tipo formulario con secciones de texto libre firmadas.

---

### DEFER — Requieren imagen (4 items)

| ID | Nombre | Motivo |
|---|---|---|
| `HER_PERFIL_LOGRO` | Perfil de logro | Gráfico de radar/araña |
| `HER_PANEL` | Panel de progreso | Dashboard con barras/indicadores |
| `HER_ANALITICAS` | Analíticas de aprendizaje | Gráficos estadísticos |
| `HER_SOCIO` | Sociograma | Diagrama de red |

---

## Bloques de trabajo para TEC_* (técnicas de evaluación)

12 items en total. Estos describen **cómo** se recoge la evidencia, no el instrumento.
El ejemplo debe mostrar la técnica en acción: qué hace el docente, cómo se registra.

**Formato típico**: párrafo de contexto + tabla con columnas como
"Momento", "Acción del docente", "Instrumento de registro", "Decisión".

| Bloque | IDs |
|---|---|
| Observación | `TEC_OBS_SIS`, `TEC_OBS_INC` |
| Análisis de productos | `TEC_PROD`, `TEC_PROC_REFLEX`, `TEC_ANAL_DOC` |
| Intercambios orales | `TEC_ORAL`, `TEC_ENTREV_EVAL`, `TEC_SONDEO` |
| Pruebas y cuestionarios | `TEC_PRUEBA`, `TEC_ENC_CUEST` |
| Avanzadas | `TEC_INTER_DIG`, `TEC_TRIANG` |

---

## Bloques de trabajo para INS_* (evidencias)

88 items. Estas son **tipos de evidencia** (el producto que genera el alumno).
El ejemplo es más breve que para los instrumentos: muestra el contexto de uso
y los principales aspectos a valorar al evaluarla.

**Formato típico**: párrafo de contexto + tabla de 2 columnas
(Aspecto a valorar | Indicador concreto). No hace falta una rúbrica completa.

| Bloque | IDs (aproximados) |
|---|---|
| Evidencias orales (8) | INS_EXPO, INS_DEBATE, INS_COLOQ, INS_ASAM, INS_PR_ORAL, INS_ENTREV, INS_PREG_ORAL, INS_SEMINARIO |
| Lab/prácticas (6) | INS_LAB, INS_INFO_LAB, INS_TALLER, INS_SIM, INS_PR_PRACT, INS_CHECK_LAB |
| Textos escritos (8) | INS_ENSAYO, INS_COM_TEXT, INS_RESUMEN, INS_MONO, INS_INFO_INV, INS_ART_DIV, INS_RESEÑA, INS_COM_GRAF |
| Productos digitales (11) | INS_INFOG, INS_VIDEO, INS_PODCAST, INS_COMIC, INS_POSTER, INS_WEB, INS_BLOG, INS_PRESENT_DIG, INS_TUTORIAL, INS_MICROVIDEO, INS_STORYBOARD |
| Trabajo colaborativo (5) | INS_TRAB_COOP, INS_DOC_COL, INS_PORT_DIG, INS_EPORT_SEL, INS_FORO |
| Reflexivos/metacognitivos (8) | INS_DIARIO, INS_PORT, INS_CUADERNO, INS_BIT, INS_F_REFLEX, INS_AUTOINF, INS_CUAD_DIG, INS_BIT_IA |
| Proyectos y casos (7) | INS_CASO, INS_MEM_PROY, INS_PLAN_TRAB, INS_PROTOTIPO, INS_MAQUETA, INS_MODELO_DIG, INS_SIT_PROB |
| Formativos rápidos (8) | INS_2E1D, INS_SEMAF, INS_BILLETE, INS_TARJ_RESP, INS_REV_PARES, INS_KPSI, INS_BORR, INS_ENT_PAR |
| Pruebas formales (9) | INS_PR_DES, INS_PR_OBJ, INS_TEST, INS_RESP_CORTA, INS_PR_COMP, INS_DOCS, INS_CUEST_DIG, INS_LIBRO_ABIERTO, INS_PROB |
| Otros (18) | INS_TRAB_IND, INS_PART, INS_ROL, INS_DRAMA, INS_DEF_PROY, INS_MAP_CONC, INS_MAP_MENT, INS_ESQUEMA, INS_LINEA, INS_GLOS, INS_FICHA_LECT, INS_ACTA, INS_CONTRATO, INS_MAP_INI, INS_LLUVIA, INS_TAREA_COMP_INT, INS_ESCAPE, INS_CUAD_CAMPO |
| + INS_MICROVIDEO, INS_BIT_IA, INS_TARJ_RESP, INS_STORYBOARD | (ya en bloques anteriores) |

---

## Bloques de trabajo para DIM_* (dimensiones)

25 items. Son enfoques o dimensiones de la evaluación (quién evalúa, cuándo, con qué finalidad).
El ejemplo muestra cómo se concreta esa dimensión en una situación de aula.

**Formato típico**: párrafo de contexto + tabla de 2-3 columnas mostrando
cómo se diseña o aplica la evaluación teniendo en cuenta esa dimensión.

| Bloque | IDs |
|---|---|
| Agente evaluador (3) | DIM_AUTO, DIM_COEV, DIM_HET |
| Finalidad (3) | DIM_DIAG, DIM_FORM, DIM_SUM |
| Enfoque metodológico (5) | DIM_COMP, DIM_DESEMP, DIM_PROY, DIM_INDAG, DIM_PROB |
| Contexto y tipo (4) | DIM_CASO, DIM_SIM, DIM_DIG, DIM_CRIT |
| Equidad e inclusión (2) | DIM_INCL, DIM_CONT |
| Retroalimentación y calificación (3) | DIM_FEED, DIM_CAL_ACRED, DIM_COMPART |
| Emergentes (5) | DIM_GAMIF, DIM_TRAZ_IA, DIM_IPSA, DIM_NORM, DIM_DINAM |

---

## Orden de prioridad recomendado

1. **HER_* bloques 1–6** (escalas, registros, hojas, guías, fichas, auto/coev) — uso más frecuente en el aula
2. **TEC_*** — 12 items, describen técnicas de evaluación fundamentales
3. **HER_* bloques 7–12** (matrices, calificación, actas, digital, especiales)
4. **INS_*** por bloques, empezando por orales, textos y proyectos
5. **DIM_*** — más conceptuales, último en abordar
6. **HER_* DEFER** (imagen) — fase separada cuando se decida el sistema de imágenes

---

## Cómo verificar qué está hecho

```bash
python3 - <<'EOF'
import json, os
done = set(f.replace('.html','') for f in os.listdir('examples/es') if f.endswith('.html'))
for fname in ['instrumentos.json','tecnicas.json','evidencias.json','dimensiones.json']:
    data = json.load(open(f'data/es/{fname}'))
    pending = [x['id'] for x in data if x['id'] not in done]
    print(f'{fname}: {len(pending)} pendientes → {pending[:5]}...')
EOF
```

---

## Referencia: ejemplos ya hechos (como guía de estilo)

Ver cualquiera de estos archivos como referencia de formato y tono:
- `examples/es/HER_RUB_ANA.html` — rúbrica analítica
- `examples/es/HER_LISTA.html` — lista de cotejo
- `examples/es/HER_SEMAFORO.html` — semáforo (con CSS de colores, sin imagen)
- `examples/es/HER_ESCAL_FB.html` — escalera (tabla vertical con pasos)
- `examples/es/HER_DIANA.html` — diana (SVG inline)
