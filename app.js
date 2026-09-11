const CENTER = [-12.0512, -77.0312];
const DEFAULT_ZOOM = 14;

const locations = [
  {
    id: 'mesa-redonda',
    name: 'Emporio Mesa Redonda',
    zone: 'Jr. Andahuaylas · Jirón Cusco · alrededores de Abancay',
    providerType: 'Emporio comercial',
    products: ['Bazar y regalos', 'Juguetería', 'Importación', 'Celulares', 'Útiles'],
    category: 'green',
    markerLabel: 'MR',
    sourceLabel: 'Directorio público',
    sourceUrl: 'https://kom.pe/catalogos-virtuales/cercado-de-lima/',
    sourceName: 'KOM · Cercado de Lima',
    note: 'La referencia pública describe una zona comercial diversa en Cercado de Lima.'
  },
  {
    id: 'mercado-central',
    name: 'Mercado Central',
    zone: 'Jirón Cusco · Barrios Altos',
    providerType: 'Mercado',
    products: ['Cocina', 'Moldes y bandejas', 'Abarrotes', 'Regalos'],
    category: 'green',
    markerLabel: 'MC',
    sourceLabel: 'Investigación pública',
    sourceUrl: 'https://rutamayoristaonline.com/blogs/zonas-comerciales-del-peru/mercado-central-lima-productos-mayoristas-que-puedes-encontrar',
    sourceName: 'Ruta Mayorista Online',
    note: 'La referencia apunta a compras mayoristas y a la concentración comercial del Centro de Lima.'
  },
  {
    id: 'campo-ferial',
    name: 'Campo Ferial Mesa Redonda',
    zone: 'Av. Argentina 428 · altura de Plaza Unión',
    providerType: 'Asociación comercial',
    products: ['Celulares y accesorios', 'Computadoras', 'Servicio técnico', 'Gastronomía'],
    category: 'blue',
    markerLabel: 'CF',
    sourceLabel: 'Sitio del complejo',
    sourceUrl: 'https://cfmesaredonda.com/',
    sourceName: 'Campo Ferial Mesa Redonda',
    note: 'La propia organización publica los giros de sus stands y su dirección de contacto.'
  },
  {
    id: 'las-malvinas',
    name: 'Las Malvinas',
    zone: 'Corredor de Av. Argentina · Cercado de Lima',
    providerType: 'Centro ferretero',
    products: ['Ferretería', 'Electricidad', 'Iluminación', 'Limpieza', 'Sanitario', 'EPP'],
    category: 'orange',
    markerLabel: 'LM',
    sourceLabel: 'Catálogo público',
    sourceUrl: 'https://www.lasmalvinaslima.com/productos',
    sourceName: 'Las Malvinas Lima',
    note: 'El catálogo público enumera categorías de ferretería, obra, mantenimiento y protección.'
  },
  {
    id: 'polvos-azules',
    name: 'Polvos Azules',
    zone: 'Jr. Antonio Raimondi · Av. José Gálvez · La Victoria',
    providerType: 'Centro comercial',
    products: ['Ropa', 'Calzado', 'Tecnología', 'Accesorios', 'Perfumería'],
    category: 'blue',
    markerLabel: 'PA',
    sourceLabel: 'Directorio de tiendas',
    sourceUrl: 'https://ccpolvosazuleslimaperu.com/',
    sourceName: 'C.C. Polvos Azules Virtual',
    note: 'El directorio enlaza tiendas y giros publicados por el centro comercial.'
  },
  {
    id: 'abancay',
    name: 'Eje de avenida Abancay',
    zone: 'Av. Abancay · entorno del Congreso y Barrios Altos',
    providerType: 'Corredor comercial',
    products: ['Librería', 'Útiles', 'Regalos', 'Servicios'],
    category: 'green',
    markerLabel: 'AB',
    sourceLabel: 'Punto de orientación',
    sourceUrl: 'https://www.openstreetmap.org/',
    sourceName: 'OpenStreetMap',
    note: 'Punto de referencia geográfico para iniciar el recorrido; no representa un local específico.'
  }
];

const map = L.map('map', { zoomControl: false, scrollWheelZoom: false }).setView(CENTER, DEFAULT_ZOOM);
L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const scope = L.rectangle([
  [-12.0665, -77.058],
  [-12.0365, -77.014]
], {
  color: '#2f9e44',
  weight: 1,
  opacity: .85,
  fillColor: '#2f9e44',
  fillOpacity: .04,
  dashArray: '5 5',
  interactive: false
}).addTo(map);

const markers = new Map();
const markerLayer = L.layerGroup().addTo(map);

