import { renderHook } from '@testing-library/react';
import useRefetchOnFocus from './useRefetchOnFocus';

const setVisibility = (state) => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
};

describe('useRefetchOnFocus', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    setVisibility('visible');
    jest.useRealTimers();
  });

  it('llama al callback cuando la pestaña vuelve a estar visible tras estar oculta un buen rato', () => {
    const callback = jest.fn();
    renderHook(() => useRefetchOnFocus(callback, 1000));
    jest.advanceTimersByTime(2000); // simula que pasó tiempo desde el fetch de montaje

    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(callback).not.toHaveBeenCalled(); // oculta -- no debe recargar

    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('llama al callback cuando la ventana recupera el foco después de un rato', () => {
    const callback = jest.fn();
    renderHook(() => useRefetchOnFocus(callback, 1000));
    jest.advanceTimersByTime(2000);

    window.dispatchEvent(new Event('focus'));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('NO relanza la carga si el usuario cambia de pestaña varias veces seguidas en poco tiempo', () => {
    const callback = jest.fn();
    renderHook(() => useRefetchOnFocus(callback, 5000));
    jest.advanceTimersByTime(6000);

    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));

    expect(callback).toHaveBeenCalledTimes(1); // solo la primera cuenta dentro del intervalo mínimo
  });

  it('vuelve a permitir la recarga después de pasado el intervalo mínimo', () => {
    const callback = jest.fn();
    renderHook(() => useRefetchOnFocus(callback, 1000));
    jest.advanceTimersByTime(2000);

    window.dispatchEvent(new Event('focus'));
    expect(callback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1500);
    window.dispatchEvent(new Event('focus'));
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('no llama al callback recién montado, ni siquiera si algo dispara el evento de inmediato', () => {
    const callback = jest.fn();
    renderHook(() => useRefetchOnFocus(callback, 1000));

    window.dispatchEvent(new Event('focus')); // sin avanzar el reloj -- el fetch de montaje "acaba de pasar"
    expect(callback).not.toHaveBeenCalled();
  });

  it('limpia los listeners al desmontar (no llama al callback después de unmount)', () => {
    const callback = jest.fn();
    const { unmount } = renderHook(() => useRefetchOnFocus(callback, 0));
    jest.advanceTimersByTime(1000);
    unmount();

    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(callback).not.toHaveBeenCalled();
  });

  it('siempre usa la versión más reciente del callback (sin closures viejas)', () => {
    const primero = jest.fn();
    const segundo = jest.fn();
    const { rerender } = renderHook(({ cb }) => useRefetchOnFocus(cb, 0), {
      initialProps: { cb: primero },
    });
    rerender({ cb: segundo });
    jest.advanceTimersByTime(1000);

    window.dispatchEvent(new Event('focus'));
    expect(primero).not.toHaveBeenCalled();
    expect(segundo).toHaveBeenCalledTimes(1);
  });
});
