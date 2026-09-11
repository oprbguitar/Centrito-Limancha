import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BBOX, ZONES, OTHER_ZONE, FAMILIES, CHANNELS, OVERPASS_ENDPOINTS,
  overpassQuery, normalizeElement, normalizeText, applyContrast
} from './model.js';
import { BASKET, STORES, LIVE_SEARCH } from './basket.js';

const ALL_ZONES = [...ZONES, OTHER_ZONE];
const zoneById = Object.fromEntries(ALL_ZONES.map((zone) => [zone.id, zone]));
const familyById = Object.fromEntries(FAMILIES.map((family) => [family.id, family]));
const storeById = Object.fromEntries(STORES.map((store) => [store.id, store]));
const PAGE = 80;
const CACHE_KEY = 'bb-barrido-v1';
const CACHE_MINUTES = 20;
const COLORS = { mayorista: '#3B5BDB', minorista: '#B5651D', galeria: '#1B1B2F' };
const LIMA_TZ = 'America/Lima';

// Palabras de producto → giro. Permite buscar "foco led" y encontrar ferreterías aunque OSM no liste stock.
const PRODUCT_WORDS = {
  ferreteria: ['ferreteria', 'foco', 'led', 'cable', 'taladro', 'candado', 'pintura', 'tornillo', 'clavo', 'cinta aislante', 'extension', 'enchufe', 'tomacorriente', 'herramienta', 'martillo', 'tubo', 'grifo', 'cerradura', 'casco', 'guante', 'electric', 'iluminacion', 'soldadura', 'vidrio', 'epp'],
  tecnologia: ['celular', 'cargador', 'audifono', 'power bank', 'mouse', 'teclado', 'laptop', 'computadora', 'usb', 'hdmi', 'parlante', 'smartwatch', 'tablet', 'impresora', 'tinta', 'camara', 'funda', 'mica', 'electronica', 'tecnologia'],
  libreria: ['cuaderno', 'papel', 'lapicero', 'lapiz', 'mochila', 'util', 'colores', 'plumon', 'folder', 'libro', 'copia', 'impresion', 'archivador', 'libreria'],
  bazar: ['juguete', 'peluche', 'regalo', 'molde', 'taper', 'olla', 'sarten', 'vaso', 'plato', 'adorno', 'fiesta', 'globo', 'navidad', 'disfraz', 'menaje', 'cocina', 'bandeja', 'pinata', 'bazar', 'cotillon'],
  textil: ['polo', 'jean', 'ropa', 'tela', 'zapatilla', 'zapato', 'calzado', 'casaca', 'vestido', 'uniforme', 'buzo', 'camisa', 'hilo', 'boton', 'cierre', 'cartera', 'bolso', 'correa', 'lana', 'textil', 'confeccion'],
  abarrotes: ['arroz', 'aceite', 'azucar', 'leche', 'fideo', 'conserva', 'bebida', 'gaseosa', 'galleta', 'dulce', 'caramelo', 'chocolate', 'abarrote', 'pan', 'agua', 'golosina'],
  belleza: ['shampoo', 'perfume', 'maquillaje', 'crema', 'cosmetico', 'lente', 'gafas', 'optica', 'tinte', 'esmalte', 'belleza'],
  motor: ['aceite de motor', 'llanta', 'repuesto', 'autoparte', 'moto', 'faro', 'filtro', 'lubricante'],
  hogar: ['mueble', 'colchon', 'silla', 'mesa', 'alfombra', 'ropero'],
  centro: ['galeria', 'mercado', 'centro comercial', 'emporio']
};

const state = {
  items: [],
  snapshot: null,
  contrast: {},
  contrastMeta: null,
  prices: null,
  q: '',
  zone: 'all',
  channel: 'all',
  family: 'all',
  onlySunat: false,
  onlyContact: false,
  onlyNamed: false,
  sort: 'name',
  limit: PAGE,
  selected: null,
  tab: 'comercios',
  sweep: { state: 'loading', at: null, osmBase: '', added: 0 }
};

const $ = (selector) => document.querySelector(selector);
const els = {
  today: $('#today-date'), sweepStatus: $('#sweep-status'), sweepText: $('#sweep-text'), resweep: $('#resweep'),
  search: $('#search-input'), searchForm: $('#search-form'), hint: $('#search-hint'), zoneSelect: $('#zone-select'),
  channelGroup: $('#channel-group'), zoneStrip: $('#zone-strip'), familyList: $('#family-list'),
  onlySunat: $('#only-sunat'), onlyContact: $('#only-contact'), onlyNamed: $('#only-named'),
  count: $('#result-count'), sort: $('#sort-select'), rows: $('#rows'), empty: $('#empty-state'), more: $('#show-more'),
  detail: $('#detail'), verifyForm: $('#verify-form'), verifyProduct: $('#verify-product'), verifyPrice: $('#verify-price'),
  basket: $('#basket'), verifyResult: $('#verify-result'), methodGrid: $('#method-grid')
};

