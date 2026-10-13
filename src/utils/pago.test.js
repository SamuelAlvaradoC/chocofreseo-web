import { pagoDeVenta, fmtCop } from './pago';

const detalle = (...pares) => [{ detallePagos: pares.map(([nombre, monto]) => ({ monto: String(monto), metodoPago: { nombre } })) }];

describe('pagoDeVenta', () => {
  test('mixto sin entregar (sin detallePagos): montos de la venta', () => {
    expect(pagoDeVenta({ metodo_pago: 'mixto', total: '60000', monto_efectivo: '7000', monto_transferencia: '53000', pagos: [] }))
      .toEqual({ metodo: 'mixto', efectivo: 7000, transferencia: 53000 });
  });

  test('mixto editado después de entregar (detallePagos viejo de un solo método): manda la venta', () => {
    expect(pagoDeVenta({ metodo_pago: 'mixto', total: '53000', monto_efectivo: '1000', monto_transferencia: '52000', pagos: detalle(['transferencia', 53000]) }))
      .toEqual({ metodo: 'mixto', efectivo: 1000, transferencia: 52000 });
  });

  test('venta vieja sin montos ni método: cae a detallePagos', () => {
    expect(pagoDeVenta({ total: '60000', pagos: detalle(['efectivo', 7000], ['transferencia', 53000]) }))
      .toEqual({ metodo: 'mixto', efectivo: 7000, transferencia: 53000 });
  });

  test('efectivo y transferencia puros usan el total', () => {
    expect(pagoDeVenta({ metodo_pago: 'efectivo', total: '40000' })).toEqual({ metodo: 'efectivo', efectivo: 40000, transferencia: 0 });
    expect(pagoDeVenta({ metodo_pago: 'transferencia', total: '40000' })).toEqual({ metodo: 'transferencia', efectivo: 0, transferencia: 40000 });
  });
});

test('fmtCop', () => {
  expect(fmtCop(60000)).toBe('$60.000');
  expect(fmtCop('7000')).toBe('$7.000');
  expect(fmtCop(null)).toBe('$0');
});
