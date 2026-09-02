import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import * as api from '../../../../services/api';
import { contieneEtiquetaHtml, MSG_HTML } from '../../../../utils/validarSinHtml';
import './Registro.css';

export default function Registro() {
  const [nombre,     setNombre]     = useState('');
  const [email,      setEmail]      = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar,  setConfirmar]  = useState('');
  const [error,      setError]      = useState('');
  const [cargando,   setCargando]   = useState(false);
  const navigate        = useNavigate();
  const { loginConAPI } = useAuth();

  const handleRegistro = async (e) => {
    e.preventDefault();
    if (!nombre.trim())    { setError('El nombre es obligatorio'); return; }
    if (nombre.trim().length < 2) { setError('El nombre debe tener al menos 2 caracteres'); return; }
    if (contieneEtiquetaHtml(nombre)) { setError(MSG_HTML); return; }
    if (!email.trim())     { setError('El correo electrónico es obligatorio'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Ingresa un correo electrónico válido'); return; }
    if (!contrasena.trim()) { setError('La contraseña es obligatoria'); return; }
    if (contrasena.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (!confirmar.trim()) { setError('Confirma tu contraseña'); return; }
    if (contrasena !== confirmar) { setError('Las contraseñas no coinciden'); return; }

    setCargando(true);
    setError('');
    try {
      await api.register({ nombre: nombre.trim(), email: email.trim().toLowerCase(), contrasena, id_rol: 4 });
      await loginConAPI(email.trim().toLowerCase(), contrasena);
      navigate('/landing');
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al crear la cuenta. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-izquierda">
        <img src="https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778822634/logo_sin_fondo_remove_uuu8tt.png" alt="ChocoFreseo" className="login-logo" />
        <div className="login-nombre">ChocoFreseo</div>
        <h1 className="login-titulo">Únete a la<br />familia</h1>
        <p className="login-subtitulo">Regístrate y disfruta de ChocoNachos, ChocoBowls, Fresas con chocolate y mucho más.</p>
        <div className="login-badge">
          <span className="login-badge-dot" />
          Domicilio a todo el Valle de Aburrá
        </div>
      </div>

      <div className="login-derecha">
        <div className="login-caja">
          <button className="lf-btn-volver" onClick={() => navigate('/login')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Volver a iniciar sesión
          </button>
          <h2 className="login-caja-titulo">Crear cuenta</h2>
          <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 700, margin: '4px 0 0', fontFamily: 'Nunito, sans-serif' }}>
            🎁 ¡Gana 200 puntos solo por registrarte!
          </p>
          <form onSubmit={handleRegistro} className="login-form">
            <div className="lf-grupo">
              <label className="lf-label">Nombre completo</label>
              <input className="lf-input" type="text" placeholder="Ej: Ana Gómez" value={nombre} onChange={(e) => { setNombre(e.target.value); setError(''); }} />
            </div>
            <div className="lf-grupo">
              <label className="lf-label">Correo electrónico</label>
              <input className="lf-input" type="email" placeholder="correo@ejemplo.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} />
            </div>
            <div className="lf-grupo">
              <label className="lf-label">Contraseña</label>
              <input className="lf-input" type="password" placeholder="Mínimo 8 caracteres" value={contrasena} onChange={(e) => { setContrasena(e.target.value); setError(''); }} />
            </div>
            <div className="lf-grupo">
              <label className="lf-label">Confirmar contraseña</label>
              <input className="lf-input" type="password" placeholder="Repite tu contraseña" value={confirmar} onChange={(e) => { setConfirmar(e.target.value); setError(''); }} />
            </div>
            {error && <div className="lf-error">{error}</div>}
            <button className="lf-btn-primario" type="submit" disabled={cargando}>
              {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
            <p className="lf-registro">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="lf-link-bold">Inicia sesión</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

