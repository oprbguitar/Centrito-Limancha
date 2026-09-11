#!/usr/bin/env node
// Licencias de funcionamiento otorgadas por la Municipalidad Metropolitana de Lima
// (Plataforma Nacional de Datos Abiertos). Se publica solo el RUC, el estado de
// vigencia, la fecha de otorgamiento y el área declarada de los comercios que la
// página ya muestra; no se republica el dataset completo.
// Uso: node scripts/licencias.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'public', 'data');
const CSV = 'https://www.datosabiertos.gob.pe/sites/default/files/DATOS%20ABIERTOS%20LICENCIAS%2001012024%20AL%200104.2026.csv';
const FUENTE = 'https://www.datosabiertos.gob.pe/dataset/licencias-de-funcionamiento-otorgadas-2020-2025';

async function leerJson(nombre) {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA, nombre), 'utf8'));
  } catch {
    return null;
  }
}

// RUC que la página muestra: contraste SUNAT de los comercios OSM + empresas geolocalizadas.
async function rucsDeInteres() {
  const rucs = new Set();
  const contraste = await leerJson('sunat-contraste.json');
  Object.values(contraste?.items || {}).forEach((item) => rucs.add(item.ruc));
  const empresas = await leerJson('empresas-sunat.json');
  (empresas?.items || []).forEach((item) => rucs.add(item.ruc));
  return rucs;
}

const response = await fetch(CSV, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36', Referer: 'https://www.datosabiertos.gob.pe/' },
  signal: AbortSignal.timeout(120_000)
});
if (!response.ok) {
  console.warn(`✗ Licencias: HTTP ${response.status}; se conserva el corte anterior.`);
  process.exit(0);
}
const texto = new TextDecoder('utf-8').decode(await response.arrayBuffer());
const [cabecera, ...lineas] = texto.split(/\r?\n/).filter(Boolean);
const columnas = cabecera.split(';').map((columna) => columna.trim());
const indice = (nombre) => columnas.indexOf(nombre);
const iRuc = indice('RUC');
const iEstado = indice('ESTADO_VIGENCIA');
const iFecha = indice('FECHA_OTORGAMIENTO');
const iArea = indice('AREA');
const iDistrito = indice('DISTRITO');
const iCorte = indice('FECHA_CORTE');
if (iRuc < 0) {
  console.warn('✗ Licencias: el CSV cambió de formato; se conserva el corte anterior.');
  process.exit(0);
}

const interes = await rucsDeInteres();
const items = {};
let corte = '';
let total = 0;
for (const linea of lineas) {
  const campos = linea.split(';');
  const ruc = (campos[iRuc] || '').trim();
  if (!ruc) continue;
  total += 1;
  // FECHA_CORTE viene como ddmmaaaa.
  corte ||= (campos[iCorte] || '').trim().replace(/^(\d{2})(\d{2})(\d{4})$/, '$1/$2/$3');
  if (!interes.has(ruc)) continue;
  const registro = {
    estado: (campos[iEstado] || '').trim(),
    otorgada: (campos[iFecha] || '').trim(),
    area: (campos[iArea] || '').trim(),
    distrito: (campos[iDistrito] || '').trim()
  };
  // Se conserva la licencia más reciente por RUC.
  if (!items[ruc] || registro.otorgada > items[ruc].otorgada) items[ruc] = registro;
}

if (!total) {
  console.warn('✗ Licencias: CSV vacío; se conserva el corte anterior.');
  process.exit(0);
}
await fs.writeFile(path.join(DATA, 'licencias.json'), JSON.stringify({
  generated: new Date().toISOString(),
  corte,
  fuente: FUENTE,
  total,
  items
}));
console.log(`✓ licencias.json · ${Object.keys(items).length} coincidencias de ${total} licencias (corte ${corte})`);
