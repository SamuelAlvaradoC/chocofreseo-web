import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Barrios from './Barrios';
import * as api from '../../../services/api';

// Mismo workaround que en los demás tests de paginación admin.
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/admin/barrios' }),
  NavLink: ({ children }) => <a>{children}</a>,
}), { virtual: true });

jest.mock('../../../services/api', () => ({
  listarBarrios: jest.fn(),
  listarCiudades: jest.fn(),
  crearBarrio: jest.fn(),
  actualizarBarrio: jest.fn(),
  eliminarBarrio: jest.fn(),
  estadoBarrio: jest.fn(),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ usuario: { id_usuario: 1, nombre: 'Admin', rol: 'admin', permisos: [] }, tienePermiso: () => true }),
}));

const barriosMock = Array.from({ length: 25 }, (_, i) => ({
  id_barrio: i + 1,
  nombre: `Barrio ${i + 1}`,
  id_ciudad: 1,
  ciudad: { id_ciudad: 1, nombre: 'Medellín' },
  precio_domicilio: 10000,
  estado: 1,
}));

function mockApiDefaults() {
  api.listarBarrios.mockResolvedValue(barriosMock);
  api.listarCiudades.mockResolvedValue([{ id_ciudad: 1, nombre: 'Medellín' }]);
}

describe('Barrios admin — fila de filtros con "Mostrar", paginación compacta sin duplicado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('el selector "Mostrar" aparece UNA sola vez, en la fila de filtros (ya no está duplicado abajo)', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    expect(screen.getAllByText('Mostrar:')).toHaveLength(1);
  });

  test('el select de ciudad tiene un ancho fijo angosto, no 100% de la fila', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    const selectCiudad = screen.getByDisplayValue('Todas las ciudades');
    expect(selectCiudad.style.width).toBe('260px');
  });

  test('cambiar "Mostrar" desde los filtros recalcula la tabla igual que antes', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: 'todos' } });

    // Con "Todos" ya no hay paginación (una sola "página" con los 25).
    await screen.findByText('Barrio 25');
    expect(screen.queryByText('Siguiente ›')).not.toBeInTheDocument();
  });

  test('la navegación de páginas (números) aparece UNA sola vez, compacta entre los filtros y la tabla', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    // Con 25 barrios y 10/página hay 3 páginas.
    expect(screen.getAllByText('Siguiente ›')).toHaveLength(1);
    expect(screen.getAllByText('‹ Anterior')).toHaveLength(1);
  });

  test('la fila de paginación ya no vive dentro de la tarjeta blanca de la tabla (sin "tabla-wrap" propio)', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    const filaPaginacion = screen.getByText('‹ Anterior').closest('.paginacion');
    expect(filaPaginacion.closest('.tabla-wrap')).toBeNull();
  });
});
