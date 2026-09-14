import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import useDebounce from '../../../../hooks/useDebounce';
import './Login.css';

// El backend (loginSchema) solo exige formato de email válido y contraseña
// no vacía (mínimo 6, pero eso no es algo que valga la pena exigir en
// tiempo real -- el login no es donde se exige fortaleza de contraseña).
// Mismo regex estándar (WHATWG/HTML5) que Registro.jsx -- ver el comentario
// ahí sobre por qué sigue aceptando dominios de 1 caracter.
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const validarEmail = (v) => {
  if (!v.trim()) return 'El correo electrónico es obligatorio';
  if (!EMAIL_REGEX.test(v.trim())) return 'Ingresa un correo electrónico válido';
  return '';
};
const validarContrasena = (v) => {
  if (!v.trim()) return 'La contraseña es obligatoria';
  return '';
};

export default function Login() {
  const [email,      setEmail]      = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores,    setErrores]    = useState({});
  const [cargando,   setCargando]   = useState(false);
  const navigate        = useNavigate();
  const { loginConAPI } = useAuth();

  const debounceEmail      = useDebounce((v) => setErrores((p) => ({ ...p, email: validarEmail(v) })), 400);
  const debounceContrasena = useDebounce((v) => setErrores((p) => ({ ...p, contrasena: validarContrasena(v) })), 400);

  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = { email: validarEmail(email), contrasena: validarContrasena(contrasena) };
    if (Object.values(errs).some(Boolean)) { setErrores(errs); return; }

    setCargando(true);
    setErrores({});
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
      setErrores({ _general: err?.response?.data?.message || 'Email o contraseña incorrectos' });
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
                className={`lf-input${errores.email ? ' input-error' : ''}`}
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => { const v = e.target.value; setEmail(v); setErrores((p) => ({ ...p, email: '' })); debounceEmail(v); }}
                onBlur={() => setErrores((p) => ({ ...p, email: validarEmail(email) }))}
              />
              {errores.email && <span className="form-error">{errores.email}</span>}
            </div>
            <div className="lf-grupo">
              <div className="lf-label-fila">
                <label className="lf-label">Contraseña</label>
                <Link to="/recuperar" className="lf-link">¿Olvidaste tu contraseña?</Link>
              </div>
              <input
                className={`lf-input${errores.contrasena ? ' input-error' : ''}`}
                type="password"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => { const v = e.target.value; setContrasena(v); setErrores((p) => ({ ...p, contrasena: '' })); debounceContrasena(v); }}
                onBlur={() => setErrores((p) => ({ ...p, contrasena: validarContrasena(contrasena) }))}
              />
              {errores.contrasena && <span className="form-error">{errores.contrasena}</span>}
            </div>
            {errores._general && <p className="error-general">{errores._general}</p>}
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

