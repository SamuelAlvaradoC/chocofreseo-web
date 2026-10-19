// Separado de api.js (que importa axios) para poder probar esta lógica sin
// arrastrar la transformación de axios en Jest.

// Evento global de "sesión expirada" -- quien lo escucha
// (SessionExpiredListener, montado dentro de BrowserRouter + AuthProvider)
// hace la limpieza de sesión, la redirección y el aviso. Se excluye el
// propio /auth/login: un 401 ahí es "credenciales incorrectas", no una
// sesión que expiró. Lo mismo para /auth/google (Continuar con Google).
export const SESSION_EXPIRED_EVENT = 'sesion-expirada';

const RUTAS_DE_INICIO = ['/auth/login', '/auth/google'];

export const handleAuthError = (error) => {
  const status = error?.response?.status;
  const url = error?.config?.url || '';
  if (status === 401 && !RUTAS_DE_INICIO.some((r) => url.includes(r))) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return Promise.reject(error);
};
