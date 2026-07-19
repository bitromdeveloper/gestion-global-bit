// ============================================================================
// Funciones puras y constantes compartidas por todo el módulo de cilindros.
// Nada acá depende de React ni de Supabase — son solo cálculos.
// ============================================================================

export const STATUS_STYLE = {
  'Reparado - Recibido en Almacén': { color: '#4FA98C', bg: 'rgba(79,169,140,0.14)', label: 'Reparado — en almacén', dot: '#4FA98C' },
  'En poder del proveedor (en reparación)': { color: '#E8871E', bg: 'rgba(232,135,30,0.14)', label: 'En poder del proveedor', dot: '#E8871E' },
  'SIN_REPARACIONES': { color: '#5A6068', bg: 'rgba(90,96,104,0.12)', label: 'Sin reparaciones registradas', dot: '#5A6068' },
};

export const ESTADO_OPERATIVO_STYLE = {
  en_uso:          { label: 'En uso',                    color: '#5B7A99', bg: 'rgba(91,122,153,0.16)' },
  en_stock:        { label: 'En stock (reparado)',        color: '#4FA98C', bg: 'rgba(79,169,140,0.16)' },
  en_proveedor:    { label: 'En poder del proveedor',     color: '#E8871E', bg: 'rgba(232,135,30,0.16)' },
  roto_en_almacen: { label: 'Roto — en almacén',          color: '#C0392B', bg: 'rgba(192,57,43,0.16)' },
  baja:            { label: 'Dado de baja',               color: '#5A6068', bg: 'rgba(90,96,104,0.16)' },
};

export function parseDate(s) {
  if (!s) return null;
  return new Date(s);
}

export function fmtMoney(n, currency) {
  if (n === null || n === undefined || n === '') return '—';
  const v = Number(n);
  return (currency === 'USD' ? 'US$ ' : '$ ') + v.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

export function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString('es-AR');
}

export function diasDesde(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d)) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function fmtHaceTiempo(s) {
  const dias = diasDesde(s);
  if (dias === null) return '';
  if (dias < 0) return '';
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  if (dias < 365) return `hace ${Math.floor(dias / 30)} ${Math.floor(dias / 30) === 1 ? 'mes' : 'meses'}`;
  return `hace ${Math.floor(dias / 365)} ${Math.floor(dias / 365) === 1 ? 'año' : 'años'}`;
}

export const ANIOS_SIN_ACTIVIDAD_PARA_BAJA = 4;

export function esInactivo(fechaUltimaOc) {
  if (!fechaUltimaOc) return true; // nunca tuvo ninguna OC
  const dias = diasDesde(fechaUltimaOc);
  return dias === null || dias > ANIOS_SIN_ACTIVIDAD_PARA_BAJA * 365;
}
