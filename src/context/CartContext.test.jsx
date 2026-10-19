import { render, act, waitFor } from '@testing-library/react';
import { CartProvider, useCart, aCanonico, desdeLinea } from './CartContext';
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
});

describe('carrito sin sesión e inicio de sesión', () => {
  test('sin sesión se puede agregar y queda guardado como invitado', () => {
    montar();
    act(() => ctx.agregarItem(itemFresas));
    expect(ctx.carrito).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('carrito_anon'))).toHaveLength(1);
    expect(api.guardarCarrito).not.toHaveBeenCalled(); // sin sesión no se sube al servidor
  });

  const iniciarSesion = (id = 7) => act(() => {
    localStorage.setItem('usuario', JSON.stringify({ id_usuario: id, rol: 'cliente' }));
    window.dispatchEvent(new Event('usuario-cambio'));
  });
  const cerrarSesion = (id = 7) => act(() => {
    // Igual que AuthContext.logout()
    localStorage.removeItem(`carrito_${id}`);
    localStorage.removeItem('usuario');
    window.dispatchEvent(new Event('usuario-cambio'));
  });
  const bowl = { ...producto, id_producto: 2, nombre: 'Bowl', toppings: [], adiciones: [], salsas: [] };

  test('al iniciar sesión con carrito armado sin cuenta, ESE reemplaza al de la cuenta (no se combinan)', async () => {
    montar();
    act(() => ctx.agregarItem(itemFresas));
    iniciarSesion();
    expect(ctx.carrito.map((x) => x.nombre)).toEqual(['Fresas con crema']);
    expect(api.getCarritoGuardado).not.toHaveBeenCalled();             // no se lee el de la cuenta
    expect(api.guardarCarrito).toHaveBeenLastCalledWith([aCanonico(ctx.carrito[0])]); // se reemplaza
    expect(localStorage.getItem('carrito_anon')).toBeNull();
  });

  test('secuencia: agregar -> iniciar -> cerrar -> agregar otro -> iniciar: queda SOLO el último', async () => {
    const enServidor = { items: [] };
    api.guardarCarrito.mockImplementation(async (items) => { enServidor.items = items; });
    api.getCarritoGuardado.mockImplementation(async () => enServidor);
    montar();
    act(() => ctx.agregarItem(itemFresas));
    iniciarSesion();
    expect(enServidor.items.map((i) => i.id_producto)).toEqual([1]);

    cerrarSesion();
    expect(ctx.carrito).toEqual([]);                                     // el dispositivo queda sin carrito
    expect(JSON.parse(localStorage.getItem('carrito_anon') || '[]')).toEqual([]);
    expect(enServidor.items.map((i) => i.id_producto)).toEqual([1]);     // sigue en la cuenta

    act(() => ctx.agregarItem(bowl));
    iniciarSesion();
    expect(ctx.carrito.map((x) => x.nombre)).toEqual(['Bowl']);          // lo que se ve (y se envía)
    expect(enServidor.items.map((i) => i.id_producto)).toEqual([2]);

    act(() => ctx.vaciarTrasPedido());
    expect(ctx.carrito).toEqual([]);
    expect(enServidor.items).toEqual([]);
  });

  test('al iniciar sesión sin carrito se recupera el guardado en la cuenta', async () => {
    api.getCarritoGuardado.mockResolvedValue({ items: [{ id_producto: 2, cantidad: 3 }] });
    api.validarCarrito.mockResolvedValue({ lineas: [
      lineaValidada({ id_producto: 2, cantidad: 3, toppings: [], salsas: [], producto: { ...producto, id_producto: 2, nombre: 'Bowl' } }),
    ] });
    montar();
    iniciarSesion();
    await waitFor(() => expect(ctx.carrito).toHaveLength(1));
    expect(ctx.carrito[0]).toMatchObject({ nombre: 'Bowl', cantidad: 3 });
    expect(api.guardarCarrito).not.toHaveBeenCalled();                    // recuperar no reescribe la cuenta
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
