import { useRef, useEffect, useCallback } from 'react';

// Devuelve una versión "debounced" de `callback`: cada llamada reinicia el
// temporizador, así que solo se ejecuta una vez que pasan `delay` ms sin que
// se vuelva a llamar. Usa un ref para el callback (siempre la versión más
// reciente, sin closures viejas) y otro para el timer, para no reinstanciar
// el temporizador en cada render -- mismo criterio que useRefetchOnFocus.
export default function useDebounce(callback, delay = 400) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const timerRef = useRef(null);

  const debounced = useCallback((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
  }, [delay]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return debounced;
}
