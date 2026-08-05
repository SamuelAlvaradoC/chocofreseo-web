import { Search } from 'lucide-react';
import { toast } from '../../../utils/toast';
import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import './Roles.css';
import * as api from '../../../services/api';



function Toggle({ activo, onChange }) {
  return (
    <div
      className="toggle-wrap"
      style={{ background: activo ? '#22c55e' : '#CA0B0B' }}
      onClick={onChange}
      title={activo ? 'Activo' : 'Inactivo'}
    >
      <div className="toggle-circulo" style={{ left: activo ? 23 : 3 }} />
    </div>
  );
}

function ModalFormulario({ open, onClose, onGuardar, rolEditar }) {
  const [nombre,      setNombre]      = useState(rolEditar?.nombre      || '');
  const [descripcion, setDescripcion] = useState(rolEditar?.descripcion || '');
  const [estado,      setEstado]      = useState(rolEditar?.estado      ?? 1);
  const [errores,     setErrores]     = useState({});

  if (!open) return null;

  const guardar = async () => {
    if (!nombre.trim()) { setErrores({ nombre: 'El nombre es requerido' }); return; }
    try {
      await onGuardar({ nombre: nombre.trim(), descripcion, estado: rolEditar ? estado : 1 });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al guardar. Inténtalo de nuevo.';
      if (msg.toLowerCase().includes('nombre')) setErrores((p) => ({ ...p, nombre: msg }));
      else setErrores((p) => ({ ...p, _general: msg }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-caja">
        <div className="modal-encabezado">
          <span className="modal-titulo">{rolEditar ? 'Editar rol' : 'Nuevo rol'}</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>
        <div className="form-grupo">
          <input className={`form-input${errores.nombre ? ' input-error' : ''}`} placeholder="Nombre del rol" value={nombre}
            onChange={(e) => { setNombre(e.target.value); setErrores((p) => ({ ...p, nombre: '' })); }} />
          {errores.nombre && <span className="form-error">{errores.nombre}</span>}
        </div>
        <div className="form-grupo">
          <input className="form-input" placeholder="Descripción del rol" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
        {rolEditar && (
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
          {rolEditar
            ? <button className="btn-editar-modal" onClick={guardar}>Guardar cambios</button>
            : <button className="btn-primario"     onClick={guardar}>Crear rol</button>
          }
        </div>
      </div>
    </div>
  );
}

function ModalEliminar({ open, onClose, onConfirmar, nombre }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-caja modal-pequeno">
        <div className="modal-icono-grande">🗑️</div>
        <p className="modal-texto-confirmar">
          ¿Eliminar el rol <strong>"{nombre}"</strong>?<br />Esta acción no se puede deshacer.
        </p>
        <div className="modal-pie centrado" style={{ marginTop: 24 }}>
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button className="btn-peligro"    onClick={onConfirmar}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  );
}

function ModalDetalle({ open, onClose, rol, permisosDisponibles = [] }) {
  if (!open || !rol) return null;
  const permisosRol = permisosDisponibles.filter((p) => rol.permisos.includes(p.id_permiso));
  return (
    <div className="modal-overlay">
      <div className="modal-caja" style={{ width: 520 }}>
        <div className="modal-encabezado">
          <span className="modal-titulo">Detalle de rol</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>
        <div className="detalle-grid">
          <div className="detalle-item">
            <span className="detalle-label">Nombre</span>
            <span className="detalle-valor">{rol.nombre}</span>
          </div>
          <div className="detalle-item">
            <span className="detalle-label">Estado</span>
            <span className="detalle-badge" style={{
              background: rol.estado ? '#f0fdf4' : '#fff5f5',
              color:      rol.estado ? '#22c55e' : '#CA0B0B',
            }}>
              {rol.estado ? '● Activo' : '● Inactivo'}
            </span>
          </div>
          <div className="detalle-item detalle-full">
            <span className="detalle-label">Descripción</span>
            <span className="detalle-valor">{rol.descripcion || '—'}</span>
          </div>
          <div className="detalle-item detalle-full">
            <span className="detalle-label">Permisos asignados ({permisosRol.length})</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {permisosRol.length === 0
                ? <span style={{ fontSize: 13, color: '#999' }}>Sin permisos asignados</span>
                : permisosRol.map((p) => (
                    <span key={p.id_permiso} style={{
                      background: '#f5f5f5', color: '#333',
                      padding: '3px 10px', borderRadius: 20,
                      fontSize: 12, fontWeight: 700, border: '1px solid #e0e0e0',
                    }}>{p.nombre}</span>
                  ))
              }
            </div>
          </div>
        </div>
        <div className="modal-pie">
          <button className="btn-detalle" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

const labelPermiso = {
  'ver_dashboard':            'Ver dashboard y estadísticas',
  'ver_ventas':               'Ver ventas',
  'gestionar_ventas':         'Crear ventas',
  'cambiar_estado_venta':     'Cambiar estado de venta',
  'anular_venta':             'Anular ventas',
  'confirmar_domicilios':     'Confirmar/rechazar pedidos',
  'gestionar_productos':      'Gestionar productos',
  'gestionar_categorias':     'Gestionar categorías',
  'gestionar_toppings':       'Gestionar toppings',
  'gestionar_adiciones':      'Gestionar adiciones',
  'ver_clientes':             'Ver clientes',
  'gestionar_clientes':       'Gestionar clientes',
  'ver_empleados':            'Ver empleados',
  'gestionar_empleados':      'Gestionar empleados',
  'ver_usuarios':             'Ver usuarios',
  'gestionar_usuarios':       'Gestionar usuarios',
  'ver_roles':                'Ver roles',
  'gestionar_roles':          'Gestionar roles y permisos',
  'ver_pedidos_domiciliario': 'Ver pedidos (domiciliario)',
  'facturar_pedido':          'Facturar pedidos',
};

function ModalPermisos({ open, onClose, onGuardar, rol, permisosDisponibles = [] }) {
  const [seleccionados, setSeleccionados] = useState(rol?.permisos || []);

  if (!open || !rol) return null;

  const togglePermiso = (id) =>
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  const toggleTodos = () =>
    setSeleccionados(
      seleccionados.length === permisosDisponibles.length
        ? []
        : permisosDisponibles.map((p) => p.id_permiso)
    );

  return (
    <div className="modal-overlay">
      <div className="modal-caja" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-encabezado">
          <span className="modal-titulo">Permisos — {rol.nombre}</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>
        <div style={{
          background: '#fafafa', borderRadius: 8, padding: '10px 14px',
          marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          border: '1px solid #f0f0f0',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>
            {seleccionados.length} de {permisosDisponibles.length} permisos seleccionados
          </span>
          <button onClick={toggleTodos} style={{
            background: 'none', border: '1px solid #ddd', borderRadius: 6,
            padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            color: '#666', fontFamily: 'Nunito, sans-serif',
          }}>
            {seleccionados.length === permisosDisponibles.length ? 'Quitar todos' : 'Seleccionar todos'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {permisosDisponibles.map((permiso) => {
            const activo = seleccionados.includes(permiso.id_permiso);
            return (
              <div
                key={permiso.id_permiso}
                onClick={() => togglePermiso(permiso.id_permiso)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${activo ? '#7c3aed' : '#e8e8e8'}`,
                  background: activo ? '#f5f3ff' : '#fff',
                  transition: 'all .15s',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${activo ? '#7c3aed' : '#ddd'}`,
                  background: activo ? '#7c3aed' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                }}>
                  {activo ? '✓' : ''}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: activo ? '#4c1d95' : '#333' }}>
                    {labelPermiso[permiso.nombre] || permiso.nombre}
                  </div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 1 }}>
                    {permiso.descripcion}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="modal-pie" style={{ marginTop: 20 }}>
          <button className="btn-secundario"     onClick={onClose}>Cancelar</button>
          <button className="btn-permisos-modal" onClick={() => onGuardar(seleccionados)}>
            Guardar permisos
          </button>
        </div>
      </div>
    </div>
  );
}

const POR_PAGINA = 5;

export default function Roles() {
  const [lista,              setLista]              = useState([]);
  const [permisosDisponibles, setPermisosDisponibles] = useState([]);
  const [busqueda,           setBusqueda]           = useState('');
  const [pagina,             setPagina]             = useState(1);
  const [modalNuevo,         setModalNuevo]         = useState(false);
  const [editando,           setEditando]           = useState(null);
  const [eliminando,         setEliminando]         = useState(null);
  const [detalle,            setDetalle]            = useState(null);
  const [modalPermisos,      setModalPermisos]      = useState(null);

  useEffect(() => {
    Promise.all([
      api.listarRoles(),
      api.listarPermisos(),
    ])
      .then(([roles, permisos]) => {
        setLista(roles.map((r) => ({ ...r, permisos: r.rolPermisos?.map((rp) => rp.id_permiso) || r.permisos || [] })));
        setPermisosDisponibles(permisos || []);
      })
      .catch((err) => console.error('Error cargando roles:', err));
  }, []);

  useEffect(() => { setPagina(1); }, [busqueda]);

  const filtrados = lista.filter((r) =>
    r.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const abrirPermisos = (rol) => {
    const fresco = lista.find((r) => r.id_rol === rol.id_rol);
    setModalPermisos({ ...fresco, permisos: [...fresco.permisos] });
  };

  const crear = async (f) => {
    try {
      const nuevo = await api.crearRol({ nombre: f.nombre, descripcion: f.descripcion });
      setLista((p) => [...p, { ...nuevo, permisos: nuevo.rolPermisos?.map((rp) => rp.id_permiso) || [] }]);
      setModalNuevo(false);
    } catch (err) { throw err; }
  };

  const editar = async (f) => {
    try {
      const actualizado = await api.actualizarRol(editando.id_rol, { nombre: f.nombre, descripcion: f.descripcion, estado: f.estado });
      setLista((p) => p.map((r) => r.id_rol === editando.id_rol ? { ...r, ...actualizado, permisos: actualizado.rolPermisos?.map((rp) => rp.id_permiso) || r.permisos } : r));
      setEditando(null);
    } catch (err) { throw err; }
  };

  const eliminar = async () => {
    try {
      await api.eliminarRol(eliminando.id_rol);
      setLista((p) => p.filter((r) => r.id_rol !== eliminando.id_rol));
      setEliminando(null);
    } catch (err) {
      setEliminando(null);
      toast.error(err?.response?.data?.message || 'No se pudo eliminar el rol');
    }
  };

  const toggle = async (id) => {
    const rol = lista.find((r) => r.id_rol === id);
    const nuevoEstado = rol.estado ? 0 : 1;
    try {
      await api.actualizarRol(id, { estado: nuevoEstado });
      setLista((p) => p.map((r) => r.id_rol === id ? { ...r, estado: nuevoEstado } : r));
    } catch (err) { console.error('Error cambiando estado rol:', err); }
  };

  const guardarPermisos = async (nuevosPermisos) => {
    const idRol = modalPermisos.id_rol;
    try {
      await api.asignarRolPermisos(idRol, nuevosPermisos);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudieron guardar los permisos');
      return;
    }
    setModalPermisos(null);
    setLista((prev) =>
      prev.map((r) => r.id_rol === idRol ? { ...r, permisos: [...nuevosPermisos] } : r)
    );
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Roles</h1>
          <p className="page-subtitulo">{lista.length} roles registrados</p>
        </div>
        <button className="btn-primario" onClick={() => setModalNuevo(true)}>+ Añadir rol</button>
      </div>

      <div className="buscador">
        <Search size={14} color="#aaa" />
        <input
          placeholder="Buscar rol..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Permisos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.length === 0 ? (
              <tr><td colSpan={5}><div className="tabla-vacia">No se encontraron roles</div></td></tr>
            ) : (
              paginados.map((r) => (
                <tr key={r.id_rol}>
                  <td>{r.nombre}</td>
                  <td className="td-suave">{r.descripcion}</td>
                  <td>
                    <span style={{
                      background: '#f5f5f5', color: '#333',
                      padding: '3px 8px', borderRadius: 6,
                      fontSize: 12, fontWeight: 700, border: '1px solid #e0e0e0',
                    }}>
                      {r.permisos.length} permisos
                    </span>
                  </td>
                  <td><Toggle activo={r.estado === 1} onChange={() => toggle(r.id_rol)} /></td>
                  <td>
                    <div className="acciones">
                      <button className="btn-accion ver"      onClick={() => setDetalle({ ...r })}    title="Ver detalle">
                        <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button className="btn-accion permisos" onClick={() => abrirPermisos(r)}        title="Gestionar permisos">
                        <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </button>
                      <button className="btn-accion editar"   onClick={() => setEditando({ ...r })}   title="Editar">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn-accion eliminar" onClick={() => setEliminando({ ...r })} title="Eliminar">
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

      {modalNuevo && (
        <ModalFormulario
          key="nuevo"
          open={true}
          onClose={() => setModalNuevo(false)}
          onGuardar={crear}
          rolEditar={null}
        />
      )}

      {editando && (
        <ModalFormulario
          key={`editar-${editando.id_rol}`}
          open={true}
          onClose={() => setEditando(null)}
          onGuardar={editar}
          rolEditar={editando}
        />
      )}

      {eliminando && (
        <ModalEliminar
          open={true}
          onClose={() => setEliminando(null)}
          onConfirmar={eliminar}
          nombre={eliminando.nombre}
        />
      )}

      {detalle && (
        <ModalDetalle
          open={true}
          onClose={() => setDetalle(null)}
          rol={lista.find((r) => r.id_rol === detalle.id_rol)}
          permisosDisponibles={permisosDisponibles}
        />
      )}

      {modalPermisos && (
        <ModalPermisos
          key={`permisos-${modalPermisos.id_rol}`}
          open={true}
          onClose={() => setModalPermisos(null)}
          onGuardar={guardarPermisos}
          rol={modalPermisos}
          permisosDisponibles={permisosDisponibles}
        />
      )}
    </AdminLayout>
  );
}
