import { useState, useEffect, useRef } from 'react';
import ClientLayout from '../../../components/layout/ClientLayout';
import Hero         from './components/Hero';
import Conocenos    from './components/Conocenos';
import CtaFinal     from './components/CtaFinal';
import { ShoppingBag, MapPin, CreditCard, Truck } from 'lucide-react';
import { LogoInstagram, LogoTikTok, LogoFacebook } from '../../../components/common/LogosApps';
import './Landing.css';

const PRODUCTOS_ESTRELLA = [
  { nombre: 'Cherry Cream',        keywords: ['cherry cream'] },
  { nombre: 'ChocoNachos',         keywords: ['choco nachos', 'choconachos'] },
  { nombre: 'Krispi Cream',        keywords: ['krispi cream'] },
  { nombre: 'ChocoSpaguetis',      keywords: ['spaguetti'] },
  { nombre: 'Choco Frappé',        keywords: ['frappe'] },
  { nombre: 'Fresas con crema',    keywords: ['fresas con crema'] },
  { nombre: 'Krispi Bowl',         keywords: ['krispi bowl'] },
  { nombre: 'Melofresa',           keywords: ['melofresa'] },
];

const PASOS = [
  { icono: <ShoppingBag size={28} />, numero: '01', titulo: 'Elige tu antojo',    desc: 'Explora el catálogo, personaliza con toppings, untables y adiciones' },
  { icono: <MapPin      size={28} />, numero: '02', titulo: 'Marca tu ubicación', desc: 'Pon el pin en el mapa y calculamos el domicilio automáticamente' },
  { icono: <CreditCard  size={28} />, numero: '03', titulo: 'Elige cómo pagar',  desc: 'Efectivo, transferencia o mixto. Sin complicaciones' },
  { icono: <Truck       size={28} />, numero: '04', titulo: 'Recíbelo con freseo', desc: 'Tu pedido llega directo a tu puerta, fresquito y delicioso' },
];

