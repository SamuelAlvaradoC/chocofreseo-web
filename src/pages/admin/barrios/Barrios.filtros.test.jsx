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

describe('Barrios admin — "Mostrar" arriba (filtros) Y abajo (paginación), sincronizados', () => {
  beforeEach(() => jest.clearAllMocks());

  test('el selector "Mostrar" aparece dos veces: en la fila de filtros Y junto a la paginación de abajo', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    expect(screen.getAllByText('Mostrar:')).toHaveLength(2);
  });

  test('el select de ciudad tiene un ancho fijo angosto, no 100% de la fila', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    const selectCiudad = screen.getByDisplayValue('Todas las ciudades');
    expect(selectCiudad.style.width).toBe('260px');
  });

  test('NO hay paginación (números) flotando arriba, entre los filtros y la tabla', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    // Solo debe existir un bloque .paginacion (el de abajo).
    expect(document.querySelectorAll('.paginacion')).toHaveLength(1);
  });

  test('la paginación de abajo vive DENTRO de la tarjeta de la tabla, sin envoltorio propio', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    const filaPaginacion = screen.getByText('‹ Anterior').closest('.paginacion');
    // Su .tabla-wrap más cercano debe ser el mismo que envuelve la tabla
    // (no uno extra, propio y separado).
    const tarjetas = document.querySelectorAll('.tabla-wrap');
    expect(tarjetas).toHaveLength(1);
    expect(filaPaginacion.closest('.tabla-wrap')).toBe(tarjetas[0]);
  });

  test('cambiar "Mostrar" desde arriba (filtros) sincroniza con el de abajo (paginación)', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    const [mostrarArriba, mostrarAbajo] = screen.getAllByDisplayValue('10');
    fireEvent.change(mostrarArriba, { target: { value: '50' } });

    expect(mostrarAbajo.value).toBe('50');
  });

  test('cambiar "Mostrar" desde abajo (paginación) sincroniza con el de arriba (filtros)', async () => {
    mockApiDefaults();
    render(<Barrios />);

    await screen.findByText('Barrio 1');
    const [mostrarArriba, mostrarAbajo] = screen.getAllByDisplayValue('10');
    fireEvent.change(mostrarAbajo, { target: { value: 'todos' } });

    expect(within(mostrarArriba.closest('div')).getByDisplayValue('Todos')).toBeInTheDocument();
  });
});
