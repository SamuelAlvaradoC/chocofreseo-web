import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from '../utils/toast';

export const MSG_CUENTA_VINCULADA =
  "¡Listo! Tu cuenta ahora está conectada con Google. Desde ahora entra con el botón 'Continuar con Google'. "
  + "Tu contraseña anterior ya no funciona; si quieres tener una, créala desde '¿Olvidaste tu contraseña?'";

/**
 * Maneja la credencial de "Continuar con Google": inicia sesión y vuelve a
 * donde iba (ej. "Hacer pedido" -> /checkout con el carrito, igual que el
 * login normal) o a /landing. La primera vez que una cuenta existente se
 * conecta con Google muestra el aviso de que su contraseña anterior ya no
 * funciona.
 */
export default function useContinuarConGoogle({ onError } = {}) {
  const { loginConGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cargando, setCargando] = useState(false);

  const continuarConGoogle = async (credential) => {
    setCargando(true);
    try {
      const { vinculada } = await loginConGoogle(credential);
      if (vinculada) toast.success(MSG_CUENTA_VINCULADA, 15000);
      navigate(location.state?.from || '/landing', { replace: true });
    } catch (err) {
      onError?.(err?.response?.data?.message || 'No pudimos iniciar sesión con Google. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return { continuarConGoogle, cargando };
}
