import { imgCl, imgOpt } from './cloudinary';

const U = 'https://res.cloudinary.com/dnoxlv5kn/image/upload/v1779300851/foto.png';
const trans = (url) => url.split('/upload/')[1].split('/')[0];

test('cualquier cuadrado <= 400 usa la miniatura estándar', () => {
  for (const t of [56, 80, 104, 200, 400]) {
    expect(trans(imgCl(U, t, t))).toBe('w_400,h_400,c_fill,g_auto,q_auto,f_auto');
  }
});

test('las tarjetas (600x320, 600x400, 600x440) usan un solo tamaño', () => {
  for (const [w, h] of [[600, 320], [600, 400], [600, 440]]) {
    expect(trans(imgCl(U, w, h))).toBe('w_600,h_440,c_fill,g_auto,q_auto,f_auto');
  }
});

test('imgOpt usa la "vista" sin recorte, igual que la app', () => {
  expect(trans(imgOpt(U))).toBe('f_auto,q_auto,c_limit,w_600');
});

test('solo hay 3 transformaciones distintas', () => {
  const todas = new Set([imgCl(U, 56, 56), imgCl(U, 200, 200), imgCl(U, 600, 320), imgCl(U, 600, 440), imgOpt(U)].map(trans));
  expect(todas.size).toBe(3);
});

test('no toca URLs que no son de Cloudinary ni las ya transformadas', () => {
  expect(imgCl('/img/logo.png')).toBe('/img/logo.png');
  expect(imgOpt(imgOpt(U))).toBe(imgOpt(U));
  expect(imgCl(null)).toBe(null);
});
