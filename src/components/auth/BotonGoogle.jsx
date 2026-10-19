import { useEffect, useRef } from 'react';

// Botón oficial "Continuar con Google" (Google Identity Services).
//
// Solo pide el ID token de Google (scopes openid, email y profile: nombre,
// correo verificado e identificador); la API lo verifica antes de confiar en
// nada. Si REACT_APP_GOOGLE_CLIENT_ID no está configurada, no se muestra.
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const SCRIPT_GIS = 'https://accounts.google.com/gsi/client';

let cargaScript = null;
export const cargarGoogleIdentity = () => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!cargaScript) {
    cargaScript = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_GIS;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve(window.google);
      s.onerror = () => { cargaScript = null; reject(new Error('No se pudo cargar Google')); };
      document.head.appendChild(s);
    });
  }
  return cargaScript;
};

/**
 * @param onCredential (credential: string) => void  se llama con el ID token
 * @param texto 'continue_with' | 'signup_with' | 'signin_with'
 */
export default function BotonGoogle({ onCredential, texto = 'continue_with', clientId = GOOGLE_CLIENT_ID }) {
  const contenedor = useRef(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;

  useEffect(() => {
    if (!clientId) return undefined;
    let activo = true;
    cargarGoogleIdentity()
      .then((google) => {
        if (!activo || !contenedor.current || !google?.accounts?.id) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => resp?.credential && callback.current(resp.credential),
          ux_mode: 'popup',
          auto_select: false,
        });
        const ancho = Math.min(400, Math.max(200, contenedor.current.offsetWidth || 320));
        google.accounts.id.renderButton(contenedor.current, {
          type: 'standard', theme: 'outline', size: 'large', shape: 'pill',
          text: texto, logo_alignment: 'center', width: ancho, locale: 'es',
        });
      })
      .catch(() => { /* sin Google (bloqueado o sin red): queda el login normal */ });
    return () => { activo = false; };
  }, [clientId, texto]);

  if (!clientId) return null;
  return (
    <div style={{ margin: '12px 0 4px' }}>
      <div ref={contenedor} data-testid="boton-google" style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 2px', color: '#aaa', fontSize: 12, fontWeight: 700, fontFamily: 'Nunito, sans-serif' }}>
        <span style={{ flex: 1, height: 1, background: '#e5e5e5' }} />o con tu correo<span style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
      </div>
    </div>
  );
}
