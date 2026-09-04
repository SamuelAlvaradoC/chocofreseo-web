import { Search } from 'lucide-react';
import { toast } from '../../../utils/toast';
import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import * as api from '../../../services/api';
import { useRefrescoHeader } from '../../../context/RefrescoContext';
import './Categorias.css';

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

function ModalFormulario({ open, onClose, onGuardar, categoriaEditar, procesando = false }) {
  const [nombre,      setNombre]      = useState(categoriaEditar?.nombre      || '');
  const [descripcion, setDescripcion] = useState(categoriaEditar?.descripcion || '');
  const [estado,      setEstado]      = useState(categoriaEditar?.estado      ?? 1);
  const [errores,     setErrores]     = useState({});

  if (!open) return null;

  const validar = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = 'El nombre es requerido';
    return e;
  };

  const guardar = async () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErrores(e); return; }
    try {
      await onGuardar({ nombre: nombre.trim(), descripcion: descripcion.trim(), estado: categoriaEditar ? estado : 1 });
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
          <span className="modal-titulo">{categoriaEditar ? 'Editar categoría' : 'Nueva categoría'}</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>

        <div className="form-grupo">
          <input
            className={`form-input${errores.nombre ? ' input-error' : ''}`}
            placeholder="Nombre de la categoría"
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setErrores((p) => ({ ...p, nombre: '' })); }}
          />
          {errores.nombre && <span className="form-error">{errores.nombre}</span>}
        </div>

        <div className="form-grupo">
          <input
            className="form-input"
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        {/* Estado solo al editar */}
        {categoriaEditar && (
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
          {categoriaEditar
            ? <button className="btn-editar-modal" onClick={guardar} disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar cambios'}</button>
            : <button className="btn-primario"     onClick={guardar} disabled={procesando}>{procesando ? 'Guardando...' : 'Crear categoría'}</button>
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
          ¿Eliminar la categoría <strong>"{nombre}"</strong>?<br />Esta acción no se puede deshacer.
        </p>
        <div className="modal-pie centrado" style={{ marginTop: 24 }}>
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button className="btn-peligro"    onClick={onConfirmar} disabled={procesando}>{procesando ? 'Eliminando...' : 'Sí, eliminar'}</button>
        </div>
      </div>
    </div>
  );
}

function ModalDetalle({ open, onClose, categoria }) {
  if (!open || !categoria) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-caja">
        <div className="modal-encabezado">
          <span className="modal-titulo">Detalle de categoría</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>
        {categoria.img && (
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <img src={categoria.img} alt={categoria.nombre} style={{ maxHeight: 120, borderRadius: 10, objectFit: 'cover' }} />
          </div>
        )}
        <div className="detalle-grid">
          <div className="detalle-item detalle-full">
            <span className="detalle-label">Nombre</span>
            <span className="detalle-valor">{categoria.nombre}</span>
          </div>
          <div className="detalle-item">
            <span className="detalle-label">Estado</span>
            <span className="detalle-badge" style={{ background: categoria.estado ? '#f0fdf4' : '#fff5f5', color: categoria.estado ? '#22c55e' : '#CA0B0B' }}>
              {categoria.estado ? '● Activo' : '● Inactivo'}
            </span>
          </div>
          <div className="detalle-item detalle-full">
            <span className="detalle-label">Descripción</span>
            <span className="detalle-valor">{categoria.descripcion || '—'}</span>
          </div>
        </div>
        <div className="modal-pie">
          <button className="btn-detalle" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

const POR_PAGINA = 10;

export default function Categorias() {
  const [lista,        setLista]        = useState([]);
  const [busqueda,     setBusqueda]     = useState('');
  const [pagina,       setPagina]       = useState(1);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [eliminando,   setEliminando]   = useState(null);
  const [detalle,      setDetalle]      = useState(null);
  const [procesando,   setProcesando]   = useState(false);

  const cargar = () => api.listarCategorias().then(setLista).catch(() => {});
  useEffect(() => { cargar(); }, []);
  useRefrescoHeader(cargar);
  useEffect(() => { setPagina(1); }, [busqueda]);

  const filtradas = lista.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalPaginas = Math.ceil(filtradas.length / POR_PAGINA);
  const paginadas    = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const crear    = async (f) => { if (procesando) return; setProcesando(true); try { await api.crearCategoria(f); cargar(); setModalAbierto(false); } catch (err) { throw err; } finally { setProcesando(false); } };
  const editar   = async (f) => { if (procesando) return; setProcesando(true); try { await api.actualizarCategoria(editando.id_categoria, f); cargar(); setEditando(null); } catch (err) { throw err; } finally { setProcesando(false); } };
  const eliminar = async ()  => {
    if (procesando) return; setProcesando(true);
    try {
      await api.eliminarCategoria(eliminando.id_categoria);
      cargar();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo eliminar la categoría');
    } finally { setProcesando(false); setEliminando(null); }
  };
  const toggle   = async (id, estadoActual) => {
    try { await api.estadoCategoria(id, { estado: estadoActual ? 0 : 1 }); cargar(); }
    catch (err) { toast.error(err?.response?.data?.message || 'No se pudo cambiar el estado'); }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Categorías</h1>
          <p className="page-subtitulo">{lista.length} categorías registradas</p>
        </div>
        <button className="btn-primario" onClick={() => setModalAbierto(true)}>+ Añadir categoría</button>
      </div>

      <div className="buscador">
        <Search size={14} color="#aaa" />
        <input
          placeholder="Buscar categoría..."
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
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginadas.length === 0 ? (
              <tr><td colSpan={4}><div className="tabla-vacia">No se encontraron categorías</div></td></tr>
            ) : (
              paginadas.map((cat) => (
                <tr key={cat.id_categoria} style={{ opacity: cat.estado === 0 ? 0.6 : 1 }}>
                  <td style={{ textTransform: 'capitalize' }}>{cat.nombre}</td>
                  <td className="td-suave">{cat.descripcion}</td>
                  <td><Toggle activo={cat.estado === 1} onChange={() => toggle(cat.id_categoria, cat.estado)} /></td>
                  <td>
                    <div className="acciones">
                      <button className="btn-accion ver" onClick={() => setDetalle({ ...cat })} title="Ver detalle">
                        <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button className="btn-accion editar" onClick={() => setEditando({ ...cat })} title="Editar">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn-accion eliminar" onClick={() => setEliminando({ ...cat })} title="Eliminar">
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
        <ModalFormulario
          key="nueva"
          open={true}
          onClose={() => setModalAbierto(false)}
          onGuardar={crear}
          categoriaEditar={null}
          procesando={procesando}
        />
      )}

      {editando && (
        <ModalFormulario
          key={`editar-${editando.id_categoria}`}
          open={true}
          onClose={() => setEditando(null)}
          onGuardar={editar}
          categoriaEditar={editando}
          procesando={procesando}
        />
      )}

      {eliminando && (
        <ModalEliminar
          open={true}
          onClose={() => setEliminando(null)}
          onConfirmar={eliminar}
          nombre={eliminando?.nombre}
          procesando={procesando}
        />
      )}

      {detalle && (
        <ModalDetalle
          open={true}
          onClose={() => setDetalle(null)}
          categoria={lista.find((c) => c.id_categoria === detalle.id_categoria)}
        />
      )}
    </AdminLayout>
  );
}
