import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Truck, DollarSign, Menu } from 'lucide-react';
import Topbar from '../Topbar';
import './DomiciliarioLayout.css';

const navItems = [
  { key: 'pedidos', path: '/domiciliario/pedidos', label: 'Pedidos',      icon: <Truck      size={18} /> },
  { key: 'caja',    path: '/domiciliario/caja',    label: 'Total del día', icon: <DollarSign size={18} /> },
];

export default function DomiciliarioLayout({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="domi-layout">

      {/* Header con botón hamburguesa */}
      <div className="domi-topbar-wrapper">
        {!open && (
          <button
            className="domi-hamburger"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
        )}
        <Topbar />
      </div>

      {/* Overlay oscuro detrás del drawer */}
      {open && <div className="domi-overlay" onClick={() => setOpen(false)} />}

      {/* Drawer deslizable */}
      <aside className={`domi-drawer${open ? ' domi-drawer--open' : ''}`}>

        {/* Header del drawer */}
        <div className="domi-drawer-header">
          <img
            src="https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778822634/logo_sin_fondo_remove_uuu8tt.png"
            alt="ChocoFreseo"
            className="domi-drawer-header-logo"
          />
          <span className="domi-drawer-header-texto">ChocoFreseo</span>
        </div>

        {/* Nav */}
        <nav className="domi-drawer-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) => `domi-nav-link${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="domi-nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="domi-drawer-footer">
          <div className="domi-drawer-footer-texto">ChocoFreseo © 2026</div>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="domi-main">
        <div className="domi-contenido">
          {children}
        </div>
      </main>

    </div>
  );
}
