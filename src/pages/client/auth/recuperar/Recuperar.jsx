import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../../../../services/api';
import './Recuperar.css';

export default function Recuperar() {
  const [paso,      setPaso]      = useState(1); // 1=email, 2=codigo+pass
  const [email,     setEmail]     = useState('');
  const [codigo,    setCodigo]    = useState('');
  const [nueva,     setNueva]     = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error,     setError]     = useState('');
  const [cargando,  setCargando]  = useState(false);
  const [exito,     setExito]     = useState(false);
  const [devToken,  setDevToken]  = useState('');
  const navigate = useNavigate();

  // ── Paso 1: solicitar código ─────────────────────────────────
  const handleSolicitar = async (e) => {
    e.preventDefault();
    if (!email.trim())                    { setError('Ingresa tu correo electrónico'); return; }
    if (!/\S+@\S+\.\S+/.test(email))      { setError('Ingresa un correo válido');      return; }
    setCargando(true);
    setError('');
    try {
      const resp = await api.solicitarReset({ email });
      if (resp?.dev_token) setDevToken(resp.dev_token);
      setPaso(2);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo procesar la solicitud');
    } finally {
      setCargando(false);
    }
  };

  // ── Paso 2: verificar código y cambiar contraseña ─────────────
  const handleCambiar = async (e) => {
    e.preventDefault();
    if (!codigo.trim() || codigo.length !== 6) { setError('Ingresa el código de 6 dígitos');             return; }
    if (!nueva.trim())                          { setError('Ingresa la nueva contraseña');                return; }
    if (nueva.length < 8)                       { setError('La contraseña debe tener mínimo 8 caracteres'); return; }
    if (nueva !== confirmar)                    { setError('Las contraseñas no coinciden');               return; }
    setCargando(true);
    setError('');
    try {
      await api.verificarReset({ email, codigo, nueva_password: nueva });
      setExito(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Código inválido o expirado');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-izquierda">
        <img src="https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778822634/logo_sin_fondo_remove_uuu8tt.png" alt="ChocoFreseo" className="login-logo" />
        <div className="login-nombre">ChocoFreseo</div>
        <h1 className="login-titulo">Recupera tu<br />contraseña</h1>
        <p className="login-subtitulo">Sin drama. En segundos recuperas el acceso. Puro Freseo 🍓</p>
        <div className="login-badge">
          <span className="login-badge-dot" />
          Domicilio a todo el Valle de Aburrá
        </div>
      </div>

      <div className="login-derecha">
        <div className="login-caja">
          {!exito && (
            <button className="lf-btn-volver" onClick={() => navigate('/login')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Volver a iniciar sesión
            </button>
          )}
          {exito ? (
            /* ── Éxito ─────────────────────────────────────────── */
            <div className="recuperar-exito">
              <div className="recuperar-icono">✅</div>
              <h2 className="login-caja-titulo">Contraseña actualizada</h2>
              <p className="login-caja-sub">Tu contraseña se cambió correctamente. Ya puedes iniciar sesión.</p>
              <button
                className="lf-btn-primario"
                style={{ marginTop: 24 }}
                onClick={() => navigate('/login')}
              >
                Iniciar sesión
              </button>
            </div>

          ) : paso === 1 ? (
            /* ── Paso 1: email ──────────────────────────────────── */
            <>
              <div className="login-caja-header">
                <h2 className="login-caja-titulo">Recuperar contraseña</h2>
                <p className="login-caja-sub">
                  Ingresa tu correo y te enviaremos un código de verificación
                </p>
              </div>
              <form onSubmit={handleSolicitar} className="login-form">
                <div className="lf-grupo">
                  <label className="lf-label">Correo electrónico</label>
                  <input
                    className="lf-input"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  />
                </div>
                {error && <div className="lf-error">{error}</div>}
                <button className="lf-btn-primario" type="submit" disabled={cargando}>
                  {cargando ? 'Enviando...' : 'Enviar código'}
                </button>
                <p className="lf-registro">
                  <Link to="/login" className="lf-link-bold">← Volver al inicio de sesión</Link>
                </p>
              </form>
            </>

          ) : (
            /* ── Paso 2: código + nueva contraseña ──────────────── */
            <>
              <div className="login-caja-header">
                <h2 className="login-caja-titulo">Nueva contraseña</h2>
                <p className="login-caja-sub">
                  Ingresa el código de 6 dígitos que enviamos a{' '}
                  <strong>{email}</strong>
                </p>
                {devToken && (
                  <div style={{ marginTop: 8, padding: '10px 14px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: '#92400e' }}>Código de desarrollo: </span>
                    <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, color: '#78350f', letterSpacing: '0.2em' }}>{devToken}</span>
                  </div>
                )}
              </div>
              <form onSubmit={handleCambiar} className="login-form">
                <div className="lf-grupo">
                  <label className="lf-label">Código de verificación</label>
                  <input
                    className="lf-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={codigo}
                    onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, '')); setError(''); }}
                    style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }}
                  />
                </div>
                <div className="lf-grupo">
                  <label className="lf-label">Nueva contraseña</label>
                  <input
                    className="lf-input"
                    type="password"
                    placeholder="••••••••"
                    value={nueva}
                    onChange={(e) => { setNueva(e.target.value); setError(''); }}
                  />
                </div>
                <div className="lf-grupo">
                  <label className="lf-label">Confirmar contraseña</label>
                  <input
                    className="lf-input"
                    type="password"
                    placeholder="••••••••"
                    value={confirmar}
                    onChange={(e) => { setConfirmar(e.target.value); setError(''); }}
                  />
                </div>
                {error && <div className="lf-error">{error}</div>}
                <button className="lf-btn-primario" type="submit" disabled={cargando}>
                  {cargando ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
                <p className="lf-registro">
                  <button
                    type="button"
                    className="lf-link-bold"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onClick={() => { setPaso(1); setError(''); setCodigo(''); }}
                  >
                    ← Volver
                  </button>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

