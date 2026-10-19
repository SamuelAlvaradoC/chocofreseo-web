import { Link } from 'react-router-dom';
import LegalLayout, { EMPRESA } from './LegalLayout';

// Política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto
// 1074 de 2015, que compila el Decreto 1377 de 2013). Describe lo que el
// sistema hace HOY: si cambia qué datos se recogen o dónde se guardan, hay
// que actualizar este texto.
export default function Privacidad() {
  return (
    <LegalLayout titulo="Política de tratamiento de datos personales">
      <p>
        En {EMPRESA.nombre} respetamos tu privacidad. Esta política explica qué datos personales recogemos cuando usas
        nuestra página web ({EMPRESA.web}) y nuestra aplicación, para qué los usamos, dónde se guardan y cómo puedes
        ejercer tus derechos, de acuerdo con la Ley 1581 de 2012, el Decreto 1074 de 2015 y demás normas colombianas
        de protección de datos personales.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li><strong>Responsable:</strong> {EMPRESA.nombreLegal} (nombre comercial), NIT {EMPRESA.nit}</li>
        <li><strong>Domicilio:</strong> {EMPRESA.ciudad}</li>
        <li><strong>Sedes:</strong> {EMPRESA.sedes.join(' · ')}</li>
        <li><strong>Persona que atiende las solicitudes de datos personales:</strong> {EMPRESA.encargadoDatos}</li>
        <li><strong>Correo para temas de datos personales:</strong> <a href={`mailto:${EMPRESA.correo}`}>{EMPRESA.correo}</a></li>
        <li><strong>WhatsApp:</strong> <a href={EMPRESA.whatsappUrl} target="_blank" rel="noopener noreferrer">{EMPRESA.whatsapp}</a></li>
      </ul>

      <h2>2. Qué datos recogemos</h2>
      <ul>
        <li><strong>Al crear tu cuenta:</strong> nombre, correo electrónico y contraseña. La contraseña se guarda cifrada
          (con un algoritmo de un solo sentido): nadie en {EMPRESA.nombre} puede verla.</li>
        <li><strong>Si inicias sesión con Google:</strong> el nombre y el correo de tu cuenta de Google, y un identificador
          que Google asigna a tu cuenta. No recibimos tu contraseña de Google ni otros datos de tu cuenta.</li>
        <li><strong>Para tus pedidos:</strong> número de teléfono, direcciones de entrega (dirección, barrio, ciudad y
          referencia), productos pedidos y sus personalizaciones, observaciones, método de pago, comprobantes de pago
          que subas (imágenes de transferencias), historial de pedidos y saldo y movimientos de puntos.</li>
        <li><strong>Datos técnicos:</strong> la dirección IP desde la que inicias sesión (para avisarte por correo si alguien
          entra a tu cuenta desde un lugar nuevo) y los datos que la página o la app guardan en tu dispositivo para
          mantener tu sesión y tu carrito.</li>
        <li><strong>Reseñas y encuestas</strong> que decidas responder.</li>
      </ul>
      <p>
        No recogemos datos sensibles (como datos de salud, biométricos u opiniones políticas) ni datos de tarjetas: los
        pagos con datáfono se hacen en el momento de la entrega, fuera de la página y la app.
      </p>

      <h2>3. Para qué usamos tus datos</h2>
      <ul>
        <li>Crear y administrar tu cuenta y permitirte iniciar sesión.</li>
        <li>Recibir, preparar y entregar tus pedidos a domicilio, y contactarte por teléfono o WhatsApp sobre ellos.</li>
        <li>Verificar los pagos, incluidos los comprobantes de transferencia.</li>
        <li>Administrar el programa de puntos (puntos de bienvenida, acumulación y canje).</li>
        <li>Enviarte correos necesarios para el servicio: bienvenida, códigos para recuperar tu contraseña y alertas de
          seguridad de inicio de sesión.</li>
        <li>Atender tus peticiones, quejas y reclamos.</li>
        <li>Mejorar nuestros productos y servicio con las reseñas y con estadísticas internas de ventas.</li>
        <li>Cumplir obligaciones legales, contables y tributarias.</li>
      </ul>
      <p>
        No vendemos ni alquilamos tus datos, y no los usamos para enviarte publicidad sin tu autorización previa.
      </p>

      <h2>4. Con quién se comparten y dónde se guardan</h2>
      <p>
        Para prestar el servicio usamos proveedores tecnológicos que guardan y procesan los datos en servidores fuera de
        Colombia; al aceptar esta política autorizas esa transferencia internacional de tus datos, solo para las
        finalidades descritas aquí. Dentro de {EMPRESA.nombre}, cada persona ve solo lo necesario para su trabajo.
      </p>

      <h2>5. Cómo protegemos tus datos</h2>
      <ul>
        <li>Las contraseñas se guardan cifradas y nunca en texto plano.</li>
        <li>La comunicación entre tu dispositivo y nuestros servidores va cifrada (HTTPS).</li>
        <li>El acceso al panel de administración está restringido por usuario, rol y permisos.</li>
      </ul>

      <h2>6. Cuánto tiempo guardamos tus datos</h2>
      <ul>
        <li>Los datos de tu cuenta se guardan mientras la cuenta esté activa.</li>
        <li>Si pides eliminar tu cuenta, borramos o anonimizamos tus datos personales, salvo los que debamos conservar por
          obligación legal: la información de pedidos y pagos se conserva como soporte contable durante el término que
          exige la ley (hasta diez años, según el artículo 28 de la Ley 962 de 2005).</li>
        <li>Los comprobantes de pago se conservan junto con el pedido al que pertenecen.</li>
        <li>Los códigos para recuperar la contraseña vencen a los 5 minutos.</li>
        <li>Los datos guardados en tu dispositivo (sesión y carrito) se borran al cerrar sesión o al borrar los datos del
          navegador o de la app.</li>
      </ul>

      <h2>7. Tus derechos como titular</h2>
      <p>De acuerdo con el artículo 8 de la Ley 1581 de 2012, tienes derecho a:</p>
      <ul>
        <li><strong>Conocer</strong> los datos personales que tenemos sobre ti y cómo los usamos.</li>
        <li><strong>Actualizar y rectificar</strong> tus datos cuando estén incompletos, sean inexactos o estén desactualizados.</li>
        <li><strong>Pedir prueba</strong> de la autorización que nos diste.</li>
        <li><strong>Revocar</strong> la autorización y/o pedir la <strong>supresión</strong> de tus datos, cuando no exista un
          deber legal o contractual de conservarlos.</li>
        <li><strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley,
          después de haber hecho tu consulta o reclamo ante nosotros.</li>
        <li><strong>Acceder gratis</strong> a tus datos personales.</li>
      </ul>

      <h2>8. Cómo ejercer tus derechos</h2>
      <p>
        Puedes actualizar tu nombre, correo y teléfono en cualquier momento desde tu perfil. Para ejercer cualquiera de tus
        derechos (conocer, actualizar, rectificar, suprimir o revocar), escríbenos a{' '}
        <a href={`mailto:${EMPRESA.correo}`}>{EMPRESA.correo}</a> desde el correo de tu cuenta; te responderemos dentro de los
        plazos que establece la ley. Las solicitudes las atiende {EMPRESA.encargadoDatos}.
      </p>

      <h2>9. Menores de edad</h2>
      <p>
        Si eres menor de edad, debes usar el servicio con la autorización de tu madre, padre o representante legal, quien
        podrá ejercer los derechos descritos en esta política.
      </p>

      <h2>10. Autorización</h2>
      <p>
        Al crear tu cuenta, iniciar sesión con Google o hacer un pedido, autorizas a {EMPRESA.nombre} a tratar tus datos
        personales según esta política. También puedes leer nuestros <Link to="/terminos">Términos y condiciones</Link>.
      </p>

      <h2>11. Cambios a esta política</h2>
      <p>
        Si cambiamos esta política de forma importante, lo publicaremos en esta página con la nueva fecha de vigencia y,
        cuando corresponda, te lo informaremos por correo.
      </p>
    </LegalLayout>
  );
}
