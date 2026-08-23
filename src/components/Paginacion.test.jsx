import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Paginacion, { calcularRangoPaginas, SelectorPorPagina } from './Paginacion';

describe('calcularRangoPaginas', () => {
  test('página en el medio con muchas páginas: muestra rango alrededor + extremos con "..."', () => {
    expect(calcularRangoPaginas(6, 26)).toEqual([1, '...', 4, 5, 6, 7, 8, '...', 26]);
  });

  test('extremo izquierdo (página 1): sin "..." antes, "..." solo antes del último', () => {
    expect(calcularRangoPaginas(1, 26)).toEqual([1, 2, 3, '...', 26]);
  });

  test('extremo derecho (última página): "..." solo antes del rango, no después', () => {
    expect(calcularRangoPaginas(26, 26)).toEqual([1, '...', 24, 25, 26]);
  });

  test('cerca del extremo izquierdo (página 2 de 26): no debe meter "..." innecesario al inicio', () => {
    expect(calcularRangoPaginas(2, 26)).toEqual([1, 2, 3, 4, '...', 26]);
  });

  test('cerca del extremo derecho (página 25 de 26): no debe meter "..." innecesario al final', () => {
    expect(calcularRangoPaginas(25, 26)).toEqual([1, '...', 23, 24, 25, 26]);
  });

  test('pocas páginas (5 totales): nunca debe aparecer "..." si el rango ya cubre todo', () => {
    expect(calcularRangoPaginas(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(calcularRangoPaginas(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(calcularRangoPaginas(5, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test('una sola página: devuelve solo [1]', () => {
    expect(calcularRangoPaginas(1, 1)).toEqual([1]);
  });

  test('dos páginas: sin "..."', () => {
    expect(calcularRangoPaginas(1, 2)).toEqual([1, 2]);
    expect(calcularRangoPaginas(2, 2)).toEqual([1, 2]);
  });

  test('delta configurable (1 en vez de 2)', () => {
    expect(calcularRangoPaginas(10, 26, 1)).toEqual([1, '...', 9, 10, 11, '...', 26]);
  });
});

describe('<Paginacion /> — render e interacción', () => {
  test('resalta la página actual con la clase "activo" y no las demás', () => {
    render(<Paginacion pagina={6} totalPaginas={26} onCambiarPagina={() => {}} />);
    expect(screen.getByText('6')).toHaveClass('activo');
    expect(screen.getByText('7')).not.toHaveClass('activo');
  });

  test('los "..." se renderizan como texto no clicable, no como botón', () => {
    render(<Paginacion pagina={6} totalPaginas={26} onCambiarPagina={() => {}} />);
    const puntos = screen.getAllByText('···');
    expect(puntos).toHaveLength(2);
    puntos.forEach((el) => expect(el.tagName).not.toBe('BUTTON'));
  });

  test('clic en un número de página llama a onCambiarPagina con ese número', () => {
    const onCambiarPagina = jest.fn();
    render(<Paginacion pagina={6} totalPaginas={26} onCambiarPagina={onCambiarPagina} />);
    fireEvent.click(screen.getByText('8'));
    expect(onCambiarPagina).toHaveBeenCalledWith(8);
  });

  test('"Anterior"/"Siguiente" avanzan o retroceden una página', () => {
    const onCambiarPagina = jest.fn();
    render(<Paginacion pagina={6} totalPaginas={26} onCambiarPagina={onCambiarPagina} />);
    fireEvent.click(screen.getByText('‹ Anterior'));
    expect(onCambiarPagina).toHaveBeenCalledWith(5);
    fireEvent.click(screen.getByText('Siguiente ›'));
    expect(onCambiarPagina).toHaveBeenCalledWith(7);
  });

  test('"Anterior" deshabilitado en la página 1, "Siguiente" deshabilitado en la última', () => {
    render(<Paginacion pagina={1} totalPaginas={26} onCambiarPagina={() => {}} />);
    expect(screen.getByText('‹ Anterior')).toBeDisabled();
    expect(screen.getByText('Siguiente ›')).not.toBeDisabled();
  });

  test('con una sola página y sin selector, igual renderiza Anterior/1/Siguiente deshabilitados', () => {
    render(<Paginacion pagina={1} totalPaginas={1} onCambiarPagina={() => {}} />);
    expect(screen.getByText('‹ Anterior')).toBeDisabled();
    expect(screen.getByText('Siguiente ›')).toBeDisabled();
    expect(screen.getByText('1')).toHaveClass('activo');
  });

  test('selector "Mostrar" solo aparece si se pasan porPagina + onCambiarPorPagina', () => {
    render(<Paginacion pagina={1} totalPaginas={1} onCambiarPagina={() => {}} porPagina={10} onCambiarPorPagina={() => {}} />);
    expect(screen.getByText('Mostrar:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  test('cambiar el selector "Mostrar" a "Todos" llama a onCambiarPorPagina con "todos"', () => {
    const onCambiarPorPagina = jest.fn();
    render(<Paginacion pagina={1} totalPaginas={5} onCambiarPagina={() => {}} porPagina={10} onCambiarPorPagina={onCambiarPorPagina} />);
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: 'todos' } });
    expect(onCambiarPorPagina).toHaveBeenCalledWith('todos');
  });

  test('cambiar el selector "Mostrar" a un número lo pasa como Number, no string', () => {
    const onCambiarPorPagina = jest.fn();
    render(<Paginacion pagina={1} totalPaginas={5} onCambiarPagina={() => {}} porPagina={10} onCambiarPorPagina={onCambiarPorPagina} />);
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '50' } });
    expect(onCambiarPorPagina).toHaveBeenCalledWith(50);
  });

  test('sin porPagina/onCambiarPorPagina, no renderiza el selector "Mostrar" (para usarlo junto a un filtro aparte)', () => {
    render(<Paginacion pagina={6} totalPaginas={26} onCambiarPagina={() => {}} />);
    expect(screen.queryByText('Mostrar:')).not.toBeInTheDocument();
    // pero los números sí siguen ahí
    expect(screen.getByText('6')).toHaveClass('activo');
  });
});

describe('<SelectorPorPagina /> — standalone (para usar fuera de <Paginacion/>, ej. junto a un filtro)', () => {
  test('muestra "Mostrar:" con el valor actual seleccionado', () => {
    render(<SelectorPorPagina porPagina={10} onCambiarPorPagina={() => {}} />);
    expect(screen.getByText('Mostrar:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  test('cambiar el valor llama a onCambiarPorPagina con el tipo correcto (Number o "todos")', () => {
    const onCambiarPorPagina = jest.fn();
    render(<SelectorPorPagina porPagina={10} onCambiarPorPagina={onCambiarPorPagina} />);
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '100' } });
    expect(onCambiarPorPagina).toHaveBeenCalledWith(100);
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: 'todos' } });
    expect(onCambiarPorPagina).toHaveBeenCalledWith('todos');
  });

  test('acepta una lista de opciones personalizada', () => {
    render(<SelectorPorPagina porPagina={25} onCambiarPorPagina={() => {}} opciones={[25, 75]} />);
    expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });
});

describe('<Paginacion compacto /> — sin la tarjeta blanca acolchada', () => {
  // Nota: jsdom no acepta "border-top: none" como valor de estilo inline
  // (lo descarta silenciosamente aunque sea CSS válido en cualquier
  // navegador real -- confirmado visualmente con Chromium vía Playwright).
  // Por eso este test solo verifica el padding, que sí es fiable en jsdom.
  test('quita el padding propio de ".paginacion" cuando compacto=true', () => {
    render(<Paginacion pagina={1} totalPaginas={5} onCambiarPagina={() => {}} compacto />);
    const contenedor = screen.getByText('1').closest('.paginacion');
    expect(contenedor.style.padding).toBe('0px');
  });

  test('sin compacto (por defecto), conserva el padding de la tarjeta', () => {
    render(<Paginacion pagina={1} totalPaginas={5} onCambiarPagina={() => {}} />);
    const contenedor = screen.getByText('1').closest('.paginacion');
    expect(contenedor.style.padding).toBe('');
  });
});
