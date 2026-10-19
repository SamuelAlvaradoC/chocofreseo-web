import { useEffect } from 'react';
import Navbar from '../../../components/layout/Navbar/Navbar';
import Footer from '../../../components/layout/Footer/Footer';
import './Legal.css';

// Datos de la empresa que se repiten en Privacidad y Términos. Lo marcado
// con COMPLETAR debe llenarlo el negocio antes de usar estos textos como
// definitivos.
export const EMPRESA = {
  nombre:     'ChocoFreseo',
  razonSocial: null, // [COMPLETAR]
  nit:        null,  // [COMPLETAR]
  ciudad:     'Medellín, Antioquia, Colombia',
  sedes:      ['La Milagrosa: Carrera 29 #42-49, Medellín', 'Aranjuez: Calle 90 #50D-35, Medellín'],
  correo:     'chocofreseo@gmail.com',
  whatsapp:   '315 991 4624',
  whatsappUrl: 'https://wa.me/573159914624',
  web:        'www.chocofreseo.com',
};

export const VIGENCIA = '18 de octubre de 2026';

/** Texto pendiente de completar por el negocio (resaltado en amarillo). */
export const Completar = ({ children = 'COMPLETAR' }) => <span className="legal-completar">[{children}]</span>;

export default function LegalLayout({ titulo, children }) {
  useEffect(() => {
    const anterior = document.title;
    document.title = `${titulo} | ChocoFreseo`;
    window.scrollTo(0, 0);
    return () => { document.title = anterior; };
  }, [titulo]);

  return (
    <div className="legal-wrapper">
      <Navbar />
      <main className="legal-page">
        <article className="legal-doc">
          <h1>{titulo}</h1>
          <p className="legal-vigencia">Vigente desde el {VIGENCIA}</p>
          {children}
        </article>
      </main>
      <Footer />
    </div>
  );
}
