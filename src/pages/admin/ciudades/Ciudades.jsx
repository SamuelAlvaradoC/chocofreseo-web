import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout';
import { toast } from '../../../utils/toast';
import * as api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import '../categorias/Categorias.css';

function Toggle({ activo, onChange }) {
  return (
    <div className="toggle-wrap" style={{ background: activo ? '#22c55e' : '#9ca3af' }} onClick={onChange}>
      <div className="toggle-circulo" style={{ left: activo ? 23 : 3 }} />
    </div>
  );
}

function ModalFormulario({ open, onClose, onGuardar, editando, procesando }) {
  const [nombre,  setNombre]  = useState(editando?.nombre || '');
  const [errores, setErrores] = useState({});

  if (!open) return null;

  const guardar = async () => {
    if (!nombre.trim()) { setErrores({ nombre: 'El nombre es requerido' }); return; }
    try {
      await onGuardar({ nombre: nombre.trim() });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al guardar';
      setErrores({ _general: msg });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-caja">
        <div className="modal-encabezado">
          <span className="modal-titulo">{editando ? 'Editar ciudad' : 'Nueva ciudad'}</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>
        <div className="form-grupo">
          <input
            className={`form-input${errores.nombre ? ' input-error' : ''}`}
            placeholder="Nombre de la ciudad / municipio"
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setErrores({}); }}
            autoFocus
          />
          {errores.nombre && <span className="form-error">{errores.nombre}</span>}
        </div>
        {errores._general && <p className="error-general">{errores._general}</p>}
        <div className="modal-pie">
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button className="btn-primario" onClick={guardar} disabled={procesando}>
            {procesando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear ciudad'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalEliminar({ open, onClose, onConfirmar, nombre, procesando }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-caja modal-pequeno">
        <div className="modal-icono-grande">🗑️</div>
        <p className="modal-texto-confirmar">
          ¿Eliminar la ciudad <strong>"{nombre}"</strong>?<br />Esta acción no se puede deshacer.
        </p>
        <div className="modal-pie centrado" style={{ marginTop: 24 }}>
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button className="btn-peligro" onClick={onConfirmar} disabled={procesando}>
            {procesando ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const POR_PAGINA = 10;

export default function Ciudades() {
  const { tienePermiso } = useAuth();
  const puedeGestionar   = tienePermiso('gestionar_ciudades');
  const [lista,      setLista]      = useState([]);
  const [busqueda,   setBusqueda]   = useState('');
  const [pagina,     setPagina]     = useState(1);
  const [modal,      setModal]      = useState(false);
  const [editando,   setEditando]   = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = () => api.listarCiudades().then(setLista).catch(() => {});
  useEffect(() => { cargar(); }, []);
  useEffect(() => { setPagina(1); }, [busqueda]);

  const filtradas   = lista.filter((c) => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const totalPaginas = Math.ceil(filtradas.length / POR_PAGINA);
  const paginadas   = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const crear = async (f) => {
    if (procesando) return; setProcesando(true);
    try { await api.crearCiudad(f); toast.success('Ciudad creada'); cargar(); setModal(false); }
    catch (err) { throw err; }
    finally { setProcesando(false); }
  };

  const editar = async (f) => {
    if (procesando) return; setProcesando(true);
    try { await api.actualizarCiudad(editando.id_ciudad, f); toast.success('Ciudad actualizada'); cargar(); setEditando(null); }
    catch (err) { throw err; }
    finally { setProcesando(false); }
  };

  const eliminar = async () => {
    if (procesando) return; setProcesando(true);
    try { await api.eliminarCiudad(eliminando.id_ciudad); toast.success('Ciudad eliminada'); cargar(); }
    catch (err) { toast.error(err?.response?.data?.message || 'No se pudo eliminar'); }
    finally { setProcesando(false); setEliminando(null); }
  };

  const toggle = async (id, estadoActual) => {
    try {
      await api.estadoCiudad(id, { estado: estadoActual ? 0 : 1 });
      cargar();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo cambiar el estado');
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Ciudades / Municipios</h1>
          <p className="page-subtitulo">{lista.length} ciudades registradas</p>
        </div>
        {puedeGestionar && <button className="btn-primario" onClick={() => setModal(true)}>+ Añadir ciudad</button>}
      </div>

      <div className="buscador">
        <Search size={14} color="#aaa" />
        <input placeholder="Buscar ciudad..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th>Ciudad / Municipio</th>
              <th>Barrios</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginadas.length === 0 ? (
              <tr><td colSpan={4}><div className="tabla-vacia">No se encontraron ciudades</div></td></tr>
            ) : paginadas.map((c) => (
              <tr key={c.id_ciudad} style={{ opacity: c.estado === 0 ? 0.6 : 1 }}>
                <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                <td className="td-suave">{c._count?.barrios ?? 0} barrios</td>
                <td><Toggle activo={c.estado === 1} onChange={puedeGestionar ? () => toggle(c.id_ciudad, c.estado) : undefined} /></td>
                <td>
                  <div className="acciones">
                    {puedeGestionar ? (
                      <>
                        <button className="btn-accion editar" onClick={() => setEditando({ ...c })} title="Editar">
                          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-accion eliminar" onClick={() => setEliminando({ ...c })} title="Eliminar">
                          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </>
                    ) : '—'}
                  </div>
                </td>
              </tr>
            ))}
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

      {modal && <ModalFormulario open={true} onClose={() => setModal(false)} onGuardar={crear} editando={null} procesando={procesando} />}
      {editando && <ModalFormulario open={true} onClose={() => setEditando(null)} onGuardar={editar} editando={editando} procesando={procesando} />}
      {eliminando && <ModalEliminar open={true} onClose={() => setEliminando(null)} onConfirmar={eliminar} nombre={eliminando?.nombre} procesando={procesando} />}
    </AdminLayout>
  );
}
