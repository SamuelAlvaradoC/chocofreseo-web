// Separado de api.js (que importa axios) para poder probar esta lógica sin
// arrastrar la transformación de axios en Jest.

// Evento global de "sesión expirada" -- quien lo escucha
// (SessionExpiredListener, montado dentro de BrowserRouter + AuthProvider)
// hace la limpieza de sesión, la redirección y el aviso. Se excluye el
// propio /auth/login: un 401 ahí es "credenciales incorrectas", no una
// sesión que expiró.
export const SESSION_EXPIRED_EVENT = 'sesion-expirada';

export const handleAuthError = (error) => {
  const status = error?.response?.status;
  const url = error?.config?.url || '';
  if (status === 401 && !url.includes('/auth/login')) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return Promise.reject(error);
};
