// Pedido fuera de horario: alerta obligatoria y textos para cliente y equipo.
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvisoFueraDeHorario, { avisoYaAceptado, guardarAvisoAceptado } from './AvisoFueraDeHorario';
import { mensajeTiendaCerrada, aceptaPedidosEnEspera, textoPreparacionEnEspera, horaRealPedido } from '../../utils/formatHora';

describe('alerta "La tienda está cerrada en este momento."', () => {
  const montar = () => {
    const onAceptar = jest.fn();
    const onCancelar = jest.fn();
    render(<AvisoFueraDeHorario textoDia="mañana martes 20" textoHora="1:00 PM" onAceptar={onAceptar} onCancelar={onCancelar} />);
    return { onAceptar, onCancelar };
  };

  test('muestra el título, el texto con el día y la hora, y la casilla', () => {
    montar();
    expect(screen.getByText('La tienda está cerrada en este momento.')).toBeInTheDocument();
    expect(screen.getByText(/empezaremos a prepararlo/)).toHaveTextContent(
      'Tu pedido quedará registrado y empezaremos a prepararlo mañana martes 20 a la 1:00 PM, que es cuando abrimos.');
    expect(screen.getByText('Entiendo que mi pedido se empezará a preparar a partir de la 1:00 PM')).toBeInTheDocument();
  });

  test('el botón de confirmar está deshabilitado hasta marcar la casilla', () => {
    const { onAceptar } = montar();
    const boton = screen.getByRole('button', { name: 'Hacer mi pedido' });
    expect(boton).toBeDisabled();
    fireEvent.click(boton);
    expect(onAceptar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(boton).toBeEnabled();
    fireEvent.click(boton);
    expect(onAceptar).toHaveBeenCalledTimes(1);
  });

  test('no se cierra tocando afuera; solo con "Volver"', () => {
    const { onCancelar, onAceptar } = montar();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onCancelar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onCancelar).toHaveBeenCalledTimes(1);
    expect(onAceptar).not.toHaveBeenCalled();
  });

  test('la aceptación se recuerda solo para esa apertura', () => {
    sessionStorage.clear();
    guardarAvisoAceptado('2026-10-20T18:00:00.000Z');
    expect(avisoYaAceptado('2026-10-20T18:00:00.000Z')).toBe(true);
    expect(avisoYaAceptado('2026-10-21T18:00:00.000Z')).toBe(false);
  });
});

describe('textos', () => {
  const fuera = { abierto: false, estado: 'schedule', hora_apertura: 13, acepta_pedidos_en_espera: true, texto_dia: 'hoy', texto_hora: '1:00 PM' };

  test('"Por horario" fuera de horario acepta pedidos; "Cerrada" manual no', () => {
    expect(aceptaPedidosEnEspera(fuera)).toBe(true);
    expect(aceptaPedidosEnEspera({ abierto: false, estado: 'closed' })).toBe(false);
    expect(aceptaPedidosEnEspera({ abierto: true, estado: 'schedule' })).toBe(false);
    expect(mensajeTiendaCerrada(fuera)).toBe('Estamos fuera de horario. Puedes hacer tu pedido ahora y empezaremos a prepararlo hoy a la 1:00 PM.');
    expect(mensajeTiendaCerrada({ abierto: false, estado: 'closed' })).toMatch(/cerrados por ahora/);
  });

  // Lunes 19 de octubre de 2026, 10:05 PM Colombia = martes 20, 03:05 UTC
  const lunesNoche = new Date('2026-10-20T03:05:00.000Z');
  const venta = { fecha: '2026-10-20T18:00:00.000Z', fecha_real: '2026-10-20T03:05:00.000Z' };

  test('cliente: "Empezaremos a prepararlo mañana martes 20 a la 1:00 PM"', () => {
    expect(textoPreparacionEnEspera(venta, lunesNoche)).toBe('Empezaremos a prepararlo mañana martes 20 a la 1:00 PM');
  });

  test('cliente: el mismo día antes de abrir es "hoy"', () => {
    const martes9am = new Date('2026-10-20T14:00:00.000Z');
    expect(textoPreparacionEnEspera(venta, martes9am)).toBe('Empezaremos a prepararlo hoy a la 1:00 PM');
  });

  test('cliente: pedido normal o ya abierta la tienda -> sin texto (se muestra el tiempo de siempre)', () => {
    expect(textoPreparacionEnEspera({ fecha: venta.fecha, fecha_real: null }, lunesNoche)).toBeNull();
    expect(textoPreparacionEnEspera(venta, new Date('2026-10-20T18:30:00.000Z'))).toBeNull();
  });

  test('equipo: hora real "lunes 10:05 PM"', () => {
    expect(horaRealPedido(venta.fecha_real)).toBe('lunes 10:05 PM');
  });
});
