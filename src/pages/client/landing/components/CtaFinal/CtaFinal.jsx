import { useState } from 'react';
import { MapPin, RefreshCw, ThumbsUp, Star, Clock, MessageSquare, Send, AlertTriangle } from 'lucide-react';
import { contieneEtiquetaHtml, MSG_HTML } from '../../../../../utils/validarSinHtml';
import './CtaFinal.css';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3000') + '/api';

export default function CtaFinal() {
  const [sede,            setSede]            = useState('');
  const [frecuencia,      setFrecuencia]      = useState('');
  const [califAtencion,   setCalifAtencion]   = useState(0);
  const [califProducto,   setCalifProducto]   = useState(0);
  const [recomendaria,    setRecomendaria]    = useState('');
  const [tiempoAdecuado,  setTiempoAdecuado]  = useState('');
  const [loQueGusto,      setLoQueGusto]      = useState('');
  const [productoDeseado, setProductoDeseado] = useState('');
  const [mejora,          setMejora]          = useState('');
  const [enviandoResena,  setEnviandoResena]  = useState(false);
  const [enviado,         setEnviado]         = useState(false);
  const [errorResena,     setErrorResena]     = useState('');

  const handleEnviarResena = async () => {
    if (!sede || !frecuencia || !califAtencion || !califProducto || !recomendaria || !tiempoAdecuado) {
      setErrorResena('Completa todos los campos obligatorios: sede, frecuencia, calificaciones, recomendación y tiempo de entrega.');
      return;
    }
    if (contieneEtiquetaHtml(loQueGusto) || contieneEtiquetaHtml(productoDeseado) || contieneEtiquetaHtml(mejora)) {
      setErrorResena(MSG_HTML);
      return;
    }
    setErrorResena('');
    setEnviandoResena(true);
    try {
      const res = await fetch(`${API_URL}/resenas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sede, frecuencia,
          calificacion_atencion: califAtencion,
          calificacion_producto: califProducto,
          recomendaria,
          tiempo_adecuado:  tiempoAdecuado,
          lo_que_gusto:     loQueGusto,
          producto_deseado: productoDeseado,
          mejora,
        }),
      });
      // fetch() solo rechaza (catch) por fallos de red -- un 429 (límite
      // diario) o 422 (validación) del backend llega aquí igual como
      // "éxito" si no se revisa res.ok explícitamente. Antes de este fix,
      // el backend SÍ rechazaba la 5ta reseña del día, pero el usuario
      // veía el mismo "¡Reseña enviada!" de siempre sin enterarse.
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorResena(data?.message || 'No se pudo enviar la reseña. Inténtalo de nuevo.');
        return;
      }
      setEnviado(true);
      setSede(''); setFrecuencia(''); setCalifAtencion(0); setCalifProducto(0);
      setRecomendaria(''); setTiempoAdecuado('');
      setLoQueGusto(''); setProductoDeseado(''); setMejora('');
      setTimeout(() => setEnviado(false), 5000);
    } catch (e) {
      setErrorResena('Sin conexión. Inténtalo de nuevo.');
    } finally { setEnviandoResena(false); }
  };

  return (
    <section id="resenas" style={{ padding: '70px 20px', background: '#f7f8fd' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header sección */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 4, color: '#CA0B0B', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            TU OPINIÓN IMPORTA
          </span>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', margin: '0 0 8px' }}>
            ¿Cómo fue tu experiencia?
          </h2>
          <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
            Tu reseña nos ayuda a mejorar y a otros clientes a conocernos
          </p>
        </div>

        {/* Mensaje de éxito */}
        {enviado && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 24px', textAlign: 'center', marginBottom: 24, fontSize: 15, color: '#166534', fontWeight: 700 }}>
            ¡Gracias por tu reseña! 🎉 Nos ayuda muchísimo.
          </div>
        )}

        {/* Formulario 2 columnas */}
        <div className="resenas-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'white', borderRadius: 20, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>

          {/* ══ COLUMNA IZQUIERDA ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Sede */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={13} color="#CA0B0B" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>¿Dónde nos visitaste?</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { v: 'Aranjuez',     l: 'Sede Aranjuez' },
                  { v: 'La Milagrosa', l: 'Sede La Milagrosa' },
                  { v: 'WhatsApp',     l: 'Cocina Oculta' },
                ].map(s => (
                  <button key={s.v} type="button" onClick={() => setSede(s.v)} style={{ padding: '5px 11px', borderRadius: 20, border: sede === s.v ? '2px solid #CA0B0B' : '1px solid #e5e7eb', background: sede === s.v ? '#fff5f5' : '#fafafa', color: sede === s.v ? '#CA0B0B' : '#666', fontWeight: sede === s.v ? 700 : 400, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {s.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Frecuencia */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={13} color="#CA0B0B" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>¿Con qué frecuencia nos visitas?</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { v: 'primera_vez',      l: 'Primera vez' },
                  { v: 'de_vez_en_cuando', l: 'De vez en cuando' },
                  { v: 'casi_siempre',     l: 'Casi siempre' },
                ].map(f => (
                  <button key={f.v} type="button" onClick={() => setFrecuencia(f.v)} style={{ padding: '5px 11px', borderRadius: 20, border: frecuencia === f.v ? '2px solid #CA0B0B' : '1px solid #e5e7eb', background: frecuencia === f.v ? '#fff5f5' : '#fafafa', color: frecuencia === f.v ? '#CA0B0B' : '#666', fontWeight: frecuencia === f.v ? 700 : 400, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {f.l}
                  </button>
                ))}
              </div>
            </div>

            {/* ¿Recomendarías? */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ThumbsUp size={13} color="#CA0B0B" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>¿Nos recomendarías?</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { v: 'si',      l: 'Sí, claro' },
                  { v: 'tal_vez', l: 'Tal vez' },
                  { v: 'no',      l: 'No' },
                ].map(r => (
                  <button key={r.v} type="button" onClick={() => setRecomendaria(r.v)} style={{ flex: 1, padding: '6px 4px', borderRadius: 10, border: recomendaria === r.v ? '2px solid #CA0B0B' : '1px solid #e5e7eb', background: recomendaria === r.v ? '#fff5f5' : '#fafafa', color: recomendaria === r.v ? '#CA0B0B' : '#666', fontWeight: recomendaria === r.v ? 700 : 400, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {r.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Calificaciones */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={13} color="#CA0B0B" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>Calificaciones</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#fafafa', borderRadius: 10, padding: '8px 12px' }}>
                {[
                  { label: 'Atención', val: califAtencion, set: setCalifAtencion },
                  { label: 'Producto', val: califProducto, set: setCalifProducto },
                ].map(cal => (
                  <div key={cal.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#555', minWidth: 70 }}>{cal.label}</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <span key={n} onClick={() => cal.set(n)} style={{ fontSize: 20, cursor: 'pointer', color: n <= cal.val ? '#f59e0b' : '#e5e7eb', transition: 'color 0.1s' }}>★</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tiempo */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={13} color="#CA0B0B" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>¿El tiempo de entrega fue adecuado?</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { v: 'si',             l: 'Sí' },
                  { v: 'podria_mejorar', l: 'Podría mejorar' },
                  { v: 'no',             l: 'No' },
                ].map(t => (
                  <button key={t.v} type="button" onClick={() => setTiempoAdecuado(t.v)} style={{ flex: 1, padding: '6px 4px', borderRadius: 10, border: tiempoAdecuado === t.v ? '2px solid #CA0B0B' : '1px solid #e5e7eb', background: tiempoAdecuado === t.v ? '#fff5f5' : '#fafafa', color: tiempoAdecuado === t.v ? '#CA0B0B' : '#666', fontWeight: tiempoAdecuado === t.v ? 700 : 400, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* ══ COLUMNA DERECHA ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderLeft: '1px solid #f0f0f0', paddingLeft: 16 }}>

            {/* Header comentarios */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={13} color="#CA0B0B" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>Cuéntanos más (opcional)</span>
            </div>

            {/* Textareas */}
            {[
              { label: '¿Qué fue lo que más te gustó?',          val: loQueGusto,      set: setLoQueGusto,      placeholder: 'El sabor, la atención, la presentación...' },
              { label: '¿Qué postre quisieras ver próximamente?', val: productoDeseado, set: setProductoDeseado, placeholder: 'Dinos qué antojo nos falta...' },
              { label: '¿En qué podríamos mejorar?',              val: mejora,          set: setMejora,          placeholder: 'Tu opinión nos ayuda a crecer...' },
            ].map(t => (
              <div key={t.label}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                  {t.label}
                </label>
                <textarea
                  rows={1}
                  value={t.val}
                  onChange={e => t.set(e.target.value)}
                  placeholder={t.placeholder}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, resize: 'none', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fafafa', transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = '#CA0B0B'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            ))}

            {/* Error de validación */}
            {errorResena && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#991b1b', fontWeight: 600 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{errorResena}</span>
              </div>
            )}

            {/* Botón enviar */}
            <button type="button" onClick={handleEnviarResena} disabled={enviandoResena}
              style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: enviandoResena ? '#e5e7eb' : '#CA0B0B', color: enviandoResena ? '#aaa' : 'white', fontWeight: 800, fontSize: 13, fontFamily: 'inherit', cursor: enviandoResena ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 'auto', transition: 'all 0.2s' }}>
              <Send size={15} />
              {enviandoResena ? 'Enviando...' : 'Enviar reseña'}
            </button>

            <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', margin: 0 }}>
              Tu reseña es anónima y nos ayuda a mejorar
            </p>

          </div>
        </div>
      </div>
    </section>
  );
}
