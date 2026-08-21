import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Catalogo from './Catalogo';
import * as api from '../../../services/api';

// react-router-dom@7 no se puede resolver bajo el Jest de react-scripts@5.0.1
// en este proyecto (el paquete resuelve a un .mjs que ese Jest no soporta —
// incompatibilidad preexistente, no relacionada con esta feature). Se mockea
// como módulo virtual para no depender de esa resolución.
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });

// Mock explícito (sin auto-mock) para no cargar el módulo real: éste importa
// axios, que en la versión instalada es ESM puro y el Jest de react-scripts@5
// no lo transforma (mismo tipo de incompatibilidad que react-router-dom).
jest.mock('../../../services/api', () => ({
  catalogoProductos: jest.fn(),
  catalogoCategorias: jest.fn(),
  catalogoToppings: jest.fn(),
  catalogoAdiciones: jest.fn(),
  catalogoMasPedidos: jest.fn(),
}));
jest.mock('../../../components/layout/Navbar/Navbar', () => () => <div data-testid="navbar" />);
jest.mock('../../../context/CartContext', () => ({
  useCart: () => ({
    carrito: [], agregarItem: jest.fn(), quitarItem: jest.fn(), cambiarCantidad: jest.fn(),
    subtotal: 0, totalItems: 0,
  }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ usuario: { id_usuario: 1, nombre: 'Test' } }),
}));
jest.mock('../../../hooks/useTiempoEspera', () => ({
  useTiempoEspera: () => 30,
}));
jest.mock('../../../hooks/useEstadoTienda', () => ({
  useEstadoTienda: () => ({
    abierto: true, estado: 'schedule', hora_apertura: 13, hora_cierre: 20, horario: '13:00 - 20:00', cargando: false,
  }),
}));

const base = {
  descripcion: 'desc', tamano: 'Grande', precio: '19000',
  permite_toppings: 0, max_toppings: 0, permite_chocolate: false,
  permite_salsas: false, es_bowl: false, img: null, estado: 1,
};

// 6 destacados: la mayoría en categoría 1 (Bebidas), pero "Top 1" vive en
// categoría 2 (Postres) a propósito -- para probar el reordenamiento
// dentro de un filtro de categoría puntual, no solo en "Todos".
const masPedidosMock = [
  // permite_salsas:true en "Top 1" porque el paso por defecto del modal
  // ("Adiciones") no muestra el nombre del producto en su encabezado --
  // el paso "salsas" sí, y hace falta para el test de click más abajo.
  { ...base, id_producto: 100, nombre: 'Top 1', id_categoria: 2, categoria: { id_categoria: 2, nombre: 'Postres' }, permite_salsas: true },
  { ...base, id_producto: 101, nombre: 'Top 2', id_categoria: 1, categoria: { id_categoria: 1, nombre: 'Bebidas' } },
  { ...base, id_producto: 102, nombre: 'Top 3', id_categoria: 1, categoria: { id_categoria: 1, nombre: 'Bebidas' } },
  { ...base, id_producto: 103, nombre: 'Top 4', id_categoria: 1, categoria: { id_categoria: 1, nombre: 'Bebidas' } },
  { ...base, id_producto: 104, nombre: 'Top 5', id_categoria: 1, categoria: { id_categoria: 1, nombre: 'Bebidas' } },
  { ...base, id_producto: 105, nombre: 'Top 6', id_categoria: 1, categoria: { id_categoria: 1, nombre: 'Bebidas' } },
];

const normalA = { ...base, id_producto: 1, nombre: 'Normal A', id_categoria: 1, categoria: { id_categoria: 1, nombre: 'Bebidas' } };
const normalB = { ...base, id_producto: 2, nombre: 'Normal B', id_categoria: 1, categoria: { id_categoria: 1, nombre: 'Bebidas' } };
// Normal C comparte categoría (Postres) con "Top 1" -- sirve para probar
// que, al filtrar por Postres, Top 1 sale primero y Normal C después.
const normalC = { ...base, id_producto: 3, nombre: 'Normal C', id_categoria: 2, categoria: { id_categoria: 2, nombre: 'Postres' } };

const todosLosProductos = [normalA, normalB, normalC, ...masPedidosMock];
const categorias = [{ id_categoria: 1, nombre: 'Bebidas' }, { id_categoria: 2, nombre: 'Postres' }];

