# Plan de ejemplos para entidades de evaluación

Este documento describe el plan completo para crear los archivos HTML de ejemplo
que se muestran en el modal de cada entidad de evaluación de Metac.

---

## Estado actual

| Categoría | Total | Hechos | Pendientes |
|---|---|---|---|
| `instrumentos.json` (HER_*) | 62 | 58 | 4 (DEFER, requieren imagen) |
| `tecnicas.json` (TEC_*) | 12 | 12 | 0 ✅ |
| `evidencias.json` (INS_*) | 88 | — | No aplica (ver nota) |
| `dimensiones.json` (DIM_*) | 25 | 0 | 25 |

> **Nota INS_*:** Las evidencias son productos del alumno (ensayo, debate, vídeo…).
> Un ejemplo de la evidencia sería un fragmento del producto real, no una lista de criterios.
> Como no se crearán ejemplos de este tipo, las entidades INS_* no tienen sección de ejemplo.

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

<p style="font-size:.82rem;color:#475569;margin-top:8px;background:#fef9c3;border-left:3px solid #ca8a04;padding:4px 8px;border-radius:3px">
  Alumno/Grupo: … | Actividad: … | Fecha: …
  Observación o comentario breve.
</p>
```

### Convención visual: plantilla vs. dato introducido

**Regla única:** todo dato que el evaluador escribe o marca al usar el instrumento lleva fondo amarillo `#fef9c3`.

| Elemento | Trata como | Estilo |
|---|---|---|
| Texto de criterios, descriptores, pasos | Plantilla | Sin fondo (blanco) |
| ✓ / ✗ marcados en una celda | Dato introducido | `background:#fef9c3` en el `<td>` |
| Puntuación obtenida (columna numérica) | Dato introducido | `background:#fef9c3` en el `<td>` |
| Nivel seleccionado en escala descriptiva | Dato introducido | `background:#fef9c3;font-weight:600` en el `<td>` |
| Comentario del docente en celda libre | Dato introducido | `background:#fef9c3` en el `<td>` |
| Párrafo del pie (alumno, fecha, observación) | Dato introducido | `background:#fef9c3;border-left:3px solid #ca8a04;padding:4px 8px;border-radius:3px` |
| Fila de totales / puntuación final | Dato introducido | `background:#fef9c3;font-weight:600` |

**Celdas que nunca llevan amarillo:** cabeceras (`<th>`), descriptores de nivel en escalas (son plantilla), etiquetas de pasos o criterios.

**Aplicación en rúbricas analíticas:** marcar con amarillo la celda seleccionada para cada criterio y añadir pie con datos del alumno. Si el instrumento es una plantilla pura (sin ejemplo rellenado), no incluir amarillo — añadir en su lugar un pie con `color:#475569` que explique cómo se usa.

### Separación de datos rellenados y notas de uso

El párrafo de pie puede contener dos tipos de contenido que **deben ir en elementos separados**:

```html
<!-- Datos del evaluador (amarillo) -->
<p style="font-size:.82rem;color:#475569;margin-top:8px;background:#fef9c3;border-left:3px solid #ca8a04;padding:4px 8px;border-radius:3px">
  <strong>Alumno:</strong> … | <strong>Actividad:</strong> … | <strong>Fecha:</strong> …<br>
  Observación concreta sobre este alumno o grupo.
</p>

<!-- Nota de uso del instrumento (NO amarillo) -->
<p style="font-size:.82rem;color:#475569;margin-top:4px">
  Frase genérica sobre cómo usar el instrumento o qué aporta.
</p>
```

**Regla:** si la frase se puede copiar a cualquier ejemplo del mismo instrumento sin cambiar nada, es una nota de uso → no lleva amarillo.

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

## INS_* (evidencias) — Sin ejemplos

Las evidencias son **productos que genera el alumno** (ensayo, debate, vídeo, informe…).
Un ejemplo real sería un fragmento del producto del alumno, lo cual no se puede
generar de forma genérica con utilidad pedagógica real.

**Decisión:** no se crean archivos de ejemplo para entidades INS_*.
Las entidades INS_* muestran solo su descripción en el modal, sin sección de ejemplo.

---

## DIM_* (dimensiones) — Sin ejemplos

Las dimensiones son **conceptos abstractos de evaluación** (quién evalúa, cuándo, con qué finalidad).
Un ejemplo de una dimensión sería una descripción de cómo se aplica en el aula — útil,
pero no ES la dimensión en sí: es una aplicación contextualizada de ella.
El mismo problema que INS_*: lo que se crearía no sería un ejemplo de la cosa, sino otra cosa.

**Decisión:** no se crean archivos de ejemplo para entidades DIM_*.
Las entidades DIM_* muestran solo su descripción en el modal, sin sección de ejemplo.

---

## Orden de prioridad recomendado

1. **HER_*** ✅ 58/62 completados (4 DEFER requieren imagen — fase separada)
2. **TEC_*** ✅ 12/12 completados
3. **INS_*** — sin ejemplos (ver nota)
4. **DIM_*** — sin ejemplos (ver nota)
5. **HER_* DEFER** — pendiente cuando se decida el sistema de imágenes

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
