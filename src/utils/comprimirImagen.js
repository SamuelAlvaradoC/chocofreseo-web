// Comprime una foto en el navegador antes de subirla: lado mayor como máximo
// `maxLado` px y JPEG con `calidad`. Una foto de celular de 5-12 MB queda en
// unos cientos de KB, legible para verificar un comprobante. Si el navegador
// no puede decodificarla (formato raro) o el resultado no es más liviano, se
// devuelve el archivo original sin tocar -- nunca bloquea la subida.
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
    ctx.fillStyle = '#fff'; // fondo blanco para PNG con transparencia
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', calidad));
    if (!blob || blob.size >= file.size) return file;
    const nombre = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], nombre, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}
