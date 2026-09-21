import { useState, useEffect, useCallback } from 'react';
import { Users, Gift, Wallet, ShoppingBag, UserPlus, Repeat, Search, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import AdminLayout from '../../../components/layout/AdminLayout';
import * as api from '../../../services/api';
import './Metricas.css';

const METODO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia', datafono: 'Datafono' };
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const SEGMENTO_INFO = {
  nuevo:     { label: 'Nuevo',      color: '#2563eb', bg: '#eff6ff' },
  frecuente: { label: 'Frecuente',  color: '#059669', bg: '#ecfdf5' },
  en_riesgo: { label: 'En riesgo',  color: '#dc2626', bg: '#fef2f2' },
  activo:    { label: 'Activo',     color: '#6b7280', bg: '#f5f5f5' },
};

function TarjetaStat({ icono, titulo, valor, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icono" style={{ background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icono}</div>
      <div className="stat-info">
        <div className="stat-valor">{valor}</div>
        <div className="stat-titulo">{titulo}</div>
      </div>
    </div>
  );
}

function SegmentoBadge({ segmento }) {
  const info = SEGMENTO_INFO[segmento] || SEGMENTO_INFO.activo;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, color: info.color, background: info.bg,
    }}>
      {info.label}
    </span>
  );
}

export default function Metricas() {
  const now = new Date();
  const [mes,           setMes]           = useState(now.getMonth() + 1);
  // Arranca con el mes actual como única opción -- se reemplaza apenas
  // responde el backend con los meses que realmente tienen ventas, para que
  // el <select> nunca aparezca vacío mientras carga.
  const [mesesDisponibles, setMesesDisponibles] = useState([now.getMonth() + 1]);
  const [resumen,       setResumen]       = useState(null);
  const [cargandoResumen, setCargandoResumen] = useState(true);

  const [granularidad,  setGranularidad]  = useState('dia');
  const [registros,     setRegistros]     = useState([]);
  const [cargandoRegistros, setCargandoRegistros] = useState(true);

  const [clientes,      setClientes]      = useState([]);
  const [resumenClientes, setResumenClientes] = useState(null);
  const [busqueda,       setBusqueda]     = useState('');
  const [filtroClientes, setFiltroClientes] = useState('todos');
  const [pagina,         setPagina]       = useState(1);
  const [totalPaginas,   setTotalPaginas] = useState(1);
  const [cargandoClientes, setCargandoClientes] = useState(true);

  useEffect(() => {
    api.metricasMesesDisponibles()
      .then((r) => {
        const lista = (r || []).map((m) => m.mes);
        if (lista.length > 0) setMesesDisponibles(lista);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setCargandoResumen(true);
    api.metricasResumen(mes).then(setResumen).catch(() => setResumen(null)).finally(() => setCargandoResumen(false));
  }, [mes]);

  useEffect(() => {
    setCargandoRegistros(true);
    api.metricasRegistros(granularidad, mes).then(setRegistros).catch(() => setRegistros([])).finally(() => setCargandoRegistros(false));
  }, [granularidad, mes]);

  const cargarClientes = useCallback(() => {
    setCargandoClientes(true);
    api.metricasClientesFrecuencia({
      q: busqueda,
      page: pagina,
      pageSize: 10,
      filtro: filtroClientes === 'todos' ? undefined : filtroClientes,
    })
      .then((r) => {
        setClientes(r.data || []);
        setResumenClientes(r.resumen || null);
        setTotalPaginas(r.total_paginas || 1);
      })
      .catch(() => { setClientes([]); setResumenClientes(null); })
      .finally(() => setCargandoClientes(false));
  }, [busqueda, pagina, filtroClientes]);

  useEffect(() => { cargarClientes(); }, [cargarClientes]);

  // Buscar o cambiar el filtro reinicia a la página 1 -- si no, se puede
  // quedar viendo una página vacía de un filtro anterior con más resultados.
  useEffect(() => { setPagina(1); }, [busqueda, filtroClientes]);

  const fmt = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`;
  const diasDesdeLabel = (d) => d === null ? 'Nunca ha comprado' : d === 0 ? 'Hoy' : `hace ${d} día${d === 1 ? '' : 's'}`;

  const totalNuevosRecurrentes = (resumen?.clientes_nuevos_mes || 0) + (resumen?.clientes_recurrentes_mes || 0);
  const pctNuevos = totalNuevosRecurrentes > 0 ? Math.round((resumen.clientes_nuevos_mes / totalNuevosRecurrentes) * 100) : 0;

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Métricas</h1>
          <p className="page-subtitulo">Indicadores del negocio — solo administrador</p>
        </div>
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}
        >
          {mesesDisponibles.map((m) => (
            <option key={m} value={m}>{MESES[m - 1]} {now.getFullYear()}</option>
          ))}
        </select>
      </div>

      {cargandoResumen ? (
        <div className="tabla-vacia">Cargando métricas...</div>
      ) : (
        <>
          <div className="stats-grid metricas-stats-grid">
            <TarjetaStat icono={<Wallet size={20} />}      color="#059669" titulo={`Ventas netas — ${resumen?.mes_label}`}     valor={fmt(resumen?.ventas_netas_mes)} />
            <TarjetaStat icono={<ShoppingBag size={20} />} color="#0891b2" titulo={`Ventas — ${resumen?.mes_label}`}           valor={resumen?.numero_ventas_mes ?? 0} />
            <TarjetaStat icono={<Users size={20} />}       color="#2563eb" titulo="Clientes registrados (total)"               valor={resumen?.clientes_registrados ?? 0} />
            <TarjetaStat icono={<Gift size={20} />}        color="#d97706" titulo={`Puntos redimidos — ${resumen?.mes_label}`} valor={resumen?.puntos_redimidos_mes ?? 0} />
          </div>

          <div className="dash-card dash-card--full">
            <div className="dash-card-header">
              <span className="dash-card-titulo">Desglose por método de pago — {resumen?.mes_label}</span>
              <span className="dash-card-sub">Solo ventas entregadas</span>
            </div>
            {(resumen?.desglose_pago || []).map((d) => (
              <div className="metrica-barra-fila" key={d.metodo}>
                <div className="metrica-barra-header">
                  <span className="metrica-barra-label">{METODO_LABEL[d.metodo] || d.metodo}</span>
                  <span className="metrica-barra-valor">{fmt(d.monto)} · {d.porcentaje}%</span>
                </div>
                <div className="metrica-barra-wrap">
                  <div className="metrica-barra" style={{ width: `${d.porcentaje}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="dash-card--full metricas-fila-resumen">
            <div className="dash-card">
              <div className="dash-card-header" style={{ marginBottom: 10 }}>
                <span className="dash-card-titulo">Promedio mensual</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="stat-icono" style={{ background: '#7c3aed18', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div className="stat-valor">{fmt(resumen?.promedio_mensual)}</div>
                  <div className="stat-titulo">Sobre los meses con ventas</div>
                </div>
              </div>
            </div>

            <div className="dash-card">
              <div className="dash-card-header" style={{ marginBottom: 10 }}>
                <span className="dash-card-titulo">Nuevos vs. recurrentes — {resumen?.mes_label}</span>
                <span className="dash-card-sub">Primera compra este mes o no</span>
              </div>
              {totalNuevosRecurrentes === 0 ? (
                <div className="tabla-vacia">Sin compras entregadas este mes</div>
              ) : (
                <>
                  <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ width: `${pctNuevos}%`, background: '#2563eb' }} />
                    <div style={{ width: `${100 - pctNuevos}%`, background: '#059669' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UserPlus size={14} color="#2563eb" />
                      <span style={{ fontSize: 12, color: '#555' }}><strong style={{ color: '#1a1a1a' }}>{resumen.clientes_nuevos_mes}</strong> nuevos ({pctNuevos}%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Repeat size={14} color="#059669" />
                      <span style={{ fontSize: 12, color: '#555' }}><strong style={{ color: '#1a1a1a' }}>{resumen.clientes_recurrentes_mes}</strong> recurrentes ({100 - pctNuevos}%)</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <div className="dash-card dash-card--full">
        <div className="dash-card-header">
          <span className="dash-card-titulo">Clientes registrados en el tiempo</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ v: 'dia', l: `Por día (${MESES[mes - 1]})` }, { v: 'mes', l: `Por mes (${now.getFullYear()})` }].map((op) => (
              <button
                key={op.v}
                onClick={() => setGranularidad(op.v)}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: granularidad === op.v ? 'none' : '1px solid #e0e0e0',
                  background: granularidad === op.v ? '#CA0B0B' : '#f5f5f5',
                  color: granularidad === op.v ? '#fff' : '#555',
                  fontWeight: granularidad === op.v ? 700 : 400, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >{op.l}</button>
            ))}
          </div>
        </div>
        {cargandoRegistros ? (
          <div className="tabla-vacia">Cargando...</div>
        ) : (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              {granularidad === 'dia' ? (
                <LineChart data={registros} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip formatter={(v) => [v, 'Registros']} labelFormatter={(l) => `Día ${l}`} />
                  <Line type="monotone" dataKey="cantidad" stroke="#CA0B0B" strokeWidth={2} dot={false} />
                </LineChart>
              ) : (
                <BarChart data={registros} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip formatter={(v) => [v, 'Registros']} />
                  <Bar dataKey="cantidad" fill="#CA0B0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="dash-card dash-card--full" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="dash-card-header" style={{ padding: '20px 20px 0' }}>
          <span className="dash-card-titulo">Clientes por frecuencia de compra</span>
          <span className="dash-card-sub">Ordenado por última compra — los más antiguos primero</span>
        </div>

        {resumenClientes && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '14px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: SEGMENTO_INFO.en_riesgo.bg }}>
              <AlertTriangle size={14} color={SEGMENTO_INFO.en_riesgo.color} />
              <span style={{ fontSize: 12, fontWeight: 700, color: SEGMENTO_INFO.en_riesgo.color }}>{resumenClientes.en_riesgo} en riesgo de fuga</span>
            </div>
            <div style={{ padding: '6px 14px', borderRadius: 10, background: SEGMENTO_INFO.nuevo.bg }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: SEGMENTO_INFO.nuevo.color }}>{resumenClientes.nuevo} nuevos</span>
            </div>
            <div style={{ padding: '6px 14px', borderRadius: 10, background: SEGMENTO_INFO.frecuente.bg }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: SEGMENTO_INFO.frecuente.color }}>{resumenClientes.frecuente} frecuentes</span>
            </div>
            <div style={{ padding: '6px 14px', borderRadius: 10, background: SEGMENTO_INFO.activo.bg }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: SEGMENTO_INFO.activo.color }}>{resumenClientes.activo} activos</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '14px 20px 0' }}>
          {[
            { v: 'todos',      l: 'Todos' },
            { v: 'frecuentes', l: 'Frecuentes' },
            { v: 'activos',    l: 'Activos' },
          ].map((op) => (
            <button
              key={op.v}
              onClick={() => setFiltroClientes(op.v)}
              style={{
                padding: '5px 12px', borderRadius: 20, border: filtroClientes === op.v ? 'none' : '1px solid #e0e0e0',
                background: filtroClientes === op.v ? '#CA0B0B' : '#f5f5f5',
                color: filtroClientes === op.v ? '#fff' : '#555',
                fontWeight: filtroClientes === op.v ? 700 : 400, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{op.l}</button>
          ))}
        </div>

        <div className="buscador" style={{ margin: '14px 20px 0' }}>
          <Search size={14} color="#aaa" />
          <input
            placeholder="Buscar cliente por nombre o celular..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="tabla-wrap" style={{ border: 'none', boxShadow: 'none', marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Celular</th>
                <th>Compras entregadas</th>
                <th>Última compra</th>
                <th>Segmento</th>
              </tr>
            </thead>
            <tbody>
              {cargandoClientes ? (
                <tr><td colSpan={5}><div className="tabla-vacia">Cargando...</div></td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={5}><div className="tabla-vacia">Sin datos aún</div></td></tr>
              ) : clientes.map((c) => (
                <tr key={c.id_cliente}>
                  <td>{c.nombre}</td>
                  <td className="td-suave">{c.telefono || '—'}</td>
                  <td>{c.total_compras}</td>
                  <td>
                    {c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString('es-CO') : '—'}
                    <span className="td-suave" style={{ marginLeft: 6 }}>({diasDesdeLabel(c.dias_desde_ultima_compra)})</span>
                  </td>
                  <td><SegmentoBadge segmento={c.segmento} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPaginas > 1 && (
            <div className="paginacion">
              <button className="btn-pagina" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}>‹</button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                <button key={n} className={`btn-pagina${pagina === n ? ' activo' : ''}`} onClick={() => setPagina(n)}>{n}</button>
              ))}
              <button className="btn-pagina" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>›</button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
