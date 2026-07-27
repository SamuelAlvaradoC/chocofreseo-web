import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout';
import { toast } from '../../../utils/toast';
import * as api from '../../../services/api';
import '../categorias/Categorias.css';

const fmt = (v) => '$' + Number(v).toLocaleString('es-CO');

function Toggle({ activo, onChange }) {
  return (
    <div className="toggle-wrap" style={{ background: activo ? '#22c55e' : '#9ca3af' }} onClick={onChange}>
      <div className="toggle-circulo" style={{ left: activo ? 23 : 3 }} />
    </div>
  );
}

function ModalFormulario({ open, onClose, onGuardar, editando, procesando, ciudades }) {
  const [nombre,   setNombre]   = useState(editando?.nombre || '');
  const [idCiudad, setIdCiudad] = useState(editando?.id_ciudad ? String(editando.id_ciudad) : '');
  const [precio,   setPrecio]   = useState(editando?.precio_domicilio != null ? String(editando.precio_domicilio) : '');
  const [errores,  setErrores]  = useState({});

  if (!open) return null;

  const guardar = async () => {
    const e = {};
    if (!nombre.trim())    e.nombre   = 'El nombre es requerido';
    if (!idCiudad)         e.ciudad   = 'Selecciona una ciudad';
    if (!precio || isNaN(Number(precio)) || Number(precio) < 0) e.precio = 'Precio inválido';
    if (Object.keys(e).length) { setErrores(e); return; }
    try {
      await onGuardar({ nombre: nombre.trim(), id_ciudad: Number(idCiudad), precio_domicilio: Number(precio) });
    } catch (err) {
      setErrores({ _general: err?.response?.data?.message || 'Error al guardar' });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-caja">
        <div className="modal-encabezado">
          <span className="modal-titulo">{editando ? 'Editar barrio' : 'Nuevo barrio'}</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>

        <div className="form-grupo">
          <label className="form-label">Ciudad / Municipio *</label>
          <select
            className={`form-input${errores.ciudad ? ' input-error' : ''}`}
            value={idCiudad}
            onChange={(e) => { setIdCiudad(e.target.value); setErrores((p) => ({ ...p, ciudad: '' })); }}
            autoFocus
          >
            <option value="">Seleccionar ciudad...</option>
            {ciudades.map((c) => <option key={c.id_ciudad} value={c.id_ciudad}>{c.nombre}</option>)}
          </select>
          {errores.ciudad && <span className="form-error">{errores.ciudad}</span>}
        </div>

        <div className="form-grupo">
          <label className="form-label">Nombre del barrio *</label>
          <input
            className={`form-input${errores.nombre ? ' input-error' : ''}`}
            placeholder="Ej: Laureles, El Poblado..."
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setErrores((p) => ({ ...p, nombre: '' })); }}
          />
          {errores.nombre && <span className="form-error">{errores.nombre}</span>}
        </div>

        <div className="form-grupo">
          <label className="form-label">Precio domicilio *</label>
          <input
            className={`form-input${errores.precio ? ' input-error' : ''}`}
            placeholder="Ej: 5000"
            value={precio}
            type="number"
            min="0"
            step="500"
            style={{ MozAppearance: 'textfield', WebkitAppearance: 'none' }}
            onChange={(e) => { setPrecio(e.target.value); setErrores((p) => ({ ...p, precio: '' })); }}
          />
          {precio && !isNaN(Number(precio)) && Number(precio) > 0 && (
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, marginTop: 3, display: 'block' }}>
              {fmt(precio)}
            </span>
          )}
          {errores.precio && <span className="form-error">{errores.precio}</span>}
        </div>

        {errores._general && <p className="error-general">{errores._general}</p>}
        <div className="modal-pie">
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button className="btn-primario" onClick={guardar} disabled={procesando}>
            {procesando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear barrio'}
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
          ¿Eliminar el barrio <strong>"{nombre}"</strong>?<br />Esta acción no se puede deshacer.
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

export default function Barrios() {
  const [lista,        setLista]        = useState([]);
  const [ciudades,     setCiudades]     = useState([]);
  const [busqueda,     setBusqueda]     = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [pagina,       setPagina]       = useState(1);
  const [modal,        setModal]        = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [eliminando,   setEliminando]   = useState(null);
  const [procesando,   setProcesando]   = useState(false);

  const cargar = () => api.listarBarrios().then(setLista).catch(() => {});
  useEffect(() => {
    cargar();
    api.listarCiudades().then(setCiudades).catch(() => {});
  }, []);
  useEffect(() => { setPagina(1); }, [busqueda, filtroCiudad]);

  const filtrados = lista.filter((b) => {
    const matchNombre = b.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchCiudad = !filtroCiudad || String(b.id_ciudad) === filtroCiudad;
    return matchNombre && matchCiudad;
  });
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados   = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const crear = async (f) => {
    if (procesando) return; setProcesando(true);
    try { await api.crearBarrio(f); toast.success('Barrio creado'); cargar(); setModal(false); }
    catch (err) { throw err; }
    finally { setProcesando(false); }
  };

  const editar = async (f) => {
    if (procesando) return; setProcesando(true);
    try { await api.actualizarBarrio(editando.id_barrio, f); toast.success('Barrio actualizado'); cargar(); setEditando(null); }
    catch (err) { throw err; }
    finally { setProcesando(false); }
  };

  const eliminar = async () => {
    if (procesando) return; setProcesando(true);
    try { await api.eliminarBarrio(eliminando.id_barrio); toast.success('Barrio eliminado'); cargar(); }
    catch (err) { toast.error(err?.response?.data?.message || 'No se pudo eliminar'); }
    finally { setProcesando(false); setEliminando(null); }
  };

  const toggle = async (id, estadoActual) => {
    await api.estadoBarrio(id, { estado: estadoActual ? 0 : 1 }).catch(() => {});
    cargar();
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Barrios</h1>
          <p className="page-subtitulo">{lista.length} barrios registrados</p>
        </div>
        <button className="btn-primario" onClick={() => setModal(true)}>+ Añadir barrio</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="buscador" style={{ flex: 1, minWidth: 200, margin: 0 }}>
          <Search size={14} color="#aaa" />
          <input placeholder="Buscar barrio..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select
          className="form-input"
          style={{ height: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, minWidth: 160 }}
          value={filtroCiudad}
          onChange={(e) => setFiltroCiudad(e.target.value)}
        >
          <option value="">Todas las ciudades</option>
          {ciudades.map((c) => <option key={c.id_ciudad} value={c.id_ciudad}>{c.nombre}</option>)}
        </select>
      </div>

      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th>Barrio</th>
              <th>Ciudad</th>
              <th>Precio domicilio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.length === 0 ? (
              <tr><td colSpan={5}><div className="tabla-vacia">No se encontraron barrios</div></td></tr>
            ) : paginados.map((b) => (
              <tr key={b.id_barrio} style={{ opacity: b.estado === 0 ? 0.6 : 1 }}>
                <td style={{ fontWeight: 600 }}>{b.nombre}</td>
                <td className="td-suave">{b.ciudad?.nombre || '—'}</td>
                <td style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(b.precio_domicilio)}</td>
                <td><Toggle activo={b.estado === 1} onChange={() => toggle(b.id_barrio, b.estado)} /></td>
                <td>
                  <div className="acciones">
                    <button className="btn-accion editar" onClick={() => setEditando({ ...b })} title="Editar">
                      <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="btn-accion eliminar" onClick={() => setEliminando({ ...b })} title="Eliminar">
                      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
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

      {modal && <ModalFormulario open={true} onClose={() => setModal(false)} onGuardar={crear} editando={null} procesando={procesando} ciudades={ciudades} />}
      {editando && <ModalFormulario open={true} onClose={() => setEditando(null)} onGuardar={editar} editando={editando} procesando={procesando} ciudades={ciudades} />}
      {eliminando && <ModalEliminar open={true} onClose={() => setEliminando(null)} onConfirmar={eliminar} nombre={eliminando?.nombre} procesando={procesando} />}
    </AdminLayout>
  );
}
