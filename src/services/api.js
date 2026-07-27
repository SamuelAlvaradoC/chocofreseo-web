import axios from 'axios';

const BASE = (process.env.REACT_APP_API_URL || 'http://localhost:3000') + '/api';

const http = axios.create({ baseURL: BASE });

http.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const unwrap  = (r) => r.data.data;
const handleErr = (e) => { console.error('[API Error]', e?.response?.status, e?.response?.data?.message || e?.message); throw e; };
const get     = (url, params) => http.get(url, { params }).then(unwrap).catch(handleErr);
const post    = (url, data)   => http.post(url, data).then(unwrap).catch(handleErr);
const put     = (url, data)   => http.put(url, data).then(unwrap).catch(handleErr);
const patch   = (url, data)   => http.patch(url, data).then(unwrap).catch(handleErr);
const del     = (url)         => http.delete(url).then(unwrap).catch(handleErr);

// ── Auth ──────────────────────────────────────────────────────
export const login               = (d)    => post('/auth/login', d);
export const register            = (d)    => post('/auth/register', d);
export const logout              = ()     => post('/auth/logout');
export const recuperarContrasena = (d)    => post('/auth/recuperar', d);
export const cambiarContrasena   = (d)    => patch('/auth/cambiar-contrasena', d);
export const solicitarReset      = (d)    => post('/auth/solicitar-reset', d);
export const verificarReset      = (d)    => post('/auth/verificar-reset', d);
export const getPerfil           = ()     => get('/auth/perfil');
export const editarPerfil        = (d)    => patch('/auth/perfil', d);
export const misDirecciones        = ()    => get('/auth/mis-direcciones');
export const crearMiDireccion      = (d)   => post('/auth/mis-direcciones', d);
export const eliminarMiDireccion   = (id)  => del(`/auth/mis-direcciones/${id}`);
export const cambiarContrasenaAuth = (d)   => patch('/auth/cambiar-contrasena-auth', d);

// ── Catálogo (público, sin token) ─────────────────────────────
export const catalogoProductos   = ()     => get('/catalogo/productos');
export const catalogoCategorias  = ()     => get('/catalogo/categorias');
export const catalogoToppings    = ()     => get('/catalogo/toppings');
export const catalogoAdiciones   = ()     => get('/catalogo/adiciones');
export const catalogoBuscar      = (q)    => get('/catalogo/buscar', { q });
export const catalogoPromociones = ()     => get('/catalogo/promociones');

// ── Ventas ────────────────────────────────────────────────────
export const listarVentas        = (est, fecha) => get('/ventas', { ...(est ? { estado: est } : {}), ...(fecha ? { fecha } : {}) });
export const obtenerVenta        = (id)   => get(`/ventas/${id}`);
export const crearVenta          = (d)    => post('/ventas', d);
export const cambiarEstadoVenta  = (id,d) => patch(`/ventas/${id}/estado`, d);
export const anularVenta         = (id,d) => patch(`/ventas/${id}/anular`, d);
export const editarVenta         = (id,d) => patch(`/ventas/${id}/editar`, d);
export const misVentas           = ()     => get('/ventas/mis-pedidos');
export const misDespachados      = (est, fecha) => get('/ventas/mis-despachos', { ...(est ? { estado: est } : {}), ...(fecha ? { fecha } : {}) });
export const crearMiPedido       = (d)    => post('/ventas/mi-pedido', d);

// ── Dashboard ─────────────────────────────────────────────────
export const dashTotalDia           = (fecha) => get('/dashboard/total-dia', fecha ? { fecha } : undefined);
export const dashTotalidadClientes  = ()       => get('/dashboard/totalidad-clientes');
export const dashVentasPorSemana    = ()       => get('/dashboard/ventas-por-semana');
export const dashVentasPorMes       = ()       => get('/dashboard/ventas-por-mes');
export const dashProductosMasVendidos= ()      => get('/dashboard/productos-mas-vendidos');
export const dashRecaudoPedidos     = ()       => get('/dashboard/recaudo-pedidos');
export const pedidosRecientes       = (n, fecha) => get('/dashboard/pedidos-recientes', { ...(n ? { limite: n } : {}), ...(fecha ? { fecha } : {}) });
export const getDomiciliariosDia    = (fecha) => get('/dashboard/domiciliarios-dia', fecha ? { fecha } : undefined);

