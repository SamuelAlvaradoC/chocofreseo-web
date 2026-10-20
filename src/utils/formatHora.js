export function formatHora12(hora24) {
  const h = Number(hora24);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:00 ${period}`;
}

// ¿La tienda acepta pedidos "en espera"? Es el modo "Por horario" fuera de
// horario: el cliente puede pedir y el pedido se prepara al abrir. (Con la
// tienda "Cerrada" manual no se aceptan pedidos.) Lo calcula la API.
export function aceptaPedidosEnEspera(estadoTienda) {
  return !!estadoTienda && !estadoTienda.abierto && estadoTienda.acepta_pedidos_en_espera === true;
}

// "hoy a la 1:00 PM" o "mañana martes 20 a la 1:00 PM" (textos de la API)
export function textoApertura(estadoTienda) {
  return `${estadoTienda.texto_dia} a la ${estadoTienda.texto_hora}`;
}

// Mensaje para el cliente cuando la tienda no está atendiendo (catálogo,
// carrito y checkout). Usa el horario real de domicilios de la configuración.
export function mensajeTiendaCerrada(estadoTienda) {
  if (estadoTienda?.estado === 'closed') {
    return 'Estamos cerrados por ahora. Puedes dejar tu pedido armado y hacerlo cuando volvamos a abrir.';
  }
  if (aceptaPedidosEnEspera(estadoTienda)) {
    return `Estamos fuera de horario. Puedes hacer tu pedido ahora y empezaremos a prepararlo ${textoApertura(estadoTienda)}.`;
  }
  return `Estamos cerrados. Puedes dejar tu pedido armado y hacerlo desde la ${formatHora12(estadoTienda?.hora_apertura ?? 13)}.`;
}

// ── Pedidos hechos fuera de horario ─────────────────────────────────────
// Esos pedidos se guardan con venta.fecha = la hora de apertura y
// venta.fecha_real = la hora real en que se hicieron. Todo en hora Colombia.
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DESFASE_COLOMBIA_MS = 5 * 60 * 60 * 1000;
const enColombia = (fecha) => new Date(new Date(fecha).getTime() - DESFASE_COLOMBIA_MS);
const hora12 = (d) => `${d.getUTCHours() % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${d.getUTCHours() < 12 ? 'AM' : 'PM'}`;

// Para el cliente: "Empezaremos a prepararlo hoy a la 1:00 PM" (o "mañana
// martes 20 a la 1:00 PM"). Devuelve null si el pedido no es de los que
// quedaron en espera o si ya llegó la hora de apertura.
export function textoPreparacionEnEspera(venta, ahora = new Date()) {
  if (!venta?.fecha_real || !venta.fecha) return null;
  if (new Date(venta.fecha) <= ahora) return null;
  const apertura = enColombia(venta.fecha);
  const hoy = enColombia(ahora);
  const mismoDia = (a, b) => a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
  const dia = mismoDia(apertura, hoy) ? 'hoy' : `mañana ${DIAS[apertura.getUTCDay()]} ${apertura.getUTCDate()}`;
  return `Empezaremos a prepararlo ${dia} a la ${hora12(apertura)}`;
}

// Para el equipo: "lunes 10:05 PM" (la hora real en que el cliente lo pidió)
export function horaRealPedido(fechaReal) {
  const d = enColombia(fechaReal);
  return `${DIAS[d.getUTCDay()]} ${hora12(d)}`;
}
