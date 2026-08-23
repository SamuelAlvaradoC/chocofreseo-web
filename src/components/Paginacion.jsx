// Componente de paginación reutilizable para las tablas del panel Admin.
// Muestra siempre Anterior/Siguiente + primera/última página, un rango
// alrededor de la página actual, y "..." para los huecos -- en vez de listar
// todos los números seguidos (inutilizable con muchas páginas, ej. Barrios).

export const OPCIONES_POR_PAGINA_DEFAULT = [10, 50, 100, 'todos'];

// Pura y exportada aparte para poder testear el cálculo del rango sin montar
// el componente. `delta` = cuántas páginas mostrar a cada lado de la actual.
export function calcularRangoPaginas(pagina, totalPaginas, delta = 2) {
  const total = Math.max(1, totalPaginas || 1);
  if (total <= 1) return [1];

  let izquierda = Math.max(2, pagina - delta);
  let derecha   = Math.min(total - 1, pagina + delta);

  // Si el hueco entre el extremo y el inicio/fin del rango es de una sola
  // página, se muestra esa página en vez de "..." -- un "..." que esconde
  // un único número se ve peor que simplemente mostrarlo.
  if (izquierda === 3) izquierda = 2;
  if (derecha === total - 2) derecha = total - 1;

  const rango = [1];
  if (izquierda > 2) rango.push('...');
  for (let i = izquierda; i <= derecha; i++) rango.push(i);
  if (derecha < total - 1) rango.push('...');
  rango.push(total);

  return rango;
}

const estiloBoton = { width: 32, height: 32, padding: 0 };
const estiloBotonTexto = { width: 'auto', padding: '0 12px' };
const estiloElipsis = {
  width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  color: '#aaa', fontWeight: 700, fontSize: 13, userSelect: 'none',
};
const estiloSelect = {
  height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13,
  color: '#333', background: '#fff', fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
};

// Selector "Mostrar: 10/50/100/Todos" solo -- separado de <Paginacion/> para
// poder colocarlo en cualquier layout (ej. junto a un filtro) sin arrastrar
// los botones de número de página. <Paginacion/> lo reutiliza internamente.
export function SelectorPorPagina({ porPagina, onCambiarPorPagina, opciones = OPCIONES_POR_PAGINA_DEFAULT }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#888' }}>Mostrar:</span>
      <select
        value={porPagina}
        onChange={(e) => onCambiarPorPagina(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
        style={estiloSelect}
      >
        {opciones.map((op) => (
          <option key={op} value={op}>{op === 'todos' ? 'Todos' : op}</option>
        ))}
      </select>
    </div>
  );
}

export default function Paginacion({
  pagina,
  totalPaginas,
  onCambiarPagina,
  porPagina,
  onCambiarPorPagina,
  opcionesPorPagina = OPCIONES_POR_PAGINA_DEFAULT,
  delta = 2,
  // Sin la tarjeta blanca acolchada (padding + borde) -- para cuando el
  // propio contenedor padre ya le da el layout, ej. una fila suelta entre
  // los filtros y la tabla en vez de una caja separada.
  compacto = false,
}) {
  const mostrarSelector = porPagina !== undefined && typeof onCambiarPorPagina === 'function';
  // Siempre se renderizan Anterior/1/Siguiente, incluso con una sola página
  // (deshabilitados en ese caso) -- layout consistente en todas las tablas
  // del panel en vez de que la fila de paginación aparezca y desaparezca
  // según cuántos registros haya.
  const mostrarNumeros  = true;

  if (!mostrarSelector && !mostrarNumeros) return null;

  const rango = calcularRangoPaginas(pagina, totalPaginas, delta);

  return (
    <div
      className="paginacion"
      style={{
        justifyContent: mostrarSelector ? 'space-between' : 'flex-end',
        flexWrap: 'wrap',
        ...(compacto ? { padding: 0, borderTop: 'none' } : {}),
      }}
    >
      {mostrarSelector && (
        <SelectorPorPagina porPagina={porPagina} onCambiarPorPagina={onCambiarPorPagina} opciones={opcionesPorPagina} />
      )}

      {mostrarNumeros && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn-pagina"
            style={estiloBotonTexto}
            onClick={() => onCambiarPagina(Math.max(1, pagina - 1))}
            disabled={pagina === 1}
          >
            ‹ Anterior
          </button>

          {rango.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} style={estiloElipsis}>···</span>
            ) : (
              <button
                key={p}
                className={`btn-pagina${pagina === p ? ' activo' : ''}`}
                style={estiloBoton}
                onClick={() => onCambiarPagina(p)}
              >
                {p}
              </button>
            )
          )}

          <button
            className="btn-pagina"
            style={estiloBotonTexto}
            onClick={() => onCambiarPagina(Math.min(totalPaginas, pagina + 1))}
            disabled={pagina === totalPaginas}
          >
            Siguiente ›
          </button>
        </div>
      )}
    </div>
  );
}
