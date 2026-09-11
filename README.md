# Buscando barato · Lima Centro

Explorador de **comercio y distribución** de Lima Centro, desde Av. Argentina y Mesa Redonda hasta Gamarra: barrido en vivo de comercios mayoristas y minoristas, contraste con el padrón SUNAT y verificador de precios contra catálogos reales de tiendas peruanas.

Publicado en: https://oprbguitar.github.io/Centrito-Limancha/

## Qué hace

| Función | Cómo funciona | Fuente |
|---|---|---|
| **Barrido de la zona** | Cada vez que alguien abre la página, el navegador consulta OpenStreetMap (Overpass API) para todo el rectángulo de trabajo. El resultado se guarda 20 min en `localStorage` para no saturar el servicio. Si Overpass no responde, se usa el corte de `public/data/comercios.json`. | OpenStreetMap (ODbL) |
| **Encabezado con fecha** | Fecha de hoy (hora de Lima), estado del barrido, cantidad de comercios y hora de la última edición de OSM incorporada. Botón “Volver a barrer”. | — |
| **Zonas** | Mesa Redonda · Mercado Central, Barrios Altos, Damero · Abancay, Av. Argentina · Las Malvinas, Av. Grau · Polvos Azules, Gamarra y resto de Lima Centro. Son rectángulos de trabajo, no límites oficiales. | `src/model.js` |
| **Filtros** | Búsqueda por nombre, giro, razón social o producto (una palabra como “foco led” se traduce al giro *Ferretería y electricidad*); canal por mayor, por menor o galería; tipo de producto; RUC activo y habido; con contacto; con nombre. El estado del filtro queda en la URL (`#zona=gamarra&tipo=textil`). | — |
| **Contraste SUNAT** | Los comercios OSM que la base *Análisis de empresas* ya había conciliado con un RUC 20 muestran razón social, estado, condición de domicilio y actividad CIIU. | Padrón RUC SUNAT (corte 16/08/2026) |
| **Verificador de precios** | Escribe un producto y el precio que te ofrecen: la página lo compara con el mínimo, la mediana y el máximo publicados con stock en Promart, Plaza Vea, Oechsle y Coolbox, y enlaza la búsqueda en vivo en cada tienda y en Mercado Libre. | Catálogos públicos VTEX, recogidos a diario |

### Lo que la página no hace (a propósito)

- **No inventa ambulantes.** No existe un registro público y abierto de comercio ambulante con ubicación; solo se muestran mercados, galerías y locales registrados en OSM.
- **No usa el catálogo del “Buscador de productos”**: sus precios son sintéticos (modo demo) y su historial está vacío.
- **No afirma stock**: OSM registra el giro del local, no su inventario.

## Tecnologías

- HTML, CSS y JavaScript sin framework, empaquetado con **Vite 7**.
- **Leaflet 1.9** con teselas estándar de OpenStreetMap y marcadores en canvas (1.500+ puntos).
- **Node 20+** para el scraper (`fetch` nativo, sin dependencias).
- **Python 3.12** (solo biblioteca estándar) para exportar el contraste SUNAT desde la base local.
- **GitHub Actions + GitHub Pages** para publicar y renovar datos cada día.

## Estructura

```
index.html              estructura de la página
styles.css              tokens y estilos (ver DESIGN.md)
src/model.js            zonas, giros, canal mayorista/minorista, consulta Overpass (compartido navegador/CI)
src/basket.js           tiendas y canasta de productos del verificador
src/main.js             estado, filtros, mapa, barrido en vivo, verificador
scripts/scrape.mjs      genera public/data/comercios.json y public/data/precios.json
scripts/contraste_sunat.py  genera public/data/sunat-contraste.json desde la base local
public/data/            cortes de datos versionados (respaldo y precios)
.github/workflows/deploy-pages.yml  build + publicación (push a main, diario 06:00 Lima, manual)
```

## Uso local

```bash
npm install
npm run dev
```

Renovar los datos a mano:

```bash
node scripts/scrape.mjs              # comercios + precios
node scripts/scrape.mjs --solo precios
python scripts/contraste_sunat.py    # requiere la base de Análisis de empresas
```

`contraste_sunat.py` lee por defecto `C:/Users/oprbg/Documents/COPIA de DB/empresas_full.db` en modo solo lectura (`--db` para otra ruta). Esa base no está en el repositorio, por eso el contraste **no** se renueva en CI: vuelve a correrlo cuando actualices el padrón en *Análisis de empresas* y haz commit del JSON.

Build de producción:

```bash
npm run build
npm run preview
```

## Publicación

Cada push a `main`, cada día a las 06:00 (hora de Lima) y el botón *Run workflow* ejecutan: `npm ci` → `node scripts/scrape.mjs` → `vite build` → GitHub Pages. Si Overpass o una tienda falla, el scraper conserva el corte versionado; nunca publica un archivo vacío.

## Reglas de datos

1. Todo dato mostrado tiene fuente y fecha visibles (pestaña **Método y fuentes**).
2. Solo se publican datos de personas jurídicas del padrón SUNAT; nada de teléfonos, correos ni representantes de la base de análisis.
3. La señal “por mayor” es orientativa: etiqueta OSM, nombre (distribuidora, importadora…) o CIIU de venta al por mayor.
4. Los precios son de tiendas web con stock y sirven de referencia; un puesto puede vender otra marca o presentación.

## Contexto de desarrollo

- v0.1: prototipo con 6 corredores comerciales escritos a mano.
- v0.2 (11/09/2026): barrido OSM en vivo (1.511 comercios), contraste con 296 comercios del padrón SUNAT, verificador con 382 precios reales de 4 tiendas, zonas, filtros por canal y giro, actualización diaria en CI.
