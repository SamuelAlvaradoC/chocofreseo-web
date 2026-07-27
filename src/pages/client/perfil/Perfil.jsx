import { useState, useEffect } from 'react';
import { Check, User, Trash2 } from 'lucide-react';
import Navbar from '../../../components/layout/Navbar/Navbar';
import Footer from '../../../components/layout/Footer/Footer';
import { useAuth } from '../../../context/AuthContext';
import * as api from '../../../services/api';
import FormDireccion from '../../../components/common/FormDireccion';
import './Perfil.css';

function SeccionDatos({ usuario }) {
  const { actualizarUsuario } = useAuth();
  const [editando,   setEditando]   = useState(false);
  const [nombre,     setNombre]     = useState(usuario?.nombre    || '');
  const [telefono,   setTelefono]   = useState(usuario?.telefono  || '');
  const [guardado,   setGuardado]   = useState(false);
  const [error,      setError]      = useState('');
  const [procesando, setProcesando] = useState(false);

  const handleGuardar = async () => {
    if (procesando) return;
    setError('');
    if (!nombre.trim() || nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres'); return;
    }
    if (telefono && telefono.trim() !== '') {
      if (!/^3[0-9]{9}$/.test(telefono.trim())) {
        setError('El teléfono debe ser un número colombiano válido de 10 dígitos (ej: 3001234567)'); return;
      }
    }
    setProcesando(true);
    try {
      const u = await api.editarPerfil({ nombre: nombre.trim(), telefono: telefono.trim() || undefined });
      actualizarUsuario({ nombre: u.nombre, telefono: u.telefono });
      setEditando(false);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar');
    } finally { setProcesando(false); }
  };

  return (
    <div className="perfil-seccion">
      <div className="perfil-sec-header">
        <div>
          <h3 className="perfil-sec-titulo">Datos personales</h3>
          <p className="perfil-sec-sub">Tu información de contacto y entrega</p>
        </div>
        {!editando && (
          <button className="perfil-btn-editar" onClick={() => setEditando(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editar
          </button>
        )}
      </div>

      {guardado && <div className="perfil-alerta-ok" style={{display:'flex',alignItems:'center',gap:6}}><Check size={14}/>Datos actualizados correctamente</div>}
      {error && <div className="perfil-alerta-err">{error}</div>}

      {!editando ? (
        <div className="perfil-datos-grid">
          <div className="perfil-dato-item">
            <span className="perfil-dato-label">Nombre</span>
            <span className="perfil-dato-valor">{nombre || '—'}</span>
          </div>
          <div className="perfil-dato-item">
            <span className="perfil-dato-label">Email</span>
            <span className="perfil-dato-valor">{usuario?.email || '—'}</span>
          </div>
          <div className="perfil-dato-item">
            <span className="perfil-dato-label">Teléfono</span>
            <span className="perfil-dato-valor">{telefono || '—'}</span>
          </div>
          <div className="perfil-dato-item">
            <span className="perfil-dato-label">Rol</span>
            <span className="perfil-dato-valor">{usuario?.rol || '—'}</span>
          </div>
        </div>
      ) : (
        <div className="perfil-form">
          <div className="perfil-form-fila">
            <div className="perfil-campo">
              <label className="perfil-label">Nombre</label>
              <input className="perfil-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="perfil-campo">
              <label className="perfil-label">Email</label>
              <input className="perfil-input" value={usuario?.email || ''} disabled style={{ opacity: .5 }} />
            </div>
          </div>
          <div className="perfil-form-fila">
            <div className="perfil-campo">
              <label className="perfil-label">Teléfono</label>
              <input className="perfil-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 3001234567" maxLength={10} />
            </div>
          </div>
          <div className="perfil-form-botones">
            <button className="perfil-btn-sec" onClick={() => setEditando(false)}>Cancelar</button>
            <button className="perfil-btn-pri" onClick={handleGuardar} disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SeccionContrasena() {
  const [actual,     setActual]     = useState('');
  const [nueva,      setNueva]      = useState('');
  const [confirmar,  setConfirmar]  = useState('');
  const [error,      setError]      = useState('');
  const [ok,         setOk]         = useState(false);
  const [procesando, setProcesando] = useState(false);

  const handleCambiar = async () => {
    if (procesando) return;
    if (!actual.trim() || !nueva.trim() || !confirmar.trim()) { setError('Completa todos los campos'); return; }
    if (nueva !== confirmar) { setError('Las contraseñas no coinciden'); return; }
    if (nueva.length < 6)    { setError('Mínimo 6 caracteres'); return; }
    setError('');
    setProcesando(true);
    try {
      await api.cambiarContrasenaAuth({ contrasena_actual: actual, nueva_contrasena: nueva });
      setOk(true);
      setActual(''); setNueva(''); setConfirmar('');
      setTimeout(() => setOk(false), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cambiar contraseña');
    } finally { setProcesando(false); }
  };

  return (
    <div className="perfil-seccion">
      <div className="perfil-sec-header">
        <div>
          <h3 className="perfil-sec-titulo">Cambiar contraseña</h3>
          <p className="perfil-sec-sub">Elige una contraseña segura de mínimo 6 caracteres</p>
        </div>
      </div>
      {ok    && <div className="perfil-alerta-ok" style={{display:'flex',alignItems:'center',gap:6}}><Check size={14}/>Contraseña actualizada correctamente</div>}
      {error && <div className="perfil-alerta-err">{error}</div>}
      <div className="perfil-form">
        <div className="perfil-campo">
          <label className="perfil-label">Contraseña actual</label>
          <input className="perfil-input" type="password" placeholder="••••••••" value={actual} onChange={(e) => { setActual(e.target.value); setError(''); }} />
        </div>
        <div className="perfil-form-fila">
          <div className="perfil-campo">
            <label className="perfil-label">Nueva contraseña</label>
            <input className="perfil-input" type="password" placeholder="••••••••" value={nueva} onChange={(e) => { setNueva(e.target.value); setError(''); }} />
          </div>
          <div className="perfil-campo">
            <label className="perfil-label">Confirmar contraseña</label>
            <input className="perfil-input" type="password" placeholder="••••••••" value={confirmar} onChange={(e) => { setConfirmar(e.target.value); setError(''); }} />
          </div>
        </div>
        <div className="perfil-form-botones">
          <button className="perfil-btn-pri" onClick={handleCambiar} disabled={procesando}>{procesando ? 'Guardando...' : 'Cambiar contraseña'}</button>
        </div>
      </div>
    </div>
  );
}

function SeccionDirecciones({ usuario }) {
  const [direcciones,      setDirecciones]      = useState([]);
  const [cargando,         setCargando]         = useState(true);
  const [agregando,        setAgregando]        = useState(false);
  const [nuevaDireccion,   setNuevaDireccion]   = useState({ direccion_linea: '', barrio: '', ciudad: '', id_barrio: null, id_ciudad: null, referencia: '', tipo_via: '', numero: '', numeral: '', complemento: '' });
  const [errDir,           setErrDir]           = useState({});
  const [error,            setError]            = useState('');
  const [procesando,       setProcesando]       = useState(false);
  const [confirmarEliminar,setConfirmarEliminar]= useState(null);

  useEffect(() => {
    api.misDirecciones()
      .then((data) => setDirecciones((data || []).filter((d) => d.estado !== 0)))
      .catch(() => setDirecciones([]))
      .finally(() => setCargando(false));
  }, []);

  const handleAgregar = async () => {
    if (procesando) return;
    const errs = {};
    if (!nuevaDireccion.tipo_via)                    errs.tipo_via        = 'Selecciona el tipo de vía';
    if (!nuevaDireccion.numero?.trim())              errs.numero          = 'Ingresa el número de la vía';
    if (!nuevaDireccion.numeral?.trim())             errs.numeral         = 'Ingresa el numeral';
    if (!nuevaDireccion.complemento?.trim())         errs.complemento     = 'Ingresa el complemento';
    if (!nuevaDireccion.direccion_linea?.trim())     errs.direccion_linea = 'Ingresa la dirección';
    if (!nuevaDireccion.id_barrio)                   errs.barrio          = 'Selecciona el barrio';
    if (!nuevaDireccion.ciudad?.trim())              errs.ciudad          = 'Selecciona el municipio';
    if (Object.keys(errs).length > 0) { setErrDir(errs); return; }
    setProcesando(true);
    try {
      const nueva = await api.crearMiDireccion({
        direccion_linea: nuevaDireccion.direccion_linea,
        barrio:          nuevaDireccion.barrio       || null,
        ciudad:          nuevaDireccion.ciudad       || null,
        id_barrio:       nuevaDireccion.id_barrio    || null,
        referencia:      nuevaDireccion.referencia   || null,
      });
      setDirecciones((p) => [...p, nueva]);
      setNuevaDireccion({ direccion_linea: '', barrio: '', ciudad: '', id_barrio: null, id_ciudad: null, referencia: '', tipo_via: '', numero: '', numeral: '', complemento: '' });
      setErrDir({});
      setAgregando(false);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar dirección');
    } finally { setProcesando(false); }
  };

  const handleEliminar = async (id) => {
    if (procesando) return;
    setProcesando(true);
    try {
      await api.eliminarMiDireccion(id);
      setDirecciones((p) => p.filter((d) => d.id_direccion !== id));
      setConfirmarEliminar(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al eliminar dirección');
    } finally { setProcesando(false); }
  };

  return (
    <div className="perfil-seccion">
      <div className="perfil-sec-header">
        <div>
          <h3 className="perfil-sec-titulo">Mis direcciones</h3>
          <p className="perfil-sec-sub">{direcciones.length} direcciones guardadas</p>
        </div>
        <button className="perfil-btn-editar" onClick={() => { setAgregando(!agregando); setError(''); }}>+ Agregar</button>
      </div>

      {error && <div className="perfil-alerta-err">{error}</div>}

      {agregando && (
        <div className="perfil-form perfil-form-nueva-dir">
          <FormDireccion
            value={nuevaDireccion}
            onChange={(f, v) => {
              setNuevaDireccion((p) => ({ ...p, [f]: v }));
              setErrDir((p) => ({ ...p, [f]: '' }));
            }}
            errors={errDir}
            layout="client"
          />
          <div className="perfil-form-botones">
            <button className="perfil-btn-sec" onClick={() => { setAgregando(false); setErrDir({}); }}>Cancelar</button>
            <button className="perfil-btn-pri" onClick={handleAgregar} disabled={procesando}>{procesando ? 'Guardando...' : 'Guardar dirección'}</button>
          </div>
        </div>
      )}

      <div className="direcciones-lista">
        {cargando ? (
          <div className="perfil-vacio"><p>Cargando...</p></div>
        ) : direcciones.length === 0 && !agregando ? (
          <div className="perfil-vacio"><span style={{ fontSize: 36 }}>📍</span><p>No tienes direcciones guardadas</p></div>
        ) : (
          direcciones.map((dir) => (
            <div key={dir.id_direccion} style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 12, padding: '14px 16px',
              marginBottom: 10
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', gap: 10
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
                    {dir.direccion_linea}
                  </div>
                  <div style={{ fontSize: 13, color: '#888' }}>
                    {[dir.barrio, dir.ciudad].filter(Boolean).join(', ')}
                  </div>
                  {dir.referencia && (
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                      Ref: {dir.referencia}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setConfirmarEliminar(dir)}
                  disabled={procesando}
                  style={{
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: '#CA0B0B',
                    padding: 4, flexShrink: 0
                  }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmarEliminar && (
        <div
          onClick={() => setConfirmarEliminar(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 16, padding: '28px 24px', maxWidth: 340, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CA0B0B" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', margin: '0 0 8px' }}>
              ¿Eliminar dirección?
            </h3>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 6px', lineHeight: 1.5 }}>
              {confirmarEliminar.direccion_linea}
            </p>
            <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 20px' }}>
              {[confirmarEliminar.barrio, confirmarEliminar.ciudad].filter(Boolean).join(', ')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmarEliminar(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#555', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(confirmarEliminar.id_direccion)}
                disabled={procesando}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: procesando ? '#e5e7eb' : '#CA0B0B', color: procesando ? '#aaa' : 'white', fontWeight: 700, fontSize: 13, cursor: procesando ? 'not-allowed' : 'pointer' }}>
                {procesando ? '...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function Perfil() {
  const [seccionActiva, setSeccionActiva] = useState('datos');
  const [puntos,        setPuntos]        = useState({ puntos: 0, saldo_pesos: 0, movimientos: [] });
  const { usuario }     = useAuth();

  const puedeVerPuntos = ['cliente', 'domiciliario', 'admin'].includes(usuario?.rol);

  useEffect(() => {
    if (!puedeVerPuntos) return;
    api.getMisPuntos().then(setPuntos).catch(() => {});
  }, [puedeVerPuntos]);

  const menu = [
    { id: 'datos',       label: 'Datos personales',  icono: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { id: 'contrasena',  label: 'Cambiar contraseña', icono: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
    { id: 'direcciones', label: 'Mis direcciones',    icono: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
  ];

  return (
    <div className="perfil-wrapper">
      <Navbar />
      <div className="perfil-page">
        <div className="perfil-hero">
          <div className="perfil-hero-avatar">
            <User size={34} strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="perfil-hero-nombre">{usuario?.nombre || 'Usuario'}</h1>
            <p className="perfil-hero-email">{usuario?.email || ''}</p>
          </div>
          {puedeVerPuntos && (
            <div style={{
              background: 'linear-gradient(135deg, #CA0B0B, #8B0000)',
              borderRadius: 16, padding: '20px 24px',
              color: 'white', flexShrink: 0
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 1,
                opacity: 0.8, marginBottom: 16
              }}>
                Mis puntos ChocoFreseo
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}>
                    {puntos?.puntos || 0}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    puntos disponibles
                  </div>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.3)', alignSelf: 'stretch' }} />
                <div>
                  <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}>
                    ${((puntos?.puntos || 0) * 12.5).toLocaleString('es-CO')}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    saldo disponible
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 12 }}>
                1 punto = $12.50 · Se acumulan con cada compra
              </div>
            </div>
          )}
        </div>

        <div className="perfil-layout">
          <aside className="perfil-sidebar perfil-tabs">
            {menu.map((item) => (
              <button
                key={item.id}
                className={`perfil-menu-item ${seccionActiva === item.id ? 'activo' : ''} ${item.peligro ? 'peligro' : ''}`}
                onClick={() => setSeccionActiva(item.id)}
              >
                {item.icono}
                <span>{item.label}</span>
              </button>
            ))}
          </aside>

          <div className="perfil-contenido">
            {seccionActiva === 'datos'       && <SeccionDatos       usuario={usuario} />}
            {seccionActiva === 'contrasena'  && <SeccionContrasena  />}
            {seccionActiva === 'direcciones' && <SeccionDirecciones usuario={usuario} />}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}