// ── Cierre de caja ──────────────────────────────────────────────
export const cierreCajaHoy           = (fecha) => get('/cierre-caja/hoy', fecha ? { fecha } : undefined);
export const cierreCajaResumen       = (fecha) => get('/cierre-caja/resumen', fecha ? { fecha } : undefined);
export const cierreCajaBase          = (base_inicial) => patch('/cierre-caja/base', { base_inicial });
export const cierreCajaGasto         = (d)   => post('/cierre-caja/gasto', d);
export const cierreCajaEliminarGasto = (id)  => del(`/cierre-caja/gasto/${id}`);
// Calls all dashboard endpoints in parallel
export const getDashboard = async (fecha) => {
  const params = fecha ? { fecha } : undefined;
  const [totalDia, clientes, prods, semana, porMes, porDia, despachados] = await Promise.all([
    get('/dashboard/total-dia',            params).catch(() => ({})),
    get('/dashboard/totalidad-clientes',   params).catch(() => ({})),
    get('/dashboard/productos-mas-vendidos').catch(() => []),
    get('/dashboard/ventas-por-semana', params).catch(() => []),
    get('/dashboard/ventas-por-mes').catch(() => []),
    get('/dashboard/ventas-por-dia',       params).catch(() => []),
    get('/ventas', { estado: 'despachado', ...(fecha ? { fecha } : {}) }).catch(() => []),
  ]);
  return {
    ventas_hoy:          totalDia.total_ventas        || 0,
    ingresos_hoy:        totalDia.monto_total         || 0,
    clientes_hoy:        clientes.nuevosHoy           || 0,
    domicilios_activos:  Array.isArray(despachados) ? despachados.length : 0,
    total_efectivo:      totalDia.total_efectivo      || 0,
    total_transferencia: totalDia.total_transferencia || 0,
    total_domicilios:    totalDia.total_domicilios    || 0,
    top_productos:     (prods || []).map(p => ({
      nombre:   p.producto?.nombre || '—',
      cantidad: p.total_vendido    || 0,
    })),
    ventas_semana: Array.isArray(semana)
      ? semana.map(d => ({ label: d.label || `S${d.semana || ''}`, total: Number(d.total ?? d.monto_total ?? 0) }))
      : [],
    ventas_mes: Array.isArray(porMes)
      ? porMes.map(d => ({ label: d.label || `${d.mes}`, total: Number(d.total ?? d.monto_total ?? 0) }))
      : [],
    ventas_dia: Array.isArray(porDia)
      ? porDia.map(d => ({ label: d.label || '', total: Number(d.total || 0) }))
      : [],
  };
};

// ── Categorías ────────────────────────────────────────────────
export const listarCategorias    = ()     => get('/categorias');
export const crearCategoria      = (d)    => post('/categorias', d);
export const actualizarCategoria = (id,d) => put(`/categorias/${id}`, d);
export const eliminarCategoria   = (id)   => del(`/categorias/${id}`);
export const estadoCategoria     = (id,d) => patch(`/categorias/${id}/estado`, d);

// ── Productos ─────────────────────────────────────────────────
export const listarProductos     = ()     => get('/productos');
export const obtenerProducto     = (id)   => get(`/productos/${id}`);
export const crearProducto       = (d)    => post('/productos', d);
export const actualizarProducto  = (id,d) => put(`/productos/${id}`, d);
export const eliminarProducto    = (id)   => del(`/productos/${id}`);
export const estadoProducto      = (id,d) => patch(`/productos/${id}/estado`, d);

// ── Toppings ──────────────────────────────────────────────────
export const listarToppings      = ()     => get('/toppings');
export const crearTopping        = (d)    => post('/toppings', d);
export const actualizarTopping   = (id,d) => put(`/toppings/${id}`, d);
export const eliminarTopping     = (id)   => del(`/toppings/${id}`);
export const estadoTopping       = (id,d) => patch(`/toppings/${id}/estado`, d);

// ── Adiciones ─────────────────────────────────────────────────
export const listarAdiciones     = ()     => get('/adiciones');
export const crearAdicion        = (d)    => post('/adiciones', d);
export const actualizarAdicion   = (id,d) => put(`/adiciones/${id}`, d);
export const eliminarAdicion     = (id)   => del(`/adiciones/${id}`);
export const estadoAdicion       = (id,d) => patch(`/adiciones/${id}/estado`, d);

// ── Clientes ──────────────────────────────────────────────────
export const listarClientes             = ()     => get('/clientes');
export const obtenerCliente             = (id)   => get(`/clientes/${id}`);
export const crearCliente               = (d)    => post('/clientes', d);
export const actualizarCliente          = (id,d) => put(`/clientes/${id}`, d);
export const eliminarCliente            = (id)   => del(`/clientes/${id}`);
export const estadoCliente              = (id,d) => patch(`/clientes/${id}/estado`, d);
export const listarDireccionesCliente   = (id)   => get(`/clientes/${id}/direcciones`);
export const obtenerClienteDetalle      = (id)   => get(`/clientes/${id}/detalle`);

