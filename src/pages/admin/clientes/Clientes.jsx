import { Search } from 'lucide-react';
import { toast } from '../../../utils/toast';
import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import './Clientes.css';
import * as api from '../../../services/api';
import { contieneEtiquetaHtml, MSG_HTML } from '../../../utils/validarSinHtml';

const POR_PAGINA = 10;

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

function ModalFormulario({ open, onClose, onGuardar, clienteEditar, procesando = false }) {
  const [nombre,       setNombre]       = useState(clienteEditar?.nombre   || '');
  const [email,        setEmail]        = useState(clienteEditar?.usuario?.email || clienteEditar?.email || '');
  const [contrasena,   setContrasena]   = useState('');
  const [confirmarPass,setConfirmarPass]= useState('');
  const [telefono,     setTelefono]     = useState(clienteEditar?.telefono || '');
  const [errores,      setErrores]      = useState({});

  if (!open) return null;

  const validar = () => {
    const e = {};
    if (!nombre.trim())  e.nombre  = 'El nombre es requerido';
    else if (contieneEtiquetaHtml(nombre)) e.nombre = MSG_HTML;
    if (!email.trim())   e.email   = 'El email es requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email no válido';
    if (!clienteEditar) {
      if (!contrasena)                  e.contrasena    = 'La contraseña es requerida';
      else if (contrasena.length < 8)   e.contrasena    = 'Mínimo 8 caracteres';
      if (contrasena !== confirmarPass) e.confirmarPass = 'Las contraseñas no coinciden';
    }
    return e;
  };

  const guardar = async () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErrores(e); return; }
    try {
      await onGuardar({ nombre: nombre.trim(), email: email.trim(), contrasena, telefono: telefono.trim() });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al guardar. Inténtalo de nuevo.';
      if (msg.toLowerCase().includes('email')) setErrores((p) => ({ ...p, email: msg }));
      else setErrores((p) => ({ ...p, _general: msg }));
    }
  };

  const campo = (placeholder, value, onChange, errorKey, type = 'text') => (
    <div className="form-grupo">
      <input
        className={`form-input${errores[errorKey] ? ' input-error' : ''}`}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setErrores((p) => ({ ...p, [errorKey]: '' })); }}
      />
      {errores[errorKey] && <span className="form-error">{errores[errorKey]}</span>}
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-caja" style={{ width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-encabezado">
          <span className="modal-titulo">{clienteEditar ? 'Editar cliente' : 'Nuevo cliente'}</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>

        <span className="form-seccion-titulo">Cuenta</span>
        <div className="form-fila">
          {campo('Nombre completo',     nombre,    setNombre,    'nombre')}
          {campo('Correo electrónico',  email,     setEmail,     'email', 'email')}
        </div>

        {!clienteEditar && (
          <div className="form-fila">
            {campo('Contraseña (mín. 8 caracteres)', contrasena,    setContrasena,    'contrasena',    'password')}
            {campo('Confirmar contraseña',           confirmarPass, setConfirmarPass, 'confirmarPass', 'password')}
          </div>
        )}

        {campo('Teléfono (opcional)', telefono, setTelefono, 'telefono', 'tel')}

        {errores._general && <p className="error-general">{errores._general}</p>}
        <div className="modal-pie">
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          {clienteEditar
            ? <button className="btn-editar-modal" onClick={guardar} disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar cambios'}</button>
            : <button className="btn-primario"     onClick={guardar} disabled={procesando}>{procesando ? 'Guardando...' : 'Crear cliente'}</button>
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
        <p className="modal-texto-confirmar">
          ¿Eliminar al cliente <strong>"{nombre}"</strong>?<br />Esta acción no se puede deshacer.
        </p>
        <div className="modal-pie centrado" style={{ marginTop: 24 }}>
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button className="btn-peligro"    onClick={onConfirmar} disabled={procesando}>{procesando ? 'Eliminando...' : 'Sí, eliminar'}</button>
        </div>
      </div>
    </div>
  );
}

