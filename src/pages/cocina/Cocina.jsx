import { useState, useEffect, useCallback } from 'react';
import { Eye, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import * as api from '../../services/api';
import { useRefrescoHeader } from '../../context/RefrescoContext';

const hoyISO = () => new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const COLOR_SALSAS = '#ea580c';
const parsearSalsas = (raw) => { if (!raw) return []; try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(p) ? p : []; } catch { return []; } };
const nombreSalsa   = (s) => { const n = typeof s === 'object' ? s.nombre : s; if (!n) return ''; return n.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); };

const mapPedido = (v) => ({
  id_venta:           v.id_venta,
  hora:               v.fecha ? new Date(v.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—',
  fecha_completa:     v.fecha ? new Date(v.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—',
  cliente:            v.cliente?.usuario?.nombre || '—',
  telefono:           v.cliente?.telefono || null,
  observaciones:      v.observaciones || null,
  estado:             v.estado?.nombre_estado || '—',
  total:              Number(v.total || 0),
  subtotal:           Number(v.subtotal || 0),
  descuento_puntos:   Number(v.descuento_puntos || 0),
  puntos_usados:      Number(v.puntos_usados || 0),
  costo_domicilio:    Number(v.costo_domicilio ?? 3000),
  barrio:             v.direccion?.barrio || null,
  ciudad:             v.direccion?.ciudad || null,
  direccion_completa: v.direccion?.direccion_linea || null,
  productos:          (v.detalleVentas || []).map((d) => ({
    nombre:    d.producto?.nombre || '—',
    cantidad:  d.cantidad || 1,
    chocolate: d.chocolate || null,
    salsas:    parsearSalsas(d.salsas),
    toppings:  (d.detalleToppings  || []).map((t) => {
      const n = t.topping?.nombre || '';
      return (t.cantidad || 1) > 1 ? `${n} ×${t.cantidad}` : n;
    }).filter(Boolean),
    adiciones: (d.detalleAdiciones || []).map((a) => {
      const n = a.adicion?.nombre || '';
      return (a.cantidad || 1) > 1 ? `${n} ×${a.cantidad}` : n;
    }).filter(Boolean),
  })),
});

const chipTopping = { background: '#1a1a1a', color: '#fff',      fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, display: 'inline-block' };
const chipAdicion = { background: '#d97706', color: '#fff',      fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, display: 'inline-block' };

function ModalDetalleCocina({ pedido, onClose, onConfirmar }) {
  if (!pedido) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ background: '#CA0B0B', padding: '16px 20px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>Pedido #{pedido.id_venta}</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 }}>{pedido.fecha_completa} · {pedido.hora}</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {pedido.estado}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 34, height: 34, color: '#fff', fontSize: 18, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: '16px 20px' }}>

          {/* Cliente */}
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#999', letterSpacing: 1, marginBottom: 6 }}>CLIENTE</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a', marginBottom: 4 }}>{pedido.cliente}</div>
            {pedido.telefono && (
              <div style={{ display: 'flex', gap: 6, color: '#555', marginBottom: 2 }}>
                <span>📞</span><span>{pedido.telefono}</span>
              </div>
            )}
            {(pedido.barrio || pedido.ciudad || pedido.direccion_completa) && (
              <div style={{ display: 'flex', gap: 6, color: '#555' }}>
                <span>📍</span>
                <span>
                  {pedido.direccion_completa || ''}
                  {pedido.barrio ? `, ${pedido.barrio}` : ''}
                  {pedido.ciudad ? `, ${pedido.ciudad}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Observaciones */}
          {pedido.observaciones && (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#92400e' }}>
              <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4, color: '#b45309' }}>⚠️ Observación</div>
              <span>{pedido.observaciones}</span>
            </div>
          )}

          {/* Productos */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: 1, marginBottom: 10 }}>PRODUCTOS</div>
          {pedido.productos.map((p, i) => (
            <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < pedido.productos.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a', marginBottom: 6 }}>{p.cantidad}× {p.nombre}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {p.chocolate && <span style={{ background: p.chocolate==='Negro' ? '#1e3a5f' : '#f0f0f0', color: p.chocolate==='Negro' ? '#fff' : '#555', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, display: 'inline-block' }}>Chocolate {p.chocolate}</span>}
                {p.salsas?.length > 0 && p.salsas.map((s, j) => <span key={`s${j}`} style={{ fontSize: 10, color: COLOR_SALSAS, background: '#fff7ed', border: `1px solid ${COLOR_SALSAS}`, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{nombreSalsa(s)}</span>)}
                {p.toppings.map((t, j) => <span key={j} style={chipTopping}>{t}</span>)}
                {p.adiciones.map((a, j) => <span key={j} style={chipAdicion}>{a}</span>)}
              </div>
            </div>
          ))}

          {/* Totales */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 4, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555', marginBottom: 4 }}>
              <span>Subtotal</span><span>${pedido.subtotal.toLocaleString('es-CO')}</span>
            </div>
            {pedido.descuento_puntos > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a', fontWeight: 700, marginBottom: 4 }}>
                <span>Descuento puntos ({pedido.puntos_usados} pts)</span>
                <span>-${pedido.descuento_puntos.toLocaleString('es-CO')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555', marginBottom: 8 }}>
              <span>Domicilio</span><span>${pedido.costo_domicilio.toLocaleString('es-CO')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>
              <span>Total</span><span>${pedido.total.toLocaleString('es-CO')}</span>
            </div>
          </div>

          <button onClick={() => { onConfirmar(pedido.id_venta); onClose(); }}
            style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 12px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Check size={16} /> Marcar como listo
          </button>
        </div>
      </div>
    </div>
  );
}

function PedidoCard({ pedido, onConfirmar, onVerDetalle }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header rojo */}
      <div style={{ background: '#CA0B0B', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>#{pedido.id_venta}</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{pedido.cliente}</div>
        </div>
        <div style={{ background: '#fff', color: '#CA0B0B', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
          {pedido.hora}
        </div>
      </div>

      {/* Cuerpo */}
      <div style={{ padding: 16, flex: 1 }}>
        {pedido.observaciones && (
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 13, color: '#92400e' }}>
            <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 3, color: '#b45309' }}>⚠️ Observación</div>
            <span>{pedido.observaciones}</span>
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: 1, marginBottom: 8, marginTop: pedido.observaciones ? 10 : 0 }}>PRODUCTOS</div>
        {pedido.productos.map((p, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a', marginBottom: 4 }}>
              {p.cantidad}× {p.nombre}
            </div>
            {p.chocolate && (
              <span style={{ background: '#1e3a5f', color: '#fff', fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 600, display: 'inline-block', marginBottom: 4 }}>
                {p.chocolate==='Negro' ? '🍫' : '⬜'} Chocolate {p.chocolate}
              </span>
            )}
            {p.salsas?.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:4 }}>
                {p.salsas.map((s,j) => <span key={j} style={{ fontSize:10, color:COLOR_SALSAS, background:'#fff7ed', border:`1px solid ${COLOR_SALSAS}`, padding:'1px 6px', borderRadius:20, fontWeight:600 }}>{nombreSalsa(s)}</span>)}
              </div>
            )}
            {(p.toppings.length > 0 || p.adiciones.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {p.toppings.map((t, j) => <span key={`t${j}`} style={chipTopping}>{t}</span>)}
                {p.adiciones.map((a, j) => <span key={`a${j}`} style={chipAdicion}>{a}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f0f0f0', padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => onVerDetalle(pedido)}
          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Nunito, sans-serif', flexShrink: 0 }}>
          <Eye size={13} /> Ver detalle
        </button>
        <button onClick={() => onConfirmar(pedido.id_venta)}
          style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Check size={14} /> Marcar como listo
        </button>
      </div>
    </div>
  );
}

export default function Cocina() {
  const [pedidos,     setPedidos]     = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [confirmando, setConfirmando] = useState(null);
  const [marcando,    setMarcando]    = useState(false);
  const [detalleCocina, setDetalleCocina] = useState(null);

  const cargar = useCallback(() => {
    api.listarVentas('en_proceso', hoyISO())
      .then((data) => setPedidos([...(data || [])].sort((a, b) => a.id_venta - b.id_venta).map(mapPedido)))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 8000);
    return () => clearInterval(id);
  }, [cargar]);
  useRefrescoHeader(cargar);

  const marcarListo = async (id) => {
    setMarcando(true);
    try {
      await api.cambiarEstadoVenta(id, { nombre_estado: 'listo' });
      setPedidos((prev) => prev.filter((p) => p.id_venta !== id));
      toast.success('Pedido marcado como listo');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error al marcar como listo');
    } finally {
      setMarcando(false);
      setConfirmando(null);
    }
  };

  return (
    <AdminLayout>
      {/* Modal de confirmación */}
      {confirmando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 360, width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ marginBottom: 12, display:'flex', justifyContent:'center' }}><AlertTriangle size={40} color="#f59e0b"/></div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#1a1a1a' }}>
              ¿Confirmar pedido listo?
            </h3>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
              ¿Estás seguro de marcar el pedido <strong>#{confirmando}</strong> como listo para despachar?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setConfirmando(null)}
                disabled={marcando}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'Nunito, sans-serif' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => marcarListo(confirmando)}
                disabled={marcando}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: marcando ? 'not-allowed' : 'pointer', fontSize: 14, fontFamily: 'Nunito, sans-serif' }}
              >
                {marcando ? 'Marcando...' : 'Sí, está listo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-titulo">Panel Cocina</h1>
          <p className="page-subtitulo">
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} en preparación
          </p>
        </div>
        <button
          onClick={cargar}
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={13} />
          Actualizar
        </button>
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <p style={{ color: '#888' }}>Cargando pedidos...</p>
        </div>
      ) : pedidos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>👨‍🍳</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Todo listo por ahora</h3>
          <p style={{ color: '#888', fontSize: 14 }}>Los pedidos confirmados aparecerán aquí</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
          {pedidos.map((p) => (
            <PedidoCard key={p.id_venta} pedido={p} onConfirmar={setConfirmando} onVerDetalle={setDetalleCocina} />
          ))}
        </div>
      )}
      {detalleCocina && (
        <ModalDetalleCocina
          pedido={detalleCocina}
          onClose={() => setDetalleCocina(null)}
          onConfirmar={setConfirmando}
        />
      )}
    </AdminLayout>
  );
}

