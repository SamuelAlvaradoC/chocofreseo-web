import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Registro from './Registro';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ children }) => <a>{children}</a>,
}), { virtual: true });

const mockLoginConAPI = jest.fn();
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ loginConAPI: mockLoginConAPI }),
}));

jest.mock('../../../../services/api', () => ({
  register: jest.fn().mockResolvedValue({}),
}));

const nombreInput    = () => screen.getByPlaceholderText('Ej: Ana Gómez');
const emailInput     = () => screen.getByPlaceholderText('correo@ejemplo.com');
const passInput      = () => screen.getByPlaceholderText('Mínimo 8 caracteres');
const confirmInput   = () => screen.getByPlaceholderText('Repite tu contraseña');

const escribirYEsperarDebounce = (input, valor) => {
  fireEvent.change(input, { target: { value: valor } });
  act(() => jest.advanceTimersByTime(400));
};

describe('Registro — validación en tiempo real', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  it('nombre de 1 letra marca error tras el debounce, sin tocar otros campos', () => {
    render(<Registro />);
    escribirYEsperarDebounce(nombreInput(), 'A');

    expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument();
    expect(nombreInput()).toHaveClass('input-error');
  });

  it('correo sin @ marca error tras el debounce', () => {
    render(<Registro />);
    escribirYEsperarDebounce(emailInput(), 'correoinvalido');

    expect(screen.getByText('Ingresa un correo electrónico válido')).toBeInTheDocument();
    expect(emailInput()).toHaveClass('input-error');
  });

  it('contraseña de 5 caracteres marca error tras el debounce', () => {
    render(<Registro />);
    escribirYEsperarDebounce(passInput(), '12345');

    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument();
  });

  it('confirmar contraseña distinta marca error de no coincidencia', () => {
    render(<Registro />);
    escribirYEsperarDebounce(passInput(), 'Contraseña123');
    escribirYEsperarDebounce(confirmInput(), 'OtraCosa123');

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });

  it('corregir todos los campos hace desaparecer los errores solos', () => {
    render(<Registro />);
    escribirYEsperarDebounce(nombreInput(), 'A');
    escribirYEsperarDebounce(emailInput(), 'correoinvalido');
    escribirYEsperarDebounce(passInput(), '12345');
    escribirYEsperarDebounce(confirmInput(), 'otra');

    expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Ingresa un correo electrónico válido')).toBeInTheDocument();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();

    escribirYEsperarDebounce(nombreInput(), 'Ana Gómez');
    escribirYEsperarDebounce(emailInput(), 'ana@ejemplo.com');
    escribirYEsperarDebounce(passInput(), 'Contraseña123');
    escribirYEsperarDebounce(confirmInput(), 'Contraseña123');

    expect(screen.queryByText('El nombre debe tener al menos 2 caracteres')).not.toBeInTheDocument();
    expect(screen.queryByText('Ingresa un correo electrónico válido')).not.toBeInTheDocument();
    expect(screen.queryByText('La contraseña debe tener al menos 8 caracteres')).not.toBeInTheDocument();
    expect(screen.queryByText('Las contraseñas no coinciden')).not.toBeInTheDocument();
    expect(nombreInput()).not.toHaveClass('input-error');
    expect(emailInput()).not.toHaveClass('input-error');
    expect(passInput()).not.toHaveClass('input-error');
    expect(confirmInput()).not.toHaveClass('input-error');
  });

  it('cambiar la contraseña re-valida "confirmar" si ya tenía texto (evita quedar "coincide" con un valor viejo)', () => {
    render(<Registro />);
    escribirYEsperarDebounce(passInput(), 'Contraseña123');
    escribirYEsperarDebounce(confirmInput(), 'Contraseña123');
    expect(screen.queryByText('Las contraseñas no coinciden')).not.toBeInTheDocument();

    // El usuario vuelve a cambiar la contraseña -- confirmar ya no coincide.
    escribirYEsperarDebounce(passInput(), 'OtraContraseña456');
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });

  it('el envío real sigue funcionando de principio a fin con datos válidos', async () => {
    const api = require('../../../../services/api');
    mockLoginConAPI.mockResolvedValue({ rol: 'cliente' });

    render(<Registro />);
    escribirYEsperarDebounce(nombreInput(), 'Ana Gómez');
    escribirYEsperarDebounce(emailInput(), 'ana@ejemplo.com');
    escribirYEsperarDebounce(passInput(), 'Contraseña123');
    escribirYEsperarDebounce(confirmInput(), 'Contraseña123');

    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }));
    await act(async () => { await Promise.resolve(); });

    expect(api.register).toHaveBeenCalledWith({
      nombre: 'Ana Gómez', email: 'ana@ejemplo.com', contrasena: 'Contraseña123', id_rol: 4,
    });
    expect(mockLoginConAPI).toHaveBeenCalledWith('ana@ejemplo.com', 'Contraseña123');
  });

  it('el botón de enviar nunca queda deshabilitado por errores de validación (no bloquea al usuario)', () => {
    render(<Registro />);
    escribirYEsperarDebounce(nombreInput(), 'A');
    expect(screen.getByRole('button', { name: /crear cuenta/i })).not.toBeDisabled();
  });
});
