# Buscando barato · Dirección visual

## Superficie e intención

- **Modo:** `explore`.
- **Usuario principal:** personas que compran para su negocio o buscan abastecerse en Lima Centro.
- **Tarea principal:** ubicar corredores comerciales alrededor de la avenida Abancay, filtrar por tipo de proveedor y producto, y abrir la fuente pública antes de planificar una visita.
- **Decisión clave:** separar un punto geográfico de una afirmación de precio, disponibilidad o formalidad. Esta primera versión solo muestra referencias web.

## Dirección elegida

- **Arquetipo:** mapa protagonista + rail de facetas + lista maestra de resultados.
- **Tipografía:** Space Grotesk para la marca y titulares; Noto Sans para lectura y controles; Space Mono para metadatos y estados.
- **Paleta:** acero + verde eléctrico para una superficie de exploración operativa; azul como apoyo de mapa y enlaces.
- **Geometría:** recta, bordes de 1px y radio máximo de 2px. Sin sombras decorativas.
- **Motion:** seco, 120–160ms, reservado a selección, foco y cambios de estado.

## Tokens

```css
--ink: #161a1d;
--ink-soft: #586168;
--surface: #f2f4f5;
--surface-2: #ffffff;
--line: #c9d0d4;
--accent: #2f9e44;
--accent-ink: #ffffff;
--support: #1971c2;
--ok: #2f9e44;
--warn: #c87818;
--danger: #bd3a32;
--info: #1971c2;
--font-display: "Space Grotesk", sans-serif;
--font-body: "Noto Sans", sans-serif;
--font-mono: "Space Mono", monospace;
--fs-display: clamp(2.25rem, 4vw, 3.5rem);
--fs-h1: clamp(1.75rem, 2.6vw, 2.5rem);
--fs-h2: 1.5rem;
--fs-h3: 1.25rem;
--fs-h4: 1.0625rem;
--fs-body: 1rem;
--fs-ui: 0.9375rem;
--fs-label: 0.8125rem;
--fs-caption: 0.75rem;
--lh-tight: 1.15;
--lh-heading: 1.25;
--lh-body: 1.6;
--sp-1: 4px;
--sp-2: 8px;
--sp-3: 12px;
--sp-4: 16px;
--sp-5: 24px;
--sp-6: 32px;
--sp-7: 48px;
--sp-8: 64px;
--radius: 2px;
--border: 1px;
--shadow: 0 8px 24px rgba(22, 26, 29, 0.08);
--dur: 140ms;
--ease: cubic-bezier(.2, .8, .2, 1);
```

## Composición y componentes

- Barra superior compacta con marca, estado de fuente abierta y acción de limpiar filtros.
- Encabezado editorial corto que explica el límite de la primera versión.
- Rail lateral de búsqueda y facetas persistentes.
- Mapa Leaflet con teselas OpenStreetMap, límite visual de trabajo y marcadores por tipo de zona.
- Lista maestra con filas comparables; cada fila muestra tipo, productos, procedencia y enlace de contraste.
- Banda de procedencia que evita confundir referencias web con precios, inventario o validación municipal.

## Responsive y accesibilidad

- 360 px: una sola columna; controles a ancho completo; el mapa precede a la lista.
- 768 px: rail estrecho y mapa/lista apilados con separación mínima.
- 1280 px: rail + mapa + lista en una composición de trabajo.
- 1600 px: el contenido mantiene un ancho legible y el mapa recibe el mayor peso visual.
- Todos los controles tienen foco visible, etiqueta asociada, estados disabled/selected y objetivos táctiles de al menos 44 px.
- El color no es el único indicador: los tipos incluyen texto y formas distintas.
- `prefers-reduced-motion` elimina transiciones y animaciones no esenciales.

## Datos y límites intencionales

Los puntos iniciales son zonas o complejos comerciales, no un padrón exhaustivo de puestos. La categoría y el catálogo se derivan de páginas públicas enlazadas en cada resultado y aparecen como **referencia web**. No se muestran precios ni disponibilidad hasta contar con levantamiento verificable.

## Anti-patrones evitados

No hay hero SaaS, métricas decorativas, rejilla repetitiva de tarjetas, degradados, glassmorphism, radios grandes ni cifras inventadas. La interfaz prioriza el mapa y una lista de decisiones concretas.
