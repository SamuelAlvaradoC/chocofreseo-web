import { useState, useEffect } from 'react';
import { LogoWhatsApp, LogoBancolombia, LogoEfectivo } from '../../../components/common/LogosApps';
import Navbar from '../../../components/layout/Navbar/Navbar';
import Footer from '../../../components/layout/Footer/Footer';
import { useTiempoEspera } from '../../../hooks/useTiempoEspera';
import * as api from '../../../services/api';
import '../perfil/Perfil.css';

const COLOR_SALSAS       = '#ea580c';
const MAX_SALSAS_GRATIS  = 2;
const PRECIO_SALSA_EXTRA = 5000;

const parsearSalsas = (raw) => { if (!raw) return []; try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(p) ? p : []; } catch { return []; } };
const nombreSalsa   = (s) => { const n = typeof s === 'object' ? s.nombre : s; if (!n) return ''; return n.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); };

const calcularSubtotalDetalle = (d) => {
  const precioBase   = Number(d.producto?.precio || 0);
  const precioUnitBD = Number(d.precio_unitario || 0);
  const cantidad     = d.cantidad || 1;
  const permTop      = d.producto?.permite_toppings;
  const maxInc       = permTop ? (d.producto?.max_toppings || 0) : 0;
  const totTop       = (d.detalleToppings || []).reduce((s,t) => s+(t.cantidad||1), 0);
  const cobTop       = Math.max(0, totTop - maxInc);
  const topExtra     = cobTop * 2000;
  const salsas       = parsearSalsas(d.salsas);
  const cobSal       = Math.max(0, salsas.length - MAX_SALSAS_GRATIS);
  const salExtra     = cobSal * PRECIO_SALSA_EXTRA;
  const adicsTotal   = (d.detalleAdiciones || []).reduce((s,a) => s+Number(a.subtotal||0), 0);
  const precioCalc   = precioBase + topExtra + salExtra;
  const precioFinal  = Math.max(precioUnitBD, precioCalc);
  return precioFinal * cantidad + adicsTotal;
};

const ESTADO_LABELS = {
  pendiente:  'Pendiente',
  en_proceso: 'En cocina',
  listo:      'En cocina',
  despachado: 'En camino',
  entregado:  'Entregado',
  anulado:    'Cancelado',
};

const colorEstado = (e) => ({
  pendiente:  { bg: '#fefce8', color: '#ca8a04' },
  en_proceso: { bg: '#fff7ed', color: '#ea580c' },
  listo:      { bg: '#eff6ff', color: '#3b82f6' },
  despachado: { bg: '#f5f3ff', color: '#7c3aed' },
  entregado:  { bg: '#f0fdf4', color: '#16a34a' },
  anulado:    { bg: '#fff5f5', color: '#CA0B0B' },
}[e] || { bg: '#f5f5f5', color: '#888' });

