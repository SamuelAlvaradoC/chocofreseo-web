import { handleAuthError, SESSION_EXPIRED_EVENT } from './authEvents';

describe('handleAuthError (interceptor de 401)', () => {
  it('dispara el evento de sesión expirada ante un 401 en un endpoint autenticado', async () => {
    const listener = jest.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    const error401 = { response: { status: 401 }, config: { url: '/ventas' } };
    await expect(handleAuthError(error401)).rejects.toBe(error401);

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it('NO dispara el evento para un 401 en /auth/login (credenciales incorrectas, no sesión expirada)', async () => {
    const listener = jest.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    const errorLogin = { response: { status: 401 }, config: { url: '/auth/login' } };
    await expect(handleAuthError(errorLogin)).rejects.toBe(errorLogin);

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it('NO dispara el evento para errores que no son 401', async () => {
    const listener = jest.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    const error500 = { response: { status: 500 }, config: { url: '/ventas' } };
    await expect(handleAuthError(error500)).rejects.toBe(error500);

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it('sigue rechazando la promesa (no la "traga") para que el .catch() del caller siga funcionando', async () => {
    const error401 = { response: { status: 401 }, config: { url: '/pedidos' } };
    let capturado = null;
    try {
      await handleAuthError(error401);
    } catch (e) {
      capturado = e;
    }
    expect(capturado).toBe(error401);
  });
});
