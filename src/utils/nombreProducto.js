// Combinaciones fijas de fruta para productos con permite_frutas=true.
// El valor `id` es lo único que se guarda en detalle_venta.frutas — el nombre
// visible siempre se arma con nombreConFrutas(), nunca se guarda como texto.
export const COMBOS_FRUTAS = [
  { id: 'fresa_cereza',   etiqueta: 'Fresa/Cereza',   img: 'https://res.cloudinary.com/diqeuyoqo/image/upload/v1789244675/cereza_fresa_cfbhf2.jpg' },
  { id: 'fresa_durazno',  etiqueta: 'Fresa/Durazno',  img: 'https://res.cloudinary.com/diqeuyoqo/image/upload/v1789244723/fresa_durzano_lkobxl.jpg' },
  { id: 'cereza_durazno', etiqueta: 'Cereza/Durazno', img: 'https://res.cloudinary.com/diqeuyoqo/image/upload/v1789244748/2f8a8676-e6b8-4095-ba63-186aef146e98_ftrj9k.png' },
];

const ETIQUETA_POR_ID = Object.fromEntries(COMBOS_FRUTAS.map((c) => [c.id, c.etiqueta]));

// Nombre visible del producto en carrito/checkout/detalle/historial. Único punto
// que arma este texto — todo lo demás debe importar y llamar esta función en
// vez de reconstruir el nombre por su cuenta.
export function nombreConFrutas(nombreBase, frutas) {
  if (!nombreBase) return nombreBase;
  const etiqueta = frutas ? ETIQUETA_POR_ID[frutas] : null;
  return etiqueta ? `${nombreBase} ${etiqueta}` : nombreBase;
}
