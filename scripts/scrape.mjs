#!/usr/bin/env node
// Genera los cortes de datos que la página usa como respaldo y como referencia de precios.
//   public/data/comercios.json  ← OpenStreetMap (Overpass) para la zona de trabajo
//   public/data/precios.json    ← catálogos públicos VTEX de tiendas peruanas
// Uso: node scripts/scrape.mjs [--solo comercios|precios]
// Si una fuente falla, se conserva el archivo anterior: nunca se publica un corte vacío.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BBOX, OVERPASS_ENDPOINTS, normalizeElement, normalizeText, overpassQuery } from '../src/model.js';
import { BASKET, STORES } from '../src/basket.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'data');
const only = process.argv.includes('--solo') ? process.argv[process.argv.indexOf('--solo') + 1] : '';
const UA = 'buscando-barato/0.2 (+https://oprbguitar.github.io/Centrito-Limancha/)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function writeJson(name, data) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, name), JSON.stringify(data));
  console.log(`✓ ${name}`);
}

async function scrapeShops() {
  const body = new URLSearchParams({ data: overpassQuery(BBOX) });
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, { method: 'POST', body, headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(90_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const seen = new Set();
      const items = json.elements.map(normalizeElement).filter((item) => item && !seen.has(item.id) && seen.add(item.id));
      if (items.length < 100) throw new Error(`solo ${items.length} comercios`);
      await writeJson('comercios.json', {
        generated: new Date().toISOString(),
        osmBase: json.osm3s?.timestamp_osm_base || '',
        source: endpoint,
        bbox: BBOX,
        items
      });
      console.log(`  ${items.length} comercios desde ${endpoint}`);
      return;
    } catch (error) {
      console.warn(`✗ Overpass ${endpoint}: ${error.message}`);
    }
  }
  console.warn('✗ Ningún servidor Overpass respondió; se conserva el corte anterior.');
}

// Un resultado solo cuenta si su nombre contiene todas las palabras relevantes de la búsqueda.
function relevant(productName, query) {
  const name = normalizeText(productName);
  return normalizeText(query).split(' ').filter((word) => word.length > 2 && !/^\d+$/.test(word)).every((word) => name.includes(word));
}

async function searchStore(store, query) {
  const url = `${store.home}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(query)}&_from=0&_to=11`;
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok && response.status !== 206) throw new Error(`HTTP ${response.status}`);
  const products = await response.json();
  return products.flatMap((product) => {
    const item = product.items?.[0];
    const offer = item?.sellers?.find((seller) => seller.commertialOffer?.AvailableQuantity > 0)?.commertialOffer;
    if (!offer || !(offer.Price > 0) || !relevant(product.productName, query)) return [];
    return [{
      store: store.id,
      name: product.productName.trim(),
      brand: product.brand || '',
      price: offer.Price,
      listPrice: offer.ListPrice > offer.Price ? offer.ListPrice : null,
      url: product.link,
      category: (product.categories?.[0] || '').split('/').filter(Boolean).pop() || ''
    }];
  }).slice(0, 6);
}

async function scrapePrices() {
  const offers = [];
  const status = {};
  for (const store of STORES) {
    status[store.id] = { ok: 0, failed: 0 };
    for (const entry of BASKET) {
      try {
        const found = await searchStore(store, entry.query);
        found.forEach((offer) => offers.push({ ...offer, basket: entry.id }));
        status[store.id].ok += 1;
      } catch (error) {
        status[store.id].failed += 1;
        console.warn(`✗ ${store.name} · ${entry.query}: ${error.message}`);
      }
      await sleep(350);
    }
  }
  if (offers.length < 40) {
    console.warn(`✗ Solo ${offers.length} precios; se conserva el corte anterior.`);
    return;
  }
  await writeJson('precios.json', { generated: new Date().toISOString(), status, offers });
  console.log(`  ${offers.length} precios de ${STORES.length} tiendas`);
}

if (!only || only === 'comercios') await scrapeShops();
if (!only || only === 'precios') await scrapePrices();
