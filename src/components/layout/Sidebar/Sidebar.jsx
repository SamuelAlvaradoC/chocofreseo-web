import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Settings, Users, ShoppingBag,
  ClipboardList, CheckCircle, ChefHat, MessageSquare,
  ChevronRight, ChevronDown, MapPin,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import './Sidebar.css';

const menu = [
  {
    icon: <LayoutDashboard size={18} />,
    label: 'Dashboard',
    path: '/admin/dashboard',
    hijos: [],
    permiso: 'ver_dashboard',
  },
  {
    icon: <Settings size={18} />,
    label: 'Configuración',
    hijos: [
      { label: 'Usuarios', path: '/admin/usuarios', permiso: 'ver_usuarios' },
      { label: 'Roles',    path: '/admin/roles',    permiso: 'ver_roles'    },
    ],
  },
  {
    icon: <Users size={18} />,
    label: 'Usuarios',
    hijos: [
      { label: 'Clientes',  path: '/admin/clientes',  permiso: 'ver_clientes'  },
      { label: 'Empleados', path: '/admin/empleados', permiso: 'ver_empleados' },
    ],
  },
  {
    icon: <ShoppingBag size={18} />,
    label: 'Productos',
    hijos: [
      { label: 'Categorías', path: '/admin/categorias', permiso: 'gestionar_categorias' },
      { label: 'Productos',  path: '/admin/productos',  permiso: 'gestionar_productos'  },
      { label: 'Toppings',   path: '/admin/toppings',   permiso: 'gestionar_toppings'   },
      { label: 'Adiciones',  path: '/admin/adiciones',  permiso: 'gestionar_adiciones'  },
    ],
  },
  {
    icon: <ClipboardList size={18} />,
    label: 'Ventas',
    path: '/admin/ventas',
    hijos: [],
    permiso: 'ver_ventas',
  },
  {
    icon: <CheckCircle size={18} />,
    label: 'Confirmar pedidos',
    path: '/admin/domicilios',
    hijos: [],
    permiso: 'confirmar_domicilios',
  },
  {
    icon: <ChefHat size={18} />,
    label: 'Panel Cocina',
    path: '/cocina',
    hijos: [],
    permiso: 'gestionar_cocina',
  },
  {
    icon: <MapPin size={18} />,
    label: 'Zonas',
    hijos: [
      { label: 'Ciudades', path: '/admin/ciudades', permiso: 'gestionar_categorias' },
      { label: 'Barrios',  path: '/admin/barrios',  permiso: 'gestionar_categorias' },
    ],
  },
  {
    icon: <MessageSquare size={18} />,
    label: 'Reseñas',
    path: '/admin/resenas',
    hijos: [],
    permiso: 'ver_dashboard',
  },
];

const PANEL_LABELS = {
  admin:                  'PANEL ADMIN',
  confirmador_domicilio:  'PANEL PEDIDOS',
  cocinero:               'PANEL COCINA',
  domiciliario:           'PANEL DOMI',
};

export default function Sidebar({ collapsed = false, onToggle }) {
  const location              = useLocation();
  const { tienePermiso, usuario } = useAuth();

  const menuFiltrado = menu
    .map((item) => {
      if (item.hijos && item.hijos.length > 0) {
        const hijosFiltrados = item.hijos.filter((h) => !h.permiso || tienePermiso(h.permiso));
        if (hijosFiltrados.length === 0) return null;
        return { ...item, hijos: hijosFiltrados };
      }
      if (item.permiso && !tienePermiso(item.permiso)) return null;
      return item;
    })
    .filter(Boolean);

  const tieneHijoActivo = (hijos) =>
    hijos.some((h) => location.pathname.startsWith(h.path));

  const [abiertos, setAbiertos] = useState(() =>
    menuFiltrado
      .filter((item) => item.hijos?.length && tieneHijoActivo(item.hijos))
      .map((i) => i.label)
  );

  const toggleMenu = (label) => {
    setAbiertos((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const panelLabel = PANEL_LABELS[usuario?.rol] || 'PANEL ADMIN';

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>

      {/* Logo */}
      <div
        className="sidebar-logo"
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '16px 12px', cursor: 'pointer',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        <img
          src="https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778822634/logo_sin_fondo_remove_uuu8tt.png"
          alt="ChocoFreseo"
          style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }}
        />
        {!collapsed && (
          <div className="sidebar-logo-info">
            <span style={{ fontWeight: 800, fontSize: 14, color: '#1a1a1a' }}>ChocoFreseo</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {menuFiltrado.map((item) => (
          <div key={item.label}>
            {item.hijos.length === 0 ? (
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
                style={collapsed ? { justifyContent: 'center' } : {}}
              >
                <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </span>
                {!collapsed && item.label}
              </NavLink>
            ) : !collapsed ? (
              <>
                <div
                  className={`nav-link nav-padre ${tieneHijoActivo(item.hijos) ? 'padre-activo' : ''}`}
                  onClick={() => toggleMenu(item.label)}
                >
                  <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span className={`nav-flecha ${abiertos.includes(item.label) ? 'abierto' : ''}`}>
                    {abiertos.includes(item.label) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                </div>
                {abiertos.includes(item.label) && (
                  <div className="nav-hijos">
                    {item.hijos.map((hijo) => (
                      <NavLink
                        key={hijo.path}
                        to={hijo.path}
                        className={({ isActive }) => isActive ? 'nav-hijo active' : 'nav-hijo'}
                      >
                        <span className="nav-hijo-punto" />
                        {hijo.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to={item.hijos[0]?.path || '/admin/dashboard'}
                className={({ isActive }) => `nav-link${tieneHijoActivo(item.hijos) ? ' active' : ''}`}
                title={item.label}
                style={{ justifyContent: 'center' }}
              >
                <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </span>
              </NavLink>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="sidebar-footer-texto">ChocoFreseo © 2026</div>
          <div className="sidebar-footer-version">v1.0.0</div>
        </div>
      )}
    </aside>
  );
}
