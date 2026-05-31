# Metaceval

Aplicación web estática para explorar técnicas y metodologías activas junto con su capa de evaluación: técnicas de evaluación, evidencias observables, instrumentos y dimensiones.

## Funcionalidades principales

- Exploración de técnicas y metodologías activas por bloques y ámbitos.
- Vista de evaluación con técnicas de evaluación, evidencias, instrumentos y dimensiones.
- Mapas de relaciones para técnicas, evaluación y mapa unificado.
- Filtros globales en evaluación por modalidad, lugar, agrupamiento y resistencia IA.
- Control para mostrar u ocultar relaciones ocasionales en los mapas de evaluación.
- Control para mostrar u ocultar categorías del grafo de evaluación.
- Exportación de fichas a Markdown en técnicas activas y evaluación.
- Favoritos, categorías, selección múltiple y enlaces compartibles por URL.

## Ejecutar en local

```bash
python3 -m http.server 8000
```

Abrir `http://localhost:8000`.

## Estructura actual

```text
index.html
css/
  styles.css
src/
  data.js
  i18n.js
  shell.js
  ui-tecnicas.js
  evaluacion.js
  favoritos.js
  metac-map.js
  eval-map.js
  unified-map.js
  init.js
  analytics.js
data/
  es/
  ca/
  en/
```

## Responsabilidad de cada módulo

- `src/data.js`: configuración, estado global, carga de datos, utilidades compartidas, exportación, taxonomías y almacenamiento local.
- `src/i18n.js`: diccionarios, `i()`, `toast()` y `applyI18N()`.
- `src/shell.js`: banner compartido, cambio de idioma y gestión de tema.
- `src/ui-tecnicas.js`: home, navegación principal, filtros, tarjetas y modal de técnicas.
- `src/evaluacion.js`: vista de evaluación, tarjetas, split view, filtros globales y modal de entidades de evaluación.
- `src/favoritos.js`: favoritos, categorías y panel lateral.
- `src/metac-map.js`: mapa de técnicas/metodologías.
- `src/eval-map.js`: mapa de evaluación, relaciones ocasionales y visibilidad por categorías.
- `src/unified-map.js`: mapa unificado entre técnicas y evaluación.
- `src/init.js`: arranque, lectura de URL y cableado de eventos.
- `src/analytics.js`: telemetría no bloqueante.

## Orden de carga en `index.html`

Los scripts se cargan sin bundler y comparten globals. El orden importa:

1. `data.js`
2. `i18n.js`
3. `shell.js`
4. `ui-tecnicas.js`
5. `evaluacion.js`
6. `favoritos.js`
7. `metac-map.js`
8. `eval-map.js`
9. `unified-map.js`
10. `init.js`
11. `analytics.js`

## Criterio para seguir refactorizando

Los siguientes pasos deberían mantener este criterio:

- no introducir build step;
- no cambiar comportamiento visible salvo que el objetivo sea funcional;
- mover primero por dominios, no por tamaño;
- reducir dependencias cruzadas antes de portar nuevas funciones desde `evalmap`.

## Notas de uso

- La aplicación sigue siendo estática y sin dependencias externas de frontend.
- Los scripts comparten estado global, así que el orden de carga en `index.html` sigue siendo parte del contrato técnico.
- La exportación Markdown descarga ficheros `.md` directamente desde el modal compartido.
