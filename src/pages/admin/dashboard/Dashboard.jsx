import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DollarSign, ShoppingCart, Truck, Clock, TrendingUp, Star, Power, CalendarClock, Wallet, Plus, Trash2, Printer } from 'lucide-react';
import { toast } from '../../../utils/toast';
import AdminLayout from '../../../components/layout/AdminLayout';
import * as api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useRefrescoHeader } from '../../../context/RefrescoContext';
import { contieneEtiquetaHtml, MSG_HTML } from '../../../utils/validarSinHtml';
import './Dashboard.css';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3000') + '/api';

function TarjetaFinanciera({ icono, titulo, valor, color }) {
  return (
    <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
      <div className="stat-icono" style={{ background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icono}</div>
      <div className="stat-info">
        <div className="stat-valor" style={{ fontSize: 18 }}>{valor}</div>
        <div className="stat-titulo" style={{ fontSize: 12 }}>{titulo}</div>
      </div>
    </div>
  );
}

const hoyISO = () => {
  const co = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return co.toISOString().slice(0, 10);
};

// ── TarjetaStat ──────────────────────────────────────────────────
function TarjetaStat({ icono, titulo, valor, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icono" style={{ background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icono}</div>
      <div className="stat-info">
        <div className="stat-valor">{valor}</div>
        <div className="stat-titulo">{titulo}</div>
        {sub && <div className="stat-sub" style={{ color }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Cierre de caja: etiquetas por tipo de gasto ───────────────────
// 'domiciliario' ya no se ofrece en el modal (esos gastos se ven en
// "Total domicilios"), pero se conserva el label por si hay datos viejos.
const TIPO_GASTO_INFO = {
  domiciliario: { label: 'Domiciliario' },
  empleado:     { label: 'Empleado' },
  insumos:      { label: 'Insumos' },
};

// ── Modal agregar gasto ────────────────────────────────────────────
function ModalGasto({ open, onClose, onGuardar, procesando }) {
  const [tipo, setTipo] = useState('empleado');
  const [descripcion, setDescripcion] = useState('');
  const [valor, setValor] = useState('');

  useEffect(() => {
    if (open) { setTipo('empleado'); setDescripcion(''); setValor(''); }
  }, [open]);

  if (!open) return null;

  const guardar = async () => {
    if (!descripcion.trim()) { toast.error('Ingresa una descripción'); return; }
    if (contieneEtiquetaHtml(descripcion)) { toast.error(MSG_HTML); return; }
    const valorNum = Number(String(valor).replace(/\./g, '')) || 0;
    if (!valor || valorNum <= 0) { toast.error('Ingresa un valor mayor a 0'); return; }
    try {
      await onGuardar({ tipo, descripcion: descripcion.trim(), valor: valorNum });
    } catch {
      toast.error('No se pudo agregar el gasto');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-caja" style={{ width: 420 }}>
        <div className="modal-encabezado">
          <span className="modal-titulo">Agregar gasto</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>

        <div className="form-grupo" style={{ marginBottom: 12 }}>
          <select className="form-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="empleado">Empleado</option>
            <option value="insumos">Insumos</option>
          </select>
        </div>

        <div className="form-grupo" style={{ marginBottom: 12 }}>
          <input
            className="form-input"
            placeholder="Nombre del empleado/domi o descripción del insumo"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        <div className="form-grupo">
          <input
            className="form-input input-monto"
            type="text"
            inputMode="numeric"
            placeholder="Valor"
            value={valor}
            onChange={(e) => { const d = e.target.value.replace(/\./g,'').replace(/[^0-9]/g,''); const n = Number(d)||0; setValor(n>0?n.toLocaleString('es-CO'):''); }}
          />
        </div>

        <div className="modal-pie">
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button className="btn-primario" onClick={guardar} disabled={procesando}>
            {procesando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { tienePermiso } = useAuth();
  const [filtroFecha,      setFiltroFecha]      = useState(hoyISO());
  const [stats,            setStats]            = useState({});
  const [productosMasVendidos, setProductosMasVendidos] = useState([]);
  const [domiciliarios,    setDomiciliarios]    = useState([]);
  const [resumenResenas,   setResumenResenas]   = useState(null);
  const [tiempoEspera,     setTiempoEspera]     = useState(30);
  const [editandoTiempo,   setEditandoTiempo]   = useState(false);
  const [nuevoTiempo,      setNuevoTiempo]      = useState(30);
  const [horario,          setHorario]          = useState({ hora_apertura: 13, hora_cierre: 20, estado_tienda: 'schedule' });
  const [editandoHorario,  setEditandoHorario]  = useState(false);
  const [nuevoHorario,     setNuevoHorario]     = useState({ hora_apertura: 13, hora_cierre: 20 });

  // ── Cierre de caja ──────────────────────────────────────────
  // resumenCierre guarda base/gastos/saldo del día — se actualiza con
  // optimistic updates para no parpadear. El resumen financiero del
  // dashboard (stats: efectivo/transferencia/domicilios) es un estado
  // totalmente separado (se carga una sola vez en cargar(), más abajo)
  // y nunca se refresca por acciones del cierre de caja.
  const puedeCierreCaja = tienePermiso('ver_cierre_caja');
  const [resumenCierre,    setResumenCierre]    = useState(null);
  const [cargandoCierre,   setCargandoCierre]   = useState(true);
  const [baseInput,        setBaseInput]        = useState('');
  const [editandoBase,     setEditandoBase]     = useState(false);
  const [guardandoBase,    setGuardandoBase]    = useState(false);
  const [modalGastoAbierto, setModalGastoAbierto] = useState(false);
  const [guardandoGasto,   setGuardandoGasto]   = useState(false);
  const [eliminandoGastoId, setEliminandoGastoId] = useState(null);
  const [imprimiendoCierre, setImprimiendoCierre] = useState(false);
  // Solo se puede editar base/gastos del día de hoy — fechas pasadas son solo lectura
  const esFechaHoy = (filtroFecha || hoyISO()) === hoyISO();

  // Carga inicial — única vez que se muestra el estado de "cargando"
  const cargarCierre = (f = filtroFecha) => {
    if (!puedeCierreCaja) { setCargandoCierre(false); return; }
    // Resetear modo editar al cambiar fecha: si la nueva fecha tiene base guardada
    // se muestra modo lectura con ✏️, no el input de edición.
    setEditandoBase(false);
    setCargandoCierre(true);
    api.cierreCajaResumen(f || undefined)
      .then((data) => { setResumenCierre(data); setBaseInput(String(data.base_inicial ?? 0)); })
      .catch(() => {})
      .finally(() => setCargandoCierre(false));
  };

  // Recarga en background para reconciliar con el servidor — SIN tocar
  // cargandoCierre, así la card nunca se desmonta/parpadea
  const cargarCierreSilencioso = () => {
    api.cierreCajaResumen(filtroFecha || undefined)
      .then((data) => {
        setResumenCierre(data);
        if (!editandoBase) setBaseInput(String(data.base_inicial ?? 0));
      })
      .catch(() => {});
  };

  const abrirEdicionBase = () => {
    setBaseInput(String(resumenCierre.base_inicial ?? 0));
    setEditandoBase(true);
  };

  const cancelarEdicionBase = () => setEditandoBase(false);

  const guardarBase = async () => {
    if (baseInput === '' || Number(baseInput) < 0) { toast.error('Ingresa una base inicial válida'); return; }
    const valor = Number(baseInput);
    const anterior = resumenCierre;

    // Optimistic update — el saldo_final NO se recalcula aquí, se deja el valor
    // anterior hasta que cargarCierreSilencioso() traiga el real del backend
    setResumenCierre((prev) => ({ ...prev, base_inicial: valor, base_registrada: true }));
    setEditandoBase(false);
    setGuardandoBase(true);
    try {
      await api.cierreCajaBase(valor);
      toast.success('Base inicial guardada');
      cargarCierreSilencioso();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo guardar la base inicial');
      setResumenCierre(anterior);
      setEditandoBase(true);
    } finally {
      setGuardandoBase(false);
    }
  };

  const agregarGasto = async (gasto) => {
    const anterior = resumenCierre;
    const gastoOptimista = { id_gasto: `temp-${Date.now()}`, ...gasto, fecha: new Date().toISOString() };

    // Optimistic update — el saldo_final NO se recalcula aquí, se deja el valor
    // anterior hasta que cargarCierreSilencioso() traiga el real del backend
    setResumenCierre((prev) => {
      const gastos = [...(prev.gastos || []), gastoOptimista];
      const total_gastos = gastos.reduce((s, g) => s + Number(g.valor), 0);
      return { ...prev, gastos, total_gastos };
    });
    setModalGastoAbierto(false);
    setGuardandoGasto(true);
    try {
      await api.cierreCajaGasto(gasto);
      toast.success('Gasto agregado');
      cargarCierreSilencioso();
    } catch {
      toast.error('No se pudo agregar el gasto');
      setResumenCierre(anterior);
    } finally {
      setGuardandoGasto(false);
    }
  };

  const eliminarGasto = async (id_gasto) => {
    const anterior = resumenCierre;

    // Optimistic update — el saldo_final NO se recalcula aquí, se deja el valor
    // anterior hasta que cargarCierreSilencioso() traiga el real del backend
    setResumenCierre((prev) => {
      const gastos = (prev.gastos || []).filter((g) => g.id_gasto !== id_gasto);
      const total_gastos = gastos.reduce((s, g) => s + Number(g.valor), 0);
      return { ...prev, gastos, total_gastos };
    });
    setEliminandoGastoId(id_gasto);
    try {
      await api.cierreCajaEliminarGasto(id_gasto);
      toast.success('Gasto eliminado');
      cargarCierreSilencioso();
    } catch {
      toast.error('No se pudo eliminar el gasto');
      setResumenCierre(anterior);
    } finally {
      setEliminandoGastoId(null);
    }
  };

  const imprimirCierre = async () => {
    setImprimiendoCierre(true);
    try {
      const datos = await api.cierreCajaResumen(filtroFecha || undefined);

      const socketUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3000').replace('/api', '');
      const socket = io(socketUrl);

      socket.emit('imprimir_cierre', {
        // Usa la fecha filtrada (no "hoy") para que el comprobante impreso
        // corresponda al día que el admin está viendo. El servidor recalcula
        // los números reales a partir de fechaISO — estos otros campos ya no
        // se usan para el cálculo, solo quedan por compatibilidad.
        fechaISO: filtroFecha || hoyISO(),
        fecha: new Date((filtroFecha || hoyISO()) + 'T12:00:00').toLocaleDateString('es-CO', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          timeZone: 'America/Bogota',
        }),
        base_inicial:            datos.base_inicial,
        total_ventas:            datos.total_ventas,
        total_efectivo:          datos.total_efectivo,
        efectivo_sin_domicilios: datos.efectivo_sin_domicilios,
        total_transferencia:     datos.total_transferencia,
        total_domicilios:        datos.total_domicilios,
        gastos:                  datos.gastos,
        total_gastos:            datos.total_gastos,
        efectivo_en_caja:        datos.saldo_final,
        total_puntos_usados:     datos.total_puntos_usados,
      });

      setTimeout(() => socket.disconnect(), 2000);
      toast.success('Enviando cierre a imprimir...');
    } catch {
      toast.error('Error al imprimir cierre');
    } finally {
      setImprimiendoCierre(false);
    }
  };

  const cargar = (f = filtroFecha) => {
    api.getDashboard(f || undefined).then((data) => {
      setStats(data);
      const tops = Array.isArray(data.top_productos) ? data.top_productos : [];
      const maxCant = tops.reduce((m, p) => Math.max(m, Number(p.cantidad) || 0), 1);
      setProductosMasVendidos(tops.map((p) => ({
        nombre: p.nombre,
        cantidad: Number(p.cantidad) || 0,
        porcentaje: Math.round(((Number(p.cantidad) || 0) / maxCant) * 100),
      })));
    }).catch(() => {});
    api.getDomiciliariosDia(f || undefined).then((data) => {
      setDomiciliarios(Array.isArray(data) ? data : []);
    }).catch(() => {});
  };

  useEffect(() => {
    cargar();
    cargarCierre();
    fetch(`${API_URL}/resenas/resumen`).then((r) => r.json()).then((d) => { if (d.success) setResumenResenas(d.data); }).catch(() => {});
    api.getTiempoEspera().then((min) => { setTiempoEspera(min); setNuevoTiempo(min); }).catch(() => {});
    api.getHorario().then((h) => { setHorario(h); setNuevoHorario({ hora_apertura: h.hora_apertura, hora_cierre: h.hora_cierre }); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresco desde el header: reusa cargar() (stats) y la versión "silenciosa"
  // del cierre de caja (no resetea editandoBase ni parpadea la card).
  const recargarDashboard = () => {
    cargar();
    cargarCierreSilencioso();
    fetch(`${API_URL}/resenas/resumen`).then((r) => r.json()).then((d) => { if (d.success) setResumenResenas(d.data); }).catch(() => {});
  };
  useRefrescoHeader(recargarDashboard);

  return (
    <AdminLayout>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-titulo">
            {filtroFecha
              ? `Resumen del ${new Date(filtroFecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
              : 'Resumen histórico total'}
          </h1>
          <p className="page-subtitulo">ChocoFreseo — Panel de administración</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f7f8fd', borderRadius: 10, border: '1px solid #e5e7eb' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CA0B0B" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => { setFiltroFecha(e.target.value); cargar(e.target.value); cargarCierre(e.target.value); }}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#333' }}
            />
          </div>
        </div>
      </div>

      {/* Stats — 4 tarjetas: 3 métricas + tiempo estimado editable */}
      <div className="stats-grid">
        <TarjetaStat icono={<DollarSign size={20} />} color="#059669" titulo="Ingresos hoy"       valor={`$${Number(stats.ingresos_hoy || 0).toLocaleString('es-CO')}`} sub="Efectivo neto + transferencia" />
        <TarjetaStat icono={<ShoppingCart size={20} />} color="#2563eb" titulo="Ventas hoy"       valor={stats.ventas_hoy ?? 0}                                  sub="Pedidos del día" />
        <TarjetaStat icono={<Truck size={20} />} color="#7c3aed" titulo="Domicilios activos"      valor={stats.domicilios_activos ?? 0}                          sub="En camino" />
        {/* Card tiempo estimado editable */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => !editandoTiempo && setEditandoTiempo(true)}>
          <div className="stat-icono" style={{ background: '#37415118', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} />
          </div>
          <div className="stat-info">
            {editandoTiempo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <input type="number" value={nuevoTiempo} onChange={(e) => setNuevoTiempo(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()} min={1} max={180} autoFocus
                  style={{ width: 46, padding: '1px 4px', borderRadius: 5, border: '2px solid #374151', fontSize: 15, fontWeight: 800, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }} />
                <span style={{ fontSize: 10, color: '#666' }}>min</span>
                <button onClick={async (e) => { e.stopPropagation(); try { await api.setTiempoEspera(nuevoTiempo); setTiempoEspera(nuevoTiempo); setEditandoTiempo(false); toast.success('Tiempo de espera actualizado'); } catch { toast.error('No se pudo actualizar el tiempo de espera'); } }}
                  style={{ background: '#374151', color: 'white', border: 'none', borderRadius: 4, padding: '1px 6px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>✓</button>
                <button onClick={(e) => { e.stopPropagation(); setEditandoTiempo(false); setNuevoTiempo(tiempoEspera); }}
                  style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 4, padding: '1px 4px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>✕</button>
              </div>
            ) : (
              <div className="stat-valor">{tiempoEspera} min</div>
            )}
            <div className="stat-titulo">Tiempo estimado</div>
            {!editandoTiempo && (
              <div style={{ fontSize: 10, color: 'white', marginTop: 3, background: '#2563eb', padding: '2px 8px', borderRadius: 6, display: 'inline-block', fontWeight: 600, cursor: 'pointer' }}>
                ✏️ Editar
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FILA 2 — Cards financieras */}
      <div className="dash-cards-financieras">
        <TarjetaFinanciera icono={<DollarSign size={18} />} titulo="Efectivo del día (neto)"  valor={`$${Number(stats.total_efectivo || 0).toLocaleString('es-CO')}`}      color="#065f46" />
        <TarjetaFinanciera icono={<TrendingUp size={18} />} titulo="Transferencia del día"     valor={`$${Number(stats.total_transferencia || 0).toLocaleString('es-CO')}`}  color="#1e40af" />
        <TarjetaFinanciera icono={<Truck size={18} />}      titulo="Total domicilios"          valor={`$${Number(stats.total_domicilios || 0).toLocaleString('es-CO')}`}     color="#5b21b6" />
      </div>

      <ModalGasto open={modalGastoAbierto} onClose={() => setModalGastoAbierto(false)} onGuardar={agregarGasto} procesando={guardandoGasto} />

      {/* FILA 3 — Cierre de Caja (más ancho) + Productos más vendidos */}
      <div className={puedeCierreCaja ? 'dash-fila-50' : 'dash-fila-media'}>

        {/* Cierre de Caja — card compacta */}
        {puedeCierreCaja && !cargandoCierre && resumenCierre && (
          <div className="dash-card cierre-caja-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="dash-card-header" style={{ marginBottom: 2 }}>
              <span className="dash-card-titulo" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wallet size={15} color="#CA0B0B" /> Cierre de Caja
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, marginBottom: 14 }}>
              {esFechaHoy ? 'Hoy: ' : ''}{new Date(resumenCierre.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>

            {/* Base inicial — modo ver / modo editar (solo se puede editar/crear si es hoy) */}
            <div style={{ marginBottom: 14 }}>
              {(esFechaHoy && (editandoBase || !resumenCierre.base_registrada)) ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#1a1a1a', marginBottom: 8 }}>Base inicial del día</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input-monto"
                      type="number" inputMode="numeric" placeholder="$0" value={baseInput} min="0" step="1" autoFocus
                      onChange={(e) => setBaseInput(e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                      onInput={(e) => { e.target.value = e.target.value.replace(/[.,]/g, ''); }}
                      onWheel={(e) => e.target.blur()}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '2px solid #e5e7eb', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}
                    />
                    <button onClick={guardarBase} disabled={guardandoBase} title="Guardar"
                      style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✓
                    </button>
                    {resumenCierre.base_registrada && (
                      <button onClick={cancelarEdicionBase} disabled={guardandoBase} title="Cancelar"
                        style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 8, background: '#f5f5f5', color: '#888', border: '1px solid #e5e7eb', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✕
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#1a1a1a' }}>Base inicial del día</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#1a1a1a' }}>
                      ${Number(resumenCierre.base_inicial).toLocaleString('es-CO')}
                    </div>
                    {esFechaHoy && (
                      <button className="btn-accion editar" onClick={abrirEdicionBase} title="Editar base inicial">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Gastos del día */}
            <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1a1a1a', marginBottom: 8 }}>Gastos del día</div>
              {(!resumenCierre.gastos || resumenCierre.gastos.length === 0) ? (
                <div style={{ color: '#aaa', fontSize: 12, marginBottom: 8 }}>{esFechaHoy ? 'Sin gastos registrados hoy' : 'Sin gastos registrados'}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8, maxHeight: 130, overflowY: 'auto' }}>
                  {resumenCierre.gastos.map((g) => (
                    <div key={g.id_gasto} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                      <span style={{ flex: 1, color: '#444', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        • {g.descripcion} <span style={{ color: '#aaa' }}>({TIPO_GASTO_INFO[g.tipo]?.label || g.tipo})</span>
                      </span>
                      <span style={{ fontWeight: 800, color: '#CA0B0B', whiteSpace: 'nowrap' }}>${Number(g.valor).toLocaleString('es-CO')}</span>
                      {esFechaHoy && (
                        <button onClick={() => eliminarGasto(g.id_gasto)} disabled={eliminandoGastoId === g.id_gasto}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CA0B0B', display: 'flex', alignItems: 'center', padding: 0 }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {esFechaHoy && (
                <button onClick={() => setModalGastoAbierto(true)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%', padding: '7px 0', borderRadius: 8, background: '#f5f5f5', border: '1px solid #e5e7eb', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#333' }}>
                  <Plus size={13} /> Agregar gasto
                </button>
              )}
            </div>

            {/* Totales + imprimir */}
            <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 14, marginTop: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, color: '#666', marginBottom: 4 }}>
                <span>Total gastos</span><span>${Number(resumenCierre.total_gastos).toLocaleString('es-CO')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#888' }}>Efectivo en Caja</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: resumenCierre.saldo_final >= 0 ? '#15803d' : '#CA0B0B' }}>
                  ${Number(resumenCierre.saldo_final || 0).toLocaleString('es-CO')}
                </span>
              </div>
              <button
                onClick={imprimirCierre}
                disabled={imprimiendoCierre}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px 0', borderRadius: 8, background: '#CA0B0B', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
              >
                <Printer size={14} /> {imprimiendoCierre ? 'Enviando...' : 'Imprimir cierre'}
              </button>
            </div>
          </div>
        )}

        {/* Productos más vendidos */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-titulo">Productos más vendidos</span>
          </div>
          <div className="productos-lista">
            {productosMasVendidos.length === 0 ? (
              <div style={{ color: '#aaa', fontSize: 13, padding: '8px 0' }}>Sin datos aún</div>
            ) : productosMasVendidos.map((p, i) => (
              <div key={p.nombre} className="producto-item">
                <div className="producto-rank">#{i + 1}</div>
                <div className="producto-info">
                  <div className="producto-nombre">{p.nombre}</div>
                  <div className="producto-barra-wrap">
                    <div className="producto-barra" style={{ width: `${p.porcentaje}%` }} />
                  </div>
                </div>
                <div className="producto-cantidad">{p.cantidad}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cards horario + toggle apertura */}
      <div className="dash-cards-horario">

        {/* Horario configurable */}
        <div className="stat-card" style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}
          onClick={() => !editandoHorario && setEditandoHorario(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <div className="stat-icono" style={{ background: '#1e3a5f18', color: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarClock size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="stat-titulo" style={{ marginBottom: 2 }}>Horario de atención</div>
              {!editandoHorario && (
                <div className="stat-valor" style={{ fontSize: 15 }}>
                  {horario.hora_apertura}:00 – {horario.hora_cierre}:00
                </div>
              )}
            </div>
          </div>
          {editandoHorario ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: '100%' }} onClick={e => e.stopPropagation()}>
              <label style={{ fontSize: 11, color: '#666', fontWeight: 700 }}>Abre</label>
              <input type="number" min={0} max={23} value={nuevoHorario.hora_apertura}
                onChange={e => setNuevoHorario(p => ({ ...p, hora_apertura: Number(e.target.value) }))}
                style={{ width: 44, padding: '2px 4px', borderRadius: 5, border: '2px solid #1e3a5f', fontSize: 14, fontWeight: 800, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }} />
              <label style={{ fontSize: 11, color: '#666', fontWeight: 700 }}>Cierra</label>
              <input type="number" min={0} max={23} value={nuevoHorario.hora_cierre}
                onChange={e => setNuevoHorario(p => ({ ...p, hora_cierre: Number(e.target.value) }))}
                style={{ width: 44, padding: '2px 4px', borderRadius: 5, border: '2px solid #1e3a5f', fontSize: 14, fontWeight: 800, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={async (e) => { e.stopPropagation(); try { const h = await api.setHorario(nuevoHorario); setHorario(h); setNuevoHorario({ hora_apertura: h.hora_apertura, hora_cierre: h.hora_cierre }); setEditandoHorario(false); toast.success('Horario actualizado correctamente'); } catch { toast.error('No se pudo guardar el horario'); } }}
                style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 700 }}>Guardar</button>
              <button onClick={(e) => { e.stopPropagation(); setEditandoHorario(false); setNuevoHorario({ hora_apertura: horario.hora_apertura, hora_cierre: horario.hora_cierre }); }}
                style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 5, padding: '2px 6px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Cancelar</button>
            </div>
          ) : (
            <div style={{ fontSize: 10, color: '#fff', background: '#1e3a5f', padding: '2px 10px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>✏ Editar horario</div>
          )}
        </div>

        {/* Toggle apertura manual */}
        <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <div className="stat-icono" style={{
              background: horario.estado_tienda === 'open' ? '#16a34a18' : horario.estado_tienda === 'closed' ? '#CA0B0B18' : '#f59e0b18',
              color:      horario.estado_tienda === 'open' ? '#16a34a'   : horario.estado_tienda === 'closed' ? '#CA0B0B'   : '#f59e0b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Power size={20} />
            </div>
            <div>
              <div className="stat-titulo" style={{ marginBottom: 2 }}>Estado de la tienda</div>
              <div className="stat-valor" style={{ fontSize: 14,
                color: horario.estado_tienda === 'open' ? '#16a34a' : horario.estado_tienda === 'closed' ? '#CA0B0B' : '#f59e0b' }}>
                {horario.estado_tienda === 'open' ? 'Abierta ahora' : horario.estado_tienda === 'closed' ? 'Cerrada temporalmente' : 'Siguiendo horario'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            {[
              { key: 'open',     label: 'Forzar abierta', color: '#16a34a' },
              { key: 'schedule', label: 'Por horario',     color: '#f59e0b' },
              { key: 'closed',   label: 'Cerrar ahora',   color: '#CA0B0B' },
            ].map(({ key, label, color }) => (
              <button key={key} onClick={async () => {
                try {
                  const h = await api.setHorario({ estado_tienda: key });
                  setHorario(prev => ({ ...prev, ...h }));
                } catch { toast.error('No se pudo cambiar el estado de la tienda'); }
              }} style={{
                flex: 1, padding: '6px 4px', fontSize: 11, fontWeight: 700, border: 'none', borderRadius: 8,
                cursor: 'pointer', fontFamily: 'inherit',
                background: horario.estado_tienda === key ? color : '#f5f5f5',
                color: horario.estado_tienda === key ? '#fff' : '#888',
                transition: 'all .15s',
              }}>{label}</button>
            ))}
          </div>
        </div>

      </div>

      {/* Fila — Domiciliarios del día */}
      <div className="dash-fila-media">
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-titulo">Domiciliarios del día</span>
          </div>
          {domiciliarios.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: 13, padding: '8px 0' }}>Sin entregas registradas hoy</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    {['Domiciliario','Entregas','Efectivo','Transferencia','Total','Total envíos'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#888', fontWeight: 700, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {domiciliarios.map((d) => (
                    <tr key={d.nombre} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{d.nombre}</td>
                      <td style={{ padding: '10px 12px', color: '#3b82f6', fontWeight: 700 }}>{d.entregas}</td>
                      <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>${Number(d.efectivo).toLocaleString('es-CO')}</td>
                      <td style={{ padding: '10px 12px', color: '#7c3aed', fontWeight: 700 }}>${Number(d.transferencia).toLocaleString('es-CO')}</td>
                      <td style={{ padding: '10px 12px', color: '#CA0B0B', fontWeight: 800 }}>${Number(d.total).toLocaleString('es-CO')}</td>
                      <td style={{ padding: '10px 12px', color: '#0369a1', fontWeight: 700 }}>${Number(d.total_domicilios || 0).toLocaleString('es-CO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {resumenResenas && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #f0f0f0', marginTop: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a', margin: 0, display:'flex', alignItems:'center', gap:6 }}><Star size={15} color="#f59e0b"/>Reseñas de clientes</h3>
            <button onClick={() => navigate('/admin/resenas')} style={{ padding: '6px 14px', borderRadius: 8, background: '#CA0B0B', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
              Ver todas
            </button>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total reseñas', valor: resumenResenas.total, color: '#3b82f6' },
              { label: 'Prom. atención', valor: `${resumenResenas.promAtencion}★`, color: '#f59e0b' },
              { label: 'Prom. producto', valor: `${resumenResenas.promProducto}★`, color: '#CA0B0B' },
            ].map(({ label, valor, color }) => (
              <div key={label} style={{ flex: 1, minWidth: 120, background: '#fafafa', borderRadius: 10, padding: '12px 16px', border: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 800, fontSize: 22, color }}>{valor}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </AdminLayout>
  );
}