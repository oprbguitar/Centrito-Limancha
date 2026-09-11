// Modelo compartido entre el navegador (barrido en vivo) y scripts/scrape.mjs (corte en CI).
// Todo lo que se muestra sale de OpenStreetMap, del padrón SUNAT o de catálogos públicos de tiendas.

// Rectángulo de trabajo: Cercado de Lima (Abancay, Mesa Redonda, Barrios Altos, Av. Argentina)
// hasta Gamarra en La Victoria.
export const BBOX = { s: -12.0760, w: -77.0600, n: -12.0360, e: -77.0060 };

// Zonas aproximadas (rectángulos [s, w, n, e]). El orden importa: gana la primera que contiene el punto.
// Son áreas de trabajo para agrupar, no límites oficiales.
export const ZONES = [
  { id: 'mesa-redonda', name: 'Mesa Redonda · Mercado Central', hint: 'Jr. Andahuaylas, Jr. Cusco, Jr. Ucayali', box: [-12.0575, -77.0292, -12.0490, -77.0220] },
  { id: 'barrios-altos', name: 'Barrios Altos', hint: 'Jr. Huallaga, Jr. Junín, Jr. Ancash', box: [-12.0600, -77.0220, -12.0400, -77.0080] },
  { id: 'damero', name: 'Damero · Abancay · Jr. de la Unión', hint: 'Plaza de Armas, Av. Abancay, Jr. Lampa', box: [-12.0575, -77.0400, -12.0400, -77.0292] },
  { id: 'argentina', name: 'Av. Argentina · Las Malvinas', hint: 'Ferretería, electricidad, Campo Ferial', box: [-12.0540, -77.0600, -12.0360, -77.0400] },
  { id: 'grau', name: 'Av. Grau · Polvos Azules', hint: 'Paseo de los Héroes, Jr. Raimondi', box: [-12.0660, -77.0400, -12.0575, -77.0220] },
  { id: 'gamarra', name: 'Gamarra · La Victoria', hint: 'Emporio textil, Jr. Gamarra, Av. Aviación', box: [-12.0760, -77.0220, -12.0600, -77.0060] }
];
export const OTHER_ZONE = { id: 'resto', name: 'Resto de Lima Centro', hint: 'Fuera de las zonas anteriores' };

export const FAMILIES = [
  { id: 'centro', name: 'Galerías y mercados', tags: ['mall', 'department_store', 'marketplace', 'wholesale'] },
  { id: 'textil', name: 'Ropa, telas y calzado', tags: ['clothes', 'fabric', 'shoes', 'boutique', 'tailor', 'sewing', 'bag', 'leather', 'fashion_accessories', 'haberdashery', 'curtain', 'textile_printing', 'jewelry', 'watches', 'wool'] },
  { id: 'ferreteria', name: 'Ferretería y electricidad', tags: ['hardware', 'doityourself', 'trade', 'paint', 'electrical', 'lighting', 'glaziery', 'building_materials', 'tiles', 'bathroom_furnishing', 'locksmith', 'tool_hire', 'plumbing', 'energy', 'security', 'safety'] },
  { id: 'tecnologia', name: 'Tecnología y celulares', tags: ['electronics', 'mobile_phone', 'computer', 'telecommunication', 'appliance', 'hifi', 'camera', 'video_games', 'printer_ink', 'radiotechnics', 'video', 'music'] },
  { id: 'libreria', name: 'Librería, útiles e impresión', tags: ['stationery', 'books', 'copyshop', 'office_supplies', 'printing', 'printer'] },
  { id: 'bazar', name: 'Bazar, juguetes y regalos', tags: ['toys', 'gift', 'variety_store', 'party', 'craft', 'houseware', 'kitchen', 'games', 'art', 'interior_decoration', 'bed', 'household_linen', 'balloons', 'frame', 'florist', 'musical_instrument', 'sports', 'pet', 'religion', 'baby_goods', 'model'] },
  { id: 'abarrotes', name: 'Abarrotes y alimentos', tags: ['convenience', 'supermarket', 'greengrocer', 'bakery', 'butcher', 'confectionery', 'deli', 'beverages', 'alcohol', 'dairy', 'frozen_food', 'pastry', 'seafood', 'spices', 'tea', 'coffee', 'food', 'chocolate', 'nuts', 'kiosk', 'water', 'farm', 'health_food'] },
  { id: 'belleza', name: 'Belleza, salud y óptica', tags: ['beauty', 'cosmetics', 'hairdresser', 'optician', 'perfumery', 'chemist', 'medical_supply', 'hairdresser_supply', 'herbalist', 'nutrition_supplements', 'hearing_aids', 'massage', 'tattoo'] },
  { id: 'motor', name: 'Autopartes y motos', tags: ['car_parts', 'car_repair', 'motorcycle', 'tyres', 'car', 'motorcycle_repair', 'bicycle', 'fuel'] },
  { id: 'hogar', name: 'Muebles y hogar', tags: ['furniture', 'carpet', 'doors', 'flooring', 'antiques', 'second_hand', 'kitchenware', 'window_blind'] },
  { id: 'otros', name: 'Otros comercios', tags: [] }
];

export const CHANNELS = {
  mayorista: 'Mayorista',
  minorista: 'Minorista',
  galeria: 'Galería o mercado'
};