function ModalDetalle({ clienteDetalle, onClose }) {
  if (!clienteDetalle) return null;

  const cargando = !!clienteDetalle.cargando;
  const c        = cargando ? {} : clienteDetalle;
  const u        = c.usuario || {};
  const puntos = c.puntos?.puntos ?? 0;
  const dirs   = c.direcciones || [];
  const ventas = c.ventas || [];

  const secLabel = { fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: 1, marginBottom: 10, marginTop: 16 };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', position: 'relative' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a' }}>Detalle de cliente</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {cargando ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 13 }}>Cargando...</div>
          ) : (
            <>
              {/* Info personal + Puntos en 2 columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Col izquierda */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: 1, marginBottom: 10 }}>INFO PERSONAL</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', marginBottom: 6 }}>{u.nombre || c.nombre || '—'}</div>
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{u.email || '—'}</div>
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>📞 {c.telefono || '—'}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>
                    Desde {u.fecha_registro ? new Date(u.fecha_registro).toLocaleDateString('es-CO') : '—'}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: u.estado ? '#f0fdf4' : '#fff5f5', color: u.estado ? '#16a34a' : '#CA0B0B' }}>
                    {u.estado ? '● Activo' : '● Inactivo'}
                  </span>
                </div>
                {/* Col derecha — Puntos */}
                <div style={{ background: '#fff5f5', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: 1, marginBottom: 10 }}>PUNTOS CHOCOFRESEO</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#CA0B0B', lineHeight: 1 }}>{puntos}</div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>puntos</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>${(puntos * 12.5).toLocaleString('es-CO')}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>saldo disponible</div>
                </div>
              </div>

              {/* Direcciones */}
              <div style={secLabel}>DIRECCIONES</div>
              {dirs.length === 0 ? (
                <div style={{ fontSize: 13, color: '#aaa' }}>Sin direcciones registradas</div>
              ) : (
                dirs.map((dir, i) => (
                  <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{dir.direccion_linea}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {[dir.barrio, dir.ciudad, dir.departamento].filter(Boolean).join(', ')}
                    </div>
                    {dir.referencia && (
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Ref: {dir.referencia}</div>
                    )}
                  </div>
                ))
              )}

              {/* Historial de pedidos */}
              <div style={secLabel}>ÚLTIMOS PEDIDOS</div>
              {ventas.length === 0 ? (
                <div style={{ fontSize: 13, color: '#aaa' }}>Sin pedidos registrados</div>
              ) : (
                ventas.map((v) => (
                  <div key={v.id_venta} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>#{v.id_venta}</span>
                      <span style={{ fontSize: 11, marginLeft: 8, color: '#888' }}>
                        {new Date(v.fecha || v.createdAt).toLocaleDateString('es-CO')}
                      </span>
                      {v.estado?.nombre_estado === 'anulado' && v.motivo_anulacion && (
                        <div style={{ fontSize: 11, color: '#CA0B0B', marginTop: 3, fontStyle: 'italic' }}>
                          Motivo: {v.motivo_anulacion}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: v.estado?.nombre_estado === 'entregado' ? '#dcfce7' : v.estado?.nombre_estado === 'anulado' ? '#fee2e2' : '#f0f0f0',
                        color:      v.estado?.nombre_estado === 'entregado' ? '#166534' : v.estado?.nombre_estado === 'anulado' ? '#CA0B0B' : '#555',
                      }}>
                        {v.estado?.nombre_estado || '—'}
                      </span>
                      <span style={{ fontWeight: 700, color: '#CA0B0B' }}>
                        ${Number(v.total || 0).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-detalle" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default function Clientes() {
  const [lista,        setLista]        = useState([]);
  const [busqueda,     setBusqueda]     = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [pagina,       setPagina]       = useState(1);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [eliminando,   setEliminando]   = useState(null);
  const [clienteDetalle, setClienteDetalle] = useState(null);
  const [procesando,   setProcesando]   = useState(false);

  useEffect(() => {
    api.listarClientes()
      .then((data) => setLista(data.map((c) => ({ ...c, nombre: c.usuario?.nombre || c.nombre }))))
      .catch((err) => console.error('Error cargando clientes:', err));
  }, []);

  useEffect(() => { setPagina(1); }, [busqueda, filtroEstado]);

  const filtrados = lista.filter((c) => {
    const q = busqueda.trim().toLowerCase();
    const coincideBusqueda =
      (c.usuario?.nombre || c.nombre || '').toLowerCase().includes(q) ||
      (c.usuario?.email  || '').toLowerCase().includes(q) ||
      (c.telefono || '').includes(busqueda.trim());
    const estado = c.usuario?.estado;
    const coincideEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'activos'   && estado === 1) ||
      (filtroEstado === 'inactivos' && estado !== 1);
    return coincideBusqueda && coincideEstado;
  });

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const toggle = async (c) => {
    const nuevoEstado = c.usuario?.estado ? 0 : 1;
    try {
      await api.estadoCliente(c.id_cliente, { estado: nuevoEstado });
      setLista((p) => p.map((x) =>
        x.id_cliente === c.id_cliente
          ? { ...x, usuario: { ...x.usuario, estado: nuevoEstado } }
          : x
      ));
    } catch (err) { console.error('Error cambiando estado cliente:', err); }
  };

  const crear = async (f) => {
    if (procesando) return; setProcesando(true);
    try {
      const nuevo = await api.crearCliente({ nombre: f.nombre, email: f.email, contrasena: f.contrasena, ...(f.telefono ? { telefono: f.telefono } : {}) });
      setLista((p) => [...p, { ...nuevo, nombre: nuevo.usuario?.nombre || nuevo.nombre || f.nombre }]);
      setModalAbierto(false);
    } catch (err) { throw err; }
    finally { setProcesando(false); }
  };

  const editar = async (f) => {
    if (procesando) return; setProcesando(true);
    try {
      const actualizado = await api.actualizarCliente(editando.id_cliente, { nombre: f.nombre, email: f.email, telefono: f.telefono });
      setLista((p) => p.map((c) => c.id_cliente === editando.id_cliente ? { ...c, ...actualizado, nombre: actualizado.usuario?.nombre || actualizado.nombre || c.nombre } : c));
      setEditando(null);
    } catch (err) { throw err; }
    finally { setProcesando(false); }
  };

  const eliminar = async () => {
    if (procesando) return; setProcesando(true);
    try {
      await api.eliminarCliente(eliminando.id_cliente);
      setLista((p) => p.filter((c) => c.id_cliente !== eliminando.id_cliente));
      setEliminando(null);
    } catch (err) {
      setEliminando(null);
      toast.error(err?.response?.data?.message || 'No se pudo eliminar el cliente');
    } finally { setProcesando(false); }
  };

  const verDetalle = async (cliente) => {
    setClienteDetalle({ cargando: true });
    try {
      const detalle = await api.obtenerClienteDetalle(cliente.id_cliente);
      setClienteDetalle(detalle);
    } catch {
      setClienteDetalle(null);
    }
  };

  const chipEstado = [
    { key: 'todos',     label: 'Todos' },
    { key: 'activos',   label: 'Activos' },
    { key: 'inactivos', label: 'Inactivos' },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Clientes</h1>
          <p className="page-subtitulo">{lista.length} {lista.length === 1 ? 'cliente registrado' : 'clientes registrados'}</p>
        </div>
        <button className="btn-primario" onClick={() => setModalAbierto(true)}>+ Añadir cliente</button>
      </div>

      <div className="buscador">
        <Search size={14} color="#aaa" />
        <input
          placeholder="Buscar por nombre, email o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {chipEstado.map((c) => (
          <button
            key={c.key}
            onClick={() => setFiltroEstado(c.key)}
            style={{
              padding: '5px 14px', borderRadius: 20, border: filtroEstado === c.key ? 'none' : '1px solid #e0e0e0',
              background: filtroEstado === c.key ? '#CA0B0B' : '#f5f5f5',
              color: filtroEstado === c.key ? '#fff' : '#555',
              fontWeight: filtroEstado === c.key ? 700 : 400, fontSize: 13, cursor: 'pointer',
            }}
          >{c.label}</button>
        ))}
      </div>

      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th style={{ textAlign: 'center' }}>Pedidos</th>
              <th style={{ textAlign: 'center' }}>Puntos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.length === 0 ? (
              <tr><td colSpan={7}><div className="tabla-vacia">No se encontraron clientes</div></td></tr>
            ) : (
              paginados.map((c) => (
                <tr key={c.id_cliente}>
                  <td style={{ textTransform: 'capitalize' }}>{c.nombre}</td>
                  <td style={{ fontSize: 13, color: '#555' }}>{c.usuario?.email || '—'}</td>
                  <td style={{ fontSize: 13, color: '#555' }}>{c.telefono || '—'}</td>
                  <td style={{ fontSize: 13, color: '#555', textAlign: 'center' }}>{c._count?.ventas || 0} pedidos</td>
                  <td style={{ fontSize: 13, color: '#555', textAlign: 'center' }}>{c.puntos?.puntos || 0} pts</td>
                  <td><Toggle activo={c.usuario?.estado === 1} onChange={() => toggle(c)} /></td>
                  <td>
                    <div className="acciones">
                      <button className="btn-accion ver" onClick={() => verDetalle(c)} title="Ver detalle">
                        <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button className="btn-accion editar" onClick={() => setEditando({ ...c })} title="Editar">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn-accion eliminar" onClick={() => setEliminando({ ...c })} title="Eliminar">
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

      {modalAbierto && (
        <ModalFormulario key="nuevo" open={true} onClose={() => setModalAbierto(false)} onGuardar={crear} clienteEditar={null} procesando={procesando} />
      )}
      {editando && (
        <ModalFormulario key={`editar-${editando.id_cliente}`} open={true} onClose={() => setEditando(null)} onGuardar={editar} clienteEditar={editando} procesando={procesando} />
      )}
      {eliminando && (
        <ModalEliminar open={true} onClose={() => setEliminando(null)} onConfirmar={eliminar} nombre={eliminando?.nombre} procesando={procesando} />
      )}
      {clienteDetalle && (
        <ModalDetalle clienteDetalle={clienteDetalle} onClose={() => setClienteDetalle(null)} />
      )}
    </AdminLayout>
  );
}

