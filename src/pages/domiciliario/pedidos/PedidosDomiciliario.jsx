import { useState, useEffect } from 'react';
import { Check, CheckCircle, PackageOpen, Bike } from 'lucide-react';
import { LogoWhatsApp, LogoBancolombia, LogoNequi, LogoEfectivo } from '../../../components/common/LogosApps';
import DomiciliarioLayout from '../../../components/layout/DomiciliarioLayout/DomiciliarioLayout';
import * as api from '../../../services/api';
import './PedidosDomiciliario.css';

const COLOR_SALSAS = '#ea580c';
const parsearSalsas = (raw) => { if (!raw) return []; try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(p) ? p : []; } catch { return []; } };
const nombreSalsa   = (s) => { const n = typeof s === 'object' ? s.nombre : s; if (!n) return ''; return n.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); };

// Aplana una venta de API a la forma que espera PedidoCard
const mapVentaPedido = (v, facturado = false) => {
  const detallesPago = v.pagos?.[0]?.detallePagos || [];
  const forma_pago = v.metodo_pago ||
    (detallesPago.length > 1 ? 'mixto' : detallesPago[0]?.metodoPago?.nombre) ||
    'efectivo';
  return {
    id_venta:        v.id_venta,
    hora:            v.fecha ? new Date(v.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—',
    cliente:         v.nombre_cliente   || v.cliente?.usuario?.nombre || '—',
    telefono:        v.telefono_cliente || v.cliente?.telefono        || '—',
    direccion:       v.direccion?.direccion_linea || '—',
    barrio:          v.direccion?.barrio         || '',
    ciudad:          v.direccion?.ciudad         || '',
    lat:             v.direccion?.lat            || null,
    lng:             v.direccion?.lng            || null,
    forma_pago,
    monto_efectivo:      Number(v.monto_efectivo      || detallesPago.find(d => d.metodoPago?.nombre === 'efectivo')?.monto      || 0),
    monto_transferencia: Number(v.monto_transferencia || detallesPago.find(d => d.metodoPago?.nombre === 'transferencia')?.monto || 0),
    valor:            Number(v.total || 0),
    subtotalBruto:    Number(v.subtotal || 0),
    costo_domicilio:  Number(v.costo_domicilio || 3000),
    descuento_puntos: Number(v.descuento_puntos || 0),
    puntos_usados:    Number(v.puntos_usados || 0),
    estado:          v.estado?.nombre_estado || v.estado || '—',
    facturado,
    productos:       (v.detalleVentas || []).map((d) => ({
      nombre:    d.producto?.nombre || '—',
      cantidad:  d.cantidad || 1,
      chocolate: d.chocolate || null,
      salsas:    parsearSalsas(d.salsas),
      toppings:  (d.detalleToppings || d.toppingDetalles || d.toppings || []).map((t) => {
        const n = t.topping?.nombre || t.nombre || '';
        return (t.cantidad || 1) > 1 ? `${n} ×${t.cantidad}` : n;
      }).filter(Boolean),
      adiciones: (d.detalleAdiciones || d.adicionDetalles || d.adiciones || []).map((a) => {
        const n = a.adicion?.nombre || a.nombre || '';
        return (a.cantidad || 1) > 1 ? `${n} ×${a.cantidad}` : n;
      }).filter(Boolean),
      subtotal:  Number(d.subtotal || 0) + (d.detalleAdiciones || d.adicionDetalles || []).reduce((s, a) => s + Number(a.subtotal || 0), 0),
    })),
  };
};

// ── Iconos ───────────────────────────────────────────────────────
function IconoMaps({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="#CA0B0B">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  );
}
function IcoMapa() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
function IcoCoger() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}
function IcoDevolver() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  );
}
function IcoFacturar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}
function IcoOjo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function IcoChevron({ abierto }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      width="18" height="18"
      style={{ transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .25s' }}
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

// ── Método de pago ───────────────────────────────────────────────
const renderMetodoPago = (forma) => {
  const baseStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 700,
    padding: '3px 8px', borderRadius: 20,
    border: '1px solid #e5e7eb', background: 'white',
  };
  if (forma === 'efectivo') return (
    <span style={baseStyle}><LogoEfectivo size={13}/> Efectivo</span>
  );
  if (forma === 'transferencia') return (
    <span style={baseStyle}><LogoBancolombia size={14}/><LogoNequi size={16}/> Transferencia</span>
  );
  if (forma === 'mixto') return (
    <span style={baseStyle}>
      <LogoEfectivo size={13}/><LogoBancolombia size={13}/> Mixto
    </span>
  );
  return <span style={baseStyle}>{forma}</span>;
};

// ── Modal Detalle ────────────────────────────────────────────────
function ModalDetalle({ pedido, onClose }) {
  if (!pedido) return null;
  return (
    <div className="pd-overlay" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-header">
          <span className="pd-modal-titulo">Pedido #{pedido.id_venta}</span>
          <button className="pd-modal-cerrar" onClick={onClose}>✕</button>
        </div>

        <div className="pd-modal-grid">
          <div className="pd-modal-item">
            <span className="pd-modal-label">Cliente</span>
            <span className="pd-modal-valor">{pedido.cliente}</span>
          </div>
          <div className="pd-modal-item">
            <span className="pd-modal-label">Hora</span>
            <span className="pd-modal-valor">{pedido.hora}</span>
          </div>
          <div className="pd-modal-item pd-modal-full">
            <span className="pd-modal-label">Dirección</span>
            <span className="pd-modal-valor">
              {[pedido.direccion, pedido.barrio, pedido.ciudad].filter(Boolean).join(', ')}
            </span>
          </div>
          <div className="pd-modal-item">
            <span className="pd-modal-label">Teléfono</span>
            <span className="pd-modal-valor">{pedido.telefono}</span>
          </div>
          <div className="pd-modal-item">
            <span className="pd-modal-label">Pago</span>
            {renderMetodoPago(pedido.forma_pago)}
          </div>
          {pedido.forma_pago === 'mixto' && (
            <div className="pd-modal-item pd-modal-full" style={{ gridColumn: '1 / -1' }}>
              <span className="pd-modal-label">Desglose</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                <span style={{ fontSize: 13, display:'flex', alignItems:'center', gap:4 }}><LogoEfectivo size={12}/>Efectivo: <strong>${Number(pedido.monto_efectivo || 0).toLocaleString('es-CO')}</strong></span>
                <span style={{ fontSize: 13, display:'flex', alignItems:'center', gap:4 }}>
                  <LogoBancolombia size={16} /><LogoNequi size={16} />
                  Transferencia: <strong>${Number(pedido.monto_transferencia || 0).toLocaleString('es-CO')}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        <p className="pd-modal-sec">Productos</p>
        <div className="pd-modal-productos">
          {pedido.productos.map((p, i) => (
            <div key={i} className="pd-modal-prod">
              <div className="pd-modal-prod-row">
                <span className="pd-modal-prod-nombre">{p.cantidad}× {p.nombre}</span>
                <span className="pd-modal-prod-precio">${p.subtotal.toLocaleString('es-CO')}</span>
              </div>
              {(p.chocolate || p.salsas?.length > 0 || p.toppings.length > 0 || p.adiciones.length > 0) && (
                <div className="pd-chips">
                  {p.chocolate && <span style={{ background: p.chocolate==='Negro' ? '#1e3a5f' : '#f0f0f0', color: p.chocolate==='Negro' ? '#fff' : '#555', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, display: 'inline-block' }}>Chocolate {p.chocolate}</span>}
                  {p.salsas?.map((s,i) => <span key={i} style={{ fontSize:10, color:COLOR_SALSAS, background:'#fff7ed', border:`1px solid ${COLOR_SALSAS}`, padding:'2px 8px', borderRadius:20, fontWeight:600, display:'inline-block' }}>{nombreSalsa(s)}</span>)}
                  {p.toppings.map((t) => <span key={t} style={{ background: '#1a1a1a', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, display: 'inline-block' }}>{t}</span>)}
                  {p.adiciones.map((a) => <span key={a} style={{ background: '#d97706', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, display: 'inline-block' }}>{a}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pd-modal-total-bloque">
          <div className="pd-modal-total-fila">
            <span>Subtotal productos</span>
            <span>${pedido.subtotalBruto.toLocaleString('es-CO')}</span>
          </div>
          {pedido.descuento_puntos > 0 && (
            <div className="pd-modal-total-fila" style={{ color: '#16a34a', fontWeight: 700 }}>
              <span>Descuento puntos ({pedido.puntos_usados} pts)</span>
              <span>-${pedido.descuento_puntos.toLocaleString('es-CO')}</span>
            </div>
          )}
          <div className="pd-modal-total-fila">
            <span>Domicilio</span>
            <span>${Number(pedido.costo_domicilio ?? 3000).toLocaleString('es-CO')}</span>
          </div>
          <div className="pd-modal-total-fila pd-modal-total-fila--total">
            <span>Total</span>
            <strong>${Number(pedido.valor).toLocaleString('es-CO')}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal Confirmar Entrega ──────────────────────────────────────
function ModalConfirmarEntrega({ pedido, onClose, onConfirmar }) {
  if (!pedido) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 360, width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ marginBottom: 12, display:'flex', justifyContent:'center' }}><CheckCircle size={40} color="#16a34a"/></div>
        <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6, color: '#1a1a1a' }}>
          ¿Confirmas que entregaste el pedido #{pedido.id_venta}?
        </h3>
        <p style={{ color: '#555', fontSize: 13, marginBottom: 24 }}>{pedido.cliente} · ${Number(pedido.valor).toLocaleString('es-CO')}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
            Cancelar
          </button>
          <button onClick={() => onConfirmar(pedido.id_venta)}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
            Sí, entregado
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card compacta ─────────────────────────────────────────────────
function PedidoCard({ pedido, tipo, onCoger, onDevolver, onEntregar, onVerDetalle, procesando = false }) {
  const tel  = (pedido.telefono || '').replace(/\D/g, '');
  const telConPrefijo = tel ? (tel.startsWith('57') ? tel : `57${tel}`) : '';
  const wpp  = tel ? `https://wa.me/${telConPrefijo}?text=${encodeURIComponent('Hola')}` : null;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([pedido.direccion, pedido.barrio, pedido.ciudad].filter(Boolean).join(', '))}`;

  return (
    <div className={`pd-card ${pedido.facturado ? 'pd-card--ok' : ''}`}>

      {pedido.facturado && <div className="pd-ok-banner" style={{display:'flex',alignItems:'center',gap:5}}><Check size={13}/>Entregado y facturado</div>}

      {/* Fila 1: ID + hora + pago */}
      <div className="pd-card-top">
        <div className="pd-card-ids">
          <span className="pd-num">#{pedido.id_venta}</span>
          <span className="pd-hora">{pedido.hora}</span>
        </div>
        {renderMetodoPago(pedido.forma_pago)}
      </div>

      {/* Fila 2: nombre + tel */}
      <div className="pd-card-cliente">
        <span className="pd-nombre">{pedido.cliente}</span>
        <span className="pd-tel">{pedido.telefono}</span>
      </div>

      {/* Fila 3: dirección */}
      <div className="pd-card-dir">
        <IcoMapa />
        <span>{pedido.direccion}</span>
      </div>

      {/* Fila 4: estado */}
      <span className={`pd-estado ${pedido.facturado ? 'pd-estado--ok' : ''}`} style={{ marginTop: 6 }}>
        {pedido.facturado ? <span style={{display:'flex',alignItems:'center',gap:4}}><Check size={12}/>Domicilio entregado</span> : pedido.estado}
      </span>

      {/* Fila 5: total + botones */}
      <div className="pd-card-footer">
        <span className="pd-total">${pedido.valor.toLocaleString('es-CO')}</span>

        <div className="pd-btns">
          <a href={maps} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: '#fff0f0', border: '1px solid #fecaca', textDecoration: 'none', flexShrink: 0 }}
            title="Ver en mapa">
            <IconoMaps size={16} />
          </a>
          {wpp && (
            <a href={wpp} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', textDecoration: 'none', flexShrink: 0 }}
              title="WhatsApp">
              <LogoWhatsApp size={16} />
            </a>
          )}
          {tipo === 'despachar' ? (
            <button className="pd-btn pd-btn--coger" onClick={() => onCoger(pedido)} title="Coger pedido" disabled={procesando}>
              <IcoCoger />
            </button>
          ) : !pedido.facturado ? (
            <>
              <button className="pd-btn pd-btn--dev" onClick={() => onDevolver(pedido)} title="Devolver" disabled={procesando}>
                <IcoDevolver />
              </button>
              <button className="pd-btn pd-btn--fac" onClick={() => onEntregar(pedido)} title="Marcar como entregado" disabled={procesando}>
                <IcoFacturar />
              </button>
            </>
          ) : null}

          {/* Siempre: ver detalle */}
          <button className="pd-btn pd-btn--ver" onClick={() => onVerDetalle(pedido)} title="Ver detalle">
            <IcoOjo />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sección colapsable ────────────────────────────────────────────
function Seccion({ titulo, badge, badgeClass, children, defaultOpen = true }) {
  const [abierto, setAbierto] = useState(defaultOpen);
  return (
    <section className="pd-seccion">
      <button className="pd-seccion-header" onClick={() => setAbierto((v) => !v)}>
        <div className="pd-seccion-left">
          <h2 className="pd-seccion-titulo">{titulo}</h2>
          <span className={`pd-badge ${badgeClass}`}>{badge}</span>
        </div>
        <IcoChevron abierto={abierto} />
      </button>

      <div className={`pd-seccion-body ${abierto ? 'pd-seccion-body--open' : ''}`}>
        {children}
      </div>
    </section>
  );
}

const hoy = () => {
  // Fecha de hoy en Colombia (UTC-5)
  const co = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return co.toISOString().slice(0, 10);
};

// ── Página ────────────────────────────────────────────────────────
export default function PedidosDomiciliario() {
  const [porDespachar, setPorDespachar] = useState([]);
  const [despachados,  setDespachados]  = useState([]);
  const [detalle,      setDetalle]      = useState(null);
  const [entregando,   setEntregando]   = useState(null);
  const [fecha,        setFecha]        = useState(hoy());
  const [procesando,   setProcesando]   = useState(false);

  const cargar = (f = fecha) => {
    const fechaParam = f || undefined;
    api.listarVentas('listo', fechaParam)
      .then((d) => setPorDespachar(d.map((v) => mapVentaPedido(v, false))))
      .catch(console.error);
    // mis-despachos: filtra automáticamente por el domi logueado (solo sus ventas)
    Promise.all([
      api.misDespachados('despachado', fechaParam),
      api.misDespachados('entregado',  fechaParam),
    ]).then(([desp, entr]) => {
      // Una sola lista ordenada: el más reciente (mayor id) arriba
      // — activos (despachado) y entregados mezclados por id_venta DESC
      const todos = [
        ...desp.map((v) => mapVentaPedido(v, false)),
        ...entr.map((v) => mapVentaPedido(v, true)),
      ].sort((a, b) => b.id_venta - a.id_venta);
      setDespachados(todos);
    }).catch(console.error);
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const coger = async (pedido) => {
    if (procesando) return;
    setProcesando(true);
    try {
      // Usar cogerPedido para que se cree el registro en ventasDomiciliario
      // (necesario para que aparezca en "Domiciliarios del día" del dashboard)
      await api.cogerPedido(pedido.id_venta).catch(() =>
        api.cambiarEstadoVenta(pedido.id_venta, { nombre_estado: 'despachado' }).catch(() => {})
      );
      cargar();
    } finally {
      setProcesando(false);
    }
  };

  const devolver = async (pedido) => {
    if (procesando) return;
    setProcesando(true);
    try {
      await api.cambiarEstadoVenta(pedido.id_venta, { nombre_estado: 'listo' }).catch(() => {});
      cargar();
    } finally {
      setProcesando(false);
    }
  };

  const marcarEntregado = async (id_venta) => {
    if (procesando) return;
    setProcesando(true);
    try {
      await api.cambiarEstadoVenta(id_venta, { nombre_estado: 'entregado' }).catch(console.error);
      setEntregando(null);
      setDespachados((prev) => prev.map((p) =>
        p.id_venta === id_venta ? { ...p, facturado: true, estado: 'entregado' } : p
      ));
    } finally {
      setProcesando(false);
    }
  };

  const handleFecha = (e) => {
    const f = e.target.value;
    setFecha(f);
    cargar(f);
  };

  return (
    <DomiciliarioLayout>
      <div className="pd-page">

        {/* Selector de fecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexWrap: 'wrap' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CA0B0B" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#444' }}>Fecha:</span>
          <input
            type="date"
            value={fecha}
            onChange={handleFecha}
            style={{ border: 'none', background: '#f7f8fd', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
          />
        </div>

        <Seccion
          titulo="Por despachar"
          badge={porDespachar.length}
          badgeClass="pd-badge--rojo"
          defaultOpen={true}
        >
          {porDespachar.length === 0 ? (
            <div className="pd-vacio">
              <PackageOpen size={36} color="#CA0B0B"/>
              <span>No hay pedidos listos por despachar</span>
            </div>
          ) : (
            porDespachar.map((p) => (
              <PedidoCard
                key={p.id_venta} pedido={p} tipo="despachar"
                onCoger={coger}
                onEntregar={setEntregando}
                onVerDetalle={setDetalle}
                procesando={procesando}
              />
            ))
          )}
        </Seccion>

        <Seccion
          titulo="Despachados"
          badge={despachados.length}
          badgeClass="pd-badge--verde"
          defaultOpen={true}
        >
          {despachados.length === 0 ? (
            <div className="pd-vacio">
              <Bike size={36} color="#16a34a"/>
              <span>Aún no has cogido ningún pedido</span>
            </div>
          ) : (
            despachados.map((p) => (
              <PedidoCard
                key={p.id_venta} pedido={p} tipo="despachado"
                onDevolver={devolver}
                onEntregar={setEntregando}
                onVerDetalle={setDetalle}
                procesando={procesando}
              />
            ))
          )}
        </Seccion>

      </div>

      <ModalDetalle          pedido={detalle}    onClose={() => setDetalle(null)} />
      <ModalConfirmarEntrega pedido={entregando} onClose={() => { if (!procesando) setEntregando(null); }} onConfirmar={marcarEntregado} />
    </DomiciliarioLayout>
  );
}
