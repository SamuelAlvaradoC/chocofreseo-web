import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Eye, Edit, Check, X, FileText, AlertTriangle, Search, RotateCcw } from 'lucide-react';
import { LogoBancolombia, LogoNequi, LogoEfectivo, LogoWhatsApp } from '../../../components/common/LogosApps';
import { toast } from '../../../utils/toast';
import AdminLayout from '../../../components/layout/AdminLayout';
import Paginacion from '../../../components/Paginacion';
import * as api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import './Ventas.css';

const ESTADO_LABELS = {
  pendiente:  'Pendiente',
  en_proceso: 'Confirmado',
  listo:      'Listo para despachar',
  despachado: 'Despachado',
  entregado:  'Entregado',
  anulado:    'Anulado',
};

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

const COLOR_SALSAS = '#ea580c';
const parsearSalsas = (raw) => { if (!raw) return []; try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(p) ? p : []; } catch { return []; } };
const nombreSalsa   = (s) => { const n = typeof s === 'object' ? s.nombre : s; if (!n) return ''; return n.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); };

function ModalDetalle({ open, onClose, venta }) {
  const [lightbox, setLightbox] = useState(false);
  if (!open || !venta) return null;
  const est      = colorEstado(venta.estado);
  const metBadge = venta.metodo_pago ? (METODO_BADGE[venta.metodo_pago] || { bg: '#f5f5f5', color: '#888', label: venta.metodo_pago }) : null;
  const tel      = (venta.telefono_cliente || '').replace(/\D/g, '');
  const telConPrefijo = tel ? (tel.startsWith('57') ? tel : `57${tel}`) : '';
  const wppMsg   = encodeURIComponent(`Hola ${venta.cliente}, tu pedido #${venta.id_venta} de ChocoFreseo ya está confirmado y en preparación 🍫🍦`);
  const wpp      = tel ? `https://wa.me/${telConPrefijo}?text=${wppMsg}` : null;
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
                      {salsaExtra   > 0 && <span style={{ color: COLOR_SALSAS }}> · +${salsaExtra.toLocaleString('es-CO')} untables</span>}
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
                <LogoWhatsApp size={16} color="white"/> WhatsApp
              </a>
            )}
            <button className="btn-primario" onClick={onClose} style={{ flex: 1 }}>Cerrar</button>
          </div>
        </div>
      </div>
    </>
  );
}

// Un pedido puede marcarse 'entregado' por error (el domiciliario se
// equivocó, o se confirmó antes de tiempo) -- por eso Ventas sí necesita
// poder devolverlo a 'listo', aunque el resto de retrocesos de estado vivan
// solo en Pedidos. El backend (service.cambiarEstado) ya protege este
// camino específico contra reimprimir el comprobante de cocina y contra
// duplicar la acumulación de puntos al re-entregarse.
function ModalDevolver({ open, onClose, onConfirmar, venta }) {
  if (!open || !venta) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-caja modal-pequeno">
        <div className="modal-icono-grande">↩</div>
        <p className="modal-texto-confirmar">
          ¿Devolver la venta <strong>#{venta.id_venta}</strong> a estado <strong>Listo</strong>? Esto la saca de Ventas y la regresa a Pedidos.
        </p>
        <div className="modal-pie centrado" style={{ marginTop: 16 }}>
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button onClick={onConfirmar} style={{ background: '#fef3c7', color: '#ca8a04', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }}>Sí, devolver</button>
        </div>
      </div>
    </div>
  );
}

