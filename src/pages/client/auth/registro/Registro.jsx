import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import * as api from '../../../../services/api';
import useDebounce from '../../../../hooks/useDebounce';
import './Registro.css';

// Reglas de frontend más estrictas que registerSchema en el backend
// (auth/schema.js exige solo min(2) + sin HTML) -- una cadena que solo
// tenga letras/espacios/tildes nunca puede contener una etiqueta HTML, así
// que ese chequeo queda cubierto por esta regla, no hace falta repetirlo.
const validarNombre = (v) => {
  const t = v.trim();
  if (!t) return 'El nombre es obligatorio';
  if (t.length < 3) return 'El nombre debe tener al menos 3 caracteres';
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/.test(t)) return 'El nombre solo puede contener letras y espacios';
  return '';
};
// Mismo regex estándar (WHATWG/HTML5) en las 4 pantallas de auth (React y
// Flutter) -- más estricto que \S+@\S+\.\S+ (que aceptaba casi cualquier
// cosa con un @ y un punto), pero sigue aceptando dominios con una
// etiqueta de 1 caracter (ej. samuel@M.gamil.com) por ser sintácticamente
// válidos -- no hay forma de detectar ese typo sin una lista de dominios
// conocidos, y no es lo que se pidió aquí.
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const validarEmail = (v) => {
  if (!v.trim()) return 'El correo electrónico es obligatorio';
  if (!EMAIL_REGEX.test(v.trim())) return 'Ingresa un correo electrónico válido';
  return '';
};
const validarContrasena = (v) => {
  if (!v.trim()) return 'La contraseña es obligatoria';
  if (v.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  return '';
};
// Regla exclusiva de frontend -- el backend nunca recibe "confirmar".
const validarConfirmar = (v, contrasenaVal) => {
  if (!v.trim()) return 'Confirma tu contraseña';
  if (v !== contrasenaVal) return 'Las contraseñas no coinciden';
  return '';
};

export default function Registro() {
  const [nombre,     setNombre]     = useState('');
  const [email,      setEmail]      = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar,  setConfirmar]  = useState('');
  const [errores,    setErrores]    = useState({});
  const [cargando,   setCargando]   = useState(false);
  const [verContrasena, setVerContrasena] = useState(false);
  const [verConfirmar,  setVerConfirmar]  = useState(false);
  const navigate        = useNavigate();
  const { loginConAPI } = useAuth();

  // Un debounce por campo -- cada uno valida 400ms después de que el
  // usuario deja de escribir EN ESE campo. Al validar contraseña, si
  // confirmar ya tiene texto, se revisa de nuevo contra el valor nuevo
  // (evita que quede marcada "coincide" con una contraseña que ya cambió).
  const debounceNombre     = useDebounce((v) => setErrores((p) => ({ ...p, nombre: validarNombre(v) })), 400);
  const debounceEmail      = useDebounce((v) => setErrores((p) => ({ ...p, email: validarEmail(v) })), 400);
  const debounceContrasena = useDebounce((v) => setErrores((p) => ({
    ...p,
    contrasena: validarContrasena(v),
    ...(confirmar ? { confirmar: validarConfirmar(confirmar, v) } : {}),
  })), 400);
  const debounceConfirmar  = useDebounce((v) => setErrores((p) => ({ ...p, confirmar: validarConfirmar(v, contrasena) })), 400);

  const handleRegistro = async (e) => {
    e.preventDefault();
    const errs = {
      nombre:     validarNombre(nombre),
      email:      validarEmail(email),
      contrasena: validarContrasena(contrasena),
      confirmar:  validarConfirmar(confirmar, contrasena),
    };
    if (Object.values(errs).some(Boolean)) { setErrores(errs); return; }

    setCargando(true);
    setErrores({});
    try {
      await api.register({ nombre: nombre.trim(), email: email.trim().toLowerCase(), contrasena, id_rol: 4 });
      await loginConAPI(email.trim().toLowerCase(), contrasena);
      navigate('/landing');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al crear la cuenta. Inténtalo de nuevo.';
      if (msg.toLowerCase().includes('correo') || msg.toLowerCase().includes('email')) {
        setErrores((p) => ({ ...p, email: msg }));
      } else {
        setErrores((p) => ({ ...p, _general: msg }));
      }
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
              <input
                className={`lf-input${errores.nombre ? ' input-error' : ''}`}
                type="text" placeholder="Ej: Ana Gómez" value={nombre}
                onChange={(e) => { const v = e.target.value; setNombre(v); setErrores((p) => ({ ...p, nombre: '' })); debounceNombre(v); }}
                onBlur={() => setErrores((p) => ({ ...p, nombre: validarNombre(nombre) }))}
              />
              {errores.nombre && <span className="form-error">{errores.nombre}</span>}
            </div>
            <div className="lf-grupo">
              <label className="lf-label">Correo electrónico</label>
              <input
                className={`lf-input${errores.email ? ' input-error' : ''}`}
                type="email" placeholder="correo@ejemplo.com" value={email}
                onChange={(e) => { const v = e.target.value; setEmail(v); setErrores((p) => ({ ...p, email: '' })); debounceEmail(v); }}
                onBlur={() => setErrores((p) => ({ ...p, email: validarEmail(email) }))}
              />
              {errores.email && <span className="form-error">{errores.email}</span>}
            </div>
            <div className="lf-grupo">
              <label className="lf-label">Contraseña</label>
              <div className="lf-input-wrap">
                <input
                  className={`lf-input${errores.contrasena ? ' input-error' : ''}`}
                  type={verContrasena ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={contrasena}
                  onChange={(e) => { const v = e.target.value; setContrasena(v); setErrores((p) => ({ ...p, contrasena: '' })); debounceContrasena(v); }}
                  onBlur={() => setErrores((p) => ({
                    ...p,
                    contrasena: validarContrasena(contrasena),
                    ...(confirmar ? { confirmar: validarConfirmar(confirmar, contrasena) } : {}),
                  }))}
                />
                <button
                  type="button"
                  className="lf-toggle-pass"
                  onClick={() => setVerContrasena((v) => !v)}
                  aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {verContrasena ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errores.contrasena && <span className="form-error">{errores.contrasena}</span>}
            </div>
            <div className="lf-grupo">
              <label className="lf-label">Confirmar contraseña</label>
              <div className="lf-input-wrap">
                <input
                  className={`lf-input${errores.confirmar ? ' input-error' : ''}`}
                  type={verConfirmar ? 'text' : 'password'} placeholder="Repite tu contraseña" value={confirmar}
                  onChange={(e) => { const v = e.target.value; setConfirmar(v); setErrores((p) => ({ ...p, confirmar: '' })); debounceConfirmar(v); }}
                  onBlur={() => setErrores((p) => ({ ...p, confirmar: validarConfirmar(confirmar, contrasena) }))}
                />
                <button
                  type="button"
                  className="lf-toggle-pass"
                  onClick={() => setVerConfirmar((v) => !v)}
                  aria-label={verConfirmar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {verConfirmar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errores.confirmar && <span className="form-error">{errores.confirmar}</span>}
            </div>
            {errores._general && <p className="error-general">{errores._general}</p>}
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