function markerIcon(location) {
  return L.divIcon({
    className: '',
    html: `<span class="custom-marker marker-${location.category}" aria-hidden="true">${location.markerLabel}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}

function createMarkers() {
  locations.forEach((location) => {
    const marker = L.marker(location.coords, { icon: markerIcon(location), title: location.name });
    marker.bindPopup(`<div class="popup-type">${location.providerType}</div><p class="popup-name">${location.name}</p><p class="popup-products">${location.products.join(' · ')}</p>`);
    marker.on('click', () => selectResult(location.id, false));
    markers.set(location.id, marker);
  });
}

// Coordinates are public map references for the named complexes/axes, not exact store-door locations.
locations[0].coords = [-12.0532571, -77.0271094];
locations[1].coords = [-12.0526789, -77.0275729];
locations[2].coords = [-12.0448, -77.0458];
locations[3].coords = [-12.0459, -77.0482];
locations[4].coords = [-12.0612567, -77.0332685];
locations[5].coords = [-12.0479692, -77.0254190];
createMarkers();

const form = document.querySelector('#filters-form');
const searchInput = document.querySelector('#search-input');
const providerSelect = document.querySelector('#provider-select');
const productSelect = document.querySelector('#product-select');
const resultsList = document.querySelector('#results-list');
const emptyState = document.querySelector('#empty-state');
const resultCount = document.querySelector('#result-count');
const resultLabel = document.querySelector('#result-label');
const mapCount = document.querySelector('#map-count');
const filterState = document.querySelector('#results-filter-state');

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'es'));
}

function populateFilters() {
  uniqueSorted(locations.map((location) => location.providerType)).forEach((type) => {
    providerSelect.insertAdjacentHTML('beforeend', `<option value="${type}">${type}</option>`);
  });
  uniqueSorted(locations.flatMap((location) => location.products)).forEach((product) => {
    productSelect.insertAdjacentHTML('beforeend', `<option value="${product}">${product}</option>`);
  });
}

function getFilteredLocations() {
  const query = searchInput.value.trim().toLocaleLowerCase('es');
  const provider = providerSelect.value;
  const product = productSelect.value;
  return locations.filter((location) => {
    const searchable = [location.name, location.zone, location.providerType, ...location.products].join(' ').toLocaleLowerCase('es');
    return (!query || searchable.includes(query))
      && (provider === 'all' || location.providerType === provider)
      && (product === 'all' || location.products.includes(product));
  });
}

function renderResults(items) {
  resultsList.innerHTML = items.map((location, index) => `
    <article class="result-row" data-result-id="${location.id}" tabindex="0" aria-label="${location.name}, ${location.providerType}">
      <span class="result-index">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <div class="result-topline">
          <h3 class="result-name">${location.name}</h3>
          <span class="result-type">${location.providerType}</span>
        </div>
        <p class="result-zone">${location.zone}</p>
        <ul class="product-list" aria-label="Productos o giros">
          ${location.products.map((product) => `<li>${product}</li>`).join('')}
        </ul>
        <div class="result-bottom">
          <span class="source-tag">${location.sourceLabel}</span>
          <a class="source-link" href="${location.sourceUrl}" target="_blank" rel="noreferrer" aria-label="Abrir fuente de ${location.name}">${location.sourceName} ↗</a>
        </div>
      </div>
    </article>
  `).join('');

  resultsList.querySelectorAll('[data-result-id]').forEach((row) => {
    row.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      selectResult(row.dataset.resultId, true);
    });
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectResult(row.dataset.resultId, true);
      }
    });
  });
}

function selectResult(id, flyTo) {
  const location = locations.find((item) => item.id === id);
  if (!location) return;
  resultsList.querySelectorAll('.result-row').forEach((row) => row.classList.toggle('is-selected', row.dataset.resultId === id));
  markers.forEach((marker, markerId) => {
    const element = marker.getElement()?.querySelector('.custom-marker');
    if (element) element.classList.toggle('is-selected', markerId === id);
  });
  if (flyTo) {
    map.flyTo(location.coords, 16, { duration: .45 });
    markers.get(id)?.openPopup();
  }
}

function updateMapMarkers(items) {
  markerLayer.clearLayers();
  items.forEach((location) => markerLayer.addLayer(markers.get(location.id)));
  mapCount.textContent = `${items.length} ${items.length === 1 ? 'punto' : 'puntos'}`;
}

function updateFilterState() {
  const active = [];
  if (searchInput.value.trim()) active.push(`“${searchInput.value.trim()}”`);
  if (providerSelect.value !== 'all') active.push(providerSelect.options[providerSelect.selectedIndex].text);
  if (productSelect.value !== 'all') active.push(productSelect.options[productSelect.selectedIndex].text);
  filterState.textContent = active.length ? active.join(' · ') : 'sin filtros';
}

function applyFilters() {
  const items = getFilteredLocations();
  renderResults(items);
  updateMapMarkers(items);
  updateFilterState();
  resultCount.textContent = items.length;
  resultLabel.textContent = items.length === 1 ? 'referencia' : 'referencias';
  emptyState.hidden = items.length > 0;
  resultsList.hidden = items.length === 0;
  if (items.length > 0) selectResult(items[0].id, false);
}

function resetFilters() {
  form.reset();
  applyFilters();
}

form.addEventListener('submit', (event) => { event.preventDefault(); applyFilters(); });
searchInput.addEventListener('input', applyFilters);
providerSelect.addEventListener('change', applyFilters);
productSelect.addEventListener('change', applyFilters);
document.querySelector('#reset-filters').addEventListener('click', resetFilters);
document.querySelector('#empty-reset').addEventListener('click', resetFilters);
document.querySelector('#center-map').addEventListener('click', () => map.fitBounds(scope.getBounds(), { padding: [24, 24] }));

populateFilters();
applyFilters();

window.addEventListener('load', () => setTimeout(() => map.invalidateSize(), 120));
