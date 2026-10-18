import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../services/api';
import { salsaDesdeId } from '../utils/salsas';

const CartContext = createContext(null);

const MAX_SALSAS_GRATIS  = 2;
const PRECIO_SALSA_EXTRA = 5000;

const parsearSalsas = (raw) => {
  if (!raw) return [];
  try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(p) ? p : []; } catch { return []; }
};

// ── Dónde se guarda el carrito ────────────────────────────────────────────
// Cualquiera puede armar su carrito, con o sin sesión:
//   - sin sesión  -> localStorage 'carrito_anon'
//   - con sesión  -> localStorage 'carrito_<id_usuario>' + servidor (tabla carritos)
// Al iniciar sesión, el carrito de invitado se combina con el del usuario
// (local y servidor) sin duplicar líneas, y el de invitado se vacía.
const CLAVE_INVITADO = 'carrito_anon';

const usuarioActual = () => {
  try { const u = localStorage.getItem('usuario'); return u ? JSON.parse(u) : null; } catch { return null; }
};
const claveDe = (u) => (u ? `carrito_${u.id_usuario || u.email || 'anon'}` : CLAVE_INVITADO);
const leer = (clave) => {
  try { const g = localStorage.getItem(clave); return g ? migrarCarrito(g) : []; } catch { return []; }
};
const escribir = (clave, items) => { try { localStorage.setItem(clave, JSON.stringify(items)); } catch {} };

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

