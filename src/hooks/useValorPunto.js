import { useState, useEffect } from 'react';

export function useValorPunto() {
  const [valorPunto, setValorPunto] = useState(12.5);

  const cargar = () => {
    const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3000') + '/api';
    fetch(`${apiUrl}/configuracion/valor-punto?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => { if (d.success && d.data?.valor_punto_pesos) setValorPunto(Number(d.data.valor_punto_pesos)); })
      .catch(() => {});
  };

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 120000); // refrescar cada 2 minutos -- si el admin cambia el valor, no queda pegado al viejo en una pestaña abierta
    return () => clearInterval(interval);
  }, []);

  return valorPunto;
}
