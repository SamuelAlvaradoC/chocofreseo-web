import { createContext, useContext, useState } from 'react';
import * as api from '../services/api';

const AuthContext = createContext();

const normalizarRol = (rol) => (typeof rol === 'object' && rol !== null ? rol.nombre : rol);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const guardado = localStorage.getItem('usuario');
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });

  // Guarda el token, completa el usuario (perfil + permisos) y avisa al resto
  // de la página (el carrito escucha 'usuario-cambio'). La comparten el login
  // con contraseña y "Continuar con Google".
  const completarSesion = async ({ token, usuario: u }) => {
    localStorage.setItem('token', token);
    let normalizado = {
      ...u,
      rol:         normalizarRol(u.rol),
      id_cliente:  u.cliente?.id_cliente  || null,
      id_empleado: u.empleado?.id_empleado || null,
      telefono:    u.cliente?.telefono    || u.telefono || null,
      permisos:    [],
    };
    // Fetch perfil + permisos del rol en paralelo
    await Promise.allSettled([
      api.getPerfil().then((perfil) => {
        normalizado = {
          ...normalizado,
          telefono:   perfil.telefono   ?? normalizado.telefono,
          ciudad:     perfil.ciudad     ?? null,
          barrio:     perfil.barrio     ?? null,
          id_cliente: perfil.id_cliente ?? normalizado.id_cliente,
        };
      }),
      api.getMisPermisos().then((permisos) => {
        normalizado.permisos = Array.isArray(permisos) ? permisos.filter(Boolean) : [];
      }),
    ]);
    localStorage.setItem('usuario', JSON.stringify(normalizado));
    setUsuario(normalizado);
    window.dispatchEvent(new Event('usuario-cambio'));
    return normalizado;
  };

  const loginConAPI = async (email, contrasena) => completarSesion(await api.login({ email, contrasena }));

  /** @returns {{ usuario, vinculada, nueva }} vinculada: primera vez que la cuenta se conecta con Google */
  const loginConGoogle = async (credential) => {
    const data = await api.loginGoogle({ credential });
    const usuario = await completarSesion(data);
    return { usuario, vinculada: !!data.vinculada, nueva: !!data.nueva };
  };

  const login = (datos) => {
    const normalizado = { ...datos, rol: normalizarRol(datos.rol) };
    localStorage.setItem('usuario', JSON.stringify(normalizado));
    setUsuario(normalizado);
    window.dispatchEvent(new Event('usuario-cambio'));
  };

  const actualizarUsuario = (nuevosDatos) => {
    const actualizado = { ...usuario, ...nuevosDatos };
    localStorage.setItem('usuario', JSON.stringify(actualizado));
    setUsuario(actualizado);
  };

  const logout = async () => {
    try { await api.logout(); } catch { /* silencioso */ }
    // Limpiar carrito del usuario antes de remover datos
    try {
      const u = localStorage.getItem('usuario');
      if (u) { const parsed = JSON.parse(u); localStorage.removeItem(`carrito_${parsed.id_usuario || parsed.email || 'anon'}`); }
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
    window.dispatchEvent(new Event('usuario-cambio'));
  };

  const tienePermiso = (nombre) => usuario?.permisos?.includes(nombre) ?? false;

  return (
    <AuthContext.Provider value={{ usuario, login, loginConAPI, loginConGoogle, logout, actualizarUsuario, tienePermiso }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