// ---------------------------------------------------------------- utilidades
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const nf = new Intl.NumberFormat('es-PE');
const pen = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

function safeUrl(value) {
  if (!value) return '';
  const url = /^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, '')}`;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function fmtDate(iso, withTime = false) {
  if (!iso) return '—';
  const options = withTime
    ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: LIMA_TZ }
    : { day: '2-digit', month: 'short', year: 'numeric', timeZone: LIMA_TZ };
  return new Intl.DateTimeFormat('es-PE', options).format(new Date(iso));
}

const fmtTime = (iso) => new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: LIMA_TZ }).format(new Date(iso));
const displayName = (item) => item.name || `${item.type} sin nombre registrado`;
const sunatOk = (item) => item.sunat?.estado === 'ACTIVO' && item.sunat?.condicion === 'HABIDO';

function familyForQuery(query) {
  const text = ` ${normalizeText(query)}`;
  let best = null;
  let bestLength = 0;
  for (const [family, words] of Object.entries(PRODUCT_WORDS)) {
    for (const word of words) {
      if (text.includes(` ${word}`) && word.length > bestLength) {
        best = family;
        bestLength = word.length;
      }
    }
  }
  return best;
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    return cached && Date.now() - new Date(cached.at).getTime() < CACHE_MINUTES * 60_000 ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch { /* sin almacenamiento: se barre en cada visita */ }
}

// ---------------------------------------------------------------- datos
function setItems(records) {
  state.items = records.map((record) => {
    const item = applyContrast(record, state.contrast[record.id]);
    item.text = normalizeText([item.name, item.type, familyById[item.family]?.name, item.products, item.sunat?.razon, item.sunat?.ciiu, item.address].join(' '));
    return item;
  });
}

function passes(item, skip = '') {
  const query = normalizeText(state.q);
  if (query) {
    const byText = query.split(' ').every((word) => item.text.includes(word));
    const queryFamily = familyForQuery(state.q);
    if (!byText && item.family !== queryFamily) return false;
  }
  if (skip !== 'zone' && state.zone !== 'all' && item.zone !== state.zone) return false;
  if (skip !== 'family' && state.family !== 'all' && item.family !== state.family) return false;
  if (state.channel !== 'all' && item.channel !== state.channel) return false;
  if (state.onlySunat && !sunatOk(item)) return false;
  if (state.onlyContact && !(item.phone || item.website)) return false;
  if (state.onlyNamed && !item.name) return false;
  return true;
}

function sorted(list) {
  const zoneOrder = Object.fromEntries(ALL_ZONES.map((zone, index) => [zone.id, index]));
  const byName = (a, b) => (!a.name - !b.name) || displayName(a).localeCompare(displayName(b), 'es');
  const sorters = {
    name: byName,
    zone: (a, b) => zoneOrder[a.zone] - zoneOrder[b.zone] || byName(a, b),
    edited: (a, b) => (b.edited || '').localeCompare(a.edited || '') || byName(a, b)
  };
  return [...list].sort(sorters[state.sort] || byName);
}

// ---------------------------------------------------------------- mapa
const map = L.map('map', { preferCanvas: true, zoomControl: false, scrollWheelZoom: true })
  .fitBounds([[BBOX.s, BBOX.w], [BBOX.n, BBOX.e]], { padding: [8, 8] });
L.control.zoom({ position: 'topright' }).addTo(map);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

ZONES.forEach((zone) => {
  const [s, w, n, e] = zone.box;
  L.rectangle([[s, w], [n, e]], { color: '#1B1B2F', weight: 1, opacity: .5, dashArray: '4 4', fill: false, interactive: false }).addTo(map);
  L.tooltip({ permanent: true, direction: 'center', className: 'zone-label', interactive: false })
    .setLatLng([n - (n - s) * 0.08, (w + e) / 2]).setContent(esc(zone.name.split(' · ')[0])).addTo(map);
});

const markerLayer = L.layerGroup().addTo(map);
const highlight = L.circleMarker([0, 0], { radius: 12, color: '#3B5BDB', weight: 3, fill: false, interactive: false });

function updateMap(list) {
  markerLayer.clearLayers();
  list.forEach((item) => {
    const marker = L.circleMarker([item.lat, item.lon], {
      radius: item.channel === 'minorista' ? 5 : 6.5,
      color: '#FFFFFF',
      weight: 1,
      fillColor: COLORS[item.channel],
      fillOpacity: .9
    });
    marker.bindTooltip(esc(displayName(item)), { direction: 'top', offset: [0, -4] });
    marker.on('click', () => selectItem(item.id, { fromMap: true }));
    markerLayer.addLayer(marker);
  });
}

// ---------------------------------------------------------------- render
function renderZoneControls() {
  const base = state.items.filter((item) => passes(item, 'zone'));
  const counts = Object.fromEntries(ALL_ZONES.map((zone) => [zone.id, 0]));
  base.forEach((item) => { counts[item.zone] += 1; });
  els.zoneStrip.innerHTML = ALL_ZONES.map((zone) => `
    <button class="zone-btn" type="button" data-zone="${zone.id}" aria-pressed="${state.zone === zone.id}" title="${esc(zone.hint)}">
      <span class="zone-count">${nf.format(counts[zone.id])}</span>
      <span class="zone-name">${esc(zone.name)}</span>
    </button>`).join('');
  els.zoneSelect.innerHTML = `<option value="all">Todas las zonas (${nf.format(base.length)})</option>`
    + ALL_ZONES.map((zone) => `<option value="${zone.id}">${esc(zone.name)} (${nf.format(counts[zone.id])})</option>`).join('');
  els.zoneSelect.value = state.zone;
}

function renderFamilies() {
  const base = state.items.filter((item) => passes(item, 'family'));
  const counts = {};
  base.forEach((item) => { counts[item.family] = (counts[item.family] || 0) + 1; });
  const option = (id, name, count) => `
    <button class="facet" type="button" data-family="${id}" aria-pressed="${state.family === id}" ${count === 0 && state.family !== id ? 'disabled' : ''}>
      <span>${esc(name)}</span><span class="facet-count">${nf.format(count)}</span>
    </button>`;
  els.familyList.innerHTML = option('all', 'Todos los tipos', base.length)
    + FAMILIES.map((family) => option(family.id, family.name, counts[family.id] || 0)).join('');
}

function sunatChip(item) {
  if (!item.sunat) return '<span class="chip chip-none" title="Sin coincidencia en el padrón">—</span>';
  if (sunatOk(item)) return '<span class="chip chip-ok" title="Activo y habido en el padrón SUNAT">Activo</span>';
  const label = item.sunat.condicion && item.sunat.condicion !== 'HABIDO' ? 'No habido' : item.sunat.estado.startsWith('BAJA') ? 'De baja' : 'Revisar';
  return `<span class="chip chip-bad" title="${esc(`${item.sunat.estado} · ${item.sunat.condicion}`)}">${label}</span>`;
}

function renderRows(list) {
  const visible = list.slice(0, state.limit);
  els.rows.innerHTML = visible.map((item) => `
    <div role="listitem">
      <button class="row" type="button" data-id="${item.id}" aria-current="${state.selected === item.id}">
        <span>
          <span class="row-name ${item.name ? '' : 'is-unnamed'}">${esc(displayName(item))}</span>
          <span class="row-type">${esc(item.type)}${item.address ? ` · ${esc(item.address)}` : ''}</span>
        </span>
        <span><span class="chip chip-${item.channel}">${esc(CHANNELS[item.channel])}</span></span>
        <span class="row-zone">${esc(zoneById[item.zone].name.split(' · ')[0])}</span>
        <span>${sunatChip(item)}</span>
      </button>
    </div>`).join('');
  els.more.hidden = list.length <= state.limit;
  els.more.textContent = `Mostrar más (${nf.format(list.length - state.limit)} restantes)`;
  els.empty.hidden = list.length > 0;
  els.rows.hidden = list.length === 0;
}

function renderHint(list) {
  const queryFamily = state.q ? familyForQuery(state.q) : null;
  if (!state.q) {
    els.hint.hidden = true;
    return;
  }
  const byText = list.filter((item) => normalizeText(state.q).split(' ').every((word) => item.text.includes(word))).length;
  els.hint.hidden = false;
  els.hint.innerHTML = queryFamily
    ? `“${esc(state.q)}”: ${nf.format(byText)} por nombre y el resto por giro <strong>${esc(familyById[queryFamily].name)}</strong>. OSM registra el giro del local, no su stock.`
    : `${nf.format(byText)} comercios contienen “${esc(state.q)}” en su nombre, giro o razón social.`;
}

function render() {
  const list = sorted(state.items.filter((item) => passes(item)));
  els.count.textContent = nf.format(list.length);
  renderZoneControls();
  renderFamilies();
  renderRows(list);
  renderHint(list);
  updateMap(list);
  writeHash();
}

function detailHtml(item) {
  const zone = zoneById[item.zone];
  const website = safeUrl(item.website);
  const osmUrl = `https://www.openstreetmap.org/${item.id}`;
  const facts = [
    ['Giro', item.type],
    ['Tipo de producto', familyById[item.family].name],
    ['Zona', `${zone.name}`],
    ['Dirección', item.address],
    ['Teléfono', item.phone ? `<a href="tel:${esc(item.phone.split(';')[0].replace(/\s+/g, ''))}">${esc(item.phone)}</a>` : ''],
    ['Web', website ? `<a href="${esc(website)}" target="_blank" rel="noreferrer">${esc(website.replace(/^https?:\/\/(www\.)?/, '').slice(0, 42))}</a>` : ''],
    ['Horario', item.hours],
    ['Vende', item.products],
    ['Editado en OSM', item.edited ? fmtDate(item.edited) : '']
  ].filter(([, value]) => value);
  const raw = new Set(['Teléfono', 'Web']);
  const factsHtml = facts.map(([label, value]) => `<dt>${label}</dt><dd>${raw.has(label) ? value : esc(value)}</dd>`).join('');

  let sunat;
  if (item.sunat) {
    const ok = sunatOk(item);
    sunat = `<div class="sunat-box ${ok ? '' : 'is-bad'}">
      <p><strong>${ok ? 'Activo y habido' : esc(`${item.sunat.estado} · ${item.sunat.condicion || 'sin condición'}`)}</strong> en el padrón SUNAT (corte ${fmtDate(state.contrastMeta?.padronCorte)}).</p>
      <dl class="facts">
        <dt>RUC</dt><dd>${esc(item.sunat.ruc)}</dd>
        <dt>Razón social</dt><dd>${esc(item.sunat.razon)}</dd>
        ${item.sunat.ciiu ? `<dt>Actividad</dt><dd>${esc(item.sunat.ciiu)}</dd>` : ''}
        <dt>Coincidencia</dt><dd>por nombre y ubicación, ${Math.round(item.sunat.score * 100)} %</dd>
      </dl>
    </div>`;
  } else {
    sunat = '<div class="sunat-box is-none"><p>Sin coincidencia en el padrón SUNAT de la base de análisis. No significa que sea informal: puede operar con otro nombre o como persona natural.</p></div>';
  }

  const references = BASKET.filter((entry) => entry.family === item.family);
  const refHtml = references.length
    ? `<p class="detail-kicker">Precios de referencia de este giro</p>
       <div class="detail-links" style="margin-bottom: var(--sp-3)">${references.map((entry) => `<button class="text-button" type="button" data-verify="${esc(entry.query)}">${esc(entry.query)}</button>`).join('')}</div>`
    : '';

  return `
    <p class="detail-kicker">${esc(item.type)} · ${esc(zone.name)}</p>
    <h3>${esc(displayName(item))}</h3>
    <div class="detail-chips">
      <span class="chip chip-${item.channel}">${esc(CHANNELS[item.channel])}</span>
      <span class="chip chip-none" style="padding-left:0">${esc(item.channelReason)}</span>
    </div>
    <dl class="facts">${factsHtml}</dl>
    ${sunat}
    ${refHtml}
    <div class="detail-links">
      <a href="${osmUrl}" target="_blank" rel="noreferrer">Ver en OpenStreetMap ↗</a>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lon}" target="_blank" rel="noreferrer">Cómo llegar ↗</a>
      <a href="${osmUrl}#map=19/${item.lat}/${item.lon}&layers=N" target="_blank" rel="noreferrer">Corregir en OSM ↗</a>
    </div>`;
}

