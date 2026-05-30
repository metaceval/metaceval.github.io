# Metac — Recursos metodológicos para el aula

**Metac** es un repertorio web de recursos metodológicos pensado para ayudar al profesorado a encontrar, consultar, guardar, relacionar y compartir propuestas útiles para la práctica docente.

No se limita a las metodologías activas. Incluye metodologías, técnicas, rutinas de pensamiento, estrategias cooperativas, dinámicas de comunicación, recursos para la evaluación, propuestas metacognitivas y programas de apoyo aplicables en distintos momentos del proceso de enseñanza y aprendizaje.

🌐 **[metact.github.io](https://metact.github.io)**

---

## Finalidad

Metac nace para facilitar una tarea habitual del profesorado: encontrar el recurso metodológico más adecuado para una necesidad concreta del aula.

Puede utilizarse para:

* Activar conocimientos previos.
* Favorecer la participación del alumnado.
* Organizar el trabajo cooperativo.
* Promover el pensamiento crítico y creativo.
* Mejorar la comunicación y la argumentación.
* Estructurar actividades de análisis y reflexión.
* Acompañar procesos de evaluación formativa.
* Fomentar la metacognición.
* Localizar programas de apoyo vinculados a determinados recursos.

Metac no ofrece recetas cerradas. Su propósito es ayudar a seleccionar, adaptar y combinar recursos metodológicos según el grupo, la materia, los objetivos de aprendizaje y el contexto educativo.

---

## Características

* **Más de 100 recursos metodológicos** descritos de forma clara y sintética.
* **Búsqueda** por nombre, descripción y etiquetas.
* **Filtrado por ámbitos pedagógicos**.
* **Etiquetas** para localizar recursos relacionados.
* **Favoritos** con categorías personalizables y persistentes en el navegador.
* **Compartición** de selecciones y colecciones mediante URL.
* **Referencias cruzadas** entre recursos relacionados.
* **Programas de apoyo** asociados a recursos concretos cuando existe una aplicación directa.
* **Asistente de IA** basado en NotebookLM para consultar dudas sobre los recursos.
* **Multilingüe**, con versiones en distintos idiomas.
* **Diseño adaptable** para móvil, tableta y escritorio.

---

## Tipos de recursos incluidos

Metac reúne recursos de naturaleza diversa, entre ellos:

* Metodologías y enfoques didácticos.
* Técnicas cooperativas.
* Rutinas y destrezas de pensamiento.
* Estrategias de evaluación y retroalimentación.
* Dinámicas de comunicación y debate.
* Propuestas para la creatividad.
* Recursos para organizar información.
* Actividades de reflexión y metacognición.
* Programas de apoyo vinculados a técnicas concretas.

Esta diversidad permite buscar recursos no solo por su nombre, sino también por la intención educativa que se desea trabajar.

---

## Uso educativo

Metac puede ser útil para:

* Diseñar actividades de aula.
* Preparar situaciones de aprendizaje.
* Ampliar el repertorio metodológico del profesorado.
* Seleccionar técnicas para una sesión concreta.
* Comparar recursos similares.
* Compartir propuestas con otros docentes.
* Crear colecciones personales o de departamento.
* Apoyar procesos de formación docente.

Cada recurso debe adaptarse al contexto. La herramienta facilita la búsqueda y la organización, pero la decisión pedagógica corresponde siempre al profesorado.

---

## Tecnología

Metac es una aplicación web de página única (`index.html`), sin dependencias externas, sin proceso de compilación y sin framework.

Todo el HTML, CSS y JavaScript está integrado en un único archivo.

Los datos se cargan desde Google Sheets publicado como CSV, con respaldo en archivos locales dentro del directorio `data/`.

Para ejecutar el proyecto localmente, basta con abrir `index.html` en el navegador o servir el directorio con:

```bash
python3 -m http.server
```

---

## Estructura del proyecto

```text
index.html          # Aplicación completa: HTML + CSS + JavaScript
data/               # Archivos CSV con los datos en distintos idiomas
notebooklm-icon.webp
README.md
```

---

## Licencias

| Componente              | Licencia                                                        |
| ----------------------- | --------------------------------------------------------------- |
| Contenido de las fichas | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Código fuente           | [AGPLv3](https://www.gnu.org/licenses/agpl-3.0.html)            |
| Archivos CSV            | © Juan José de Haro, todos los derechos reservados              |

---

## Autor

**Juan José de Haro**
[bilateria.org](https://bilateria.org)

Sugerencias, errores o propuestas de mejora:
[https://github.com/metact/metact.github.io/issues](https://github.com/metact/metact.github.io/issues)
