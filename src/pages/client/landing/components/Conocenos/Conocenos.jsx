import { Clock } from 'lucide-react';
import './Conocenos.css';

export default function Conocenos() {
  return (
    <section className="conocenos" id="nosotros">
      <div className="conocenos-wrap">
        <div className="conocenos-imagen">
          <img
            src="https://res.cloudinary.com/diqeuyoqo/image/upload/v1781960585/951d154f-bddd-4c5a-b606-e5a38e309433_d2nfnl.jpg"
            alt="ChocoFreseo - Nuestra historia"
          />
        </div>

        <div className="conocenos-contenido">
          <span className="landing-seccion-tag">Nuestra historia</span>
          <h2 className="conocenos-titulo">Conócenos</h2>
          <p className="conocenos-texto">
            ChocoFreseo nació en marzo de 2024 en Medellín, creado por una pareja de jóvenes
            con una visión única: postres con estética reggaetonera y juvenil. Nos hicimos
            reconocidos por llevar la comida salada al mundo dulce — ChocoNachos,
            ChocoSpaguetis y más experiencias que no habías probado antes.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '16px 0' }}>
            <div style={{
              background: '#fff', borderRadius: 12, padding: 16,
              border: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: 12, color: '#CA0B0B', fontWeight: 700, marginBottom: 6 }}>
                📍 Sede La Milagrosa
              </div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                Carrera 29 #42-49<br />La Milagrosa, Medellín
              </div>
            </div>
            <div style={{
              background: '#fff', borderRadius: 12, padding: 16,
              border: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: 12, color: '#CA0B0B', fontWeight: 700, marginBottom: 6 }}>
                📍 Sede Aranjuez
              </div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                Calle 90 #50D-35<br />Aranjuez, Medellín
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#555' }}>
            <Clock size={16} color="#CA0B0B" />
            <span><strong>Horario de atención:</strong> Todos los días · 3:00 PM – 9:00 PM</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#555', marginTop: 6 }}>
            <Clock size={16} color="#CA0B0B" />
            <span><strong>Domicilios:</strong> Todos los días · 1:00 PM – 8:00 PM</span>
          </div>
        </div>
      </div>
    </section>
  );
}