function selectItem(id, { fromMap = false } = {}) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) return;
  state.selected = id;
  els.rows.querySelectorAll('.row').forEach((row) => row.setAttribute('aria-current', String(row.dataset.id === id)));
  els.detail.innerHTML = detailHtml(item);
  highlight.setLatLng([item.lat, item.lon]).addTo(map);
  if (!fromMap) {
    map.setView([item.lat, item.lon], Math.max(map.getZoom(), 17), { animate: !matchMedia('(prefers-reduced-motion: reduce)').matches });
    if (matchMedia('(max-width: 760px)').matches) els.detail.closest('.map-panel').scrollIntoView({ block: 'start' });
  }
}

// ---------------------------------------------------------------- barrido en vivo
function setStatus(kind, text) {
  state.sweep.state = kind;
  els.sweepStatus.dataset.state = kind;
  els.sweepText.textContent = text;
  els.resweep.setAttribute('aria-busy', String(kind === 'loading'));
  els.resweep.disabled = kind === 'loading';
}

function useLive(payload, fromCache) {
  const snapshotIds = new Set((state.snapshot?.items || []).map((item) => item.id));
  const added = state.snapshot ? payload.items.filter((item) => !snapshotIds.has(item.id)).length : 0;
  state.sweep = { state: 'live', at: payload.at, osmBase: payload.osmBase, added };
  setItems(payload.items);
  const extra = added ? ` · ${nf.format(added)} nuevos desde el corte del ${fmtDate(state.snapshot.generated)}` : '';
  setStatus('live', `${fromCache ? 'Barrido reciente' : 'Barrido en vivo'} ${fmtTime(payload.at)} · ${nf.format(payload.items.length)} comercios · OSM al ${fmtDate(payload.osmBase, true)}${extra}`);
  render();
  if (state.selected) selectItem(state.selected, { fromMap: true });
  renderMethod();
}

