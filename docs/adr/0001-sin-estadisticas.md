# 1. Metaceval no recoge estadísticas de uso

Fecha: 2026-10-30 · Estado: aceptado

## Contexto

Desde su creación, en mayo de 2026, Metaceval heredó de Metac un contador de visitas propio en bilateria.org (`track.php`), cargado por JSONP desde `src/analytics.js` y configurado con etiquetas `meta` en `index.html`. Con cada visita iban la dirección de la página, la página de procedencia y los parámetros UTM. No usaba cookies ni guardaba la IP; solo dejaba en `localStorage` la hora de la última visita para no contarla dos veces en media hora. La web no tenía ningún aviso que lo explicara.

La evaluación con la rúbrica VCER de la guía «Vibe coding responsable» puntúa con 0 el punto de datos personales si el recurso lleva analítica, sea propia o ajena. Además, la página de procedencia puede delatar el aula virtual desde la que se abre, y la dirección de la página incluye las fichas que se consultan o se comparten.

## Decisión

En la versión 1.1.2 se retira toda la analítica: el archivo `src/analytics.js`, su carga en `index.html` y las etiquetas `meta` del contador. La única conexión externa que queda es la descarga de la biblioteca JSZip desde jsDelivr, y solo al exportar una ficha a DOCX.

## Alternativas descartadas

- **Mantener el contador propio y añadir un aviso de privacidad.** Aunque no usaba cookies ni guardaba la IP, seguía enviando la dirección de la página y la de procedencia, y la rúbrica VCER puntúa con 0 cualquier analítica.

## Consecuencias

- Ya no hay cifras de uso de Metaceval.
- Los datos del contador siguen en el alojamiento de IONOS (`/app/estadistica/metaceval/`) y en el panel central de estadísticas. Se archivan y se borran del servidor en una tarea aparte.
- Quien ya visitó la web conserva en su navegador la clave `analytics:last-visit:metaceval`, que ya no se lee ni se envía.
