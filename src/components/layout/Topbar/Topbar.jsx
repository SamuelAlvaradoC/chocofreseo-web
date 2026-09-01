import { useNavigate } from 'react-router-dom';
import { Store, LogOut, User, Printer } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useEstadoImpresora } from '../../../hooks/useEstadoImpresora';
import './Topbar.css';

export default function Topbar() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const impresoraConectada = useEstadoImpresora();

  const handleSalir = () => {
    logout();
    navigate('/login');
  };

  const ROL_LABELS = {
    admin:                 'Administrador',
    confirmador_domicilio: 'Confirmador de pedidos',
    cocinero:              'Cocinero',
    domiciliario:          'Domiciliario',
    cliente:               'Cliente',
  };

  const nombre    = usuario?.nombre || 'Administrador';
  const rolRaw    = usuario?.rol    || '';
  const rolLabel  = ROL_LABELS[rolRaw] || rolRaw || 'Admin';

  return (
    <div className="topbar">
      <div className="topbar-izquierda">
        <span className="topbar-bienvenida">Bienvenido de nuevo,</span>
        <span className="topbar-nombre-grande">{nombre}</span>
      </div>

      <div className="topbar-derecha">
        {/* Estado del impresor -- badge persistente, no un toast que
            desaparece, para que sea imposible no darse cuenta de que
            hay que abrir el programa de la impresora. */}
        {impresoraConectada !== null && (
          <div
            className={`topbar-impresora ${impresoraConectada ? 'topbar-impresora--ok' : 'topbar-impresora--mal'}`}
            title={impresoraConectada ? 'El programa de la impresora está conectado' : 'El programa de la impresora está cerrado -- ábrelo para que los tickets se impriman'}
          >
            <Printer size={14} />
            <span>{impresoraConectada ? 'Impresora conectada' : 'Impresora desconectada'}</span>
          </div>
        )}

        {/* Avatar + info */}
        <div className="topbar-usuario">
          <div className="topbar-avatar"><User size={17} strokeWidth={2.5} /></div>
          <div className="topbar-info">
            <div className="topbar-nombre">{nombre}</div>
            <div className="topbar-rol">{rolLabel}</div>
          </div>
        </div>

        <div className="topbar-divider" />

        {/* Ir a la tienda */}
        {rolRaw !== 'cocinero' && (
          <button className="topbar-btn topbar-btn--tienda" title="Ir a la tienda" onClick={() => navigate('/landing')}>
            <Store size={15} />
            <span>Tienda</span>
          </button>
        )}

        {/* Cerrar sesión */}
        <button className="topbar-btn topbar-btn--salir" title="Cerrar sesión" onClick={handleSalir}>
          <LogOut size={15} />
          <span>Salir</span>
        </button>
      </div>
    </div>
  );
}