async function liveSweep(force = false) {
  if (!force) {
    const cached = readCache();
    if (cached) {
      useLive(cached, true);
      return;
    }
  }
  setStatus('loading', 'Barriendo la zona en OpenStreetMap…');
  const body = `data=${encodeURIComponent(overpassQuery(BBOX))}`;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(35_000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const seen = new Set();
      const items = json.elements.map(normalizeElement).filter((item) => item && !seen.has(item.id) && seen.add(item.id));
      if (items.length < 100) throw new Error('respuesta incompleta');
      const payload = { at: new Date().toISOString(), osmBase: json.osm3s?.timestamp_osm_base || '', items };
      writeCache(payload);
      useLive(payload, false);
      return;
    } catch (error) {
      console.warn(`Overpass ${endpoint}:`, error.message);
    }
  }
  const when = state.snapshot ? `corte del ${fmtDate(state.snapshot.generated, true)}` : 'sin datos';
  setStatus('snapshot', `OpenStreetMap no respondió · mostrando ${when}`);
}

// ---------------------------------------------------------------- verificador de precios
function median(values) {
  const sortedValues = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 ? sortedValues[middle] : (sortedValues[middle - 1] + sortedValues[middle]) / 2;
}

function findOffers(query) {
  const text = normalizeText(query);
  const words = text.split(' ').filter((word) => word.length > 2 && !/^\d+$/.test(word));
  const basket = BASKET.find((entry) => normalizeText(entry.query) === text)
    || BASKET.find((entry) => normalizeText(entry.query).split(' ').filter((word) => word.length > 2).every((word) => text.includes(word)));
  if (!state.prices || !words.length) return { offers: [], basket };
  let offers = state.prices.offers.filter((offer) => {
    const haystack = normalizeText(`${offer.name} ${offer.brand} ${offer.category}`);
    return words.every((word) => haystack.includes(word));
  });
  if (!offers.length && basket) offers = state.prices.offers.filter((offer) => offer.basket === basket.id);
  const seen = new Set();
  offers = offers.filter((offer) => !seen.has(offer.url) && seen.add(offer.url)).sort((a, b) => a.price - b.price);
  return { offers, basket };
}

