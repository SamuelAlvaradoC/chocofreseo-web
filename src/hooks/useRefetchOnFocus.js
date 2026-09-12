import { useEffect, useRef } from 'react';

// Vuelve a llamar `callback` cuando la pestaña recupera visibilidad o la
// ventana recupera el foco -- antes de esto, pantallas como Dashboard/
// Ventas/Pedidos/Catálogo solo cargaban datos una vez al montar, así que se
// veían "pegadas" con datos viejos si el usuario las dejaba abiertas y
// volvía después de un rato (sin necesidad de que el token expirara).
// `minIntervalMs` evita relanzar la carga si el usuario cambia de pestaña
// varias veces seguidas en poco tiempo.
export default function useRefetchOnFocus(callback, minIntervalMs = 10000) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const ultimaRef = useRef(Date.now());

  useEffect(() => {
    const intentarRecargar = () => {
      if (document.visibilityState === 'hidden') return;
      const ahora = Date.now();
      if (ahora - ultimaRef.current < minIntervalMs) return;
      ultimaRef.current = ahora;
      callbackRef.current();
    };
    document.addEventListener('visibilitychange', intentarRecargar);
    window.addEventListener('focus', intentarRecargar);
    return () => {
      document.removeEventListener('visibilitychange', intentarRecargar);
      window.removeEventListener('focus', intentarRecargar);
    };
  }, [minIntervalMs]);
}
