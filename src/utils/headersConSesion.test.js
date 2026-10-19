import { headersConSesion } from './headersConSesion';

// La reseña de un pedido exige la sesión del dueño: CtaFinal manda el token.
beforeEach(() => localStorage.clear());

test('con sesión incluye el token', () => {
  localStorage.setItem('token', 'abc');
  expect(headersConSesion()).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer abc' });
});

test('sin sesión solo manda JSON', () => {
  expect(headersConSesion()).toEqual({ 'Content-Type': 'application/json' });
});
