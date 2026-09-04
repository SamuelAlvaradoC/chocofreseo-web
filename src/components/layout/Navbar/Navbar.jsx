import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Bike, LayoutDashboard, ChefHat, User } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const [menuAbierto,   setMenuAbierto]   = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const perfilRef = useRef(null);
  const location  = useLocation();
  const navigate  = useNavigate();
  const { usuario, logout } = useAuth();

  useEffect(() => {
    if (!perfilAbierto) return;
    const handler = (e) => {
      if (perfilRef.current && !perfilRef.current.contains(e.target)) {
        setPerfilAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [perfilAbierto]);

  const handleNosotros = (e) => {
    e.preventDefault();
    setMenuAbierto(false);
    if (location.pathname === '/landing') {
      document.querySelector('#nosotros')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/landing');
      setTimeout(() => document.querySelector('#nosotros')?.scrollIntoView({ behavior: 'smooth' }), 400);
    }
  };

  const links = [
    { label: 'Inicio',    path: '/landing'   },
    { label: 'Catálogo',  path: '/catalogo'  },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuAbierto(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-wrap">
        <Link to="/landing" className="navbar-logo">
          <img src="https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778822634/logo_sin_fondo_remove_uuu8tt.png" alt="ChocoFreseo" className="navbar-logo-icono" style={{ objectFit: 'contain', background: 'none', boxShadow: 'none' }} />
          <span className="navbar-logo-nombre">ChocoFreseo</span>
        </Link>

        <div className="navbar-links">
          {links.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className={`navbar-link ${location.pathname === l.path ? 'activo' : ''}`}
            >
              {l.label}
            </Link>
          ))}
          <a href="#nosotros" className="navbar-link" onClick={handleNosotros}>Nosotros</a>

          {/* Panel por rol */}
          {usuario?.rol === 'admin'                  && <Link to="/admin/dashboard"        className="navbar-link admin-link">Panel Admin</Link>}
          {usuario?.rol === 'domiciliario'           && <Link to="/domiciliario/pedidos"   className="navbar-link domi-link"><Bike size={15} style={{display:'inline',verticalAlign:'middle',marginRight:4}} />Panel Domiciliario</Link>}
          {usuario?.rol === 'cocinero'               && <Link to="/cocina"                 className="navbar-link admin-link"><ChefHat size={15} style={{display:'inline',verticalAlign:'middle',marginRight:4}} />Panel Cocina</Link>}
          {usuario?.rol === 'confirmador_domicilio'  && <Link to="/admin/domicilios"       className="navbar-link admin-link">Confirmar Pedidos</Link>}
        </div>

        <div className="navbar-acciones">
          {usuario ? (
            <>
              <div className="navbar-perfil-wrap" ref={perfilRef}>
                <button className="navbar-perfil-btn" onClick={() => setPerfilAbierto((v) => !v)}>
                  <div className="navbar-perfil-avatar"><User size={16} strokeWidth={2.5} /></div>
                  <span className="navbar-perfil-nombre">{usuario.nombre}</span>
                </button>
                {perfilAbierto && (
                  <div className="navbar-perfil-dropdown">
                    <Link
                      to="/perfil"
                      className="navbar-perfil-dropdown-item"
                      onClick={() => setPerfilAbierto(false)}
                    >
                      <User size={14} strokeWidth={2} />
                      Mi perfil
                    </Link>
                  </div>
                )}
              </div>
              <button className="navbar-btn-login" onClick={handleLogout}>Cerrar sesión</button>
            </>
          ) : (
            <>
              <Link to="/login"    className="navbar-btn-login">Iniciar sesión</Link>
              <Link to="/registro" className="navbar-btn-registro">Registrarse</Link>
            </>
          )}
        </div>

        <button className="navbar-hamburguesa" onClick={() => setMenuAbierto(!menuAbierto)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {menuAbierto
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>
      </div>

      {/* Menú mobile */}
      {menuAbierto && (
        <div className="navbar-mobile">
          {links.map((l) => (
            <Link key={l.path} to={l.path} className="navbar-mobile-link" onClick={() => setMenuAbierto(false)}>
              {l.label}
            </Link>
          ))}
          <a href="#nosotros" className="navbar-mobile-link" onClick={handleNosotros}>Nosotros</a>

          {/* Panel por rol — mobile */}
          {usuario?.rol === 'admin'                 && <Link to="/admin/dashboard"      className="navbar-mobile-link admin-highlight" onClick={() => setMenuAbierto(false)}><LayoutDashboard size={15} style={{display:'inline',verticalAlign:'middle',marginRight:4}} />Panel Administrador</Link>}
          {usuario?.rol === 'domiciliario'          && <Link to="/domiciliario/pedidos" className="navbar-mobile-link domi-highlight"  onClick={() => setMenuAbierto(false)}><Bike size={15} style={{display:'inline',verticalAlign:'middle',marginRight:4}} />Panel Domiciliario</Link>}
          {usuario?.rol === 'cocinero'              && <Link to="/cocina"               className="navbar-mobile-link admin-highlight" onClick={() => setMenuAbierto(false)}><ChefHat size={15} style={{display:'inline',verticalAlign:'middle',marginRight:4}} />Panel Cocina</Link>}
          {usuario?.rol === 'confirmador_domicilio' && <Link to="/admin/domicilios"     className="navbar-mobile-link admin-highlight" onClick={() => setMenuAbierto(false)}>Confirmar Pedidos</Link>}

          <div className="navbar-mobile-acciones">
            {usuario ? (
              <>
                <Link to="/perfil" className="navbar-btn-registro" onClick={() => setMenuAbierto(false)}>Mi perfil</Link>
                <button className="navbar-btn-login" onClick={handleLogout}>Cerrar sesión</button>
              </>
            ) : (
              <>
                <Link to="/login"    className="navbar-btn-login"    onClick={() => setMenuAbierto(false)}>Iniciar sesión</Link>
                <Link to="/registro" className="navbar-btn-registro" onClick={() => setMenuAbierto(false)}>Registrarse</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
