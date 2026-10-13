/**
 * Transforma una URL de Cloudinary para recortar y optimizar la imagen.
 * c_fill: rellena el contenedor recortando inteligentemente
 * g_auto: detecta el sujeto principal para centrar el recorte
 * q_auto: calidad automática (optimiza tamaño)
 * f_auto: formato automático (WebP en navegadores compatibles)
 */
export const imgCl = (url, w = 400, h = 400) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_${w},h_${h},c_fill,g_auto,q_auto,f_auto/`);
};

/**
 * Igual que imgCl pero SIN recortar: solo limita el ancho (c_limit, nunca
 * agranda) y optimiza formato/calidad. Para miniaturas y vistas previas donde
 * la imagen se muestra completa (object-fit: contain) o el alto lo pone el CSS.
 */
export const imgOpt = (url, w = 600) => {
  if (!url || !url.includes('cloudinary.com') || url.includes('/upload/f_auto') || url.includes('/upload/w_')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${w}/`);
};