// ── Empleados ─────────────────────────────────────────────────
export const listarEmpleados     = ()     => get('/empleados');
export const obtenerEmpleado     = (id)   => get(`/empleados/${id}`);
export const crearEmpleado       = (d)    => post('/empleados', d);
export const actualizarEmpleado  = (id,d) => put(`/empleados/${id}`, d);
export const eliminarEmpleado    = (id)   => del(`/empleados/${id}`);
export const estadoEmpleado      = (id,d) => patch(`/empleados/${id}/estado`, d);

// ── Usuarios ──────────────────────────────────────────────────
export const listarUsuarios      = ()     => get('/usuarios');
export const crearUsuario        = (d)    => post('/usuarios', d);
export const actualizarUsuario   = (id,d) => put(`/usuarios/${id}`, d);
export const eliminarUsuario     = (id)   => del(`/usuarios/${id}`);
export const estadoUsuario       = (id,d) => patch(`/usuarios/${id}/activar-desactivar`, d);

// ── Roles ─────────────────────────────────────────────────────
export const listarRoles         = ()        => get('/roles');
export const obtenerRol          = (id)      => get(`/roles/${id}`);
export const getMisPermisos      = ()         => get('/auth/mis-permisos');
export const listarPermisos      = ()        => get('/roles/permisos');
export const crearRol            = (d)       => post('/roles', d);
export const actualizarRol       = (id,d)    => put(`/roles/${id}`, d);
export const eliminarRol         = (id)      => del(`/roles/${id}`);
export const asignarRolPermisos  = (id, permisos) => patch(`/roles/${id}/permisos`, { permisos });

// ── Domicilios ────────────────────────────────────────────────
export const listarDomicilios    = (est)  => get('/domicilios', est ? { estado: est } : undefined);
export const asignarDomicilio    = (d)    => post('/domicilios/asignar', d);
export const cambiarEstadoDomi   = (id,d) => patch(`/domicilios/${id}/estado`, d);
export const misPedidosDomi      = ()     => get('/domicilios/mis-pedidos');
export const cogerPedido         = (id)   => patch(`/domicilios/${id}/coger`);
export const despacharPedido     = (id,d) => patch(`/domicilios/${id}/despachar`, d);
export const entregarPedido      = (id,d) => patch(`/domicilios/${id}/entregar`, d);

// ── Ciudades ──────────────────────────────────────────────────
export const listarCiudades        = ()     => get('/ciudades');
export const listarCiudadesActivas = ()     => get('/ciudades/activas');
export const crearCiudad           = (d)    => post('/ciudades', d);
export const actualizarCiudad      = (id,d) => patch(`/ciudades/${id}`, d);
export const eliminarCiudad        = (id)   => del(`/ciudades/${id}`);
export const estadoCiudad          = (id,d) => patch(`/ciudades/${id}/estado`, d);

// ── Barrios ───────────────────────────────────────────────────
export const listarBarrios         = (id_ciudad) => get('/barrios', id_ciudad ? { id_ciudad } : undefined);
export const listarBarriosActivos  = (id_ciudad) => get('/barrios/activos', id_ciudad ? { id_ciudad } : undefined);
export const crearBarrio           = (d)    => post('/barrios', d);
export const actualizarBarrio      = (id,d) => patch(`/barrios/${id}`, d);
export const eliminarBarrio        = (id)   => del(`/barrios/${id}`);
export const estadoBarrio          = (id,d) => patch(`/barrios/${id}/estado`, d);

// ── Reseñas ───────────────────────────────────────────────────
export const crearResena        = (d)  => post('/resenas', d);
export const listarResenas      = ()   => get('/resenas');
export const resumenResenas     = ()   => get('/resenas/resumen');

// ── Configuración ─────────────────────────────────────────────
export const getTiempoEspera    = ()   => get('/configuracion/tiempo-espera').then((d) => d?.minutos || 30).catch(() => 30);
export const setTiempoEspera    = (m)  => patch('/configuracion/tiempo-espera', { minutos: m });

export const getHorario         = ()     => get('/configuracion/horario').catch(() => ({ hora_apertura: 13, hora_cierre: 20, estado_tienda: 'schedule' }));
export const setHorario         = (data) => patch('/configuracion/horario', data).catch(() => ({ hora_apertura: 13, hora_cierre: 20, estado_tienda: 'schedule' }));

// ── Puntos fidelidad ───────────────────────────────────────
export const getMisPuntos       = ()    => get('/puntos/mis-puntos').catch(() => ({ puntos: 0, saldo_pesos: 0, movimientos: [] }));
export const getPuntosCliente   = (id)  => get(`/puntos/cliente/${id}`).catch(() => ({ puntos: 0, saldo_pesos: 0, movimientos: [] }));

export default http;
