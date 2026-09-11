# Buscando barato · Lima Centro

Primer prototipo de un explorador de referencias comerciales alrededor de la avenida Abancay, Mesa Redonda, Mercado Central, Av. Argentina y Polvos Azules.

## Qué incluye

- Mapa interactivo con Leaflet y teselas de OpenStreetMap.
- Filtros por texto, tipo de proveedor y producto o giro.
- Lista de referencias con enlaces a la fuente pública de cada zona.
- Responsive para móvil, tablet y escritorio.
- Etiquetado explícito de **referencia web**: no representa precios, inventario, padrón municipal ni disponibilidad en tiempo real.

## Ejecutar localmente

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Para validar el build:

```bash
npm run build
npm run preview
```

## Publicación

El workflow de GitHub Actions publica automáticamente la carpeta `dist` en GitHub Pages después de cada push a `main`.

URL prevista: https://oprbguitar.github.io/Centrito-Limancha/

## Fuentes iniciales

- [OpenStreetMap](https://www.openstreetmap.org/copyright)
- [Campo Ferial Mesa Redonda](https://cfmesaredonda.com/)
- [Las Malvinas Lima](https://www.lasmalvinaslima.com/productos)
- [C.C. Polvos Azules Virtual](https://ccpolvosazuleslimaperu.com/)
- [KOM · Cercado de Lima](https://kom.pe/catalogos-virtuales/cercado-de-lima/)
- [Ruta Mayorista Online · Mercado Central](https://rutamayoristaonline.com/blogs/zonas-comerciales-del-peru/mercado-central-lima-productos-mayoristas-que-puedes-encontrar)

## Próxima fase

Incorporar establecimientos individuales con nombre comercial, fuente, fecha de revisión, contacto y verificación en campo. Los precios deben añadirse después con unidad, presentación, fecha y evidencia para evitar comparaciones engañosas.
