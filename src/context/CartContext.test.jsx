import { render, act, waitFor } from '@testing-library/react';
import { CartProvider, useCart, combinarCarritos, aCanonico, desdeLinea } from './CartContext';
import * as api from '../services/api';

jest.mock('../services/api', () => ({
  getCarritoGuardado: jest.fn(),
  guardarCarrito: jest.fn(),
  validarCarrito: jest.fn(),
}));

const producto = { id_producto: 1, nombre: 'Fresas con crema', precio: 20000, permite_toppings: 1, max_toppings: 2, img: 'x' };
const itemFresas = { ...producto, toppings: [{ id_topping: 10, nombre: 'Oreo', cantidad: 1 }], adiciones: [], salsas: [{ id: 'arequipe', nombre: 'Arequipe' }] };

// Línea como la devuelve POST /carrito/validar
const lineaValidada = (o = {}) => ({
  id_producto: 1, cantidad: 1, disponible: true, cambios: [],
  toppings: [{ id_topping: 10, nombre: 'Oreo', cantidad: 1 }], adiciones: [], salsas: ['arequipe'],
  chocolate: null, frutas: null, observacion: null,
  producto: { ...producto }, cargo_extra: 0, precio_unitario: 20000, ...o,
});

let ctx;
const Espia = () => { ctx = useCart(); return null; };
const montar = () => render(<CartProvider><Espia /></CartProvider>);

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  api.guardarCarrito.mockResolvedValue({});
  api.getCarritoGuardado.mockResolvedValue({ items: [] });
});

describe('funciones del carrito', () => {
  test('aCanonico -> validar -> desdeLinea conserva la misma línea (mismo lineaId)', () => {
    const conId = { ...itemFresas, lineaId: desdeLinea(lineaValidada()).lineaId };
    expect(aCanonico(conId)).toEqual({ id_producto: 1, cantidad: undefined, toppings: [{ id_topping: 10, cantidad: 1 }], adiciones: [], salsas: ['arequipe'], chocolate: null, frutas: null, observacion: null });
    expect(desdeLinea(lineaValidada()).salsas[0]).toMatchObject({ id: 'arequipe', nombre: 'Arequipe' });
  });

  test('combinarCarritos no duplica: misma línea queda una vez con la cantidad mayor', () => {
    const a = desdeLinea(lineaValidada({ cantidad: 2 }));
    const b = desdeLinea(lineaValidada({ cantidad: 1 }));
    const otra = desdeLinea(lineaValidada({ observacion: 'sin crema' }));
    const r = combinarCarritos([a], [b, otra]);
    expect(r).toHaveLength(2);
    expect(r.find((x) => x.lineaId === a.lineaId).cantidad).toBe(2);
  });
});

describe('carrito sin sesión e inicio de sesión', () => {
  test('sin sesión se puede agregar y queda guardado como invitado', () => {
    montar();
    act(() => ctx.agregarItem(itemFresas));
    expect(ctx.carrito).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('carrito_anon'))).toHaveLength(1);
    expect(api.guardarCarrito).not.toHaveBeenCalled(); // sin sesión no se sube al servidor
  });

  test('al iniciar sesión: invitado + servidor se combinan sin duplicar y se guarda el resultado', async () => {
    montar();
    act(() => ctx.agregarItem(itemFresas));                       // la misma línea que tiene el servidor
    api.getCarritoGuardado.mockResolvedValue({ items: [{ id_producto: 1 }, { id_producto: 2 }] });
    api.validarCarrito.mockResolvedValue({ lineas: [
      lineaValidada({ cantidad: 1 }),                                                     // duplicada con la local
      lineaValidada({ id_producto: 2, toppings: [], salsas: [], producto: { ...producto, id_producto: 2, nombre: 'Bowl' } }),
    ] });

    act(() => {
      localStorage.setItem('usuario', JSON.stringify({ id_usuario: 7, rol: 'cliente' }));
      window.dispatchEvent(new Event('usuario-cambio'));
    });

    await waitFor(() => expect(ctx.carrito).toHaveLength(2));
    expect(ctx.carrito.map((x) => x.nombre).sort()).toEqual(['Bowl', 'Fresas con crema']);
    expect(localStorage.getItem('carrito_anon')).toBeNull();          // el de invitado se vació
    await waitFor(() => expect(api.guardarCarrito).toHaveBeenCalled()); // y se guardó combinado
    expect(api.guardarCarrito.mock.calls.at(-1)[0]).toHaveLength(2);
  });
});

describe('validarCarrito (checkout)', () => {
  test('quita productos agotados, avisa cambios de precio y actualiza el carrito', async () => {
    montar();
    act(() => {
      ctx.agregarItem(itemFresas);
      ctx.agregarItem({ ...producto, id_producto: 2, nombre: 'Bowl', toppings: [], adiciones: [], salsas: [] });
    });
    api.validarCarrito.mockResolvedValue({ lineas: [
      lineaValidada({ producto: { ...producto, precio: 22000 }, precio_unitario: 22000 }),
      { id_producto: 2, cantidad: 1, disponible: false, cambios: ['Bowl ya no está disponible'] },
    ] });

    let cambios;
    await act(async () => { cambios = await ctx.validarCarrito(); });

    expect(cambios).toEqual([
      'Fresas con crema: el precio cambió de $20.000 a $22.000',
      'Bowl ya no está disponible y se quitó del carrito',
    ]);
    expect(ctx.carrito).toHaveLength(1);
    expect(ctx.carrito[0].subtotal).toBe(22000);
  });

  test('si la API no responde, no toca el carrito', async () => {
    montar();
    act(() => ctx.agregarItem(itemFresas));
    api.validarCarrito.mockRejectedValue(new Error('sin red'));
    let cambios;
    await act(async () => { cambios = await ctx.validarCarrito(); });
    expect(cambios).toBeNull();
    expect(ctx.carrito).toHaveLength(1);
  });
});
