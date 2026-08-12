import { Search } from 'lucide-react';
import { toast } from '../../../utils/toast';
import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import * as api from '../../../services/api';
import './Empleados.css';

const POR_PAGINA = 5;
const CARGOS_FORM = ['Domiciliario', 'Cocinero', 'Confirmador'];

const fmtFecha = (f) => {
  if (!f) return '—';
  try {
    const d = typeof f === 'string' && !f.includes('T') ? new Date(f + 'T12:00:00') : new Date(f);
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch { return f; }
};

const mapEmpleado = (e) => ({
  ...e,
  nombre:        e.usuario?.nombre || e.nombre || '—',
  email:         e.usuario?.email  || e.email  || '—',
  fecha_ingreso: e.fecha_ingreso ? e.fecha_ingreso.split('T')[0] : '',
});

function Toggle({ activo, onChange }) {
  return (
    <div
      className="toggle-wrap"
      style={{ background: activo ? '#22c55e' : '#9ca3af' }}
      onClick={onChange}
      title={activo ? 'Activo' : 'Inactivo'}
    >
      <div className="toggle-circulo" style={{ left: activo ? 23 : 3 }}></div>
    </div>
  );
}

function ModalFormulario({ open, onClose, onGuardar, empleadoEditar, procesando = false }) {
  const [nombre,        setNombre]        = useState(empleadoEditar?.nombre        || '');
  const [email,         setEmail]         = useState(empleadoEditar?.email         || '');
  const [contrasena,    setContrasena]    = useState('');
  const [confirmarPass, setConfirmarPass] = useState('');
  // Sin default silencioso: si no se elige un cargo explícitamente, "guardar"
  // debe bloquear el envío en vez de crear el empleado con el primer cargo
  // de la lista (Domiciliario) sin que el admin se dé cuenta.
  const [cargo,         setCargo]         = useState(empleadoEditar?.cargo         || '');
  const [fechaIngreso,  setFechaIngreso]  = useState(empleadoEditar?.fecha_ingreso || '');
  const [estado,        setEstado]        = useState(empleadoEditar?.estado        ?? 1);
  const [errores,       setErrores]       = useState({});

  if (!open) return null;

  const validar = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = 'El nombre es requerido';
    if (!email.trim())  e.email  = 'El email es requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email no válido';
    if (!empleadoEditar) {
      if (!contrasena)                  e.contrasena    = 'La contraseña es requerida';
      else if (contrasena.length < 8)   e.contrasena    = 'Mínimo 8 caracteres';
      if (contrasena !== confirmarPass) e.confirmarPass = 'Las contraseñas no coinciden';
    }
    if (!fechaIngreso) e.fechaIngreso = 'La fecha de ingreso es requerida';
    if (!cargo) e.cargo = 'Selecciona el cargo';
    return e;
  };

  const guardar = async () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErrores(e); return; }
    try {
      await onGuardar({ nombre: nombre.trim(), email: email.trim(), contrasena, cargo, fecha_ingreso: fechaIngreso, estado: empleadoEditar ? estado : 1 });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al guardar. Inténtalo de nuevo.';
      if (msg.toLowerCase().includes('email')) setErrores((p) => ({ ...p, email: msg }));
      else setErrores((p) => ({ ...p, _general: msg }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-caja" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-encabezado">
          <span className="modal-titulo">{empleadoEditar ? 'Editar empleado' : 'Nuevo empleado'}</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>

        <span className="form-seccion-titulo">Cuenta</span>
        <div className="form-fila">
          <div className="form-grupo">
            <input className={`form-input${errores.nombre ? ' input-error' : ''}`} placeholder="Nombre completo" value={nombre}
              onChange={(e) => { setNombre(e.target.value); setErrores((p) => ({ ...p, nombre: '' })); }} />
            {errores.nombre && <span className="form-error">{errores.nombre}</span>}
          </div>
          <div className="form-grupo">
            <input className={`form-input${errores.email ? ' input-error' : ''}`} type="email" placeholder="Correo electrónico" value={email}
              onChange={(e) => { setEmail(e.target.value); setErrores((p) => ({ ...p, email: '' })); }} />
            {errores.email && <span className="form-error">{errores.email}</span>}
          </div>
        </div>

        {!empleadoEditar && (
          <div className="form-fila">
            <div className="form-grupo">
              <input className={`form-input${errores.contrasena ? ' input-error' : ''}`} type="password" placeholder="Contraseña (mín. 8 caracteres)" value={contrasena}
                onChange={(e) => { setContrasena(e.target.value); setErrores((p) => ({ ...p, contrasena: '' })); }} />
              {errores.contrasena && <span className="form-error">{errores.contrasena}</span>}
            </div>
            <div className="form-grupo">
              <input className={`form-input${errores.confirmarPass ? ' input-error' : ''}`} type="password" placeholder="Confirmar contraseña" value={confirmarPass}
                onChange={(e) => { setConfirmarPass(e.target.value); setErrores((p) => ({ ...p, confirmarPass: '' })); }} />
              {errores.confirmarPass && <span className="form-error">{errores.confirmarPass}</span>}
            </div>
          </div>
        )}

        <span className="form-seccion-titulo">Información laboral</span>
        <div className="form-fila">
          <div className="form-grupo">
            <select
              className={`form-input${errores.cargo ? ' input-error' : ''}`}
              value={cargo}
              onChange={(e) => { setCargo(e.target.value); setErrores((p) => ({ ...p, cargo: '' })); }}
            >
              <option value="" disabled>Selecciona un cargo…</option>
              {CARGOS_FORM.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errores.cargo && <span className="form-error">{errores.cargo}</span>}
          </div>
          <div className="form-grupo">
            <input className={`form-input${errores.fechaIngreso ? ' input-error' : ''}`} type="date" value={fechaIngreso}
              onChange={(e) => { setFechaIngreso(e.target.value); setErrores((p) => ({ ...p, fechaIngreso: '' })); }} />
            {errores.fechaIngreso && <span className="form-error">{errores.fechaIngreso}</span>}
          </div>
        </div>

        {empleadoEditar && (
          <div className="form-grupo">
            <div className="form-estado">
              <Toggle activo={estado === 1} onChange={() => setEstado(estado === 1 ? 0 : 1)} />
              <span className="form-estado-texto" style={{ color: estado ? '#22c55e' : '#CA0B0B' }}>
                {estado ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        )}

        {errores._general && <p className="error-general">{errores._general}</p>}
        <div className="modal-pie">
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          {empleadoEditar
            ? <button className="btn-editar-modal" onClick={guardar} disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar cambios'}</button>
            : <button className="btn-primario"     onClick={guardar} disabled={procesando}>{procesando ? 'Guardando...' : 'Crear empleado'}</button>
          }
        </div>
      </div>
    </div>
  );
}

function ModalEliminar({ open, onClose, onConfirmar, nombre, procesando = false }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-caja modal-pequeno">
        <div className="modal-icono-grande">🗑️</div>
        <p className="modal-texto-confirmar">¿Eliminar al empleado <strong>"{nombre}"</strong>?<br />Esta acción no se puede deshacer.</p>
        <div className="modal-pie centrado" style={{ marginTop: 24 }}>
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button className="btn-peligro"    onClick={onConfirmar} disabled={procesando}>{procesando ? 'Eliminando...' : 'Sí, eliminar'}</button>
        </div>
      </div>
    </div>
  );
}

function ModalDetalle({ open, onClose, empleado }) {
  if (!open || !empleado) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-caja" style={{ width: 520 }}>
        <div className="modal-encabezado">
          <span className="modal-titulo">Detalle de empleado</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>
        <div className="detalle-grid">
          <div className="detalle-item">
            <span className="detalle-label">Estado</span>
            <span className="detalle-badge" style={{ background: empleado.estado ? '#f0fdf4' : '#fff5f5', color: empleado.estado ? '#22c55e' : '#CA0B0B' }}>
              {empleado.estado ? '● Activo' : '● Inactivo'}
            </span>
          </div>
          <div className="detalle-item">
            <span className="detalle-label">Cargo</span>
            <span style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
              background: empleado.cargo?.toLowerCase().includes('domiciliario') ? '#eff6ff' :
                          empleado.cargo?.toLowerCase().includes('cocinero')    ? '#fff7ed' :
                          empleado.cargo?.toLowerCase().includes('confirmador') ? '#f5f3ff' : '#fff5f5',
              color:      empleado.cargo?.toLowerCase().includes('domiciliario') ? '#2563eb' :
                          empleado.cargo?.toLowerCase().includes('cocinero')    ? '#f97316' :
                          empleado.cargo?.toLowerCase().includes('confirmador') ? '#7c3aed' : '#CA0B0B',
            }}>{empleado.cargo}</span>
          </div>
          <div className="detalle-item">
            <span className="detalle-label">Rol</span>
            <span className="detalle-valor">{empleado.usuario?.rol?.nombre || '—'}</span>
          </div>
          <div className="detalle-item detalle-full">
            <span className="detalle-label">Nombre</span>
            <span className="detalle-valor">{empleado.nombre}</span>
          </div>
          <div className="detalle-item detalle-full">
            <span className="detalle-label">Correo electrónico</span>
            <span className="detalle-valor">{empleado.email}</span>
          </div>
          <div className="detalle-item">
            <span className="detalle-label">Fecha de ingreso</span>
            <span className="detalle-valor">{fmtFecha(empleado.fecha_ingreso)}</span>
          </div>
          <div className="detalle-item">
            <span className="detalle-label">Registrado desde</span>
            <span className="detalle-valor">{fmtFecha(empleado.usuario?.fecha_registro)}</span>
          </div>
        </div>
        <div className="modal-pie">
          <button className="btn-detalle" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default function Empleados() {
  const [lista,        setLista]        = useState([]);
  const [busqueda,     setBusqueda]     = useState('');
  const [filtroCargo,  setFiltroCargo]  = useState('todos');
  const [pagina,       setPagina]       = useState(1);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [eliminando,   setEliminando]   = useState(null);
  const [detalle,      setDetalle]      = useState(null);
  const [procesando,   setProcesando]   = useState(false);
  const [cargando,     setCargando]     = useState(true);

  const cargar = () => api.listarEmpleados().then((d) => { setLista(d.map(mapEmpleado)); setCargando(false); }).catch(() => setCargando(false));
  useEffect(() => { cargar(); }, []);
  useEffect(() => { setPagina(1); }, [busqueda, filtroCargo]);

  // Solo cargos válidos que existen en la lista
  const cargosUnicos = [...new Set(lista.map((e) => e.cargo).filter((c) => c && CARGOS_FORM.includes(c)))];
  const usarFiltroEstado = cargosUnicos.length === 0;

  const filtrados = lista.filter((e) => {
    const q = busqueda.trim().toLowerCase();
    const coincideBusqueda = (e.nombre || '').toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q);
    let coincideFiltro;
    if (usarFiltroEstado) {
      coincideFiltro = filtroCargo === 'todos'
        || (filtroCargo === 'activos'   && e.estado === 1)
        || (filtroCargo === 'inactivos' && e.estado !== 1);
    } else {
      coincideFiltro = filtroCargo === 'todos' || e.cargo === filtroCargo;
    }
    return coincideBusqueda && coincideFiltro;
  });

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const crear    = async (f) => { if (procesando) return; setProcesando(true); try { await api.crearEmpleado(f); cargar(); setModalAbierto(false); } catch (err) { throw err; } finally { setProcesando(false); } };
  const editar   = async (f) => { if (procesando) return; setProcesando(true); try { await api.actualizarEmpleado(editando.id_empleado, f); cargar(); setEditando(null); } catch (err) { throw err; } finally { setProcesando(false); } };
  const eliminar = async () => {
    if (procesando) return; setProcesando(true);
    try { await api.eliminarEmpleado(eliminando.id_empleado); setLista((p) => p.filter((e) => e.id_empleado !== eliminando.id_empleado)); }
    catch (err) { toast.error(err?.response?.data?.message || 'Error al eliminar'); }
    finally { setProcesando(false); setEliminando(null); }
  };
  const toggle = async (id, estadoActual) => { await api.estadoEmpleado(id, { estado: estadoActual ? 0 : 1 }).catch(() => {}); cargar(); };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Empleados</h1>
          <p className="page-subtitulo">{lista.length} empleados registrados</p>
        </div>
        <button className="btn-primario" onClick={() => setModalAbierto(true)}>+ Añadir empleado</button>
      </div>

      <div className="buscador">
        <Search size={14} color="#aaa" />
        <input placeholder="Buscar por nombre o email..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', minHeight: 30 }}>
        {cargando ? null : usarFiltroEstado
          ? [{ key: 'todos', label: 'Todos' }, { key: 'activos', label: 'Activos' }, { key: 'inactivos', label: 'Inactivos' }].map((c) => (
              <button key={c.key} onClick={() => setFiltroCargo(c.key)} style={{
                padding: '5px 14px', borderRadius: 20, border: filtroCargo === c.key ? 'none' : '1px solid #e0e0e0',
                background: filtroCargo === c.key ? '#CA0B0B' : '#f5f5f5',
                color: filtroCargo === c.key ? '#fff' : '#555',
                fontWeight: filtroCargo === c.key ? 700 : 400, fontSize: 13, cursor: 'pointer',
              }}>{c.label}</button>
            ))
          : ['todos', ...cargosUnicos].map((c) => (
              <button key={c} onClick={() => setFiltroCargo(c)} style={{
                padding: '5px 14px', borderRadius: 20, border: filtroCargo === c ? 'none' : '1px solid #e0e0e0',
                background: filtroCargo === c ? '#CA0B0B' : '#f5f5f5',
                color: filtroCargo === c ? '#fff' : '#555',
                fontWeight: filtroCargo === c ? 700 : 400, fontSize: 13, cursor: 'pointer',
              }}>{c === 'todos' ? 'Todos' : c}</button>
            ))
        }
      </div>

      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Cargo</th>
              <th>Fecha ingreso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.length === 0 ? (
              <tr><td colSpan={6}><div className="tabla-vacia">No se encontraron empleados</div></td></tr>
            ) : (
              paginados.map((e) => (
                <tr key={e.id_empleado}>
                  <td style={{ textTransform: 'capitalize' }}>{e.nombre}</td>
                  <td className="td-suave">{e.email}</td>
                  <td>
                    <span style={{ background: '#fff5f5', color: '#CA0B0B', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid #f5c6c6' }}>{e.cargo}</span>
                  </td>
                  <td className="td-suave">{fmtFecha(e.fecha_ingreso)}</td>
                  <td><Toggle activo={e.estado === 1} onChange={() => toggle(e.id_empleado, e.estado)} /></td>
                  <td>
                    <div className="acciones">
                      <button className="btn-accion ver" onClick={() => setDetalle({ ...e })} title="Ver detalle">
                        <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button className="btn-accion editar" onClick={() => setEditando({ ...e })} title="Editar">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn-accion eliminar" onClick={() => setEliminando({ ...e })} title="Eliminar">
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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

      {modalAbierto && <ModalFormulario key="nuevo" open={true} onClose={() => setModalAbierto(false)} onGuardar={crear} empleadoEditar={null} procesando={procesando} />}
      {editando    && <ModalFormulario key={`editar-${editando.id_empleado}`} open={true} onClose={() => setEditando(null)} onGuardar={editar} empleadoEditar={editando} procesando={procesando} />}
      {eliminando  && <ModalEliminar  open={true} onClose={() => setEliminando(null)} onConfirmar={eliminar} nombre={eliminando?.nombre} procesando={procesando} />}
      {detalle     && <ModalDetalle   open={true} onClose={() => setDetalle(null)} empleado={lista.find((e) => e.id_empleado === detalle.id_empleado)} />}
    </AdminLayout>
  );
}

