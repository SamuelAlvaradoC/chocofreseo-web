import { Link } from 'react-router-dom';
import { LogoInstagram, LogoTikTok, LogoWhatsApp, LogoFacebook } from '../../common/LogosApps';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-wrap">

        {/* Columna 1: Marca */}
        <div className="footer-marca">
          <div className="footer-logo">
            <img
              src="/img/logo.png"
              alt="ChocoFreseo"
              className="footer-logo-icono"
              style={{ objectFit: 'contain', background: 'none', boxShadow: 'none', width: 48, height: 48 }}
            />
            <span className="footer-logo-nombre">ChocoFreseo</span>
          </div>
          <p className="footer-desc">
            Postres con estética juvenil y sabores únicos.<br />
            Puro Freseo desde marzo 2024.
          </p>
          <div className="footer-redes">
            <a href="https://instagram.com/chocofreseo" target="_blank" rel="noopener noreferrer" className="footer-red" title="Instagram @chocofreseo">
              <LogoInstagram size={18}/>
            </a>
            <a href="https://tiktok.com/@chocofreseo" target="_blank" rel="noopener noreferrer" className="footer-red" title="TikTok @chocofreseo">
              <LogoTikTok size={18} color="white"/>
            </a>
            <a href="https://tiktok.com/@sorprendetupaladar" target="_blank" rel="noopener noreferrer" className="footer-red" title="TikTok @sorprendetupaladar">
              <LogoTikTok size={18} color="white"/>
            </a>
            <a href="https://www.facebook.com/share/1NiKgTtfUb/" target="_blank" rel="noopener noreferrer" className="footer-red" title="Facebook ChocoFreseo">
              <LogoFacebook size={18}/>
            </a>
            <a href="https://wa.me/573159914624" target="_blank" rel="noopener noreferrer" className="footer-red" title="WhatsApp">
              <LogoWhatsApp size={18}/>
            </a>
          </div>
        </div>

        {/* Columna 2: Navegación */}
        <div className="footer-col">
          <h4 className="footer-col-titulo">Navegación</h4>
          <Link to="/landing"  className="footer-link">Inicio</Link>
          <Link to="/catalogo" className="footer-link">Catálogo</Link>
          <Link to="/login"    className="footer-link">Iniciar sesión</Link>
          <Link to="/registro" className="footer-link">Registrarse</Link>
        </div>

        {/* Columna 3: Sedes */}
        <div className="footer-col">
          <h4 className="footer-col-titulo">Nuestras sedes</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#CA0B0B', textTransform: 'uppercase', letterSpacing: 1 }}>La Milagrosa</span>
            <span className="footer-contacto-item" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              Carrera 29 #42-49, Medellín
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#CA0B0B', textTransform: 'uppercase', letterSpacing: 1 }}>Aranjuez</span>
            <span className="footer-contacto-item" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              Calle 90 #50D-35, Medellín
            </span>
          </div>
        </div>

        {/* Columna 4: Horario y contacto */}
        <div className="footer-col">
          <h4 className="footer-col-titulo">Horario y contacto</h4>
          <div className="footer-horario-item">
            <span className="footer-horario-dia">Sedes · Todos los días</span>
            <span className="footer-horario-hora">3:00 PM — 9:00 PM</span>
          </div>
          <div className="footer-horario-item">
            <span className="footer-horario-dia">Domicilios · Todos los días</span>
            <span className="footer-horario-hora">1:00 PM — 8:00 PM</span>
          </div>
          <a href="https://wa.me/573159914624" target="_blank" rel="noopener noreferrer"
            className="footer-contacto-item" style={{ textDecoration: 'none', color: '#25D366', fontWeight: 600, marginTop: 8 }}>
            <LogoWhatsApp size={18}/> 315-991-46-24
          </a>
          <a href="mailto:chocofreseo@gmail.com"
            className="footer-contacto-item" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            chocofreseo@gmail.com
          </a>
        </div>

      </div>

      <div className="footer-bottom">
        <span>© 2026 ChocoFreseo. Todos los derechos reservados.</span>
        <span style={{ color: '#CA0B0B' }}>ChocoFreseo es Puro Freseo</span>
      </div>
    </footer>
  );
}
