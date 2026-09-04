import { useState, useEffect } from 'react';
import { Banknote, Smartphone, Zap, Bike, Check } from 'lucide-react';
import DomiciliarioLayout from '../../../components/layout/DomiciliarioLayout/DomiciliarioLayout';
import * as api from '../../../services/api';
import './CierreCaja.css';

const coloresTarjeta = [
  { border: '#22c55e', bg: '#f0fdf4', Icon: Banknote,    label: 'bg-verde'   },
  { border: '#3b82f6', bg: '#eff6ff', Icon: Banknote,    label: 'bg-azul'    },
  { border: '#f97316', bg: '#fff7ed', Icon: Smartphone,  label: 'bg-naranja' },
  { border: '#6b7280', bg: '#f9fafb', Icon: Bike,        label: 'bg-gris'    },
  { border: '#CA0B0B', bg: '#fff5f5', Icon: Check,       label: 'bg-rojo'    },
];

const hoyISO = () => new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function CierreCaja() {
  const [fecha,      setFecha]      = useState(hoyISO());
  const [ventasMock, setVentasMock] = useState([]);

  const cargarVentas = (f) => {
    api.misDespachados('entregado', f).then((data) => {
      setVentasMock(data.map((v) => {
        // Detectar método real: mixto si tiene 2+ detallePagos
        const detalles = v.pagos?.[0]?.detallePagos || [];
        const tieneEf  = detalles.some((d) => d.metodoPago?.nombre === 'efectivo');
        const tieneT   = detalles.some((d) => d.metodoPago?.nombre === 'transferencia');
        const formaPago = v.metodo_pago || (tieneEf && tieneT ? 'mixto' : tieneT ? 'transferencia' : 'efectivo');

        // Montos reales por método
        const montoEf = tieneEf
          ? detalles.filter((d) => d.metodoPago?.nombre === 'efectivo').reduce((s, d) => s + Number(d.monto), 0)
          : (formaPago === 'efectivo' ? Number(v.total || 0) : Number(v.monto_efectivo || 0));
        const montoT = tieneT
          ? detalles.filter((d) => d.metodoPago?.nombre === 'transferencia').reduce((s, d) => s + Number(d.monto), 0)
          : (formaPago === 'transferencia' ? Number(v.total || 0) : Number(v.monto_transferencia || 0));

        return {
          id_venta:           v.id_venta,
          cliente:            v.cliente?.usuario?.nombre || '—',
          hora:               v.fecha ? new Date(v.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—',
          valor:              Number(v.total || 0),
          costo_domicilio:    Number(v.costo_domicilio || 0),
          forma_pago:         formaPago,
          monto_efectivo:     montoEf,
          monto_transferencia: montoT,
          facturado:          true,
        };
      }));
    }).catch(() => {});
  };

  useEffect(() => { cargarVentas(fecha); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalDia        = ventasMock.reduce((a, v) => a + v.valor, 0);
  // Para mixto: usar los montos parciales, no el valor total
  const totalEfectivo   = ventasMock.reduce((a, v) => {
    if (v.forma_pago === 'efectivo') return a + v.valor;
    if (v.forma_pago === 'mixto')    return a + v.monto_efectivo;
    return a;
  }, 0);
  const totalTransf     = ventasMock.reduce((a, v) => {
    if (v.forma_pago === 'transferencia') return a + v.valor;
    if (v.forma_pago === 'mixto')         return a + v.monto_transferencia;
    return a;
  }, 0);
  const totalDomicilios = ventasMock.reduce((a, v) => a + v.costo_domicilio, 0);
  const totalAEntregar  = totalEfectivo - totalDomicilios;

  const tarjetas = [
    { titulo: 'Total día',                  valor: totalDia,        ...coloresTarjeta[0] },
    { titulo: 'Total ventas en efectivo',   valor: totalEfectivo,   ...coloresTarjeta[1] },
    { titulo: 'Total ventas transferencia', valor: totalTransf,     ...coloresTarjeta[2] },
    { titulo: 'Total en domicilios',     valor: totalDomicilios, ...coloresTarjeta[3] },
    { titulo: 'Total efectivo a entregar',  valor: totalAEntregar,  ...coloresTarjeta[4] },
  ];

  return (
    <DomiciliarioLayout>
      <div className="cc-page">

        {/* Header */}
        <div className="cc-header">
          <div>
            <h1 className="cc-titulo">Total del día</h1>
            <p className="cc-fecha">{new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f7f8fd', borderRadius: 10, border: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CA0B0B" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <input
              type="date"
              value={fecha}
              onChange={(e) => { setFecha(e.target.value); cargarVentas(e.target.value); }}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#333', maxWidth: '100%' }}
            />
          </div>
        </div>

        {/* Tarjetas de resumen */}
        <div className="cc-tarjetas">
          {tarjetas.map((t, i) => (
            <div
              key={i}
              className="cc-tarjeta"
              style={{ borderColor: t.border, background: t.bg }}
            >
              <div className="cc-tarjeta-icono"><t.Icon size={22} color={t.border}/></div>
              <div className="cc-tarjeta-info">
                <div className="cc-tarjeta-valor">${t.valor.toLocaleString('es-CO')}</div>
                <div className="cc-tarjeta-titulo">{t.titulo}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Listado de ventas */}
        <div className="cc-listado">
          <div className="cc-listado-header">
            <span className="cc-listado-titulo">Listado de ventas</span>
            <span className="cc-listado-count">{ventasMock.length} entregas</span>
          </div>

          {ventasMock.length === 0 ? (
            <div className="cc-vacio">No se encontraron ventas</div>
          ) : (
            <div className="cc-tabla-wrap">
              <table className="cc-tabla">
                <thead>
                  <tr>
                    <th>No. Venta</th>
                    <th>Hora</th>
                    <th>Cliente</th>
                    <th>Forma pago</th>
                    <th>Domicilio</th>
                    <th>Valor</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasMock.map((v) => (
                    <tr key={v.id_venta}>
                      <td className="cc-td-num">V-{String(v.id_venta).padStart(4,'0')}</td>
                      <td className="cc-td-suave">{v.hora}</td>
                      <td className="cc-td-bold">{v.cliente}</td>
                      <td>
                        <span className={`cc-pago-badge ${v.forma_pago}`}>
                          {v.forma_pago === 'efectivo' ? <><Banknote size={11} style={{marginRight:3}}/>Efectivo</> : v.forma_pago === 'transferencia' ? <><Smartphone size={11} style={{marginRight:3}}/>Transf.</> : <><Zap size={11} style={{marginRight:3}}/>Mixto</>}
                        </span>
                      </td>
                      <td className="cc-td-suave">${v.costo_domicilio.toLocaleString('es-CO')}</td>
                      <td className="cc-td-valor">
                        ${v.valor.toLocaleString('es-CO')}
                        {v.forma_pago === 'mixto' && (
                          <div style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>
                            <Banknote size={9} style={{display:'inline',verticalAlign:'middle'}}/>${v.monto_efectivo.toLocaleString('es-CO')} + <Smartphone size={9} style={{display:'inline',verticalAlign:'middle'}}/>${v.monto_transferencia.toLocaleString('es-CO')}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`cc-estado-badge ${v.facturado ? 'facturado' : 'pendiente'}`}>
                          {v.facturado ? <span style={{display:'flex',alignItems:'center',gap:3}}><Check size={11}/>Facturado</span> : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resumen final */}
        <div className="cc-resumen-final">
          <div className="cc-resumen-fila">
            <span>Total recaudado en efectivo</span>
            <span>${totalEfectivo.toLocaleString('es-CO')}</span>
          </div>
          <div className="cc-resumen-fila">
            <span>Menos costo domicilios</span>
            <span className="cc-menos">− ${totalDomicilios.toLocaleString('es-CO')}</span>
          </div>
          <div className="cc-resumen-divisor" />
          <div className="cc-resumen-fila cc-resumen-fila--total">
            <span>Efectivo a entregar</span>
            <strong>${totalAEntregar.toLocaleString('es-CO')}</strong>
          </div>
        </div>

      </div>
    </DomiciliarioLayout>
  );
}