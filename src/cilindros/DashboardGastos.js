import React, { useState, useEffect, useMemo } from 'react';
import { obtenerCotizacion, convertirAUSD } from './cotizaciones';

// ============================================================================
// DASHBOARD DE GASTOS — todo en USD (cotización oficial histórica de cada
// reparación). Convierte todas las reparaciones una sola vez (con caché,
// así que la segunda vez que se abre es instantáneo) y arma 4 vistas:
// gasto por mes, por equipo, ranking de cilindros más caros (con toggle
// histórico/activos), y por proveedor.
// ============================================================================

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function fmtUSD(n) {
  if (n === null || n === undefined) return '—';
  return `US$ ${Math.round(n).toLocaleString('es-AR')}`;
}

export default function DashboardGastos({ reparaciones, catalogo, estadoEfectivoPorCodigo }) {
  const [cotizacionesPorFecha, setCotizacionesPorFecha] = useState({});
  const [cargando, setCargando] = useState(true);
  const [soloActivos, setSoloActivos] = useState(false);

  const catalogoPorCodigo = useMemo(() => {
    const map = {};
    catalogo.forEach((c) => { map[c.codigo] = c; });
    return map;
  }, [catalogo]);

  // Trae la cotización de cada fecha distinta que aparece en las reparaciones.
  // La primera vez puede tardar unos segundos (una request por fecha nueva);
  // las siguientes veces ya está todo cacheado en Supabase y es instantáneo.
  useEffect(() => {
    const fechas = [...new Set(reparaciones.map((r) => r.fecha_solicitud).filter(Boolean))];
    let cancelado = false;
    setCargando(true);
    (async () => {
      for (const fecha of fechas) {
        if (cancelado) return;
        const cot = await obtenerCotizacion(fecha);
        if (cancelado) return;
        setCotizacionesPorFecha((prev) => (fecha in prev ? prev : { ...prev, [fecha]: cot }));
      }
      if (!cancelado) setCargando(false);
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line
  }, [reparaciones]);

  const reparacionesConUSD = useMemo(() => {
    return reparaciones.map((r) => ({
      ...r,
      usd: convertirAUSD(r.precio_total, r.moneda, cotizacionesPorFecha[r.fecha_solicitud]),
    }));
  }, [reparaciones, cotizacionesPorFecha]);

  const progreso = useMemo(() => {
    const fechas = new Set(reparaciones.map((r) => r.fecha_solicitud).filter(Boolean));
    const resueltas = [...fechas].filter((f) => f in cotizacionesPorFecha).length;
    return { total: fechas.size, resueltas };
  }, [reparaciones, cotizacionesPorFecha]);

  // ---- Gasto por mes (últimos 12 meses con datos) ----
  const gastoPorMes = useMemo(() => {
    const map = {};
    reparacionesConUSD.forEach((r) => {
      if (!r.fecha_solicitud || r.usd === null) return;
      const key = r.fecha_solicitud.slice(0, 7); // YYYY-MM
      map[key] = (map[key] || 0) + r.usd;
    });
    return Object.entries(map)
      .map(([mes, usd]) => {
        const [y, m] = mes.split('-');
        return { mes, label: `${MESES[Number(m) - 1]} ${y.slice(2)}`, usd };
      })
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12);
  }, [reparacionesConUSD]);

  // ---- Gasto por equipo ----
  const gastoPorEquipo = useMemo(() => {
    const map = {};
    reparacionesConUSD.forEach((r) => {
      if (r.usd === null) return;
      const eq = catalogoPorCodigo[r.codigo]?.equipo || 'SIN IDENTIFICAR';
      map[eq] = (map[eq] || 0) + r.usd;
    });
    return Object.entries(map)
      .map(([equipo, usd]) => ({ equipo, usd }))
      .sort((a, b) => b.usd - a.usd);
  }, [reparacionesConUSD, catalogoPorCodigo]);

  // ---- Ranking de cilindros más caros (histórico o solo activos) ----
  const rankingCilindros = useMemo(() => {
    const map = {};
    reparacionesConUSD.forEach((r) => {
      if (r.usd === null) return;
      if (soloActivos && estadoEfectivoPorCodigo[r.codigo]?.estado === 'baja') return;
      if (!map[r.codigo]) map[r.codigo] = { codigo: r.codigo, usd: 0, count: 0 };
      map[r.codigo].usd += r.usd;
      map[r.codigo].count += 1;
    });
    return Object.values(map)
      .map((x) => ({ ...x, descripcion: catalogoPorCodigo[x.codigo]?.descripcion_unificada || catalogoPorCodigo[x.codigo]?.descripcion_original || '' }))
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 20);
  }, [reparacionesConUSD, soloActivos, estadoEfectivoPorCodigo, catalogoPorCodigo]);

  // ---- Gasto por proveedor ----
  const gastoPorProveedor = useMemo(() => {
    const map = {};
    reparacionesConUSD.forEach((r) => {
      if (r.usd === null || !r.proveedor) return;
      if (!map[r.proveedor]) map[r.proveedor] = { proveedor: r.proveedor, usd: 0, count: 0 };
      map[r.proveedor].usd += r.usd;
      map[r.proveedor].count += 1;
    });
    return Object.values(map).sort((a, b) => b.usd - a.usd).slice(0, 15);
  }, [reparacionesConUSD]);

  function BarraLista({ items, renderLabel, renderValor, valorKey }) {
    const max = Math.max(...items.map((i) => i[valorKey]), 1);
    return (
      <div style={s.listaWrap}>
        {items.map((item, i) => (
          <div key={i} style={s.filaBarra}>
            <div style={s.filaLabel}>{renderLabel(item)}</div>
            <div style={s.barraTrack}>
              <div style={{ ...s.barraFill, width: `${(item[valorKey] / max) * 100}%` }} />
            </div>
            <div style={s.filaValor}>{renderValor(item)}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      {cargando && (
        <div style={s.avisoCargando}>
          Calculando cotizaciones históricas... {progreso.resueltas} de {progreso.total} fechas
        </div>
      )}

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardTitulo}>Gasto por mes (últimos 12 meses con datos)</div>
          {gastoPorMes.length === 0 ? (
            <div style={s.vacio}>Sin datos todavía.</div>
          ) : (
            <BarraLista
              items={gastoPorMes}
              valorKey="usd"
              renderLabel={(m) => m.label}
              renderValor={(m) => fmtUSD(m.usd)}
            />
          )}
        </div>

        <div style={s.card}>
          <div style={s.cardTitulo}>Gasto por equipo</div>
          {gastoPorEquipo.length === 0 ? (
            <div style={s.vacio}>Sin datos todavía.</div>
          ) : (
            <BarraLista
              items={gastoPorEquipo}
              valorKey="usd"
              renderLabel={(e) => e.equipo}
              renderValor={(e) => fmtUSD(e.usd)}
            />
          )}
        </div>

        <div style={s.card}>
          <div style={s.cardHeaderRow}>
            <div style={s.cardTitulo}>Ranking — cilindros con más gasto acumulado</div>
            <div style={s.toggleGroup}>
              <button
                style={{ ...s.toggleBtn, ...(!soloActivos ? s.toggleBtnActive : {}) }}
                onClick={() => setSoloActivos(false)}
              >
                Histórico
              </button>
              <button
                style={{ ...s.toggleBtn, ...(soloActivos ? s.toggleBtnActive : {}) }}
                onClick={() => setSoloActivos(true)}
              >
                Solo activos
              </button>
            </div>
          </div>
          {rankingCilindros.length === 0 ? (
            <div style={s.vacio}>Sin datos todavía.</div>
          ) : (
            <div style={s.tablaRanking}>
              {rankingCilindros.map((c, i) => (
                <div key={c.codigo} style={s.filaRanking}>
                  <span style={s.rankingPos}>{i + 1}</span>
                  <span style={s.rankingCodigo}>{c.codigo}</span>
                  <span style={s.rankingDesc}>{c.descripcion}</span>
                  <span style={s.rankingCount}>{c.count} rep.</span>
                  <span style={s.rankingUsd}>{fmtUSD(c.usd)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={s.card}>
          <div style={s.cardTitulo}>Gasto por proveedor</div>
          {gastoPorProveedor.length === 0 ? (
            <div style={s.vacio}>Sin datos todavía.</div>
          ) : (
            <div style={s.tablaRanking}>
              {gastoPorProveedor.map((p, i) => (
                <div key={p.proveedor} style={s.filaRanking}>
                  <span style={s.rankingPos}>{i + 1}</span>
                  <span style={{ ...s.rankingDesc, flex: 2 }}>{p.proveedor}</span>
                  <span style={s.rankingCount}>{p.count} rep.</span>
                  <span style={s.rankingUsd}>{fmtUSD(p.usd)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { padding: '24px 32px', fontFamily: "'Oswald', sans-serif", color: '#E8E6E1' },
  avisoCargando: {
    fontSize: 12, color: '#5B7A99', background: 'rgba(91,122,153,0.1)', border: '1px solid rgba(91,122,153,0.3)',
    borderRadius: 8, padding: '10px 14px', marginBottom: 20,
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  card: { background: '#212427', border: '1px solid #2A2E32', borderRadius: 8, padding: 18 },
  cardHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  cardTitulo: { fontSize: 12.5, fontWeight: 600, color: '#D8D6D1', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.02em' },
  vacio: { fontSize: 12, color: '#5A6068', padding: '10px 0' },
  toggleGroup: { display: 'flex', gap: 4 },
  toggleBtn: {
    background: 'transparent', border: '1px solid #3A4048', color: '#8B9199', borderRadius: 5,
    padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: "'Oswald', sans-serif",
  },
  toggleBtnActive: { background: 'rgba(91,122,153,0.15)', color: '#7B9AB8', borderColor: '#5B7A99' },
  listaWrap: { display: 'flex', flexDirection: 'column', gap: 9 },
  filaBarra: { display: 'flex', alignItems: 'center', gap: 10 },
  filaLabel: { fontSize: 11.5, color: '#9AA0A6', minWidth: 90, flexShrink: 0 },
  barraTrack: { flex: 1, height: 8, background: '#1A1D20', borderRadius: 4, overflow: 'hidden' },
  barraFill: { height: '100%', background: '#5B7A99', borderRadius: 4 },
  filaValor: { fontSize: 11.5, color: '#D8D6D1', fontFamily: "'IBM Plex Mono', monospace", minWidth: 80, textAlign: 'right' },
  tablaRanking: { display: 'flex', flexDirection: 'column' },
  filaRanking: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #2A2E32' },
  rankingPos: { fontSize: 10.5, color: '#5A6068', minWidth: 16 },
  rankingCodigo: { fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: '#E8E6E1', minWidth: 130 },
  rankingDesc: { fontSize: 11, color: '#8B9199', flex: 1 },
  rankingCount: { fontSize: 10.5, color: '#5A6068', minWidth: 50, textAlign: 'right' },
  rankingUsd: { fontSize: 11.5, color: '#4FA98C', fontFamily: "'IBM Plex Mono', monospace", minWidth: 80, textAlign: 'right' },
};