function mockApiDefaults({ masPedidos = [] } = {}) {
  api.catalogoProductos.mockResolvedValue(todosLosProductos);
  api.catalogoCategorias.mockResolvedValue(categorias);
  api.catalogoToppings.mockResolvedValue([]);
  api.catalogoAdiciones.mockResolvedValue([]);
  api.catalogoMasPedidos.mockResolvedValue(masPedidos);
}

function nombresEnGrid() {
  return screen.getAllByText((_, el) => el.classList?.contains('producto-card-nombre'))
    .map((el) => el.textContent);
}

describe('Catálogo — productos más pedidos integrados en la grilla', () => {
  beforeEach(() => jest.clearAllMocks());

  test('NO existe ninguna sección/carrusel separado con título propio', async () => {
    mockApiDefaults({ masPedidos: masPedidosMock });
    render(<Catalogo />);

    await screen.findByText('Top 1');
    expect(screen.queryByText('🔥 Más Pedidos')).not.toBeInTheDocument();
    expect(screen.queryByText('Más Pedidos')).not.toBeInTheDocument();
    // Un solo grid de productos en toda la página -- no dos listas paralelas.
    expect(document.querySelectorAll('.productos-grid')).toHaveLength(1);
  });

  test('en "Todos": los 6 más pedidos aparecen primero, en orden, seguidos del resto', async () => {
    mockApiDefaults({ masPedidos: masPedidosMock });
    render(<Catalogo />);

    await screen.findByText('Top 1');
    expect(nombresEnGrid()).toEqual([
      'Top 1', 'Top 2', 'Top 3', 'Top 4', 'Top 5', 'Top 6',
      'Normal A', 'Normal B', 'Normal C',
    ]);
  });

  test('la insignia de estrella aparece SOLO en las 6 tarjetas destacadas', async () => {
    mockApiDefaults({ masPedidos: masPedidosMock });
    render(<Catalogo />);

    await screen.findByText('Top 1');
    expect(screen.getAllByText('MAS')).toHaveLength(6);
    expect(screen.getAllByText('PEDIDO')).toHaveLength(6);

    for (const p of masPedidosMock) {
      const tarjeta = screen.getByText(p.nombre).closest('.producto-card-envoltorio');
      expect(within(tarjeta).getByText('MAS')).toBeInTheDocument();
    }
    for (const nombre of ['Normal A', 'Normal B', 'Normal C']) {
      const tarjeta = screen.getByText(nombre).closest('.producto-card-envoltorio');
      expect(within(tarjeta).queryByText('MAS')).not.toBeInTheDocument();
    }
  });

  test('al filtrar por categoría: el destacado de esa categoría sigue saliendo primero', async () => {
    mockApiDefaults({ masPedidos: masPedidosMock });
    render(<Catalogo />);

    await screen.findByText('Top 1');
    fireEvent.click(screen.getByText('Postres'));

    // Postres solo tiene "Top 1" (destacado) y "Normal C" -- Top 1 primero.
    expect(nombresEnGrid()).toEqual(['Top 1', 'Normal C']);
    expect(screen.getAllByText('MAS')).toHaveLength(1);
  });

  test('sin datos de "más pedidos": la grilla se ve exactamente igual que antes, sin ninguna estrella', async () => {
    mockApiDefaults({ masPedidos: [] });
    render(<Catalogo />);

    await screen.findByText('Normal A');
    expect(screen.queryByText('MAS')).not.toBeInTheDocument();
    expect(screen.queryByText('PEDIDO')).not.toBeInTheDocument();
    // Con la BD sin ventas, el orden es el habitual: por categoría.
    expect(nombresEnGrid()).toEqual([
      'Normal A', 'Normal B', 'Top 2', 'Top 3', 'Top 4', 'Top 5', 'Top 6',
      'Normal C', 'Top 1',
    ]);
  });

  test('al hacer click en una tarjeta destacada se abre el mismo modal de personalización', async () => {
    mockApiDefaults({ masPedidos: masPedidosMock });
    render(<Catalogo />);

    await screen.findByText('Top 1');
    const tarjeta = screen.getByText('Top 1').closest('.producto-card-envoltorio');
    fireEvent.click(within(tarjeta).getByText('+ Agregar'));

    const overlay = document.querySelector('.modal-producto-overlay');
    expect(overlay).toBeInTheDocument();
    expect(within(overlay).getByText('Top 1')).toBeInTheDocument();
  });
});
