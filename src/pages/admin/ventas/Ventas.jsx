import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Eye, Edit, Check, X, FileText, RotateCcw, AlertTriangle, Search } from 'lucide-react';
import { LogoBancolombia, LogoNequi, LogoEfectivo } from '../../../components/common/LogosApps';
import { toast } from '../../../utils/toast';
import { imgCl } from '../../../utils/cloudinary';
import AdminLayout from '../../../components/layout/AdminLayout';
import * as api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import FormDireccion from '../../../components/common/FormDireccion';
import './Ventas.css';

const POR_PAGINA = 5;

const ESTADO_LABELS = {
  pendiente:  'Pendiente',
  en_proceso: 'Confirmado',
  listo:      'Listo para despachar',
  despachado: 'Despachado',
  entregado:  'Entregado',
  anulado:    'Anulado',
};
const ESTADOS = Object.keys(ESTADO_LABELS);

const getMetodoPago = (v) => {
  const detalles = v.pagos?.[0]?.detallePagos || [];
  if (detalles.length > 1) return 'mixto';
  return detalles[0]?.metodoPago?.nombre || v.metodo_pago || null;
};

const getMontoPorMetodo = (v, nombreMetodo) => {
  const detalles = v.pagos?.[0]?.detallePagos || [];
  const found = detalles.find((d) => d.metodoPago?.nombre === nombreMetodo);
  if (found) return Number(found.monto || 0);
  if (nombreMetodo === 'efectivo') return Number(v.monto_efectivo || 0);
  if (nombreMetodo === 'transferencia') return Number(v.monto_transferencia || 0);
  return 0;
};

const mapVenta = (v) => ({
  ...v,
  cliente:          v.nombre_cliente    || v.cliente?.usuario?.nombre || v.cliente?.nombre || '—',
  telefono_cliente: v.telefono_cliente  || v.cliente?.telefono || '—',
  estado:           v.estado?.nombre_estado    || v.estado          || 'pendiente',
  direccion:        v.direccion?.direccion_linea || v.direccion     || '—',
  barrio:           v.direccion?.barrio  || '',
  ciudad:           v.direccion?.ciudad  || '',
  fecha:            v.fecha ? new Date(v.fecha).toLocaleString('es-CO') : '—',
  metodo_pago:      getMetodoPago(v),
  monto_efectivo:   getMontoPorMetodo(v, 'efectivo'),
  monto_transferencia: getMontoPorMetodo(v, 'transferencia'),
  comprobante_url:  v.comprobante_url || v.pagos?.[0]?.comprobante_url || null,
});

const colorEstado = (e) => ({
  pendiente:  { bg: '#fff5f5', color: '#CA0B0B' },
  en_proceso: { bg: '#eff6ff', color: '#3b82f6' },
  listo:      { bg: '#fefce8', color: '#ca8a04' },
  despachado: { bg: '#f5f3ff', color: '#7c3aed' },
  entregado:  { bg: '#f0fdf4', color: '#16a34a' },
  anulado:    { bg: '#f5f5f5', color: '#888'    },
}[e] || { bg: '#fff5f5', color: '#CA0B0B' });

const METODO_BADGE = {
  efectivo:      { bg: '#f0fdf4', color: '#16a34a', label: 'Efectivo',      Icon: ({size}) => <LogoEfectivo size={size}/>                                },
  transferencia: { bg: '#eff6ff', color: '#3b82f6', label: 'Transferencia', Icon: ({size}) => <><LogoBancolombia size={size}/><LogoNequi size={size}/></> },
  mixto:         { bg: '#f5f3ff', color: '#7c3aed', label: 'Mixto',         Icon: ({size}) => <><LogoEfectivo size={size}/><LogoBancolombia size={size}/></> },
};

// Helper para calcular y desglosar el subtotal de un detalleVenta (ver detalle)
const calcularDesglose = (d) => {
  const precioBase      = Number(d.producto?.precio || 0);
  const precioUnitBD    = Number(d.precio_unitario || 0);
  const cantidad        = d.cantidad || 1;
  // CRÍTICO: si permite_toppings=0, ninguno gratis aunque max_toppings>0
  const permToppings    = d.producto?.permite_toppings;
  const maxInc          = permToppings ? (d.producto?.max_toppings || 0) : 0;
  const totalTop        = (d.detalleToppings || []).reduce((s,t) => s+(t.cantidad||1), 0);
  const toppingsCob     = Math.max(0, totalTop - maxInc);
  const toppingExtra    = toppingsCob * 2000;
  const salsas          = parsearSalsas(d.salsas);
  const salsasCob       = Math.max(0, salsas.length - 2);
  const salsaExtra      = salsasCob * 5000;
  const adicsTotal      = (d.detalleAdiciones || []).reduce((s, a) => s + Number(a.subtotal || 0), 0);
  const precioUnitCalc  = precioBase + toppingExtra + salsaExtra;
  const precioUnitFinal = Math.max(precioUnitBD, precioUnitCalc);
  const totalItem       = precioUnitFinal * cantidad + adicsTotal;
  return { precioBase, toppingExtra, salsaExtra, salsasCob, toppingsCob, adicsTotal, totalItem, precioUnit: precioUnitFinal, cantidad, salsas };
};

const MAX_SALSAS_GRATIS  = 2;
const PRECIO_SALSA_EXTRA = 5000;
const COLOR_SALSAS       = '#ea580c';
const redondearPuntos = (puntos) => Math.floor(puntos / 8) * 8;
const SALSAS_DISPONIBLES = [
  { id: 'arequipe',         nombre: 'Arequipe',          img: 'https://res.cloudinary.com/diqeuyoqo/image/upload/v1779742573/patatas_arequipe_vhgewf.png' },
  { id: 'chocolate_negro',  nombre: 'Chocolate Negro',   img: 'https://res.cloudinary.com/diqeuyoqo/image/upload/v1779742679/patatas_chocolate_negro_oluxzf.png' },
  { id: 'chocolate_blanco', nombre: 'Chocolate Blanco',  img: 'https://res.cloudinary.com/diqeuyoqo/image/upload/v1779742648/patatas_chocolate_blanco_t6dwl5.png' },
  { id: 'mermelada_mora',   nombre: 'Mermelada de Mora', img: 'https://res.cloudinary.com/diqeuyoqo/image/upload/v1779742724/patatas_mermelada_jlcyrs.png' },
];
const parsearSalsas = (raw) => { if (!raw) return []; try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(p) ? p : []; } catch { return []; } };
const nombreSalsa   = (s) => { const n = typeof s === 'object' ? s.nombre : s; if (!n) return ''; return n.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); };

const calcularPrecioItem = (item) => {
  const base = Number(item.precio || 0);
  const maxTop = item.max_toppings || 0;
  const totalTop = (item.toppings || []).reduce((s, t) => s + (t.cantidad || 1), 0);
  const toppingExtra = Math.max(0, totalTop - maxTop) * 2000;
  const totalSalsas = (item.salsas || []).length;
  const salsasExtra = Math.max(0, totalSalsas - MAX_SALSAS_GRATIS) * PRECIO_SALSA_EXTRA;
  const adicionesTotal = (item.adiciones || []).reduce((s, a) => s + Number(a.precio || 0) * (a.cantidad || 1), 0);
  return base + toppingExtra + salsasExtra + adicionesTotal;
};

const calcularPasosConfig = (prod) => {
  if (!prod) return [];
  const pasos = [];
  if (prod.es_bowl           === true) pasos.push('bowl');
  if (prod.permite_chocolate === true) pasos.push('chocolate');
  if (prod.permite_salsas    === true) pasos.push('salsas');
  if (prod.permite_toppings  === 1)   pasos.push('toppings');
  pasos.push('adiciones');
  return pasos;
};

