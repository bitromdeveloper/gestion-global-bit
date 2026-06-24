import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';

const mesActual = () => new Date().toISOString().slice(0, 7);

export default function DashboardInfraestructura() {
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

  // Tubos físicamente en Infraestructura ahora
  const enUso = tubos.filter(t => t.ubicacion === 'Infraestructura');

  // Tubos disponibles para Infraestructura en Almacén
  const disponibles = tubos.filter(t =>
    t.ubicacion === 'Almacén' && t.estado === 'Lleno' && t.pedido_por === 'Infraestructura'
  );

  // Consumidos este mes = los que volvieron vacíos a Almacén
  const delMes = movimientos.filter(m => m.fecha?.startsWith(mes));
  const consumidosMes = delMes.filter(m =>
    m.tipo_operacion === 'Devolución' && m.ubicacion_origen === 'Infraestructura'
  );

  // Historial completo de Infraestructura
  const historialInfra = movimientos.filter(m =>
    m.ubicacion_destino === 'Infraestructura' || m.ubicacion_origen === 'Infraestructura'
  ).slice(0, 30);

  if (loading) return <div style={s.loading}>Cargando...</div>;

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>🏗 Panel de Infraestructura</h2>
          <p style={s.pageSub}>Seguimiento de tubos del sector</p>
        </div>
        <button style={s.refreshBtn} onClick={fetchData}>↻ Actualizar</button>
      </div>

      {/* Tarjetas principales */}
      <div style={s.statsRow}>
        <div style={{ ...s.statCard, borderTop:'3px solid #0369a1' }}>
          <div style={{ ...s.statValue, color:'#0369a1' }}>{enUso.length}</div>
          <div style={s.statLabel}>En uso</div>
        </div>
        <div style={{ ...s.statCard, borderTop:'3px solid #10b981' }}>
          <div style={{ ...s.statValue, color:'#10b981' }}>{disponibles.length}</div>
          <div style={s.statLabel}>Disponibles en Almacén</div>
        </div>
        <div style={{ ...s.statCard, borderTop:'3px solid #7c3aed' }}>
          <div style={{ ...s.statValue, color:'#7c3aed' }}>{consumidosMes.length}</div>
          <div style={s.statLabel}>Consumidos este mes</div>
        </div>
      </div>

      {/* Tubos en uso */}
      {enUso.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>En uso ahora</h3>
          <div style={s.tuboGrid}>
            {enUso.map(t => (
              <div key={t.id} style={s.tuboCard}>
                <div style={s.tuboTipo}>{t.tipo}</div>
                <div style={s.tuboCodigo}>{t.codigo}</div>
                <div style={s.tuboCapacidad}>{t.capacidad} {t.unidad}</div>
                <div style={s.enUsoTag}>● En uso</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disponibles */}
      {disponibles.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Disponibles en Almacén para vos</h3>
          <div style={s.tuboGrid}>
            {disponibles.map(t => (
              <div key={t.id} style={{ ...s.tuboCard, borderColor:'#10b981' }}>
                <div style={s.tuboTipo}>{t.tipo}</div>
                <div style={s.tuboCodigo}>{t.codigo}</div>
                <div style={s.tuboCapacidad}>{t.capacidad} {t.unidad}</div>
                <div style={s.llenoTag}>● Listo en Almacén</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {enUso.length === 0 && disponibles.length === 0 && (
        <div style={s.section}>
          <p style={s.noTubos}>No hay tubos asignados a Infraestructura actualmente.</p>
          <p style={s.noTubosSub}>Cuando Almacén cargue un tubo con destino Infraestructura, aparecerá acá.</p>
        </div>
      )}

      {/* Consumidos del mes */}
      <div style={s.section}>
        <div style={s.sectionHeaderRow}>
          <h3 style={s.sectionTitle}>Consumidos del mes</h3>
          <input style={s.monthInput} type="month" value={mes} onChange={e => setMes(e.target.value)} />
        </div>
        {consumidosMes.length === 0 ? (
          <p style={s.empty}>Sin consumos registrados en {mes}</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>
                {['Fecha','Tubo','Tipo','Obs.'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {consumidosMes.map(m => (
                  <tr key={m.id}>
                    <td style={s.td}>{m.fecha}</td>
                    <td style={s.td}><strong>{m.tubo_codigo}</strong></td>
                    <td style={s.td}>{m.tubo_tipo}</td>
                    <td style={{ ...s.td, color:'#64748b' }}>{m.observaciones || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial completo */}
      {historialInfra.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Historial de movimientos</h3>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>
                {['Fecha','Operación','Tubo','Tipo','Obs.'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {historialInfra.map(m => (
                  <tr key={m.id}>
                    <td style={s.td}>{m.fecha}</td>
                    <td style={s.td}>
                      <span style={{
                        ...s.opBadge,
                        background: m.tipo_operacion === 'Consumo' ? '#dbeafe' : '#dcfce7',
                        color: m.tipo_operacion === 'Consumo' ? '#1e40af' : '#166534',
                      }}>
                        {m.tipo_operacion === 'Consumo' ? '📤 En uso' : '✅ Consumido'}
                      </span>
                    </td>
                    <td style={s.td}><strong>{m.tubo_codigo}</strong></td>
                    <td style={s.td}>{m.tubo_tipo}</td>
                    <td style={{ ...s.td, color:'#64748b' }}>{m.observaciones || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  loading:          { textAlign:'center', color:'#94a3b8', padding:'60px 0' },
  pageHeader:       { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 },
  pageTitle:        { margin:'0 0 4px', fontSize:22, fontWeight:700, color:'#0f172a' },
  pageSub:          { margin:0, fontSize:13, color:'#64748b' },
  refreshBtn:       { padding:'7px 14px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, cursor:'pointer', color:'#475569' },
  statsRow:         { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 },
  statCard:         { background:'#fff', borderRadius:12, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  statValue:        { fontSize:36, fontWeight:800, lineHeight:1 },
  statLabel:        { fontSize:13, color:'#64748b', marginTop:6, fontWeight:500 },
  section:          { background:'#fff', borderRadius:12, padding:24, marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  sectionTitle:     { margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#0f172a' },
  sectionHeaderRow: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  monthInput:       { padding:'6px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13 },
  tuboGrid:         { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 },
  tuboCard:         { background:'#f8fafc', borderRadius:10, padding:'14px 16px', border:'1.5px solid #e2e8f0' },
  tuboTipo:         { fontSize:12, fontWeight:700, color:'#dc2626', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 },
  tuboCodigo:       { fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:2 },
  tuboCapacidad:    { fontSize:12, color:'#64748b', marginBottom:8 },
  enUsoTag:         { fontSize:12, fontWeight:600, color:'#0369a1' },
  llenoTag:         { fontSize:12, fontWeight:600, color:'#10b981' },
  noTubos:          { margin:'0 0 8px', fontSize:15, color:'#475569', fontWeight:500 },
  noTubosSub:       { margin:0, fontSize:13, color:'#94a3b8' },
  empty:            { color:'#94a3b8', fontSize:13, margin:0 },
  tableWrap:        { overflowX:'auto' },
  table:            { width:'100%', borderCollapse:'collapse' },
  th:               { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#475569', background:'#f8fafc', borderBottom:'2px solid #e2e8f0', textTransform:'uppercase', letterSpacing:'0.5px' },
  td:               { padding:'11px 14px', fontSize:14, color:'#1e293b', borderBottom:'1px solid #f1f5f9' },
  opBadge:          { display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:99, fontSize:12, fontWeight:600 },
};
