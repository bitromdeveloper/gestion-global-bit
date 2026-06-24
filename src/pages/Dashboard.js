import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { TIPOS_TUBO, UBICACIONES } from '../lib/constants';

const UBIC_COLOR = {
  'Almacén':        { bg:'#dbeafe', text:'#1e40af', icon:'🏭' },
  'Mantenimiento':  { bg:'#fef3c7', text:'#92400e', icon:'🔧' },
  'Infraestructura':{ bg:'#d1fae5', text:'#065f46', icon:'🏗'  },
  'Sub Base':       { bg:'#ede9fe', text:'#5b21b6', icon:'📦' },
};

const TIPO_COLOR = {
  'O2':    { accent:'#2563eb', light:'#eff6ff' },
  'Butano':{ accent:'#d97706', light:'#fffbeb' },
  'N2':    { accent:'#7c3aed', light:'#f5f3ff' },
  'Atal':  { accent:'#059669', light:'#ecfdf5' },
};

// Devuelve la etiqueta visual según estado + ubicación
function etiquetaEstado(tubo) {
  if (tubo.estado === "Vacío")  return { label:"Vacío",  badge:"vacio"  };
  if (tubo.ubicacion === "Almacén") return { label:"Lleno",  badge:"lleno"  };
  return { label:"En uso", badge:"enuso" };
}