export function precioUnitario(item) {
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

// Línea en el formato mínimo del servidor (el mismo de crear pedido, sin precios).
export const aCanonico = (item) => ({
  id_producto: item.id_producto,
  cantidad:    item.cantidad,
  toppings:    (item.toppings || []).map((t) => ({ id_topping: t.id_topping, cantidad: t.cantidad || 1 })),
  adiciones:   (item.adiciones || []).map((a) => ({ id_adicion: a.id_adicion, cantidad: a.cantidad || 1 })),
  salsas:      parsearSalsas(item.salsas).map((s) => String(typeof s === 'object' ? (s.id || s.nombre || '') : s)).filter(Boolean),
  chocolate:   item.chocolate || null,
  frutas:      item.frutas || null,
  observacion: item.observacion || null,
});

// Línea revalidada por la API -> ítem completo del carrito (nombres, precios e imágenes actuales).
export const desdeLinea = (l) => {
  const item = {
    ...l.producto,
    toppings:    l.toppings,
    adiciones:   l.adiciones,
    salsas:      (l.salsas || []).map(salsaDesdeId),
    chocolate:   l.chocolate,
    frutas:      l.frutas,
    observacion: l.observacion,
    cantidad:    l.cantidad,
  };
  return { ...item, lineaId: generarLineaId(item), subtotal: precioUnitario(item) * item.cantidad };
};

// Combina carritos SIN duplicar: si la misma línea está en dos lados (mismo
// producto con la misma configuración) se queda una sola, con la cantidad mayor.
export const combinarCarritos = (...listas) => {
  const porLinea = new Map();
  for (const lista of listas) {
    for (const it of lista) {
      const prev = porLinea.get(it.lineaId);
      if (!prev || it.cantidad > prev.cantidad) porLinea.set(it.lineaId, it);
    }
  }
  return [...porLinea.values()];
};

// Une líneas que quedaron iguales después de revalidar (ej. se quitó un
// topping desactivado y ahora coincide con otra línea): aquí SÍ se suman.
const unirIguales = (lista) => {
  const porLinea = new Map();
  for (const it of lista) {
    const prev = porLinea.get(it.lineaId);
    if (prev) {
      const cantidad = prev.cantidad + it.cantidad;
      porLinea.set(it.lineaId, { ...prev, cantidad, subtotal: precioUnitario(prev) * cantidad });
    } else porLinea.set(it.lineaId, it);
  }
  return [...porLinea.values()];
};

const fmt = (n) => `$${Math.round(n).toLocaleString('es-CO')}`;

export function CartProvider({ children }) {
  const [carrito, setCarrito] = useState(() => {
    try { localStorage.removeItem('chocofreseo_carrito'); } catch {}
    return leer(claveDe(usuarioActual()));
  });
  // true mientras se trae y combina el carrito del servidor tras iniciar sesión
  const [sincronizando, setSincronizando] = useState(false);
  // No se sube el carrito al servidor hasta haber leído el que ya estaba allá
  // (si no, un carrito local viejo pisaría al del otro dispositivo).
  const servidorListo = useRef(false);
  const carritoRef = useRef(carrito);
  carritoRef.current = carrito;

  // Trae el carrito guardado en el servidor y lo combina con el local.
  const sincronizarConServidor = useCallback(async () => {
    servidorListo.current = false;
    setSincronizando(true);
    try {
      const { items = [] } = (await api.getCarritoGuardado()) || {};
      let resultado = carritoRef.current;
      if (items.length > 0) {
        const { lineas } = await api.validarCarrito(items);
        const delServidor = lineas.filter((l) => l.disponible).map(desdeLinea);
        resultado = combinarCarritos(carritoRef.current, delServidor);
        setCarrito(resultado);
      }
      servidorListo.current = true;
      // Se guarda el resultado combinado (aunque el servidor no tuviera nada).
      api.guardarCarrito(resultado.map(aCanonico)).catch(() => {});
    } catch {
      // Sin conexión o error del servidor: se sigue con el carrito local.
      servidorListo.current = true;
    } finally {
      setSincronizando(false);
    }
  }, []);

  // Guardar en el dispositivo siempre; en el servidor (con un pequeño
  // retardo para no enviar un pedido por cada clic) solo si hay sesión.
  useEffect(() => {
    const u = usuarioActual();
    escribir(claveDe(u), carrito);
    if (!u || !servidorListo.current) return undefined;
    const t = setTimeout(() => { api.guardarCarrito(carrito.map(aCanonico)).catch(() => {}); }, 800);
    return () => clearTimeout(t);
  }, [carrito]);

  // Al abrir la página con sesión iniciada: combinar con el del servidor.
  useEffect(() => {
    if (usuarioActual()) sincronizarConServidor();
  }, [sincronizarConServidor]);

  // Inicio / cierre de sesión (en esta pestaña o en otra).
  useEffect(() => {
    const cambioDeUsuario = () => {
      const u = usuarioActual();
      if (!u) {
        // Cerró sesión: el carrito era de esa cuenta; queda el de invitado (vacío).
        servidorListo.current = false;
        setCarrito(leer(CLAVE_INVITADO));
        return;
      }
      // Inició sesión: lo que armó como invitado + lo que tenía su cuenta en
      // este dispositivo, al instante (el checkout no ve un carrito vacío)...
      const local = combinarCarritos(leer(claveDe(u)), leer(CLAVE_INVITADO));
      try { localStorage.removeItem(CLAVE_INVITADO); } catch {}
      setCarrito(local);
      // ...y luego lo que tenga guardado en el servidor.
      sincronizarConServidor();
    };
    const onStorage = (e) => {
      if (e.key === 'usuario') cambioDeUsuario();
      else if (e.key === claveDe(usuarioActual())) setCarrito(leer(e.key));
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('usuario-cambio', cambioDeUsuario);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('usuario-cambio', cambioDeUsuario);
    };
  }, [sincronizarConServidor]);

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
    try { localStorage.removeItem(claveDe(usuarioActual())); } catch {}
  }, []);

  /**
   * Revalida el carrito con la API (precios, disponibilidad, toppings y
   * adiciones), lo actualiza y devuelve la lista de cambios en texto para
   * mostrarla al cliente. Lista vacía = nada cambió.
   * Si la API no responde, no toca el carrito y devuelve null.
   */
  const validarCarrito = useCallback(async () => {
    const actual = carritoRef.current;
    if (actual.length === 0) return [];
    let lineas;
    try { ({ lineas } = await api.validarCarrito(actual.map(aCanonico))); } catch { return null; }
    const cambios = [];
    const nuevo = [];
    lineas.forEach((l, i) => {
      const viejo = actual[i];
      const nombre = l.producto?.nombre || viejo.nombre;
      if (!l.disponible) { cambios.push(`${nombre} ya no está disponible y se quitó del carrito`); return; }
      l.cambios.forEach((c) => cambios.push(`${nombre}: ${c}`));
      const item = desdeLinea(l);
      const antes = precioUnitario(viejo);
      const ahora = precioUnitario(item);
      if (Math.round(antes) !== Math.round(ahora)) cambios.push(`${nombre}: el precio cambió de ${fmt(antes)} a ${fmt(ahora)}`);
      nuevo.push(item);
    });
    setCarrito(unirIguales(nuevo));
    return cambios;
  }, []);

  const subtotal   = carrito.reduce((a, x) => a + Number(x.subtotal), 0);
  const totalItems = carrito.reduce((a, x) => a + x.cantidad, 0);

  return (
    <CartContext.Provider value={{ carrito, agregarItem, quitarItem, cambiarCantidad, limpiarCarrito, validarCarrito, sincronizando, subtotal, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
};
