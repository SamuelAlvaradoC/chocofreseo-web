// Espejo en el frontend de la validación real del backend (ver
// chocoadmin-api/src/utils/validarSinHtml.js) -- esto es solo para que el
// usuario vea el error de inmediato sin esperar la respuesta del servidor.
// La protección real sigue siendo la del backend: cualquiera puede
// saltarse esto pegándole directo a la API.
//
// Usa el parser HTML nativo del navegador (igual de robusto que una
// librería, sin agregar dependencias) en vez de una regex propia: un
// regex casero es fácil de burlar con markup raro; dejar que el propio
// navegador decida qué es un tag válido es más confiable.
export function contieneEtiquetaHtml(texto) {
  if (typeof texto !== 'string' || !texto) return false;
  const doc = new DOMParser().parseFromString(texto, 'text/html');
  // Si el parser encontró algún elemento real (no solo texto suelto), es
  // que había un tag válido -- "a < b" o "5>3" no forman tags y quedan
  // como texto plano, sin generar elementos.
  return doc.body.children.length > 0;
}

export const MSG_HTML = 'El texto no puede contener etiquetas HTML o código';