export default function MisPedidos() {
  const [expandido, setExpandido] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const tiempoEspera = useTiempoEspera();

  const cargar = () => api.misVentas()
    .then((data) => setHistorial(data || []))
    .catch(() => setHistorial([]))
    .finally(() => setCargando(false));
  useEffect(() => { cargar(); }, []);

  return (
    <div className="perfil-wrapper">
      <Navbar />
      <div className="perfil-page">
        <div className="perfil-hero">
          <div className="perfil-hero-avatar">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div>
            <h1 className="perfil-hero-nombre">Mis pedidos</h1>
            <p className="perfil-hero-email">{historial.length} pedidos realizados</p>
          </div>
        </div>

        <div className="perfil-layout">
          <div className="perfil-contenido" style={{ gridColumn: '1 / -1' }}>
            <div className="perfil-seccion">
              {cargando ? (
                <div className="perfil-vacio"><p>Cargando...</p></div>
              ) : historial.length === 0 ? (
                <div className="perfil-vacio"><span style={{ fontSize: 40 }}>🛒</span><p>Aún no tienes pedidos</p></div>
              ) : (
                <div className="historial-lista">
                  {historial.map((v) => {
                    const estadoNombre = v.estado?.nombre_estado || v.estado || 'pendiente';
                    const est          = colorEstado(estadoNombre);
                    const abierto      = expandido === v.id_venta;
                    const fechaFmt     = v.fecha ? new Date(v.fecha).toLocaleString('es-CO') : '—';
                    return (
                      <div key={v.id_venta} className="historial-item">
                        <div className="historial-item-header" onClick={() => setExpandido(abierto ? null : v.id_venta)}>
                          <div className="historial-item-izq">
                            <span className="historial-id">#{v.id_venta}</span>
                            <span className="historial-fecha">{fechaFmt}</span>
                          </div>
                          <div className="historial-item-der">
                            <span className="historial-total">${Number(v.total).toLocaleString('es-CO')}</span>
                            <span className="historial-estado" style={{ background: est.bg, color: est.color }}>{ESTADO_LABELS[estadoNombre] || estadoNombre}</span>
                            {(estadoNombre === 'pendiente' || estadoNombre === 'en_proceso') && (
                              <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>⏱️ {tiempoEspera}–{tiempoEspera + 20} min</span>
                            )}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"
                              style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </div>
                        </div>
                        {estadoNombre === 'anulado' && (
                          <div style={{ padding: '4px 16px 6px', fontSize: 12, color: '#888' }}>
                            Motivo: {v.motivo_anulacion || 'Sin especificar'}
                          </div>
                        )}
                        {abierto && (
                          <div className="historial-item-detalle">
                            {v.direccion && (
                              <div style={{ fontSize: 12, color: '#888', marginBottom: 10, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CA0B0B" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                <span>{v.direccion?.direccion_linea || '—'}{v.direccion?.barrio ? `, ${v.direccion.barrio}` : ''}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                              {(v.detalleVentas || []).map((d, i) => (
                                <div key={i} style={{ background: '#fafafa', borderRadius: 8, padding: '10px 12px', border: '1px solid #f0f0f0' }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}>
                                    <span style={{ fontWeight: 700, fontSize: 13 }}>{d.cantidad}× {d.producto?.nombre || '—'}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#CA0B0B' }}>${calcularSubtotalDetalle(d).toLocaleString('es-CO')}</span>
                                  </div>
                                  {d.chocolate && (
                                    <span style={{ background: d.chocolate==='Negro' ? '#1e3a5f' : '#f0f0f0', color: d.chocolate==='Negro' ? '#fff' : '#555', fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 600, display: 'inline-block', marginBottom: 4 }}>
                                      Chocolate {d.chocolate}
                                    </span>
                                  )}
                                  {parsearSalsas(d.salsas).length > 0 && <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:4 }}>{parsearSalsas(d.salsas).map((s,si) => <span key={si} style={{ fontSize:10, color:COLOR_SALSAS, background:'#fff7ed', border:`1px solid ${COLOR_SALSAS}`, padding:'1px 7px', borderRadius:20, fontWeight:600 }}>{nombreSalsa(s)}</span>)}</div>}
                                  {(d.detalleToppings?.length > 0 || d.detalleAdiciones?.length > 0) && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                      {(d.detalleToppings || []).map((t, ti) => (
                                        <span key={ti} style={{ background: '#1a1a1a', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                                          {t.topping?.nombre}{(t.cantidad || 1) > 1 ? ` ×${t.cantidad}` : ''}
                                        </span>
                                      ))}
                                      {(d.detalleAdiciones || []).map((a, ai) => (
                                        <span key={ai} style={{ background: '#d97706', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                                          +{a.adicion?.nombre}{(a.cantidad || 1) > 1 ? ` ×${a.cantidad}` : ''}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10, marginBottom: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 3 }}>
                                <span>Subtotal productos</span>
                                <span>${Number(v.subtotal || 0).toLocaleString('es-CO')}</span>
                              </div>
                              {Number(v.descuento_puntos) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#16a34a', marginBottom: 3, fontWeight: 700 }}>
                                  <span>Descuento puntos ({v.puntos_usados} pts)</span>
                                  <span>-${Number(v.descuento_puntos).toLocaleString('es-CO')}</span>
                                </div>
                              )}
                              {(() => {
                                const ganados = (v.movimientosPuntos || []).filter((m) => m.tipo === 'acumulacion').reduce((s, m) => s + m.puntos, 0);
                                if (ganados <= 0) return null;
                                return (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#d97706', marginBottom: 3, fontWeight: 700 }}>
                                    <span>Puntos ganados</span>
                                    <span>+{ganados} pts</span>
                                  </div>
                                );
                              })()}
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 6 }}>
                                <span>Domicilio</span>
                                <span>${Number(v.costo_domicilio || 0).toLocaleString('es-CO')}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, color: '#16a34a' }}>
                                <span>Total</span>
                                <span>${Number(v.total || 0).toLocaleString('es-CO')}</span>
                              </div>
                            </div>
                            {v.metodo_pago && (
                              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                                <span style={{ background: '#f0f0f0', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                                  {v.metodo_pago === 'efectivo' ? <><LogoEfectivo size={12} style={{marginRight:3}}/>Efectivo</> : v.metodo_pago === 'transferencia' ? <><LogoBancolombia size={12} style={{marginRight:3}}/>Transferencia</> : <><LogoEfectivo size={12} style={{marginRight:3}}/>Mixto</>}
                                </span>
                              </div>
                            )}
                            {estadoNombre === 'anulado' && v.motivo_anulacion && (
                              <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#CA0B0B', marginBottom: 8 }}>
                                <strong>Motivo de cancelación:</strong> {v.motivo_anulacion}
                              </div>
                            )}
                            <a href="https://wa.me/573159914624" target="_blank" rel="noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>
                              <LogoWhatsApp size={14}/>
                              ¿Necesitas ayuda? Escríbenos
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