// Traducción de la etiqueta OSM a un giro legible. Las no listadas se muestran tal cual.
const SHOP_LABELS = {
  yes: 'Comercio', mall: 'Centro comercial', department_store: 'Tienda por departamentos', marketplace: 'Mercado',
  wholesale: 'Mayorista', clothes: 'Ropa', fabric: 'Telas', shoes: 'Calzado', boutique: 'Boutique', tailor: 'Sastrería',
  sewing: 'Mercería y costura', bag: 'Carteras y bolsos', leather: 'Cuero', jewelry: 'Joyería', watches: 'Relojería',
  hardware: 'Ferretería', doityourself: 'Mejoramiento del hogar', trade: 'Materiales y oficios', paint: 'Pinturas',
  electrical: 'Material eléctrico', lighting: 'Iluminación', glaziery: 'Vidriería', building_materials: 'Materiales de construcción',
  locksmith: 'Cerrajería', electronics: 'Electrónica', mobile_phone: 'Celulares', computer: 'Cómputo', appliance: 'Electrodomésticos',
  telecommunication: 'Telecomunicaciones', camera: 'Fotografía', video_games: 'Videojuegos', printer_ink: 'Tintas y tóner',
  stationery: 'Librería y útiles', books: 'Libros', copyshop: 'Copias e impresión', toys: 'Juguetería', gift: 'Regalos',
  variety_store: 'Bazar', party: 'Artículos de fiesta', craft: 'Manualidades', houseware: 'Menaje', kitchen: 'Cocina',
  musical_instrument: 'Instrumentos musicales', sports: 'Deportes', convenience: 'Bodega o minimarket', supermarket: 'Supermercado',
  bakery: 'Panadería', butcher: 'Carnicería', confectionery: 'Dulcería', beverages: 'Bebidas', kiosk: 'Quiosco',
  beauty: 'Salón de belleza', cosmetics: 'Cosméticos', hairdresser: 'Peluquería', optician: 'Óptica', perfumery: 'Perfumería',
  chemist: 'Droguería', medical_supply: 'Insumos médicos', car_parts: 'Autopartes', car_repair: 'Taller mecánico',
  motorcycle: 'Motos', tyres: 'Llantas', furniture: 'Muebles', second_hand: 'Segunda mano', laundry: 'Lavandería',
  travel_agency: 'Agencia de viajes', ticket: 'Venta de entradas', florist: 'Florería', pet: 'Mascotas', bicycle: 'Bicicletas'
};

const WHOLESALE_NAME = /(distribuidora|distribuciones|importadora|importaciones|mayorista|por mayor|al por mayor|comercializadora)/i;
const CIIU_WHOLESALE = /VENTA AL POR MAYOR/i;

export function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('es')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function zoneFor(lat, lon) {
  const zone = ZONES.find(({ box: [s, w, n, e] }) => lat >= s && lat <= n && lon >= w && lon <= e);
  return (zone || OTHER_ZONE).id;
}

function familyFor(shopTag) {
  return (FAMILIES.find((family) => family.tags.includes(shopTag)) || FAMILIES[FAMILIES.length - 1]).id;
}

export function overpassQuery(bbox = BBOX) {
  const b = `${bbox.s},${bbox.w},${bbox.n},${bbox.e}`;
  return `[out:json][timeout:60];(nwr["shop"](${b});nwr["amenity"="marketplace"](${b});nwr["wholesale"](${b}););out center meta;`;
}

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

// Convierte un elemento crudo de Overpass en un registro compacto. Devuelve null si no es comercio.
export function normalizeElement(element) {
  const tags = element.tags || {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (lat == null || lon == null) return null;
  if (tags.shop === 'vacant' || tags.disused || tags['disused:shop']) return null;

  const shopTag = tags.amenity === 'marketplace' ? 'marketplace' : (tags.shop || (tags.wholesale ? 'wholesale' : 'yes'));
  const typeLabel = SHOP_LABELS[shopTag] || shopTag.replace(/_/g, ' ');
  const family = familyFor(shopTag);

  let channel = 'minorista';
  let channelReason = 'Sin señal de venta mayorista';
  if (['mall', 'marketplace', 'department_store'].includes(shopTag)) {
    channel = 'galeria';
    channelReason = 'Concentra varios locales';
  } else if (shopTag === 'wholesale' || tags.wholesale) {
    channel = 'mayorista';
    channelReason = 'Etiqueta OSM de venta al por mayor';
  } else if (WHOLESALE_NAME.test(tags.name || '')) {
    channel = 'mayorista';
    channelReason = 'El nombre indica distribución o importación';
  }

  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  return {
    id: `${element.type}/${element.id}`,
    name: tags.name || tags.brand || '',
    type: typeLabel,
    shopTag,
    family,
    channel,
    channelReason,
    zone: zoneFor(lat, lon),
    lat: Math.round(lat * 1e6) / 1e6,
    lon: Math.round(lon * 1e6) / 1e6,
    address: street || tags['addr:full'] || '',
    phone: tags.phone || tags['contact:phone'] || tags['contact:mobile'] || '',
    website: tags.website || tags['contact:website'] || tags['contact:facebook'] || '',
    hours: tags.opening_hours || '',
    products: tags.wholesale && tags.wholesale !== 'yes' ? tags.wholesale.replace(/[_;]/g, ' ') : '',
    edited: (element.timestamp || '').slice(0, 10)
  };
}

// Aplica el contraste SUNAT: el CIIU mayorista también cuenta como señal de canal.
export function applyContrast(record, contrast) {
  if (!contrast) return record;
  const next = { ...record, sunat: contrast };
  if (next.channel === 'minorista' && CIIU_WHOLESALE.test(contrast.ciiu || '')) {
    next.channel = 'mayorista';
    next.channelReason = 'Actividad SUNAT: venta al por mayor';
  }
  return next;
}
