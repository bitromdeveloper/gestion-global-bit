// ============================================================
// MOVIMIENTOS
// ============================================================
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function Movimientos() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroOp, setFiltroOp] = useState('Todos');
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroMes, setFiltroMes] = useState('');

  useEffect(() => { fetchMovimientos(); }, []);

  const fetchMovimientos = async () => {
    setLoading(true);
    try { setMovimientos(await api.getMovimientos() || []); } catch {}
    setLoading(false);
  };

  const filtrados = movimientos.filter(m => {
    if (filtroOp !== 'Todos' && m.tipo_operacion !== filtroOp) return false;
    if (filtroCodigo && !m.tubo_codigo?.toLowerCase().includes(filtroCodigo.toLowerCase())) return false;
    if (filtroMes && !m.fecha?.startsWith(filtroMes)) return false;
    return true;
  });

  const OP_COLOR = {
    'Entrega':    { bg: '#d1fae5', color: '#065f46' },
    'Cambio':     { bg: '#dbeafe', color: '#1e40af' },
    'Retorno':    { bg: '#fef3c7', color: '#92400e' },
    'Devolución': { bg: '#f1f5f9', color: '#475569' },
  };

  return (
    <div>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Historial de Movimientos</h2>
        <button style={s.refreshBtn} onClick={fetchMovimientos}>↻ Actualizar</button>
      </div>
      <div style={s.card}>
        <div style={s.filtros}>
          <input style={s.input} placeholder="Buscar tubo (ej: T001)" value={filtroCodigo} onChange={e => setFiltroCodigo(e.target.value)} />
          <select style={s.select} value={filtroOp} onChange={e => setFiltroOp(e.target.value)}>
            <option value="Todos">Todas las operaciones</option>
            {['Entrega','Cambio','Retorno','Devolución'].map(o => <option key={o}>{o}</option>)}
          </select>
          <input style={s.input} type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} />
          <span style={s.count}>{filtrados.length} registros</span>
        </div>
        {loading ? <div style={s.loading}>Cargando historial...</div> : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>
                {['Fecha','Operación','Tubo','Est. anterior','Est. nuevo','Origen → Destino','Registró','Observaciones'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={8} style={s.empty}>No hay movimientos con esos filtros</td></tr>
                ) : filtrados.map(m => {
                  const oc = OP_COLOR[m.tipo_operacion] || OP_COLOR['Devolución'];
                  return (
                    <tr key={m.id}>
                      <td style={s.td}>{m.fecha}</td>
                      <td style={s.td}><span style={{ ...s.badge, background: oc.bg, color: oc.color }}>{m.tipo_operacion}</span></td>
                      <td style={s.td}><strong>{m.tubo_codigo}</strong></td>
                      <td style={s.td}>{m.estado_anterior || '-'}</td>
                      <td style={s.td}>{m.estado_nuevo || '-'}</td>
                      <td style={s.td}>{m.sector_origen && m.sector_destino ? `${m.sector_origen} → ${m.sector_destino}` : (m.sector_origen || m.sector_destino || '-')}</td>
                      <td style={s.td}><span style={s.user}>{m.usuario_registra}</span></td>
                      <td style={{ ...s.td, color: '#64748b', maxWidth: 160 }}>{m.observaciones || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' },
  refreshBtn: { padding: '7px 14px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#475569' },
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  filtros: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#374151' },
  select: { padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff' },
  count: { fontSize: 13, color: '#64748b' },
  loading: { textAlign: 'center', color: '#94a3b8', padding: '40px 0' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  td: { padding: '10px 12px', fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f1f5f9' },
  badge: { display: 'inline-block', padding: '2px 9px', borderRadius: 99, fontSize: 12, fontWeight: 600 },
  user: { fontSize: 12, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 },
  empty: { textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: 14 },
};
