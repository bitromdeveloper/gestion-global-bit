import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { TIPOS_TUBO } from '../lib/constants';

const mesActual = () => new Date().toISOString().slice(0, 7);

const OP_COLOR = {
  'Carga':      { bg:'#dbeafe', color:'#1e40af', icon:'🔄' },
  'Consumo':    { bg:'#d1fae5', color:'#065f46', icon:'📤' },
  'Devolución': { bg:'#fef3c7', color:'#92400e', icon:'📥' },
  'Alta':       { bg:'#ede9fe', color:'#5b21b6', icon:'➕' },
  'Baja':       { bg:'#fee2e2', color:'#991b1b', icon:'➖' },
};

export default function Historial() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [mes, setMes]                 = useState(mesActual());
  const [filtroOp, setFiltroOp]       = useState('Todos');
  const [filtroTipo, setFiltroTipo]   = useState('Todos');

  useEffect(() => { fetchMovimientos(); }, []);

  const fetchMovimientos = async () => {
    setLoading(true);
    try { setMovimientos(await db.getMovimientos()); } catch {}
    setLoading(false);
  };

  // Movimientos del mes seleccionado
  const delMes = movimientos.filter(m => m.fecha?.startsWith(mes));

  // Resumen del mes
  const cargas      = delMes.filter(m => m.tipo_operacion === 'Carga').length;
  const consumos    = delMes.filter(m => m.tipo_operacion === 'Consumo').length;
  const devoluciones= delMes.filter(m => m.tipo_operacion === 'Devolución').length;

  // Consumo por tipo (cargas del mes)
  const consumoPorTipo = TIPOS_TUBO.map(tipo => ({
    tipo,
    cargas: delMes.filter(m => m.tipo_operacion === 'Carga' && m.tubo_tipo === tipo).length,
    consumos: delMes.filter(m => m.tipo_operacion === 'Consumo' && m.tubo_tipo === tipo).length,
  })).filter(c => c.cargas + c.consumos > 0);

  // Filtros para la tabla
  const filtrados = delMes.filter(m => {
    if (filtroOp   !== 'Todos' && m.tipo_operacion !== filtroOp)   return false;
    if (filtroTipo !== 'Todos' && m.tubo_tipo      !== filtroTipo) return false;
    return true;
  });

  return (
    <div>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Historial y Consumo</h2>
        <div style={s.headerRight}>
          <input style={s.monthInput} type="month" value={mes} onChange={e => setMes(e.target.value)} />
          <button style={s.refreshBtn} onClick={fetchMovimientos}>↻</button>
        </div>
      </div>

      {/* Resumen del mes */}
      <div style={s.statsGrid}>
        <StatCard label="Cargas del mes"     value={cargas}       color="#2563eb" icon="🔄" />
        <StatCard label="Consumos" value={consumos}     color="#059669" icon="📤" />
        <StatCard label="Devoluciones"        value={devoluciones} color="#d97706" icon="📥" />
        <StatCard label="Total movimientos"   value={delMes.length} color="#7c3aed" icon="📊" />
      </div>

      {/* Consumo por tipo */}
      {consumoPorTipo.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Consumo por tipo de gas — {mes}</h3>
          <table style={s.table}>
            <thead><tr>
              {['Tipo','Cargas','Consumos'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {consumoPorTipo.map(c => (
                <tr key={c.tipo}>
                  <td style={{ ...s.td, fontWeight:700 }}>{c.tipo}</td>
                  <td style={s.td}>{c.cargas > 0 ? `🔄 ${c.cargas}` : '—'}</td>
                  <td style={s.td}>{c.consumos > 0 ? `📤 ${c.consumos}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla de movimientos */}
      <div style={s.section}>
        <div style={s.filtros}>
          <select style={s.select} value={filtroOp} onChange={e => setFiltroOp(e.target.value)}>
            <option value="Todos">Todas las operaciones</option>
            {['Carga','Consumo','Devolución','Alta','Baja'].map(o => <option key={o}>{o}</option>)}
          </select>
          <select style={s.select} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="Todos">Todos los tipos</option>
            {TIPOS_TUBO.map(t => <option key={t}>{t}</option>)}
          </select>
          <span style={s.count}>{filtrados.length} registros</span>
        </div>

        {loading ? <div style={s.loading}>Cargando...</div> : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>
                {['Fecha','Operación','Tubo','Tipo','Origen','Destino','Pedido por','Registró','Obs.'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtrados.length === 0
                  ? <tr><td colSpan={9} style={s.empty}>No hay movimientos para este mes</td></tr>
                  : filtrados.map(m => {
                    const oc = OP_COLOR[m.tipo_operacion] || OP_COLOR['Alta'];
                    return (
                      <tr key={m.id}>
                        <td style={s.td}>{m.fecha}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background:oc.bg, color:oc.color }}>
                            {oc.icon} {m.tipo_operacion}
                          </span>
                        </td>
                        <td style={s.td}><strong>{m.tubo_codigo}</strong></td>
                        <td style={s.td}>{m.tubo_tipo}</td>
                        <td style={s.td}>{m.ubicacion_origen || '—'}</td>
                        <td style={s.td}>{m.ubicacion_destino || '—'}</td>
                        <td style={s.td}>{m.pedido_por || '—'}</td>
                        <td style={s.td}><span style={s.user}>{m.usuario_registra}</span></td>
                        <td style={{ ...s.td, color:'#64748b', maxWidth:140 }}>{m.observaciones || '—'}</td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ ...s.statCard, borderTop:`3px solid ${color}` }}>
      <div style={s.statIcon}>{icon}</div>
      <div style={{ ...s.statValue, color }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  );
}

const s = {
  pageHeader:   { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  pageTitle:    { margin:0, fontSize:22, fontWeight:700, color:'#0f172a' },
  headerRight:  { display:'flex', gap:8, alignItems:'center' },
  monthInput:   { padding:'7px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13 },
  refreshBtn:   { padding:'7px 12px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, cursor:'pointer' },
  statsGrid:    { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 },
  statCard:     { background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  statIcon:     { fontSize:20, marginBottom:8 },
  statValue:    { fontSize:32, fontWeight:800, lineHeight:1 },
  statLabel:    { fontSize:13, color:'#64748b', marginTop:4, fontWeight:500 },
  section:      { background:'#fff', borderRadius:12, padding:24, marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  sectionTitle: { margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#0f172a' },
  filtros:      { display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' },
  select:       { padding:'7px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, color:'#374151', background:'#fff' },
  count:        { fontSize:13, color:'#64748b' },
  loading:      { textAlign:'center', color:'#94a3b8', padding:'40px 0' },
  tableWrap:    { overflowX:'auto' },
  table:        { width:'100%', borderCollapse:'collapse' },
  th:           { padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:700, color:'#475569', background:'#f8fafc', borderBottom:'2px solid #e2e8f0', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' },
  td:           { padding:'10px 12px', fontSize:13, color:'#1e293b', borderBottom:'1px solid #f1f5f9' },
  badge:        { display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:99, fontSize:12, fontWeight:600 },
  user:         { fontSize:12, color:'#475569', background:'#f1f5f9', padding:'2px 8px', borderRadius:4 },
  empty:        { textAlign:'center', color:'#94a3b8', padding:'40px 0', fontSize:14 },
};
