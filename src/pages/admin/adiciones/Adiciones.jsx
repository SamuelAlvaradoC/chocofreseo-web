import { Search } from 'lucide-react';
import { toast } from '../../../utils/toast';
import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import './Adiciones.css';
import * as api from '../../../services/api';
import { uploadToCloudinary } from '../../../utils/uploadCloudinary';

const POR_PAGINA = 5;

const formatPrecio = (v) =>
  v !== '' && v !== null && v !== undefined ? `$${Number(v).toLocaleString('es-CO')}` : '—';

function Toggle({ activo, onChange }) {
  return (
    <div className="toggle-wrap" style={{ background: activo ? '#22c55e' : '#9ca3af' }} onClick={onChange} title={activo ? 'Activo' : 'Inactivo'}>
      <div className="toggle-circulo" style={{ left: activo ? 23 : 3 }}></div>
    </div>
  );
}

function UploadImagen({ value, onChange }) {
  const inputRef = useRef();
  const [subiendo, setSubiendo] = useState(false);
  const [errorImg, setErrorImg] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const FORMATOS = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!FORMATOS.includes(file.type)) {
      setErrorImg('Formato no permitido. Solo JPG o PNG');
      toast.error('Formato no permitido. Solo JPG o PNG');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorImg('El archivo supera el tamaño máximo de 5 MB');
      toast.error('El archivo supera el tamaño máximo de 5 MB');
      e.target.value = '';
      return;
    }
    setSubiendo(true); setErrorImg('');
    try { const url = await uploadToCloudinary(file); onChange(url); }
    catch (err) { setErrorImg(err?.message || 'Error al subir imagen'); }
    finally { setSubiendo(false); e.target.value = ''; }
  };

  return (
    <div>
      <div className="upload-imagen" onClick={() => !subiendo && inputRef.current.click()}
        title={subiendo ? 'Subiendo...' : 'Haz clic para subir imagen'} style={{ cursor: subiendo ? 'wait' : 'pointer' }}>
        {subiendo ? (
          <div className="upload-placeholder">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="#B91C1C" fill="none" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <span style={{ color: '#B91C1C', fontSize: 12 }}>Subiendo...</span>
          </div>
        ) : value ? (
          <img src={value} alt="preview" className="upload-preview" />
        ) : (
          <div className="upload-placeholder">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="#bbb" fill="none" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>Subir imagen</span>
          </div>
        )}
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFile} />
      </div>
      {errorImg && <span className="form-error" style={{ display: 'block', marginTop: 4 }}>{errorImg}</span>}
    </div>
  );
}

