import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';

const SECTOR_LABEL = { admin:'Administrador', almacen:'Almacén', compras:'Compras', mantenimiento:'Mantenimiento', infraestructura:'Infraestructura', superadmin:'Superadmin' };

export default function Perfil() {
  const { user, changePassword, updateEmails } = useAuth();
  const [passForm, setPassForm]   = useState({ actual:'', nueva:'', confirmar:'' });
  const [emailForm, setEmailForm] = useState({ email1: user?.email1||'', email2: user?.email2||'', email3: user?.email3||'' });
  const [passMsg, setPassMsg]     = useState({ type:'', text:'' });
  const [emailMsg, setEmailMsg]   = useState({ type:'', text:'' });
  const [savingPass, setSavingPass]   = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMsg({ type:'', text:'' });
    if (passForm.nueva !== passForm.confirmar) { setPassMsg({ type:'error', text:'Las contraseñas no coinciden' }); return; }
    if (passForm.nueva.length < 6) { setPassMsg({ type:'error', text:'Mínimo 6 caracteres' }); return; }
    setSavingPass(true);
    const result = await changePassword(passForm.actual, passForm.nueva);
    if (result.error) setPassMsg({ type:'error', text: result.error });
    else { setPassMsg({ type:'success', text:'✓ Contraseña actualizada. Informá a tus compañeros.' }); setPassForm({ actual:'', nueva:'', confirmar:'' }); }
    setSavingPass(false);
  };

  const handleUpdateEmails = async (e) => {
    e.preventDefault();
    setEmailMsg({ type:'', text:'' });
    setSavingEmail(true);
    const result = await updateEmails(emailForm.email1, emailForm.email2, emailForm.email3);
    if (result.error) setEmailMsg({ type:'error', text: result.error });
    else setEmailMsg({ type:'success', text:'✓ Emails actualizados' });
    setSavingEmail(false);
  };

  return (
    <div>
      <div style={s.pageHeader}><h2 style={s.pageTitle}>Mi Perfil</h2></div>

      <div style={s.infoCard}>
        <div style={s.avatar}>{user?.username?.charAt(0)?.toUpperCase()}</div>
        <div>
          <div style={s.username}>{user?.username}</div>
          <div style={s.sector}>{SECTOR_LABEL[user?.sector] || user?.sector}</div>
        </div>
      </div>

      <div style={s.grid}>
        <div style={s.card}>
          <h3 style={s.cardTitle}>Cambiar contraseña</h3>
          <p style={s.cardDesc}>Este usuario es compartido entre compañeros del sector {SECTOR_LABEL[user?.sector]}. Si cambiás la contraseña, informales.</p>
          {passMsg.text && <div style={passMsg.type==='error' ? s.errorMsg : s.successMsg}>{passMsg.text}</div>}
          <form onSubmit={handleChangePassword} style={s.form}>
            <div style={s.field}><label style={s.label}>Contraseña actual *</label><input style={s.input} type="password" value={passForm.actual} onChange={e => setPassForm(f => ({ ...f, actual:e.target.value }))} required /></div>
            <div style={s.field}><label style={s.label}>Nueva contraseña *</label><input style={s.input} type="password" value={passForm.nueva} onChange={e => setPassForm(f => ({ ...f, nueva:e.target.value }))} required /></div>
            <div style={s.field}><label style={s.label}>Confirmar nueva *</label><input style={s.input} type="password" value={passForm.confirmar} onChange={e => setPassForm(f => ({ ...f, confirmar:e.target.value }))} required /></div>
            <button style={{ ...s.btn, opacity: savingPass ? 0.7 : 1 }} type="submit" disabled={savingPass}>{savingPass ? 'Guardando...' : 'Actualizar contraseña'}</button>
          </form>
        </div>

        <div style={s.card}>
          <h3 style={s.cardTitle}>Emails de contacto</h3>
          <p style={s.cardDesc}>Hasta 3 emails de referencia. La recuperación de contraseña se gestiona a través de Compras.</p>
          {emailMsg.text && <div style={emailMsg.type==='error' ? s.errorMsg : s.successMsg}>{emailMsg.text}</div>}
          <form onSubmit={handleUpdateEmails} style={s.form}>
            <div style={s.field}><label style={s.label}>Email 1</label><input style={s.input} type="email" placeholder="email@empresa.com" value={emailForm.email1} onChange={e => setEmailForm(f => ({ ...f, email1:e.target.value }))} /></div>
            <div style={s.field}><label style={s.label}>Email 2 (opcional)</label><input style={s.input} type="email" placeholder="email@empresa.com" value={emailForm.email2} onChange={e => setEmailForm(f => ({ ...f, email2:e.target.value }))} /></div>
            <div style={s.field}><label style={s.label}>Email 3 (opcional)</label><input style={s.input} type="email" placeholder="email@empresa.com" value={emailForm.email3} onChange={e => setEmailForm(f => ({ ...f, email3:e.target.value }))} /></div>
            <button style={{ ...s.btn, opacity: savingEmail ? 0.7 : 1 }} type="submit" disabled={savingEmail}>{savingEmail ? 'Guardando...' : 'Guardar emails'}</button>
          </form>
        </div>
      </div>

      <div style={s.permsCard}>
        <h3 style={s.cardTitle}>Accesos de tu rol</h3>
        <div style={s.permsList}>
          {[
            { label:'Ver estado de tubos',              ok: true },
            { label:'Registrar movimientos',            ok: ['admin','almacen','superadmin'].includes(user?.sector) },
            { label:'Gestionar tubos (agregar/editar)', ok: ['admin','almacen','superadmin'].includes(user?.sector) },
            { label:'Ver historial de movimientos',     ok: ['admin','almacen','compras','superadmin'].includes(user?.sector) },
            { label:'Ver costos y ciclos mensuales',    ok: ['admin','compras','superadmin'].includes(user?.sector) },
          ].map(p => (
            <div key={p.label} style={s.permItem}>
              <span style={{ color: p.ok ? '#10b981' : '#94a3b8', fontSize:15 }}>{p.ok ? '✓' : '✗'}</span>
              <span style={{ color: p.ok ? '#0f172a' : '#94a3b8', fontSize:13 }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  pageHeader: { marginBottom:24 },
  pageTitle:  { margin:0, fontSize:22, fontWeight:700, color:'#0f172a' },
  infoCard:   { background:'#fff', borderRadius:12, padding:'20px 24px', marginBottom:24, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', display:'flex', alignItems:'center', gap:16 },
  avatar:     { width:48, height:48, borderRadius:'50%', background:'#2563eb', color:'#fff', fontSize:20, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 },
  username:   { fontSize:17, fontWeight:700, color:'#0f172a' },
  sector:     { fontSize:13, color:'#64748b', marginTop:3 },
  grid:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 },
  card:       { background:'#fff', borderRadius:12, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  cardTitle:  { margin:'0 0 8px', fontSize:15, fontWeight:700, color:'#0f172a' },
  cardDesc:   { fontSize:13, color:'#64748b', marginBottom:16, lineHeight:1.5 },
  form:       { display:'flex', flexDirection:'column', gap:14 },
  field:      { display:'flex', flexDirection:'column', gap:5 },
  label:      { fontSize:12, fontWeight:600, color:'#374151' },
  input:      { padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, color:'#0f172a', fontFamily:'inherit' },
  btn:        { padding:'9px 20px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', marginTop:4 },
  permsCard:  { background:'#fff', borderRadius:12, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  permsList:  { display:'flex', flexDirection:'column', gap:10, marginTop:16 },
  permItem:   { display:'flex', alignItems:'center', gap:10 },
  errorMsg:   { background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'9px 14px', fontSize:13, color:'#991b1b', marginBottom:8 },
  successMsg: { background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:8, padding:'9px 14px', fontSize:13, color:'#065f46', marginBottom:8 },
};
