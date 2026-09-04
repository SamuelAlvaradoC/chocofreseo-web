import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Cada pantalla "registra" su propia función de recarga al montarse (via
// useRefrescoHeader) y la des-registra al desmontarse -- el botón de
// refrescar del header (Topbar/Navbar) simplemente invoca la que esté
// registrada en ese momento, sin saber nada de qué pantalla es. Como el
// registro ocurre en un efecto de montaje/desmontaje, cambiar de pantalla
// (o de pestaña dentro de una pantalla con sub-secciones, ej. Perfil)
// actualiza automáticamente cuál función se llama -- sin esto, Topbar/
// Navbar tendrían que conocer de antemano cada página y su función de
// carga, acoplando componentes que hoy son completamente independientes.
//
// Dos contextos separados a propósito (INCIDENTE 2026-09-04: un solo
// contexto con {registrarRefresco, refrescar, refrescando, hayRefresco}
// como único value causaba un loop infinito de renders que dejaba TODO el
// sitio sin responder a clics). La causa: ese value era un objeto literal
// nuevo en cada render del Provider; useRefrescoHeader lo leía con
// useContext, así que CUALQUIER cambio de estado del Provider re-renderizaba
// también a la pantalla que llama al hook -- la cual, al re-renderizar,
// vuelve a crear su función `cargar` con una identidad nueva (no viene
// envuelta en useCallback en ninguna pantalla), disparando de nuevo el
// efecto de registro, que vuelve a actualizar el estado del Provider, sin
// fin. Ahora `registrarRefresco` vive en su propio contexto con un valor
// 100% estable (nunca cambia de referencia), así que registrar no puede
// nunca causar un re-render de quien registra.
const RegistrarContext = createContext(() => {});
const EstadoContext = createContext({ refrescar: async () => {}, refrescando: false, hayRefresco: false });

export function RefrescoProvider({ children }) {
  const fnRef = useRef(null);
  const [refrescando, setRefrescando] = useState(false);
  const [hayRefresco, setHayRefresco] = useState(false);

  const registrarRefresco = useMemo(() => (nuevaFn) => {
    fnRef.current = nuevaFn || null;
    setHayRefresco(!!nuevaFn);
  }, []);

  const refrescar = useMemo(() => async () => {
    const fn = fnRef.current;
    if (!fn) return;
    setRefrescando(true);
    try {
      await fn();
    } catch (_) {
      // Cada pantalla ya maneja sus propios errores/toasts en su función
      // de carga -- aquí solo importa no dejar el spinner pegado.
    } finally {
      setRefrescando(false);
    }
  }, []);

  const estado = useMemo(() => ({ refrescar, refrescando, hayRefresco }), [refrescar, refrescando, hayRefresco]);

  return (
    <RegistrarContext.Provider value={registrarRefresco}>
      <EstadoContext.Provider value={estado}>
        {children}
      </EstadoContext.Provider>
    </RegistrarContext.Provider>
  );
}

// Para el botón en Topbar/Navbar.
export function useRefresco() {
  return useContext(EstadoContext);
}

// Para que cada pantalla (o sub-sección, ej. cada tab de Perfil) registre
// su función de recarga con una sola línea. `fn` puede cambiar de
// identidad en cada render sin problema -- si no viene envuelta en
// useCallback, este hook igual la vuelve a registrar (nunca queda una
// versión vieja/obsoleta pegada), y como `registrarRefresco` es estable,
// eso no dispara ningún re-render adicional.
export function useRefrescoHeader(fn) {
  const registrarRefresco = useContext(RegistrarContext);
  useEffect(() => {
    registrarRefresco(fn);
    return () => registrarRefresco(null);
  }, [fn, registrarRefresco]);
}
