import { render } from '@testing-library/react';
import SessionExpiredListener from './SessionExpiredListener';
import { SESSION_EXPIRED_EVENT } from '../services/authEvents';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

const mockLogout = jest.fn().mockResolvedValue(undefined);
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

jest.mock('../utils/toast', () => ({
  toast: { warning: jest.fn(), success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { toast } from '../utils/toast';

const dispararSesionExpirada = () => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));

describe('SessionExpiredListener', () => {
  beforeEach(() => jest.clearAllMocks());

  it('limpia la sesión, redirige a /login y avisa con el mensaje correcto', async () => {
    render(<SessionExpiredListener />);

    dispararSesionExpirada();
    await new Promise((r) => setTimeout(r, 0)); // deja correr el async del handler

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(toast.warning).toHaveBeenCalledWith('Tu sesión expiró, inicia sesión de nuevo');
  });

  it('ignora eventos repetidos mientras ya está manejando uno (evita loops/duplicados)', async () => {
    let resolverLogout;
    mockLogout.mockImplementationOnce(() => new Promise((r) => { resolverLogout = r; }));

    render(<SessionExpiredListener />);

    dispararSesionExpirada();
    dispararSesionExpirada(); // llega mientras el primero todavía está "en vuelo"
    dispararSesionExpirada();

    resolverLogout();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('quita el listener al desmontar (no reacciona a eventos después)', async () => {
    const { unmount } = render(<SessionExpiredListener />);
    unmount();

    dispararSesionExpirada();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
