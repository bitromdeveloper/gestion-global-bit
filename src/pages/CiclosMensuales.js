// CiclosMensuales.js
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

const mesActual = () => new Date().toISOString().slice(0, 7);

export default function CiclosMensuales() {
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesFiltro, setMesFiltro] = useState(mesActual());
  const [editando, setEditando] = useState(null);
  const [msg, setMsg] = useState({ type:'', text:'' });

  useEffect(() => { fetchCiclos(); }, [mesFiltro]);

  const fetchCiclos = async () => {
    setLoading(true);
    try { setCiclos(await api.getCiclos(mesFiltro) || []); } catch {}
    setLoading(false);
  };

  const iniciarMes = async () => {
    setMsg({ type:'', text:'' });
    try {
      await api.iniciarCiclo(mesFiltro);
      fetchCiclos();
      setMsg({ type:'success', text: `Ciclo ${mesFiltro} iniciado desde el inventario actual` });
    } catch (err) {
      setMsg({ type:'error', text: err.message });
    }
  };

  const handleEdit = async (ciclo, field, value) => {
    try {
      const updated = await api.actualizarCiclo({ id: ciclo.id, [field]: parseFloat(value) || 0 });
      setCiclos(prev => prev.map(c => c.id === ciclo.id ? { ...c, [field]: parseFloat(value) || 0 } : c));
    } catch {}
    setEditando(null);
  };

  const costoTotal = ciclos.reduce((sum, c) => {
    const ct = (parseFloat(c.precio_alquiler_mensual) * parseInt(c.cantidad_stock)) +
      (parseInt(c.cambios_realizados) * parseFloat(c.precio_transporte_tubo));
    return sum + ct;
  }, 0);

  return (
    <div>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Ciclos y Costos Mensuales</h2>
        <div style={s.headerActions}>
          <input style={s.monthInput} type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} />
          <button style={s.iniciarBtn} onClick={iniciarMes}>+ Iniciar ciclo</button>
        </div>
      </div>

      {msg.text && <div style={msg.type === 'error' ? s.errorMsg : s.successMsg}>{msg.text}</div>}

      {ciclos.length > 0 && (
        <div style={s.resumenCard}>
          <div style={s.resumenTitle}>Resumen {mesFiltro}</div>
          <div style={s.resumenGrid}>
            <div style={s.resumenItem}>
              <div style={s.resumenValue}>{ciclos.reduce((s, c) => s + (c.cantidad_stock||0), 0)}</div>
              <div style={s.resumenLabel}>Tubos en stock</div>
            </div>
            <div style={s.resumenItem}>
              <div style={s.resumenValue}>{ciclos.reduce((s, c) => s + (c.cambios_realizados||0), 0)}</div>
              <div style={s.resumenLabel}>Cambios totales</div>
            </div>
            <div style={{ ...s.resumenItem, borderRight:'none' }}>
              <div style={{ ...s.resumenValue, color:'#2563eb' }}>${costoTotal.toFixed(2)}</div>
              <div style={s.resumenLabel}>Costo total del mes</div>
            </div>
          </div>
        </div>
      )}

      <div style={s.tableCard}>
        {loading ? <div style={s.loading}>Cargando...</div> : ciclos.length === 0 ? (
          <div style={s.empty}>
            <p>No hay ciclo para {mesFiltro}.</p>
            <p style={{ fontSize:13, color:'#64748b' }}>Hacé clic en "Iniciar ciclo" para crear desde el inventario actual.</p>
          </div>
        ) : (
          <table style={s.table}>
            <thead><tr>
              {['Tipo de Gas','Stock (tubos)','Alquiler por tubo','Precio transporte','Cambios en el mes','Costo Total'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {ciclos.map(ciclo => {
                const ct = (parseFloat(ciclo.precio_alquiler_mensual) * parseInt(ciclo.cantidad_stock)) +
                  (parseInt(ciclo.cambios_realizados) * parseFloat(ciclo.precio_transporte_tubo));
                return (
                  <tr key={ciclo.id}>
                    <td style={s.td}><strong>{ciclo.tipo_tubo}</strong></td>
                    <EC value={ciclo.cantidad_stock} ciclo={ciclo} field="cantidad_stock" editando={editando} setEditando={setEditando} onSave={handleEdit} isInt />
                    <EC value={ciclo.precio_alquiler_mensual} ciclo={ciclo} field="precio_alquiler_mensual" editando={editando} setEditando={setEditando} onSave={handleEdit} prefix="$" />
                    <EC value={ciclo.precio_transporte_tubo} ciclo={ciclo} field="precio_transporte_tubo" editando={editando} setEditando={setEditando} onSave={handleEdit} prefix="$" />
                    <EC value={ciclo.cambios_realizados} ciclo={ciclo} field="cambios_realizados" editando={editando} setEditando={setEditando} onSave={handleEdit} isInt />
                    <td style={{ ...s.td, fontWeight:700, color:'#2563eb', fontSize:15 }}>${ct.toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr style={{ background:'#f8fafc' }}>
                <td style={{ ...s.td, fontWeight:700 }} colSpan={5}>TOTAL DEL MES</td>
                <td style={{ ...s.td, fontWeight:800, color:'#2563eb', fontSize:16 }}>${costoTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
      <div style={s.hint}>Hacé clic en cualquier celda para editarla. Los cambios se guardan automáticamente.</div>
    </div>
  );
}

function EC({ value, ciclo, field, editando, setEditando, onSave, prefix='', isInt=false }) {
  const [val, setVal] = useState(value);
  const key = `${ciclo.id}-${field}`;
  if (editando === key) return (
    <td style={s.td}>
      <input style={s.editInput} type="number" step={isInt ? 1 : 0.01} value={val} autoFocus
        onChange={e => setVal(e.target.value)}
        onBlur={() => onSave(ciclo, field, val)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(ciclo, field, val); if (e.key === 'Escape') setEditando(null); }} />
    </td>
  );
  return (
    <td style={{ ...s.td, cursor:'pointer' }} onClick={() => { setVal(value); setEditando(key); }}>
      {prefix}{isInt ? parseInt(value) : parseFloat(value).toFixed(2)} <span style={{ fontSize:11, color:'#94a3b8' }}>✎</span>
    </td>
  );
}

const s = {
  pageHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 },
  pageTitle: { margin:0, fontSize:22, fontWeight:700, color:'#0f172a' },
  headerActions: { display:'flex', gap:10, alignItems:'center' },
  monthInput: { padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13 },
  iniciarBtn: { padding:'9px 16px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' },
  resumenCard: { background:'#fff', borderRadius:12, padding:24, marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  resumenTitle: { fontSize:13, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 },
  resumenGrid: { display:'flex', gap:0 },
  resumenItem: { flex:1, borderRight:'1px solid #e2e8f0', paddingRight:24 },
  resumenValue: { fontSize:32, fontWeight:800, color:'#0f172a' },
  resumenLabel: { fontSize:13, color:'#64748b', marginTop:4 },
  tableCard: { background:'#fff', borderRadius:12, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', marginBottom:12 },
  loading: { textAlign:'center', color:'#94a3b8', padding:'40px 0' },
  empty: { textAlign:'center', color:'#475569', padding:'40px 0' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#475569', background:'#f8fafc', borderBottom:'2px solid #e2e8f0', textTransform:'uppercase', letterSpacing:'0.5px' },
  td: { padding:'12px 14px', fontSize:14, color:'#1e293b', borderBottom:'1px solid #f1f5f9' },
  editInput: { padding:'5px 8px', border:'2px solid #2563eb', borderRadius:6, fontSize:13, width:80 },
  hint: { fontSize:12, color:'#94a3b8', textAlign:'right', marginTop:4 },
  errorMsg: { background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#991b1b', marginBottom:16 },
  successMsg: { background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#065f46', marginBottom:16 },
};
