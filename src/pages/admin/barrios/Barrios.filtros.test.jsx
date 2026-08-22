import { render, screen, fireEvent, within } from '@testing-library/react';
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

describe('Barrios admin — fila de filtros con "Mostrar" reubicado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('el selector "Mostrar" vive en la fila de filtros (junto al de ciudad) Y en la paginación de abajo', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    // Dos apariciones: fila de filtros + paginación de abajo.
    expect(screen.getAllByText('Mostrar:')).toHaveLength(2);
  });

  test('el select de ciudad tiene un ancho fijo angosto, no 100% de la fila', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    const selectCiudad = screen.getByDisplayValue('Todas las ciudades');
    expect(selectCiudad.style.width).toBe('260px');
  });

  test('cambiar "Mostrar" desde la fila de filtros (arriba) sincroniza con el de abajo', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    const [mostrarArriba, mostrarAbajo] = screen.getAllByDisplayValue('10');
    fireEvent.change(mostrarArriba, { target: { value: '50' } });

    expect(mostrarAbajo.value).toBe('50');
  });

  test('cambiar "Mostrar" desde abajo sincroniza con el de la fila de filtros (arriba)', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    const [mostrarArriba, mostrarAbajo] = screen.getAllByDisplayValue('10');
    fireEvent.change(mostrarAbajo, { target: { value: 'todos' } });

    expect(within(mostrarArriba.closest('div')).getByDisplayValue('Todos')).toBeInTheDocument();
  });

  test('la navegación de páginas (números) sigue apareciendo arriba de la tabla, separada del filtro', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    // Con 25 barrios y 10/página hay 3 páginas -- debe verse "Siguiente ›" arriba.
    expect(screen.getAllByText('Siguiente ›').length).toBeGreaterThanOrEqual(1);
  });
});
