import { useState } from 'react';

// Alerta obligatoria al hacer un pedido fuera de horario (modo "Por horario").
// No se puede cerrar tocando afuera: solo con "Volver" o, después de marcar
// la casilla, con "Hacer mi pedido". Textos grandes para leer bien en celular.
// textoDia: "hoy" o "mañana martes 20"; textoHora: "1:00 PM" (de la API).
export default function AvisoFueraDeHorario({ textoDia, textoHora, onAceptar, onCancelar }) {
  const [entiendo, setEntiendo] = useState(false);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="aviso-horario-titulo"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 20, padding: '28px 22px', maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', fontFamily: 'Nunito, sans-serif', textAlign: 'center' }}>
        <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 12 }}>🌙</div>
        <h2 id="aviso-horario-titulo" style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', margin: '0 0 12px', lineHeight: 1.3 }}>
          La tienda está cerrada en este momento.
        </h2>
        <p style={{ fontSize: 18, color: '#333', margin: '0 0 20px', lineHeight: 1.5 }}>
          Tu pedido quedará registrado y empezaremos a prepararlo{' '}
          <strong>{textoDia} a la {textoHora}</strong>, que es cuando abrimos.
        </p>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left', background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', marginBottom: 20 }}>
          <input type="checkbox" checked={entiendo} onChange={(e) => setEntiendo(e.target.checked)}
            style={{ width: 24, height: 24, flexShrink: 0, marginTop: 2, accentColor: '#CA0B0B', cursor: 'pointer' }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#7c2d12', lineHeight: 1.4 }}>
            Entiendo que mi pedido se empezará a preparar a partir de la {textoHora}
          </span>
        </label>

        <button type="button" onClick={onAceptar} disabled={!entiendo}
          style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: entiendo ? '#CA0B0B' : '#e5a3a3', color: 'white', fontWeight: 800, fontSize: 17, cursor: entiendo ? 'pointer' : 'not-allowed', fontFamily: 'inherit', marginBottom: 10 }}>
          Hacer mi pedido
        </button>
        <button type="button" onClick={onCancelar}
          style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #ddd', background: 'white', color: '#555', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
          Volver
        </button>
      </div>
    </div>
  );
}

// El cliente aceptó el aviso para ESTA apertura (se recuerda mientras la
// pestaña esté abierta, así no se le pregunta dos veces entre el catálogo y
// el checkout). Si cambia la próxima apertura, hay que aceptar de nuevo.
const CLAVE = 'acepto_espera';
export const avisoYaAceptado = (proximaApertura) => {
  try { return !!proximaApertura && sessionStorage.getItem(CLAVE) === String(proximaApertura); } catch { return false; }
};
export const guardarAvisoAceptado = (proximaApertura) => {
  try { sessionStorage.setItem(CLAVE, String(proximaApertura)); } catch { /* sin memoria: se volverá a preguntar */ }
};
