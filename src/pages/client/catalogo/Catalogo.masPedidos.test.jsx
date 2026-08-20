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

const productoNormal = {
  id_producto: 1, id_categoria: 1, nombre: 'Producto Normal', descripcion: 'desc',
  tamano: 'Grande', precio: '19000', permite_toppings: 0, max_toppings: 0,
  permite_chocolate: false, permite_salsas: false, es_bowl: false,
  img: null, estado: 1, categoria: { id_categoria: 1, nombre: 'Bebidas' },
};

// El primero lleva permite_salsas:true para poder verificar, al abrir el
// modal, que muestra el nombre del producto correcto (mismo ModalProducto
// que usa el catálogo normal).
const masPedidosMock = Array.from({ length: 6 }, (_, i) => ({
  ...productoNormal,
  id_producto: 100 + i,
  nombre: `Producto Top ${i + 1}`,
  permite_salsas: i === 0,
}));

function mockApiDefaults({ masPedidos = [] } = {}) {
  api.catalogoProductos.mockResolvedValue([productoNormal]);
  api.catalogoCategorias.mockResolvedValue([{ id_categoria: 1, nombre: 'Bebidas' }]);
  api.catalogoToppings.mockResolvedValue([]);
  api.catalogoAdiciones.mockResolvedValue([]);
  api.catalogoMasPedidos.mockResolvedValue(masPedidos);
}

describe('Catálogo — sección "Más Pedidos"', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renderiza la sección con los 6 productos y la insignia "MÁS PEDIDO" en cada uno', async () => {
    mockApiDefaults({ masPedidos: masPedidosMock });
    render(<Catalogo />);

    expect(await screen.findByText('🔥 Más Pedidos')).toBeInTheDocument();
    for (const p of masPedidosMock) {
      expect(screen.getByText(p.nombre)).toBeInTheDocument();
    }
    expect(screen.getAllByText('MÁS PEDIDO')).toHaveLength(6);
  });

  test('no renderiza la sección si el endpoint devuelve un array vacío', async () => {
    mockApiDefaults({ masPedidos: [] });
    render(<Catalogo />);

    await screen.findByText(productoNormal.nombre); // esperar a que el catálogo termine de cargar
    expect(screen.queryByText('🔥 Más Pedidos')).not.toBeInTheDocument();
    expect(screen.queryByText('MÁS PEDIDO')).not.toBeInTheDocument();
  });

  test('al hacer click en un producto de "Más Pedidos" se abre el mismo modal de personalización', async () => {
    mockApiDefaults({ masPedidos: masPedidosMock });
    render(<Catalogo />);

    await screen.findByText('🔥 Más Pedidos');
    const nombreEnTarjeta = screen.getByText(masPedidosMock[0].nombre);
    const tarjeta = nombreEnTarjeta.closest('.producto-card');
    const botonAgregar = within(tarjeta).getByText('+ Agregar');
    fireEvent.click(botonAgregar);

    // ModalProducto es el mismo componente compartido con el catálogo normal:
    // confirmamos que abre (misma clase que usa el resto del catálogo) y que
    // muestra el nombre del producto correcto dentro del modal. Se busca
    // dentro del overlay (`within`) porque el nombre también aparece en la
    // tarjeta de fondo — buscar por rol "heading" sin acotar es ambiguo, ya
    // que la tarjeta usa <h3> (heading) con el mismo texto.
    const overlay = await screen.findByText('Elige tus salsas 🍫');
    const modal = overlay.closest('.modal-producto-overlay');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(masPedidosMock[0].nombre)).toBeInTheDocument();
  });
});
