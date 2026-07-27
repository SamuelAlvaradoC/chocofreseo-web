import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Eye, Search, RefreshCw, MapPin, AlertTriangle, Bike, Check } from 'lucide-react';
import { LogoWhatsApp, LogoBancolombia, LogoNequi, LogoEfectivo } from '../../../components/common/LogosApps';
import { toast } from '../../../utils/toast';
import AdminLayout from '../../../components/layout/AdminLayout';
import * as api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import './Domicilios.css';

const COLOR_SALSAS = '#ea580c';
const parsearSalsas = (raw) => { if (!raw) return []; try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(p) ? p : []; } catch { return []; } };
const nombreSalsa   = (s) => { const n = typeof s === 'object' ? s.nombre : s; if (!n) return ''; return n.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); };

const mapVentaDomi = (v) => ({
  id_venta:     v.id_venta,
  cliente:      v.nombre_cliente   || v.cliente?.usuario?.nombre || '—',
  telefono:     v.telefono_cliente || v.cliente?.telefono || '—',
  direccion:    v.direccion?.direccion_linea || '—',
  barrio:       v.direccion?.barrio  || '—',
  ciudad:       v.direccion?.ciudad  || '—',
  total:           Number(v.total || 0),
  subtotal:        Number(v.subtotal || 0),
  costo_domicilio: Number(v.costo_domicilio || 3000),
  descuento_puntos: Number(v.descuento_puntos || 0),
  puntos_usados:   Number(v.puntos_usados || 0),
  metodo_pago:  v.metodo_pago || (v.pagos?.[0]?.detallePagos?.length > 1 ? 'mixto' : v.pagos?.[0]?.detallePagos?.[0]?.metodoPago?.nombre) || 'efectivo',
  monto_efectivo:      Number(v.monto_efectivo      || v.pagos?.[0]?.detallePagos?.find((d) => d.metodoPago?.nombre === 'efectivo')?.monto      || 0),
  monto_transferencia: Number(v.monto_transferencia || v.pagos?.[0]?.detallePagos?.find((d) => d.metodoPago?.nombre === 'transferencia')?.monto || 0),
  comprobante:  v.comprobante_url || v.pagos?.[0]?.detallePagos?.find((d) => d.comprobante)?.comprobante || null,
  fecha:        v.fecha ? new Date(v.fecha).toLocaleString('es-CO') : '—',
  observaciones: v.observaciones || '',
  productos:    (v.detalleVentas || []).map((d) => ({
    nombre:    d.producto?.nombre || '—',
    cantidad:  d.cantidad || 1,
    chocolate: d.chocolate || null,
    salsas:    parsearSalsas(d.salsas),
    toppings:  (d.detalleToppings  || d.toppingDetalles || d.toppings  || []).map((t) => ({
      nombre: t.topping?.nombre || t.nombre || '',
      cantidad: t.cantidad || 1,
    })),
    adiciones: (d.detalleAdiciones || d.adicionDetalles  || d.adiciones || []).map((a) => ({
      nombre:   a.adicion?.nombre || a.nombre || '',
      precio:   Number(a.precio_unitario || a.adicion?.precio || a.precio || 0),
      cantidad: a.cantidad || 1,
    })),
    subtotal:  (() => {
      const base = Number(d.producto?.precio || 0);
      const precioUnitBD = Number(d.precio_unitario || 0);
      const cantidad = d.cantidad || 1;
      const permTop = d.producto?.permite_toppings;
      const maxInc = permTop ? (d.producto?.max_toppings || 0) : 0;
      const totTop = (d.detalleToppings || []).reduce((s,t)=>s+(t.cantidad||1),0);
      const topExtra = Math.max(0, totTop - maxInc) * 2000;
      const sls = parsearSalsas(d.salsas);
      const salExtra = Math.max(0, sls.length - 2) * 5000;
      const adicsT = (d.detalleAdiciones || []).reduce((s,a)=>s+Number(a.subtotal||0),0);
      const precioUnitCalc = base + topExtra + salExtra;
      const precioUnitFinal = Math.max(precioUnitBD, precioUnitCalc);
      return precioUnitFinal * cantidad + adicsT;
    })(),
  })),
});



