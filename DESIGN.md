# Buscando barato · Dirección visual (v0.2)

## Superficie e intención

- **Modo:** `explore` (asignado por `design-pick`).
- **Usuario principal:** quien compra para su negocio o se abastece en Lima Centro, antes o durante el recorrido.
- **Tareas:** 1) ver qué hay hoy en cada zona, 2) filtrar por canal (mayor/menor) y tipo de producto, 3) verificar si un precio ofrecido es razonable.
- **Decisión clave:** separar siempre un punto del mapa de una afirmación de stock o de precio; toda cifra lleva fuente y fecha.

## Dirección elegida

- **Arquetipo:** barra de comando (fecha + estado del barrido) → búsqueda con zona y canal → franja de zonas con conteos reales → tabla maestra + mapa + ficha de detalle. El verificador es una pestaña con veredicto y tabla de ofertas.
- **Alternativas descartadas:** mapa a pantalla completa con cajón (esconde la comparación), tablero de tarjetas por zona (repetitivo, poca densidad), asistente paso a paso (lento para uso recurrente).
- **Tipografía:** Space Grotesk (titulares, controles), Noto Sans (lectura), Space Mono (cifras, estados, metadatos).
- **Paleta:** arena + índigo. El índigo marca acción, selección y “por mayor”; el ocre marca “por menor”; la tinta marca galerías y mercados. Verde y rojo solo para el estado SUNAT y el veredicto de precio.
- **Geometría:** 2px; chips de estado a 999px.
- **Motion:** mínimo. Transiciones de color y borde a 140 ms; parpadeo del indicador de barrido. Todo se anula con `prefers-reduced-motion`.

## Tokens

```css
--ink: #1B1B2F;  --ink-soft: #595967;
--surface: #F8F5EF;  --surface-2: #FFFFFF;  --surface-3: #EFEAE0;
--line: #D9D2C3;  --line-strong: #1B1B2F;
--accent: #3B5BDB;  --accent-strong: #2C47B8;  --accent-soft: #E7ECFC;
--support: #B5651D;  --support-soft: #F6E9DC;
--ok: #2B7A3D;  --warn: #9A5A12;  --danger: #B42828;
--ch-mayorista: #3B5BDB;  --ch-minorista: #B5651D;  --ch-galeria: #1B1B2F;
--font-display: "Space Grotesk";  --font-body: "Noto Sans";  --font-mono: "Space Mono";
--fs-h1: clamp(1.5rem, 2.2vw, 2rem);  --fs-h2: 1.25rem;  --fs-h3: 1.0625rem;
--fs-body: 1rem;  --fs-ui: .9375rem;  --fs-label: .8125rem;  --fs-caption: .75rem;  --fs-micro: .6875rem;
--sp-1..7: 4 / 8 / 12 / 16 / 24 / 32 / 48 px
--radius: 2px;  --radius-pill: 999px;  --dur: 140ms;  --control-h: 44px;
```

## Estados

- **Barrido:** `loading` (índigo parpadeante), `live` (verde), `snapshot` (ocre, cuando Overpass no responde).
- **Filas:** hover (arena), seleccionada (`aria-current`, fondo índigo suave + borde izquierdo).
- **Facetas y zonas:** `aria-pressed`; facetas sin resultados quedan `disabled`.
- **Botones:** hover, active, focus-visible (anillo índigo 2px), disabled/`aria-busy` durante el barrido.

## Responsive

- **1600 px:** ancho máximo; tres columnas (facetas 220 px · tabla · mapa + ficha).
- **1280 px:** mismas tres columnas con facetas de 200 px; la franja de zonas mantiene 7 columnas.
- **768 px:** facetas a la izquierda; tabla arriba, mapa y ficha debajo; zonas en 4 columnas; canal a ancho completo.
- **360 px:** una columna; el mapa va primero, las zonas se desplazan en horizontal, las facetas pasan a chips y cada fila muestra nombre/canal arriba y zona/SUNAT abajo.

## Anti-patrones evitados

Sin hero, sin tarjetas de métricas decorativas, sin degradados, sin glassmorphism, sin radios grandes y sin cifras inventadas: los conteos por zona y por giro se calculan del barrido del momento.
