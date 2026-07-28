import { useState, useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';
import { imgCl } from '../../../utils/cloudinary';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/layout/Navbar/Navbar';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useTiempoEspera } from '../../../hooks/useTiempoEspera';
import { useEstadoTienda } from '../../../hooks/useEstadoTienda';
import { formatHora12 } from '../../../utils/formatHora';
import * as api from '../../../services/api';
import './Catalogo.css';


const SALSAS_DISPONIBLES = [
  { id: 'arequipe',         nombre: 'Arequipe',          img: 'https://res.cloudinary.com/diqeuyoqo/image/upload/v1779742573/patatas_arequipe_vhgewf.png' },
  { id: 'chocolate_negro',  nombre: 'Chocolate Negro',   img: 'https://res.cloudinary.com/diqeuyoqo/image/upload/v1779742679/patatas_chocolate_negro_oluxzf.png' },
  { id: 'chocolate_blanco', nombre: 'Chocolate Blanco',  img: 'https://res.cloudinary.com/diqeuyoqo/image/upload/v1779742648/patatas_chocolate_blanco_t6dwl5.png' },
  { id: 'mermelada_mora',   nombre: 'Mermelada de Mora', img: 'https://res.cloudinary.com/diqeuyoqo/image/upload/v1779742724/patatas_mermelada_jlcyrs.png' },
];
const MAX_SALSAS_GRATIS  = 2;
const PRECIO_SALSA_EXTRA = 5000;
const COLOR_SALSAS       = '#ea580c';
const parsearSalsas = (raw) => { if (!raw) return []; try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(p) ? p : []; } catch { return []; } };
const nombreSalsa   = (s) => { const n = typeof s === 'object' ? s.nombre : s; if (!n) return ''; return n.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); };


