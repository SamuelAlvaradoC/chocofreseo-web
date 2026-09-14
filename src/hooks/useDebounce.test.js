import { renderHook, act } from '@testing-library/react';
import useDebounce from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('no llama al callback antes de que pase el delay', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce(callback, 400));

    act(() => result.current('a'));
    jest.advanceTimersByTime(399);
    expect(callback).not.toHaveBeenCalled();
  });

  it('llama al callback una vez pasado el delay, con el último argumento', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce(callback, 400));

    act(() => result.current('a'));
    jest.advanceTimersByTime(400);
    expect(callback).toHaveBeenCalledWith('a');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('reinicia el temporizador con cada llamada -- solo corre la última', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce(callback, 400));

    act(() => result.current('a'));
    jest.advanceTimersByTime(200);
    act(() => result.current('b'));
    jest.advanceTimersByTime(200);
    expect(callback).not.toHaveBeenCalled(); // solo pasaron 200ms desde 'b'

    jest.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('b');
  });

  it('siempre usa la versión más reciente del callback (sin closures viejas)', () => {
    const primero = jest.fn();
    const segundo = jest.fn();
    const { result, rerender } = renderHook(({ cb }) => useDebounce(cb, 400), {
      initialProps: { cb: primero },
    });

    act(() => result.current('x'));
    rerender({ cb: segundo });
    jest.advanceTimersByTime(400);

    expect(primero).not.toHaveBeenCalled();
    expect(segundo).toHaveBeenCalledWith('x');
  });

  it('cancela el temporizador pendiente al desmontar', () => {
    const callback = jest.fn();
    const { result, unmount } = renderHook(() => useDebounce(callback, 400));

    act(() => result.current('a'));
    unmount();
    jest.advanceTimersByTime(400);

    expect(callback).not.toHaveBeenCalled();
  });
});