export default function Landing() {
  const [productosDB, setProductosDB] = useState([]);
  const videoRef = useRef(null);

  useEffect(() => {
    document.title = 'ChocoFreseo | Chocolates, Fresas y Postres en Medellín';
  }, []);

  useEffect(() => {
    const apiUrl = (process.env.REACT_APP_API_URL || 'https://mi-api-qpjo.onrender.com') + '/api';
    fetch(`${apiUrl}/catalogo/productos`)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(d => {
        if (d.success && Array.isArray(d.data)) setProductosDB(d.data);
      })
      .catch(() => {});
  }, []);

  const getImgProducto = (keywords) => {
    if (!productosDB.length) return null;
    const prod = productosDB.find(p =>
      p.estado === 1 &&
      keywords.some(k => p.nombre.toLowerCase().includes(k.toLowerCase()))
    );
    return prod?.img || null;
  };

  return (
    <ClientLayout>
      <Hero />

      {/* ── Sección de video ── */}
      <section style={{ padding: '60px 20px', background: 'white' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>
            Aprende a pedir en 1 minuto
          </h2>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 32 }}>
            Mira este video rápido y descubre lo fácil que es hacer tu pedido en ChocoFreseo. Mientras tanto, síguenos en nuestras redes:
          </p>

          <div style={{
            background: '#1a1a1a',
            borderRadius: 20, overflow: 'hidden',
            aspectRatio: '16/9', position: 'relative',
            maxWidth: 640, margin: '0 auto 24px',
          }}>
            {/* Sin JS de orientación a propósito: un intento anterior de forzar
                screen.orientation.unlock() en fullscreenchange (para permitir
                fullscreen vertical) causaba que el aviso nativo "pantalla
                completa, presiona Atrás para salir" de Chrome/Android tardara
                mucho más en desaparecer, y el video se veía roto en vertical
                -- ambos síntomas apuntan a que ese código competía con el
                bloqueo a landscape que Chrome ya hace por su cuenta para un
                video más ancho que alto. Se quitó: forzar landscape en
                fullscreen para un video horizontal es el comportamiento
                estándar de facto (YouTube, Vimeo, etc.), no un bug. */}
            <video
              ref={videoRef}
              controls
              preload="auto"
              style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
            >
              <source src="https://res.cloudinary.com/diqeuyoqo/video/upload/v1787968751/ChocoFreseo_video_landing_v2_fark9e.mp4" type="video/mp4" />
              Tu navegador no soporta la reproducción de video.
            </video>
          </div>

          {/* Orden: TikTok @chocofreseo · Instagram @chocofreseo · TikTok @sorprendetupaladar */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://tiktok.com/@chocofreseo" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#1a1a1a', color: 'white',
                textDecoration: 'none', padding: '10px 20px',
                borderRadius: 10, fontWeight: 700, fontSize: 13,
              }}>
              <LogoTikTok size={16} color="white"/> @chocofreseo
            </a>
            <a href="https://instagram.com/chocofreseo" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                color: 'white', textDecoration: 'none',
                padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13,
              }}>
              <LogoInstagram size={16} color='white'/> @chocofreseo
            </a>
            <a href="https://tiktok.com/@sorprendetupaladar" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#1a1a1a', color: 'white',
                textDecoration: 'none', padding: '10px 20px',
                borderRadius: 10, fontWeight: 700, fontSize: 13,
              }}>
              <LogoTikTok size={16} color="white"/> @sorprendetupaladar
            </a>
            <a href="https://www.facebook.com/share/1NiKgTtfUb/" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#1877F2', color: 'white',
                textDecoration: 'none', padding: '10px 20px',
                borderRadius: 10, fontWeight: 700, fontSize: 13,
              }}>
              <LogoFacebook size={16} color="white"/> ChocoFreseo
            </a>
          </div>
        </div>
      </section>

      {/* ── Productos estrella ── */}
      <section style={{ padding: '60px 20px', background: '#f7f8fd' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>
            Nuestros productos estrella ⭐
          </h2>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 40 }}>
            Creaciones únicas que no encontrarás en ningún otro lugar
          </p>
          <div className="productos-estrella-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
          }}>
            {PRODUCTOS_ESTRELLA.map(p => {
              const img = getImgProducto(p.keywords);
              return (
                <div key={p.nombre} style={{
                  borderRadius: 16, overflow: 'hidden',
                  background: img ? 'transparent' : 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'default',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(202,11,11,0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)';
                }}>
                  <div style={{ height: 160, position: 'relative', overflow: 'hidden' }}>
                    {img ? (
                      <img src={img} alt={p.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        background: 'linear-gradient(135deg, #CA0B0B22, #1a1a1a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{
                          fontSize: 32, fontWeight: 900,
                          color: 'rgba(255,255,255,0.15)',
                          textAlign: 'center', padding: '0 16px',
                          lineHeight: 1.2,
                        }}>
                          {p.nombre.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                      padding: '24px 14px 12px',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
                        {p.nombre}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 32 }}>
            <a href="/catalogo" style={{
              display: 'inline-block',
              background: '#CA0B0B', color: 'white',
              textDecoration: 'none', padding: '14px 36px',
              borderRadius: 10, fontWeight: 700, fontSize: 15,
            }}>Ver catálogo completo →</a>
          </div>
        </div>
      </section>

      {/* ── El proceso más freseo ── */}
      <section style={{ background: '#1a1a1a', padding: '70px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 300, height: 300, background: 'radial-gradient(circle, rgba(202,11,11,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(202,11,11,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />

        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 4, color: '#CA0B0B', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
              ASÍ DE SIMPLE
            </span>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: 'white', margin: '0 0 12px', lineHeight: 1.1 }}>
              El proceso con más freseo
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
              De tu antojo a tu puerta en pocos pasos
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            {PASOS.map((paso, i) => (
              <div key={i} style={{
                padding: '32px 28px',
                background: i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(202,11,11,0.08)',
                borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                position: 'relative',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(202,11,11,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(202,11,11,0.08)'; }}
              >
                <div style={{ position: 'absolute', top: 16, right: 20, fontSize: 64, fontWeight: 900, color: 'rgba(255,255,255,0.04)', lineHeight: 1, userSelect: 'none' }}>
                  {paso.numero}
                </div>
                <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(202,11,11,0.2)', border: '1px solid rgba(202,11,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CA0B0B', marginBottom: 20 }}>
                  {paso.icono}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#CA0B0B', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                  PASO {paso.numero}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 10, lineHeight: 1.2 }}>
                  {paso.titulo}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                  {paso.desc}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <a href="/catalogo" style={{ display: 'inline-block', background: '#CA0B0B', color: 'white', textDecoration: 'none', padding: '14px 40px', borderRadius: 10, fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}>
              Pedir ahora
            </a>
          </div>
        </div>
      </section>

      <Conocenos />
      <CtaFinal />
    </ClientLayout>
  );
}
