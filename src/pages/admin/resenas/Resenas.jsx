import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, HelpCircle, RefreshCw } from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout';
import * as api from '../../../services/api';

const Estrellas = ({ valor }) => (
  <span style={{ color: '#f59e0b' }}>{'★'.repeat(valor)}{'☆'.repeat(5 - valor)}</span>
);


export default function Resenas() {
  const [lista,       setLista]       = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [filtroSede,  setFiltroSede]  = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const cargar = () => api.listarResenas()
    .then((data) => setLista(Array.isArray(data) ? data : []))
    .catch(() => setLista([]))
    .finally(() => setCargando(false));
  useEffect(() => { cargar(); }, []);

  // r.fecha viene en UTC (ISO). Comparar su string crudo contra el valor
  // de un <input type="date"> (que el admin piensa en hora Colombia,
  // UTC-5) fallaba para cualquier reseña creada después de las 7pm: su
  // fecha en UTC ya cae al día siguiente, así que aparecía bajo la fecha
  // de "mañana" en vez de "hoy". Mismo ajuste que ya usa cierreCaja
  // (rangoHoy) para calcular el día en hora Colombia.
  const fechaLocalCO = (iso) => iso ? new Date(new Date(iso).getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10) : null;

  const filtradas = lista.filter((r) => {
    const matchSede = filtroSede === '' || r.sede === filtroSede;
    const matchFecha = !filtroFecha || fechaLocalCO(r.fecha) === filtroFecha;
    return matchSede && matchFecha;
  });

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Reseñas</h1>
          <p className="page-subtitulo">{lista.length} reseñas registradas</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          value={filtroSede}
          onChange={e => setFiltroSede(e.target.value)}
          style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
            fontSize: 13, fontWeight: 600, color: '#555', background: 'white',
            cursor: 'pointer', outline: 'none', minWidth: 180,
          }}>
          <option value="">Todas las sedes</option>
          <option value="Aranjuez">Sede Aranjuez</option>
          <option value="La Milagrosa">Sede La Milagrosa</option>
          <option value="WhatsApp">Cocina Oculta (WhatsApp)</option>
        </select>
        <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
        {filtroFecha && <button onClick={() => setFiltroFecha('')} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13 }}>✕ Limpiar fecha</button>}
      </div>

      {cargando ? (
        <p style={{ color: '#888', fontSize: 14 }}>Cargando reseñas...</p>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay reseñas con estos filtros</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtradas.map((r) => (
            <div key={r.id_resena} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: '#fff5f5', color: '#CA0B0B', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{r.sede}</span>
                  <span style={{ background: '#f5f5f5', color: '#555', padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>
                    {{primera_vez: 'Primera vez', de_vez_en_cuando: 'De vez en cuando', casi_siempre: 'Habitual'}[r.frecuencia] || r.frecuencia}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: '#aaa' }}>{new Date(r.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 10 }}>
                <div><span style={{ fontSize: 12, color: '#888' }}>Atención: </span><Estrellas valor={r.calificacion_atencion} /></div>
                <div><span style={{ fontSize: 12, color: '#888' }}>Producto: </span><Estrellas valor={r.calificacion_producto} /></div>
                <div style={{display:'flex',alignItems:'center',gap:4}}><span style={{ fontSize: 12, color: '#888' }}>¿Recomienda? </span><strong style={{ fontSize: 13, display:'flex', alignItems:'center', gap:3 }}>{{si: <><CheckCircle size={12} color="#16a34a"/>Sí</>, tal_vez: <><HelpCircle size={12} color="#f59e0b"/>Tal vez</>, no: <><XCircle size={12} color="#CA0B0B"/>No</>}[r.recomendaria] || r.recomendaria}</strong></div>
                <div style={{display:'flex',alignItems:'center',gap:4}}><span style={{ fontSize: 12, color: '#888' }}>Tiempo: </span><strong style={{ fontSize: 13, display:'flex', alignItems:'center', gap:3 }}>{{si: <><CheckCircle size={12} color="#16a34a"/>Adecuado</>, no: <><XCircle size={12} color="#CA0B0B"/>No</>, podria_mejorar: <><RefreshCw size={12} color="#f59e0b"/>Podría mejorar</>}[r.tiempo_adecuado] || r.tiempo_adecuado}</strong></div>
              </div>
              {r.lo_que_gusto && <p style={{ fontSize: 13, color: '#555', marginBottom: 4 }}><strong>Lo que más gustó:</strong> {r.lo_que_gusto}</p>}
              {r.producto_deseado && <p style={{ fontSize: 13, color: '#555', marginBottom: 4 }}><strong>Postre deseado:</strong> {r.producto_deseado}</p>}
              {r.mejora && <p style={{ fontSize: 13, color: '#555', marginBottom: 0 }}><strong>Mejoras:</strong> {r.mejora}</p>}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
