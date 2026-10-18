// Comprime una foto en el navegador antes de subirla: lado mayor como máximo
// `maxLado` px. Una foto de celular de 5-12 MB queda en unos cientos de KB.
//
// - Sin transparencia -> JPEG con `calidad` (comprobantes y la mayoría de fotos).
// - Con transparencia (PNG recortado, ej. un topping sin fondo) -> PNG
//   redimensionado, para no poner fondo blanco ni cambiar cómo se ve.
//
// Si el navegador no puede decodificarla (formato raro) o el resultado no es
// más liviano, se devuelve el archivo original sin tocar -- nunca bloquea la subida.
export async function comprimirImagen(file, { maxLado = 1600, calidad = 0.8 } = {}) {
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const transparente = file.type !== 'image/jpeg' && tieneTransparencia(ctx, w, h);
    let tipo = 'image/png';
    if (!transparente) {
      // Fondo blanco debajo, por si el PNG tenía bordes semitransparentes mínimos.
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      tipo = 'image/jpeg';
    }

    const blob = await new Promise((res) => canvas.toBlob(res, tipo, calidad));
    if (!blob || blob.size >= file.size) return file;
    const nombre = file.name.replace(/\.[^.]+$/, '') + (tipo === 'image/png' ? '.png' : '.jpg');
    return new File([blob], nombre, { type: tipo, lastModified: Date.now() });
  } catch {
    return file;
  }
}

// ¿Algún píxel no es totalmente opaco? Se revisa una muestra (uno de cada 8)
// para que sea rápido incluso en fotos grandes.
function tieneTransparencia(ctx, w, h) {
  const datos = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < datos.length; i += 4 * 8) {
    if (datos[i] < 255) return true;
  }
  return false;
}
