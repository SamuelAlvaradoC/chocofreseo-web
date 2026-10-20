import { horaRealPedido } from '../../utils/formatHora';

// Para el equipo (confirmador, admin, cocina, domiciliario): marca los
// pedidos que se hicieron fuera de horario y quedaron para la apertura.
// No muestra nada en los pedidos normales.
export default function PedidoFueraDeHorario({ fechaReal, style }) {
  if (!fechaReal) return null;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, ...style }}>
      🌙 Pedido hecho fuera de horario: {horaRealPedido(fechaReal)}
    </div>
  );
}
