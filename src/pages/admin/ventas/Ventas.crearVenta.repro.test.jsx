import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Ventas from './Ventas';
import * as api from '../../../services/api';

// react-router-dom@7 no se puede resolver bajo el Jest de react-scripts@5.0.1
// (mismo workaround usado en Catalogo.masPedidos.test.jsx).
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/admin/ventas' }),
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

function mockApiDefaults() {
  api.listarVentas.mockResolvedValue([]);
  api.listarClientes.mockResolvedValue([]);
  api.listarProductos.mockResolvedValue([]);
  api.listarToppings.mockResolvedValue([]);
  api.listarAdiciones.mockResolvedValue([]);
  api.listarCategorias.mockResolvedValue([]);
}

describe('Ventas admin — botón "+ Nueva venta" abre ModalCrearVenta', () => {
  beforeEach(() => jest.clearAllMocks());

  test('al abrir el modal, la app no debe crashear (blank page)', async () => {
    mockApiDefaults();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<Ventas />);

    const btn = await screen.findByText('+ Nueva venta');
    fireEvent.click(btn);

    // Si el bug de "Rendered more hooks than during the previous render"
    // ocurre, React lanza durante el render y RTL relanza el error hacia
    // el test en vez de simplemente pintar el modal. El modal abre en el
    // paso 1 ("Cliente y Dirección"); el botón "✓ Crear venta" solo
    // aparece hasta el paso 3, así que no sirve como señal de apertura.
    expect(await screen.findByText('Buscar cliente')).toBeInTheDocument();
    expect(screen.getByText('Cliente y Dirección')).toBeInTheDocument();

    spy.mockRestore();
  });
});