export default function Dashboard() {
  const [tubos, setTubos]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalTipo, setModalTipo] = useState(null); // tipo seleccionado para el popup
  const [filtroUbic, setFiltroUbic]     = useState('Todas');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  useEffect(() => { fetchTubos(); }, []);

  const fetchTubos = async () => {
    setLoading(true);
    try { setTubos(await db.getTubos()); } catch {}
    setLoading(false);
  };

  // ── Resumen por tipo (tarjetas superiores) ──
  const resumenTipo = TIPOS_TUBO.map(tipo => ({
    tipo,
    total:  tubos.filter(t => t.tipo === tipo).length,
    llenos: tubos.filter(t => t.tipo === tipo && t.estado === 'Lleno' && t.ubicacion === 'Almacén').length,
    enUso:  tubos.filter(t => t.tipo === tipo && t.estado === 'Lleno' && t.ubicacion !== 'Almacén').length,
    vacios: tubos.filter(t => t.tipo === tipo && t.estado === 'Vacío').length,
  }));

  // ── Desglose por sector (sección inferior) ──
  // Para Almacén: llenos = estado Lleno, vacíos = estado Vacío
  // Para otros sectores: todos son "en uso" (estado Lleno fuera de Almacén)
  const desgloseSector = UBICACIONES.map(ubic => ({
    ubic,
    total:  tubos.filter(t => t.ubicacion === ubic).length,
    enUso:  tubos.filter(t => t.ubicacion === ubic && t.estado === 'Lleno').length,
    vacios: tubos.filter(t => t.ubicacion === ubic && t.estado === 'Vacío').length,
    porTipo: TIPOS_TUBO.map(tipo => ({
      tipo,
      enUso:  tubos.filter(t => t.ubicacion === ubic && t.tipo === tipo && t.estado === 'Lleno').length,
      vacios: tubos.filter(t => t.ubicacion === ubic && t.tipo === tipo && t.estado === 'Vacío').length,
    })).filter(t => t.enUso + t.vacios > 0),
  })).filter(u => u.total > 0);

  // ── Tabla con filtros ──
  const filtrados = tubos.filter(t => {
    if (filtroUbic   !== 'Todas' && t.ubicacion !== filtroUbic)   return false;
    if (filtroEstado !== 'Todos' && t.estado    !== filtroEstado) return false;
    return true;
  });

  // Tubos del tipo seleccionado para el modal
  const tubosDelModal = modalTipo
    ? tubos.filter(t => t.tipo === modalTipo)
    : [];

  return (
    <div>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Estado de Tubos</h2>
        <button style={s.refreshBtn} onClick={fetchTubos}>↻ Actualizar</button>
      </div>

      {/* ── Tarjetas por tipo de gas (clickeables) ── */}
      <div style={s.tipoGrid}>
        {resumenTipo.map(({ tipo, total, llenos, enUso, vacios }) => {
          const tc = TIPO_COLOR[tipo] || TIPO_COLOR['O2'];
          const pct = total > 0 ? (llenos / total) * 100 : 0;
          return (
            <button key={tipo} style={{ ...s.tipoCard, borderTop:`3px solid ${tc.accent}`, background: tc.light }}
              onClick={() => setModalTipo(tipo)}>
              <div style={s.tipoCardHeader}>
                <span style={{ ...s.tipoCardNombre, color: tc.accent }}>{tipo}</span>
                <span style={s.tipoCardHint}>Ver detalle →</span>
              </div>
              <div style={s.tipoCardTotal}>{total} tubos</div>
              <div style={s.tipoCardBar}>
                <div style={{ ...s.tipoCardBarFill, width:`${pct}%`, background: tc.accent }} />
              </div>
              <div style={s.tipoCardStats}>
                <span style={s.lleno}>● {llenos} llenos</span>
                {enUso > 0 && <span style={s.enUso}>● {enUso} en uso</span>}
                <span style={s.vacio}>● {vacios} vacíos</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Desglose por sector ── */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Distribución por sector</h3>
        <div style={s.sectorGrid}>
          {desgloseSector.map(({ ubic, enUso, vacios, porTipo }) => {
            const uc = UBIC_COLOR[ubic];
            return (
              <div key={ubic} style={{ ...s.sectorCard, borderLeft:`4px solid ${uc.text}` }}>
                <div style={s.sectorHeader}>
                  <span style={s.sectorIcon}>{uc.icon}</span>
                  <span style={{ ...s.sectorNombre, color: uc.text }}>{ubic}</span>
                  <span style={s.sectorTotal}>{enUso + vacios} tubos</span>
                </div>
                <div style={s.sectorStats}>
                  {ubic === 'Almacén'
                    ? <span style={s.lleno}>● {enUso} llenos</span>
                    : <span style={s.enUso}>● {enUso} en uso</span>
                  }
                  {vacios > 0 && <span style={s.vacio}>● {vacios} vacíos</span>}
                </div>
                {porTipo.length > 0 && (
                  <div style={s.sectorTipos}>
                    {porTipo.map(t => (
                      <span key={t.tipo} style={{ ...s.tipoTag, background: TIPO_COLOR[t.tipo]?.light, color: TIPO_COLOR[t.tipo]?.accent }}>
                        {t.tipo}: {t.enUso}{ubic === 'Almacén' ? 'L' : ' en uso'}{t.vacios > 0 ? ` / ${t.vacios}V` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tabla detallada con filtros ── */}
      <div style={s.section}>
        <div style={s.filtrosRow}>
          <select style={s.select} value={filtroUbic} onChange={e => setFiltroUbic(e.target.value)}>
            <option value="Todas">Todas las ubicaciones</option>
            {UBICACIONES.map(u => <option key={u}>{u}</option>)}
          </select>
          <select style={s.select} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="Todos">Todos los estados</option>
            <option value="Lleno">Llenos</option>
            <option value="Vacío">Vacíos</option>
          </select>
          <span style={s.count}>{filtrados.length} tubos</span>
        </div>

        {loading ? <div style={s.loading}>Cargando...</div> : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>
                {['Código','Tipo','Capacidad','Estado','Ubicación','Pedido por','Ingreso'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtrados.length === 0
                  ? <tr><td colSpan={7} style={s.empty}>No hay tubos con esos filtros</td></tr>
                  : filtrados.map(t => (
                    <tr key={t.id}>
                      <td style={s.td}><strong>{t.codigo}</strong></td>
                      <td style={s.td}>
                        <span style={{ ...s.tipoChip, background: TIPO_COLOR[t.tipo]?.light, color: TIPO_COLOR[t.tipo]?.accent }}>
                          {t.tipo}
                        </span>
                      </td>
                      <td style={s.td}>{t.capacidad} {t.unidad}</td>
                      <td style={s.td}>
                        {(() => { const e = etiquetaEstado(t); return (
                          <span style={e.badge === 'lleno' ? s.badgeLleno : e.badge === 'enuso' ? s.badgeEnuso : s.badgeVacio}>
                            {e.badge === 'lleno' ? '● Lleno' : e.badge === 'enuso' ? '● En uso' : '● Vacío'}
                          </span>
                        ); })()}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badgeUbic, background: UBIC_COLOR[t.ubicacion]?.bg, color: UBIC_COLOR[t.ubicacion]?.text }}>
                          {UBIC_COLOR[t.ubicacion]?.icon} {t.ubicacion}
                        </span>
                      </td>
                      <td style={s.td}>{t.pedido_por || '—'}</td>
                      <td style={s.td}>{t.fecha_entrada}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de detalle por tipo ── */}
      {modalTipo && (
        <>
          <div style={s.overlay} onClick={() => setModalTipo(null)} />
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={{ ...s.modalTitulo, color: TIPO_COLOR[modalTipo]?.accent }}>
                  {modalTipo}
                </h3>
                <p style={s.modalSub}>{tubosDelModal.length} tubos en total</p>
              </div>
              <button style={s.modalClose} onClick={() => setModalTipo(null)}>✕</button>
            </div>

            {/* Mini resumen por sector dentro del modal */}
            <div style={s.modalSectores}>
              {UBICACIONES.map(ubic => {
                const ll = tubosDelModal.filter(t => t.ubicacion === ubic && t.estado === 'Lleno').length;
                const va = tubosDelModal.filter(t => t.ubicacion === ubic && t.estado === 'Vacío').length;
                if (ll + va === 0) return null;
                const uc = UBIC_COLOR[ubic];
                return (
                  <div key={ubic} style={{ ...s.modalSectorChip, background: uc.bg, borderColor: uc.text }}>
                    <span style={s.modalSectorIcon}>{uc.icon}</span>
                    <div>
                      <div style={{ ...s.modalSectorNombre, color: uc.text }}>{ubic}</div>
                      <div style={s.modalSectorStats}>
                        <span style={s.lleno}>{ll}L</span>
                        <span style={{ color:'#94a3b8' }}> / </span>
                        <span style={s.vacio}>{va}V</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabla de tubos del tipo */}
            <div style={s.modalTableWrap}>
              <table style={s.table}>
                <thead><tr>
                  {['Código','Estado','Ubicación','Pedido por'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {tubosDelModal.map(t => (
                    <tr key={t.id}>
                      <td style={s.td}><strong>{t.codigo}</strong></td>
                      <td style={s.td}>
                        {(() => { const e = etiquetaEstado(t); return (
                          <span style={e.badge === 'lleno' ? s.badgeLleno : e.badge === 'enuso' ? s.badgeEnuso : s.badgeVacio}>
                            {e.badge === 'lleno' ? '● Lleno' : e.badge === 'enuso' ? '● En uso' : '● Vacío'}
                          </span>
                        ); })()}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badgeUbic, background: UBIC_COLOR[t.ubicacion]?.bg, color: UBIC_COLOR[t.ubicacion]?.text }}>
                          {UBIC_COLOR[t.ubicacion]?.icon} {t.ubicacion}
                        </span>
                      </td>
                      <td style={s.td}>{t.pedido_por || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  pageHeader:      { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  pageTitle:       { margin:0, fontSize:22, fontWeight:700, color:'#0f172a' },
  refreshBtn:      { padding:'7px 14px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, cursor:'pointer', color:'#475569' },

  // Tarjetas por tipo
  tipoGrid:        { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 },
  tipoCard:        { borderRadius:12, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', cursor:'pointer', border:'none', textAlign:'left', transition:'transform 0.15s, box-shadow 0.15s' },
  tipoCardHeader:  { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  tipoCardNombre:  { fontSize:18, fontWeight:800 },
  tipoCardHint:    { fontSize:11, color:'#94a3b8' },
  tipoCardTotal:   { fontSize:28, fontWeight:800, color:'#0f172a', marginBottom:8 },
  tipoCardBar:     { height:6, background:'rgba(0,0,0,0.08)', borderRadius:99, overflow:'hidden', marginBottom:8 },
  tipoCardBarFill: { height:'100%', borderRadius:99, transition:'width 0.4s' },
  tipoCardStats:   { display:'flex', gap:12, fontSize:13, fontWeight:600 },

  // Desglose por sector
  section:         { background:'#fff', borderRadius:12, padding:24, marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  sectionTitle:    { margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#0f172a' },
  sectorGrid:      { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 },
  sectorCard:      { background:'#f8fafc', borderRadius:10, padding:'14px 16px' },
  sectorHeader:    { display:'flex', alignItems:'center', gap:8, marginBottom:6 },
  sectorIcon:      { fontSize:16 },
  sectorNombre:    { fontSize:13, fontWeight:700, flex:1 },
  sectorTotal:     { fontSize:12, color:'#64748b', fontWeight:500 },
  sectorStats:     { display:'flex', gap:12, fontSize:13, fontWeight:600, marginBottom:8 },
  sectorTipos:     { display:'flex', gap:6, flexWrap:'wrap' },
  tipoTag:         { padding:'3px 8px', borderRadius:6, fontSize:12, fontWeight:600 },

  // Tabla
  filtrosRow:      { display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' },
  select:          { padding:'7px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, color:'#374151', background:'#fff' },
  count:           { fontSize:13, color:'#64748b' },
  tableWrap:       { overflowX:'auto' },
  table:           { width:'100%', borderCollapse:'collapse' },
  th:              { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#475569', background:'#f8fafc', borderBottom:'2px solid #e2e8f0', textTransform:'uppercase', letterSpacing:'0.5px' },
  td:              { padding:'11px 14px', fontSize:14, color:'#1e293b', borderBottom:'1px solid #f1f5f9' },
  tipoChip:        { display:'inline-block', padding:'2px 8px', borderRadius:6, fontSize:12, fontWeight:700 },
  badgeLleno:      { display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:99, fontSize:12, fontWeight:600, background:'#d1fae5', color:'#065f46' },
  badgeEnuso:      { display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:99, fontSize:12, fontWeight:600, background:'#e0f2fe', color:'#0369a1' },
  badgeVacio:      { display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:99, fontSize:12, fontWeight:600, background:'#fef3c7', color:'#92400e' },
  badgeUbic:       { display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:6, fontSize:12, fontWeight:600 },
  loading:         { textAlign:'center', color:'#94a3b8', padding:'40px 0' },
  empty:           { textAlign:'center', color:'#94a3b8', padding:'40px 0', fontSize:14 },
  lleno:           { color:'#10b981', fontWeight:600 },
  enUso:           { color:'#0369a1', fontWeight:600 },
  enUso:           { color:'#0369a1', fontWeight:600 },
  vacio:           { color:'#f59e0b', fontWeight:600 },

  // Modal
  overlay:         { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:999 },
  modal:           { position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#fff', borderRadius:16, padding:'28px 32px', width:'100%', maxWidth:560, zIndex:1000, boxShadow:'0 25px 60px rgba(0,0,0,0.25)', maxHeight:'80vh', overflowY:'auto' },
  modalHeader:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  modalTitulo:     { margin:0, fontSize:22, fontWeight:800 },
  modalSub:        { margin:'4px 0 0', fontSize:13, color:'#64748b' },
  modalClose:      { background:'#f1f5f9', border:'none', borderRadius:8, width:32, height:32, fontSize:14, cursor:'pointer', color:'#475569' },
  modalSectores:   { display:'flex', gap:10, flexWrap:'wrap', marginBottom:20 },
  modalSectorChip: { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:'1.5px solid' },
  modalSectorIcon: { fontSize:18 },
  modalSectorNombre:{ fontSize:13, fontWeight:700 },
  modalSectorStats:{ fontSize:13, fontWeight:600, marginTop:2 },
  modalTableWrap:  { overflowX:'auto' },
};
