// Canasta de referencia: productos típicos de Lima Centro que también venden tiendas con catálogo público.
// Sus precios online se recogen en CI (scripts/scrape.mjs) y sirven para contrastar lo que ofrece un puesto.
export const STORES = [
  { id: 'promart', name: 'Promart', home: 'https://www.promart.pe' },
  { id: 'plazavea', name: 'Plaza Vea', home: 'https://www.plazavea.com.pe' },
  { id: 'oechsle', name: 'Oechsle', home: 'https://www.oechsle.pe' },
  { id: 'coolbox', name: 'Coolbox', home: 'https://www.coolbox.pe' }
];

// Tiendas para buscar en vivo desde el verificador (abren la búsqueda en la tienda; no se raspan).
export const LIVE_SEARCH = [
  ...STORES.map((store) => ({ name: store.name, url: (q) => `${store.home}/${encodeURIComponent(q)}?_q=${encodeURIComponent(q)}&map=ft` })),
  { name: 'Mercado Libre', url: (q) => `https://listado.mercadolibre.com.pe/${encodeURIComponent(q.trim().replace(/\s+/g, '-'))}` }
];

export const BASKET = [
  { id: 'cuaderno', query: 'cuaderno a4', family: 'libreria' },
  { id: 'papel-bond', query: 'papel bond a4', family: 'libreria' },
  { id: 'lapicero', query: 'lapicero', family: 'libreria' },
  { id: 'mochila', query: 'mochila escolar', family: 'libreria' },
  { id: 'foco-led', query: 'foco led', family: 'ferreteria' },
  { id: 'cinta-aislante', query: 'cinta aislante', family: 'ferreteria' },
  { id: 'taladro', query: 'taladro percutor', family: 'ferreteria' },
  { id: 'candado', query: 'candado', family: 'ferreteria' },
  { id: 'extension', query: 'extension electrica', family: 'ferreteria' },
  { id: 'cargador', query: 'cargador tipo c', family: 'tecnologia' },
  { id: 'audifonos', query: 'audifonos bluetooth', family: 'tecnologia' },
  { id: 'power-bank', query: 'power bank', family: 'tecnologia' },
  { id: 'mouse', query: 'mouse inalambrico', family: 'tecnologia' },
  { id: 'peluche', query: 'peluche', family: 'bazar' },
  { id: 'molde', query: 'molde para torta', family: 'bazar' },
  { id: 'taper', query: 'taper', family: 'bazar' },
  { id: 'ollas', query: 'juego de ollas', family: 'bazar' },
  { id: 'polo', query: 'polo algodon', family: 'textil' },
  { id: 'jean', query: 'jean', family: 'textil' },
  { id: 'zapatillas', query: 'zapatillas', family: 'textil' },
  { id: 'arroz', query: 'arroz 5 kg', family: 'abarrotes' },
  { id: 'aceite', query: 'aceite vegetal', family: 'abarrotes' },
  { id: 'azucar', query: 'azucar rubia', family: 'abarrotes' },
  { id: 'shampoo', query: 'shampoo', family: 'belleza' },
  { id: 'aceite-motor', query: 'aceite de motor', family: 'motor' }
];