function ModalRechazarRapido({ open, onClose, onConfirmar, pedido, procesando = false }) {
  const [motivo, setMotivo] = useState('');
  if (!open || !pedido) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-caja modal-pequeno">
        <div className="modal-encabezado">
          <span className="modal-titulo">Rechazar pedido</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>
        <div className="modal-icono-grande"><AlertTriangle size={40} color="#f59e0b"/></div>
        <p className="modal-texto-confirmar">¿Rechazar el pedido <strong>#{pedido.id_venta}</strong>?</p>
        <textarea className="form-input" rows={3} placeholder="Motivo del rechazo..." value={motivo}
          onChange={(e) => setMotivo(e.target.value)} style={{ resize: 'none', marginTop: 12 }} />
        <div className="modal-pie centrado" style={{ marginTop: 16 }}>
          <button className="btn-secundario" onClick={() => { setMotivo(''); onClose(); }}>Cancelar</button>
          <button className="btn-peligro" onClick={() => { if (motivo.trim()) { onConfirmar(motivo); setMotivo(''); } }} disabled={!motivo.trim() || procesando}>
            {procesando ? 'Rechazando...' : 'Confirmar rechazo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalRevision({ open, onClose, onConfirmar, onRechazar, pedido, procesando = false }) {
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [vista,         setVista]         = useState('revision');
  const [lightbox,      setLightbox]      = useState(false);

  if (!open || !pedido) return null;

  const costodomicilio  = Number(pedido.costo_domicilio || 3000);
  const subtotalBruto   = Number(pedido.subtotal || 0);
  const descuentoPuntos = Number(pedido.descuento_puntos || 0);

  const reset = () => { setMotivoRechazo(''); setVista('revision'); setLightbox(false); };

  if (vista === 'rechazar') {
    return (
      <div className="modal-overlay">
        <div className="modal-caja modal-pequeno">
          <div className="modal-encabezado">
            <span className="modal-titulo">Rechazar pedido</span>
            <button className="modal-cerrar" onClick={() => { reset(); onClose(); }}>✕</button>
          </div>
          <div className="modal-icono-grande"><AlertTriangle size={40} color="#f59e0b"/></div>
          <p className="modal-texto-confirmar">¿Rechazar el pedido <strong>#{pedido.id_venta}</strong>?</p>
          <textarea className="form-input" rows={3} placeholder="Motivo del rechazo..." value={motivoRechazo}
            onChange={(e) => setMotivoRechazo(e.target.value)} style={{ resize: 'none', marginTop: 12 }} />
          <div className="modal-pie centrado" style={{ marginTop: 16 }}>
            <button className="btn-secundario" onClick={() => setVista('revision')}>← Volver</button>
            <button className="btn-peligro" onClick={() => { if (motivoRechazo.trim()) { onRechazar(motivoRechazo); reset(); } }} disabled={!motivoRechazo.trim() || procesando}>
              {procesando ? 'Rechazando...' : 'Confirmar rechazo'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {lightbox && (
        <div onClick={() => setLightbox(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={pedido.comprobante} alt="Comprobante" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
        </div>
      )}

      <div className="modal-overlay">
        <div className="modal-caja" style={{ width: 580, maxHeight: '92vh', overflowY: 'auto' }}>
          <div className="modal-encabezado">
            <span className="modal-titulo">Revisar pedido #{pedido.id_venta}</span>
            <button className="modal-cerrar" onClick={() => { reset(); onClose(); }}>✕</button>
          </div>

          <p className="form-seccion-titulo">Información del cliente</p>
          <div className="revision-grid">
            <div className="revision-item">
              <span className="detalle-label">Cliente</span>
              <span className="detalle-valor">{pedido.cliente}</span>
            </div>
            <div className="revision-item">
              <span className="detalle-label">Teléfono</span>
              <span className="detalle-valor">{pedido.telefono}</span>
            </div>
            <div className="revision-item">
              <span className="detalle-label">Barrio</span>
              <span className="detalle-valor">{pedido.barrio}</span>
            </div>
            <div className="revision-item">
              <span className="detalle-label">Ciudad</span>
              <span className="detalle-valor">{pedido.ciudad}</span>
            </div>
            <div className="revision-item revision-full">
              <span className="detalle-label">Dirección</span>
              <span className="detalle-valor">{pedido.direccion}</span>
            </div>
            {pedido.observaciones && (
              <div className="revision-item revision-full">
                <span className="detalle-label">Observaciones</span>
                <span className="detalle-valor" style={{ color: '#ca8a04', display:'flex', alignItems:'center', gap:5 }}><AlertTriangle size={13}/>{pedido.observaciones}</span>
              </div>
            )}
          </div>

          <p className="form-seccion-titulo" style={{ marginTop: 16 }}>Productos del pedido</p>
          <div className="revision-productos">
            {pedido.productos.map((p, i) => (
              <div key={i} className="revision-producto-item">
                <div className="revision-producto-header">
                  <span className="revision-producto-nombre">{p.cantidad}x {p.nombre}</span>
                  <span className="revision-producto-precio">${Number(p.subtotal).toLocaleString('es-CO')}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {p.chocolate && (
                    <span style={{ background: p.chocolate==='Negro' ? '#1e3a5f' : '#f0f0f0', color: p.chocolate==='Negro' ? '#fff' : '#555', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>Chocolate {p.chocolate}</span>
                  )}
                  {p.salsas?.map((s,si) => <span key={si} style={{ fontSize:10, color:COLOR_SALSAS, background:'#fff7ed', border:`1px solid ${COLOR_SALSAS}`, padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{nombreSalsa(s)}</span>)}
                  {p.toppings.map((t, ti) => (
                    <span key={ti} style={{ background: '#1a1a1a', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                      {t.nombre}{t.cantidad > 1 ? ` ×${t.cantidad}` : ''}
                    </span>
                  ))}
                  {p.adiciones.map((a, ai) => (
                    <span key={ai} style={{ background: '#d97706', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                      +{a.nombre}{a.cantidad > 1 ? ` ×${a.cantidad}` : ''}{a.precio > 0 ? ` $${(a.precio * a.cantidad).toLocaleString('es-CO')}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div className="revision-total">
              <div className="carrito-resumen-fila"><span>Subtotal productos</span><span>${subtotalBruto.toLocaleString('es-CO')}</span></div>
              {descuentoPuntos > 0 && (
                <div className="carrito-resumen-fila" style={{ color: '#16a34a', fontWeight: 700 }}>
                  <span>Descuento puntos ({pedido.puntos_usados} pts)</span>
                  <span>-${descuentoPuntos.toLocaleString('es-CO')}</span>
                </div>
              )}
              <div className="carrito-resumen-fila"><span>Domicilio</span><span>${costodomicilio.toLocaleString('es-CO')}</span></div>
              <div className="carrito-resumen-fila total"><span>Total</span><span>${Number(pedido.total).toLocaleString('es-CO')}</span></div>
            </div>
          </div>

          <p className="form-seccion-titulo" style={{ marginTop: 16 }}>Método de pago</p>
          <div className={`pago-verificacion ${pedido.metodo_pago}`}>
            <div className="pago-verif-icono">
              {pedido.metodo_pago === 'efectivo' ? <LogoEfectivo size={20}/> : pedido.metodo_pago === 'mixto' ? <><LogoEfectivo size={20}/><LogoBancolombia size={20}/></> : <><LogoBancolombia size={20}/><LogoNequi size={20}/></>}
            </div>
            <div>
              <div className="pago-verif-titulo">
                {pedido.metodo_pago === 'efectivo' ? 'Pago en efectivo' : pedido.metodo_pago === 'mixto' ? 'Efectivo + Transferencia' : 'Transferencia bancaria'}
              </div>
              {pedido.metodo_pago === 'mixto' && (
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  <div style={{display:'flex',alignItems:'center',gap:4}}><LogoEfectivo size={12}/>Efectivo: <strong>${Number(pedido.monto_efectivo || 0).toLocaleString('es-CO')}</strong></div>
                  <div style={{display:'flex',alignItems:'center',gap:4}}><LogoBancolombia size={12}/><LogoNequi size={12}/>Transferencia: <strong>${Number(pedido.monto_transferencia || 0).toLocaleString('es-CO')}</strong></div>
                </div>
              )}
              {(pedido.metodo_pago === 'transferencia' || pedido.metodo_pago === 'mixto') && (
                <div className="pago-verif-sub">
                  {pedido.comprobante
                    ? <span style={{ color: '#16a34a', fontWeight: 700, display:'flex', alignItems:'center', gap:4 }}><Check size={13}/>Comprobante recibido</span>
                    : <span style={{ color: '#CA0B0B', fontWeight: 700, display:'flex', alignItems:'center', gap:4 }}><AlertTriangle size={13}/>Sin comprobante — verificar por WhatsApp</span>
                  }
                </div>
              )}
            </div>
          </div>

          {(pedido.metodo_pago === 'transferencia' || pedido.metodo_pago === 'mixto') && (
            <div style={{ marginTop: 16 }}>
              <p className="form-seccion-titulo">Comprobante de pago</p>
              {pedido.comprobante ? (
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                  <img
                    src={pedido.comprobante}
                    alt="Comprobante"
                    onClick={() => setLightbox(true)}
                    style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                  />
                  <div style={{ padding: '8px 12px', background: '#f9fafb', fontSize: 12, color: '#888', textAlign: 'center' }}>
                    Haz clic en la imagen para verla en pantalla completa
                  </div>
                </div>
              ) : (
                <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={18} color="#92400e"/>
                  <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>Sin comprobante — verificar por WhatsApp antes de confirmar</span>
                </div>
              )}
            </div>
          )}

          <div className="modal-pie" style={{ marginTop: 20 }}>
            <button className="btn-rechazar" onClick={() => setVista('rechazar')} disabled={procesando}>Rechazar pedido</button>
            <button className="btn-primario" onClick={() => { onConfirmar(); reset(); }} disabled={procesando} style={{display:'flex',alignItems:'center',gap:6}}>
              <Check size={14}/>{procesando ? 'Confirmando...' : 'Confirmar — enviar a cocina'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Domicilios() {
  const { tienePermiso }       = useAuth();
  const [lista,            setLista]            = useState([]);
  const [revisando,        setRevisando]        = useState(null);
  const [rechazandoRapido, setRechazandoRapido] = useState(null);
  const [busqueda,         setBusqueda]         = useState('');
  const [procesando,       setProcesando]       = useState(false);

  const cargar = () => api.listarVentas('pendiente').then((d) => setLista([...d].sort((a, b) => a.id_venta - b.id_venta).map(mapVentaDomi))).catch(() => {});
  useEffect(() => { cargar(); }, []);

  const filtrados = lista.filter((d) =>
    (d.cliente || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    String(d.id_venta).includes(busqueda)
  );

  const confirmar = async (pedido) => {
    if (procesando) return; setProcesando(true);
    try { await api.cambiarEstadoVenta(pedido.id_venta, { nombre_estado: 'en_proceso' }); toast.success('Pedido confirmado y enviado a cocina'); }
    catch (err) { toast.error(err?.response?.data?.message || 'Error al confirmar pedido'); }
    finally { setProcesando(false); cargar(); setRevisando(null); }
  };

  const rechazar = async (motivo) => {
    if (procesando) return; setProcesando(true);
    const id = (revisando || rechazandoRapido)?.id_venta;
    if (id) {
      try { await api.anularVenta(id, { motivo_anulacion: motivo || 'Rechazado por admin' }); toast.success('Pedido rechazado'); }
      catch (err) { toast.error(err?.response?.data?.message || 'Error al rechazar pedido'); }
    }
    setProcesando(false); cargar(); setRevisando(null); setRechazandoRapido(null);
  };

  const urlWpp = (telefono, idVenta) =>
    `https://wa.me/57${telefono}?text=Hola,%20confirmamos%20tu%20pedido%20%23${idVenta}%20de%20ChocoFreseo`;

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Pedidos por confirmar</h1>
          <p className="page-subtitulo">{lista.length} pedidos esperando confirmación</p>
        </div>
        <button
          onClick={cargar}
          style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
        >
          <RefreshCw size={14} />
          Actualizar pedidos
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="domi-vacio">
          <div className="domi-vacio-icono"><Bike size={40} color="#CA0B0B"/></div>
          <div className="domi-vacio-texto">No hay pedidos pendientes por confirmar</div>
          <div className="domi-vacio-sub">Cuando lleguen nuevos pedidos aparecerán aquí</div>
        </div>
      ) : (
        <div>
          <div className="buscador" style={{ marginBottom: 16 }}>
            <Search size={14} color="#aaa" />
            <input placeholder="Buscar por cliente o número..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>

          <div className="domi-cards">
            {filtrados.map((d) => (
              <div key={d.id_venta} className="domi-card">
                <div className="domi-card-header">
                  <div>
                    <span className="domi-card-venta">#{d.id_venta}</span>
                    <span className="domi-card-fecha">{d.fecha}</span>
                  </div>
                  <span className={`domi-pago-badge ${d.metodo_pago}`}>
                    {d.metodo_pago === 'efectivo' ? <><LogoEfectivo size={12} style={{marginRight:4}}/>Efectivo</> : d.metodo_pago === 'mixto' ? <><LogoEfectivo size={12} style={{marginRight:4}}/>Mixto</> : <><LogoBancolombia size={12} style={{marginRight:4}}/>Transferencia</>}
                  </span>
                </div>

                <div className="domi-card-cliente">
                  <div className="domi-card-nombre">{d.cliente}</div>
                  <div className="domi-card-tel">{d.telefono}</div>
                </div>

                <div className="domi-card-direccion">
                  <MapPin size={13} />
                  {d.direccion}, {d.barrio}
                </div>

                <div className="domi-card-productos">
                  {d.productos.map((p, i) => (
                    <span key={i} className="domi-producto-chip">{p.cantidad}x {p.nombre}</span>
                  ))}
                </div>

                {(d.metodo_pago === 'transferencia' || d.metodo_pago === 'mixto') && !d.comprobante && (
                  <div className="domi-alerta" style={{display:'flex',alignItems:'center',gap:6}}><AlertTriangle size={13}/>Sin comprobante — verificar por WhatsApp antes de confirmar</div>
                )}

                <div className="domi-card-footer">
                  <span className="domi-card-total">${d.total.toLocaleString('es-CO')}</span>
                  <div className="domi-card-acciones">
                    <a href={urlWpp(d.telefono?.replace(/\D/g,''), d.id_venta)} target="_blank" rel="noopener noreferrer" title="Contactar por WhatsApp"
                      style={{ width:34, height:34, borderRadius:8, background:'#25D366', border:'none', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', flexShrink:0 }}>
                      <LogoWhatsApp size={18} color="white"/>
                    </a>
                    {tienePermiso('confirmar_domicilios') && (
                      <button className="btn-accion btn-rechazar-rapido" onClick={() => setRechazandoRapido(d)} title="Rechazar pedido" disabled={procesando}>
                        <XCircle size={15} />
                      </button>
                    )}
                    {tienePermiso('confirmar_domicilios') && (
                      <button className="btn-accion btn-confirmar-rapido" onClick={() => confirmar(d)} title="Confirmar pedido" disabled={procesando}>
                        <CheckCircle2 size={15} />
                      </button>
                    )}
                    <button className="btn-accion btn-ver" onClick={() => setRevisando(d)} title="Ver detalle">
                      <Eye size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ModalRevision
        open={!!revisando}
        onClose={() => setRevisando(null)}
        onConfirmar={() => confirmar(revisando)}
        onRechazar={rechazar}
        pedido={revisando}
        procesando={procesando}
      />
      <ModalRechazarRapido
        open={!!rechazandoRapido}
        onClose={() => setRechazandoRapido(null)}
        onConfirmar={rechazar}
        pedido={rechazandoRapido}
        procesando={procesando}
      />
    </AdminLayout>
  );
}

