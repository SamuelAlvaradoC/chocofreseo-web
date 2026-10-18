export function formatHora12(hora24) {
  const h = Number(hora24);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:00 ${period}`;
}

// Mensaje para el cliente cuando la tienda está cerrada (catálogo, carrito y
// checkout). Usa el horario real de domicilios de la configuración.
export function mensajeTiendaCerrada(estadoTienda) {
  if (estadoTienda?.estado === 'closed') {
    return 'Estamos cerrados por ahora. Puedes dejar tu pedido armado y hacerlo cuando volvamos a abrir.';
  }
  return `Estamos cerrados. Puedes dejar tu pedido armado y hacerlo desde la ${formatHora12(estadoTienda?.hora_apertura ?? 13)}.`;
}
