import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { TIPOS_TUBO } from '../lib/constants';

const ESTADO_COLOR = {
  'Lleno':        { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  'Vacío':        { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  'En Reparación':{ bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  'Retirado':     { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
};

const UBIC_ICON = { 'Almacén':'🏭', 'Mantenimiento':'🔧', 'Infraestructura':'🏗', 'Proveedor':'🚚' };

export default function Dashboard() {
  const [tubos, setTubos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroUbic, setFiltroUbic] = useState('Todas');

  useEffect(() => { fetchTubos(); }, []);

  const fetchTubos = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getTubos();
      setTubos(data || []);
    } catch (err) {
      setError('Error al cargar tubos: ' + err.message);
    }
    setLoading(false);
  };

  const tubosActivos = tubos.filter(t => t.activo);
  const stats = {
    total: tubosActivos.length,
    llenos: tubosActivos.filter(t => t.estado === 'Lleno').length,
    vacios: tubosActivos.filter(t => t.estado === 'Vacío').length,
    reparacion: tubosActivos.filter(t => t.estado === 'En Reparación').length,
  };

  const tubosFiltrados = tubosActivos.filter(t => {
    if (filtroTipo !== 'Todos' && t.tipo !== filtroTipo) return false;
    if (filtroEstado !== 'Todos' && t.estado !== filtroEstado) return false;
    if (filtroUbic !== 'Todas' && t.ubicacion !== filtroUbic) return false;
    return true;
  });

  const porTipo = TIPOS_TUBO.map(tipo => ({
    tipo,
    total: tubosActivos.filter(t => t.tipo === tipo).length,
    llenos: tubosActivos.filter(t => t.tipo === tipo && t.estado === 'Lleno').length,
    vacios: tubosActivos.filter(t => t.tipo === tipo && t.estado === 'Vacío').length,
  })).filter(g => g.total > 0);

  return (
    <div>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Estado de Tubos</h2>
        <button style={s.refreshBtn} onClick={fetchTubos}>↻ Actualizar</button>
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      <div style={s.statsGrid}>
        <StatCard label="Total en Base" value={stats.total} color="#2563eb" />
        <StatCard label="Llenos" value={stats.llenos} color="#10b981" />
        <StatCard label="Vacíos" value={stats.vacios} color="#f59e0b" />
        <StatCard label="En Reparación" value={stats.reparacion} color="#ef4444" />
      </div>

      <div style={s.section}>
        <h3 style={s.sectionTitle}>Resumen por tipo de gas</h3>
        <div style={s.tipoGrid}>
          {porTipo.map(g => (
            <div key={g.tipo} style={s.tipoCard}>
              <div style={s.tipoLabel}>{g.tipo}</div>
              <div style={s.tipoTotal}>{g.total} tubos</div>
              <div style={s.tipoBar}>
                <div style={{ ...s.tipoBarFill, width: g.total > 0 ? `${(g.llenos/g.total)*100}%` : '0%' }} />
              </div>
              <div style={s.tipoDetail}>
                <span style={{ color: '#10b981' }}>● {g.llenos} llenos</span>
                <span style={{ color: '#f59e0b' }}>● {g.vacios} vacíos</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.section}>
        <div style={s.filtrosRow}>
          <select style={s.select} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="Todos">Todos los tipos</option>
            {TIPOS_TUBO.map(t => <option key={t}>{t}</option>)}
          </select>
          <select style={s.select} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="Todos">Todos los estados</option>
            {['Lleno','Vacío','En Reparación','Retirado'].map(e => <option key={e}>{e}</option>)}
          </select>
          <select style={s.select} value={filtroUbic} onChange={e => setFiltroUbic(e.target.value)}>
            <option value="Todas">Todas las ubicaciones</option>
            {['Almacén','Mantenimiento','Infraestructura','Proveedor'].map(u => <option key={u}>{u}</option>)}
          </select>
          <span style={s.resultCount}>{tubosFiltrados.length} resultados</span>
        </div>

        {loading ? (
          <div style={s.loadingMsg}>Cargando tubos...</div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Código','Tipo','Capacidad','Estado','Ubicación','Entrada'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tubosFiltrados.length === 0 ? (
                  <tr><td colSpan={6} style={s.emptyRow}>No hay tubos con esos filtros</td></tr>
                ) : tubosFiltrados.map(t => {
                  const ec = ESTADO_COLOR[t.estado] || ESTADO_COLOR['Retirado'];
                  return (
                    <tr key={t.id}>
                      <td style={s.td}><strong>{t.codigo}</strong></td>
                      <td style={s.td}>{t.tipo}</td>
                      <td style={s.td}>{t.capacidad} {t.unidad}</td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: ec.bg, color: ec.text }}>
                          <span style={{ color: ec.dot }}>●</span> {t.estado}
                        </span>
                      </td>
                      <td style={s.td}>{UBIC_ICON[t.ubicacion]} {t.ubicacion}</td>
                      <td style={s.td}>{t.fecha_entrada}</td>
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

function StatCard({ label, value, color }) {
  return (
    <div style={{ ...s.statCard, borderTop: `3px solid ${color}` }}>
      <div style={{ ...s.statValue, color }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  );
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' },
  refreshBtn: { padding: '7px 14px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#475569' },
  errorBanner: { background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#991b1b', marginBottom: 20 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 },
  statCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  statValue: { fontSize: 36, fontWeight: 800, lineHeight: 1 },
  statLabel: { fontSize: 13, color: '#64748b', marginTop: 6, fontWeight: 500 },
  section: { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  sectionTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' },
  tipoGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  tipoCard: { background: '#f8fafc', borderRadius: 8, padding: '14px 16px', border: '1px solid #e2e8f0' },
  tipoLabel: { fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  tipoTotal: { fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '4px 0 8px' },
  tipoBar: { height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
  tipoBarFill: { height: '100%', background: '#10b981', borderRadius: 99, transition: 'width 0.3s' },
  tipoDetail: { display: 'flex', gap: 10, fontSize: 12, fontWeight: 500 },
  filtrosRow: { display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' },
  select: { padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer' },
  resultCount: { fontSize: 13, color: '#64748b' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#475569', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '11px 14px', fontSize: 14, color: '#1e293b', borderBottom: '1px solid #f1f5f9' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 },
  loadingMsg: { textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: 14 },
  emptyRow: { textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: 14 },
};
