import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

const MAX_SALSAS_GRATIS  = 2;
const PRECIO_SALSA_EXTRA = 5000;

const parsearSalsas = (raw) => {
  if (!raw) return [];
  try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(p) ? p : []; } catch { return []; }
};

// Clave de localStorage por usuario
const getCarritoKey = () => {
  try {
    const u = localStorage.getItem('usuario');
    if (u) { const parsed = JSON.parse(u); return `carrito_${parsed.id_usuario || parsed.email || 'anon'}`; }
  } catch {}
  return 'carrito_anon';
};

// ID único: producto + chocolate + salsas + toppings + adiciones + observación
// (la observación entra en la clave para que dos unidades del mismo producto
// con notas de preparación distintas queden en líneas separadas del carrito
// en vez de fusionarse en una sola cantidad, perdiendo una de las dos notas)
function generarLineaId(item) {
  const toppingStr = [...(item.toppings ?? [])]
    .sort((a, b) => a.id_topping - b.id_topping)
    .map((t) => `${t.id_topping}x${t.cantidad || 1}`).join(',');
  const adicionStr = [...(item.adiciones ?? [])]
    .sort((a, b) => a.id_adicion - b.id_adicion)
    .map((a) => `${a.id_adicion}x${a.cantidad || 1}`).join(',');
  const salsaStr   = parsearSalsas(item.salsas).map(s => typeof s === 'object' ? (s.id || s.nombre || '') : s).sort().join(',');
  const choco      = item.chocolate || '';
  const frutas     = item.frutas || '';
  const obs        = item.observacion || '';
  return `${item.id_producto}__c${choco}__f${frutas}__s${salsaStr}__t${toppingStr}__a${adicionStr}__o${obs}`;
}

function precioUnitario(item) {
  const base         = Number(item.precio ?? 0);
  const maxIncluidos = item.permite_toppings ? (item.max_toppings || 0) : 0;
  const totalTop     = (item.toppings ?? []).reduce((s, t) => s + (t.cantidad || 1), 0);
  const toppingExtra = Math.max(0, totalTop - maxIncluidos) * 2000;
  const salsas       = parsearSalsas(item.salsas);
  const salsaExtra   = Math.max(0, salsas.length - MAX_SALSAS_GRATIS) * PRECIO_SALSA_EXTRA;
  const extras       = (item.adiciones ?? []).reduce((acc, a) => acc + Number(a.precio ?? 0) * (a.cantidad || 1), 0);
  return base + toppingExtra + salsaExtra + extras;
}

function migrarCarrito(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => item.lineaId ? item : { ...item, lineaId: generarLineaId(item) });
  } catch { return []; }
}

export function CartProvider({ children }) {
  const [carrito, setCarrito] = useState(() => {
    try {
      localStorage.removeItem('chocofreseo_carrito');
      const key      = getCarritoKey();
      const guardado = localStorage.getItem(key);
      return guardado ? migrarCarrito(guardado) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(getCarritoKey(), JSON.stringify(carrito)); } catch {}
  }, [carrito]);

  // Recargar carrito correcto cuando cambia de usuario (misma o distinta pestaña)
  useEffect(() => {
    const recargar = () => {
      try {
        const u = localStorage.getItem('usuario');
        if (!u) { setCarrito([]); return; }
        const parsed = JSON.parse(u);
        const key    = `carrito_${parsed.id_usuario || parsed.email || 'anon'}`;
        const saved  = localStorage.getItem(key);
        setCarrito(saved ? migrarCarrito(saved) : []);
      } catch { setCarrito([]); }
    };
    window.addEventListener('storage',       recargar);
    window.addEventListener('usuario-cambio', recargar);
    return () => {
      window.removeEventListener('storage',       recargar);
      window.removeEventListener('usuario-cambio', recargar);
    };
  }, []);

  const agregarItem = useCallback((item) => {
    const lineaId  = generarLineaId(item);
    const unitario = precioUnitario(item);
    setCarrito((prev) => {
      const existe = prev.find((x) => x.lineaId === lineaId);
      if (existe) {
        return prev.map((x) =>
          x.lineaId === lineaId
            ? { ...x, cantidad: x.cantidad + 1, subtotal: unitario * (x.cantidad + 1) }
            : x
        );
      }
      return [...prev, { ...item, lineaId, cantidad: 1, subtotal: unitario }];
    });
  }, []);

  const quitarItem = useCallback((lineaId) => {
    setCarrito((prev) => prev.filter((x) => x.lineaId !== lineaId));
  }, []);

  const cambiarCantidad = useCallback((lineaId, nuevaCantidad) => {
    if (nuevaCantidad < 1) { setCarrito((prev) => prev.filter((x) => x.lineaId !== lineaId)); return; }
    setCarrito((prev) =>
      prev.map((x) => {
        if (x.lineaId !== lineaId) return x;
        const unitario = precioUnitario(x);
        return { ...x, cantidad: nuevaCantidad, subtotal: unitario * nuevaCantidad };
      })
    );
  }, []);

  const limpiarCarrito = useCallback(() => {
    setCarrito([]);
    try { localStorage.removeItem(getCarritoKey()); } catch {}
  }, []);

  const subtotal   = carrito.reduce((a, x) => a + Number(x.subtotal), 0);
  const totalItems = carrito.reduce((a, x) => a + x.cantidad, 0);

  return (
    <CartContext.Provider value={{ carrito, agregarItem, quitarItem, cambiarCantidad, limpiarCarrito, subtotal, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
};