function ModalFormulario({ open, onClose, onGuardar, adicionEditar, procesando = false }) {
  const [nombre,      setNombre]      = useState(adicionEditar?.nombre      || '');
  const [descripcion, setDescripcion] = useState(adicionEditar?.descripcion || '');
  const [gramaje,     setGramaje]     = useState(adicionEditar?.gramaje     || '');
  const [precio,      setPrecio]      = useState(adicionEditar?.precio ? Number(adicionEditar.precio).toLocaleString('es-CO') : '');
  const [img,         setImg]         = useState(adicionEditar?.img         || '');
  const [estado,      setEstado]      = useState(adicionEditar?.estado      ?? 1);
  const [errores,     setErrores]     = useState({});

  if (!open) return null;

  const validar = () => {
    const e = {};
    if (!nombre.trim())           e.nombre = 'El nombre es requerido';
    const precioNum = Number(String(precio).replace(/\./g, '')) || 0;
    if (!precio)            e.precio = 'El precio es requerido';
    else if (precioNum <= 0) e.precio = 'El precio debe ser mayor a 0';
    return e;
  };

  const guardar = async () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErrores(e); return; }
    try {
      await onGuardar({ nombre: nombre.trim(), descripcion: descripcion.trim(), gramaje: gramaje.trim() || null, precio: Number(String(precio).replace(/\./g, '')), img, estado: adicionEditar ? estado : 1 });
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
          <span className="modal-titulo">{adicionEditar ? 'Editar adición' : 'Nueva adición'}</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>

        {/* 1. Nombre */}
        <div className="form-grupo">
          <input className={`form-input${errores.nombre ? ' input-error' : ''}`} placeholder="Nombre de la adición" value={nombre}
            onChange={(e) => { setNombre(e.target.value); setErrores((p) => ({ ...p, nombre: '' })); }} />
          {errores.nombre && <span className="form-error">{errores.nombre}</span>}
        </div>

        {/* 2. Gramaje */}
        <div className="form-grupo">
          <label className="form-label">Gramaje (opcional)</label>
          <input className="form-input" placeholder="Ej: 300g, 200ml..." value={gramaje} onChange={(e) => setGramaje(e.target.value)} />
        </div>

        {/* 3. Descripción */}
        <div className="form-grupo">
          <input className="form-input" placeholder="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>

        {/* 3. Precio */}
        <div className="form-grupo">
          <div className="input-precio-wrap">
            <span className="input-precio-simbolo">$</span>
            <input className={`form-input input-precio input-monto${errores.precio ? ' input-error' : ''}`} type="text" inputMode="numeric" placeholder="0" value={precio}
              onChange={(e) => { const d = e.target.value.replace(/\./g,'').replace(/[^0-9]/g,''); const n = Number(d)||0; setPrecio(n>0?n.toLocaleString('es-CO'):''); setErrores((p) => ({ ...p, precio: '' })); }} />
          </div>
          {errores.precio && <span className="form-error">{errores.precio}</span>}
        </div>

        {/* Estado solo al editar */}
        {adicionEditar && (
          <div className="form-grupo">
            <div className="form-estado">
              <Toggle activo={estado === 1} onChange={() => setEstado(estado === 1 ? 0 : 1)} />
              <span className="form-estado-texto" style={{ color: estado ? '#22c55e' : '#CA0B0B' }}>{estado ? 'Activo' : 'Inactivo'}</span>
            </div>
          </div>
        )}

        {/* 4. Imagen (al final) */}
        <div className="form-grupo">
          <label className="form-label">Imagen</label>
          <UploadImagen value={img} onChange={setImg} />
        </div>

        {errores._general && <p className="error-general">{errores._general}</p>}
        <div className="modal-pie">
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          {adicionEditar
            ? <button className="btn-editar-modal" onClick={guardar} disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar cambios'}</button>
            : <button className="btn-primario"     onClick={guardar} disabled={procesando}>{procesando ? 'Guardando...' : 'Crear adición'}</button>
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
        <p className="modal-texto-confirmar">¿Eliminar la adición <strong>"{nombre}"</strong>?<br />Esta acción no se puede deshacer.</p>
        <div className="modal-pie centrado" style={{ marginTop: 24 }}>
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button className="btn-peligro"    onClick={onConfirmar} disabled={procesando}>{procesando ? 'Eliminando...' : 'Sí, eliminar'}</button>
        </div>
      </div>
    </div>
  );
}

