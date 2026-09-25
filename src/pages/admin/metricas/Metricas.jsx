import { useState, useEffect, useCallback } from 'react';
import { Users, Gift, Wallet, ShoppingBag, UserPlus, Repeat, Search, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import AdminLayout from '../../../components/layout/AdminLayout';
import Paginacion from '../../../components/Paginacion';
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
  const [porPagina,      setPorPagina]    = useState(10);
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

  // Paginación en el cliente (mismo patrón que Barrios/Clientes/Usuarios/
  // Ventas) -- se trae todo lo que coincide con busqueda+filtro en una sola
  // llamada (pageSize grande, escala bien a unos cuantos miles como ya
  // documentaba el backend) y se pagina/muestra "Todos" en el navegador.
  const cargarClientes = useCallback(() => {
    setCargandoClientes(true);
    api.metricasClientesFrecuencia({
      q: busqueda,
      pageSize: 10000,
      filtro: filtroClientes === 'todos' ? undefined : filtroClientes,
    })
      .then((r) => {
        setClientes(r.data || []);
        setResumenClientes(r.resumen || null);
      })
      .catch(() => { setClientes([]); setResumenClientes(null); })
      .finally(() => setCargandoClientes(false));
  }, [busqueda, filtroClientes]);

  useEffect(() => { cargarClientes(); }, [cargarClientes]);

  // Buscar o cambiar el filtro reinicia a la página 1 -- si no, se puede
  // quedar viendo una página vacía de un filtro anterior con más resultados.
  useEffect(() => { setPagina(1); }, [busqueda, filtroClientes]);

  const mostrandoTodosClientes = porPagina === 'todos';
  const totalPaginas = mostrandoTodosClientes ? 1 : Math.ceil(clientes.length / porPagina);
  const clientesPaginados = mostrandoTodosClientes ? clientes : clientes.slice((pagina - 1) * porPagina, pagina * porPagina);

  useEffect(() => {
    setPagina((p) => Math.min(Math.max(1, p), totalPaginas || 1));
  }, [totalPaginas]);

  const fmt = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`;
  const diasDesdeLabel = (d) => d === null ? 'Nunca ha comprado' : d === 0 ? 'Hoy' : `hace ${d} día${d === 1 ? '' : 's'}`;

  const totalNuevosActivos = (resumen?.clientes_nuevos_mes || 0) + (resumen?.clientes_activos_mes || 0);
  const pctNuevos = totalNuevosActivos > 0 ? Math.round((resumen.clientes_nuevos_mes / totalNuevosActivos) * 100) : 0;

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
                <span className="dash-card-titulo">Nuevos vs. activos — {resumen?.mes_label}</span>
                <span className="dash-card-sub">Activos = 2 o más compras (incluye frecuentes)</span>
              </div>
              {totalNuevosActivos === 0 ? (
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
                      <span style={{ fontSize: 12, color: '#555' }}><strong style={{ color: '#1a1a1a' }}>{resumen.clientes_activos_mes}</strong> activos ({100 - pctNuevos}%)</span>
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
          <span className="dash-card-sub">En riesgo y Nuevos: todo el historial. Frecuentes y Activos: últimos 7/30 días — ordenado por última compra</span>
        </div>

        {resumenClientes && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '14px 20px 0', alignItems: 'center' }}>
            {/* Los 4 badges son a la vez informativos y el filtro -- se
                evita tener dos filas de controles que dicen lo mismo.
                "en_riesgo"/"nuevo" filtran por `segmento` (clasificación
                histórica que ya existía); "frecuentes"/"activos" por la
                ventana de 7/30 días -- en ambos casos el número mostrado
                YA es el mismo que se usa para filtrar. */}
            <button
              type="button"
              title="Sin comprar hace más de 30 días"
              onClick={() => setFiltroClientes((f) => f === 'en_riesgo' ? 'todos' : 'en_riesgo')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10,
                border: filtroClientes === 'en_riesgo' ? `2px solid ${SEGMENTO_INFO.en_riesgo.color}` : '2px solid transparent',
                background: SEGMENTO_INFO.en_riesgo.bg, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <AlertTriangle size={14} color={SEGMENTO_INFO.en_riesgo.color} />
              <span style={{ fontSize: 12, fontWeight: 700, color: SEGMENTO_INFO.en_riesgo.color }}>{resumenClientes.en_riesgo} en riesgo de fuga</span>
            </button>
            <button
              type="button"
              title="1 sola compra en todo su historial, hecha en los últimos 30 días"
              onClick={() => setFiltroClientes((f) => f === 'nuevo' ? 'todos' : 'nuevo')}
              style={{
                padding: '6px 14px', borderRadius: 10,
                border: filtroClientes === 'nuevo' ? `2px solid ${SEGMENTO_INFO.nuevo.color}` : '2px solid transparent',
                background: SEGMENTO_INFO.nuevo.bg, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: SEGMENTO_INFO.nuevo.color }}>{resumenClientes.nuevo} nuevos</span>
            </button>
            <button
              type="button"
              title="3 o más compras en los últimos 7 días"
              onClick={() => setFiltroClientes((f) => f === 'frecuentes' ? 'todos' : 'frecuentes')}
              style={{
                padding: '6px 14px', borderRadius: 10, border: filtroClientes === 'frecuentes' ? `2px solid ${SEGMENTO_INFO.frecuente.color}` : '2px solid transparent',
                background: SEGMENTO_INFO.frecuente.bg, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: SEGMENTO_INFO.frecuente.color }}>{resumenClientes.frecuente} frecuentes</span>
            </button>
            <button
              type="button"
              title="2 o más compras en los últimos 30 días"
              onClick={() => setFiltroClientes((f) => f === 'activos' ? 'todos' : 'activos')}
              style={{
                padding: '6px 14px', borderRadius: 10, border: filtroClientes === 'activos' ? `2px solid ${SEGMENTO_INFO.activo.color}` : '2px solid transparent',
                background: SEGMENTO_INFO.activo.bg, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: SEGMENTO_INFO.activo.color }}>{resumenClientes.activo} activos</span>
            </button>
            {filtroClientes !== 'todos' && (
              <button
                type="button"
                onClick={() => setFiltroClientes('todos')}
                style={{
                  padding: '6px 14px', borderRadius: 10, border: '1px solid #e0e0e0',
                  background: '#fff', color: '#555', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Todos ✕
              </button>
            )}
          </div>
        )}

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
              ) : clientesPaginados.map((c) => (
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
          {clientes.length > 0 && (
            <Paginacion
              pagina={pagina} totalPaginas={totalPaginas} onCambiarPagina={setPagina}
              porPagina={porPagina} onCambiarPorPagina={setPorPagina}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
