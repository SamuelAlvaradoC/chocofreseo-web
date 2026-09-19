import { useLocation } from 'react-router-dom';
import { LogoWhatsApp } from './LogosApps';

// Solo pantallas de cliente -- nunca en Admin, Cocina, Confirmador ni
// Domiciliario. Mismo número/formato de link que ya se usa en Footer,
// Perfil y MisPedidos (wa.me).
const RUTAS_CLIENTE = ['/landing', '/catalogo', '/checkout', '/perfil', '/mis-pedidos'];

export default function WhatsAppButton() {
  const { pathname } = useLocation();
  if (!RUTAS_CLIENTE.includes(pathname)) return null;

  // /catalogo siempre tiene una barra fija de carrito abajo (.carrito-bottom,
  // incluso vacío) que taparía el botón si quedara en bottom:20 como en el
  // resto de pantallas cliente.
  const bottom = pathname === '/catalogo' ? 84 : 20;

  return (
    <a
      href="https://wa.me/573159914624"
      target="_blank"
      rel="noopener noreferrer"
      title="Escríbenos por WhatsApp"
      style={{
        position: 'fixed',
        bottom,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#25D366',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        // Debajo del backdrop/panel del carrito (Catalogo.css: backdrop
        // z-index 98, carrito-bottom 99) y de cualquier modal (z-index
        // 99999+) -- así el botón queda tapado automáticamente por lo que
        // sea que esté abierto encima, en vez de flotar sobre el total o
        // el botón "Hacer pedido" cuando el carrito está expandido.
        zIndex: 40,
      }}
    >
      <LogoWhatsApp size={30} color="#fff" />
    </a>
  );
}
