import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, AlertTriangle, Bike, User } from 'lucide-react';
import { LogoBancolombia, LogoNequi, LogoEfectivo } from '../../../components/common/LogosApps';
import { toast } from '../../../utils/toast';
import Navbar from '../../../components/layout/Navbar/Navbar';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { useTiempoEspera } from '../../../hooks/useTiempoEspera';
import * as api from '../../../services/api';
import FormDireccion from '../../../components/common/FormDireccion';
import './Checkout.css';

const COSTO_DOMICILIO_DEFAULT = 5500;
const MAX_SALSAS_GRATIS       = 2;
const COLOR_SALSAS            = '#ea580c';
const parsearSalsas = (raw) => { if (!raw) return []; try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(p) ? p : []; } catch { return []; } };
const nombreSalsa   = (s) => { const n = typeof s === 'object' ? s.nombre : s; if (!n) return ''; return n.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); };

function PasoDatos({ usuario, onNext, onActualizarUsuario }) {
  const [telefono, setTelefono] = useState(usuario?.telefono || '');
  const [error,    setError]    = useState('');
  const [cargando, setCargando] = useState(false);

  const handleNext = async () => {
    const tel = telefono.trim();
    if (!tel) { setError('Por favor ingresa tu número de teléfono'); return; }
    if (!/^3[0-9]{9}$/.test(tel)) {
      setError('Ingresa un número colombiano válido de 10 dígitos (ej: 3001234567)'); return;
    }
    setCargando(true);
    setError('');
    try {
      // Guardar teléfono y verificar duplicado en el servidor
      const u = await api.editarPerfil({ telefono: tel });
      onActualizarUsuario({ telefono: u.telefono });
      onNext({ telefono: tel });
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar el teléfono. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="checkout-paso">
      <h2 className="checkout-paso-titulo">Datos de entrega</h2>
      <p className="checkout-paso-sub">Confirma o actualiza tus datos de contacto</p>
      <div className="checkout-card">
        <div className="checkout-usuario-info">
          <div className="checkout-avatar"><User size={18} strokeWidth={2.5} /></div>
          <div>
            <div className="checkout-usuario-nombre">{usuario?.nombre || 'Usuario'}</div>
            <div className="checkout-usuario-email">{usuario?.email || ''}</div>
          </div>
        </div>
      </div>
      <div className="checkout-form">
        <div className="checkout-campo">
          <label className="checkout-label">Teléfono</label>
          <input className="checkout-input" type="tel" placeholder="Ej: 3001234567" maxLength={10}
            value={telefono} onChange={(e) => { setTelefono(e.target.value.replace(/\D/g, '')); setError(''); }} />
        </div>
        {error && <div className="checkout-error" style={{ display:'flex', alignItems:'center', gap:6 }}><AlertTriangle size={14}/>{error}</div>}
      </div>
      <button className="checkout-btn-pri" onClick={handleNext} disabled={cargando}>
        {cargando ? 'Guardando...' : 'Continuar'}
        {!cargando && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>}
      </button>
    </div>
  );
}

function PasoDireccion({ usuario, onNext, onBack }) {
  const [direcciones,    setDirecciones]    = useState([]);
  const [cargando,       setCargando]       = useState(true);
  const [tieneDirs,      setTieneDirs]      = useState(false);
  const [modo,           setModo]           = useState('nueva');
  const [dirSelec,       setDirSelec]       = useState(null);
  const [nuevaDireccion, setNuevaDireccion] = useState({ direccion_linea: '', barrio: '', ciudad: '', id_barrio: null, id_ciudad: null, referencia: '', tipo_via: '', numero: '', numeral: '', complemento: '' });
  const [errDir,         setErrDir]         = useState({});
  const [error,          setError]          = useState('');
  const [costoDomicilio, setCostoDomicilio] = useState(COSTO_DOMICILIO_DEFAULT);

  useEffect(() => {
    api.misDirecciones()
      .then((data) => {
        const activas = (data || []).filter((d) => d.estado !== 0);
        setDirecciones(activas);
        if (activas.length > 0) {
          setTieneDirs(true);
          setModo('guardada');
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const seleccionarDireccion = (d) => {
    setDirSelec(d);
    const precio = d.barrioRel?.precio_domicilio ?? d.costo_domicilio ?? COSTO_DOMICILIO_DEFAULT;
    setCostoDomicilio(precio);
  };

  const handleNext = () => {
    if (modo === 'guardada' && !dirSelec) { setError('Selecciona una dirección'); return; }
    if (modo === 'nueva') {
      const errs = {};
      if (!nuevaDireccion.tipo_via)                    errs.tipo_via        = 'Selecciona el tipo de vía';
      if (!nuevaDireccion.numero?.trim())              errs.numero          = 'Ingresa el número de la vía';
      if (!nuevaDireccion.numeral?.trim())             errs.numeral         = 'Ingresa el numeral';
      if (!nuevaDireccion.complemento?.trim())         errs.complemento     = 'Ingresa el complemento';
      if (!nuevaDireccion.direccion_linea?.trim())     errs.direccion_linea = 'Ingresa la dirección';
      if (!nuevaDireccion.id_barrio)                   errs.barrio          = 'Selecciona el barrio';
      if (!nuevaDireccion.ciudad?.trim())              errs.ciudad          = 'Selecciona el municipio';
      if (Object.keys(errs).length > 0) { setErrDir(errs); return; }
    }
    setError('');
    const dir = modo === 'guardada'
      ? { ...dirSelec, costo_domicilio: costoDomicilio }
      : { ...nuevaDireccion, costo_domicilio: nuevaDireccion.costo_domicilio || COSTO_DOMICILIO_DEFAULT, esNueva: true };
    onNext(dir);
  };


  return (
    <div className="checkout-paso">
      <h2 className="checkout-paso-titulo">Dirección de entrega</h2>
      <p className="checkout-paso-sub">¿A dónde enviamos tu pedido?</p>
      {cargando ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #f0f0f0', borderTopColor: '#CA0B0B', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : (
        <>
          {tieneDirs && (
            <div className="checkout-modo-tabs">
              <button className={`checkout-modo-tab ${modo === 'guardada' ? 'activo' : ''}`} onClick={() => setModo('guardada')}>Mis direcciones</button>
              <button className={`checkout-modo-tab ${modo === 'nueva'    ? 'activo' : ''}`} onClick={() => setModo('nueva')}>Nueva dirección</button>
            </div>
          )}
          {modo === 'guardada' && direcciones.length > 0 && (
            <>
              <div className="checkout-direcciones">
                {direcciones.map((d) => (
                  <button key={d.id_direccion} className={`checkout-dir-card ${dirSelec?.id_direccion === d.id_direccion ? 'activo' : ''}`} onClick={() => seleccionarDireccion(d)}>
                    <div className="checkout-dir-icono">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <div className="checkout-dir-info">
                      <div className="checkout-dir-linea">{d.direccion_linea}</div>
                      <div className="checkout-dir-barrio">{d.barrio}{d.ciudad ? `, ${d.ciudad}` : ''}</div>
                    </div>
                    {dirSelec?.id_direccion === d.id_direccion && <div className="checkout-dir-check"><Check size={14}/></div>}
                  </button>
                ))}
              </div>
              {dirSelec && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#166534', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{display:'flex',alignItems:'center',gap:6}}><Bike size={14}/>Costo de domicilio</span>
                  <span style={{ fontSize: 16 }}>${costoDomicilio.toLocaleString('es-CO')}</span>
                </div>
              )}
            </>
          )}
          {modo === 'nueva' && (
            <div className="checkout-form">
              <FormDireccion
                value={nuevaDireccion}
                onChange={(f, v) => { setNuevaDireccion((p) => ({ ...p, [f]: v })); setErrDir((p) => ({ ...p, [f]: '', ...(f === 'lat' || f === 'lng' ? { mapa: '' } : {}) })); setError(''); }}
                errors={errDir}
                layout="client"
              />
            </div>
          )}
        </>
      )}
      {error && <div className="checkout-error">{error}</div>}
      <div className="checkout-botones">
        <button className="checkout-btn-sec" onClick={onBack}>← Atrás</button>
        <button className="checkout-btn-pri" onClick={handleNext}>
          Continuar
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
}



function PasoPago({ carrito, direccion, onBack, onConfirmar, puntosAUsar = 0, procesando = false }) {
  const [metodoPago,     setMetodoPago]     = useState('efectivo');
  const [pagoEfectivo,   setPagoEfectivo]   = useState('');
  const [pagoTransfer,   setPagoTransfer]   = useState('');
  const [comprobante,    setComprobante]    = useState(null);
  const [comprobanteErr, setComprobanteErr] = useState('');
  const [observaciones,  setObservaciones]  = useState('');
  const [error,          setError]          = useState('');
  const [verQR,          setVerQR]          = useState(false);

  const costoDomicilio    = direccion?.costo_domicilio || COSTO_DOMICILIO_DEFAULT;
  const subtotalProductos = carrito.reduce((a, x) => a + Number(x.subtotal || 0), 0);
  const descuentoPuntos   = puntosAUsar * 12.5;
  const total             = Math.max(0, subtotalProductos - descuentoPuntos) + Number(costoDomicilio);
  const efNum             = Number(String(pagoEfectivo).replace(/\./g, '')) || 0;
  const totalPagado       = efNum + (Number(String(pagoTransfer).replace(/\./g, '')) || 0);

  const FORMATOS_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  const MAX_SIZE_MB = 5;

  const handleComprobante = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!FORMATOS_PERMITIDOS.includes(file.type)) {
      setComprobanteErr('Formato no permitido. Solo JPG, PNG o PDF.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setComprobanteErr(`El archivo supera el límite de ${MAX_SIZE_MB} MB.`);
      e.target.value = '';
      return;
    }
    setComprobanteErr('');
    setComprobante(file);
  };

  const cambiarMetodo = (m) => {
    setMetodoPago(m);
    setError('');
    if (m === 'efectivo')      { setPagoEfectivo(String(total)); setPagoTransfer(''); }
    if (m === 'transferencia') { setPagoTransfer(String(total)); setPagoEfectivo(''); }
    if (m === 'mixto')         { setPagoEfectivo(''); setPagoTransfer(''); }
    setComprobante(null);
    setComprobanteErr('');
  };

  const handleEfectivoMixto = (raw) => {
    const digits = raw.replace(/\./g, '').replace(/[^0-9]/g, '');
    const num = Math.min(Number(digits) || 0, total);
    setPagoEfectivo(num > 0 ? num.toLocaleString('es-CO') : '');
    const tr = num > 0 && num < total ? Math.max(0, total - num) : 0;
    setPagoTransfer(tr > 0 ? tr.toLocaleString('es-CO') : '');
    setError('');
  };

  const pagoCompleto = metodoPago === 'efectivo' || metodoPago === 'transferencia' || (efNum > 0 && efNum < total);

  const handleConfirmar = () => {
    if (!pagoCompleto) { setError(`Falta $${(total - totalPagado).toLocaleString('es-CO')} por cubrir`); return; }
    const ef = metodoPago === 'efectivo' ? total : metodoPago === 'mixto' ? efNum : 0;
    const tr = metodoPago === 'transferencia' ? total : metodoPago === 'mixto' ? Math.max(0, total - efNum) : 0;
    onConfirmar({ metodoPago, pagoEfectivo: String(ef), pagoTransfer: String(tr), comprobante, observaciones, puntosAUsar });
  };

  return (
    <div className="checkout-paso">
      <h2 className="checkout-paso-titulo">Método de pago</h2>
      <p className="checkout-paso-sub">¿Cómo vas a pagar tu pedido?</p>

      {/* Resumen con detalle completo */}
      <div style={{ background: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>Resumen del pedido</h3>
        {carrito.map((item, i) => (
          <div key={item.lineaId || item.id_producto || i} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{item.cantidad}x {item.nombre}</span>
                {item.chocolate && (
                  <span style={{
                    fontSize: 10, marginLeft: 6,
                    background: item.chocolate === 'Negro' ? '#1e3a5f' : '#f0f0f0',
                    color: item.chocolate === 'Negro' ? '#fff' : '#555',
                    padding: '1px 7px', borderRadius: 10, fontWeight: 600,
                  }}>
                    Chocolate {item.chocolate}
                  </span>
                )}
                {item.es_bowl && parsearSalsas(item.salsas).length > 0 && (
                  <div style={{ marginTop: 3 }}>
                    <span style={{ fontSize: 10, color: '#92400e', border: '1px solid #d97706', background: '#fffbeb', padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>
                      Cobertura: {nombreSalsa(parsearSalsas(item.salsas)[0])}
                    </span>
                  </div>
                )}
                {!item.es_bowl && parsearSalsas(item.salsas).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                    {parsearSalsas(item.salsas).map((s, i) => (
                      <span key={i} style={{ fontSize: 10, color: COLOR_SALSAS, border: `1px solid ${COLOR_SALSAS}`, background: '#fff7ed', padding: '1px 6px', borderRadius: 20, fontWeight: 600 }}>
                        {nombreSalsa(s)}{i >= MAX_SALSAS_GRATIS ? <span style={{ marginLeft: 2, opacity: 0.8 }}>+$5k</span> : ''}
                      </span>
                    ))}
                  </div>
                )}
                {item.toppings?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                    {item.toppings.map((t, i) => (
                      <span key={i} style={{ fontSize: 10, background: '#1a1a1a', color: 'white', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                        {t.nombre}{(t.cantidad || 1) > 1 ? ` ×${t.cantidad}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {item.adiciones?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                    {item.adiciones.map((a, i) => (
                      <span key={i} style={{ fontSize: 10, background: '#fffbeb', color: '#d97706', border: '1px solid #d97706', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                        +{a.nombre}{(a.cantidad || 1) > 1 ? ` ×${a.cantidad}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ fontWeight: 700, fontSize: 13, marginLeft: 12, whiteSpace: 'nowrap' }}>
                ${Number(item.subtotal || 0).toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        ))}
        {descuentoPuntos > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#16a34a', fontWeight: 700 }}>
            <span>🎯 Descuento puntos ({puntosAUsar} pts)</span>
            <span>-${descuentoPuntos.toLocaleString('es-CO')}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#888' }}>
          <span>Domicilio</span><span>${(costoDomicilio || 5500).toLocaleString('es-CO')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 16, fontWeight: 800, color: '#1a1a1a', borderTop: '2px solid #f0f0f0', marginTop: 4 }}>
          <span>Total</span>
          <span style={{ color: '#CA0B0B' }}>${total.toLocaleString('es-CO')}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {[
          {
            v: 'efectivo',
            logo: <LogoEfectivo size={24} />,
            label: 'Efectivo',
          },
          {
            v: 'transferencia',
            logo: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <LogoBancolombia size={24} />
                <LogoNequi size={20} />
              </div>
            ),
            label: 'Transferencia',
          },
          {
            v: 'mixto',
            logo: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                <LogoEfectivo size={20} />
                <span style={{ fontSize: 10, color: '#ccc' }}>+</span>
                <LogoBancolombia size={20} />
              </div>
            ),
            label: 'Ef. + Transfer.',
          },
        ].map((m) => (
          <button key={m.v} type="button" onClick={() => cambiarMetodo(m.v)}
            style={{
              flex: 1, padding: '14px 8px', borderRadius: 12, cursor: 'pointer',
              border: metodoPago === m.v ? '2px solid #CA0B0B' : '1px solid #e5e7eb',
              background: metodoPago === m.v ? '#fff5f5' : 'white',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}>
            {m.logo}
            <span style={{ fontSize: 12, fontWeight: 700, color: metodoPago === m.v ? '#CA0B0B' : '#555' }}>
              {m.label}
            </span>
          </button>
        ))}
      </div>

      {/* Info bancaria en 3 columnas + lightbox */}
      {verQR && (
        <div onClick={() => setVerQR(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <div onClick={(e) => e.stopPropagation()}>
            <img src="https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778551977/Captura_de_pantalla_2026-05-11_210420_xc3wav.png"
              alt="QR Bancolombia" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
            <p style={{ color: 'white', textAlign: 'center', marginTop: 12, fontSize: 13 }}>Toca fuera para cerrar</p>
          </div>
        </div>
      )}
      {(metodoPago === 'transferencia' || metodoPago === 'mixto') && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Datos para transferencia</p>
          <div className="checkout-pago-grid">
            {/* QR */}
            <div onClick={() => setVerQR(true)} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, textAlign: 'center', cursor: 'zoom-in' }}>
              <img src="https://res.cloudinary.com/dnoxlv5kn/image/upload/v1778551977/Captura_de_pantalla_2026-05-11_210420_xc3wav.png"
                alt="QR" style={{ width: '100%', maxWidth: 120, height: 'auto', borderRadius: 8, objectFit: 'contain', margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>QR Bancolombia</div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Toca para ampliar</div>
            </div>
            {/* Bancolombia */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <LogoBancolombia size={28} />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a' }}>Bancolombia</span>
              </div>
              {[{ l: 'Tipo', v: 'Cuenta Ahorros' }, { l: 'Número', v: '00635734892' }, { l: 'Titular', v: 'Gilberto Montoya' }].map(({ l, v }) => (
                <div key={l} style={{ fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: '#888' }}>{l}: </span>
                  <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{v}</span>
                </div>
              ))}
              <button onClick={() => navigator.clipboard.writeText('00635734892').then(() => toast.success('Número copiado al portapapeles'))}
                style={{ marginTop: 8, width: '100%', padding: '6px', background: '#f9f9f9', border: '1px solid #e5e7eb', borderRadius: 6, color: '#555', fontWeight: 700, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                Copiar número
              </button>
            </div>
            {/* Nequi */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <LogoNequi size={32} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', letterSpacing: 3, marginBottom: 4 }}>009181338</div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Llave Nequi</div>
              <button onClick={() => navigator.clipboard.writeText('009181338').then(() => toast.success('Llave copiada al portapapeles'))}
                style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9f9f9', color: '#555', fontWeight: 700, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                Copiar llave
              </button>
            </div>
          </div>
        </div>
      )}

      {metodoPago === 'efectivo' && (
        <div className="checkout-campo" style={{ marginTop: 16 }}>
          <label className="checkout-label">Monto en efectivo (total pre-llenado)</label>
          <div className="checkout-precio-wrap">
            <span className="checkout-precio-simbolo">$</span>
            <input className="checkout-input checkout-input-precio input-monto" type="text" value={total.toLocaleString('es-CO')} readOnly style={{ background: '#f9fafb', cursor: 'not-allowed' }} />
          </div>
        </div>
      )}

      {metodoPago === 'transferencia' && (
        <>
          <div className="checkout-campo" style={{ marginTop: 16 }}>
            <label className="checkout-label">Monto por transferencia (total pre-llenado)</label>
            <div className="checkout-precio-wrap">
              <span className="checkout-precio-simbolo">$</span>
              <input className="checkout-input checkout-input-precio input-monto" type="text" value={total.toLocaleString('es-CO')} readOnly style={{ background: '#f9fafb', cursor: 'not-allowed' }} />
            </div>
          </div>
          <div className="checkout-campo" style={{ marginTop: 12 }}>
            <label className="checkout-label">Comprobante de transferencia</label>
            <label className="checkout-upload">
              {comprobante
                ? (comprobante.type === 'application/pdf'
                    ? <div className="checkout-upload-pdf">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CA0B0B" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span>{comprobante.name}</span>
                      </div>
                    : <img src={URL.createObjectURL(comprobante)} className="checkout-upload-preview" alt="comprobante" />
                  )
                : <div className="checkout-upload-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span>Subir comprobante</span>
                  </div>
              }
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={handleComprobante} />
            </label>
            <p className="checkout-upload-hint">Formatos permitidos: <strong>JPG, PNG, PDF</strong> · Tamaño máximo: <strong>5 MB</strong></p>
            {comprobanteErr && <div className="checkout-error" style={{ marginTop: 6, marginBottom: 0 }}>{comprobanteErr}</div>}
          </div>
        </>
      )}

      {metodoPago === 'mixto' && (
        <>
          {/* Montos lado a lado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div className="checkout-campo" style={{ margin: 0 }}>
              <label className="checkout-label" style={{display:'flex',alignItems:'center',gap:5}}><LogoEfectivo size={14}/>Efectivo</label>
              <div className="checkout-precio-wrap">
                <span className="checkout-precio-simbolo">$</span>
                <input className="checkout-input checkout-input-precio" type="text" inputMode="numeric" placeholder="0" value={pagoEfectivo} onChange={(e) => handleEfectivoMixto(e.target.value)} />
              </div>
            </div>
            <div className="checkout-campo" style={{ margin: 0 }}>
              <label className="checkout-label" style={{display:'flex',alignItems:'center',gap:5}}><LogoBancolombia size={14}/><LogoNequi size={14}/>Transferencia</label>
              <div className="checkout-precio-wrap">
                <span className="checkout-precio-simbolo">$</span>
                <input className="checkout-input checkout-input-precio" type="text" placeholder="0" value={pagoTransfer} readOnly style={{ background: '#f9f9f9', cursor: 'default' }} />
              </div>
            </div>
          </div>
          <div className="checkout-campo" style={{ marginTop: 12 }}>
            <label className="checkout-label">Comprobante de transferencia</label>
            <label className="checkout-upload">
              {comprobante
                ? (comprobante.type === 'application/pdf'
                    ? <div className="checkout-upload-pdf">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CA0B0B" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span>{comprobante.name}</span>
                      </div>
                    : <img src={URL.createObjectURL(comprobante)} className="checkout-upload-preview" alt="comprobante" />
                  )
                : <div className="checkout-upload-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span>Subir comprobante</span>
                  </div>
              }
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={handleComprobante} />
            </label>
            <p className="checkout-upload-hint">Formatos permitidos: <strong>JPG, PNG, PDF</strong> · Tamaño máximo: <strong>5 MB</strong></p>
            {comprobanteErr && <div className="checkout-error" style={{ marginTop: 6, marginBottom: 0 }}>{comprobanteErr}</div>}
          </div>
          <div className="checkout-cambio">
            <div className="checkout-cambio-fila">
              <span>Total cubierto</span>
              <span style={{ color: pagoCompleto ? '#16a34a' : '#CA0B0B', fontWeight: 800 }}>${totalPagado.toLocaleString('es-CO')} / ${total.toLocaleString('es-CO')}</span>
            </div>
            {!pagoCompleto && (
              <div className="checkout-cambio-fila"><span>Falta</span><span style={{ color: '#CA0B0B', fontWeight: 800 }}>${(total - totalPagado).toLocaleString('es-CO')}</span></div>
            )}
          </div>
        </>
      )}

      <div className="checkout-campo" style={{ marginTop: 16 }}>
        <label className="checkout-label">Observaciones (opcional)</label>
        <textarea
          rows={1}
          placeholder="¿Alguna nota? (opcional)"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'none', overflow: 'hidden', minHeight: 36, maxHeight: 120, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {error && <div className="checkout-error">{error}</div>}

      <div className="checkout-botones">
        <button className="checkout-btn-sec" onClick={onBack}>← Atrás</button>
        <button className="checkout-btn-confirmar" onClick={handleConfirmar} disabled={!pagoCompleto || procesando} style={{ opacity: procesando ? 0.7 : 1, cursor: procesando ? 'not-allowed' : 'pointer' }}>
          {procesando ? 'Enviando pedido...' : 'Confirmar pedido'}
          {!procesando && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>
      </div>
    </div>
  );
}

function PedidoConfirmado({ onVolver, onVerPedidos }) {
  const tiempoEspera = useTiempoEspera();
  return (
    <div className="checkout-confirmado">
      <div className="confirmado-icono">🎉</div>
      <h2 className="confirmado-titulo">¡Pedido recibido!</h2>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 20, padding: '8px 20px', fontSize: 14, color: '#CA0B0B', fontWeight: 700, marginBottom: 12 }}>
        ⏱️ Tiempo estimado de entrega: {tiempoEspera}–{tiempoEspera + 20} min
      </div>
      <p className="confirmado-sub">Tu pedido está siendo preparado. En <strong>Mis pedidos</strong> puedes ver el estado actualizado en tiempo real.</p>
      <div className="confirmado-pasos">
        {[
          { label: 'Recibido',  activo: true  },
          { label: 'En cocina', activo: false },
          { label: 'En camino', activo: false },
          { label: 'Entregado', activo: false },
        ].map((paso, i, arr) => (
          <div key={paso.label} className="confirmado-paso">
            <div className="confirmado-paso-fila">
              <div className={`confirmado-paso-circulo ${paso.activo ? 'activo' : ''}`}>
                {paso.activo ? <Check size={14}/> : i + 1}
              </div>
              {i < arr.length - 1 && <div className="confirmado-paso-linea" />}
            </div>
            <span className={`confirmado-paso-label ${paso.activo ? 'activo' : ''}`}>{paso.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="checkout-btn-pri" onClick={onVerPedidos}>
          Ver mis pedidos
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button className="checkout-btn-sec" onClick={onVolver}>
          Volver al catálogo
        </button>
      </div>
    </div>
  );
}

export default function Checkout() {
  const [paso,       setPaso]       = useState(1);
  const [direccion,  setDireccion]  = useState(null);
  const [distKm,     setDistKm]     = useState(0);
  const [procesando, setProcesando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const navigate                           = useNavigate();
  const location                           = useLocation();
  const { usuario, actualizarUsuario }     = useAuth();
  const { carrito, limpiarCarrito }        = useCart();

  // Puntos que viene desde el carrito del catálogo
  const puntosAUsarNav = location.state?.puntosAUsar || 0;

  const handleDatosNext = () => {
    setPaso(2);
  };

  // Carrito vacío sin haber confirmado → redirige al catálogo
  if (carrito.length === 0 && !confirmado) {
    return (
      <div className="checkout-wrapper">
        <Navbar />
        <div className="checkout-page">
          <div className="checkout-contenido" style={{ textAlign: 'center', padding: '60px 32px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
            <h2 style={{ fontWeight: 900, marginBottom: 8 }}>Tu carrito está vacío</h2>
            <p style={{ color: '#888', marginBottom: 24, fontWeight: 600 }}>Agrega productos antes de continuar con el pedido.</p>
            <button className="checkout-btn-pri" onClick={() => navigate('/catalogo')}>
              Ir al catálogo
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleConfirmar = async (pagoInfo) => {
    if (procesando) return;
    setProcesando(true);
    try {
      // Subir comprobante a Cloudinary si existe
      let comprobanteUrl = null;
      if (pagoInfo?.comprobante instanceof File) {
        try {
          const formData = new FormData();
          formData.append('file', pagoInfo.comprobante);
          formData.append('upload_preset', 'chocoadmin_upload');
          const res  = await fetch('https://api.cloudinary.com/v1_1/dnoxlv5kn/image/upload', { method: 'POST', body: formData });
          const json = await res.json();
          comprobanteUrl = json.secure_url || null;
        } catch (_) { /* silencioso — no bloquear pedido */ }
      }

      // Armar items para la API
      const items = carrito.map((item) => ({
        id_producto:  item.id_producto,
        cantidad:     item.cantidad,
        max_toppings: item.max_toppings || 0,
        toppings:     (item.toppings || []).map((t) => ({ id_topping: t.id_topping, cantidad: t.cantidad || 1 })),
        adiciones:    (item.adiciones || []).map((a) => ({ id_adicion: a.id_adicion, cantidad: a.cantidad || 1 })),
        salsas:       (item.salsas || []).map(s => typeof s === 'object' ? (s.id || s.nombre) : s),
        chocolate:    item.chocolate || null,
      }));

      // Armar payload
      const payload = {
        costo_domicilio:     direccion?.costo_domicilio || COSTO_DOMICILIO_DEFAULT,
        observaciones:       pagoInfo?.observaciones || null,
        metodo_pago:         pagoInfo?.metodoPago || 'efectivo',
        monto_efectivo:      Number(pagoInfo?.pagoEfectivo)  || 0,
        monto_transferencia: Number(pagoInfo?.pagoTransfer)  || 0,
        items,
        puntos_a_usar: pagoInfo?.puntosAUsar || 0,
        ...(comprobanteUrl ? { comprobante_url: comprobanteUrl } : {}),
      };

      if (direccion?.id_direccion) {
        payload.id_direccion = direccion.id_direccion;
      } else if (direccion?.direccion_linea) {
        payload.nueva_direccion = {
          direccion_linea: direccion.direccion_linea,
          barrio:          direccion.barrio       || null,
          ciudad:          direccion.ciudad       || null,
          id_barrio:       direccion.id_barrio    || null,
          departamento:    direccion.departamento || null,
          referencia:      direccion.referencia   || null,
        };
      }

      await api.crearMiPedido(payload);

      // Auto-guardar dirección nueva en el perfil del cliente
      if (direccion?.esNueva && direccion?.direccion_linea) {
        api.crearMiDireccion({
          direccion_linea: direccion.direccion_linea,
          barrio:          direccion.barrio       || null,
          ciudad:          direccion.ciudad       || null,
          id_barrio:       direccion.id_barrio    || null,
          departamento:    direccion.departamento || null,
          referencia:      direccion.referencia   || null,
        }).catch(() => {}); // no bloquear si falla
      }

      limpiarCarrito();
      setConfirmado(true);
    } catch (err) {
      console.error('Error al crear pedido:', err?.response?.data?.message || err.message);
    } finally {
      setProcesando(false);
    }
  };

  if (confirmado) return (
    <div className="checkout-wrapper">
      <Navbar />
      <div className="checkout-page">
        <PedidoConfirmado
          onVolver={() => navigate('/catalogo')}
          onVerPedidos={() => navigate('/perfil')}
        />
      </div>
    </div>
  );

  return (
    <div className="checkout-wrapper">
      <Navbar />
      <div className="checkout-page">
        <div className="checkout-pasos">
          {['Datos', 'Dirección', 'Pago'].map((p, i) => (
            <div key={p} className="checkout-paso-item">
              <div className={`checkout-paso-circulo ${paso === i+1 ? 'activo' : ''} ${paso > i+1 ? 'completado' : ''}`}>
                {paso > i+1 ? <Check size={12}/> : i+1}
              </div>
              <span className={`checkout-paso-label ${paso === i+1 ? 'activo' : ''}`}>{p}</span>
              {i < 2 && <div className="checkout-paso-linea" />}
            </div>
          ))}
        </div>
        <div className="checkout-contenido">
          {paso === 1 && <PasoDatos     usuario={usuario} onNext={handleDatosNext} onActualizarUsuario={actualizarUsuario} />}
          {paso === 2 && <PasoDireccion usuario={usuario} onNext={(d) => { setDireccion(d); setDistKm(d.distancia_km || 0); setPaso(3); }} onBack={() => setPaso(1)} />}
          {paso === 3 && <PasoPago      carrito={carrito} direccion={direccion} onBack={() => setPaso(2)} onConfirmar={(pagoInfo) => handleConfirmar(pagoInfo)} puntosAUsar={puntosAUsarNav} procesando={procesando} />}
        </div>
      </div>
    </div>
  );
}