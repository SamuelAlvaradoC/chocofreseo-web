// Encabezados JSON para fetch() directo a la API, con el token de la sesión
// si hay una (las llamadas con axios lo agregan solas en services/api.js).
export const headersConSesion = () => {
  let token = null;
  try { token = localStorage.getItem('token'); } catch {}
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
