// Salsas que se pueden elegir en el catálogo. El `id` es lo que se guarda en
// el pedido y en el carrito del servidor; aquí se recupera nombre e imagen.
export const SALSAS_DISPONIBLES = [
  { id: 'arequipe',         nombre: 'Arequipe',          img: '/img/salsas/arequipe.png' },
  { id: 'chocolate_negro',  nombre: 'Chocolate Negro',   img: '/img/salsas/chocolate-negro.png' },
  { id: 'chocolate_blanco', nombre: 'Chocolate Blanco',  img: '/img/salsas/chocolate-blanco.png' },
  { id: 'mermelada_mora',   nombre: 'Mermelada de Mora', img: '/img/salsas/mermelada-mora.png' },
];

// "arequipe" -> { id, nombre, img }. Lo que no es una salsa conocida (ej. la
// cobertura de un bowl, que se guarda por nombre) queda como { nombre }.
export const salsaDesdeId = (valor) =>
  SALSAS_DISPONIBLES.find((s) => s.id === valor) || { nombre: String(valor) };
