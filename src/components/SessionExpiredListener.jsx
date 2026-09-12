import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from '../utils/toast';
import { SESSION_EXPIRED_EVENT } from '../services/authEvents';

// Réplica del patrón que ya funciona bien en Flutter (ApiService.onUnauthorized
// en main.dart): limpia la sesión, redirige a /login y avisa con un mensaje
// claro -- antes de esto, un 401 en React fallaba en silencio (solo
// console.error) y la pantalla se quedaba con datos viejos o vacíos, sin
// que el usuario supiera que su sesión había expirado.
export default function SessionExpiredListener() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const manejandoRef = useRef(false);

  useEffect(() => {
    const onSessionExpired = async () => {
      if (manejandoRef.current) return;
      manejandoRef.current = true;
      try {
        await logout();
        navigate('/login');
        toast.warning('Tu sesión expiró, inicia sesión de nuevo');
      } finally {
        manejandoRef.current = false;
      }
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [logout, navigate]);

  return null;
}
