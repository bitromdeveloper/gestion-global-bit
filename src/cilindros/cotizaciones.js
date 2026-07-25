import { supabase } from '../lib/supabase';

// ============================================================================
// Cotización histórica del dólar OFICIAL (así se maneja la empresa).
// Fuente: api.argentinadatos.com — gratis, sin key.
// Caché en 2 niveles: memoria (durante la sesión) y Supabase (entre sesiones,
// compartido por todos los usuarios) para no golpear la API de más.
// ============================================================================

const memoria = new Map(); // fecha (YYYY-MM-DD) -> { compra, venta } | null

function formatearFechaParaApi(fechaISO) {
  // "2024-06-15" -> "2024/06/15" (formato que pide la API)
  return fechaISO.replaceAll('-', '/');
}

function restarDias(fechaISO, dias) {
  const d = new Date(fechaISO + 'T12:00:00');
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

async function fetchDeApiExterna(fechaISO) {
  try {
    const resp = await fetch(
      `https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial/${formatearFechaParaApi(fechaISO)}`
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data || !data.venta) return null;
    return { compra: data.compra, venta: data.venta };
  } catch (e) {
    console.error('Error consultando cotización del dólar:', e);
    return null;
  }
}

async function fetchDeCacheSupabase(fechaISO) {
  const { data, error } = await supabase
    .schema('cilindros')
    .from('cotizaciones_dolar')
    .select('compra, venta')
    .eq('fecha', fechaISO)
    .maybeSingle();
  if (error) {
    console.error('Error leyendo caché de cotizaciones:', error);
    return null;
  }
  return data;
}

async function guardarEnCacheSupabase(fechaISO, cotizacion) {
  const { error } = await supabase
    .schema('cilindros')
    .from('cotizaciones_dolar')
    .upsert({ fecha: fechaISO, compra: cotizacion.compra, venta: cotizacion.venta, fuente: 'oficial' });
  if (error) console.error('Error guardando cotización en caché:', error);
}

// Obtiene la cotización de una fecha. Si ese día puntual no tiene dato
// (fin de semana, feriado), retrocede hasta 5 días buscando la más cercana.
export async function obtenerCotizacion(fechaISO) {
  if (!fechaISO) return null;

  if (memoria.has(fechaISO)) return memoria.get(fechaISO);

  // 1. Caché de Supabase
  const cacheada = await fetchDeCacheSupabase(fechaISO);
  if (cacheada) {
    memoria.set(fechaISO, cacheada);
    return cacheada;
  }

  // 2. API externa, con reintento hacia atrás si el día exacto no tiene dato
  for (let intento = 0; intento < 6; intento++) {
    const fechaAProbar = restarDias(fechaISO, intento);
    const resultado = await fetchDeApiExterna(fechaAProbar);
    if (resultado) {
      memoria.set(fechaISO, resultado);
      guardarEnCacheSupabase(fechaISO, resultado); // no espera, guarda en segundo plano
      return resultado;
    }
  }

  memoria.set(fechaISO, null);
  return null;
}

// Convierte un monto a USD según moneda original y la cotización de esa fecha.
// Si ya está en USD, no hace falta cotización.
export function convertirAUSD(monto, moneda, cotizacion) {
  if (monto === null || monto === undefined || monto === '') return null;
  const v = Number(monto);
  if (moneda === 'USD') return v;
  if (!cotizacion || !cotizacion.venta) return null;
  return v / cotizacion.venta;
}
