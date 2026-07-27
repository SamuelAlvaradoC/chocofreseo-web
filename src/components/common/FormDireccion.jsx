import { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:3000') + '/api';

const fetchPublic = (url) => fetch(url).then((r) => r.json()).then((d) => d.data || []).catch(() => []);

const TIPOS_VIA = [
  'Calle', 'Carrera', 'Transversal', 'Diagonal',
  'Avenida', 'Avenida Calle', 'Avenida Carrera',
  'Circular', 'Circunvalar',
];

function SearchableBarrio({ barrios, value, onChange, disabled, inputCls, error }) {
  const [texto,   setTexto]   = useState(value || '');
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setTexto(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtrados = barrios.filter((b) => b.nombre.toLowerCase().includes(texto.toLowerCase()));

  const seleccionar = (b) => {
    setTexto(b.nombre);
    setAbierto(false);
    onChange(b);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className={inputCls}
        placeholder={disabled ? 'Primero selecciona ciudad' : 'Buscar barrio...'}
        value={texto}
        disabled={disabled}
        style={{ border: error ? '1px solid #CA0B0B' : '1px solid #e5e7eb' }}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); onChange(null); }}
        onFocus={() => !disabled && setAbierto(true)}
      />
      {abierto && filtrados.length > 0 && (
        <ul style={{
          position: 'absolute', zIndex: 999, top: '100%', left: 0, right: 0,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
          maxHeight: 200, overflowY: 'auto', margin: 0, padding: 0,
          listStyle: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>
          {filtrados.map((b) => (
            <li
              key={b.id_barrio}
              onMouseDown={() => seleccionar(b)}
              style={{
                padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              <span>{b.nombre}</span>
              <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                ${Number(b.precio_domicilio).toLocaleString('es-CO')}
              </span>
            </li>
          ))}
        </ul>
      )}
      {abierto && texto && filtrados.length === 0 && (
        <div style={{ position: 'absolute', zIndex: 999, top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#888', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          No se encontró el barrio
        </div>
      )}
    </div>
  );
}

export default function FormDireccion({ value = {}, onChange, errors = {}, layout = 'admin' }) {
  const isAdmin  = layout === 'admin';
  const inputCls = isAdmin ? 'form-input'  : 'perfil-input';
  const labelCls = isAdmin ? 'form-label'  : 'perfil-label';
  const grupoCls = isAdmin ? 'form-grupo'  : 'perfil-campo';

  const [ciudades,  setCiudades]  = useState([]);
  const [barrios,   setBarrios]   = useState([]);
  const [tipoVia,   setTipoVia]   = useState('');
  const [numeroVia, setNumeroVia] = useState('');
  const [numeral,   setNumeral]   = useState('');
  const [complemento, setComplemento] = useState('');

  useEffect(() => {
    fetchPublic(`${API_BASE}/ciudades/activas`).then(setCiudades);
  }, []);

  useEffect(() => {
    const id = value?.id_ciudad;
    if (!id) { setBarrios([]); return; }
    fetchPublic(`${API_BASE}/barrios/activos?id_ciudad=${id}`).then(setBarrios);
  }, [value?.id_ciudad]);

  const direccionPreview = [
    tipoVia,
    numeroVia,
    numeral     ? `#${numeral}`     : '',
    complemento ? `-${complemento}` : '',
  ].filter(Boolean).join(' ');

  useEffect(() => {
    if (tipoVia || numeroVia || numeral) {
      onChange('direccion_linea', direccionPreview);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoVia, numeroVia, numeral, complemento]);

  const handleCiudad = (e) => {
    const ciudad = ciudades.find((c) => String(c.id_ciudad) === e.target.value);
    onChange('id_ciudad', ciudad?.id_ciudad || null);
    onChange('ciudad',    ciudad?.nombre    || '');
    onChange('id_barrio', null);
    onChange('barrio',    '');
    onChange('costo_domicilio', 0);
  };

  const handleBarrio = (barrio) => {
    if (!barrio) {
      onChange('id_barrio', null);
      onChange('barrio',    '');
      onChange('costo_domicilio', 0);
      return;
    }
    onChange('id_barrio',        barrio.id_barrio);
    onChange('barrio',           barrio.nombre);
    onChange('costo_domicilio',  barrio.precio_domicilio);
    onChange('distancia_km',     0);
  };

  const prefixWrap = { position: 'relative' };
  const prefixSpan = { position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: 13, pointerEvents: 'none', fontWeight: 700 };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
        <Info size={14} color="#0369a1" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 600, lineHeight: 1.4 }}>
          El costo de domicilio depende del barrio seleccionado
        </span>
      </div>

      {/* Ciudad | Barrio */}
      <div className="direccion-grid" style={{ marginBottom: 12 }}>
        <div>
          <label className={labelCls}>Ciudad / Municipio *</label>
          <select
            className={inputCls}
            value={value.id_ciudad ? String(value.id_ciudad) : ''}
            onChange={handleCiudad}
            style={{ border: errors.ciudad ? '1px solid #CA0B0B' : '1px solid #e5e7eb' }}
          >
            <option value="">Seleccionar...</option>
            {ciudades.map((c) => (
              <option key={c.id_ciudad} value={c.id_ciudad}>{c.nombre}</option>
            ))}
          </select>
          {errors.ciudad && (
            <div style={{ fontSize: 11, color: '#CA0B0B', marginTop: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              ⚠ {errors.ciudad}
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Barrio *</label>
          <SearchableBarrio
            barrios={barrios}
            value={value.barrio || ''}
            onChange={handleBarrio}
            disabled={!value.id_ciudad}
            inputCls={inputCls}
            error={errors.barrio}
          />
          {errors.barrio && (
            <div style={{ fontSize: 11, color: '#CA0B0B', marginTop: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              ⚠ {errors.barrio}
            </div>
          )}
        </div>
      </div>

      {/* Costo domicilio (solo modo cliente) */}
      {!isAdmin && value.costo_domicilio > 0 && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#166534', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Costo de domicilio</span>
          <span style={{ fontSize: 16 }}>${Number(value.costo_domicilio).toLocaleString('es-CO')}</span>
        </div>
      )}

      {/* Tipo vía | Número | #Numeral | -Complemento */}
      <div className="direccion-grid-4" style={{ marginBottom: 12 }}>
        <div>
          <label className={labelCls}>Tipo de vía *</label>
          <select
            className={inputCls}
            value={tipoVia}
            onChange={(e) => { setTipoVia(e.target.value); onChange('tipo_via', e.target.value); }}
            style={{ border: errors.tipo_via ? '1px solid #CA0B0B' : '1px solid #e5e7eb' }}
          >
            <option value="">Seleccionar tipo...</option>
            {TIPOS_VIA.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.tipo_via && (
            <div style={{ fontSize: 11, color: '#CA0B0B', marginTop: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              ⚠ {errors.tipo_via}
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Número *</label>
          <input
            className={inputCls}
            placeholder="55"
            value={numeroVia}
            onChange={(e) => { setNumeroVia(e.target.value); onChange('numero', e.target.value); }}
            style={{ border: errors.numero ? '1px solid #CA0B0B' : '1px solid #e5e7eb' }}
          />
          {errors.numero && (
            <div style={{ fontSize: 11, color: '#CA0B0B', marginTop: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              ⚠ {errors.numero}
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}># Numeral *</label>
          <div style={prefixWrap}>
            <span style={prefixSpan}>#</span>
            <input
              className={inputCls}
              placeholder="30"
              value={numeral}
              onChange={(e) => { setNumeral(e.target.value); onChange('numeral', e.target.value); }}
              style={{ paddingLeft: 22, border: errors.numeral ? '1px solid #CA0B0B' : '1px solid #e5e7eb' }}
            />
          </div>
          {errors.numeral && (
            <div style={{ fontSize: 11, color: '#CA0B0B', marginTop: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              ⚠ {errors.numeral}
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Complemento *</label>
          <div style={prefixWrap}>
            <span style={prefixSpan}>-</span>
            <input
              className={inputCls}
              placeholder="45"
              value={complemento}
              onChange={(e) => { setComplemento(e.target.value); onChange('complemento', e.target.value); }}
              style={{ paddingLeft: 18, border: errors.complemento ? '1px solid #CA0B0B' : '1px solid #e5e7eb' }}
            />
          </div>
          {errors.complemento && (
            <div style={{ fontSize: 11, color: '#CA0B0B', marginTop: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              ⚠ {errors.complemento}
            </div>
          )}
        </div>
      </div>

      {/* Preview dirección */}
      {direccionPreview && (
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#555', fontStyle: 'italic' }}>
          📍 {direccionPreview}{value.barrio ? `, ${value.barrio}` : ''}{value.ciudad ? `, ${value.ciudad}` : ''}
        </div>
      )}
      {!direccionPreview && value.direccion_linea && (
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#555' }}>
          📍 Dirección actual: <strong>{value.direccion_linea}</strong>
        </div>
      )}

      {/* Referencia */}
      <div className={grupoCls}>
        <label className={labelCls}>Referencia / Indicaciones adicionales</label>
        <textarea
          className={inputCls}
          rows={1}
          placeholder="Ej: Casa esquinera, portón azul, frente al parque... (opcional)"
          value={value.referencia || ''}
          onChange={(e) => onChange('referencia', e.target.value)}
          onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
          style={{ resize: 'none', overflow: 'hidden', fontFamily: 'inherit', minHeight: 36 }}
        />
      </div>
    </>
  );
}
