import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { TIPOS_TUBO } from '../lib/constants';

const mesActual = () => new Date().toISOString().slice(0, 7);

export default function CiclosMensuales() {
  const [tubos, setTubos]             = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [mes, setMes]                 = useState(mesActual());

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [t, m] = await Promise.all([db.getTubos(), db.getMovimientos()]);
      setTubos(t || []);
      setMovimientos(m || []);
    } catch {}
    setLoading(false);
  };

  // ── COSTOS FIJOS: alquiler de todos los tubos activos ──
  // Cada tubo activo paga alquiler mensual independientemente de si se usó
  const costosFijos = tubos.map(t => ({
    ...t,
    costoAlquiler: parseFloat(t.alquiler_mensual) || 0,
  }));

  const totalAlquiler = costosFijos.reduce((sum, t) => sum + t.costoAlquiler, 0);

  // Resumen de alquiler por tipo
  const alquilerPorTipo = TIPOS_TUBO.map(tipo => {
    const tubosDelTipo = costosFijos.filter(t => t.tipo === tipo);
    return {
      tipo,
      cantidad: tubosDelTipo.length,
      precioUnitario: tubosDelTipo[0]?.costoAlquiler || 0,
      subtotal: tubosDelTipo.reduce((sum, t) => sum + t.costoAlquiler, 0),
    };
  }).filter(g => g.cantidad > 0);

  // ── COSTOS VARIABLES: recargas del mes ──
  // Cada Carga registrada = costo de gas + transporte
  const cargasDelMes = movimientos.filter(m =>
    m.tipo_operacion === 'Carga' && m.fecha?.startsWith(mes)
  );

  const recargasDetalle = cargasDelMes.map(mov => {
    const tubo = tubos.find(t => t.id === mov.tubo_id);
    const capacidad       = parseFloat(tubo?.capacidad) || 0;
    const precioUnitario  = parseFloat(tubo?.precio_unitario) || 0;
    const precioTransporte= parseFloat(tubo?.precio_transporte) || 0;
    const costoGas        = capacidad * precioUnitario;
    const costoTotal      = costoGas + precioTransporte;
    return {
      fecha:           mov.fecha,
      codigo:          mov.tubo_codigo,
      tipo:            mov.tubo_tipo,
      capacidad,
      unidad:          tubo?.unidad || '',
      precioUnitario,
      precioTransporte,
      costoGas,
      costoTotal,
    };
  });

  const totalGas        = recargasDetalle.reduce((sum, r) => sum + r.costoGas, 0);
  const totalTransporte = recargasDetalle.reduce((sum, r) => sum + r.precioTransporte, 0);
  const totalVariables  = totalGas + totalTransporte;
  const totalMes        = totalAlquiler + totalVariables;

  // Resumen de recargas por tipo
  const recargasPorTipo = TIPOS_TUBO.map(tipo => ({
    tipo,
    cantidad:   recargasDetalle.filter(r => r.tipo === tipo).length,
    costoGas:   recargasDetalle.filter(r => r.tipo === tipo).reduce((s, r) => s + r.costoGas, 0),
    transporte: recargasDetalle.filter(r => r.tipo === tipo).reduce((s, r) => s + r.precioTransporte, 0),
  })).filter(g => g.cantidad > 0);

  if (loading) return <div style={s.loading}>Cargando...</div>;

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Costos del mes</h2>
          <p style={s.pageSub}>Costos fijos de alquiler + costos variables por recarga</p>
        </div>
        <div style={s.headerRight}>
          <input style={s.monthInput} type="month" value={mes} onChange={e => setMes(e.target.value)} />
          <button style={s.refreshBtn} onClick={fetchData}>↻</button>
        </div>
      </div>

      {/* Resumen total del mes */}
      <div style={s.totalCard}>
        <div style={s.totalItem}>
          <div style={s.totalValue}>${totalAlquiler.toFixed(2)}</div>
          <div style={s.totalLabel}>Alquiler mensual</div>
          <div style={s.totalSub}>{tubos.length} tubos en stock</div>
        </div>
        <div style={s.totalSep}>+</div>
        <div style={s.totalItem}>
          <div style={s.totalValue}>${totalVariables.toFixed(2)}</div>
          <div style={s.totalLabel}>Costos de recarga</div>
          <div style={s.totalSub}>{recargasDetalle.length} recargas en {mes}</div>
        </div>
        <div style={s.totalSep}>=</div>
        <div style={{ ...s.totalItem, background:'#1e3a5f', borderRadius:12 }}>
          <div style={{ ...s.totalValue, color:'#60a5fa', fontSize:32 }}>${totalMes.toFixed(2)}</div>
          <div style={{ ...s.totalLabel, color:'#94a3b8' }}>Total del mes</div>
        </div>
      </div>

      {/* ── COSTOS FIJOS ── */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div>
            <h3 style={s.sectionTitle}>Costos fijos — Alquiler mensual</h3>
            <p style={s.sectionSub}>Todos los tubos activos pagan alquiler mes a mes independientemente del uso</p>
          </div>
          <div style={s.sectionTotal}>${totalAlquiler.toFixed(2)}</div>
        </div>

        {/* Resumen por tipo */}
        <div style={s.tipoGrid}>
          {alquilerPorTipo.map(g => (
            <div key={g.tipo} style={s.tipoCard}>
              <div style={s.tipoNombre}>{g.tipo}</div>
              <div style={s.tipoDetalle}>{g.cantidad} tubos × ${g.precioUnitario.toFixed(2)}</div>
              <div style={s.tipoSubtotal}>${g.subtotal.toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Tabla de tubos */}
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead><tr>
              {['Código','Tipo','Capacidad','Ubicación','Alquiler/mes'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {costosFijos.map(t => (
                <tr key={t.id}>
                  <td style={s.td}><strong>{t.codigo}</strong></td>
                  <td style={s.td}>{t.tipo}</td>
                  <td style={s.td}>{t.capacidad} {t.unidad}</td>
                  <td style={s.td}>{t.ubicacion}</td>
                  <td style={{ ...s.td, fontWeight:600, color:'#0f172a' }}>${t.costoAlquiler.toFixed(2)}</td>
                </tr>
              ))}
              <tr style={s.totalRow}>
                <td style={s.tdTotal} colSpan={4}>TOTAL ALQUILER</td>
                <td style={s.tdTotal}>${totalAlquiler.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── COSTOS VARIABLES ── */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div>
            <h3 style={s.sectionTitle}>Costos variables — Recargas de {mes}</h3>
            <p style={s.sectionSub}>Gas (capacidad × precio/unidad) + transporte por cada recarga</p>
          </div>
          <div style={s.sectionTotal}>${totalVariables.toFixed(2)}</div>
        </div>

        {recargasDetalle.length === 0 ? (
          <p style={s.empty}>No hubo recargas registradas en {mes}</p>
        ) : (
          <>
            {/* Resumen por tipo */}
            {recargasPorTipo.length > 0 && (
              <div style={s.tipoGrid}>
                {recargasPorTipo.map(g => (
                  <div key={g.tipo} style={s.tipoCard}>
                    <div style={s.tipoNombre}>{g.tipo}</div>
                    <div style={s.tipoDetalle}>{g.cantidad} recarga{g.cantidad > 1 ? 's' : ''}</div>
                    <div style={s.tipoDetalle}>Gas: ${g.costoGas.toFixed(2)} + Transporte: ${g.transporte.toFixed(2)}</div>
                    <div style={s.tipoSubtotal}>${(g.costoGas + g.transporte).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tabla de recargas */}
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead><tr>
                  {['Fecha','Tubo','Tipo','Capacidad','Precio/unidad','Costo gas','Transporte','Total'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {recargasDetalle.map((r, i) => (
                    <tr key={i}>
                      <td style={s.td}>{r.fecha}</td>
                      <td style={s.td}><strong>{r.codigo}</strong></td>
                      <td style={s.td}>{r.tipo}</td>
                      <td style={s.td}>{r.capacidad} {r.unidad}</td>
                      <td style={s.td}>${r.precioUnitario.toFixed(2)}/{r.unidad}</td>
                      <td style={s.td}>${r.costoGas.toFixed(2)}</td>
                      <td style={s.td}>${r.precioTransporte.toFixed(2)}</td>
                      <td style={{ ...s.td, fontWeight:600, color:'#0f172a' }}>${r.costoTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={s.totalRow}>
                    <td style={s.tdTotal} colSpan={5}>TOTAL RECARGAS</td>
                    <td style={s.tdTotal}>${totalGas.toFixed(2)}</td>
                    <td style={s.tdTotal}>${totalTransporte.toFixed(2)}</td>
                    <td style={s.tdTotal}>${totalVariables.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── RESUMEN FINAL ── */}
      <div style={s.resumenFinal}>
        <h3 style={s.resumenTitulo}>Resumen de facturación — {mes}</h3>
        <div style={s.resumenGrid}>
          <div style={s.resumenItem}>
            <span style={s.resumenLabel}>Alquiler mensual ({tubos.length} tubos)</span>
            <span style={s.resumenValor}>${totalAlquiler.toFixed(2)}</span>
          </div>
          <div style={s.resumenItem}>
            <span style={s.resumenLabel}>Gas ({recargasDetalle.length} recargas)</span>
            <span style={s.resumenValor}>${totalGas.toFixed(2)}</span>
          </div>
          <div style={s.resumenItem}>
            <span style={s.resumenLabel}>Transporte ({recargasDetalle.length} viajes)</span>
            <span style={s.resumenValor}>${totalTransporte.toFixed(2)}</span>
          </div>
          <div style={{ ...s.resumenItem, borderTop:'2px solid #e2e8f0', paddingTop:12, marginTop:4 }}>
            <span style={{ ...s.resumenLabel, fontWeight:700, color:'#0f172a', fontSize:15 }}>TOTAL A PAGAR</span>
            <span style={{ ...s.resumenValor, fontSize:20, color:'#2563eb' }}>${totalMes.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  loading:       { textAlign:'center', color:'#94a3b8', padding:'60px 0' },
  pageHeader:    { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 },
  pageTitle:     { margin:'0 0 4px', fontSize:22, fontWeight:700, color:'#0f172a' },
  pageSub:       { margin:0, fontSize:13, color:'#64748b' },
  headerRight:   { display:'flex', gap:8, alignItems:'center' },
  monthInput:    { padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13 },
  refreshBtn:    { padding:'8px 12px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, cursor:'pointer' },

  totalCard:     { background:'#0f172a', borderRadius:16, padding:'28px 32px', marginBottom:24, display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' },
  totalItem:     { flex:1, padding:'16px 20px', minWidth:160 },
  totalValue:    { fontSize:28, fontWeight:800, color:'#f1f5f9', marginBottom:4 },
  totalLabel:    { fontSize:13, color:'#94a3b8', fontWeight:500 },
  totalSub:      { fontSize:12, color:'#475569', marginTop:4 },
  totalSep:      { fontSize:28, color:'#334155', fontWeight:300 },

  section:       { background:'#fff', borderRadius:12, padding:24, marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  sectionHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  sectionTitle:  { margin:'0 0 4px', fontSize:15, fontWeight:700, color:'#0f172a' },
  sectionSub:    { margin:0, fontSize:12, color:'#64748b' },
  sectionTotal:  { fontSize:22, fontWeight:800, color:'#2563eb' },

  tipoGrid:      { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 },
  tipoCard:      { background:'#f8fafc', borderRadius:8, padding:'12px 16px', border:'1px solid #e2e8f0' },
  tipoNombre:    { fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:4 },
  tipoDetalle:   { fontSize:12, color:'#64748b', marginBottom:2 },
  tipoSubtotal:  { fontSize:16, fontWeight:700, color:'#2563eb', marginTop:6 },

  tableWrap:     { overflowX:'auto' },
  table:         { width:'100%', borderCollapse:'collapse' },
  th:            { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#475569', background:'#f8fafc', borderBottom:'2px solid #e2e8f0', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' },
  td:            { padding:'11px 14px', fontSize:14, color:'#1e293b', borderBottom:'1px solid #f1f5f9' },
  totalRow:      { background:'#f8fafc' },
  tdTotal:       { padding:'11px 14px', fontSize:13, fontWeight:700, color:'#0f172a', borderTop:'2px solid #e2e8f0' },

  resumenFinal:  { background:'#fff', borderRadius:12, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', marginBottom:20 },
  resumenTitulo: { margin:'0 0 20px', fontSize:15, fontWeight:700, color:'#0f172a' },
  resumenGrid:   { display:'flex', flexDirection:'column', gap:10, maxWidth:480 },
  resumenItem:   { display:'flex', justifyContent:'space-between', alignItems:'center' },
  resumenLabel:  { fontSize:14, color:'#475569' },
  resumenValor:  { fontSize:16, fontWeight:700, color:'#0f172a' },
  empty:         { color:'#94a3b8', fontSize:13, margin:'8px 0 0' },
};
