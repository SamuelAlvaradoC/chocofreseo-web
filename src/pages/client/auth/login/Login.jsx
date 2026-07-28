import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import './Login.css';

export default function Login() {
  const [email,      setEmail]      = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error,      setError]      = useState('');
  const [cargando,   setCargando]   = useState(false);
  const navigate        = useNavigate();
  const { loginConAPI } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !contrasena.trim()) {
      setError('Por favor completa todos los campos'); return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Ingresa un correo electrónico válido'); return;
    }
    setCargando(true);
    setError('');
    try {
      const usuario = await loginConAPI(email, contrasena);
      if (usuario.rol === 'admin' || usuario.rol === 'Administrador') {
        navigate('/admin/dashboard');
      } else if (usuario.rol === 'domiciliario' || usuario.rol === 'Domiciliario') {
        navigate('/domiciliario/pedidos');
      } else {
        navigate('/landing');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Email o contraseña incorrectos');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">

      {/* Panel izquierdo — marca */}
      <div className="login-izquierda">
        <img
          src="https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778822634/logo_sin_fondo_remove_uuu8tt.png"
          alt="ChocoFreseo"
          className="login-logo"
        />
        <div className="login-nombre">ChocoFreseo</div>
        <h1 className="login-titulo">Bienvenido<br />de nuevo</h1>
        <p className="login-subtitulo">Los mejores postres de Medellín te esperan.</p>
        <div className="login-badge">
          <span className="login-badge-dot" />
          Domicilio a todo el Valle de Aburrá
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="login-derecha">
        <div className="login-caja">
          <button className="lf-btn-volver" onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Volver al inicio
          </button>
          <div className="login-caja-header">
            <h2 className="login-caja-titulo">Bienvenido de nuevo</h2>
            <p className="login-caja-sub">Ingresa tus datos para continuar</p>
          </div>
          <form onSubmit={handleLogin} className="login-form">
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
            <div className="lf-grupo">
              <div className="lf-label-fila">
                <label className="lf-label">Contraseña</label>
                <Link to="/recuperar" className="lf-link">¿Olvidaste tu contraseña?</Link>
              </div>
              <input
                className="lf-input"
                type="password"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => { setContrasena(e.target.value); setError(''); }}
              />
            </div>
            {error && <div className="lf-error">{error}</div>}
            <button className="lf-btn-primario" type="submit" disabled={cargando}>
              {cargando ? 'Ingresando...' : 'Iniciar sesión →'}
            </button>
            <div className="lf-divisor"><span>o</span></div>
            <p className="lf-registro">
              ¿No tienes cuenta?{' '}
              <Link to="/registro" className="lf-link-bold">Regístrate</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

