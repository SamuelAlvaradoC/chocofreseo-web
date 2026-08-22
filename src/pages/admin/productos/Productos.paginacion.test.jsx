import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Productos from './Productos';
import * as api from '../../../services/api';

// Mismo workaround que en Ventas.paginacion.test.jsx: react-router-dom@7 no
// se puede resolver bajo el Jest de react-scripts@5.0.1 (lo usan Sidebar/
// Topbar dentro de AdminLayout).
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/admin/productos' }),
  NavLink: ({ children }) => <a>{children}</a>,
}), { virtual: true });

jest.mock('../../../services/api', () => ({
  listarProductos: jest.fn(),
  listarCategorias: jest.fn(),
  crearProducto: jest.fn(),
  actualizarProducto: jest.fn(),
  eliminarProducto: jest.fn(),
  estadoProducto: jest.fn(),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ usuario: { id_usuario: 1, nombre: 'Admin', rol: 'admin', permisos: [] }, tienePermiso: () => true }),
}));

// 25 productos simples -- suficiente para forzar varias páginas con 10/página.
const productosMock = Array.from({ length: 25 }, (_, i) => ({
  id_producto: i + 1,
  nombre: `Producto ${i + 1}`,
  id_categoria: 1,
  tamano: '',
  precio: 10000,
  permite_toppings: 0,
  max_toppings: 0,
  estado: 1,
  img: '',
}));

function mockApiDefaults() {
  api.listarProductos.mockResolvedValue(productosMock);
  api.listarCategorias.mockResolvedValue([{ id_categoria: 1, nombre: 'Bebidas' }]);
}

const filasProducto = () => screen.getAllByText((_, el) => el.tagName === 'TD' && /^Producto \d+$/.test(el.textContent.trim()));
// El control de paginación está duplicado (arriba y abajo) -- las
// interacciones se hacen contra el de ARRIBA (primero en el DOM), scopeadas
// con within() porque los mismos textos ("10", "3", etc.) existen dos veces.
const arriba = () => within(document.querySelectorAll('.paginacion')[0]);
const abajo  = () => within(document.querySelectorAll('.paginacion')[1]);

describe('Productos admin — selector "Mostrar" y paginación', () => {
  beforeEach(() => jest.clearAllMocks());

  test('por defecto muestra 10 por página, seleccionado en el dropdown', async () => {
    mockApiDefaults();
    render(<Productos />);

    await screen.findByText('Producto 1');
    expect(filasProducto()).toHaveLength(10);
    expect(arriba().getByDisplayValue('10')).toBeInTheDocument();
  });

  test('"Todos" desactiva la paginación y muestra el listado completo', async () => {
    mockApiDefaults();
    render(<Productos />);

    await screen.findByText('Producto 1');
    fireEvent.change(arriba().getByDisplayValue('10'), { target: { value: 'todos' } });

    expect(await screen.findAllByText((_, el) => el.tagName === 'TD' && /^Producto \d+$/.test(el.textContent.trim()))).toHaveLength(25);
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  test('cambiar a un tamaño mayor estando en una página alta no deja una página vacía', async () => {
    mockApiDefaults();
    render(<Productos />);

    await screen.findByText('Producto 1');
    // Con 10/página y 25 productos hay 3 páginas -- ir a la página 3.
    fireEvent.click(arriba().getByText('3'));
    await screen.findByText('Producto 21');

    // Cambiar a 100/página: con 25 productos ahora hay 1 sola página. No debe
    // quedar "atascado" en la página 3 (que ya no existiría) viendo una tabla
    // vacía -- debe recortarse sola a una página válida con datos.
    fireEvent.change(arriba().getByDisplayValue('10'), { target: { value: '100' } });

    await screen.findByText('Producto 1');
    expect(screen.queryByText('No se encontraron productos')).not.toBeInTheDocument();
    expect(filasProducto()).toHaveLength(25);
  });

  test('el control de paginación aparece arriba Y abajo, sincronizados', async () => {
    mockApiDefaults();
    render(<Productos />);

    await screen.findByText('Producto 1');
    expect(document.querySelectorAll('.paginacion')).toHaveLength(2);

    fireEvent.click(arriba().getByText('3'));

    expect(abajo().getByText('3')).toHaveClass('activo');
  });
});
