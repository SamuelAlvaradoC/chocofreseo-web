import { useState, useEffect } from 'react';
import * as api from '../services/api';

// null = todavía no se sabe (primer chequeo en curso) -- así el que lo usa
// puede distinguir "cargando" de "confirmado desconectado" y no mostrar
// una alarma roja por un instante mientras carga.
export function useEstadoImpresora() {
  const [conectada, setConectada] = useState(null);

  useEffect(() => {
    let activo = true;
    const chequear = () => api.getEstadoImpresora().then((c) => { if (activo) setConectada(c); });
    chequear();
    const interval = setInterval(chequear, 10000);
    return () => { activo = false; clearInterval(interval); };
  }, []);

  return conectada;
}
