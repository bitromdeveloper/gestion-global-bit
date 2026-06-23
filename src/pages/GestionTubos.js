import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { TIPOS_TUBO, ESTADOS_TUBO, UBICACIONES } from '../lib/constants';

const EMPTY = { codigo:'', tipo:'O2', capacidad:'', unidad:'kg', estado:'Lleno', ubicacion:'Almacén', fecha_entrada: new Date().toISOString().split('T')[0], precio_unitario:'', alquiler_mensual:'', precio_transporte:'' };

export default function GestionTubos() {
  const [tubos, setTubos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type:'', text:'' });

  useEffect(() => { fetchTubos(); }, []);

  const fetchTubos = async () => {
    setLoading(true);
    try { setTubos(await api.getTubos() || []); } catch {}
    setLoading(false);
  };

  const openNew = () => { setForm(EMPTY); setEditing(null); setShowForm(true); setMsg({ type:'', text:'' }); };
  const openEdit = (t) => { setForm({ ...t }); setEditing(t.id); setShowForm(true); setMsg({ type:'', text:'' }); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type:'', text:'' });
    const payload = {
      ...(editing ? { id: editing } : {}),
      codigo: form.codigo.trim().toUpperCase(),
      tipo: form.tipo, capacidad: parseFloat(form.capacidad),
      unidad: form.unidad, estado: form.estado, ubicacion: form.ubicacion,
      fecha_entrada: form.fecha_entrada,
      precio_unitario: parseFloat(form.precio_unitario) || 0,
      alquiler_mensual: parseFloat(form.alquiler_mensual) || 0,
      precio_transporte: parseFloat(form.precio_transporte) || 0,
      activo: true,
    };
    try {
      if (editing) await api.editarTubo(payload);
      else await api.crearTubo(payload);
      setMsg({ type:'success', text: editing ? 'Tubo actualizado' : 'Tubo agregado correctamente' });
      fetchTubos();
      setTimeout(() => setShowForm(false), 1000);
    } catch (err) {
      setMsg({ type:'error', text: err.message.includes('unique') ? 'Ese código ya existe' : err.message });
    }
    setSaving(false);
  };

  const handleRetirar = async (t) => {
    if (!window.confirm(`¿Retirar ${t.codigo}?`)) return;
    await api.editarTubo({ id: t.id, activo: false, estado: 'Retirado' });
    fetchTubos();
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Gestión de Tubos</h2>
        {!showForm && <button style={s.addBtn} onClick={openNew}>+ Agregar tubo</button>}
      </div>

      {showForm && (
        <div style={s.formCard}>
          <h3 style={s.formTitle}>{editing ? 'Editar tubo' : 'Nuevo tubo'}</h3>
          {msg.text && <div style={msg.type === 'error' ? s.errorMsg : s.successMsg}>{msg.text}</div>}
          <form onSubmit={handleSave} style={s.form}>
            <div style={s.row3}>
              <div style={s.field}><label style={s.label}>Código *</label><input style={s.input} value={form.codigo} onChange={f('codigo')} placeholder="T001" required /></div>
              <div style={s.field}><label style={s.label}>Tipo *</label><select style={s.input} value={form.tipo} onChange={f('tipo')}>{TIPOS_TUBO.map(t => <option key={t}>{t}</option>)}</select></div>
              <div style={s.field}><label style={s.label}>Fecha de entrada</label><input style={s.input} type="date" value={form.fecha_entrada} onChange={f('fecha_entrada')} /></div>
            </div>
            <div style={s.row3}>
              <div style={s.field}><label style={s.label}>Capacidad *</label><input style={s.input} type="number" value={form.capacidad} onChange={f('capacidad')} placeholder="50" required /></div>
              <div style={s.field}><label style={s.label}>Unidad</label><select style={s.input} value={form.unidad} onChange={f('unidad')}><option value="kg">kg</option><option value="m3">m3</option></select></div>
              <div style={s.field}><label style={s.label}>Estado</label><select style={s.input} value={form.estado} onChange={f('estado')}>{ESTADOS_TUBO.map(e => <option key={e}>{e}</option>)}</select></div>
            </div>
            <div style={s.row3}>
              <div style={s.field}><label style={s.label}>Ubicación</label><select style={s.input} value={form.ubicacion} onChange={f('ubicacion')}>{UBICACIONES.map(u => <option key={u}>{u}</option>)}</select></div>
              <div style={s.field}><label style={s.label}>Precio unitario</label><input style={s.input} type="number" step="0.01" value={form.precio_unitario} onChange={f('precio_unitario')} placeholder="0.00" /></div>
              <div style={s.field}><label style={s.label}>Alquiler mensual</label><input style={s.input} type="number" step="0.01" value={form.alquiler_mensual} onChange={f('alquiler_mensual')} placeholder="0.00" /></div>
            </div>
            <div style={{ maxWidth: 220 }}>
              <div style={s.field}><label style={s.label}>Precio transporte</label><input style={s.input} type="number" step="0.01" value={form.precio_transporte} onChange={f('precio_transporte')} placeholder="0.00" /></div>
            </div>
            <div style={s.formBtns}>
              <button type="button" style={s.cancelBtn} onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Agregar tubo')}</button>
            </div>
          </form>
        </div>
      )}

      <div style={s.tableCard}>
        {loading ? <div style={s.loading}>Cargando...</div> : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>
                {['Código','Tipo','Capacidad','Estado','Ubicación','Precio','Alquiler','Transporte','Activo','Acciones'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {tubos.length === 0 ? (
                  <tr><td colSpan={10} style={s.empty}>No hay tubos</td></tr>
                ) : tubos.map(t => (
                  <tr key={t.id} style={{ opacity: t.activo ? 1 : 0.45 }}>
                    <td style={s.td}><strong>{t.codigo}</strong></td>
                    <td style={s.td}>{t.tipo}</td>
                    <td style={s.td}>{t.capacidad} {t.unidad}</td>
                    <td style={s.td}>{t.estado}</td>
                    <td style={s.td}>{t.ubicacion}</td>
                    <td style={s.td}>${parseFloat(t.precio_unitario||0).toFixed(2)}</td>
                    <td style={s.td}>${parseFloat(t.alquiler_mensual||0).toFixed(2)}</td>
                    <td style={s.td}>${parseFloat(t.precio_transporte||0).toFixed(2)}</td>
                    <td style={s.td}>{t.activo ? '✓' : '—'}</td>
                    <td style={s.td}>
                      <div style={s.actionBtns}>
                        <button style={s.editBtn} onClick={() => openEdit(t)}>Editar</button>
                        {t.activo && <button style={s.retireBtn} onClick={() => handleRetirar(t)}>Retirar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  pageHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  pageTitle: { margin:0, fontSize:22, fontWeight:700, color:'#0f172a' },
  addBtn: { padding:'9px 18px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  formCard: { background:'#fff', borderRadius:12, padding:24, marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,0.08)' },
  formTitle: { margin:'0 0 18px', fontSize:16, fontWeight:700, color:'#0f172a' },
  form: { display:'flex', flexDirection:'column', gap:14 },
  row3: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 },
  field: { display:'flex', flexDirection:'column', gap:5 },
  label: { fontSize:12, fontWeight:600, color:'#374151' },
  input: { padding:'8px 11px', border:'1.5px solid #e2e8f0', borderRadius:7, fontSize:13, color:'#0f172a', fontFamily:'inherit', background:'#fff' },
  formBtns: { display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 },
  cancelBtn: { padding:'8px 18px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, cursor:'pointer', color:'#475569' },
  saveBtn: { padding:'8px 22px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' },
  tableCard: { background:'#fff', borderRadius:12, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  loading: { textAlign:'center', color:'#94a3b8', padding:'40px 0' },
  tableWrap: { overflowX:'auto' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { padding:'9px 11px', textAlign:'left', fontSize:11, fontWeight:700, color:'#475569', background:'#f8fafc', borderBottom:'2px solid #e2e8f0', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' },
  td: { padding:'9px 11px', fontSize:13, color:'#1e293b', borderBottom:'1px solid #f1f5f9' },
  actionBtns: { display:'flex', gap:6 },
  editBtn: { padding:'4px 10px', background:'#eff6ff', color:'#2563eb', border:'none', borderRadius:6, fontSize:12, cursor:'pointer', fontWeight:600 },
  retireBtn: { padding:'4px 10px', background:'#fff7ed', color:'#ea580c', border:'none', borderRadius:6, fontSize:12, cursor:'pointer', fontWeight:600 },
  empty: { textAlign:'center', color:'#94a3b8', padding:'40px 0', fontSize:14 },
  errorMsg: { background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'9px 14px', fontSize:13, color:'#991b1b', marginBottom:12 },
  successMsg: { background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:8, padding:'9px 14px', fontSize:13, color:'#065f46', marginBottom:12 },
};
