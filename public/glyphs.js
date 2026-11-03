/* Mi Cartera — iconos de línea para categorías, objetivos y préstamos (sin emojis).
   Lo usan la app y el servidor: el servidor guarda la clave y la app dibuja el SVG. */

export const GLYPHS = {
  home: { label: 'Vivienda', d: '<path d="M3 10.2 12 3l9 7.2"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>' },
  cart: { label: 'Supermercado', d: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h2.6l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2l1.5-7.2H6"/>' },
  car: { label: 'Coche', d: '<path d="M5 17H3.5v-4.2l2-5.3A2 2 0 0 1 7.4 6h9.2a2 2 0 0 1 1.9 1.5l2 5.3V17H19"/><path d="M3.5 12.5h17"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5"/>' },
  fuel: { label: 'Combustible', d: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M2.5 21h13M4 10h10"/><path d="M14 8h2a2 2 0 0 1 2 2v6.5a1.5 1.5 0 0 0 3 0V8l-3-3"/>' },
  utensils: { label: 'Restaurantes', d: '<path d="M6 3v7a2 2 0 0 0 2 2v9"/><path d="M10 3v7a2 2 0 0 1-2 2"/><path d="M8 3v5"/><path d="M17 21V3c-2.2 1.2-3.5 3.6-3.5 6.5V14H17"/>' },
  coffee: { label: 'Cafetería', d: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 2.5V5M12 2.5V5"/>' },
  pill: { label: 'Salud', d: '<path d="M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7z"/><path d="m8.5 8.5 7 7"/>' },
  heart: { label: 'Bienestar', d: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>' },
  dumbbell: { label: 'Deporte', d: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>' },
  film: { label: 'Ocio', d: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>' },
  music: { label: 'Música', d: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' },
  bag: { label: 'Compras', d: '<path d="M5 8h14l-1 12.5H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>' },
  tv: { label: 'Suscripciones', d: '<rect x="3" y="6" width="18" height="12.5" rx="2.5"/><path d="m8 2.5 4 3.5 4-3.5"/><path d="M8 21.5h8"/>' },
  wifi: { label: 'Internet', d: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>' },
  phone: { label: 'Móvil', d: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>' },
  bolt: { label: 'Luz', d: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>' },
  droplet: { label: 'Agua', d: '<path d="M12 2.5s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 9.5 12 2.5 12 2.5Z"/>' },
  book: { label: 'Educación', d: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h13"/><path d="M8 7h7"/>' },
  graduation: { label: 'Estudios', d: '<path d="M2 9.5 12 5l10 4.5-10 4.5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9.5v5"/>' },
  plane: { label: 'Viajes', d: '<path d="M10.5 13.5 4 11l1.5-1.5 7 .5 4-4a2.1 2.1 0 0 1 3 3l-4 4 .5 7L14.5 21 12 14.5"/><path d="m6.5 17.5-2-2 2.5-.5M8.5 19.5l.5-2.5"/>' },
  umbrella: { label: 'Vacaciones', d: '<path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Z"/><path d="M12 12v6.5a2 2 0 0 0 4 0"/>' },
  paw: { label: 'Mascotas', d: '<circle cx="6.5" cy="10" r="1.8"/><circle cx="10" cy="5.8" r="1.8"/><circle cx="14.5" cy="5.8" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M8.3 19c-1.7 0-2.6-1.4-2-3 .7-2 2.8-4.8 5.7-4.8s5 2.8 5.7 4.8c.6 1.6-.3 3-2 3-1.3 0-2.1-.6-3.7-.6s-2.4.6-3.7.6Z"/>' },
  baby: { label: 'Hijos', d: '<circle cx="12" cy="12" r="9"/><path d="M9 10.5h.01M15 10.5h.01"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/><path d="M12 3c0 1.2.8 2 2 2"/>' },
  gift: { label: 'Regalos', d: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8H8.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8Zm0 0h3.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8Z"/>' },
  receipt: { label: 'Impuestos', d: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>' },
  invoice: { label: 'Facturación', d: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h7M9 16h5"/>' },
  shield: { label: 'Seguros', d: '<path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z"/>' },
  briefcase: { label: 'Trabajo', d: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M3 12.5h18"/>' },
  laptop: { label: 'Freelance', d: '<rect x="5" y="4.5" width="14" height="10" rx="1.5"/><path d="M2.5 19h19l-1.5-4.5H4z"/>' },
  trend: { label: 'Inversión', d: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>' },
  bank: { label: 'Banco', d: '<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 21h18"/>' },
  coins: { label: 'Ahorro', d: '<ellipse cx="9" cy="7" rx="5" ry="2.5"/><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7"/><path d="M4 11v4c0 1.4 2.2 2.5 5 2.5"/><path d="M11 15.5c.6 1.1 2.6 2 5 2 2.8 0 5-1.1 5-2.5V11"/>' },
  card: { label: 'Tarjeta', d: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>' },
  tag: { label: 'Ventas', d: '<path d="M3 12.6V4.5A1.5 1.5 0 0 1 4.5 3h8.1c.4 0 .8.2 1.1.4l7 7a1.5 1.5 0 0 1 0 2.1l-8.2 8.2a1.5 1.5 0 0 1-2.1 0l-7-7A1.5 1.5 0 0 1 3 12.6Z"/><circle cx="8" cy="8" r="1.5"/>' },
  wrench: { label: 'Reparaciones', d: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>' },
  target: { label: 'Objetivo', d: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12h.01"/>' },
  lifebuoy: { label: 'Emergencias', d: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m5.6 5.6 3.6 3.6M14.8 14.8l3.6 3.6M14.8 9.2l3.6-3.6M5.6 18.4l3.6-3.6"/>' },
  ring: { label: 'Boda', d: '<circle cx="12" cy="14.5" r="6.5"/><path d="m9 3 3 4.5L15 3z"/>' },
  bike: { label: 'Moto o bici', d: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5 9 9h5.5l4 7.5M9 9l3.5 7.5h6M13 5.5h2.5L14.5 9"/>' },
  globe: { label: 'Internacional', d: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>' },
  star: { label: 'Destacado', d: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>' },
  file: { label: 'Documento', d: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>' },
  box: { label: 'Otros', d: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>' },
  plusCircle: { label: 'Otros ingresos', d: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>' }
};

export const GLYPH_KEYS = Object.keys(GLYPHS);

/** Equivalencias de los emojis que usaban las versiones anteriores. */
const EMOJI_GLYPH = {
  '🏠': 'home', '🛒': 'cart', '🚗': 'car', '🍽': 'utensils', '💊': 'pill', '🎬': 'film', '🛍': 'bag',
  '📺': 'tv', '📚': 'book', '✈': 'plane', '🐾': 'paw', '🧾': 'receipt', '📦': 'box', '💼': 'briefcase',
  '🧑‍💻': 'laptop', '💻': 'laptop', '📈': 'trend', '🏦': 'bank', '🏷': 'tag', '🎁': 'gift', '➕': 'plusCircle',
  '⚡': 'bolt', '🎵': 'music', '🏋': 'dumbbell', '☕': 'coffee', '🎓': 'graduation', '🔧': 'wrench',
  '🎯': 'target', '🛟': 'lifebuoy', '💍': 'ring', '🏖': 'umbrella', '👶': 'baby', '🐶': 'paw', '🎸': 'music',
  '🏍': 'bike', '📱': 'phone', '💳': 'card', '📄': 'file', '⛽': 'fuel', '💧': 'droplet', '❤': 'heart',
  '🌍': 'globe', '⭐': 'star', '🛡': 'shield', '💰': 'coins', '🐷': 'coins'
};

/** Devuelve siempre una clave de icono válida (convierte emojis antiguos). */
export function normalizeGlyph(value, fallback = 'box') {
  const v = String(value ?? '').trim();
  if (GLYPHS[v]) return v;
  const plain = v.replace(/\uFE0F/g, '');
  if (EMOJI_GLYPH[plain]) return EMOJI_GLYPH[plain];
  // Emoji con modificadores (tono de piel, ZWJ): se prueba el primer carácter.
  const first = Array.from(plain)[0];
  if (first && EMOJI_GLYPH[first]) return EMOJI_GLYPH[first];
  return GLYPHS[fallback] ? fallback : 'box';
}

/** SVG del icono, listo para insertar. */
export function glyphSVG(value, size = 18, fallback = 'box') {
  const key = normalizeGlyph(value, fallback);
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[key].d}</svg>`;
}
