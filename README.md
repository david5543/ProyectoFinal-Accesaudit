# AccesAudit

Una aplicación de auditoría de accesibilidad ISO 9241 con backend en Node.js + axe-core y frontend en Angular.

## Estructura del proyecto

- `backend/`: servidor Node.js con Express, Playwright y axe-core para auditar páginas.
- `frontend/`: aplicación Angular para solicitar auditorías, presentar resultados y apoyar una verificación manual.

## Instalación

1. Instalar dependencias en el root:
   ```bash
   npm run install:all
   ```

2. Iniciar el backend y el frontend en modo desarrollo:
   ```bash
   npm run dev
   ```

3. Abrir `http://localhost:4200` en el navegador.

## Comandos útiles

- `npm run install:all`: instala dependencias en backend y frontend.
- `npm run dev`: arranca backend y frontend en paralelo.
- `npm run start:backend`: arranca solo el backend.
- `npm run start:frontend`: arranca solo el frontend.

## Backend

- API: `POST /api/audit`
- Payload: `{ "url": "https://example.com" }`
- Devuelve un reporte de accesibilidad generado con axe-core.
- El reporte incluye ahora un resumen de conformidad, porcentaje de reglas pasadas, cuentas por impacto y un análisis de etiquetas WCAG.
- El backend también evalúa automáticamente los 15 criterios WCAG definidos y devuelve su estado individual.

## Frontend

- Página principal con formulario de URL.
- Muestra resultados de auditoría y lista de violaciones detectadas.
- Presenta un resumen de conformidad estimada y un checklist de verificación manual asistida.

## Criterios de calificación del proyecto

1. Configurar backend Node.js con Express y Playwright para ejecutar auditorías.
2. Integrar axe-core para realizar auditoría automática de accesibilidad.
3. Construir una API `POST /api/audit` que acepte una URL y devuelva un JSON estructurado.
4. Generar reporte con `violations`, `passes`, `incomplete`, `inapplicable` y `timestamp`.
5. Calcular un resumen de conformidad y porcentaje de reglas pasadas.
6. Clasificar los resultados por nivel de impacto: crítico, serio, moderado y menor.
7. Identificar etiquetas WCAG relevantes en el reporte.
8. Implementar frontend Angular para solicitar auditorías y mostrar resultados.
9. Mostrar detalles de cada violación con descripción, ayuda y nodos afectados.
10. Agregar verificación manual asistida con checklist interactivo.
11. Definir al menos 15 criterios verificables para la auditoría y checklist.
12. Guardar historial de auditorías y permitir comparar múltiples sitios.
13. Añadir un dashboard de comparación entre sitios auditados.
14. Validar entradas y manejar errores de URL inválida y fallos de auditoría.
15. Documentar los criterios, el estado actual y las mejoras pendientes.

### Criterios específicos implementados en la checklist
- 1.1.1 Contenido no textual — `axe-core: image-alt`
- 1.2.1 Solo audio y video (grabado) — `axe-core: audio-caption`
- 1.3.1 Información y relaciones — `axe-core: heading-order`, `axe-core: list`
- 1.3.2 Secuencia significativa — `axe-core: meta-viewport`
- 1.4.1 Uso del color — `axe-core: color-contrast (parcial)`
- 1.4.3 Contraste mínimo — `axe-core: color-contrast`
- 1.4.4 Redimensionar texto — prueba manual/Playwright zoom
- 1.4.10 Reflow — prueba manual/Playwright viewport
- 2.1.1 Teclado — `axe-core: keyboard`
- 2.1.2 Sin trampa de foco — `axe-core: focus-traps`
- 2.4.1 Saltar bloques — `axe-core: skip-link`
- 2.4.2 Título de página — `axe-core: page-title`
- 2.4.3 Orden de foco — `axe-core: focus-order`
- 2.4.4 Propósito del enlace (en contexto) — `axe-core: link-name`
- 4.1.2 Nombre, rol, valor — `axe-core: label`

## Estado actual

### Implementado

- Auditoría automática funcional con `axe-core` y Playwright.
- Backend que devuelve resultados de auditoría y un resumen con nivel de conformidad estimado.
- Frontend Angular que consume la API y muestra el reporte.
- Checklist manual asistida para continuar la verificación de criterios humanos.

### Pendiente

- Comparación de resultados con herramientas externas como WAVE o Lighthouse.
- Cálculo de métricas más avanzadas por nivel WCAG (A/AA/AAA) y por código ISO.
- Recomendaciones priorizadas según impacto y dificultad de corrección.

 npm run start:backend
npm run start:frontend