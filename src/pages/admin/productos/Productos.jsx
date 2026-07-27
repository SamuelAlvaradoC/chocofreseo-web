import { Search } from 'lucide-react';
import { toast } from '../../../utils/toast';
import { imgCl } from '../../../utils/cloudinary';
import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import * as api from '../../../services/api';
import { uploadToCloudinary } from '../../../utils/uploadCloudinary';
import './Productos.css';

const POR_PAGINA = 5;

const TAMANOS = [
  { value: '',               label: '(Sin tamaño)' },
  { value: 'Pequeño (9oz)',  label: 'Pequeño (9oz)' },
  { value: 'Mediano (12oz)', label: 'Mediano (12oz)' },
  { value: 'Grande (16oz)',  label: 'Grande (16oz)' },
];

// Normaliza valores viejos ('Pequeño') al nuevo formato ('Pequeño (9oz)')
const normalizarTamano = (t) => {
  if (!t) return '';
  if (t === 'Pequeño') return 'Pequeño (9oz)';
  if (t === 'Mediano') return 'Mediano (12oz)';
  if (t === 'Grande')  return 'Grande (16oz)';
  return t;
};

const formatPrecio = (v) =>
  v !== '' && v !== null && v !== undefined
    ? `$${Number(v).toLocaleString('es-CO')}`
    : '—';

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
    const FORMATOS = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!FORMATOS.includes(file.type)) {
      toast.error('Formato no permitido. Solo JPG, PNG o PDF');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
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
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={handleFile} />
      </div>
      {errorImg && <span className="form-error" style={{ display: 'block', marginTop: 4 }}>{errorImg}</span>}
    </div>
  );
}

