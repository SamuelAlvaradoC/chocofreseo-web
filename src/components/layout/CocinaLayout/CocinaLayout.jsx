import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './CocinaLayout.css';

export default function CocinaLayout({ children }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="cocina-layout">
      <header className="cocina-topbar">
        <div className="cocina-topbar-marca">
          <img src="/img/logo.png" alt="ChocoFreseo" className="cocina-topbar-logo" style={{ objectFit: 'contain', background: 'none' }} />
          <span className="cocina-topbar-nombre">ChocoFreseo</span>
        </div>
        <span className="cocina-topbar-rol">👨‍🍳 Panel Cocina</span>
        <button className="cocina-topbar-btn" onClick={handleLogout} title="Cerrar sesión">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Salir
        </button>
      </header>
      <main className="cocina-main">{children}</main>
    </div>
  );
}