// Una venta entregada ya generó plata real y queda cerrada -- lo único que
// tiene sentido corregir después es el método de pago (ej. se marcó efectivo
// por error y en realidad fue transferencia). El backend (service.editar)
// tiene una rama dedicada para esto quo ignora items/costo_domicilio cuando
// el estado es 'entregado', así que este modal solo pide metodo_pago y,
// si aplica, el desglose efectivo/transferencia.
function ModalCambiarMetodoPago({ open, onClose, onGuardar, venta }) {
  const [procesando, setProcesando] = useState(false);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [efDisplay, setEfDisplay]   = useState('');
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  useEffect(() => {
    if (!open || !venta) return;
    setMetodoPago(venta.metodo_pago || 'efectivo');
    const ef0 = Number(venta.monto_efectivo || 0);
    setEfDisplay(ef0 > 0 ? ef0.toLocaleString('es-CO') : '');
    setIntentoGuardar(false);
  }, [open, venta]);

  if (!open || !venta) return null;

  const total = Number(venta.total || 0);
  const montoEfectivo = Number(efDisplay.replace(/\./g, '')) || 0;
  const montoTransfer = efDisplay !== '' ? Math.max(0, total - montoEfectivo) : 0;
  const mixtoOk = metodoPago !== 'mixto' || (montoEfectivo > 0 && montoTransfer > 0);

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
                setEfDisplay('');
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
            const ok = montoEfectivo > 0 && montoTransfer > 0;
            return (
              <>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'flex', alignItems:'center', gap:4, marginBottom: 3 }}><LogoEfectivo size={12}/>Efectivo *</label>
                    <input type="text" inputMode="numeric" className="input-monto" value={efDisplay} placeholder="0"
                      onChange={(e) => { const d = e.target.value.replace(/\./g,'').replace(/[^0-9]/g,''); const n = Math.min(Number(d)||0,total); setEfDisplay(n>0?n.toLocaleString('es-CO'):''); setIntentoGuardar(false); }}
                      style={{ width: '100%', padding: '6px 10px', border: `1px solid ${intentoGuardar && montoEfectivo <= 0 ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'flex', alignItems:'center', gap:4, marginBottom: 3 }}><LogoBancolombia size={12}/><LogoNequi size={12}/>Transferencia *</label>
                    <input type="text" className="input-monto" value={montoTransfer > 0 ? montoTransfer.toLocaleString('es-CO') : ''} placeholder="0" readOnly
                      style={{ width: '100%', padding: '6px 10px', border: `1px solid ${intentoGuardar && montoTransfer <= 0 ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#f9f9f9', cursor: 'default' }} />
                  </div>
                </div>
                <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: ok ? '#f0fdf4' : (intentoGuardar ? '#fff5f5' : '#f9f9f9'), border: `1px solid ${ok ? '#bbf7d0' : (intentoGuardar ? '#fecaca' : '#e5e7eb')}`, color: ok ? '#166534' : '#CA0B0B', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{display:'flex',alignItems:'center',gap:4}}>{ok ? <><Check size={12}/>Los montos cuadran</> : intentoGuardar ? <><AlertTriangle size={12}/>Revisa los montos</> : `Total: $${total.toLocaleString('es-CO')}`}</span>
                  <span>${(montoEfectivo+montoTransfer).toLocaleString('es-CO')} / ${total.toLocaleString('es-CO')}</span>
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
              await onGuardar({ metodo_pago: metodoPago, monto_efectivo: metodoPago === 'efectivo' ? total : (metodoPago === 'mixto' ? montoEfectivo : 0), monto_transferencia: metodoPago === 'transferencia' ? total : (metodoPago === 'mixto' ? montoTransfer : 0) });
            } finally {
              setProcesando(false);
            }
          }}><Check size={14} style={{display:'inline',verticalAlign:'middle',marginRight:5}}/>{procesando ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Ventas() {
  const { tienePermiso } = useAuth();
  const [lista,          setLista]         = useState([]);
  const [busqueda,       setBusqueda]      = useState('');
  const [filtroMetodo,   setFiltroMetodo]  = useState('todos');
  const [filtroFecha,    setFiltroFecha]   = useState(() => new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [pagina,         setPagina]        = useState(1);
  const [porPagina,      setPorPagina]     = useState(10);
  const [detalle,        setDetalle]       = useState(null);
  const [editandoVenta,  setEditandoVenta] = useState(null);
  const [devolviendo,    setDevolviendo]   = useState(null);
  const [confirmarImpresion, setConfirmarImpresion] = useState(null);

  const cargar = (f = filtroFecha) => api.listarVentas(null, f || undefined).then((d) => setLista(d.map(mapVenta))).catch(() => {});

  const limpiarFiltros = () => {
    setFiltroMetodo('todos');
    setFiltroFecha('');
    setBusqueda('');
    cargar('');
  };

  useEffect(() => {
    cargar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setPagina(1); }, [busqueda, filtroMetodo, filtroFecha]);

  const filtrados = lista.filter((v) => {
    if (v.estado !== 'entregado') return false; // Ventas solo muestra entregados -- pendiente/confirmado/cocina/listo/despachado/anulado viven en Pedidos
    const matchBusqueda = (v.cliente || '').toLowerCase().includes(busqueda.toLowerCase()) || String(v.id_venta).includes(busqueda);
    const matchMetodo   = filtroMetodo === 'todos' || v.metodo_pago === filtroMetodo;
    return matchBusqueda && matchMetodo;
  });

  const mostrandoTodos = porPagina === 'todos';
  const totalPaginas   = mostrandoTodos ? 1 : Math.ceil(filtrados.length / porPagina);
  const paginados      = mostrandoTodos ? filtrados : filtrados.slice((pagina - 1) * porPagina, pagina * porPagina);

  // Al cambiar el selector "Mostrar" (o al filtrar) el total de páginas puede
  // encogerse — si el usuario se había quedado en una página que ya no existe,
  // se recorta a la última válida en vez de dejarlo viendo un listado vacío.
  useEffect(() => {
    setPagina((p) => Math.min(Math.max(1, p), totalPaginas || 1));
  }, [totalPaginas]);

  const cambiarMetodoPago = async (f) => {
    try {
      await api.editarVenta(editandoVenta.id_venta, {
        metodo_pago:         f.metodo_pago,
        monto_efectivo:      f.monto_efectivo,
        monto_transferencia: f.monto_transferencia,
      });
      toast.success('¡Método de pago actualizado!'); cargar(); setEditandoVenta(null);
    }
    catch (err) {
      toast.error(err?.response?.data?.message || 'Error al actualizar el método de pago');
      throw err; // re-throw so ModalCambiarMetodoPago can reset its procesando state
    }
  };

  const devolverVenta = async () => {
    try { await api.cambiarEstadoVenta(devolviendo.id_venta, { nombre_estado: 'listo' }); }
    catch (err) { toast.error(err?.response?.data?.message || 'Error al devolver venta'); }
    cargar(); setDevolviendo(null);
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
          <p className="page-subtitulo">{lista.filter((v) => v.estado === 'entregado').length} ventas registradas</p>
        </div>
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

            {/* Método de pago */}
            <select style={estiloFiltro} value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)}>
              <option value="todos">Todos los métodos</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="mixto">Mixto</option>
            </select>

            {/* Limpiar */}
            {(filtroMetodo !== 'todos' || filtroFecha !== '' || busqueda !== '') && (
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
                        {tienePermiso('gestionar_ventas') && (
                          <button className="btn-accion editar" onClick={() => setEditandoVenta(v)} title="Cambiar método de pago">
                            <Edit size={14} />
                          </button>
                        )}
                        <button className="btn-accion permisos" onClick={() => setConfirmarImpresion(v)} title="Generar comprobante"><FileText size={14} /></button>
                        <button className="btn-accion" style={{ background: '#fef3c7', color: '#ca8a04' }} onClick={() => setDevolviendo(v)} title="Devolver a Listo"><RotateCcw size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {filtrados.length > 0 && (
          <Paginacion
            pagina={pagina} totalPaginas={totalPaginas} onCambiarPagina={setPagina}
            porPagina={porPagina} onCambiarPorPagina={setPorPagina}
          />
        )}
      </div>
      </div>

      <ModalCambiarMetodoPago open={!!editandoVenta} onClose={() => setEditandoVenta(null)} onGuardar={cambiarMetodoPago} venta={editandoVenta} />
      <ModalDevolver   open={!!devolviendo}   onClose={() => setDevolviendo(null)}   onConfirmar={devolverVenta} venta={devolviendo} />
      <ModalDetalle    open={!!detalle}       onClose={() => setDetalle(null)}       venta={detalle} />

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
