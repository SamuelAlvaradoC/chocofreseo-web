import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Pedidos from './Pedidos';
import * as api from '../../../services/api';

// Mismo workaround que Ventas.crearVenta.repro.test.jsx: react-router-dom@7
// no se puede resolver bajo el Jest de react-scripts@5.0.1.
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/admin/pedidos' }),
  NavLink: ({ children }) => <a>{children}</a>,
}), { virtual: true });

jest.mock('socket.io-client', () => ({
  io: () => ({ on: jest.fn(), off: jest.fn(), disconnect: jest.fn() }),
}));

jest.mock('../../../services/api', () => ({
  listarVentas: jest.fn(),
  listarClientes: jest.fn(),
  listarProductos: jest.fn(),
  listarToppings: jest.fn(),
  listarAdiciones: jest.fn(),
  listarCategorias: jest.fn(),
  getPuntosCliente: jest.fn(),
  listarDireccionesCliente: jest.fn(),
  crearVenta: jest.fn(),
  editarVenta: jest.fn(),
  cambiarEstadoVenta: jest.fn(),
  anularVenta: jest.fn(),
  obtenerVenta: jest.fn(),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ usuario: { id_usuario: 1, nombre: 'Admin', rol: 'admin', permisos: [] }, tienePermiso: () => true }),
}));

jest.mock('../../../components/common/FormDireccion', () => () => <div data-testid="form-direccion" />);

// 25 ventas simples -- suficiente para forzar varias páginas con 10/página.
const ventasMock = Array.from({ length: 25 }, (_, i) => ({
  id_venta: i + 1,
  total: 10000,
  estado: 'pendiente',
  fecha: '2026-08-20T12:00:00.000Z',
  nombre_cliente: `Cliente ${i + 1}`,
}));

function mockApiDefaults() {
  api.listarVentas.mockResolvedValue(ventasMock);
  api.listarClientes.mockResolvedValue([]);
  api.listarProductos.mockResolvedValue([]);
  api.listarToppings.mockResolvedValue([]);
  api.listarAdiciones.mockResolvedValue([]);
  api.listarCategorias.mockResolvedValue([]);
}

const filasVenta = () => screen.getAllByText((_, el) => el.tagName === 'SPAN' && el.className === 'id-badge');

describe('Pedidos admin — selector "Mostrar" y paginación', () => {
  beforeEach(() => jest.clearAllMocks());

  test('por defecto muestra 10 por página, seleccionado en el dropdown', async () => {
    mockApiDefaults();
    render(<Pedidos />);

    await screen.findByText('Cliente 1');
    expect(filasVenta()).toHaveLength(10);
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  test('"Todos" desactiva la paginación y muestra el listado completo', async () => {
    mockApiDefaults();
    render(<Pedidos />);

    await screen.findByText('Cliente 1');
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: 'todos' } });

    expect(await screen.findAllByText((_, el) => el.tagName === 'SPAN' && el.className === 'id-badge')).toHaveLength(25);
    // Sin botones de página numerados cuando se ve todo en una sola "página".
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  test('cambiar a un tamaño mayor estando en una página alta no deja una página vacía', async () => {
    mockApiDefaults();
    render(<Pedidos />);

    await screen.findByText('Cliente 1');
    // Con 10/página y 25 ventas hay 3 páginas -- ir a la página 3.
    fireEvent.click(screen.getByText('3'));
    await screen.findByText('Cliente 21');

    // Cambiar a 100/página: con 25 ventas ahora hay 1 sola página. La vista
    // no debe quedar "atascada" en la página 3 (que ya no existiría) mostrando
    // una tabla vacía -- debe recortarse sola a una página válida con datos.
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '100' } });

    await screen.findByText('Cliente 1');
    expect(screen.queryByText('No se encontraron ventas')).not.toBeInTheDocument();
    expect(filasVenta()).toHaveLength(25);
  });
});
