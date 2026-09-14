import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from './Login';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ children }) => <a>{children}</a>,
}), { virtual: true });

const mockLoginConAPI = jest.fn();
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ loginConAPI: mockLoginConAPI }),
}));

const emailInput = () => screen.getByPlaceholderText('correo@ejemplo.com');
const passInput  = () => screen.getByPlaceholderText('••••••••');

const escribirYEsperarDebounce = (input, valor) => {
  fireEvent.change(input, { target: { value: valor } });
  act(() => jest.advanceTimersByTime(400));
};

describe('Login — validación en tiempo real', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  it('correo con formato inválido marca error tras el debounce', () => {
    render(<Login />);
    escribirYEsperarDebounce(emailInput(), 'correoinvalido');

    expect(screen.getByText('Ingresa un correo electrónico válido')).toBeInTheDocument();
    expect(emailInput()).toHaveClass('input-error');
  });

  it('NO exige una longitud mínima de contraseña -- solo que no esté vacía', () => {
    render(<Login />);
    // 1 solo caracter -- no debe marcar error de longitud (a diferencia de Registro).
    escribirYEsperarDebounce(passInput(), 'a');
    expect(screen.queryByText(/al menos|mínimo|caracteres/i)).not.toBeInTheDocument();
    expect(passInput()).not.toHaveClass('input-error');

    // Vacía sí debe marcar error (al perder foco, ya que un campo vacío no dispara onChange).
    fireEvent.change(passInput(), { target: { value: 'a' } });
    fireEvent.change(passInput(), { target: { value: '' } });
    fireEvent.blur(passInput());
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument();
  });

  it('un dominio con una sola letra (ej. samuel@M.gamil.com) sigue siendo válido', () => {
    render(<Login />);
    escribirYEsperarDebounce(emailInput(), 'samuel@M.gamil.com');
    expect(screen.queryByText('Ingresa un correo electrónico válido')).not.toBeInTheDocument();
    expect(emailInput()).not.toHaveClass('input-error');
  });

  it('corregir el correo hace desaparecer el error solo', () => {
    render(<Login />);
    escribirYEsperarDebounce(emailInput(), 'correoinvalido');
    expect(screen.getByText('Ingresa un correo electrónico válido')).toBeInTheDocument();

    escribirYEsperarDebounce(emailInput(), 'valido@ejemplo.com');
    expect(screen.queryByText('Ingresa un correo electrónico válido')).not.toBeInTheDocument();
  });

  it('el envío real sigue funcionando de principio a fin con datos válidos', async () => {
    mockLoginConAPI.mockResolvedValue({ rol: 'cliente' });

    render(<Login />);
    escribirYEsperarDebounce(emailInput(), 'valido@ejemplo.com');
    escribirYEsperarDebounce(passInput(), 'cualquiercosa');

    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }));
    await act(async () => { await Promise.resolve(); });

    expect(mockLoginConAPI).toHaveBeenCalledWith('valido@ejemplo.com', 'cualquiercosa');
  });

  it('un error del backend al hacer login se muestra como mensaje general, no ligado a un campo', async () => {
    mockLoginConAPI.mockRejectedValue({ response: { data: { message: 'Email o contraseña incorrectos' } } });

    render(<Login />);
    escribirYEsperarDebounce(emailInput(), 'valido@ejemplo.com');
    escribirYEsperarDebounce(passInput(), 'malacontrasena');

    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }));
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('Email o contraseña incorrectos')).toBeInTheDocument();
  });

  it('el botón de enviar nunca queda deshabilitado por errores de validación', () => {
    render(<Login />);
    escribirYEsperarDebounce(emailInput(), 'correoinvalido');
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).not.toBeDisabled();
  });
});
