import { useNavigate } from 'react-router-dom';
import { useEstadoTienda } from '../../../../../hooks/useEstadoTienda';
import { formatHora12 } from '../../../../../utils/formatHora';
import './Hero.css';

const FresaSVG = ({ className }) => (
  <svg className={className} viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg" fill="rgba(0,0,0,0.2)">
    <path d="M40 95 C20 95 8 75 8 58 C8 40 20 28 40 28 C60 28 72 40 72 58 C72 75 60 95 40 95Z"/>
    <path d="M40 28 C40 28 22 18 18 28 C28 32 40 28 40 28Z"/>
    <path d="M40 28 C40 28 58 18 62 28 C52 32 40 28 40 28Z"/>
    <rect x="38" y="8" width="4" height="22" rx="2"/>
  </svg>
);

const DuraznoSVG = ({ className }) => (
  <svg className={className} viewBox="0 0 90 105" xmlns="http://www.w3.org/2000/svg" fill="rgba(0,0,0,0.18)">
    <path d="M45 98 C20 98 10 78 10 60 C10 38 25 22 45 22 C65 22 80 38 80 60 C80 78 70 98 45 98Z"/>
    <path d="M45 22 C45 22 38 8 45 5 C52 8 45 22 45 22Z"/>
    <path d="M45 22 L45 65" stroke="rgba(0,0,0,0.12)" strokeWidth="3" fill="none"/>
  </svg>
);

export default function Hero() {
  const navigate      = useNavigate();
  const estadoTienda  = useEstadoTienda();

  return (
    <section className="hero">
      <div className="hero-contenido">
        {!estadoTienda.cargando && (
          estadoTienda.abierto
            ? <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-block', marginBottom: 8 }}>🟢 Abierto ahora</span>
            : <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-block', marginBottom: 8 }}>
                🔴 Cerrado · {estadoTienda.estado === 'closed' ? 'Temporalmente' : `Abrimos ${formatHora12(estadoTienda.hora_apertura)}`}
              </span>
        )}
        <h1 className="hero-titulo">
          ChocoFreseo es puro Freseo
        </h1>
        <p className="hero-subtitulo">
          Postres únicos con estética juvenil y sabores que no habías probado antes.
          Pídenos a domicilio o visítanos en Aranjuez o La Milagrosa.
        </p>
        <div className="hero-botones">
          <button className="hero-btn-primario" onClick={() => navigate('/catalogo')}>
            Pedir ahora
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <a href="#nosotros" className="hero-btn-secundario">Conócenos</a>
        </div>
      </div>

      <div className="hero-imagen">
        <div className="hero-imagen-wrap">
          <div className="hero-imagen-tonalizada">
            <img
              src="https://res.cloudinary.com/diqeuyoqo/image/upload/v1780607775/40bc9e7c-2c1d-48a5-a4b8-fdcd46a17a4e_al6zv9.jpg"
              alt="ChocoFreseo - Puro Freseo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                display: 'block',
              }}
            />
            <div className="hero-imagen-overlay" />
          </div>
        </div>
      </div>

      <div className="hero-fondo">
        <FresaSVG className="hero-fruta hero-fruta-1" />
        <FresaSVG className="hero-fruta hero-fruta-2" />
        <FresaSVG className="hero-fruta hero-fruta-3" />
        <DuraznoSVG className="hero-fruta hero-fruta-4" />
        <DuraznoSVG className="hero-fruta hero-fruta-5" />
      </div>
    </section>
  );
}
