/**
 * Transformaciones de Cloudinary: SOLO 3 tamaños estándar en toda la web.
 *
 * Cada combinación distinta de tamaño/recorte que se pide crea una "versión
 * derivada" nueva en Cloudinary (gasta transformaciones y almacenamiento) y
 * no se comparte la caché del CDN entre pantallas. Antes había 10 tamaños
 * (56, 80, 104, 120, 200, 300, 400, 600x320, 600x400, 600x440...); ahora
 * cualquier pedido se redondea a uno de estos tres:
 *
 *  - miniatura: cuadrado 400x400 con recorte inteligente (g_auto). Para toda
 *    imagen cuadrada que se muestra a 200 px o menos (nítida en pantallas 2x).
 *  - tarjeta:   600x440 con recorte inteligente. Tarjetas de producto; las
 *    cajas de 600x320 o 600x400 la recortan con object-fit: cover.
 *  - vista:     sin recorte, máximo 600 px de ancho (c_limit, nunca agranda).
 *    Vistas previas, landing y comprobantes. Es la MISMA transformación que usa
 *    la app (lib/core/utils/imagen.dart), así que web y app comparten la versión.
 *
 * f_auto: WebP/AVIF según el navegador. q_auto: calidad automática.
 * Si la URL no es de Cloudinary o ya trae una transformación, se deja igual.
 */
const ESTANDAR = {
  miniatura: 'w_400,h_400,c_fill,g_auto,q_auto,f_auto',
  tarjeta: 'w_600,h_440,c_fill,g_auto,q_auto,f_auto',
  vista: 'f_auto,q_auto,c_limit,w_600',
};

const aplicar = (url, transformacion) => {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  if (/\/upload\/(w_|f_|c_)/.test(url)) return url; // ya transformada
  return url.replace('/upload/', `/upload/${transformacion}/`);
};

/**
 * Imagen recortada. (w, h) indican cómo se va a mostrar: un cuadrado de hasta
 * 400 usa "miniatura"; cualquier otra forma usa "tarjeta".
 */
export const imgCl = (url, w = 400, h = 400) =>
  aplicar(url, w === h && w <= 400 ? ESTANDAR.miniatura : ESTANDAR.tarjeta);

/** Imagen completa, sin recortar (estándar "vista"). */
export const imgOpt = (url) => aplicar(url, ESTANDAR.vista);
