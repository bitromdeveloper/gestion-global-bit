import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { TIPOS_TUBO } from '../lib/constants';

const TIPO_COLOR = {
  'O2':    { accent:'#2563eb', light:'#eff6ff' },
  'Butano':{ accent:'#d97706', light:'#fffbeb' },
  'N2':    { accent:'#7c3aed', light:'#f5f3ff' },
  'Atal':  { accent:'#059669', light:'#ecfdf5' },
};

const mesActual = () => new Date().toISOString().slice(0, 7);

export default function DashboardMantenimiento() {
  const [tubos, setTubos]           = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [mes, setMes]               = useState(mesActual());

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

  // Tubos físicamente en Mantenimiento
  const enUso = tubos.filter(t => t.ubicacion === 'Mantenimiento');

  // Tubos disponibles para Mantenimiento en Almacén (pedido_por === 'Mantenimiento')
  const disponibles = tubos.filter(t =>
    t.ubicacion === 'Almacén' && t.estado === 'Lleno' && t.pedido_por === 'Mantenimiento'
  );

  // Movimientos del mes de Mantenimiento
  const delMes = movimientos.filter(m => m.fecha?.startsWith(mes));
  const salidasMes     = delMes.filter(m => m.tipo_operacion === 'Consumo'    && m.ubicacion_destino === 'Mantenimiento');
  const consumidosMes  = delMes.filter(m => m.tipo_operacion === 'Devolución' && m.ubicacion_origen  === 'Mantenimiento');

  // En uso = tubos que salieron ese mes y todavía están en Mantenimiento (no volvieron)
  const enUsoDelMes = salidasMes.filter(salida =>
    !movimientos.some(m =>
      m.tipo_operacion === 'Devolución' &&
      m.tubo_id === salida.tubo_id &&
      m.ubicacion_origen === 'Mantenimiento' &&
      m.fecha >= salida.fecha
    )
  );

  // Consumo por tipo en el mes (salidas)
  const consumoPorTipo = TIPOS_TUBO.map(tipo => ({
    tipo,
    cantidad: salidasMes.filter(m => m.tubo_tipo === tipo).length,
  })).filter(c => c.cantidad > 0);

  // Historial completo de Mantenimiento (últimos 50)
  const historialMto = movimientos.filter(m =>
    m.ubicacion_destino === 'Mantenimiento' || m.ubicacion_origen === 'Mantenimiento'
  ).slice(0, 50);

  if (loading) return <div style={s.loading}>Cargando...</div>;

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>🔧 Panel de Mantenimiento</h2>
          <p style={s.pageSub}>Seguimiento de tubos y consumos del sector</p>
        </div>
        <button style={s.refreshBtn} onClick={fetchData}>↻ Actualizar</button>
      </div>

      {/* Tubos en uso ahora */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Tubos en uso ahora</h3>
        {enUso.length === 0 ? (
          <p style={s.empty}>No hay tubos en Mantenimiento actualmente</p>
        ) : (
          <div style={s.tuboGrid}>
            {enUso.map(t => {
              const tc = TIPO_COLOR[t.tipo] || TIPO_COLOR['O2'];
              return (
                <div key={t.id} style={{ ...s.tuboCard, borderLeft:`4px solid ${tc.accent}`, background: tc.light }}>
                  <div style={{ ...s.tuboTipo, color: tc.accent }}>{t.tipo}</div>
                  <div style={s.tuboCodigo}>{t.codigo}</div>
                  <div style={s.tuboCapacidad}>{t.capacidad} {t.unidad}</div>
                  <div style={s.enUsoTag}>● En uso</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Disponibles en Almacén para Mantenimiento */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Disponibles en Almacén para vos</h3>
        {disponibles.length === 0 ? (
          <p style={s.empty}>No hay tubos cargados para Mantenimiento en Almacén</p>
        ) : (
          <div style={s.tuboGrid}>
            {disponibles.map(t => {
              const tc = TIPO_COLOR[t.tipo] || TIPO_COLOR['O2'];
              return (
                <div key={t.id} style={{ ...s.tuboCard, borderLeft:`4px solid ${tc.accent}` }}>
                  <div style={{ ...s.tuboTipo, color: tc.accent }}>{t.tipo}</div>
                  <div style={s.tuboCodigo}>{t.codigo}</div>
                  <div style={s.tuboCapacidad}>{t.capacidad} {t.unidad}</div>
                  <div style={s.llenoTag}>● Lleno — Almacén</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resumen del mes */}
      <div style={s.section}>
        <div style={s.sectionHeaderRow}>
          <h3 style={s.sectionTitle}>Consumo del mes</h3>
          <input style={s.monthInput} type="month" value={mes} onChange={e => setMes(e.target.value)} />
        </div>
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={s.statValue}>{enUso.length}</div>
            <div style={s.statLabel}>En uso</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{consumidosMes.length}</div>
            <div style={s.statLabel}>Consumidos este mes</div>
          </div>
        </div>

        {consumoPorTipo.length > 0 && (
          <div style={s.consumoTipos}>
            {consumoPorTipo.map(c => {
              const tc = TIPO_COLOR[c.tipo] || TIPO_COLOR['O2'];
              return (
                <div key={c.tipo} style={{ ...s.consumoChip, background: tc.light, borderColor: tc.accent }}>
                  <span style={{ color: tc.accent, fontWeight: 700 }}>{c.tipo}</span>
                  <span style={{ color: tc.accent }}>{c.cantidad} {c.cantidad === 1 ? 'tubo' : 'tubos'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial completo de Mantenimiento */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Historial de movimientos</h3>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead><tr>
              {['Fecha','Operación','Tubo','Tipo','Observaciones'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {historialMto.length === 0
                ? <tr><td colSpan={5} style={s.emptyRow}>Sin movimientos registrados</td></tr>
                : historialMto.map(m => (
                  <tr key={m.id}>
                    <td style={s.td}>{m.fecha}</td>
                    <td style={s.td}>
                      <span style={{
                        ...s.opBadge,
                        background: m.tipo_operacion === 'Consumo' ? '#dbeafe' : m.tipo_operacion === 'Consumido' ? '#fef3c7' : '#f1f5f9',
                        color: m.tipo_operacion === 'Consumo' ? '#1e40af' : m.tipo_operacion === 'Consumido' ? '#92400e' : '#475569',
                      }}>
                        {m.tipo_operacion === 'Consumo' ? '📤' : m.tipo_operacion === 'Consumido' ? '📥' : '📋'} {m.tipo_operacion}
                      </span>
                    </td>
                    <td style={s.td}><strong>{m.tubo_codigo}</strong></td>
                    <td style={s.td}>{m.tubo_tipo}</td>
                    <td style={{ ...s.td, color:'#64748b' }}>{m.observaciones || '—'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const s = {
  loading:         { textAlign:'center', color:'#94a3b8', padding:'60px 0' },
  pageHeader:      { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 },
  pageTitle:       { margin:'0 0 4px', fontSize:22, fontWeight:700, color:'#0f172a' },
  pageSub:         { margin:0, fontSize:13, color:'#64748b' },
  refreshBtn:      { padding:'7px 14px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, cursor:'pointer', color:'#475569' },
  section:         { background:'#fff', borderRadius:12, padding:24, marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  sectionTitle:    { margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#0f172a' },
  sectionHeaderRow:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  monthInput:      { padding:'6px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13 },
  tuboGrid:        { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 },
  tuboCard:        { background:'#f8fafc', borderRadius:10, padding:'14px 16px' },
  tuboTipo:        { fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 },
  tuboCodigo:      { fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:2 },
  tuboCapacidad:   { fontSize:12, color:'#64748b', marginBottom:8 },
  enUsoTag:        { fontSize:12, fontWeight:600, color:'#0369a1' },
  llenoTag:        { fontSize:12, fontWeight:600, color:'#10b981' },
  statsRow:        { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:16 },
  statCard:        { background:'#f8fafc', borderRadius:10, padding:'16px 20px', textAlign:'center' },
  statValue:       { fontSize:32, fontWeight:800, color:'#0f172a' },
  statLabel:       { fontSize:12, color:'#64748b', marginTop:4 },
  consumoTipos:    { display:'flex', gap:10, flexWrap:'wrap' },
  consumoChip:     { display:'flex', gap:10, alignItems:'center', padding:'8px 14px', borderRadius:8, border:'1.5px solid' },
  tableWrap:       { overflowX:'auto' },
  table:           { width:'100%', borderCollapse:'collapse' },
  th:              { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#475569', background:'#f8fafc', borderBottom:'2px solid #e2e8f0', textTransform:'uppercase', letterSpacing:'0.5px' },
  td:              { padding:'11px 14px', fontSize:14, color:'#1e293b', borderBottom:'1px solid #f1f5f9' },
  opBadge:         { display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:99, fontSize:12, fontWeight:600 },
  empty:           { color:'#94a3b8', fontSize:13, margin:0 },
  emptyRow:        { textAlign:'center', color:'#94a3b8', padding:'30px 0', fontSize:14 },
};
