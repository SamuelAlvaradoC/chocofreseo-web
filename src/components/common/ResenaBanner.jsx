import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import { RESENA_ENVIADA_EVENT } from '../../services/resenaEvents';

// Mismas rutas de cliente que ya usa WhatsAppButton -- nunca en Admin,
// Cocina, Confirmador ni Domiciliario. Se excluye /checkout a propósito
// (mitad de una compra no es buen momento para distraer con esto).
const RUTAS_CLIENTE = ['/landing', '/catalogo', '/perfil', '/mis-pedidos'];

const claveDescartadas = (usuario) =>
  `resenas_descartadas_${usuario?.id_usuario || usuario?.email || 'anon'}`;

export default function ResenaBanner() {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [pendientes, setPendientes] = useState([]);

  // Reusa el mismo fetch que ya usa "Mis pedidos" -- sin polling nuevo, una
  // sola vez por sesión cuando hay usuario logueado (login/logout dispara
  // un refetch porque `usuario` cambia).
  useEffect(() => {
    if (!usuario) { setPendientes([]); return; }
    let cancelado = false;
    api.misVentas()
      .then((ventas) => {
        if (cancelado) return;
        const descartadas = JSON.parse(localStorage.getItem(claveDescartadas(usuario)) || '[]');
        const pend = (ventas || [])
          .filter((v) => v.estado?.nombre_estado === 'entregado' && !v.resena)
          .filter((v) => !descartadas.includes(v.id_venta))
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        setPendientes(pend);
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [usuario]);

  // CtaFinal dispara esto justo después de un envío exitoso -- quita ese
  // pedido de inmediato sin esperar a un remount/refetch completo.
  useEffect(() => {
    const onResenaEnviada = (e) => {
      const id = e.detail?.id_venta;
      if (!id) return;
      setPendientes((p) => p.filter((v) => v.id_venta !== id));
    };
    window.addEventListener(RESENA_ENVIADA_EVENT, onResenaEnviada);
    return () => window.removeEventListener(RESENA_ENVIADA_EVENT, onResenaEnviada);
  }, []);

  const visible = RUTAS_CLIENTE.includes(pathname) && pendientes.length > 0;
  const bannerRef = useRef(null);

  // El banner es position:fixed (no reserva espacio en el flujo), así que sin
  // esto quedaría tapando el Navbar (que es sticky top:0). Empuja el body
  // hacia abajo exactamente la altura real del banner mientras esté visible.
  useLayoutEffect(() => {
    if (!visible) {
      document.body.style.paddingTop = '';
      return;
    }
    const actualizarAltura = () => {
      document.body.style.paddingTop = `${bannerRef.current?.offsetHeight || 0}px`;
    };
    actualizarAltura();
    window.addEventListener('resize', actualizarAltura);
    return () => {
      window.removeEventListener('resize', actualizarAltura);
      document.body.style.paddingTop = '';
    };
  }, [visible]);

  if (!visible) return null;

  const masReciente = pendientes[0];

  const descartar = () => {
    const clave = claveDescartadas(usuario);
    const actuales = JSON.parse(localStorage.getItem(clave) || '[]');
    localStorage.setItem(clave, JSON.stringify([...actuales, masReciente.id_venta]));
    setPendientes((p) => p.filter((v) => v.id_venta !== masReciente.id_venta));
  };

  const irAResena = () => {
    navigate(`/landing?pendiente_resena=${masReciente.id_venta}#reseñas`);
  };

  return (
    <div ref={bannerRef} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 998,
      background: '#1a1a1a', color: '#fff',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      fontSize: 13, boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
    }}>
      <Star size={16} fill="#fbbf24" color="#fbbf24" style={{ flexShrink: 0 }} />
      <span style={{ textAlign: 'center' }}>
        ¿Cómo estuvo tu pedido? Cuéntanos qué tal.
      </span>
      <button onClick={irAResena} style={{
        background: '#CA0B0B', color: '#fff', border: 'none', borderRadius: 20,
        padding: '5px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
      }}>
        Dejar reseña
      </button>
      <button onClick={descartar} aria-label="Cerrar" style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex',
      }}>
        <X size={16} />
      </button>
    </div>
  );
}
