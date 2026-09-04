import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Cada pantalla "registra" su propia función de recarga al montarse (via
// useRefrescoHeader) y la des-registra al desmontarse -- el botón de
// refrescar del header (Topbar/Navbar) simplemente invoca la que esté
// registrada en ese momento, sin saber nada de qué pantalla es. Como el
// registro ocurre en un efecto de montaje/desmontaje, cambiar de pantalla
// (o de pestaña dentro de una pantalla con sub-secciones, ej. Perfil)
// actualiza automáticamente cuál función se llama -- sin esto, Topbar/
// Navbar tendrían que conocer de antemano cada página y su función de
// carga, acoplando componentes que hoy son completamente independientes.
const RefrescoContext = createContext(null);

export function RefrescoProvider({ children }) {
  const [fn, setFn] = useState(null);
  const [refrescando, setRefrescando] = useState(false);

  const registrarRefresco = useCallback((nuevaFn) => {
    setFn(() => nuevaFn || null);
  }, []);

  const refrescar = useCallback(async () => {
    if (!fn || refrescando) return;
    setRefrescando(true);
    try {
      await fn();
    } catch (_) {
      // Cada pantalla ya maneja sus propios errores/toasts en su función
      // de carga -- aquí solo importa no dejar el spinner pegado.
    } finally {
      setRefrescando(false);
    }
  }, [fn, refrescando]);

  return (
    <RefrescoContext.Provider value={{ registrarRefresco, refrescar, refrescando, hayRefresco: !!fn }}>
      {children}
    </RefrescoContext.Provider>
  );
}

// Para el botón en Topbar/Navbar.
export function useRefresco() {
  return useContext(RefrescoContext);
}

// Para que cada pantalla (o sub-sección, ej. cada tab de Perfil) registre
// su función de recarga con una sola línea. `fn` puede cambiar de
// identidad en cada render sin problema -- si no viene envuelta en
// useCallback, este hook igual la vuelve a registrar (nunca queda una
// versión vieja/obsoleta pegada).
export function useRefrescoHeader(fn) {
  const { registrarRefresco } = useContext(RefrescoContext);
  useEffect(() => {
    registrarRefresco(fn);
    return () => registrarRefresco(null);
  }, [fn, registrarRefresco]);
}
