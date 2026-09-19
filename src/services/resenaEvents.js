// Igual patrón que SESSION_EXPIRED_EVENT (authEvents.js): CtaFinal dispara
// este evento al enviar una reseña vinculada a un pedido, y ResenaBanner
// (montado en App.jsx, ya con su propio fetch de "mis pedidos" hecho) lo
// escucha para quitar ese pedido de sus pendientes sin tener que volver a
// pedir nada al backend.
export const RESENA_ENVIADA_EVENT = 'resena-enviada';

export const notificarResenaEnviada = (id_venta) => {
  if (!id_venta) return;
  window.dispatchEvent(new CustomEvent(RESENA_ENVIADA_EVENT, { detail: { id_venta } }));
};