function ConfiguradorProducto({ producto, toppingsActivos, adicionesActivas, onAgregar, onCancelar }) {
  const [pasoIdx,       setPasoIdx]       = useState(0);
  const [coberturaTemp, setCoberturaTemp] = useState('');
  const [salsasTemp,    setSalsasTemp]    = useState([]);
  const [toppingsTemp,  setToppingsTemp]  = useState([]);
  const [adicionesTemp, setAdicionesTemp] = useState([]);
  const [chocolateTemp, setChocolateTemp] = useState('');

  if (!producto) return null;

  const prod       = producto;
  const pasos      = calcularPasosConfig(prod);
  const pasoActual = pasos[pasoIdx] || 'adiciones';
  const esPrimero  = pasoIdx === 0;
  const esUltimo   = pasoIdx === pasos.length - 1;

  const tieneToppings = prod.permite_toppings === 1;
  const sinToppings   = !tieneToppings;

  const agregarToppingTemp = (t) => setToppingsTemp((p) => [...p, { ...t, cantidad: 1 }]);
  const ajustarToppingTemp = (id, delta) => setToppingsTemp((p) =>
    p.map((t) => t.id_topping === id ? { ...t, cantidad: t.cantidad + delta } : t).filter((t) => t.cantidad > 0)
  );
  const agregarAdicionTemp = (a) => setAdicionesTemp((p) => [...p, { ...a, precio: Number(a.precio), cantidad: 1 }]);
  const ajustarAdicionTemp = (id, delta) => setAdicionesTemp((p) =>
    p.map((a) => a.id_adicion === id ? { ...a, cantidad: a.cantidad + delta } : a).filter((a) => a.cantidad > 0)
  );

  const irSiguiente = () => {
    if (pasoActual === 'bowl' && !coberturaTemp) return;
    if (!esUltimo) setPasoIdx(p => p + 1);
    else onAgregar(toppingsTemp, adicionesTemp, chocolateTemp, prod.es_bowl ? (coberturaTemp ? [{ nombre: coberturaTemp }] : []) : salsasTemp);
  };
  const irAnterior = () => {
    if (!esPrimero) setPasoIdx(p => p - 1);
    else onCancelar();
  };

  const totalTop   = toppingsTemp.reduce((s, t) => s + t.cantidad, 0);
  const maxTop     = prod.max_toppings || 0;
  const precioBase = Number(prod.precio || 0);
  const topExtra   = Math.max(0, totalTop - (tieneToppings ? maxTop : 0)) * 2000;
  const salsaExtra = Math.max(0, salsasTemp.length - MAX_SALSAS_GRATIS) * PRECIO_SALSA_EXTRA;
  const adicsTotal = adicionesTemp.reduce((s, a) => s + Number(a.precio || 0) * (a.cantidad || 1), 0);
  const precioTotal = precioBase + topExtra + salsaExtra + adicsTotal;

  const cbBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', fontSize: 15, fontWeight: 800, color: '#fff' };

  const toppingsGrid = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
      {toppingsActivos.map((t) => {
        const en = toppingsTemp.find((x) => x.id_topping === t.id_topping);
        return (
          <div key={t.id_topping}
            onClick={() => !en && agregarToppingTemp(t)}
            style={{
              borderRadius: 12, cursor: en ? 'default' : 'pointer',
              position: 'relative', overflow: 'hidden', height: 90,
              border: `2px solid ${en ? '#1a1a1a' : 'transparent'}`,
              boxShadow: en ? '0 4px 14px rgba(0,0,0,0.22)' : '0 2px 6px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease',
            }}>
            {t.img
              ? <img src={imgCl(t.img, 200, 200)} alt={t.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', height: '100%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: '#aaa' }}>{t.nombre.charAt(0).toUpperCase()}</div>
            }
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)', padding: '20px 6px 6px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#fff' }}>{t.nombre}</div>
            </div>
            {en && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1a1a1a', borderRadius: 20, padding: '4px 10px' }}>
                  <button style={cbBtn} onClick={(e) => { e.stopPropagation(); ajustarToppingTemp(t.id_topping, -1); }}>−</button>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#fff', minWidth: 16, textAlign: 'center' }}>{en.cantidad}</span>
                  <button style={cbBtn} onClick={(e) => { e.stopPropagation(); ajustarToppingTemp(t.id_topping, 1); }}>+</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {toppingsActivos.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#bbb', fontSize: 13, padding: '16px 0' }}>Sin toppings disponibles</div>}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 'min(460px, calc(100vw - 32px))', maxHeight: '90%', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{prod.nombre}</div>
            <button onClick={onCancelar} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888', lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {pasos.map((p, i) => (
              <div key={p} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= pasoIdx ? '#CA0B0B' : '#e5e7eb', transition: 'background 0.2s' }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 6, fontWeight: 600 }}>
            Paso {pasoIdx + 1} de {pasos.length} · {pasoActual === 'bowl' ? 'Cobertura' : pasoActual === 'chocolate' ? 'Tipo de chocolate' : pasoActual === 'salsas' ? 'Salsas' : pasoActual === 'toppings' ? 'Toppings' : 'Adiciones'}
          </div>
        </div>
        <div style={{ padding: '16px 18px', flex: 1, overflowY: 'auto' }}>
          {pasoActual === 'bowl' && (
            <div>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Elige la cobertura — obligatorio</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { nombre: 'Chocolate Negro',  img: 'https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778815863/chocolate_negro_ancho_kzqpjd.png',  color: '#1a1a1a' },
                  { nombre: 'Chocolate Blanco', img: 'https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778815900/chocolate_blanco_ancho_rw2b5l.png', color: '#F5E6D0' },
                  { nombre: 'Arequipe',         img: 'https://res.cloudinary.com/diqeuyoqo/image/upload/v1779742573/patatas_arequipe_vhgewf.png',         color: '#C8860A' },
                ].map((op) => {
                  const sel = coberturaTemp === op.nombre;
                  return (
                    <button key={op.nombre} type="button" onClick={() => setCoberturaTemp(op.nombre)}
                      style={{ padding: 0, borderRadius: 12, border: sel ? '2.5px solid #CA0B0B' : '2px solid transparent', background: op.color, cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden', position: 'relative', height: 110,
                        boxShadow: sel ? '0 4px 16px rgba(202,11,11,0.3)' : '0 2px 8px rgba(0,0,0,0.12)', transition: 'all 0.2s ease' }}>
                      <img src={op.img} alt={op.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)', padding: '22px 8px 8px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: 10, color: '#fff' }}>{op.nombre}</div>
                        {sel && <div style={{ fontSize: 9, color: '#fca5a5', marginTop: 1, fontWeight: 600 }}>✓</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {pasoActual === 'chocolate' && (
            <div style={{ display: 'flex', gap: 12 }}>
              {['Negro', 'Blanco'].map((tipo) => {
                const sel = chocolateTemp === tipo;
                const img = tipo === 'Negro'
                  ? 'https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778815863/chocolate_negro_ancho_kzqpjd.png'
                  : 'https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778815900/chocolate_blanco_ancho_rw2b5l.png';
                return (
                  <button key={tipo} onClick={() => setChocolateTemp(tipo)} style={{
                    flex: 1, height: 140, borderRadius: 14, cursor: 'pointer', padding: 0,
                    border: sel ? '2px solid #CA0B0B' : '2px solid transparent',
                    position: 'relative', overflow: 'hidden', fontFamily: 'inherit',
                    boxShadow: sel ? '0 6px 20px rgba(202,11,11,0.35)' : '0 2px 8px rgba(0,0,0,0.12)',
                    transition: 'all 0.2s ease',
                  }}>
                    <img src={img} alt={`Chocolate ${tipo}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)', padding: '28px 12px 10px', color: '#fff', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
                      {tipo}
                      {sel && <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#fca5a5', marginTop: 2 }}>Seleccionado ✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {pasoActual === 'salsas' && (
            <div>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                Primeras 2 gratis · <span style={{ color: COLOR_SALSAS, fontWeight: 700 }}>extras +${PRECIO_SALSA_EXTRA.toLocaleString('es-CO')} c/u</span>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {SALSAS_DISPONIBLES.map((salsa) => {
                  const sel     = salsasTemp.some(s => s.id === salsa.id);
                  const posIdx  = salsasTemp.findIndex(s => s.id === salsa.id);
                  const esExtra = sel && posIdx >= MAX_SALSAS_GRATIS;
                  return (
                    <button key={salsa.id} type="button"
                      onClick={() => setSalsasTemp(p => sel ? p.filter(s => s.id !== salsa.id) : [...p, salsa])}
                      style={{ padding: 0, borderRadius: 10, border: sel ? `2.5px solid ${COLOR_SALSAS}` : '2px solid transparent', background: 'none', cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden', position: 'relative', height: 90,
                        boxShadow: sel ? '0 4px 14px rgba(234,88,12,0.3)' : '0 2px 6px rgba(0,0,0,0.1)', transition: 'all 0.2s ease' }}>
                      <img src={salsa.img} alt={salsa.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)', padding: '20px 6px 6px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#fff' }}>{salsa.nombre}</div>
                        {sel && <div style={{ fontSize: 10, color: esExtra ? '#fbbf24' : '#4ade80', marginTop: 1, fontWeight: 700 }}>{esExtra ? `+$${PRECIO_SALSA_EXTRA.toLocaleString('es-CO')}` : 'Gratis ✓'}</div>}
                      </div>
                      {sel && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(234,88,12,0.15)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {pasoActual === 'toppings' && (
            <div>
              <p style={{ fontSize: 12, color: totalTop > maxTop ? '#CA0B0B' : '#888', fontWeight: 600, marginBottom: 12 }}>
                {totalTop === 0 ? `Hasta ${maxTop} incluidos gratis · extra +$2.000 c/u`
                  : totalTop <= maxTop ? `${totalTop} / ${maxTop} incluidos gratis`
                  : `${maxTop} gratis + ${totalTop - maxTop} extra (+$${((totalTop - maxTop) * 2000).toLocaleString('es-CO')})`}
              </p>
              {toppingsGrid()}
            </div>
          )}
          {pasoActual === 'adiciones' && (
            <div>
              {sinToppings && toppingsActivos.length > 0 && (
                <>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 }}>Toppings extras — $2.000 c/u</p>
                  <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Opcionales, cada uno se cobra por separado</p>
                  {toppingsGrid()}
                  {totalTop > 0 && (
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#CA0B0B', marginTop: 8, marginBottom: 4 }}>
                      {totalTop} topping{totalTop > 1 ? 's' : ''} extra = +${(totalTop * 2000).toLocaleString('es-CO')}
                    </p>
                  )}
                  <hr style={{ border: 'none', borderTop: '1px dashed #e5e7eb', margin: '12px 0' }} />
                </>
              )}
              <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Adiciones <span style={{ color: '#bbb' }}>— Opcional</span></p>
              {adicionesActivas.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {adicionesActivas.map((a) => {
                    const en = adicionesTemp.find((x) => x.id_adicion === a.id_adicion);
                    return (
                      <div key={a.id_adicion}
                        onClick={() => !en && agregarAdicionTemp(a)}
                        style={{
                          borderRadius: 12, cursor: en ? 'default' : 'pointer',
                          position: 'relative', overflow: 'hidden', height: 90,
                          border: `2px solid ${en ? '#d97706' : 'transparent'}`,
                          boxShadow: en ? '0 4px 14px rgba(217,119,6,0.3)' : '0 2px 6px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease',
                        }}>
                        {a.img
                          ? <img src={imgCl(a.img, 200, 200)} alt={a.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: '100%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: '#d97706' }}>{a.nombre.charAt(0).toUpperCase()}</div>
                        }
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)', padding: '20px 6px 6px', textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: 11, color: '#fff' }}>{a.nombre}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', marginTop: 1 }}>+${Number(a.precio).toLocaleString('es-CO')}</div>
                        </div>
                        {en && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#d97706', borderRadius: 20, padding: '4px 10px' }}>
                              <button style={cbBtn} onClick={(e) => { e.stopPropagation(); ajustarAdicionTemp(a.id_adicion, -1); }}>−</button>
                              <span style={{ fontWeight: 800, fontSize: 14, color: '#fff', minWidth: 16, textAlign: 'center' }}>{en.cantidad}</span>
                              <button style={cbBtn} onClick={(e) => { e.stopPropagation(); ajustarAdicionTemp(a.id_adicion, 1); }}>+</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#bbb', fontSize: 13, padding: '20px 0' }}>Sin adiciones disponibles</div>
              )}
            </div>
          )}
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
              <span>Base</span><span>${precioBase.toLocaleString('es-CO')}</span>
            </div>
            {topExtra > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#CA0B0B' }}><span>Toppings extra</span><span>+${topExtra.toLocaleString('es-CO')}</span></div>}
            {salsaExtra > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLOR_SALSAS }}><span>Salsas extra</span><span>+${salsaExtra.toLocaleString('es-CO')}</span></div>}
            {adicsTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#d97706' }}><span>Adiciones</span><span>+${adicsTotal.toLocaleString('es-CO')}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, color: '#CA0B0B', borderTop: '1px solid #e5e7eb', paddingTop: 6, marginTop: 4 }}>
              <span>Total unitario</span><span>${precioTotal.toLocaleString('es-CO')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={irAnterior}
              style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#555', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {esPrimero ? 'Cancelar' : '← Atrás'}
            </button>
            <button onClick={irSiguiente}
              disabled={pasoActual === 'bowl' && !coberturaTemp}
              style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: (pasoActual === 'bowl' && !coberturaTemp) ? '#e5e7eb' : '#CA0B0B', color: (pasoActual === 'bowl' && !coberturaTemp) ? '#aaa' : '#fff', fontWeight: 800, fontSize: 13, cursor: (pasoActual === 'bowl' && !coberturaTemp) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {esUltimo ? '+ Agregar al pedido' : 'Continuar →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalCrearVenta({ open, onClose, onGuardar, clientesData = [], productosData = [], toppingsData = [], adicionesData = [], categoriasData = [] }) {
  const [pasoActual,         setPasoActual]         = useState(1);
  const [cliente,            setCliente]            = useState(null);
  const [busquedaCliente,    setBusquedaCliente]    = useState('');
  const [dropdownVisible,    setDropdownVisible]    = useState(false);
  const [direccion,          setDireccion]          = useState(null);
  const [modoDir,            setModoDir]            = useState('guardada');
  const [nuevaDireccion,     setNuevaDireccion]     = useState({ direccion_linea: '', barrio: '', ciudad: '', referencia: '' });
  const [carrito,            setCarrito]            = useState([]);
  const [direccionesCliente, setDireccionesCliente] = useState([]);
  const [filtroCategoria,    setFiltroCategoria]    = useState('');
  const [busquedaProd,       setBusquedaProd]       = useState('');
  const [costoEnvio,         setCostoEnvio]         = useState(5500);
  const [calculandoDom,      setCalculandoDom]      = useState(false);
  const [metodoPago,         setMetodoPago]         = useState('efectivo');
  const [montoEfectivo,      setMontoEfectivo]      = useState(0);
  const [montoTransfer,      setMontoTransfer]      = useState(0);
  const [observaciones,      setObservaciones]      = useState('');
  const [procesandoVenta,    setProcesandoVenta]    = useState(false);
  const [productoConfigurar, setProductoConfigurar] = useState(null);
  const [puntosCliente,      setPuntosCliente]      = useState(0);
  const [usarPuntos,         setUsarPuntos]         = useState(false);
  const [puntosAplicar,      setPuntosAplicar]      = useState(0);

  if (!open) return null;

  const subtotal              = carrito.reduce((a, i) => a + calcularPrecioItem(i) * i.cantidad, 0);
  const maxPuntosApl          = puntosCliente > 0 ? redondearPuntos(Math.min(puntosCliente, Math.floor(subtotal / 12.5))) : 0;
  const puntosAplicarEfectivo = Math.min(puntosAplicar, maxPuntosApl);
  const descuentoPuntos       = usarPuntos ? puntosAplicarEfectivo * 12.5 : 0;
  const totalConDesc          = Math.max(0, subtotal - descuentoPuntos);
  const total                 = totalConDesc + Number(costoEnvio || 0);
  const pagoCompleto    = metodoPago === 'efectivo' || metodoPago === 'transferencia'
    || (montoEfectivo > 0 && montoTransfer > 0 && Math.abs(montoEfectivo + montoTransfer - total) < 1);

  const clientesFiltrados = busquedaCliente.length >= 2
    ? clientesData.filter((c) =>
        (c.nombre || '').toLowerCase().includes(busquedaCliente.toLowerCase()) ||
        (c.email  || '').toLowerCase().includes(busquedaCliente.toLowerCase()) ||
        (c.telefono || '').includes(busquedaCliente)
      ).slice(0, 8)
    : [];

  const calcularDomicilioAdmin = async (dir) => {
    if (!dir?.lat || !dir?.lng) return;
    setCalculandoDom(true);
    try {
      const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:3000') + '/api';
      const resp = await fetch(`${API_BASE}/domicilio/calcular`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: dir.lat, lng: dir.lng, ciudad: dir.ciudad || '' }),
      });
      const data = await resp.json();
      if (data.success && data.data?.costo_domicilio) setCostoEnvio(data.data.costo_domicilio);
    } catch (e) { /* silencioso */ } finally {
      setCalculandoDom(false);
    }
  };

  const seleccionarCliente = (c) => {
    setCliente(c); setBusquedaCliente(c.nombre || ''); setDropdownVisible(false);
    setDireccion(null); setDireccionesCliente([]);
    setPuntosCliente(0); setPuntosAplicar(0);
    api.getPuntosCliente(c.id_cliente)
      .then((d) => setPuntosCliente(d?.puntos || 0))
      .catch(() => setPuntosCliente(0));
    api.listarDireccionesCliente(c.id_cliente)
      .then((dirs) => {
        const activas = (dirs || []).filter((d) => d.estado !== 0);
        setDireccionesCliente(activas);
        if (activas.length > 0) {
          setModoDir('guardada'); setDireccion(activas[0]);
          // Calcular domicilio automáticamente si la dirección tiene coordenadas
          calcularDomicilioAdmin(activas[0]);
        } else setModoDir('nueva');
      })
      .catch(() => setDireccionesCliente([]));
  };

  const categoriasActivas  = categoriasData.filter((c) => c.estado === 1);
  const productosActivos   = productosData.filter((p) => p.estado === 1);
  const toppingsActivos    = toppingsData.filter((t) => t.estado === 1);
  const adicionesActivas   = adicionesData.filter((a) => a.estado === 1);

  const productosFiltrados = productosActivos.filter((p) => {
    if (busquedaProd) return p.nombre.toLowerCase().includes(busquedaProd.toLowerCase());
    return !filtroCategoria || p.id_categoria === Number(filtroCategoria);
  });

  const mostrarProductos = filtroCategoria !== '' || busquedaProd.trim().length > 0;

  const itemsIguales = (a, b) => {
    if (a.id_producto !== b.id_producto) return false;
    if ((a.chocolate || '') !== (b.chocolate || '')) return false;
    const topsA = [...(a.toppings || [])].map((t) => t.id_topping).sort().join(',');
    const topsB = [...(b.toppings || [])].map((t) => t.id_topping).sort().join(',');
    if (topsA !== topsB) return false;
    const adsA  = [...(a.adiciones || [])].map((ad) => ad.id_adicion).sort().join(',');
    const adsB  = [...(b.adiciones || [])].map((ad) => ad.id_adicion).sort().join(',');
    if (adsA !== adsB) return false;
    //las salsas incluyen tambien la cobertura del bowl (se guarda como {nombre: 'Chocolate Negro'}, etc)
    const salsasA = [...(a.salsas || [])].map((s) => s.id || s.nombre || s).sort().join(',');
    const salsasB = [...(b.salsas || [])].map((s) => s.id || s.nombre || s).sort().join(',');
    return salsasA === salsasB;
  };

  const agregarAlCarrito = (producto, toppings, adiciones, chocolate, salsas = []) => {
    const nuevoItem = {
      lineaId:          Date.now() + Math.random(),
      id_producto:      producto.id_producto,
      nombre:           producto.nombre,
      precio:           Number(producto.precio),
      permite_toppings: producto.permite_toppings,
      max_toppings:     producto.max_toppings || 0,
      img:              producto.img,
      es_bowl:          producto.es_bowl || false,
      toppings,
      adiciones,
      salsas:           salsas || [],
      chocolate:        chocolate || null,
      cantidad: 1,
    };
    setCarrito((prev) => {
      const idx = prev.findIndex((item) => itemsIguales(item, nuevoItem));
      if (idx >= 0) {
        const arr = [...prev];
        arr[idx] = { ...arr[idx], cantidad: arr[idx].cantidad + 1 };
        return arr;
      }
      return [...prev, nuevoItem];
    });
    setProductoConfigurar(null);
    setBusquedaProd('');
  };

  const quitarProducto = (lineaId) => setCarrito((p) => p.filter((c) => c.lineaId !== lineaId));

  const cambiarCantidad = (lineaId, cant) => {
    if (cant <= 0) { quitarProducto(lineaId); return; }
    setCarrito((p) => p.map((c) => c.lineaId === lineaId ? { ...c, cantidad: cant } : c));
  };

  const getSubtotalItem = (item) => calcularPrecioItem(item) * item.cantidad;

  const cambiarMetodoPago = (m) => {
    setMetodoPago(m);
    if (m !== 'mixto') { setMontoEfectivo(0); setMontoTransfer(0); }
  };

  const handleEfMixto = (v) => {
    const ef = Number(v) || 0;
    setMontoEfectivo(ef);
    if (ef <= total) setMontoTransfer(total - ef);
  };
  const handleTrMixto = (v) => {
    const tr = Number(v) || 0;
    setMontoTransfer(tr);
    if (tr <= total) setMontoEfectivo(total - tr);
  };

  const reset = () => {
    setPasoActual(1); setCliente(null); setBusquedaCliente(''); setDropdownVisible(false);
    setDireccion(null); setModoDir('guardada'); setNuevaDireccion({ direccion_linea: '', barrio: '', ciudad: '', referencia: '' });
    setCarrito([]); setDireccionesCliente([]); setFiltroCategoria(''); setBusquedaProd(''); setCostoEnvio(5500);
    setMetodoPago('efectivo'); setMontoEfectivo(0); setMontoTransfer(0); setObservaciones('');
    setProductoConfigurar(null);
    setPuntosCliente(0); setUsarPuntos(false); setPuntosAplicar(0);
  };

  const guardar = async () => {
    if (procesandoVenta) return;
    setProcesandoVenta(true);
    try {
      const dirFinal = modoDir === 'nueva' ? { ...nuevaDireccion, esNueva: true } : direccion;
      const carritoConSubtotales = carrito.map((item) => ({ ...item, subtotal: getSubtotalItem(item) }));
      const ef = metodoPago === 'efectivo' ? total : metodoPago === 'mixto' ? montoEfectivo : 0;
      const tr = metodoPago === 'transferencia' ? total : metodoPago === 'mixto' ? montoTransfer : 0;
      await onGuardar({
        cliente, direccion: dirFinal, carrito: carritoConSubtotales,
        metodoPago, pagoEfectivo: String(ef), pagoTransfer: String(tr),
        observaciones, total, subtotal, costodomicilio: Number(costoEnvio || 0),
        puntosAplicar: usarPuntos ? puntosAplicarEfectivo : 0,
      });
      reset(); onClose();
    } finally {
      setProcesandoVenta(false);
    }
  };

  const inputSty = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const btnTab   = (act) => ({ flex: 1, padding: '9px 8px', borderRadius: 10, fontSize: 12, cursor: 'pointer', fontWeight: 700, border: act ? 'none' : '1.5px solid #e5e7eb', background: act ? '#1a1a1a' : '#fff', color: act ? '#fff' : '#555', fontFamily: 'inherit' });

  const canNext1 = !calculandoDom && cliente && ((modoDir === 'guardada' && direccion) || (modoDir === 'nueva' && nuevaDireccion.direccion_linea.trim()));
  const canNext2 = carrito.length > 0;
  const canCreate = canNext1 && canNext2 && pagoCompleto && !procesandoVenta;

  const PASOS = ['Cliente y Dirección', 'Productos', 'Pago y Resumen'];

  return (
    <div className="modal-overlay">
      <div className="modal-caja" style={{ width: '70vw', maxWidth: 900, height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>

        {/* ── Encabezado + indicador de pasos ── */}
        <div style={{ padding: '16px 24px 0', borderBottom: '1px solid #f0f0f0', flexShrink: 0, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a' }}>Nueva venta</span>
            <button onClick={() => { reset(); onClose(); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888', lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 0 }}>
            {PASOS.map((label, idx) => {
              const n    = idx + 1;
              const done = pasoActual > n;
              const act  = pasoActual === n;
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', flex: idx < PASOS.length - 1 ? 1 : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, background: done ? '#16a34a' : act ? '#CA0B0B' : '#e5e7eb', color: done || act ? '#fff' : '#888', transition: 'all 0.2s' }}>
                      {done ? '✓' : n}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: act ? 700 : 400, color: act ? '#CA0B0B' : done ? '#16a34a' : '#aaa', whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                  {idx < PASOS.length - 1 && <div style={{ flex: 1, height: 2, background: done ? '#16a34a' : '#e5e7eb', margin: '0 6px', marginBottom: 16, transition: 'background 0.2s' }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Cuerpo del paso (scrollable) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', position: 'relative' }}>
          {productoConfigurar && (
            <ConfiguradorProducto
              producto={productoConfigurar}
              toppingsActivos={toppingsActivos}
              adicionesActivas={adicionesActivas}
              onAgregar={(tops, adics, choc, sals) => agregarAlCarrito(productoConfigurar, tops, adics, choc, sals)}
              onCancelar={() => setProductoConfigurar(null)}
            />
          )}

          {/* ════ PASO 1: Cliente y Dirección ════ */}
          {pasoActual === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>Buscar cliente</label>
                <div style={{ position: 'relative' }}>
                  <input style={inputSty} placeholder="Nombre, email o teléfono..."
                    value={busquedaCliente}
                    onChange={(e) => { setBusquedaCliente(e.target.value); setDropdownVisible(true); if (!e.target.value) { setCliente(null); setDireccion(null); } }}
                    onFocus={() => setDropdownVisible(true)} />
                  {dropdownVisible && clientesFiltrados.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto' }}>
                      {clientesFiltrados.map((c) => (
                        <div key={c.id_cliente} onMouseDown={() => seleccionarCliente(c)}
                          style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f5f5f5' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#CA0B0B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{(c.nombre || '?').charAt(0).toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{c.nombre}</div>
                            <div style={{ fontSize: 11, color: '#888' }}>{c.email} · {c.telefono}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {cliente && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{(cliente.nombre || '?').charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{cliente.nombre}</div>
                    <div style={{ fontSize: 12, color: '#555' }}>{cliente.email} · {cliente.telefono}</div>
                  </div>
                  {puntosCliente > 0 && <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>🎯 {puntosCliente} pts</span>}
                </div>
              )}

              {cliente && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 8 }}>Dirección de entrega</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {direccionesCliente.length > 0 && (
                      <button type="button" style={btnTab(modoDir === 'guardada')} onClick={() => setModoDir('guardada')}>Dirección guardada</button>
                    )}
                    <button type="button" style={btnTab(modoDir === 'nueva')} onClick={() => { setModoDir('nueva'); setDireccion(null); }}>Nueva dirección</button>
                  </div>

                  {modoDir === 'guardada' && direccionesCliente.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {direccionesCliente.map((d) => (
                        <button key={d.id_direccion} type="button"
                          onClick={() => { setDireccion(d); calcularDomicilioAdmin(d); }}
                          style={{ textAlign: 'left', padding: '12px 16px', border: `2px solid ${direccion?.id_direccion === d.id_direccion ? '#CA0B0B' : '#e5e7eb'}`, borderRadius: 12, background: direccion?.id_direccion === d.id_direccion ? '#fff5f5' : '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{d.direccion_linea}</div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{d.barrio}{d.ciudad ? `, ${d.ciudad}` : ''}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {modoDir === 'nueva' && (
                    <FormDireccion value={nuevaDireccion} onChange={(field, value) => setNuevaDireccion((p) => ({ ...p, [field]: value }))} />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '10px 14px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>Costo domicilio $</span>
                    {calculandoDom
                      ? <span style={{ fontSize: 12, color: '#888' }}>Calculando...</span>
                      : <input type="number" className="input-monto" step="1" min="0" value={costoEnvio} onChange={(e) => setCostoEnvio(Number(e.target.value) || 0)}
                          onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                          onInput={(e) => { e.target.value = e.target.value.replace(/[.,]/g, ''); }}
                          style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontFamily: 'inherit' }} />
                    }
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ PASO 2: Productos ════ */}
          {pasoActual === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value ? Number(e.target.value) : '')}
                  style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', background: '#f7f8fd' }}>
                  <option value="">Todas las categorías...</option>
                  {categoriasActivas.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                </select>
                <input style={{ ...inputSty, flex: 1 }} placeholder="Buscar producto..." value={busquedaProd} onChange={(e) => setBusquedaProd(e.target.value)} />
              </div>

              {!mostrarProductos ? (
                <div style={{ textAlign: 'center', color: '#bbb', padding: '40px 0', fontSize: 13 }}>Selecciona una categoría o busca un producto</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {productosFiltrados.map((p) => {
                    const unidades = carrito.filter((c) => c.id_producto === p.id_producto).reduce((s, c) => s + c.cantidad, 0);
                    return (
                      <div key={p.id_producto} onClick={() => setProductoConfigurar(p)}
                        style={{ border: `2px solid ${unidades > 0 ? '#CA0B0B' : '#e5e7eb'}`, borderRadius: 12, padding: '12px', background: unidades > 0 ? '#fff5f5' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {p.img ? (
                          <img src={imgCl(p.img, 80, 80)} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 52, height: 52, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#aaa' }}>{(p.nombre || '?').charAt(0).toUpperCase()}</div>
                        )}
                        <div style={{ fontWeight: 700, fontSize: 12, textAlign: 'center', lineHeight: 1.3 }}>{p.nombre}</div>
                        <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>${Number(p.precio).toLocaleString('es-CO')}</div>
                        {unidades > 0 && <span style={{ background: '#CA0B0B', color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 800, padding: '2px 8px' }}>{unidades} en carrito</span>}
                      </div>
                    );
                  })}
                  {productosFiltrados.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', fontSize: 13, padding: '24px 0' }}>No hay productos</div>}
                </div>
              )}

              {carrito.length > 0 && (
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#CA0B0B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                    Carrito ({carrito.reduce((s, i) => s + i.cantidad, 0)} uds.)
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {carrito.map((item) => {
                      const precioUnit = calcularPrecioItem(item);
                      return (
                        <div key={item.lineaId} style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{item.nombre}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <button style={{ background: '#e5e7eb', border: 'none', borderRadius: 4, width: 24, height: 24, cursor: 'pointer', fontWeight: 800, fontSize: 14 }} onClick={() => cambiarCantidad(item.lineaId, item.cantidad - 1)}>−</button>
                              <span style={{ fontWeight: 800, minWidth: 20, textAlign: 'center', fontSize: 13 }}>{item.cantidad}</span>
                              <button style={{ background: '#e5e7eb', border: 'none', borderRadius: 4, width: 24, height: 24, cursor: 'pointer', fontWeight: 800, fontSize: 14 }} onClick={() => cambiarCantidad(item.lineaId, item.cantidad + 1)}>+</button>
                              <button style={{ background: '#fee2e2', color: '#CA0B0B', border: 'none', borderRadius: 4, width: 24, height: 24, cursor: 'pointer', fontWeight: 800, fontSize: 13 }} onClick={() => quitarProducto(item.lineaId)}>×</button>
                            </div>
                          </div>
                          {item.chocolate && <span style={{ background: item.chocolate === 'Negro' ? '#1e3a5f' : '#f0f0f0', color: item.chocolate === 'Negro' ? '#fff' : '#555', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, display: 'inline-block', marginTop: 3 }}>Choc. {item.chocolate}</span>}
                          {item.es_bowl && parsearSalsas(item.salsas).length > 0 && (
                            <div style={{ marginTop: 3 }}>
                              <span style={{ fontSize: 9, color: '#92400e', border: '1px solid #d97706', background: '#fffbeb', padding: '0 5px', borderRadius: 10, fontWeight: 700 }}>
                                Cobertura: {nombreSalsa(parsearSalsas(item.salsas)[0])}
                              </span>
                            </div>
                          )}
                          {!item.es_bowl && parsearSalsas(item.salsas).length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 3 }}>{parsearSalsas(item.salsas).map((s, si) => <span key={si} style={{ fontSize: 9, color: COLOR_SALSAS, border: `1px solid ${COLOR_SALSAS}`, background: '#fff7ed', padding: '0 5px', borderRadius: 10, fontWeight: 600 }}>{nombreSalsa(s)}</span>)}</div>}
                          {item.toppings?.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>{item.toppings.map((t) => <span key={t.id_topping} style={{ background: '#1a1a1a', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20 }}>{t.nombre}{t.cantidad > 1 ? ` ×${t.cantidad}` : ''}</span>)}</div>}
                          {item.adiciones?.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>{item.adiciones.map((a) => <span key={a.id_adicion} style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #d97706', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20 }}>+{a.nombre}{a.cantidad > 1 ? ` ×${a.cantidad}` : ''}</span>)}</div>}
                          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>${precioUnit.toLocaleString('es-CO')} c/u → <strong style={{ color: '#16a34a' }}>${(precioUnit * item.cantidad).toLocaleString('es-CO')}</strong></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ PASO 3: Pago y Resumen ════ */}
          {pasoActual === 3 && (
            <div style={{ display: 'flex', gap: 20 }}>

              {/* Columna izquierda: pago */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Puntos */}
                {puntosCliente > 0 && (
                  <div style={{ padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8' }}>🎯 Puntos de fidelidad</span>
                      <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>{puntosCliente} pts = ${(puntosCliente * 12.5).toLocaleString('es-CO')}</span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                      <input type="checkbox" checked={usarPuntos} onChange={(e) => { setUsarPuntos(e.target.checked); if (!e.target.checked) setPuntosAplicar(0); else setPuntosAplicar(maxPuntosApl); }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>Usar puntos en este pedido</span>
                    </label>
                    {usarPuntos && (
                      <>
                        <input type="range" min={0} max={maxPuntosApl} step={8} value={puntosAplicarEfectivo}
                          onChange={(e) => setPuntosAplicar(Number(e.target.value))}
                          disabled={maxPuntosApl === 0}
                          style={{ width: '100%', marginBottom: 4, accentColor: '#CA0B0B' }} />
                        {maxPuntosApl === 0 && carrito.length === 0 && (
                          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>Agrega productos primero para usar puntos</div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: '#555' }}>Aplicar: {puntosAplicarEfectivo} pts</span>
                          {puntosAplicarEfectivo > 0 && <span style={{ color: '#16a34a', fontWeight: 700 }}>−${(puntosAplicarEfectivo * 12.5).toLocaleString('es-CO')}</span>}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Método de pago */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 8 }}>Método de pago</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {[
                      {
                        id: 'efectivo',
                        label: 'Efectivo',
                        logo: <LogoEfectivo size={20} />,
                      },
                      {
                        id: 'transferencia',
                        label: 'Transferencia',
                        logo: (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                            <LogoBancolombia size={20} />
                            <LogoNequi size={16} />
                          </div>
                        ),
                      },
                      {
                        id: 'mixto',
                        label: 'Mixto',
                        logo: (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                            <LogoEfectivo size={16} />
                            <span style={{ fontSize: 9, color: '#ccc' }}>+</span>
                            <LogoBancolombia size={16} />
                          </div>
                        ),
                      },
                    ].map((m) => (
                      <button key={m.id} type="button" onClick={() => cambiarMetodoPago(m.id)}
                        style={{ flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', border: metodoPago === m.id ? '2px solid #CA0B0B' : '1px solid #e5e7eb', background: metodoPago === m.id ? '#fff5f5' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
                        {m.logo}
                        <span style={{ fontSize: 11, fontWeight: 700, color: metodoPago === m.id ? '#CA0B0B' : '#555' }}>{m.label}</span>
                      </button>
                    ))}
                  </div>
                  {metodoPago === 'mixto' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 3, marginBottom: 4 }}><LogoEfectivo size={11} /> Efectivo</label>
                          <input type="number" className="input-monto" step="1" min="0" value={montoEfectivo || ''} placeholder="0"
                            onChange={(e) => handleEfMixto(e.target.value)}
                            onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                            onInput={(e) => { e.target.value = e.target.value.replace(/[.,]/g, ''); }}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 3, marginBottom: 4 }}><LogoBancolombia size={11} /><LogoNequi size={11} /> Transfer.</label>
                          <input type="number" className="input-monto" step="1" min="0" value={montoTransfer || ''} placeholder="0"
                            onChange={(e) => handleTrMixto(e.target.value)}
                            onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                            onInput={(e) => { e.target.value = e.target.value.replace(/[.,]/g, ''); }}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                      <div style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: pagoCompleto ? '#f0fdf4' : '#fff5f5', border: `1px solid ${pagoCompleto ? '#bbf7d0' : '#fecaca'}`, color: pagoCompleto ? '#166534' : '#CA0B0B', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{pagoCompleto ? '✓ Pago completo' : 'Pago incompleto'}</span>
                        <span>${total.toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Observaciones */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>Observaciones (opcional)</label>
                  <textarea rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Instrucciones especiales para el pedido..."
                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>

              {/* Columna derecha: resumen */}
              <div style={{ width: 'min(260px, 100%)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#f9fafb', borderRadius: 12, padding: '14px', border: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#CA0B0B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Resumen del pedido</p>

                  {/* Cliente */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#CA0B0B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{(cliente?.nombre || '?').charAt(0).toUpperCase()}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cliente?.nombre}</div>
                      <div style={{ fontSize: 10, color: '#888' }}>{modoDir === 'nueva' ? nuevaDireccion.direccion_linea || 'Nueva dirección' : direccion?.direccion_linea}</div>
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {carrito.map((item) => (
                      <div key={item.lineaId} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, color: '#222' }}>{item.cantidad}× {item.nombre}</span>
                          <span style={{ fontWeight: 700, color: '#16a34a' }}>${(calcularPrecioItem(item) * item.cantidad).toLocaleString('es-CO')}</span>
                        </div>
                        {item.chocolate && <span style={{ background: item.chocolate === 'Negro' ? '#1e3a5f' : '#f0f0f0', color: item.chocolate === 'Negro' ? '#fff' : '#555', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, display: 'inline-block', marginBottom: 2 }}>Choc. {item.chocolate}</span>}
                        {parsearSalsas(item.salsas).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 2 }}>
                            {parsearSalsas(item.salsas).map((s, si) => (
                              <span key={si} style={{ fontSize: 9, color: COLOR_SALSAS, border: `1px solid ${COLOR_SALSAS}`, background: '#fff7ed', padding: '0 5px', borderRadius: 10, fontWeight: 600 }}>{nombreSalsa(s)}</span>
                            ))}
                          </div>
                        )}
                        {item.toppings?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 2 }}>
                            {item.toppings.map((t) => (
                              <span key={t.id_topping} style={{ background: '#1a1a1a', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 20 }}>{t.nombre}{t.cantidad > 1 ? ` ×${t.cantidad}` : ''}</span>
                            ))}
                          </div>
                        )}
                        {item.adiciones?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 2 }}>
                            {item.adiciones.map((a) => (
                              <span key={a.id_adicion} style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #d97706', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 20 }}>+{a.nombre}{a.cantidad > 1 ? ` ×${a.cantidad}` : ''}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Totales */}
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                      <span>Subtotal</span><span>${subtotal.toLocaleString('es-CO')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                      <span>Domicilio</span><span>${Number(costoEnvio || 0).toLocaleString('es-CO')}</span>
                    </div>
                    {usarPuntos && puntosAplicarEfectivo > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#16a34a' }}>
                        <span>Descuento ({puntosAplicarEfectivo} pts)</span><span>−${descuentoPuntos.toLocaleString('es-CO')}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, color: '#16a34a', borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 4 }}>
                      <span>Total</span><span>${total.toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer de navegación ── */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#fff' }}>
          <div>
            {pasoActual > 1
              ? <button onClick={() => setPasoActual(p => p - 1)} style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#555', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>← Atrás</button>
              : <button onClick={() => { reset(); onClose(); }} style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#555', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
            }
          </div>
          <div>
            {pasoActual < 3 ? (
              <button
                onClick={() => setPasoActual(p => p + 1)}
                disabled={pasoActual === 1 ? !canNext1 : !canNext2}
                style={{ padding: '9px 28px', borderRadius: 10, border: 'none', background: (pasoActual === 1 ? canNext1 : canNext2) ? '#CA0B0B' : '#e5e7eb', color: (pasoActual === 1 ? canNext1 : canNext2) ? '#fff' : '#aaa', fontWeight: 700, fontSize: 13, cursor: (pasoActual === 1 ? canNext1 : canNext2) ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                Continuar →
              </button>
            ) : (
              <button onClick={guardar} disabled={!canCreate}
                style={{ padding: '9px 28px', borderRadius: 10, border: 'none', background: canCreate ? '#CA0B0B' : '#e5e7eb', color: canCreate ? '#fff' : '#aaa', fontWeight: 700, fontSize: 13, cursor: canCreate ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                {procesandoVenta ? 'Creando...' : '✓ Crear venta'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IcoWhatsApp() {
  return (
    <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor">
      <path d="M16 0C7.164 0 0 7.163 0 16c0 2.822.737 5.469 2.027 7.773L0 32l8.427-2.007A15.93 15.93 0 0 0 16 32c8.836 0 16-7.164 16-16S24.836 0 16 0zm0 29.333a13.27 13.27 0 0 1-6.773-1.853l-.485-.289-5.003 1.193 1.24-4.858-.317-.499A13.233 13.233 0 0 1 2.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.878c-.398-.2-2.355-1.162-2.72-1.294-.365-.133-.631-.2-.897.2-.265.398-1.03 1.294-1.263 1.56-.232.265-.465.299-.863.1-.398-.2-1.682-.62-3.204-1.977-1.184-1.057-1.984-2.362-2.216-2.76-.232-.398-.025-.613.174-.812.179-.178.398-.465.597-.697.2-.232.265-.398.398-.664.133-.265.066-.498-.033-.697-.1-.2-.897-2.163-1.229-2.96-.324-.778-.653-.672-.897-.684l-.764-.013c-.265 0-.697.1-1.063.498-.365.398-1.394 1.362-1.394 3.325 0 1.962 1.427 3.858 1.626 4.123.2.265 2.808 4.287 6.804 6.013.951.41 1.693.655 2.272.839.954.304 1.823.261 2.51.158.766-.114 2.355-.963 2.687-1.893.332-.93.332-1.727.232-1.893-.099-.166-.365-.265-.763-.465z"/>
    </svg>
  );
}

function ModalDetalle({ open, onClose, venta }) {
  const [lightbox, setLightbox] = useState(false);
  if (!open || !venta) return null;
  const est      = colorEstado(venta.estado);
  const metBadge = venta.metodo_pago ? (METODO_BADGE[venta.metodo_pago] || { bg: '#f5f5f5', color: '#888', label: venta.metodo_pago }) : null;
  const tel      = (venta.telefono_cliente || '').replace(/\D/g, '');
  const wppMsg   = encodeURIComponent(`Hola ${venta.cliente}, tu pedido #${venta.id_venta} de ChocoFreseo ya está confirmado y en preparación 🍫🍦`);
  const wpp      = tel ? `https://wa.me/57${tel}?text=${wppMsg}` : null;
  const subtotalProductos = (venta.detalleVentas || []).reduce((a, d) => {
    return a + calcularDesglose(d).totalItem;
  }, 0);

  return (
    <>
      {lightbox && (
        <div onClick={() => setLightbox(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={venta.comprobante_url} alt="Comprobante" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
        </div>
      )}
      <div className="modal-overlay">
        <div className="modal-caja" style={{ width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="modal-encabezado">
            <span className="modal-titulo">Detalle — #{venta.id_venta}</span>
            <button className="modal-cerrar" onClick={onClose}>✕</button>
          </div>

          <div className="detalle-grid">
            <div className="detalle-item">
              <span className="detalle-label">Estado</span>
              <span className="detalle-badge" style={{ background: est.bg, color: est.color }}>{ESTADO_LABELS[venta.estado] || venta.estado}</span>
            </div>
            <div className="detalle-item">
              <span className="detalle-label">Fecha</span>
              <span className="detalle-valor">{venta.fecha}</span>
            </div>
            <div className="detalle-item">
              <span className="detalle-label">Cliente</span>
              <span className="detalle-valor">{venta.cliente}</span>
            </div>
            <div className="detalle-item">
              <span className="detalle-label">Teléfono</span>
              <span className="detalle-valor">{venta.telefono_cliente}</span>
            </div>
            {venta.barrio && <div className="detalle-item"><span className="detalle-label">Barrio</span><span className="detalle-valor">{venta.barrio}</span></div>}
            {venta.ciudad && <div className="detalle-item"><span className="detalle-label">Ciudad</span><span className="detalle-valor">{venta.ciudad}</span></div>}
            <div className={`detalle-item${venta.nombreDomiciliario ? '' : ' detalle-full'}`}>
              <span className="detalle-label">Dirección</span>
              <span className="detalle-valor">{venta.direccion}</span>
            </div>
            {venta.nombreDomiciliario && (
              <div className="detalle-item">
                <span className="detalle-label">Domiciliario</span>
                <span className="detalle-valor">{venta.nombreDomiciliario}</span>
              </div>
            )}
            {venta.observaciones && (
              <div className="detalle-item detalle-full">
                <span className="detalle-label">Observaciones</span>
                <span className="detalle-valor" style={{ fontStyle: 'italic', color: '#666' }}>{venta.observaciones}</span>
              </div>
            )}
            {venta.estado === 'anulado' && venta.motivo_anulacion && (
              <div className="detalle-item detalle-full">
                <span className="detalle-label">Motivo de anulación</span>
                <span className="detalle-valor" style={{ fontStyle: 'italic', color: '#CA0B0B' }}>{venta.motivo_anulacion}</span>
              </div>
            )}
          </div>

          {(venta.detalleVentas || []).length > 0 && (
            <>
              <p className="detalle-label" style={{ padding: '10px 0 6px', fontWeight: 700, color: '#333' }}>Productos</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {venta.detalleVentas.map((d, i) => {
                  const { precioBase, toppingExtra, salsaExtra, adicsTotal, totalItem, cantidad, salsas } = calcularDesglose(d);
                  return (
                  <div key={i} style={{ background: '#fafafa', borderRadius: 8, padding: '10px 12px', border: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{cantidad}× {d.producto?.nombre || '—'}</span>
                      <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 13 }}>${totalItem.toLocaleString('es-CO')}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                      ${precioBase.toLocaleString('es-CO')} base
                      {toppingExtra > 0 && <span style={{ color: '#CA0B0B' }}> · +${toppingExtra.toLocaleString('es-CO')} toppings</span>}
                      {salsaExtra   > 0 && <span style={{ color: COLOR_SALSAS }}> · +${salsaExtra.toLocaleString('es-CO')} salsas</span>}
                      {adicsTotal   > 0 && <span style={{ color: '#d97706' }}> · +${adicsTotal.toLocaleString('es-CO')} adiciones</span>}
                      {cantidad     > 1 && <span> · ×{cantidad}</span>}
                    </div>
                    {d.chocolate && (
                      <span style={{ background: d.chocolate==='Negro' ? '#1e3a5f' : '#f0f0f0', color: d.chocolate==='Negro' ? '#fff' : '#555', fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 600, display: 'inline-block', marginTop: 4 }}>
                        Chocolate {d.chocolate}
                      </span>
                    )}
                    {salsas.length > 0 && <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:4 }}>{salsas.map((s,si) => <span key={si} style={{ fontSize:10, padding:'1px 7px', borderRadius:20, background:'#fff7ed', color:COLOR_SALSAS, border:`1px solid ${COLOR_SALSAS}`, fontWeight:600 }}>{nombreSalsa(s)}</span>)}</div>}
                    {(d.detalleToppings?.length > 0 || d.detalleAdiciones?.length > 0) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                        {d.detalleToppings?.map((t) => (
                          <span key={t.id_detalle_topping} style={{ background: '#1a1a1a', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                            {t.topping?.nombre}{t.cantidad > 1 ? ` ×${t.cantidad}` : ''}
                          </span>
                        ))}
                        {d.detalleAdiciones?.map((a) => (
                          <span key={a.id_detalle_adicion} style={{ background: '#d97706', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                            +{a.adicion?.nombre}{a.cantidad > 1 ? ` ×${a.cantidad}` : ''}
                            {a.cantidad > 1 ? ` =$${(Number(a.precio_unitario || 0) * a.cantidad).toLocaleString('es-CO')}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </>
          )}


          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666', marginBottom: 6 }}>
              <span>Subtotal productos</span><span>${subtotalProductos.toLocaleString('es-CO')}</span>
            </div>
            {Number(venta.descuento_puntos) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a', marginBottom: 6, fontWeight: 700 }}>
                <span>Descuento puntos ({venta.puntos_usados} pts)</span>
                <span>-${Number(venta.descuento_puntos).toLocaleString('es-CO')}</span>
              </div>
            )}
            {(() => {
              const ganados = (venta.movimientosPuntos || []).filter((m) => m.tipo === 'acumulacion').reduce((s, m) => s + m.puntos, 0);
              if (ganados <= 0) return null;
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#d97706', marginBottom: 6, fontWeight: 700 }}>
                  <span>Puntos ganados</span>
                  <span>+{ganados} pts</span>
                </div>
              );
            })()}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666', marginBottom: 8 }}>
              <span>Costo domicilio</span><span>${Number(venta.costo_domicilio || 0).toLocaleString('es-CO')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#16a34a', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
              <span>Total</span><span>${Number(venta.total || 0).toLocaleString('es-CO')}</span>
            </div>
            {metBadge && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 13, color: '#888' }}>Método de pago</span>
                <span style={{ background: metBadge.bg, color: metBadge.color, fontWeight: 700, fontSize: 12, padding: '3px 12px', borderRadius: 20, display:'inline-flex', alignItems:'center', gap:4 }}>{metBadge.Icon && <metBadge.Icon size={12}/>}{metBadge.label}</span>
              </div>
            )}
            {venta.metodo_pago === 'mixto' && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: '#f5f3ff', borderRadius: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#555', display:'flex', alignItems:'center', gap:4 }}><LogoEfectivo size={13}/>Efectivo</span>
                  <span style={{ fontWeight: 700, color: '#16a34a' }}>${Number(venta.monto_efectivo || 0).toLocaleString('es-CO')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#555', display:'flex', alignItems:'center', gap:4 }}><LogoBancolombia size={13}/><LogoNequi size={13}/>Transferencia</span>
                  <span style={{ fontWeight: 700, color: '#3b82f6' }}>${Number(venta.monto_transferencia || 0).toLocaleString('es-CO')}</span>
                </div>
              </div>
            )}
            {venta.comprobante_url && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 600 }}>Comprobante de pago</p>
                <img
                  src={venta.comprobante_url}
                  alt="Comprobante"
                  onClick={() => setLightbox(true)}
                  style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'zoom-in', display: 'block' }}
                />
              </div>
            )}
          </div>

          <div className="modal-pie" style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            {wpp && (
              <a href={wpp} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#25D366', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', fontFamily: 'inherit' }}>
                <IcoWhatsApp /> WhatsApp
              </a>
            )}
            <button className="btn-primario" onClick={onClose} style={{ flex: 1 }}>Cerrar</button>
          </div>
        </div>
      </div>
    </>
  );
}

function ModalEditarVenta({ open, onClose, onGuardar, venta, productosData = [], toppingsData = [], adicionesData = [], categoriasData = [] }) {
  const [carrito, setCarrito] = useState([]);
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [procesando, setProcesando] = useState(false);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoEfectivo, setMontoEfectivo] = useState(0);
  const [montoTransfer, setMontoTransfer] = useState(0);
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [productoConfigurar, setProductoConfigurar] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busquedaProd, setBusquedaProd] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');

  useEffect(() => {
    if (!open || !venta) return;
    setCostoEnvio(Number(venta.costo_domicilio || 0));
    setMetodoPago(venta.metodo_pago || 'efectivo');
    setMontoEfectivo(Number(venta.monto_efectivo || 0));
    setMontoTransfer(Number(venta.monto_transferencia || 0));
    setNombreCliente(venta.nombre_cliente || (venta.cliente !== '—' ? venta.cliente : '') || '');
    setTelefonoCliente(venta.telefono_cliente !== '—' ? (venta.telefono_cliente || '') : '');
    setIntentoGuardar(false);
    setCarrito((venta.detalleVentas || []).map((d) => ({
      lineaId: d.id_detalle_venta,
      id_producto: d.id_producto,
      nombre: d.producto?.nombre || '—',
      // precio_unitario ya incluye topping extra — NO usar calcularPrecioItem para el total
      precio: Number(d.precio_unitario || 0),
      max_toppings: d.producto?.max_toppings || 0,
      es_bowl: d.producto?.es_bowl || false,
      cantidad: d.cantidad,
      toppings: (d.detalleToppings || []).map((t) => ({ id_topping: t.id_topping, nombre: t.topping?.nombre || '', cantidad: t.cantidad || 1 })),
      adiciones: (d.detalleAdiciones || []).map((a) => ({ id_adicion: a.id_adicion, nombre: a.adicion?.nombre || '', precio: Number(a.precio_unitario || 0), cantidad: a.cantidad || 1 })),
      salsas: parsearSalsas(d.salsas),
      chocolate: d.chocolate || null,
    })));
  }, [open, venta]);

  if (!open || !venta) return null;

  const productosActivos  = productosData.filter((p) => p.estado === 1);
  const toppingsActivos   = toppingsData.filter((t) => t.estado === 1);
  const adicionesActivas  = adicionesData.filter((a) => a.estado === 1);
  const categoriasActivas = categoriasData.filter((c) => c.estado === 1);
  const productosFiltrados = productosActivos.filter((p) => {
    if (busquedaProd) return p.nombre.toLowerCase().includes(busquedaProd.toLowerCase());
    return !filtroCategoria || p.id_categoria === Number(filtroCategoria);
  });
  const mostrarProductos = filtroCategoria !== '' || busquedaProd.trim().length > 0;

  // Fórmula: (precio_unitario + adicionPerUnit) × cantidad  — igual que el carrito del catálogo
  const calcItemEdit = (item) => {
    const adicionTotal = (item.adiciones || []).reduce((s, a) => s + Number(a.precio || 0) * (a.cantidad || 1), 0);
    return (Number(item.precio) + adicionTotal) * item.cantidad;
  };
  const total = carrito.reduce((s, i) => s + calcItemEdit(i), 0) + Number(costoEnvio || 0);

  const cambiarCantidadEdit = (lineaId, cant) => {
    if (cant < 1) { setCarrito((p) => p.filter((x) => x.lineaId !== lineaId)); return; }
    setCarrito((p) => p.map((x) => x.lineaId === lineaId ? { ...x, cantidad: cant } : x));
  };

  const agregarAlCarritoEdit = (prod, tops, adics, choc, sals) => {
    const totalTop = tops.reduce((s, t) => s + (t.cantidad || 1), 0);
    const toppingExtra = Math.max(0, totalTop - (prod.max_toppings || 0)) * 2000;
    const salsasExtra = Math.max(0, (sals || []).length - MAX_SALSAS_GRATIS) * PRECIO_SALSA_EXTRA;
    setCarrito((prev) => [...prev, {
      lineaId: Date.now() + Math.random(),
      id_producto: prod.id_producto, nombre: prod.nombre,
      precio: Number(prod.precio) + toppingExtra + salsasExtra,
      max_toppings: prod.max_toppings || 0, cantidad: 1,
      es_bowl: prod.es_bowl || false,
      toppings: tops, adiciones: adics,
      salsas: sals || [],
      chocolate: choc || null,
    }]);
    setProductoConfigurar(null); setBusquedaProd('');
  };

  const sty = {
    input: { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
    chipB: { background: 'none', border: 'none', cursor: 'pointer', padding: '0 5px', fontSize: 14, fontWeight: 800 },
  };

  const esEntregada = venta.estado === 'entregado';

  // Si está entregada: solo mostrar sección de método de pago
  if (esEntregada) {
    const mixtoOk = metodoPago !== 'mixto' || (montoEfectivo > 0 && montoTransfer > 0 && Math.abs(montoEfectivo + montoTransfer - total) < 1);
    return (
      <div className="modal-overlay">
        <div className="modal-caja" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="modal-encabezado">
            <span className="modal-titulo">Cambiar método de pago — #{venta.id_venta}</span>
            <button className="modal-cerrar" onClick={onClose}>✕</button>
          </div>
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e', display:'flex', alignItems:'center', gap:8 }}>
            <AlertTriangle size={15} /><span>Este pedido ya fue entregado. Solo puedes cambiar el método de pago.</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 700, fontSize: 13, color: '#555', marginBottom: 8, display: 'block' }}>Método de pago</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { v: 'efectivo',      logo: <LogoEfectivo size={20}/>, label: 'Efectivo' },
                { v: 'transferencia', logo: <div style={{display:'flex',alignItems:'center',gap:4}}><LogoBancolombia size={20}/><LogoNequi size={32}/></div>, label: 'Transferencia' },
                { v: 'mixto',         logo: <div style={{display:'flex',alignItems:'center',gap:4}}><LogoEfectivo size={18}/><span style={{fontSize:10,color:'#ccc'}}>+</span><LogoBancolombia size={18}/></div>, label: 'Mixto' },
              ].map((m) => (
                <button key={m.v} type="button" onClick={() => {
                  setMetodoPago(m.v); setIntentoGuardar(false);
                  if (m.v === 'efectivo')      { setMontoEfectivo(total); setMontoTransfer(0); }
                  if (m.v === 'transferencia') { setMontoTransfer(total); setMontoEfectivo(0); }
                  if (m.v === 'mixto')         { setMontoEfectivo(0); setMontoTransfer(0); }
                }} style={{
                  flex: 1, padding: '14px 8px', borderRadius: 12, cursor: 'pointer',
                  border: metodoPago === m.v ? '2px solid #CA0B0B' : '1px solid #e5e7eb',
                  background: metodoPago === m.v ? '#fff5f5' : 'white',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                  {m.logo}
                  <span style={{ fontSize: 12, fontWeight: 700, color: metodoPago === m.v ? '#CA0B0B' : '#555' }}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
            {metodoPago === 'mixto' && (() => {
              const suma = montoEfectivo + montoTransfer;
              const ok = montoEfectivo > 0 && montoTransfer > 0 && Math.abs(suma - total) < 1;
              return (
                <>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: '#888', display: 'flex', alignItems:'center', gap:4, marginBottom: 3 }}><LogoEfectivo size={12}/>Efectivo *</label>
                      <input type="number" className="input-monto" step="1" min="0" value={montoEfectivo || ''} placeholder="0"
                        onChange={(e) => { setMontoEfectivo(Number(e.target.value) || 0); setMontoTransfer(Math.max(0, total - (Number(e.target.value) || 0))); }}
                        onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                        onInput={(e) => { e.target.value = e.target.value.replace(/[.,]/g, ''); }}
                        style={{ width: '100%', padding: '6px 10px', border: `1px solid ${intentoGuardar && montoEfectivo <= 0 ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: '#888', display: 'flex', alignItems:'center', gap:4, marginBottom: 3 }}><LogoBancolombia size={12}/><LogoNequi size={12}/>Transferencia *</label>
                      <input type="number" className="input-monto" step="1" min="0" value={montoTransfer || ''} placeholder="0"
                        onChange={(e) => { setMontoTransfer(Number(e.target.value) || 0); setMontoEfectivo(Math.max(0, total - (Number(e.target.value) || 0))); }}
                        onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                        onInput={(e) => { e.target.value = e.target.value.replace(/[.,]/g, ''); }}
                        style={{ width: '100%', padding: '6px 10px', border: `1px solid ${intentoGuardar && montoTransfer <= 0 ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: ok ? '#f0fdf4' : (intentoGuardar ? '#fff5f5' : '#f9f9f9'), border: `1px solid ${ok ? '#bbf7d0' : (intentoGuardar ? '#fecaca' : '#e5e7eb')}`, color: ok ? '#166534' : '#CA0B0B', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{display:'flex',alignItems:'center',gap:4}}>{ok ? <><Check size={12}/>Los montos cuadran</> : intentoGuardar ? <><AlertTriangle size={12}/>Revisa los montos</> : `Total: $${total.toLocaleString('es-CO')}`}</span>
                    <span>${suma.toLocaleString('es-CO')} / ${total.toLocaleString('es-CO')}</span>
                  </div>
                </>
              );
            })()}
          </div>
          <div className="modal-pie">
            <button className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button className="btn-primario" disabled={procesando} onClick={async () => {
              if (procesando) return;
              if (metodoPago === 'mixto' && !mixtoOk) { setIntentoGuardar(true); return; }
              setProcesando(true);
              try {
                await onGuardar({ items: carrito, costo_domicilio: costoEnvio, metodo_pago: metodoPago, monto_efectivo: metodoPago === 'efectivo' ? total : (metodoPago === 'mixto' ? montoEfectivo : 0), monto_transferencia: metodoPago === 'transferencia' ? total : (metodoPago === 'mixto' ? montoTransfer : 0) });
              } finally {
                setProcesando(false);
              }
            }}><Check size={14} style={{display:'inline',verticalAlign:'middle',marginRight:5}}/>{procesando ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-caja" style={{ width: '70vw', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-encabezado">
          <span className="modal-titulo">Editar venta #{venta.id_venta}</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>

        {/* Datos del cliente */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', marginBottom: 4 }}>NOMBRE CLIENTE</label>
            <input style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} placeholder="Nombre del cliente" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', marginBottom: 4 }}>TELÉFONO</label>
            <input style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} value={telefonoCliente} onChange={(e) => setTelefonoCliente(e.target.value)} placeholder="Ej: 3001234567" maxLength={10} />
          </div>
        </div>

        {/* Productos actuales */}
        <p style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a', marginBottom: 8 }}>Productos del pedido</p>
        {carrito.length === 0 && <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>No hay productos. Agrega al menos uno.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {carrito.map((item) => (
            <div key={item.lineaId} style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{item.nombre}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button style={{ ...sty.chipB, color: '#555', fontSize: 16 }} onClick={() => cambiarCantidadEdit(item.lineaId, item.cantidad - 1)}>−</button>
                  <span style={{ fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{item.cantidad}</span>
                  <button style={{ ...sty.chipB, color: '#555', fontSize: 16 }} onClick={() => cambiarCantidadEdit(item.lineaId, item.cantidad + 1)}>+</button>
                  <button onClick={() => setCarrito((p) => p.filter((x) => x.lineaId !== item.lineaId))}
                    style={{ background: '#fee2e2', color: '#CA0B0B', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>🗑</button>
                </div>
              </div>
              {item.chocolate && <span style={{ background: item.chocolate==='Negro' ? '#1e3a5f' : '#f0f0f0', color: item.chocolate==='Negro' ? '#fff' : '#555', fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 600, display: 'inline-block', marginTop: 3 }}>Chocolate {item.chocolate}</span>}
              {item.es_bowl && parsearSalsas(item.salsas).length > 0 && (
                <div style={{ marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: '#92400e', border: '1px solid #d97706', background: '#fffbeb', padding: '1px 7px', borderRadius: 20, fontWeight: 700 }}>
                    Cobertura: {nombreSalsa(parsearSalsas(item.salsas)[0])}
                  </span>
                </div>
              )}
              {!item.es_bowl && parsearSalsas(item.salsas).length > 0 && <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:3 }}>{parsearSalsas(item.salsas).map((s,i) => <span key={i} style={{ fontSize:10, color:COLOR_SALSAS, border:`1px solid ${COLOR_SALSAS}`, background:'#fff7ed', padding:'1px 7px', borderRadius:20, fontWeight:600 }}>{nombreSalsa(s)}</span>)}</div>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {item.toppings?.map((t) => <span key={t.id_topping} style={{ background: '#1a1a1a', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{t.nombre}{t.cantidad > 1 ? ` ×${t.cantidad}` : ''}</span>)}
                {item.adiciones?.map((a) => <span key={a.id_adicion} style={{ background: '#d97706', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>+{a.nombre}{a.cantidad > 1 ? ` ×${a.cantidad}` : ''}</span>)}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                ${Number(item.precio).toLocaleString('es-CO')} c/u → <strong style={{ color: '#16a34a' }}>${calcItemEdit(item).toLocaleString('es-CO')}</strong>
              </div>
            </div>
          ))}
        </div>

        {/* Agregar producto */}
        <p style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a', marginBottom: 8 }}>Agregar producto</p>
        <div style={{ position: 'relative' }}>
          {productoConfigurar && (
            <ConfiguradorProducto
              producto={productoConfigurar}
              toppingsActivos={toppingsActivos}
              adicionesActivas={adicionesActivas}
              onAgregar={(tops, adics, choc, sals) => agregarAlCarritoEdit(productoConfigurar, tops, adics, choc, sals)}
              onCancelar={() => setProductoConfigurar(null)}
            />
          )}

          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value ? Number(e.target.value) : '')}
            style={{ ...sty.input, marginBottom: 8 }}>
            <option value="">Seleccionar categoría...</option>
            {categoriasActivas.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
          </select>
          <input style={{ ...sty.input, marginBottom: 8 }} placeholder="Buscar producto..." value={busquedaProd} onChange={(e) => setBusquedaProd(e.target.value)} />
          {mostrarProductos && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
              {productosFiltrados.map((p) => (
                <div key={p.id_producto} onClick={() => setProductoConfigurar(p)}
                  style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', background: '#fff', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#1a1a1a' }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>${Number(p.precio).toLocaleString('es-CO')}</div>
                  </div>
                  <span style={{ fontWeight: 800, color: '#CA0B0B' }}>+</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Costo domicilio */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0', padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>Costo domicilio $</label>
          <input type="number" className="input-monto" step="1" min="0" value={costoEnvio} onChange={(e) => setCostoEnvio(Number(e.target.value) || 0)}
            onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
            onInput={(e) => { e.target.value = e.target.value.replace(/[.,]/g, ''); }}
            style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: 13, fontFamily: 'inherit' }} />
        </div>

        {/* Método de pago */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 700, fontSize: 13, color: '#555', marginBottom: 8, display: 'block' }}>Método de pago</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { v: 'efectivo',      contenido: <div style={{ display:'flex', alignItems:'center', gap:6 }}><LogoEfectivo size={16}/> Efectivo</div> },
              { v: 'transferencia', contenido: <div style={{ display:'flex', alignItems:'center', gap:5 }}><LogoBancolombia size={16}/><LogoNequi size={28}/> Transferencia</div> },
              { v: 'mixto',         contenido: <div style={{ display:'flex', alignItems:'center', gap:5 }}><LogoEfectivo size={14}/><LogoBancolombia size={14}/> Mixto</div> },
            ].map((m) => (
              <button key={m.v} type="button" onClick={() => {
                setMetodoPago(m.v);
                if (m.v === 'efectivo')      { setMontoEfectivo(total); setMontoTransfer(0); }
                if (m.v === 'transferencia') { setMontoTransfer(total); setMontoEfectivo(0); }
                if (m.v === 'mixto')         { setMontoEfectivo(0); setMontoTransfer(0); }
              }} style={{
                flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                border: metodoPago === m.v ? '2px solid #CA0B0B' : '1px solid #e5e7eb',
                background: metodoPago === m.v ? '#fff5f5' : 'white',
                color: metodoPago === m.v ? '#CA0B0B' : '#555',
                fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {m.contenido}
              </button>
            ))}
          </div>

          {metodoPago === 'mixto' && (() => {
            const sumaMixto = montoEfectivo + montoTransfer;
            const sumaCubre = Math.abs(sumaMixto - total) < 1;
            const ambosPositivos = montoEfectivo > 0 && montoTransfer > 0;
            const mixtoOk = ambosPositivos && sumaCubre;
            const mostrarError = intentoGuardar && !mixtoOk;
            const bordeEf = (intentoGuardar && montoEfectivo <= 0) ? '#fca5a5' : '#e5e7eb';
            const bordeTr = (intentoGuardar && montoTransfer <= 0) ? '#fca5a5' : '#e5e7eb';
            return (
              <>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'flex', alignItems:'center', gap:4, marginBottom: 3 }}>
                      <LogoEfectivo size={12}/>Efectivo <span style={{ color: '#CA0B0B' }}>*</span>
                    </label>
                    <input
                      type="number" step="1" min="0"
                      className="input-monto"
                      value={montoEfectivo || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const ef = Number(e.target.value) || 0;
                        setMontoEfectivo(ef);
                        setMontoTransfer(Math.max(0, total - ef));
                      }}
                      onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                      onInput={(e) => { e.target.value = e.target.value.replace(/[.,]/g, ''); }}
                      style={{ width: '100%', padding: '6px 10px', border: `1px solid ${bordeEf}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'flex', alignItems:'center', gap:4, marginBottom: 3 }}>
                      <LogoBancolombia size={12}/><LogoNequi size={12}/>Transferencia <span style={{ color: '#CA0B0B' }}>*</span>
                    </label>
                    <input
                      type="number" step="1" min="0"
                      className="input-monto"
                      value={montoTransfer || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const tr = Number(e.target.value) || 0;
                        setMontoTransfer(tr);
                        setMontoEfectivo(Math.max(0, total - tr));
                      }}
                      onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                      onInput={(e) => { e.target.value = e.target.value.replace(/[.,]/g, ''); }}
                      style={{ width: '100%', padding: '6px 10px', border: `1px solid ${bordeTr}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                {/* Indicador: verde cuando cuadra, rojo solo si ya intentó guardar */}
                {mixtoOk ? (
                  <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{display:'flex',alignItems:'center',gap:4}}><Check size={12}/>Los montos cuadran</span>
                    <span>${sumaMixto.toLocaleString('es-CO')} / ${total.toLocaleString('es-CO')}</span>
                  </div>
                ) : mostrarError ? (
                  <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: '#fff5f5', border: '1px solid #fecaca', color: '#CA0B0B', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      <AlertTriangle size={12} style={{marginRight:4}}/>
                      {!ambosPositivos
                        ? 'Ambos montos deben ser mayores a $0'
                        : `Faltan / sobran $${Math.abs(sumaMixto - total).toLocaleString('es-CO')}`
                      }
                    </span>
                    <span>${sumaMixto.toLocaleString('es-CO')} / ${total.toLocaleString('es-CO')}</span>
                  </div>
                ) : null}
              </>
            );
          })()}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: '#16a34a', padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, marginBottom: 16 }}>
          <span>Total</span><span>${total.toLocaleString('es-CO')}</span>
        </div>

        <div className="modal-pie">
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button className="btn-primario"
            disabled={carrito.length === 0 || procesando}
            onClick={async () => {
              if (procesando) return;
              if (metodoPago === 'mixto') {
                const suma = montoEfectivo + montoTransfer;
                if (montoEfectivo <= 0 || montoTransfer <= 0 || Math.abs(suma - total) >= 1) {
                  setIntentoGuardar(true);
                  return;
                }
              }
              setProcesando(true);
              try {
                await onGuardar({
                  items: carrito,
                  costo_domicilio: costoEnvio,
                  metodo_pago: metodoPago,
                  monto_efectivo:      metodoPago === 'efectivo'      ? total : (metodoPago === 'mixto' ? montoEfectivo : 0),
                  monto_transferencia: metodoPago === 'transferencia' ? total : (metodoPago === 'mixto' ? montoTransfer : 0),
                  nombre_cliente:   nombreCliente.trim()   || null,
                  telefono_cliente: telefonoCliente.trim() || null,
                });
              } finally {
                setProcesando(false);
              }
            }}>
            <Check size={14} style={{display:'inline',verticalAlign:'middle',marginRight:5}}/>{procesando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}


function ModalDevolver({ open, onClose, onConfirmar, venta }) {
  if (!open || !venta) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-caja modal-pequeno">
        <div className="modal-icono-grande">↩</div>
        <p className="modal-texto-confirmar">
          ¿Devolver la venta <strong>#{venta.id_venta}</strong> a estado <strong>Listo</strong> para poder editarla antes del despacho?
        </p>
        <div className="modal-pie centrado" style={{ marginTop: 16 }}>
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button onClick={onConfirmar} style={{ background: '#fef3c7', color: '#ca8a04', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }}>Sí, devolver</button>
        </div>
      </div>
    </div>
  );
}

function ModalAnular({ open, onClose, onConfirmar, venta }) {
  const [motivo,    setMotivo]    = useState('');
  const [procesando,setProcesando]= useState(false);
  if (!open || !venta) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-caja modal-pequeno">
        <div className="modal-icono-grande"><AlertTriangle size={40} color="#f59e0b"/></div>
        <p className="modal-texto-confirmar">¿Anular la venta <strong>#{venta.id_venta}</strong>?</p>
        <textarea className="form-input" rows={3} placeholder="Motivo de anulación..." value={motivo} onChange={(e) => setMotivo(e.target.value)} style={{ resize: 'none', marginTop: 12 }} />
        <div className="modal-pie centrado" style={{ marginTop: 16 }}>
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button className="btn-peligro" disabled={!motivo.trim() || procesando} onClick={() => { if (!motivo.trim() || procesando) return; setProcesando(true); onConfirmar(motivo); }}>{procesando ? 'Anulando...' : 'Anular venta'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Ventas() {
  const { tienePermiso } = useAuth();
  const [lista,          setLista]         = useState([]);
  const [clientesData,   setClientesData]  = useState([]);
  const [productosData,  setProductosData] = useState([]);
  const [toppingsData,   setToppingsData]  = useState([]);
  const [adicionesData,  setAdicionesData] = useState([]);
  const [categoriasData, setCategoriasData]= useState([]);
  const [busqueda,       setBusqueda]      = useState('');
  const [filtroEstado,   setFiltroEstado]  = useState('todos');
  const [filtroMetodo,   setFiltroMetodo]  = useState('todos');
  const [filtroFecha,    setFiltroFecha]   = useState(() => new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [pagina,         setPagina]        = useState(1);
  const [modalCrear,     setModalCrear]    = useState(false);
  const [detalle,        setDetalle]       = useState(null);
  const [editandoVenta,  setEditandoVenta] = useState(null);
  const [anulando,       setAnulando]      = useState(null);
  const [devolviendo,    setDevolviendo]   = useState(null);
  const [confirmarImpresion, setConfirmarImpresion] = useState(null);

  const cargar = (f = filtroFecha) => api.listarVentas(null, f || undefined).then((d) => setLista(d.map(mapVenta))).catch(() => {});

  const limpiarFiltros = () => {
    setFiltroEstado('todos');
    setFiltroMetodo('todos');
    setFiltroFecha('');
    setBusqueda('');
    cargar('');
  };

  useEffect(() => {
    cargar();
    api.listarClientes().then((d) => setClientesData(d.map((c) => ({ ...c, nombre: c.usuario?.nombre || '—', telefono: c.telefono || c.usuario?.email || '—', direcciones: c.direcciones || [] })))).catch(() => {});
    api.listarProductos().then(setProductosData).catch(() => {});
    api.listarToppings().then(setToppingsData).catch(() => {});
    api.listarAdiciones().then(setAdicionesData).catch(() => {});
    api.listarCategorias().then(setCategoriasData).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setPagina(1); }, [busqueda, filtroEstado, filtroMetodo, filtroFecha]);

  const filtrados = lista.filter((v) => {
    const matchBusqueda = (v.cliente || '').toLowerCase().includes(busqueda.toLowerCase()) || String(v.id_venta).includes(busqueda);
    const matchEstado   = filtroEstado === 'todos' || v.estado === filtroEstado;
    const matchMetodo   = filtroMetodo === 'todos' ? true : v.estado !== 'anulado' && v.metodo_pago === filtroMetodo;
    return matchBusqueda && matchEstado && matchMetodo;
  });

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const crearVenta = async (f) => {
    const items = (f.carrito || []).map((item) => ({
      id_producto:  item.id_producto,
      cantidad:     item.cantidad,
      max_toppings: item.max_toppings || 0,
      toppings:     (item.toppings  || []).map((t) => ({ id_topping: t.id_topping, cantidad: t.cantidad || 1 })),
      adiciones:    (item.adiciones || []).map((a) => ({ id_adicion: a.id_adicion, cantidad: a.cantidad || 1 })),
      salsas:       (item.salsas   || []).map(s => typeof s === 'object' ? (s.id || s.nombre) : s),
      chocolate:    item.chocolate || null,
    }));
    const metodo   = f.metodoPago || 'efectivo';
    const efectivo = metodo === 'efectivo' ? f.total : metodo === 'mixto' ? (Number(f.pagoEfectivo) || 0) : 0;
    const transfer = metodo === 'transferencia' ? f.total : metodo === 'mixto' ? (Number(f.pagoTransfer) || 0) : 0;

    const payload = {
      id_cliente:          f.cliente?.id_cliente,
      costo_domicilio:     f.costodomicilio || 3000,
      observaciones:       f.observaciones || '',
      items,
      ...(metodo ? { metodo_pago: metodo } : {}),
      ...(efectivo > 0        ? { monto_efectivo:      efectivo        } : {}),
      ...(transfer > 0        ? { monto_transferencia: transfer        } : {}),
      ...(f.puntosAplicar > 0 ? { puntos_usados:       f.puntosAplicar } : {}),
    };

    if (f.direccion?.esNueva) {
      payload.nueva_direccion = {
        direccion_linea: f.direccion.direccion_linea,
        barrio:          f.direccion.barrio          || null,
        ciudad:          f.direccion.ciudad          || null,
        departamento:    f.direccion.departamento    || null,
        referencia:      f.direccion.referencia      || null,
      };
    } else {
      payload.id_direccion = f.direccion?.id_direccion;
    }

    try { await api.crearVenta(payload); toast.success('¡Venta creada correctamente!'); cargar(); setModalCrear(false); }
    catch (err) { toast.error(err?.response?.data?.message || 'Error al crear la venta'); throw err; }
  };

  const handleEditarVenta = async (f) => {
    const items = f.items.map((item) => ({
      id_producto:  item.id_producto,
      cantidad:     item.cantidad,
      max_toppings: item.max_toppings || 0,
      toppings:     (item.toppings || []).map((t) => ({ id_topping: t.id_topping, cantidad: t.cantidad || 1 })),
      adiciones:    (item.adiciones || []).map((a) => ({ id_adicion: a.id_adicion, cantidad: a.cantidad || 1 })),
      salsas:       (item.salsas  || []).map(s => typeof s === 'object' ? (s.id || s.nombre) : s),
      chocolate:    item.chocolate || null,
    }));
    try {
      await api.editarVenta(editandoVenta.id_venta, {
        items,
        costo_domicilio:     f.costo_domicilio,
        metodo_pago:         f.metodo_pago,
        monto_efectivo:      f.monto_efectivo,
        monto_transferencia: f.monto_transferencia,
        nombre_cliente:      f.nombre_cliente,
        telefono_cliente:    f.telefono_cliente,
      });
      toast.success('¡Venta actualizada!'); cargar(); setEditandoVenta(null);
    }
    catch (err) {
      toast.error(err?.response?.data?.message || 'Error al editar la venta');
      throw err; // re-throw so ModalEditarVenta can reset its procesando state
    }
  };

  const devolverVenta = async () => {
    try { await api.cambiarEstadoVenta(devolviendo.id_venta, { nombre_estado: 'listo' }); }
    catch (err) { toast.error(err?.response?.data?.message || 'Error al devolver venta'); }
    cargar(); setDevolviendo(null);
  };

  const anularVenta = async (mot) => {
    try { await api.anularVenta(anulando.id_venta, { motivo_anulacion: mot }); }
    catch (err) { toast.error(err?.response?.data?.message || 'Error al anular venta'); cargar(); setAnulando(null); return; }
    toast.success('Venta anulada'); cargar(); setAnulando(null);
  };

  const generarComprobante = async (venta) => {
    let ventaCompleta = venta;
    const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3000') + '/api';
    // SIEMPRE cargar detalle completo desde API
    try {
      const token = localStorage.getItem('choco_token') || localStorage.getItem('token');
      const r = await fetch(
        `${apiUrl}/ventas/${venta.id_venta}`,
        { headers: { 'Authorization': 'Bearer ' + token } }
      );
      const text = await r.text();
      let d;
      try {
        d = JSON.parse(text);
      } catch(e) {
        console.error('Respuesta no es JSON:', text.substring(0, 200));
        throw new Error('Error del servidor: ' + r.status);
      }
      if (d.success) ventaCompleta = d.data;
    } catch(e) {
      console.error('Error cargando detalle:', e);
    }

    // fecha ya viene como string desde BD
    const fecha = (() => {
      const raw = ventaCompleta.fecha || ventaCompleta.created_at || ventaCompleta.createdAt;
      if (!raw) return '—';
      if (typeof raw === 'string' && raw.includes('/')) return raw;
      return new Date(raw).toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    })();

    // subtotal recalculado igual que el ver-detalle
    const calcularPrecioDetalle = (d) => {
      const base = Number(d.producto?.precio || 0);
      const permitetoppings = d.producto?.permite_toppings;
      const maxInc = permitetoppings ? (d.producto?.max_toppings || 0) : 0;
      const totTop = (d.detalleToppings||[]).reduce((t, tp) => t + (tp.cantidad||1), 0);
      const topExtra = Math.max(0, totTop - maxInc);
      const salsas = (() => {
        try {
          const raw = d.salsas;
          if (!raw) return [];
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch { return []; }
      })();
      const salExtra = Math.max(0, salsas.length - 2);
      const precAdi = (d.detalleAdiciones||[])
        .reduce((a, ad) => a + Number(ad.adicion?.precio||0) * (ad.cantidad||1), 0);
      const precUnit = base + topExtra * 2000 + salExtra * 5000 + precAdi;
      const precBD = Number(d.precio_unitario || 0);
      return Math.max(precUnit, precBD) * (d.cantidad||1);
    };

    const subtotalProductos = (ventaCompleta.detalleVentas||[])
      .reduce((s, d) => s + calcularPrecioDetalle(d), 0);

    const esAnulada = ventaCompleta.estado?.nombre_estado === 'anulado';

    const puntosGanados = esAnulada || ventaCompleta.puntos_usados > 0
      ? 0
      : Math.floor(subtotalProductos / 500);

    const idCliente = ventaCompleta.cliente?.id_cliente || ventaCompleta.id_cliente;
    let puntosActuales = 0;
    if (!esAnulada) {
      try {
        if (idCliente) {
          const token2 = localStorage.getItem('choco_token') || localStorage.getItem('token');
          const rp = await fetch(`${apiUrl}/puntos/cliente/${idCliente}`, {
            headers: { 'Authorization': 'Bearer ' + token2 },
          });
          const dp = await rp.json();
          if (dp.success) puntosActuales = dp.data.puntos || 0;
        }
      } catch (_) {}
    }

    const yaEntregada = ventaCompleta.estado?.nombre_estado === 'entregado';
    const puntosTotal = esAnulada
      ? null
      : (yaEntregada ? puntosActuales : puntosActuales + puntosGanados);

    // teléfono: el modelo Cliente sí lo trae directo
    const telefono =
      ventaCompleta.cliente?.telefono ||
      ventaCompleta.cliente?.usuario?.telefono ||
      '—';

    // FIX 5: dirección con fallbacks robustos
    const dirObj = ventaCompleta.direccion;
    const dirLinea = typeof dirObj === 'object' ? dirObj?.direccion_linea || '—' : dirObj || '—';
    const barrio    = typeof dirObj === 'object' ? dirObj?.barrio    || '' : '';
    const ciudad    = typeof dirObj === 'object' ? dirObj?.ciudad    || '' : '';
    const referencia = typeof dirObj === 'object' ? dirObj?.referencia || '' : '';

    try {
      const socketUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3000').replace('/api', '');
      const s = io(socketUrl, { transports: ['websocket'] });
      s.emit('reimprimir', {
        id_venta:            ventaCompleta.id_venta,
        cliente:             ventaCompleta.cliente?.usuario?.nombre || '—',
        telefono,
        direccion:           dirLinea,
        barrio,
        ciudad,
        referencia,
        total:               ventaCompleta.total,
        subtotal:            subtotalProductos,
        costo_domicilio:     ventaCompleta.costo_domicilio,
        metodo_pago:         ventaCompleta.metodo_pago,
        monto_efectivo:      ventaCompleta.monto_efectivo,
        monto_transferencia: ventaCompleta.monto_transferencia,
        observaciones:       ventaCompleta.observaciones,
        puntos_usados:       esAnulada ? 0 : (ventaCompleta.puntos_usados || 0),
        descuento_puntos:    esAnulada ? 0 : (ventaCompleta.descuento_puntos || 0),
        puntosGanados,
        puntosActuales,
        puntosTotal,
        detalleVentas:       ventaCompleta.detalleVentas,
        fecha:               ventaCompleta.fecha,
      });
      setTimeout(() => s.disconnect(), 2000);
    } catch (_) {}
    toast.success('Enviando a imprimir...');
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Ventas</h1>
          <p className="page-subtitulo">{lista.length} ventas registradas</p>
        </div>
        {tienePermiso('gestionar_ventas') && (
          <button className="btn-primario" onClick={() => setModalCrear(true)}>+ Nueva venta</button>
        )}
      </div>

      {(() => {
        const estiloFiltro = { height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, color: '#333', background: 'white', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' };
        return (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            {/* Buscador */}
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
              <input style={{ ...estiloFiltro, paddingLeft: 32, width: '100%' }} placeholder="Buscar por cliente o número..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>

            {/* Fecha */}
            <input type="date" value={filtroFecha}
              onChange={(e) => { setFiltroFecha(e.target.value); cargar(e.target.value); }}
              style={estiloFiltro} />

            {/* Estado */}
            <select style={estiloFiltro} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="todos">Todos los estados</option>
              {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
            </select>

            {/* Método de pago */}
            <select style={estiloFiltro} value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)}>
              <option value="todos">Todos los métodos</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="mixto">Mixto</option>
            </select>

            {/* Limpiar */}
            {(filtroEstado !== 'todos' || filtroMetodo !== 'todos' || filtroFecha !== '' || busqueda !== '') && (
              <button onClick={limpiarFiltros} style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, color: '#CA0B0B', background: 'white', fontFamily: 'inherit', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, boxSizing: 'border-box', whiteSpace: 'nowrap' }}>
                <X size={13} /> Limpiar filtros
              </button>
            )}
          </div>
        );
      })()}

      <div style={{ overflowX: 'auto' }}>
      <div className="tabla-wrap tabla-ventas">
        <table>
          <thead>
            <tr>
              <th>Venta</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Dirección</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.length === 0 ? (
              <tr><td colSpan={7}><div className="tabla-vacia">No se encontraron ventas</div></td></tr>
            ) : (
              paginados.map((v) => {
                const est = colorEstado(v.estado);
                return (
                  <tr key={v.id_venta}>
                    <td data-label="Venta"><span className="id-badge">#{v.id_venta}</span></td>
                    <td data-label="Cliente">{v.cliente}</td>
                    <td className="td-suave" data-label="Fecha">{v.fecha}</td>
                    <td className="td-suave" data-label="Dirección">{v.direccion}</td>
                    <td data-label="Total" style={{ fontWeight: 800, color: '#16a34a' }}>${Number(v.total).toLocaleString('es-CO')}</td>
                    <td data-label="Estado"><span className="estado-badge" style={{ background: est.bg, color: est.color }}>{ESTADO_LABELS[v.estado] || v.estado}</span></td>
                    <td data-label="Acciones">
                      <div className="acciones">
                        <button className="btn-accion ver"     onClick={() => api.obtenerVenta(v.id_venta).then(d=>setDetalle(mapVenta(d))).catch(()=>setDetalle(v))} title="Ver detalle"><Eye size={14} /></button>
                        {tienePermiso('gestionar_ventas') && v.estado !== 'anulado' && (
                          <button className="btn-accion editar" onClick={() => setEditandoVenta(v)}
                            title={v.estado === 'entregado' ? 'Cambiar método de pago' : 'Editar venta'}>
                            <Edit size={14} />
                          </button>
                        )}
                        <button className="btn-accion permisos" onClick={() => setConfirmarImpresion(v)} title="Generar comprobante"><FileText size={14} /></button>
                        {v.estado === 'despachado' && (
                          <button className="btn-accion" style={{ background: '#fef3c7', color: '#ca8a04' }} onClick={() => setDevolviendo(v)} title="Devolver a Listo (cancelar despacho)"><RotateCcw size={14} /></button>
                        )}
                        {tienePermiso('anular_venta') && v.estado !== 'anulado' && v.estado !== 'entregado' && v.estado !== 'despachado' && (
                          <button className="btn-accion eliminar" onClick={() => setAnulando(v)} title="Anular venta"><X size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {totalPaginas > 1 && (
          <div className="paginacion">
            <button className="btn-pagina" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}>‹</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`btn-pagina${pagina === n ? ' activo' : ''}`} onClick={() => setPagina(n)}>{n}</button>
            ))}
            <button className="btn-pagina" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>›</button>
          </div>
        )}
      </div>
      </div>

      <ModalCrearVenta open={modalCrear} onClose={() => setModalCrear(false)} onGuardar={crearVenta}
        clientesData={clientesData} productosData={productosData} toppingsData={toppingsData}
        adicionesData={adicionesData} categoriasData={categoriasData} />
      <ModalEditarVenta open={!!editandoVenta} onClose={() => setEditandoVenta(null)} onGuardar={handleEditarVenta}
        venta={editandoVenta} productosData={productosData} toppingsData={toppingsData}
        adicionesData={adicionesData} categoriasData={categoriasData} />
      <ModalDetalle    open={!!detalle}       onClose={() => setDetalle(null)}       venta={detalle} />
<ModalAnular     open={!!anulando}      onClose={() => setAnulando(null)}      onConfirmar={anularVenta} venta={anulando} />
      <ModalDevolver   open={!!devolviendo}   onClose={() => setDevolviendo(null)}   onConfirmar={devolverVenta} venta={devolviendo} />

      {confirmarImpresion && (
        <div
          onClick={() => setConfirmarImpresion(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99999,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 20,
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16,
              padding: '28px 24px', maxWidth: 360,
              width: '100%', textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: '#fff5f5',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24"
                fill="none" stroke="#CA0B0B" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', margin: '0 0 8px' }}>
              ¿Imprimir comprobante?
            </h3>

            <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px', lineHeight: 1.5 }}>
              Pedido #{confirmarImpresion.id_venta} —{' '}
              {confirmarImpresion.cliente?.usuario?.nombre || confirmarImpresion.cliente}
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmarImpresion(null)}
                style={{
                  flex: 1, padding: '10px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: 'white', color: '#555',
                  fontWeight: 600, fontSize: 13,
                  cursor: 'pointer',
                }}>
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const venta = confirmarImpresion;
                  setConfirmarImpresion(null);
                  await generarComprobante(venta);
                }}
                style={{
                  flex: 1, padding: '10px',
                  borderRadius: 8, border: 'none',
                  background: '#CA0B0B', color: 'white',
                  fontWeight: 700, fontSize: 13,
                  cursor: 'pointer',
                }}>
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

