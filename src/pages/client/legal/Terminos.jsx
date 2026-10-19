import { Link } from 'react-router-dom';
import LegalLayout, { EMPRESA } from './LegalLayout';

// Términos y condiciones según cómo funciona HOY el sistema (pedidos solo a
// domicilio, horario configurable, costo de domicilio por barrio, programa de
// puntos en puntos/service.js y ventas/service.js de la API). Si cambian esas
// reglas, hay que actualizar este texto.
export default function Terminos() {
  return (
    <LegalLayout titulo="Términos y condiciones">
      <p>
        Estos términos regulan el uso de la página web ({EMPRESA.web}) y la aplicación de {EMPRESA.nombreLegal} (nombre
        comercial), NIT {EMPRESA.nit}, con domicilio en {EMPRESA.ciudad}. Al crear una cuenta o hacer un pedido
        aceptas estos términos y nuestra <Link to="/privacidad">Política de tratamiento de datos personales</Link>.
      </p>

      <h2>1. Tu cuenta</h2>
      <ul>
        <li>Puedes ver el catálogo y armar tu carrito sin cuenta; para enviar un pedido necesitas iniciar sesión o registrarte.</li>
        <li>Debes dar datos reales y mantenerlos actualizados (en especial tu teléfono y tu dirección, que usamos para entregarte).</li>
        <li>Eres responsable de cuidar tu contraseña y de lo que se haga con tu cuenta. Si crees que alguien más entró, cámbiala
          y avísanos.</li>
        <li>Podemos suspender o desactivar cuentas usadas para fraudes, suplantación o abuso del programa de puntos.</li>
      </ul>

      <h2>2. Pedidos</h2>
      <ul>
        <li>Por la página y la app solo se hacen pedidos <strong>a domicilio</strong>. En nuestras sedes atendemos directamente.</li>
        <li>Los pedidos se reciben dentro del <strong>horario de domicilios</strong> que se muestra en la página y la app
          (actualmente, todos los días de 1:00 PM a 8:00 PM). Ese horario puede cambiar y la tienda puede cerrar temporalmente;
          fuera de horario puedes dejar tu pedido armado, pero no enviarlo.</li>
        <li>Los precios están en pesos colombianos. Antes de enviar tu pedido revisamos de nuevo los precios y la disponibilidad
          de cada producto, topping y adición; si algo cambió te lo mostramos para que confirmes. El valor que vale es el que ves
          al confirmar.</li>
        <li>Las personalizaciones adicionales (toppings, salsas, adiciones, etc.) tienen el costo que se muestra al elegirlas.</li>
        <li>Tu pedido queda <strong>pendiente</strong> hasta que lo confirmemos. Podemos rechazarlo o anularlo si un producto se
          agotó, si la dirección está fuera de nuestra zona de cobertura o si no podemos verificar el pago. En ese caso te
          avisamos y, si usaste puntos, te los devolvemos.</li>
      </ul>

      <h2>3. Domicilios</h2>
      <ul>
        <li>El costo del domicilio depende del barrio de entrega y se muestra antes de confirmar el pedido.</li>
        <li>El tiempo de entrega que mostramos es un estimado y puede variar por la demanda, el clima o el tráfico.</li>
        <li>Debes estar disponible en la dirección y el teléfono que indicaste. Si no logramos entregar el pedido por datos
          errados o por no encontrarte, nos comunicaremos contigo para acordar qué hacer.</li>
      </ul>

      <h2>4. Pagos</h2>
      <ul>
        <li>Medios de pago: <strong>efectivo</strong> al recibir, <strong>transferencia</strong>, <strong>mixto</strong> (parte
          en efectivo y parte por transferencia) y <strong>datáfono</strong> al recibir, cuando esté habilitado.</li>
        <li>Si pagas por transferencia o mixto, debes subir el comprobante al hacer el pedido. Podemos verificarlo antes de
          despachar.</li>
      </ul>

      <h2>5. Cambios, cancelaciones y reclamos</h2>
      <ul>
        <li>Si necesitas cambiar o cancelar tu pedido, escríbenos cuanto antes por WhatsApp
          (<a href={EMPRESA.whatsappUrl} target="_blank" rel="noopener noreferrer">{EMPRESA.whatsapp}</a>). Si ya está en
          preparación, puede que no sea posible.</li>
        <li>Si un pedido se anula, los puntos que hayas usado en él te vuelven a quedar disponibles.</li>
        <li>No hacemos devoluciones de dinero. Si tu pedido llega con un problema (producto equivocado, incompleto o en mal
          estado), escríbenos por WhatsApp o a <a href={`mailto:${EMPRESA.correo}`}>{EMPRESA.correo}</a> y lo solucionamos con
          un cambio o una reposición.</li>
      </ul>

      <h2>6. Programa de puntos</h2>
      <ul>
        <li><strong>Bienvenida:</strong> al crear tu cuenta recibes 200 puntos de regalo, una sola vez por cuenta.</li>
        <li><strong>Cómo se ganan:</strong> 1 punto por cada $500 del valor de los productos de tu pedido (no cuenta el
          domicilio). Los puntos se suman cuando el pedido se marca como entregado. Un pedido en el que usas puntos no
          acumula puntos nuevos.</li>
        <li><strong>Cómo se usan:</strong> cada punto tiene un valor en pesos que se muestra en la página y la app (puede
          cambiar). Se canjean en bloques equivalentes a $1.000 y el descuento aplica solo a los productos, nunca al
          domicilio.</li>
        <li>Si un pedido en el que usaste puntos se anula, los puntos te vuelven a quedar disponibles. Si un pedido que ya te
          dio puntos se anula o se devuelve, esos puntos se descuentan.</li>
        <li>Los puntos no son dinero: no se cambian por efectivo ni se pueden pasar a otra cuenta.</li>
        <li>Actualmente los puntos no vencen. Podemos cambiar o terminar el programa avisando con anticipación en la página y la
          app; los puntos que ya tengas se respetarán según lo que informemos en ese momento.</li>
        <li>Podemos anular puntos obtenidos con fraude, por ejemplo con cuentas falsas o duplicadas.</li>
      </ul>

      <h2>7. Uso adecuado</h2>
      <p>
        No puedes usar la página ni la app para fines ilegales, para hacer pedidos falsos, para intentar acceder a cuentas
        o información de otras personas, ni para afectar el funcionamiento del servicio.
      </p>

      <h2>8. Propiedad intelectual</h2>
      <p>
        La marca {EMPRESA.nombre}, el logo, las fotos, los textos y el diseño de la página y la app son de {EMPRESA.nombre} o se
        usan con autorización. No puedes copiarlos ni usarlos sin nuestro permiso.
      </p>

      <h2>9. Responsabilidad</h2>
      <p>
        Hacemos lo posible para que la página y la app funcionen sin interrupciones y con información correcta, pero pueden
        presentarse fallas técnicas o errores. Cuando ocurran, los corregiremos y, si afectaron un pedido, buscaremos una
        solución contigo. Nada en estos términos limita los derechos que te da el Estatuto del Consumidor.
      </p>

      <h2>10. Cambios a estos términos</h2>
      <p>
        Podemos actualizar estos términos. La versión vigente siempre estará en esta página con su fecha. Los cambios no
        afectan los pedidos ya hechos.
      </p>

      <h2>11. Ley aplicable y contacto</h2>
      <p>
        Estos términos se rigen por las leyes de Colombia. Para cualquier duda escríbenos a{' '}
        <a href={`mailto:${EMPRESA.correo}`}>{EMPRESA.correo}</a> o por WhatsApp al{' '}
        <a href={EMPRESA.whatsappUrl} target="_blank" rel="noopener noreferrer">{EMPRESA.whatsapp}</a>.
      </p>
    </LegalLayout>
  );
}