function ModalFormulario({ open, onClose, onGuardar, productoEditar, categoriasLista = [], procesando = false }) {
  const [idCategoria,       setIdCategoria]       = useState(productoEditar?.id_categoria     || (categoriasLista[0]?.id_categoria ?? 1));
  const [nombre,            setNombre]            = useState(productoEditar?.nombre           || '');
  const [descripcion,       setDescripcion]       = useState(productoEditar?.descripcion      || '');
  const [tamano,            setTamano]            = useState(normalizarTamano(productoEditar?.tamano ?? ''));
  const [precio,            setPrecio]            = useState(productoEditar?.precio           || '');
  const [permiteToppings,   setPermiteToppings]   = useState(productoEditar?.permite_toppings ?? 0);
  const [maxToppings,       setMaxToppings]       = useState(productoEditar?.max_toppings === 2 ? 2 : 1);
  const [permiteChocolate,  setPermiteChocolate]  = useState(productoEditar?.permite_chocolate ? 1 : 0);
  const [permiteSalsas,     setPermiteSalsas]     = useState(Boolean(productoEditar?.permite_salsas));
  const [esBowl,            setEsBowl]            = useState(Boolean(productoEditar?.es_bowl));
  const [estado,            setEstado]            = useState(productoEditar?.estado           ?? 1);
  const [img,               setImg]               = useState(productoEditar?.img              || '');
  const [errores,           setErrores]           = useState({});

  if (!open) return null;

  const validar = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = 'El nombre es requerido';
    if (!precio)        e.precio = 'El precio es requerido';
    else if (Number(precio) <= 0) e.precio = 'El precio debe ser mayor a 0';
    return e;
  };

  const guardar = async () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErrores(e); return; }
    try {
      await onGuardar({
        nombre: nombre.trim(), descripcion: descripcion.trim(),
        id_categoria: Number(idCategoria), tamano,
        precio: Number(precio), img,
        permite_toppings: permiteToppings,
        max_toppings: Number(maxToppings),
        permite_chocolate: esBowl ? false : permiteChocolate === 1,
        permite_salsas:    esBowl ? false : permiteSalsas,
        es_bowl:           esBowl,
        estado: productoEditar ? estado : 1,
      });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al guardar. Inténtalo de nuevo.';
      if (msg.toLowerCase().includes('nombre')) setErrores((p) => ({ ...p, nombre: msg }));
      else setErrores((p) => ({ ...p, _general: msg }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-caja" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-encabezado">
          <span className="modal-titulo">{productoEditar ? 'Editar producto' : 'Nuevo producto'}</span>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>

        {/* 1. Categoría */}
        <div className="form-grupo">
          <label className="form-label">Categoría</label>
          <select className="form-input" value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)}>
            {categoriasLista.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
          </select>
        </div>

        {/* 2. Nombre */}
        <div className="form-grupo">
          <input className={`form-input${errores.nombre ? ' input-error' : ''}`} placeholder="Nombre del producto" value={nombre}
            onChange={(e) => { setNombre(e.target.value); setErrores((p) => ({ ...p, nombre: '' })); }} />
          {errores.nombre && <span className="form-error">{errores.nombre}</span>}
        </div>

        {/* 3. Descripción */}
        <div className="form-grupo">
          <input className="form-input" placeholder="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>

        {/* 4. Tamaño */}
        <div className="form-grupo">
          <label className="form-label">Tamaño</label>
          <select className="form-input" value={tamano} onChange={(e) => setTamano(e.target.value)}>
            {TAMANOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* 5. Precio */}
        <div className="form-grupo">
          <label className="form-label">Precio</label>
          <div className="input-precio-wrap">
            <span className="input-precio-simbolo">$</span>
            <input className={`form-input input-precio input-monto${errores.precio ? ' input-error' : ''}`} type="number" step="1" min="0" placeholder="0" value={precio}
              onChange={(e) => { setPrecio(e.target.value); setErrores((p) => ({ ...p, precio: '' })); }}
              onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
              onInput={(e) => { e.target.value = e.target.value.replace(/[.,]/g, ''); }} />
          </div>
          {errores.precio && <span className="form-error">{errores.precio}</span>}
        </div>

        {/* 6 & 7. Toggles deslizantes */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={() => setPermiteToppings(p => p ? 0 : 1)}
              style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: permiteToppings ? '#CA0B0B' : '#e5e7eb', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: permiteToppings ? '22px' : '2px', width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: permiteToppings ? '#CA0B0B' : '#888' }}>
              {permiteToppings ? 'Permite toppings' : 'Sin toppings'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: esBowl ? 0.35 : 1, pointerEvents: esBowl ? 'none' : 'auto' }}>
            <button type="button" onClick={() => setPermiteChocolate(p => p ? 0 : 1)}
              style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: permiteChocolate ? '#CA0B0B' : '#e5e7eb', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: permiteChocolate ? '22px' : '2px', width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: permiteChocolate ? '#CA0B0B' : '#888' }}>
              {permiteChocolate ? 'Con selección de chocolate' : 'Sin elección de chocolate'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: esBowl ? 0.35 : 1, pointerEvents: esBowl ? 'none' : 'auto' }}>
            <button type="button" onClick={() => setPermiteSalsas(p => !p)}
              style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: permiteSalsas ? '#CA0B0B' : '#e5e7eb', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: permiteSalsas ? '22px' : '2px', width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: permiteSalsas ? '#CA0B0B' : '#888' }}>
              {permiteSalsas ? '🍫 Con salsas' : 'Sin salsas'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={() => { const next = !esBowl; setEsBowl(next); if (next) { setPermiteChocolate(0); setPermiteSalsas(false); } }}
              style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: esBowl ? '#d97706' : '#e5e7eb', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: esBowl ? '22px' : '2px', width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: esBowl ? '#d97706' : '#888' }}>
              {esBowl ? '🥣 Bowl (elige cobertura)' : 'Sin cobertura bowl'}
            </span>
          </div>
        </div>

        {!!permiteToppings && (
          <div className="form-grupo" style={{ marginBottom: 16 }}>
            <label className="form-label">¿Cuántos toppings van incluidos gratis?</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[1, 2, 3].map(n => (
                <button key={n} type="button" onClick={() => setMaxToppings(n)}
                  style={{ width: 40, height: 40, borderRadius: 8, border: maxToppings === n ? '2px solid #CA0B0B' : '1px solid #e5e7eb', background: maxToppings === n ? '#fff5f5' : 'white', color: maxToppings === n ? '#CA0B0B' : '#555', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 7. Estado (solo al editar) */}
        {productoEditar && (
          <div className="form-grupo">
            <div className="form-estado">
              <Toggle activo={estado === 1} onChange={() => setEstado(estado === 1 ? 0 : 1)} />
              <span className="form-estado-texto" style={{ color: estado ? '#22c55e' : '#CA0B0B' }}>{estado ? 'Activo' : 'Inactivo'}</span>
            </div>
          </div>
        )}

        {/* 8. Imagen (al final) */}
        <div className="form-grupo">
          <label className="form-label">Imagen</label>
          <UploadImagen value={img} onChange={setImg} />
        </div>

        {errores._general && <p className="error-general">{errores._general}</p>}
        <div className="modal-pie">
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          {productoEditar
            ? <button className="btn-editar-modal" onClick={guardar} disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar cambios'}</button>
            : <button className="btn-primario"     onClick={guardar} disabled={procesando}>{procesando ? 'Guardando...' : 'Crear producto'}</button>
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
        <p className="modal-texto-confirmar">¿Eliminar el producto <strong>"{nombre}"</strong>?<br />Esta acción no se puede deshacer.</p>
        <div className="modal-pie centrado" style={{ marginTop: 24 }}>
          <button className="btn-secundario" onClick={onClose}>Cancelar</button>
          <button className="btn-peligro"    onClick={onConfirmar} disabled={procesando}>{procesando ? 'Eliminando...' : 'Sí, eliminar'}</button>
        </div>
      </div>
    </div>
  );
}

function ModalDetalle({ open, onClose, producto, categoriasLista = [], onEditar }) {
  if (!open || !producto) return null;
  const catNombre   = categoriasLista.find((c) => c.id_categoria === producto.id_categoria)?.nombre || '—';
  const tamanoLabel = TAMANOS.find((t) => t.value === normalizarTamano(producto.tamano || ''))?.label || producto.tamano || '—';
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header fijo con X */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Detalle del producto</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {/* Contenido con scroll */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {producto.img && (
            <img src={imgCl(producto.img, 600, 400)} alt={producto.nombre} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
          )}
          <div style={{ padding: '16px 20px' }}>
            <div className="detalle-grid">
              <div className="detalle-item detalle-full">
                <span className="detalle-label">Nombre</span>
                <span className="detalle-valor">{producto.nombre}</span>
              </div>
              <div className="detalle-item">
                <span className="detalle-label">Estado</span>
                <span className="detalle-badge" style={{ background: producto.estado ? '#f0fdf4' : '#fff5f5', color: producto.estado ? '#22c55e' : '#CA0B0B' }}>
                  {producto.estado ? '● Activo' : '● Inactivo'}
                </span>
              </div>
              <div className="detalle-item">
                <span className="detalle-label">Categoría</span>
                <span className="detalle-valor">{catNombre}</span>
              </div>
              <div className="detalle-item">
                <span className="detalle-label">Tamaño</span>
                <span className="detalle-valor">{tamanoLabel}</span>
              </div>
              <div className="detalle-item">
                <span className="detalle-label">Precio</span>
                <span className="detalle-valor" style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 15 }}>{formatPrecio(producto.precio)}</span>
              </div>
              <div className="detalle-item detalle-full">
                <span className="detalle-label">Descripción</span>
                <span className="detalle-valor">{producto.descripcion || '—'}</span>
              </div>
              <div className="detalle-item">
                <span className="detalle-label">Toppings</span>
                <span className="detalle-badge" style={{ background: producto.permite_toppings ? '#f5f5f5' : '#fafafa', color: producto.permite_toppings ? '#1a1a1a' : '#999' }}>
                  {producto.permite_toppings ? `✓ Sí (máx. ${producto.max_toppings})` : '✗ No'}
                </span>
              </div>
              <div className="detalle-item">
                <span className="detalle-label">Chocolate</span>
                <span className="detalle-badge" style={{ background: producto.permite_chocolate ? '#f5f5f5' : '#fafafa', color: producto.permite_chocolate ? '#1a1a1a' : '#999' }}>
                  {producto.permite_chocolate ? '✓ Sí' : '✗ No'}
                </span>
              </div>
              <div className="detalle-item">
                <span className="detalle-label">Salsas</span>
                <span className="detalle-badge" style={{ background: producto.permite_salsas ? '#f5f5f5' : '#fafafa', color: producto.permite_salsas ? '#1a1a1a' : '#999' }}>
                  {producto.permite_salsas ? '✓ Sí' : '✗ No'}
                </span>
              </div>
              <div className="detalle-item">
                <span className="detalle-label">Bowl</span>
                <span className="detalle-badge" style={{ background: producto.es_bowl ? '#fef3c7' : '#fafafa', color: producto.es_bowl ? '#d97706' : '#999' }}>
                  {producto.es_bowl ? '🥣 Sí' : '✗ No'}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Footer fijo */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 13, color: '#555', fontFamily: 'inherit' }}>Cerrar</button>
          {onEditar && <button onClick={() => { onClose(); onEditar(producto); }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: '#CA0B0B', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>Editar</button>}
        </div>
      </div>
    </div>
  );
}

export default function Productos() {
  const [lista,           setLista]           = useState([]);
  const [categoriasLista, setCategoriasLista] = useState([]);
  const [busqueda,        setBusqueda]        = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [pagina,          setPagina]          = useState(1);
  const [modalAbierto,    setModalAbierto]    = useState(false);
  const [editando,        setEditando]        = useState(null);
  const [eliminando,      setEliminando]      = useState(null);
  const [detalle,         setDetalle]         = useState(null);
  const [procesando,      setProcesando]      = useState(false);

  const cargar = () => {
    api.listarProductos().then((d) => setLista(d.map((p) => ({ ...p, img: p.imagen || p.img || '' })))).catch(() => {});
    api.listarCategorias().then(setCategoriasLista).catch(() => {});
  };
  useEffect(() => { cargar(); }, []);
  useEffect(() => { setPagina(1); }, [busqueda, filtroCategoria]);

  const filtrados = lista.filter((p) => {
    const coincideBusqueda   = !busqueda.trim() || (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria  = filtroCategoria === 'todas' || String(p.id_categoria) === String(filtroCategoria);
    return coincideBusqueda && coincideCategoria;
  });
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const getCategoria = (id) => categoriasLista.find((c) => c.id_categoria === id)?.nombre || '—';
  const getTamanoLabel = (t) => TAMANOS.find((x) => x.value === normalizarTamano(t || ''))?.label || t || '—';
  const crear    = async (f) => { if (procesando) return; setProcesando(true); try { await api.crearProducto(f); cargar(); setModalAbierto(false); } catch (err) { throw err; } finally { setProcesando(false); } };
  const editar   = async (f) => { if (procesando) return; setProcesando(true); try { await api.actualizarProducto(editando.id_producto, f); cargar(); setEditando(null); } catch (err) { throw err; } finally { setProcesando(false); } };
  const eliminar = async () => {
    if (procesando) return; setProcesando(true);
    try { await api.eliminarProducto(eliminando.id_producto); cargar(); }
    catch (err) { toast.error(err?.response?.data?.message || 'No se pudo eliminar el producto'); }
    finally { setProcesando(false); setEliminando(null); }
  };
  const toggle = async (id, estadoActual) => { await api.estadoProducto(id, { estado: estadoActual ? 0 : 1 }).catch(() => {}); cargar(); };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Productos</h1>
          <p className="page-subtitulo">{lista.length} productos registrados</p>
        </div>
        <button className="btn-primario" onClick={() => setModalAbierto(true)}>+ Añadir producto</button>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <div className="buscador" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <Search size={14} color="#aaa" />
          <input placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, color: '#333', background: 'white', cursor: 'pointer', outline: 'none', minWidth: 180, fontFamily: 'inherit' }}
        >
          <option value="todas">Todas las categorías</option>
          {categoriasLista.map((cat) => (
            <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre}</option>
          ))}
        </select>
      </div>
      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>
        {filtrados.length} producto{filtrados.length !== 1 ? 's' : ''}
        {filtroCategoria !== 'todas' && ` en ${categoriasLista.find(c => String(c.id_categoria) === String(filtroCategoria))?.nombre || ''}`}
        {busqueda.trim() && ` con "${busqueda}"`}
      </div>

      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Tamaño</th>
              <th>Precio</th>
              <th>Toppings</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.length === 0 ? (
              <tr><td colSpan={7}><div className="tabla-vacia">No se encontraron productos</div></td></tr>
            ) : (
              paginados.map((p) => (
                <tr key={p.id_producto} style={{ opacity: p.estado === 0 ? 0.6 : 1 }}>
                  <td style={{ textTransform: 'capitalize' }}>
                    {p.img && <img src={imgCl(p.img, 56, 56)} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', marginRight: 8, verticalAlign: 'middle' }} />}
                    {p.nombre}
                  </td>
                  <td className="td-suave">{getCategoria(p.id_categoria)}</td>
                  <td className="td-suave">{getTamanoLabel(p.tamano)}</td>
                  <td style={{ fontWeight: 700, color: '#1a1a1a' }}>{formatPrecio(p.precio)}</td>
                  <td>
                    <span style={{ background: p.permite_toppings ? '#f5f5f5' : '#fafafa', color: p.permite_toppings ? '#1a1a1a' : '#999', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid #e0e0e0' }}>
                      {p.permite_toppings ? `Sí (máx. ${p.max_toppings})` : 'No'}
                    </span>
                  </td>
                  <td><Toggle activo={p.estado === 1} onChange={() => toggle(p.id_producto, p.estado)} /></td>
                  <td>
                    <div className="acciones">
                      <button className="btn-accion ver" onClick={() => setDetalle({ ...p })} title="Ver detalle">
                        <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button className="btn-accion editar" onClick={() => setEditando({ ...p })} title="Editar">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn-accion eliminar" onClick={() => setEliminando({ ...p })} title="Eliminar">
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

      {modalAbierto && <ModalFormulario key="nuevo" open={true} onClose={() => setModalAbierto(false)} onGuardar={crear} productoEditar={null} categoriasLista={categoriasLista} procesando={procesando} />}
      {editando    && <ModalFormulario key={`editar-${editando.id_producto}`} open={true} onClose={() => setEditando(null)} onGuardar={editar} productoEditar={editando} categoriasLista={categoriasLista} procesando={procesando} />}
      {eliminando  && <ModalEliminar  open={true} onClose={() => setEliminando(null)} onConfirmar={eliminar} nombre={eliminando?.nombre} procesando={procesando} />}
      {detalle     && <ModalDetalle   open={true} onClose={() => setDetalle(null)} producto={lista.find((p) => p.id_producto === detalle.id_producto)} categoriasLista={categoriasLista} onEditar={setEditando} />}
    </AdminLayout>
  );
}