/* ─── Modal con flujo por pasos ─── */
function ModalProducto({ open, onClose, onConfirmar, producto, toppingsDisponibles, adicionesDisponibles }) {
  const [pasoIdx,          setPasoIdx]          = useState(0);
  const [chocolateElegido, setChocolateElegido] = useState('');
  const [coberturaElegida, setCoberturaElegida] = useState('');
  const [toppings,         setToppings]         = useState([]);
  const [salsasElegidas,   setSalsasElegidas]   = useState([]);
  const [adiciones,        setAdiciones]        = useState([]);
  const [observaciones,    setObservaciones]    = useState('');

  if (!open || !producto) return null;

  const tieneChocolate = producto.permite_chocolate === true;
  const tieneToppings  = producto.permite_toppings === 1 && toppingsDisponibles.length > 0;
  const tieneSalsas    = producto.permite_salsas === true;
  const sinToppings    = !tieneToppings;

  // Calcular pasos aplicables
  const pasos = [];
  if (producto.es_bowl) pasos.push('bowl');
  if (tieneChocolate)   pasos.push('chocolate');
  if (tieneSalsas)      pasos.push('salsas');
  if (tieneToppings)    pasos.push('toppings');
  pasos.push('adiciones');

  const pasoActual   = pasos[pasoIdx] || 'adiciones';
  const esUltimoPaso = pasoIdx === pasos.length - 1;
  const esPrimerPaso = pasoIdx === 0;

  // Helpers toppings
  const maxTop        = producto.max_toppings || 0;
  const totalUnidades = toppings.reduce((s, t) => s + t.cantidad, 0);
  const incluidos     = Math.min(totalUnidades, maxTop);
  const cobrados      = Math.max(0, totalUnidades - maxTop);

  const agregarTopping = (t) => setToppings((p) => [...p, { ...t, cantidad: 1 }]);
  const ajustarTopping = (id, delta) => setToppings((p) =>
    p.map((t) => t.id_topping === id ? { ...t, cantidad: t.cantidad + delta } : t).filter((t) => t.cantidad > 0)
  );

  // Helpers adiciones
  const agregarAdicion = (a) => setAdiciones((p) => [...p, { ...a, precio: Number(a.precio), cantidad: 1 }]);
  const ajustarAdicion = (id, delta) => setAdiciones((p) =>
    p.map((a) => a.id_adicion === id ? { ...a, cantidad: a.cantidad + delta } : a).filter((a) => a.cantidad > 0)
  );

  // Precio en tiempo real
  const base          = Number(producto.precio);
  const topExtra      = sinToppings ? totalUnidades * 2000 : cobrados * 2000;
  const adicionTotal  = adiciones.reduce((s, a) => s + a.precio * a.cantidad, 0);
  const salsasExtra   = Math.max(0, salsasElegidas.length - MAX_SALSAS_GRATIS) * PRECIO_SALSA_EXTRA;
  const total         = base + topExtra + adicionTotal + salsasExtra;

  const puedeAvanzar = (pasoActual !== 'chocolate' || !!chocolateElegido) && (pasoActual !== 'bowl' || !!coberturaElegida);

  const cerrar = () => {
    setPasoIdx(0); setChocolateElegido(''); setCoberturaElegida(''); setToppings([]); setSalsasElegidas([]); setAdiciones([]); setObservaciones('');
    onClose();
  };

  const avanzar = () => {
    if (!puedeAvanzar) return;
    if (esUltimoPaso) {
      onConfirmar({
        ...producto,
        toppings,
        salsas: producto.es_bowl ? (coberturaElegida ? [{ nombre: coberturaElegida }] : []) : salsasElegidas,
        adiciones,
        subtotal: total,
        cantidad: 1,
        max_toppings: producto.max_toppings,
        chocolate: tieneChocolate ? chocolateElegido : null,
        observaciones: observaciones.trim() || null,
      });
      setPasoIdx(0); setChocolateElegido(''); setCoberturaElegida(''); setToppings([]); setSalsasElegidas([]); setAdiciones([]); setObservaciones('');
    } else {
      setPasoIdx((i) => i + 1);
    }
  };

  const retroceder = () => {
    if (!esPrimerPaso) setPasoIdx((i) => i - 1);
    else cerrar();
  };

  // ──── Estilos compartidos ────
  const chipB  = { background: 'none', border: 'none', cursor: 'pointer', padding: '0 5px', fontSize: 15, fontWeight: 800, lineHeight: 1 };
  const secLbl = { fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, margin: '16px 0 10px' };

  // ──── Renderizado por paso ────

  /* PASO: BOWL COBERTURA */
  const renderBowl = () => (
    <>
      <div style={{ position: 'relative', height: 160, flexShrink: 0 }}>
        {producto.img
          ? <img src={imgCl(producto.img, 600, 320)} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px 20px 0 0' }} />
          : <div style={{ height: '100%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, borderRadius: '20px 20px 0 0' }}>🥣</div>
        }
        <button onClick={cerrar} style={{ position: 'absolute', top: 12, right: 12, background: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 18, fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a1a1a' }}>{producto.nombre}</h2>
        <p style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 800, color: '#CA0B0B' }}>${base.toLocaleString('es-CO')}</p>
      </div>
      <div style={{ flex: 1, padding: '0 20px 16px', overflowY: 'auto' }}>
        <p style={{ ...secLbl }}>¿Con qué cobertura lo prefieres?</p>
        <div style={{ display: 'flex', gap: 10, margin: '4px 0' }}>
          {[
            { nombre: 'Chocolate Negro',  img: 'https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778815863/chocolate_negro_ancho_kzqpjd.png',  color: '#1a1a1a' },
            { nombre: 'Chocolate Blanco', img: 'https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778815900/chocolate_blanco_ancho_rw2b5l.png', color: '#F5E6D0' },
            { nombre: 'Arequipe',         img: 'https://res.cloudinary.com/diqeuyoqo/image/upload/v1779742573/patatas_arequipe_vhgewf.png',         color: '#C8860A' },
          ].map((op) => {
            const sel = coberturaElegida === op.nombre;
            return (
              <button key={op.nombre} onClick={() => setCoberturaElegida(op.nombre)} style={{
                flex: 1, height: 130, borderRadius: 14, cursor: 'pointer', padding: 0,
                background: op.color,
                border: sel ? '3px solid #CA0B0B' : '1px solid #eee',
                position: 'relative', overflow: 'hidden',
                boxShadow: sel ? '0 6px 20px rgba(202,11,11,0.35)' : 'none',
                transition: 'all 0.2s ease',
              }}>
                <img src={op.img} alt={op.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                  padding: '26px 8px 8px', color: '#fff', fontWeight: 700, fontSize: 11, fontFamily: 'inherit', textAlign: 'center',
                }}>
                  {op.nombre}
                </div>
                {sel && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6, zIndex: 3,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#CA0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                  }}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 20px', flexShrink: 0 }}>
        <button onClick={avanzar} disabled={!coberturaElegida} style={{
          width: '100%', padding: 14, background: coberturaElegida ? '#CA0B0B' : '#e5e7eb',
          color: coberturaElegida ? '#fff' : '#aaa', border: 'none', borderRadius: 12,
          fontSize: 15, fontWeight: 800, cursor: coberturaElegida ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
        }}>
          Continuar →
        </button>
      </div>
    </>
  );

  /* PASO: CHOCOLATE */
  const renderChocolate = () => (
    <>
      {/* Imagen del producto */}
      <div style={{ position: 'relative', height: 220, flexShrink: 0 }}>
        {producto.img
          ? <img src={imgCl(producto.img, 600, 440)} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px 20px 0 0' }} />
          : <div style={{ height: '100%', background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, borderRadius: '20px 20px 0 0' }}>🍫</div>
        }
        <button onClick={cerrar} style={{ position: 'absolute', top: 12, right: 12, background: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 18, fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a1a1a' }}>{producto.nombre}</h2>
        <p style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 800, color: '#CA0B0B' }}>${base.toLocaleString('es-CO')}</p>
      </div>
      <div style={{ flex: 1, padding: '0 20px 16px', overflowY: 'auto' }}>
        <p style={{ ...secLbl }}>¿Con qué chocolate lo prefieres?</p>
        <div style={{ display: 'flex', gap: 12, margin: '4px 0' }}>
          {['Negro', 'Blanco'].map((tipo) => {
            const sel = chocolateElegido === tipo;
            const img = tipo === 'Negro'
              ? 'https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778815863/chocolate_negro_ancho_kzqpjd.png'
              : 'https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778815900/chocolate_blanco_ancho_rw2b5l.png';
            return (
              <button key={tipo} onClick={() => setChocolateElegido(tipo)} style={{
                flex: 1, height: 155, borderRadius: 16, cursor: 'pointer', padding: 0,
                border: sel ? '3px solid #CA0B0B' : '1px solid #eee',
                position: 'relative', overflow: 'hidden',
                boxShadow: sel ? '0 6px 20px rgba(202,11,11,0.35)' : 'none',
                transition: 'all 0.2s ease',
              }}>
                <img src={img} alt={`Chocolate ${tipo}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                  padding: '30px 12px 10px',
                  color: '#fff', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', textAlign: 'center',
                }}>
                  {tipo}
                </div>
                {sel && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6, zIndex: 3,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#CA0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                  }}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 20px', flexShrink: 0 }}>
        <button onClick={avanzar} disabled={!chocolateElegido} style={{
          width: '100%', padding: 14, background: chocolateElegido ? '#CA0B0B' : '#e5e7eb',
          color: chocolateElegido ? '#fff' : '#aaa', border: 'none', borderRadius: 12,
          fontSize: 15, fontWeight: 800, cursor: chocolateElegido ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
        }}>
          Continuar →
        </button>
      </div>
    </>
  );

  /* PASO: TOPPINGS */
  const renderToppings = () => (
    <>
      <div style={{ padding: '14px 20px 10px', flexShrink: 0, borderBottom: '1px solid #f5f5f5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>Elige tus toppings</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, background: '#f9fafb', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#666' }}>
              <span>Los primeros <strong>{maxTop}</strong> son gratis · Extra: <strong>$2.000 c/u</strong></span>
            </div>
          </div>
          <button onClick={cerrar} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa', lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        {totalUnidades > 0 && (
          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: cobrados > 0 ? '#CA0B0B' : '#16a34a' }}>
            {incluidos > 0 && `✓ ${incluidos} incluido${incluidos > 1 ? 's' : ''} gratis`}
            {cobrados > 0 && ` · +${cobrados} extra = $${(cobrados * 2000).toLocaleString('es-CO')}`}
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {toppingsDisponibles.map((t) => {
            const enLista = toppings.find((x) => x.id_topping === t.id_topping);
            return (
              <div key={t.id_topping} onClick={() => !enLista && agregarTopping(t)} style={{
                borderRadius: 12, cursor: enLista ? 'default' : 'pointer',
                position: 'relative', overflow: 'hidden', height: 100,
                border: enLista ? '2px solid #1a1a1a' : '1px solid #eee',
                boxShadow: enLista ? '0 4px 14px rgba(0,0,0,0.22)' : 'none',
                transition: 'all 0.2s ease',
              }}>
                {t.img
                  ? <img src={imgCl(t.img, 200, 200)} alt={t.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 28, color: '#aaa' }}>{t.nombre.charAt(0).toUpperCase()}</div>
                }
                {/* Overlay nombre */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)',
                  padding: '22px 8px 8px', textAlign: 'center',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#fff' }}>{t.nombre}</div>
                  {t.gramaje && <div style={{ fontSize: 10, color: '#ddd', marginTop: 1 }}>{t.gramaje}</div>}
                </div>
                {/* Controles cantidad cuando está seleccionado */}
                {enLista && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1a1a1a', borderRadius: 20, padding: '4px 10px' }}>
                      <button style={{ ...chipB, color: '#fff', fontSize: 16 }} onClick={(e) => { e.stopPropagation(); ajustarTopping(t.id_topping, -1); }}>−</button>
                      <span style={{ fontWeight: 800, fontSize: 15, color: '#fff', minWidth: 18, textAlign: 'center' }}>{enLista.cantidad}</span>
                      <button style={{ ...chipB, color: '#fff', fontSize: 16 }} onClick={(e) => { e.stopPropagation(); ajustarTopping(t.id_topping, 1); }}>+</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 20px', flexShrink: 0, display: 'flex', gap: 10 }}>
        <button onClick={retroceder} style={{ flex: 0, padding: '12px 18px', borderRadius: 12, border: '2px solid #e5e7eb', background: '#fff', color: '#555', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>← Atrás</button>
        <button onClick={avanzar} style={{ flex: 1, padding: 12, background: '#CA0B0B', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Continuar →</button>
      </div>
    </>
  );

  /* PASO: ADICIONES */
  const renderAdiciones = () => (
    <>
      <div style={{ padding: '14px 20px 10px', flexShrink: 0, borderBottom: '1px solid #f5f5f5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
            Adiciones <span style={{ color: '#aaa', fontWeight: 400 }}>— Opcional</span>
          </p>
          <button onClick={cerrar} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa', lineHeight: 1, padding: 4 }}>✕</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        {/* Adiciones */}
        {adicionesDisponibles.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {adicionesDisponibles.map((a) => {
                const enLista = adiciones.find((x) => x.id_adicion === a.id_adicion);
                return (
                  <div key={a.id_adicion} onClick={() => !enLista && agregarAdicion(a)} style={{
                    borderRadius: 12, cursor: enLista ? 'default' : 'pointer',
                    position: 'relative', overflow: 'hidden', height: 100,
                    border: enLista ? '2px solid #d97706' : '1px solid #eee',
                    boxShadow: enLista ? '0 4px 14px rgba(217,119,6,0.3)' : 'none',
                    transition: 'all 0.2s ease',
                  }}>
                    {a.img
                      ? <img src={imgCl(a.img, 200, 200)} alt={a.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', height: '100%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 28, color: '#d97706' }}>{a.nombre.charAt(0).toUpperCase()}</div>
                    }
                    {/* Overlay nombre + precio */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)',
                      padding: '22px 8px 8px', textAlign: 'center',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#fff' }}>{a.nombre}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', marginTop: 1 }}>
                        +${Number(a.precio).toLocaleString('es-CO')}
                      </div>
                    </div>
                    {/* Controles cantidad cuando está seleccionado */}
                    {enLista && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#d97706', borderRadius: 20, padding: '4px 10px' }}>
                          <button style={{ ...chipB, color: '#fff', fontSize: 16 }} onClick={(e) => { e.stopPropagation(); ajustarAdicion(a.id_adicion, -1); }}>−</button>
                          <span style={{ fontWeight: 800, fontSize: 15, color: '#fff', minWidth: 18, textAlign: 'center' }}>{enLista.cantidad}</span>
                          <button style={{ ...chipB, color: '#fff', fontSize: 16 }} onClick={(e) => { e.stopPropagation(); ajustarAdicion(a.id_adicion, 1); }}>+</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Toppings extra (solo si el producto NO tiene toppings) */}
        {sinToppings && toppingsDisponibles.length > 0 && (
          <>
            <hr style={{ border: 'none', borderTop: '1px dashed #e5e7eb', margin: '4px 0 12px' }} />
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a', marginBottom: 2, margin: '0 0 2px' }}>Toppings extras — $2.000 c/u</p>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Opcionales, cada uno se cobra por separado</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
              {toppingsDisponibles.map((t) => {
                const enLista = toppings.find((x) => x.id_topping === t.id_topping);
                return (
                  <div key={t.id_topping} onClick={() => !enLista && agregarTopping(t)} style={{
                    borderRadius: 12, cursor: enLista ? 'default' : 'pointer',
                    position: 'relative', overflow: 'hidden', height: 100,
                    border: enLista ? '2px solid #1a1a1a' : '1px solid #eee',
                    boxShadow: enLista ? '0 4px 14px rgba(0,0,0,0.22)' : 'none',
                    transition: 'all 0.2s ease',
                  }}>
                    {t.img
                      ? <img src={imgCl(t.img, 200, 200)} alt={t.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', height: '100%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 28, color: '#aaa' }}>{t.nombre.charAt(0).toUpperCase()}</div>
                    }
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)', padding: '22px 8px 8px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#fff' }}>{t.nombre}</div>
                      <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 1, fontWeight: 700 }}>+$2.000</div>
                    </div>
                    {enLista && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1a1a1a', borderRadius: 20, padding: '4px 10px' }}>
                          <button style={{ ...chipB, color: '#fff', fontSize: 16 }} onClick={(e) => { e.stopPropagation(); ajustarTopping(t.id_topping, -1); }}>−</button>
                          <span style={{ fontWeight: 800, fontSize: 15, color: '#fff', minWidth: 18, textAlign: 'center' }}>{enLista.cantidad}</span>
                          <button style={{ ...chipB, color: '#fff', fontSize: 16 }} onClick={(e) => { e.stopPropagation(); ajustarTopping(t.id_topping, 1); }}>+</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {totalUnidades > 0 && (
              <p style={{ fontSize: 12, fontWeight: 700, color: '#CA0B0B', marginBottom: 4 }}>
                {totalUnidades} topping{totalUnidades > 1 ? 's' : ''} extra = +${(totalUnidades * 2000).toLocaleString('es-CO')}
              </p>
            )}
          </>
        )}

      </div>

      {/* Footer con desglose */}
      <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 20px', flexShrink: 0, background: '#fff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8, fontSize: 12, color: '#888' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Precio base</span><span>${base.toLocaleString('es-CO')}</span>
          </div>
          {topExtra > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#CA0B0B' }}>
              <span>Toppings extra</span><span>+${topExtra.toLocaleString('es-CO')}</span>
            </div>
          )}
          {salsasExtra > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: COLOR_SALSAS }}>
              <span>Salsas extra</span><span>+${salsasExtra.toLocaleString('es-CO')}</span>
            </div>
          )}
          {adicionTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
              <span>Adiciones</span><span>+${adicionTotal.toLocaleString('es-CO')}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>Total</span>
          <span style={{ fontWeight: 900, fontSize: 18, color: '#CA0B0B' }}>${total.toLocaleString('es-CO')}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!esPrimerPaso && (
            <button onClick={retroceder} style={{ flex: 0, padding: '12px 18px', borderRadius: 12, border: '2px solid #e5e7eb', background: '#fff', color: '#555', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>← Atrás</button>
          )}
          <button onClick={avanzar} style={{ flex: 1, padding: 13, background: '#CA0B0B', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            🛒 Agregar al carrito
          </button>
        </div>
      </div>
    </>
  );

  /* PASO: SALSAS */
  const renderSalsas = () => {
    const salsasGratis = Math.min(salsasElegidas.length, MAX_SALSAS_GRATIS);
    const salsasCobradas = Math.max(0, salsasElegidas.length - MAX_SALSAS_GRATIS);
    const costoSalsas = salsasCobradas * PRECIO_SALSA_EXTRA;
    return (
      <>
        <div style={{ padding: '16px 20px 12px', flexShrink: 0, borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>{producto.nombre}</h2>
              <p style={{ margin: '3px 0 0', fontSize: 16, fontWeight: 800, color: '#CA0B0B' }}>${base.toLocaleString('es-CO')}</p>
            </div>
            <button onClick={cerrar} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
          <p style={{ ...secLbl, marginTop: 10, marginBottom: 0 }}>Elige tus salsas 🍫</p>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            Las primeras {MAX_SALSAS_GRATIS} son gratis · Adicionales: ${PRECIO_SALSA_EXTRA.toLocaleString('es-CO')} c/u
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 14 }}>
            {SALSAS_DISPONIBLES.map((salsa) => {
              const sel = salsasElegidas.some(s => s.id === salsa.id);
              const idx = salsasElegidas.findIndex(s => s.id === salsa.id);
              const esGratis = sel && idx < MAX_SALSAS_GRATIS;
              return (
                <button key={salsa.id} onClick={() => setSalsasElegidas(prev => sel ? prev.filter(s => s.id !== salsa.id) : [...prev, salsa])}
                  style={{ padding: 0, borderRadius: 12, border: sel ? '3px solid #CA0B0B' : '1px solid #eee', background: 'none', cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden', position: 'relative', height: 100,
                    boxShadow: sel ? '0 4px 14px rgba(202,11,11,0.3)' : 'none', transition: 'all 0.2s ease' }}>
                  <img src={salsa.img} alt={salsa.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)',
                    padding: '22px 8px 8px', textAlign: 'center',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{salsa.nombre}</div>
                    {!esGratis && sel && <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 1, fontWeight: 700 }}>+${PRECIO_SALSA_EXTRA.toLocaleString('es-CO')}</div>}
                    {esGratis && sel && <div style={{ fontSize: 10, color: '#4ade80', marginTop: 1, fontWeight: 700 }}>Gratis ✓</div>}
                  </div>
                  {sel && <div style={{ position: 'absolute', inset: 0, background: 'rgba(202,11,11,0.15)' }} />}
                  {sel && (
                    <div style={{
                      position: 'absolute', top: 5, right: 5, zIndex: 3,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#CA0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                    }}>
                      <Check size={11} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ padding: '10px 14px', background: salsasElegidas.length >= MAX_SALSAS_GRATIS ? '#fef3c7' : '#f0fdf4', borderRadius: 8, fontSize: 13, textAlign: 'center', border: '1px solid', borderColor: salsasElegidas.length >= MAX_SALSAS_GRATIS ? '#fde68a' : '#bbf7d0' }}>
            {salsasElegidas.length === 0 && `Elige hasta ${MAX_SALSAS_GRATIS} salsas gratis`}
            {salsasElegidas.length > 0 && salsasCobradas === 0 && `${salsasGratis} salsa${salsasGratis > 1 ? 's' : ''} incluida${salsasGratis > 1 ? 's' : ''} ✓`}
            {salsasCobradas > 0 && `${salsasGratis} gratis + ${salsasCobradas} extra = +$${costoSalsas.toLocaleString('es-CO')}`}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 20px', flexShrink: 0, display: 'flex', gap: 10 }}>
          <button onClick={retroceder} style={{ flex: 0, padding: '12px 18px', borderRadius: 12, border: '2px solid #e5e7eb', background: '#fff', color: '#555', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>← Atrás</button>
          <button onClick={avanzar} style={{ flex: 1, padding: 12, background: '#CA0B0B', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Continuar →</button>
        </div>
      </>
    );
  };

  return (
    <div className="modal-overlay modal-producto-overlay" onClick={cerrar}>
      <div className="modal-producto-inner" onClick={(e) => e.stopPropagation()}>
        {pasoActual === 'bowl'       && renderBowl()}
        {pasoActual === 'chocolate'  && renderChocolate()}
        {pasoActual === 'salsas'     && renderSalsas()}
        {pasoActual === 'toppings'   && renderToppings()}
        {pasoActual === 'adiciones'  && renderAdiciones()}
      </div>
    </div>
  );
}

/* ─── Modal login requerido ─── */
function ModalLoginRequerido({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-login-req">
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <h3 className="modal-login-titulo">Inicia sesión para continuar</h3>
        <p className="modal-login-desc">Necesitas una cuenta para agregar productos al carrito.</p>
        <div className="modal-login-botones">
          <button className="btn-login-req-sec" onClick={onClose}>Cancelar</button>
          <a href="/login" className="btn-login-req-pri">Iniciar sesión</a>
        </div>
        <p className="modal-login-registro">
          ¿No tienes cuenta? <a href="/registro" className="modal-login-link">Regístrate</a>
        </p>
      </div>
    </div>
  );
}

const redondearPuntos = (puntos) => Math.floor(puntos / 8) * 8;

/* ─── Carrito flotante ─── */
function CarritoBottom({ carrito, subtotal, totalItems, onCambiarCantidad, onQuitar, onIrCheckout, abierto }) {
  const [expandido,         setExpandido]         = useState(false);
  const [puntosDisponibles, setPuntosDisponibles] = useState({ puntos: 0, saldo_pesos: 0 });
  const [puntosAUsar,       setPuntosAUsar]       = useState(0);
  const [usarPuntos,        setUsarPuntos]        = useState(false);
  const { usuario } = useAuth();

  useEffect(() => {
    if (!usuario || !['cliente','domiciliario','admin'].includes(usuario.rol)) return;
    api.getMisPuntos().then(setPuntosDisponibles).catch(() => {});
  }, [usuario]);

  useEffect(() => {
    if (carrito.length === 0) { setUsarPuntos(false); setPuntosAUsar(0); }
  }, [carrito]);

  const subtotalProductos = carrito.reduce((s, i) => s + Number(i.subtotal || 0), 0);
  const maxPuntosUsables  = redondearPuntos(Math.min(puntosDisponibles.puntos, Math.floor(subtotalProductos / 12.5)));
  const descuentoPuntos   = usarPuntos ? puntosAUsar * 12.5 : 0;
  const totalConDescuento = Math.max(0, subtotalProductos - descuentoPuntos);

  if (carrito.length === 0) {
    return (
      <div className="carrito-bottom carrito-bottom--vacio">
        <div className="carrito-vacio-msg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span>Tu carrito está vacío — agrega productos para comenzar</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {expandido && <div className="carrito-backdrop" onClick={() => setExpandido(false)} />}
      <div className={`carrito-bottom ${expandido ? 'carrito-bottom--expandido' : ''}`}>
        <div className={`carrito-panel ${expandido ? 'carrito-panel--visible' : ''}`}>
          <div className="carrito-drag-handle" onClick={() => setExpandido(false)}>
            <div className="carrito-drag-pill" />
          </div>
          <div className="carrito-layout">
            <div className="carrito-col-items">
              <h3 className="carrito-col-titulo">Tu pedido</h3>
              <div className="carrito-items-lista">
                {carrito.map((item) => (
                  <div key={item.lineaId} className="carrito-item">
                    <div className="carrito-item-thumb" style={{ overflow: 'hidden', borderRadius: 8, flexShrink: 0 }}>
                      {item.img
                        ? <img src={imgCl(item.img, 104, 104)} alt={item.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <div style={{ width: '100%', height: '100%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#bbb' }}>{item.nombre.charAt(0)}</div>
                      }
                    </div>
                    <div className="carrito-item-info">
                      <span className="carrito-item-nombre" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                        {item.nombre}
                        {item.chocolate && (
                          <span style={{
                            fontSize: 10, background: item.chocolate === 'Negro' ? '#1e3a5f' : '#f0f0f0',
                            color: item.chocolate === 'Negro' ? '#fff' : '#555',
                            padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                            whiteSpace: 'nowrap', flexShrink: 0,
                          }}>
                            Chocolate {item.chocolate}
                          </span>
                        )}
                      </span>
                      {item.es_bowl && item.salsas?.length > 0 && (
                        <div style={{ marginTop: 3 }}>
                          <span style={{ fontSize: 10, color: '#92400e', border: '1px solid #d97706', background: '#fffbeb', padding: '1px 7px', borderRadius: 20, fontWeight: 700 }}>
                            Cobertura: {nombreSalsa(parsearSalsas(item.salsas)[0])}
                          </span>
                        </div>
                      )}
                      {!item.es_bowl && item.salsas?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                          {parsearSalsas(item.salsas).map((s, i) => (
                            <span key={i} style={{ fontSize: 10, color: COLOR_SALSAS, border: `1px solid ${COLOR_SALSAS}`, background: '#fff7ed', padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>
                              {nombreSalsa(s)}{i >= MAX_SALSAS_GRATIS ? <span style={{ marginLeft: 2, opacity: 0.8 }}>+$5k</span> : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {(item.toppings?.length > 0 || item.adiciones?.length > 0) && (
                        <div className="carrito-item-extras">
                          {item.toppings?.map((t) => (
                            <span key={t.id_topping} style={{ background: '#1a1a1a', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                              {t.nombre}{t.cantidad > 1 ? ` ×${t.cantidad}` : ''}
                            </span>
                          ))}
                          {item.adiciones?.map((a) => (
                            <span key={a.id_adicion} style={{ background: '#d97706', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                              +{a.nombre}{a.cantidad > 1 ? ` ×${a.cantidad}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="carrito-item-precio-unit">
                        ${(item.subtotal / item.cantidad).toLocaleString('es-CO')} c/u
                      </span>
                    </div>
                    <div className="carrito-controles">
                      <button className="carrito-ctrl-btn" onClick={() => onCambiarCantidad(item.lineaId, item.cantidad - 1)}>−</button>
                      <span className="carrito-ctrl-num">{item.cantidad}</span>
                      <button className="carrito-ctrl-btn" onClick={() => onCambiarCantidad(item.lineaId, item.cantidad + 1)}>+</button>
                    </div>
                    <span className="carrito-item-precio-total">${item.subtotal.toLocaleString('es-CO')}</span>
                    <button className="carrito-item-quitar" onClick={() => onQuitar(item.lineaId)} title="Quitar">×</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="carrito-col-resumen">
              <h3 className="carrito-resumen-titulo">Resumen</h3>

              {/* Sección puntos */}
              {puntosDisponibles.puntos > 0 && carrito.length > 0 && (
                <div style={{ background:'#fff5f5', border:'1px solid #fecaca', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: usarPuntos ? 8 : 0 }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#1a1a1a' }}>🎯 {puntosDisponibles.puntos} puntos</div>
                      <div style={{ fontSize:11, color:'#888' }}>= ${(puntosDisponibles.saldo_pesos||0).toLocaleString('es-CO')} disponibles</div>
                    </div>
                    <button onClick={() => { const n=!usarPuntos; setUsarPuntos(n); setPuntosAUsar(n?maxPuntosUsables:0); }}
                      style={{ padding:'4px 10px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, background:usarPuntos?'#CA0B0B':'#e5e7eb', color:usarPuntos?'white':'#555', transition:'all 0.15s', flexShrink:0 }}>
                      {usarPuntos ? '✓ Activo' : 'Usar puntos'}
                    </button>
                  </div>
                  {usarPuntos && (
                    <div>
                      <input type="range" min={0} max={maxPuntosUsables} step={8} value={puntosAUsar}
                        onChange={e => setPuntosAUsar(Number(e.target.value))}
                        style={{ width:'100%', accentColor:'#CA0B0B', marginBottom:6 }} />
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#166534', fontWeight:700, background:'#f0fdf4', padding:'6px 8px', borderRadius:6 }}>
                        <span>Descuento ({puntosAUsar} pts)</span>
                        <span>-${descuentoPuntos.toLocaleString('es-CO')}</span>
                      </div>
                      {puntosAUsar > 0 && (
                        <div style={{ fontSize:10, color:'#CA0B0B', marginTop:4, fontWeight:600 }}>* Esta compra no acumulará puntos nuevos</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Resumen de precios */}
              <div className="carrito-resumen-fila">
                <span>Subtotal productos</span>
                <span>${subtotalProductos.toLocaleString('es-CO')}</span>
              </div>
              {descuentoPuntos > 0 && (
                <div className="carrito-resumen-fila" style={{ color:'#16a34a', fontWeight:700 }}>
                  <span>Descuento puntos</span><span>-${descuentoPuntos.toLocaleString('es-CO')}</span>
                </div>
              )}
              <div className="carrito-resumen-fila">
                <span>Domicilio</span>
                <span className="carrito-domicilio-badge">Por confirmar</span>
              </div>
              <div className="carrito-resumen-divisor" />
              <div className="carrito-resumen-fila carrito-resumen-fila--total">
                <span>Total</span>
                <strong>${totalConDescuento.toLocaleString('es-CO')}</strong>
              </div>

              <button className="carrito-btn-checkout" onClick={() => onIrCheckout(puntosAUsar, descuentoPuntos)}>
                Hacer pedido
              </button>
              <p className="carrito-resumen-items-count">{totalItems} {totalItems === 1 ? 'ítem' : 'ítems'} en el carrito</p>
            </div>
          </div>
        </div>
        <div className="carrito-barra">
          <div className="carrito-barra-izq" onClick={() => setExpandido((v) => !v)}>
            <div className="carrito-barra-badge">{totalItems}</div>
            <div className="carrito-barra-sep" />
            <span className="carrito-barra-label">Ver pedido</span>
            {!expandido && (
              <div className="carrito-barra-resumen">
                {carrito.slice(0, 2).map((item) => (
                  <span key={item.lineaId} className="carrito-barra-chip">{item.cantidad}× {item.nombre}</span>
                ))}
                {carrito.length > 2 && <span className="carrito-barra-chip carrito-barra-chip--mas">+{carrito.length - 2} más</span>}
              </div>
            )}
            <svg className={`carrito-barra-chevron ${expandido ? 'carrito-barra-chevron--arriba' : ''}`}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </div>
          <div className="carrito-barra-der">
            <span className="carrito-barra-subtotal">${subtotal.toLocaleString('es-CO')}</span>
            <button className="carrito-barra-btn-checkout" onClick={(e) => { e.stopPropagation(); onIrCheckout(); }}>
              Hacer pedido
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Badge dinámico de beneficios ─── */
function BadgeProducto({ p }) {
  // es_bowl → paso "cobertura" (negro/blanco/arequipe); permite_chocolate → paso "chocolate" (negro/blanco)
  const tieneCobertura = p.es_bowl === true;
  const tieneChocolate = p.permite_chocolate === true;
  const tieneToppings  = p.permite_toppings === 1 && (p.max_toppings || 0) > 0;
  const tieneSalsas    = p.permite_salsas === true;
  const maxTop         = p.max_toppings || 0;

  if (!tieneCobertura && !tieneChocolate && !tieneToppings && !tieneSalsas) return null;

  const labelTop = maxTop === 1 ? '1 topping gratis' : `${maxTop} toppings gratis`;

  const style = {
    position: 'absolute', top: 8, right: 8, zIndex: 2,
    background: 'rgba(60,5,5,0.80)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    color: '#fff', borderRadius: 8, padding: '6px 10px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.45)',
    border: '1px solid rgba(202,11,11,0.65)',
    fontFamily: 'Nunito, sans-serif', fontWeight: 800,
    fontSize: 10.5, lineHeight: 1.4, textAlign: 'center',
    letterSpacing: '0.3px',
    pointerEvents: 'none', whiteSpace: 'nowrap',
  };

  const dividerStyle = { borderTop: '1px solid rgba(202,11,11,0.35)', margin: '3px 0' };

  const lineas = [
    tieneCobertura && 'Elige cobertura',
    tieneChocolate && 'Elige chocolate',
    tieneToppings  && labelTop,
    tieneSalsas    && `${MAX_SALSAS_GRATIS} salsas gratis`,
  ].filter(Boolean);

  return (
    <div style={style}>
      {lineas.map((txt, i) => (
        <div key={txt}>
          {i > 0 && <div style={dividerStyle} />}
          {txt}
        </div>
      ))}
    </div>
  );
}

/* ─── Card de producto ─── */
function CardProducto({ p, onAgregar }) {
  return (
    <div className="producto-card">
      <div style={{ position: 'relative' }}>
        <div style={{ width:'100%', height:200, borderRadius:'12px 12px 0 0', overflow:'hidden', background:'#f5f5f5' }}>
          {p.img ? (
            <img src={imgCl(p.img, 400, 400)} alt={p.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          ) : (
            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 48 }}>🍫</div>
          )}
        </div>
        <BadgeProducto p={p} />
      </div>
      <div className="producto-card-body">
        <h3 className="producto-card-nombre">{p.nombre}</h3>
        {p.descripcion && (
          <p
            className="producto-card-desc"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {p.descripcion}
          </p>
        )}
        <div className="producto-card-footer">
          <span className="producto-card-precio">${Number(p.precio).toLocaleString('es-CO')}</span>
          <button className="producto-card-btn" onClick={() => onAgregar(p)}>+ Agregar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Página principal Catálogo ─── */
export default function Catalogo() {
  const { carrito, agregarItem, quitarItem, cambiarCantidad, subtotal, totalItems } = useCart();
  const { usuario } = useAuth();
  const navigate      = useNavigate();
  const tiempoEspera  = useTiempoEspera();
  const estadoTienda  = useEstadoTienda();

  // Única fuente de verdad: estadoTienda.abierto (calculado por el backend en
  // /api/configuracion/estado-tienda). No se recalcula hora/día acá para evitar
  // que el frontend quede desincronizado del backend (ej: la exclusión de lunes
  // que ya se corrigió del lado del servidor no debe reaparecer aquí).
  const mensajeTienda = estadoTienda.abierto
    ? 'abierto'
    : (estadoTienda.estado === 'closed' ? 'cerrado_temporal' : 'cerrado_horario');

  useEffect(() => {
    document.title = 'Catálogo | ChocoFreseo - Postres y Chocolates Medellín';
  }, []);

  const [productos,       setProductos]       = useState([]);
  const [categorias,      setCategorias]      = useState([{ id_categoria: 0, nombre: 'Todos' }]);
  const [toppings,        setToppings]        = useState([]);
  const [adiciones,       setAdiciones]       = useState([]);
  const [cargando,        setCargando]        = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState(0);
  const [busqueda,        setBusqueda]        = useState('');
  const [productoActual,        setProductoActual]        = useState(null);
  const [modalProducto,         setModalProducto]         = useState(false);
  const [modalLogin,            setModalLogin]            = useState(false);
  const [mostrarAlertaCerrado,  setMostrarAlertaCerrado]  = useState(false);

  useEffect(() => {
    Promise.all([
      api.catalogoProductos(),
      api.catalogoCategorias(),
      api.catalogoToppings(),
      api.catalogoAdiciones(),
    ]).then(([prods, cats, tops, adics]) => {
      setProductos(prods || []);
      setCategorias([{ id_categoria: 0, nombre: 'Todos' }, ...(cats || [])]);
      setToppings(tops || []);
      setAdiciones(adics || []);
    }).catch(console.error).finally(() => setCargando(false));
  }, []);

  const filtrados = useMemo(() => {
    let lista = productos.filter(p => p.estado !== 0);
    if (busqueda.trim()) {
      lista = lista.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    }
    if (categoriaActiva && categoriaActiva !== 0) {
      lista = lista.filter(p => p.id_categoria === categoriaActiva);
    } else {
      lista = [...lista].sort((a, b) => a.id_categoria - b.id_categoria);
    }
    return lista;
  }, [productos, busqueda, categoriaActiva]);

  const handleAgregar = (producto) => {
    if (!estadoTienda.abierto) { setMostrarAlertaCerrado(true); return; }
    if (!usuario) { setModalLogin(true); return; }
    setProductoActual(producto);
    setModalProducto(true);
  };

  const handleConfirmarProducto = (item) => {
    agregarItem(item);
    setModalProducto(false);
    setProductoActual(null);
  };

  return (
    <div className="catalogo-wrapper">
      <Navbar />
      <div className="catalogo-page">
        {mensajeTienda !== 'abierto' && !estadoTienda.cargando && (
          <div style={{ background: mensajeTienda === 'cerrado_temporal' ? '#fff5f5' : '#fef3c7', border: `1px solid ${mensajeTienda === 'cerrado_temporal' ? '#fecaca' : '#fde68a'}`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <div>
              <div style={{ fontWeight: 700, color: mensajeTienda === 'cerrado_temporal' ? '#CA0B0B' : '#92400e', fontSize: 14 }}>
                {mensajeTienda === 'cerrado_temporal' ? 'Cerrado temporalmente' : 'Estamos cerrados por el momento'}
              </div>
              <div style={{ color: mensajeTienda === 'cerrado_temporal' ? '#CA0B0B' : '#b45309', fontSize: 12 }}>
                {mensajeTienda === 'cerrado_temporal'
                  ? 'Volveremos pronto'
                  : `Todos los días · ${formatHora12(estadoTienda.hora_apertura)} - ${formatHora12(estadoTienda.hora_cierre)}`}
              </div>
            </div>
          </div>
        )}
        {estadoTienda.abierto && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#166534' }}>
            <span style={{ fontSize: 16 }}>⏱️</span>
            <span><strong>Tiempo estimado de entrega:</strong> {tiempoEspera}–{tiempoEspera + 20} min</span>
          </div>
        )}
        <div className="catalogo-top">
          <div className="catalogo-categorias">
            {categorias.map((cat) => (
              <button
                key={cat.id_categoria ?? cat.id}
                className={`cat-pill ${categoriaActiva === (cat.id_categoria ?? cat.id) ? 'activo' : ''}`}
                onClick={() => setCategoriaActiva(cat.id_categoria ?? cat.id)}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
          <div className="catalogo-buscador">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </div>

        {cargando ? (
          <div className="catalogo-vacio"><p>Cargando productos...</p></div>
        ) : filtrados.length === 0 ? (
          <div className="catalogo-vacio">
            <span style={{ fontSize: 40 }}>🔍</span>
            <p>No se encontraron productos</p>
          </div>
        ) : (
          <div className="productos-grid">
            {filtrados.map((p) => <CardProducto key={p.id_producto} p={p} onAgregar={handleAgregar} />)}
          </div>
        )}
      </div>

      <CarritoBottom
        carrito={carrito}
        subtotal={subtotal}
        totalItems={totalItems}
        onCambiarCantidad={cambiarCantidad}
        onQuitar={quitarItem}
        onIrCheckout={(pts, desc) => {
          if (!estadoTienda.abierto) { setMostrarAlertaCerrado(true); return; }
          navigate('/checkout', { state: { puntosAUsar: pts || 0, descuentoPuntos: desc || 0 } });
        }}
        abierto={estadoTienda.abierto}
      />

      <ModalProducto
        open={modalProducto}
        onClose={() => { setModalProducto(false); setProductoActual(null); }}
        onConfirmar={handleConfirmarProducto}
        producto={productoActual}
        toppingsDisponibles={toppings}
        adicionesDisponibles={adiciones}
      />
      <ModalLoginRequerido open={modalLogin} onClose={() => setModalLogin(false)} />

      {mostrarAlertaCerrado && (
        <div onClick={() => setMostrarAlertaCerrado(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'white', borderRadius:20, padding:'36px 32px', maxWidth:380, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'#fff5f5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CA0B0B" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 style={{ fontSize:20, fontWeight:900, color:'#1a1a1a', margin:'0 0 8px' }}>
              {mensajeTienda === 'cerrado_temporal' ? 'Cerrado temporalmente' : 'Estamos cerrados'}
            </h3>
            <p style={{ fontSize:14, color:'#888', margin:'0 0 20px', lineHeight:1.6 }}>
              En este momento no estamos recibiendo pedidos. ¡Pero vuelve pronto, te esperamos!
            </p>
            {mensajeTienda === 'cerrado_horario' && (
              <div style={{ background:'#f7f8fd', borderRadius:12, padding:'14px 20px', marginBottom:24 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Nuestro horario</div>
                <div style={{ fontSize:16, fontWeight:800, color:'#1a1a1a' }}>Todos los días</div>
                <div style={{ fontSize:20, fontWeight:900, color:'#CA0B0B', marginTop:2 }}>{formatHora12(estadoTienda.hora_apertura)} — {formatHora12(estadoTienda.hora_cierre)}</div>
              </div>
            )}
            <button onClick={() => setMostrarAlertaCerrado(false)}
              style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:'#CA0B0B', color:'white', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
