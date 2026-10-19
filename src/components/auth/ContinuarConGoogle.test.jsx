// "Continuar con Google" en la web: botón oficial (solo si hay Client ID),
// inicio de sesión que vuelve a donde iba (checkout con el carrito) y aviso
// la primera vez que una cuenta existente se conecta con Google.
import { render, screen, act, renderHook } from '@testing-library/react';
import BotonGoogle from './BotonGoogle';
import useContinuarConGoogle, { MSG_CUENTA_VINCULADA } from '../../hooks/useContinuarConGoogle';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { handleAuthError, SESSION_EXPIRED_EVENT } from '../../services/authEvents';
import * as api from '../../services/api';
import { toast } from '../../utils/toast';

const mockNavigate = jest.fn();
let mockLocation = { state: null };
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}), { virtual: true });
jest.mock('../../services/api', () => ({
  loginGoogle: jest.fn(),
  getPerfil: jest.fn().mockResolvedValue({}),
  getMisPermisos: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../utils/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockLocation = { state: null };
  delete window.google;
  // CRA reinicia los mocks antes de cada test (resetMocks): se definen aquí.
  api.getPerfil.mockResolvedValue({});
  api.getMisPermisos.mockResolvedValue([]);
});

describe('BotonGoogle', () => {
  test('sin Client ID no se muestra ni carga el script de Google', () => {
    const { container } = render(<BotonGoogle onCredential={jest.fn()} clientId="" />);
    expect(container).toBeEmptyDOMElement();
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull();
  });

  test('con Client ID usa el botón oficial y entrega la credencial', async () => {
    const id = { initialize: jest.fn(), renderButton: jest.fn() };
    window.google = { accounts: { id } };
    const onCredential = jest.fn();
    await act(async () => { render(<BotonGoogle onCredential={onCredential} clientId="web.apps.googleusercontent.com" />); });

    expect(screen.getByTestId('boton-google')).toBeInTheDocument();
    expect(id.initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'web.apps.googleusercontent.com', ux_mode: 'popup' }));
    expect(id.renderButton).toHaveBeenCalledWith(screen.getByTestId('boton-google'), expect.objectContaining({ text: 'continue_with' }));

    id.initialize.mock.calls[0][0].callback({ credential: 'id-token' });
    expect(onCredential).toHaveBeenCalledWith('id-token');
  });
});

describe('useContinuarConGoogle', () => {
  const montar = () => renderHook(() => useContinuarConGoogle({ onError: mockOnError }), { wrapper: AuthProvider });
  const mockOnError = jest.fn();
  const respuesta = (o = {}) => ({ token: 'jwt', usuario: { id_usuario: 7, nombre: 'Ana', rol: { nombre: 'cliente' } }, vinculada: false, nueva: false, ...o });

  test('desde "Hacer pedido": inicia sesión y vuelve DIRECTO al checkout (mismo evento que el login normal)', async () => {
    mockLocation = { state: { from: '/checkout' } };
    api.loginGoogle.mockResolvedValue(respuesta());
    const evento = jest.fn();
    window.addEventListener('usuario-cambio', evento);

    const { result } = montar();
    await act(async () => { await result.current.continuarConGoogle('id-token'); });

    expect(api.loginGoogle).toHaveBeenCalledWith({ credential: 'id-token' });
    expect(localStorage.getItem('token')).toBe('jwt');
    expect(JSON.parse(localStorage.getItem('usuario'))).toMatchObject({ id_usuario: 7, rol: 'cliente' });
    expect(evento).toHaveBeenCalled(); // CartContext aplica sus reglas de inicio de sesión
    expect(mockNavigate).toHaveBeenCalledWith('/checkout', { replace: true });
    expect(toast.success).not.toHaveBeenCalled();
    window.removeEventListener('usuario-cambio', evento);
  });

  test('primera vez que una cuenta existente se conecta: muestra el aviso', async () => {
    api.loginGoogle.mockResolvedValue(respuesta({ vinculada: true }));
    const { result } = montar();
    await act(async () => { await result.current.continuarConGoogle('id-token'); });
    expect(toast.success).toHaveBeenCalledWith(MSG_CUENTA_VINCULADA, 15000);
    expect(MSG_CUENTA_VINCULADA).toMatch(/Tu contraseña anterior ya no funciona/);
    expect(mockNavigate).toHaveBeenCalledWith('/landing', { replace: true });
  });

  test('cuenta del personal: muestra el mensaje de la API y no inicia sesión', async () => {
    api.loginGoogle.mockRejectedValue({ response: { status: 403, data: { message: 'Esta cuenta debe ingresar con correo y contraseña' } } });
    const { result } = montar();
    await act(async () => { await result.current.continuarConGoogle('id-token'); });
    expect(mockOnError).toHaveBeenCalledWith('Esta cuenta debe ingresar con correo y contraseña');
    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

test('un 401 de /auth/google no se trata como sesión expirada', async () => {
  const listener = jest.fn();
  window.addEventListener(SESSION_EXPIRED_EVENT, listener);
  const err = { response: { status: 401 }, config: { url: '/auth/google' } };
  await expect(handleAuthError(err)).rejects.toBe(err);
  expect(listener).not.toHaveBeenCalled();
  window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
});

test('AuthContext expone loginConGoogle', () => {
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
  expect(typeof result.current.loginConGoogle).toBe('function');
});