function verdictFor(price, offers) {
  const prices = offers.map((offer) => offer.price);
  const mid = median(prices);
  const diff = (price - mid) / mid;
  const pct = `${diff > 0 ? '+' : '−'}${Math.abs(Math.round(diff * 100))} %`;
  if (price <= Math.min(...prices)) return { cls: 'is-good', title: 'Más barato que todo lo publicado online', detail: `${pct} frente a la mediana online.` };
  if (diff <= -0.1) return { cls: 'is-good', title: 'Por debajo de la mediana online', detail: `${pct}. Buen precio si la marca y el tamaño coinciden.` };
  if (diff < 0.1) return { cls: '', title: 'En línea con el precio online', detail: `${pct} frente a la mediana. Negocia por volumen.` };
  return { cls: 'is-high', title: 'Por encima de la mediana online', detail: `${pct}. Compara en otro puesto o pide precio por mayor.` };
}

function renderVerify(query, userPrice) {
  els.basket.querySelectorAll('.basket-chip').forEach((chip) => chip.setAttribute('aria-pressed', String(normalizeText(chip.dataset.query) === normalizeText(query))));
  if (!query.trim()) {
    els.verifyResult.innerHTML = '';
    return;
  }
  const { offers, basket } = findOffers(query);
  const family = basket?.family || familyForQuery(query);
  const liveLinks = LIVE_SEARCH.map((store) => `<li><a href="${esc(store.url(query))}" target="_blank" rel="noreferrer">${esc(store.name)} ↗</a></li>`).join('');

  let summary;
  if (offers.length) {
    const prices = offers.map((offer) => offer.price);
    const stores = new Set(offers.map((offer) => offer.store)).size;
    const verdict = Number.isFinite(userPrice) && userPrice > 0 ? verdictFor(userPrice, offers) : null;
    summary = `
      <div class="verdict">
        <div class="stat"><span class="stat-label">Ofertas</span><span class="stat-value">${offers.length}</span></div>
        <div class="stat"><span class="stat-label">Mínimo</span><span class="stat-value">${pen.format(Math.min(...prices))}</span></div>
        <div class="stat"><span class="stat-label">Mediana</span><span class="stat-value">${pen.format(median(prices))}</span></div>
        <div class="stat"><span class="stat-label">Máximo</span><span class="stat-value">${pen.format(Math.max(...prices))}</span></div>
        <div class="stat stat-verdict">
          <span class="stat-label">${verdict ? `Tu precio: ${pen.format(userPrice)}` : 'Veredicto'}</span>
          <span class="stat-value ${verdict?.cls || ''}">${verdict ? verdict.title : 'Ingresa el precio que te ofrecen'}</span>
          <p>${verdict ? verdict.detail : `Precios de ${stores} ${stores === 1 ? 'tienda' : 'tiendas'} con stock, recogidos el ${fmtDate(state.prices.generated, true)}.`}</p>
        </div>
      </div>
      <div class="offers-wrap">
        <table class="offers">
          <thead><tr><th>Tienda</th><th>Producto</th><th>Marca</th><th class="num">Precio</th><th class="num">Antes</th></tr></thead>
          <tbody>${offers.slice(0, 40).map((offer) => `
            <tr>
              <td>${esc(storeById[offer.store]?.name || offer.store)}</td>
              <td><a href="${esc(safeUrl(offer.url))}" target="_blank" rel="noreferrer">${esc(offer.name)}</a></td>
              <td>${esc(offer.brand)}</td>
              <td class="num">${pen.format(offer.price)}</td>
              <td class="num">${offer.listPrice ? `<del>${pen.format(offer.listPrice)}</del>` : ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="note">Precios publicados en web con stock disponible; no incluyen delivery. Un puesto de Lima Centro puede vender otra marca o presentación: compara lo mismo con lo mismo.</p>`;
  } else {
    summary = `<div class="empty-state"><h3>Sin precios recogidos para “${esc(query)}”</h3><p>La canasta diaria cubre ${BASKET.length} productos. Usa los enlaces para buscarlo en vivo en cada tienda.</p></div>`;
  }

  let where = '';
  if (family) {
    const counts = Object.fromEntries(ALL_ZONES.map((zone) => [zone.id, 0]));
    state.items.filter((item) => item.family === family).forEach((item) => { counts[item.zone] += 1; });
    const top = Math.max(1, ...Object.values(counts));
    where = `<div>
      <h3>Dónde buscarlo en Lima Centro</h3>
      <p class="note" style="margin: 0 0 var(--sp-2)">Comercios de <strong>${esc(familyById[family].name)}</strong> por zona, según el barrido de hoy.</p>
      <div class="zone-bars">${ALL_ZONES.map((zone) => `
        <button class="zone-bar" type="button" data-go-zone="${zone.id}" data-go-family="${family}">
          <span>${esc(zone.name)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(counts[zone.id] / top) * 100}%"></span></span>
          <span class="facet-count">${counts[zone.id]}</span>
        </button>`).join('')}
      </div>
    </div>`;
  }

  els.verifyResult.innerHTML = `${summary}
    <div class="verify-foot">
      <div><h3>Buscar “${esc(query)}” en vivo</h3><ul class="link-list">${liveLinks}</ul>
      <p class="note">Abre la búsqueda en la tienda con el precio de este momento.</p></div>
      ${where}
    </div>`;
}

function renderBasket() {
  const covered = new Set((state.prices?.offers || []).map((offer) => offer.basket));
  els.basket.innerHTML = BASKET.filter((entry) => covered.has(entry.id))
    .map((entry) => `<button class="basket-chip" type="button" data-query="${esc(entry.query)}" aria-pressed="false">${esc(entry.query)}</button>`).join('');
}

// ---------------------------------------------------------------- método
function renderMethod() {
  const snapshot = state.snapshot;
  const contrastCount = state.items.filter((item) => item.sunat).length;
  const blocks = [
    ['Barrido de comercios', 'Cada vez que abres la página se consulta OpenStreetMap (Overpass API) para todo el rectángulo de Lima Centro, de Av. Argentina a Gamarra. El resultado se guarda 20 minutos en tu navegador para no saturar el servicio. Si no responde, se muestra el último corte generado por GitHub Actions.',
      `${state.sweep.at ? `Barrido: ${fmtDate(state.sweep.at, true)} · ` : ''}Corte de respaldo: ${snapshot ? `${fmtDate(snapshot.generated, true)} (${nf.format(snapshot.items.length)} comercios)` : '—'}`],
    ['Por mayor y por menor', 'Un comercio figura como mayorista si OSM lo etiqueta como venta al por mayor, si su nombre indica distribuidora o importadora, o si su actividad SUNAT es “venta al por mayor”. Galerías, mercados y centros comerciales se muestran aparte porque reúnen muchos locales.',
      'La señal es orientativa: muchos puestos venden por mayor y por menor a la vez.'],
    ['Contraste SUNAT', 'Los comercios se cruzan con el padrón RUC del proyecto Análisis de empresas. Solo se publican personas jurídicas (RUC 20): razón social, estado, condición de domicilio y actividad. La coincidencia es por nombre y ubicación, no una confirmación oficial del local.',
      `${nf.format(contrastCount)} comercios con coincidencia · padrón al ${fmtDate(state.contrastMeta?.padronCorte)}`],
    ['Precios de referencia', `Una vez al día, GitHub Actions consulta los catálogos públicos de ${STORES.map((store) => store.name).join(', ')} para una canasta de ${BASKET.length} productos típicos del centro. Solo se guardan productos con stock cuyo nombre contiene lo buscado.`,
      state.prices ? `${nf.format(state.prices.offers.length)} precios · recogidos ${fmtDate(state.prices.generated, true)}` : 'Sin corte de precios'],
    ['Comercio ambulante', 'No existe un registro público y abierto de vendedores ambulantes con ubicación. Por eso no aparecen en el mapa: la página no inventa puntos. Mercados y galerías sí figuran porque están registrados en OSM.',
      'Si levantas datos en campo, se pueden sumar como una capa propia con fecha.'],
    ['Zonas y mapa', 'Las zonas son rectángulos de trabajo para agrupar, no límites municipales. Las teselas del mapa se generan desde OpenStreetMap y se actualizan continuamente con las ediciones de la comunidad.',
      'Mapa © colaboradores de OpenStreetMap (ODbL).'],
    ['Lo que no se usa', 'El catálogo del “Buscador de productos” es de demostración (precios sintéticos) y su historial de precios está vacío, así que no se mezcla con estos datos. Mercado Libre exige token para su API y solo se enlaza para búsqueda en vivo.',
      'Regla: todo dato mostrado tiene fuente y fecha.']
  ];
  els.methodGrid.innerHTML = blocks.map(([title, text, stamp]) => `
    <div class="method-item"><h3>${title}</h3><p>${text}</p><span class="stamp">${esc(stamp)}</span></div>`).join('');
}

// ---------------------------------------------------------------- pestañas y estado en la URL
const tabs = [...document.querySelectorAll('[role="tab"]')];

function showTab(name, focus = false) {
  state.tab = name;
  tabs.forEach((tab) => {
    const active = tab.id === `tab-${name}`;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    if (active && focus) tab.focus();
  });
  if (name === 'comercios') setTimeout(() => map.invalidateSize(), 0);
  writeHash();
}

function writeHash() {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.zone !== 'all') params.set('zona', state.zone);
  if (state.channel !== 'all') params.set('canal', state.channel);
  if (state.family !== 'all') params.set('tipo', state.family);
  if (state.tab !== 'comercios') params.set('vista', state.tab);
  const hash = params.toString();
  history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search);
}

function readHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  state.q = params.get('q') || '';
  state.zone = zoneById[params.get('zona')] ? params.get('zona') : 'all';
  state.channel = CHANNELS[params.get('canal')] ? params.get('canal') : 'all';
  state.family = familyById[params.get('tipo')] ? params.get('tipo') : 'all';
  state.tab = ['comercios', 'precios', 'metodo'].includes(params.get('vista')) ? params.get('vista') : 'comercios';
}

function syncControls() {
  els.search.value = state.q;
  els.channelGroup.querySelectorAll('button').forEach((button) => button.setAttribute('aria-checked', String(button.dataset.channel === state.channel)));
}

function fitZone(zoneId) {
  const zone = ZONES.find((candidate) => candidate.id === zoneId);
  const box = zone ? zone.box : [BBOX.s, BBOX.w, BBOX.n, BBOX.e];
  map.fitBounds([[box[0], box[1]], [box[2], box[3]]], { padding: [12, 12] });
}

function setZone(zoneId) {
  state.zone = zoneId;
  state.limit = PAGE;
  fitZone(zoneId);
  render();
}

function resetFilters() {
  Object.assign(state, { q: '', zone: 'all', channel: 'all', family: 'all', onlySunat: false, onlyContact: false, onlyNamed: false, limit: PAGE });
  els.onlySunat.checked = els.onlyContact.checked = els.onlyNamed.checked = false;
  syncControls();
  fitZone('all');
  render();
}

// ---------------------------------------------------------------- eventos
let searchTimer;
els.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.q = els.search.value.trim(); state.limit = PAGE; render(); }, 160);
});
els.searchForm.addEventListener('submit', (event) => { event.preventDefault(); state.q = els.search.value.trim(); render(); showTab('comercios'); });
els.zoneSelect.addEventListener('change', () => setZone(els.zoneSelect.value));
els.zoneStrip.addEventListener('click', (event) => {
  const button = event.target.closest('[data-zone]');
  if (button) setZone(state.zone === button.dataset.zone ? 'all' : button.dataset.zone);
});
els.channelGroup.addEventListener('click', (event) => {
  const button = event.target.closest('[data-channel]');
  if (!button) return;
  state.channel = button.dataset.channel;
  state.limit = PAGE;
  syncControls();
  render();
});
els.familyList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-family]');
  if (!button) return;
  state.family = state.family === button.dataset.family ? 'all' : button.dataset.family;
  state.limit = PAGE;
  render();
});
[['onlySunat', els.onlySunat], ['onlyContact', els.onlyContact], ['onlyNamed', els.onlyNamed]].forEach(([key, input]) => {
  input.addEventListener('change', () => { state[key] = input.checked; state.limit = PAGE; render(); });
});
els.sort.addEventListener('change', () => { state.sort = els.sort.value; render(); });
els.more.addEventListener('click', () => { state.limit += PAGE; render(); });
els.rows.addEventListener('click', (event) => {
  const row = event.target.closest('[data-id]');
  if (row) selectItem(row.dataset.id);
});
$('#reset-filters').addEventListener('click', resetFilters);
$('#empty-reset').addEventListener('click', resetFilters);
els.resweep.addEventListener('click', () => liveSweep(true));

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => showTab(tab.id.replace('tab-', '')));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    showTab(next.id.replace('tab-', ''), true);
  });
});

function runVerify() {
  const price = parseFloat(String(els.verifyPrice.value).replace(',', '.'));
  renderVerify(els.verifyProduct.value.trim(), price);
}
els.verifyForm.addEventListener('submit', (event) => { event.preventDefault(); runVerify(); });
els.basket.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-query]');
  if (!chip) return;
  els.verifyProduct.value = chip.dataset.query;
  runVerify();
});
els.detail.addEventListener('click', (event) => {
  const button = event.target.closest('[data-verify]');
  if (!button) return;
  els.verifyProduct.value = button.dataset.verify;
  els.verifyPrice.value = '';
  showTab('precios');
  runVerify();
});
els.verifyResult.addEventListener('click', (event) => {
  const button = event.target.closest('[data-go-zone]');
  if (!button) return;
  state.family = button.dataset.goFamily;
  state.q = '';
  syncControls();
  showTab('comercios');
  setZone(button.dataset.goZone);
});

// ---------------------------------------------------------------- arranque
async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

async function start() {
  const today = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: LIMA_TZ }).format(new Date());
  els.today.textContent = today.charAt(0).toLocaleUpperCase('es') + today.slice(1);
  readHash();
  syncControls();
  showTab(state.tab);

  const [snapshot, contrast, prices] = await Promise.allSettled([
    loadJson('./data/comercios.json'), loadJson('./data/sunat-contraste.json'), loadJson('./data/precios.json')
  ]);
  if (contrast.status === 'fulfilled') {
    state.contrast = contrast.value.items;
    state.contrastMeta = contrast.value;
  }
  if (prices.status === 'fulfilled') state.prices = prices.value;
  if (snapshot.status === 'fulfilled') {
    state.snapshot = snapshot.value;
    setItems(snapshot.value.items);
    setStatus('loading', `Corte del ${fmtDate(snapshot.value.generated, true)} cargado · barriendo en vivo…`);
  }
  if (state.zone !== 'all') fitZone(state.zone);
  render();
  renderBasket();
  renderMethod();
  liveSweep();
}

start();
