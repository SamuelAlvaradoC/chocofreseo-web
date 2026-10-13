// Método y montos de pago de una venta, con la VENTA como fuente de verdad.
//
// monto_efectivo / monto_transferencia se guardan al crear la venta (y la API
// valida que en un mixto sumen el total). Los detallePagos, en cambio, solo
// existen DESPUÉS de marcar el pedido como entregado, y no se actualizan si la
// venta se edita luego (ej. #109 y #164: mixtos con un solo detallePago) -- por
// eso solo se usan como respaldo para ventas viejas sin montos en la venta.
export const pagoDeVenta = (v = {}) => {
  const detalles = v.pagos?.[0]?.detallePagos || [];
  const sumaDetalle = (nombre) => detalles
    .filter((d) => d.metodoPago?.nombre === nombre)
    .reduce((s, d) => s + Number(d.monto || 0), 0);

  const metodo = v.metodo_pago
    || (detalles.length > 1 ? 'mixto' : detalles[0]?.metodoPago?.nombre)
    || null;

  const total = Number(v.total || 0);
  const tieneMontosVenta = v.monto_efectivo != null || v.monto_transferencia != null;
  let efectivo;
  let transferencia;
  if (metodo === 'efectivo') {
    efectivo = total; transferencia = 0;
  } else if (metodo === 'transferencia') {
    efectivo = 0; transferencia = total;
  } else if (tieneMontosVenta) {
    efectivo = Number(v.monto_efectivo || 0);
    transferencia = Number(v.monto_transferencia || 0);
  } else {
    efectivo = sumaDetalle('efectivo');
    transferencia = sumaDetalle('transferencia');
  }
  return { metodo, efectivo, transferencia };
};

// "$60.000"
export const fmtCop = (n) => `$${Math.round(Number(n || 0)).toLocaleString('es-CO')}`;