function ModalDetalle({ open, onClose, adicion }) {
  if (!open || !adicion) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-caja">
        <div className="modal-encabezado">
          <span className="modal-titulo">Detalle de adición</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>
        {adicion.img && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img src={adicion.img} alt={adicion.nombre} style={{ maxHeight: 120, borderRadius: 10, objectFit: 'cover' }} />
          </div>
        )}
        <div className="detalle-grid">
          <div className="detalle-item">
            <span className="detalle-label">Estado</span>
            <span className="detalle-badge" style={{ background: adicion.estado ? '#f0fdf4' : '#fff5f5', color: adicion.estado ? '#22c55e' : '#CA0B0B' }}>
              {adicion.estado ? '● Activo' : '● Inactivo'}
            </span>
          </div>
          <div className="detalle-item">
            <span className="detalle-label">Precio</span>
            <span className="detalle-valor" style={{ fontWeight: 700, color: '#1a1a1a' }}>{formatPrecio(adicion.precio)}</span>
          </div>
          <div className="detalle-item detalle-full">
            <span className="detalle-label">Nombre</span>
            <span className="detalle-valor">{adicion.nombre}</span>
          </div>
          {adicion.gramaje && (
            <div className="detalle-item">
              <span className="detalle-label">Gramaje</span>
              <span className="detalle-valor">{adicion.gramaje}</span>
            </div>
          )}
          <div className="detalle-item detalle-full">
            <span className="detalle-label">Descripción</span>
            <span className="detalle-valor">{adicion.descripcion || '—'}</span>
          </div>
        </div>
        <div className="modal-pie">
          <button className="btn-detalle" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default function Adiciones() {
  const [lista,        setLista]        = useState([]);
  const [busqueda,     setBusqueda]     = useState('');
  const [pagina,       setPagina]       = useState(1);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [eliminando,   setEliminando]   = useState(null);
  const [detalle,      setDetalle]      = useState(null);
  const [procesando,   setProcesando]   = useState(false);

  const cargar = () => api.listarAdiciones().then(setLista).catch((err) => console.error('Error cargando adiciones:', err));
  useEffect(() => { cargar(); }, []);
  useEffect(() => { setPagina(1); }, [busqueda]);

  const filtrados = lista.filter((a) => a.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const crear = async (f) => {
    if (procesando) return; setProcesando(true);
    try { await api.crearAdicion({ nombre: f.nombre, descripcion: f.descripcion, precio: f.precio, img: f.img, gramaje: f.gramaje, estado: 1 }); cargar(); setModalAbierto(false); }
    catch (err) { throw err; }
    finally { setProcesando(false); }
  };
  const editar = async (f) => {
    if (procesando) return; setProcesando(true);
    try { await api.actualizarAdicion(editando.id_adicion, { nombre: f.nombre, descripcion: f.descripcion, precio: f.precio, img: f.img, gramaje: f.gramaje, estado: f.estado }); cargar(); setEditando(null); }
    catch (err) { throw err; }
    finally { setProcesando(false); }
  };
  const eliminar = async () => {
    if (procesando) return; setProcesando(true);
    try { await api.eliminarAdicion(eliminando.id_adicion); setLista((p) => p.filter((a) => a.id_adicion !== eliminando.id_adicion)); setEliminando(null); }
    catch (err) { setEliminando(null); toast.error(err?.response?.data?.message || 'No se pudo eliminar la adición'); }
    finally { setProcesando(false); }
  };
  const toggle = async (id) => {
    const adicion = lista.find((a) => a.id_adicion === id);
    const nuevoEstado = adicion.estado ? 0 : 1;
    try { await api.estadoAdicion(id, { estado: nuevoEstado }); setLista((p) => p.map((a) => a.id_adicion === id ? { ...a, estado: nuevoEstado } : a)); }
    catch (err) { toast.error(err?.response?.data?.message || 'No se pudo cambiar el estado'); }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Adiciones</h1>
          <p className="page-subtitulo">{lista.length} adiciones registradas</p>
        </div>
        <button className="btn-primario" onClick={() => setModalAbierto(true)}>+ Añadir adición</button>
      </div>

      <div className="buscador">
        <Search size={14} color="#aaa" />
        <input placeholder="Buscar adición..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      <div className="tabla-wrap">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Descripción</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {paginados.length === 0 ? (
              <tr><td colSpan={5}><div className="tabla-vacia">No se encontraron adiciones</div></td></tr>
            ) : (
              paginados.map((a) => (
                <tr key={a.id_adicion} style={{ opacity: a.estado === 0 ? 0.6 : 1 }}>
                  <td style={{ textTransform: 'capitalize' }}>
                    {a.img && <img src={a.img} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', marginRight: 8, verticalAlign: 'middle' }} />}
                    {a.nombre}
                  </td>
                  <td className="td-suave">{a.descripcion}</td>
                  <td style={{ fontWeight: 700, color: '#1a1a1a' }}>{formatPrecio(a.precio)}</td>
                  <td><Toggle activo={a.estado === 1} onChange={() => toggle(a.id_adicion)} /></td>
                  <td>
                    <div className="acciones">
                      <button className="btn-accion ver" onClick={() => setDetalle({ ...a })} title="Ver detalle">
                        <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button className="btn-accion editar" onClick={() => setEditando({ ...a })} title="Editar">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn-accion eliminar" onClick={() => setEliminando({ ...a })} title="Eliminar">
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

      {modalAbierto && <ModalFormulario key="nueva" open={true} onClose={() => setModalAbierto(false)} onGuardar={crear} adicionEditar={null} procesando={procesando} />}
      {editando    && <ModalFormulario key={`editar-${editando.id_adicion}`} open={true} onClose={() => setEditando(null)} onGuardar={editar} adicionEditar={editando} procesando={procesando} />}
      {eliminando  && <ModalEliminar  open={true} onClose={() => setEliminando(null)} onConfirmar={eliminar} nombre={eliminando?.nombre} procesando={procesando} />}
      {detalle     && <ModalDetalle   open={true} onClose={() => setDetalle(null)} adicion={lista.find((a) => a.id_adicion === detalle.id_adicion)} />}
    </AdminLayout>
  );
}

