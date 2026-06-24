import React from 'react';
import { useAuth } from './AuthContext';
import { PERMISOS } from '../lib/constants';

const SECTOR_COLOR = {
  admin:          { bg:'#7c3aed', light:'#ede9fe', text:'Admin' },
  almacen:        { bg:'#0891b2', light:'#e0f2fe', text:'Almacén' },
  compras:        { bg:'#059669', light:'#d1fae5', text:'Compras' },
  mantenimiento:  { bg:'#d97706', light:'#fef3c7', text:'Mantenimiento' },
  infraestructura:{ bg:'#dc2626', light:'#fee2e2', text:'Infraestructura' },
};

export default function Layout({ children, currentPage, onNavigate }) {
  const { user, logout } = useAuth();
  const permisos = PERMISOS[user?.sector] || {};
  const sc = SECTOR_COLOR[user?.sector] || SECTOR_COLOR.mantenimiento;

  const navItems = [
    { id:'dashboard',    label: user?.sector === 'mantenimiento' ? 'Mi Panel' : user?.sector === 'infraestructura' ? 'Mi Panel' : 'Estado de Tubos', icon:'⬤',  show: permisos.verDashboard },
    { id:'movimientos',  label:'Registrar Movimiento',  icon:'+',  show: permisos.hacerMovimientos },
    { id:'historial',    label:'Historial',             icon:'↔',  show: permisos.verHistorial },
    { id:'costos',       label:'Ciclos y Costos',       icon:'$',  show: permisos.verCostos },
    { id:'perfil',       label:'Mi Perfil',             icon:'👤', show: true },
  ].filter(i => i.show);

  return (
    <div style={s.wrap}>
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <div style={s.brandIcon}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <rect x="13" y="2" width="10" height="4" rx="2" fill="#60a5fa"/>
              <rect x="11" y="6" width="14" height="22" rx="3" fill="#93c5fd"/>
              <rect x="13" y="28" width="10" height="4" rx="2" fill="#60a5fa"/>
              <rect x="15" y="10" width="6" height="2" rx="1" fill="#1d4ed8"/>
              <rect x="15" y="14" width="6" height="2" rx="1" fill="#1d4ed8"/>
            </svg>
          </div>
          <div>
            <div style={s.brandTitle}>Control de Gases</div>
            <div style={s.brandSub}>BRA</div>
          </div>
        </div>

        <div style={{ ...s.badge, background: sc.light }}>
          <div style={{ ...s.badgeDot, background: sc.bg }} />
          <div>
            <div style={{ ...s.badgeRole, color: sc.bg }}>{sc.text}</div>
            <div style={s.badgeUser}>{user?.username}</div>
          </div>
        </div>

        <nav style={s.nav}>
          {navItems.map(item => (
            <button key={item.id}
              style={{ ...s.navBtn, ...(currentPage === item.id ? s.navActive : {}) }}
              onClick={() => onNavigate(item.id)}>
              <span style={s.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button style={s.logoutBtn} onClick={logout}>← Cerrar sesión</button>
      </aside>
      <main style={s.main}>{children}</main>
    </div>
  );
}

const s = {
  wrap:      { display:'flex', minHeight:'100vh', fontFamily:"'Inter','Segoe UI',sans-serif", background:'#f1f5f9' },
  sidebar:   { width:240, minHeight:'100vh', background:'#0f172a', display:'flex', flexDirection:'column', padding:'0 0 16px', position:'fixed', top:0, left:0, bottom:0, zIndex:100 },
  brand:     { display:'flex', alignItems:'center', gap:10, padding:'20px 20px 16px', borderBottom:'1px solid #1e293b' },
  brandIcon: { background:'#1e3a5f', borderRadius:8, padding:6, display:'flex' },
  brandTitle:{ fontSize:14, fontWeight:700, color:'#f1f5f9' },
  brandSub:  { fontSize:11, color:'#64748b' },
  badge:     { margin:'12px 12px 8px', borderRadius:8, padding:'10px 12px', display:'flex', alignItems:'center', gap:8 },
  badgeDot:  { width:8, height:8, borderRadius:'50%', flexShrink:0 },
  badgeRole: { fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' },
  badgeUser: { fontSize:11, color:'#475569', marginTop:1 },
  nav:       { display:'flex', flexDirection:'column', gap:2, padding:'8px 12px', flex:1 },
  navBtn:    { display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, border:'none', background:'transparent', color:'#94a3b8', fontSize:13, fontWeight:500, cursor:'pointer', textAlign:'left' },
  navActive: { background:'#1e3a5f', color:'#60a5fa' },
  navIcon:   { fontSize:14, width:18, textAlign:'center' },
  logoutBtn: { margin:'0 12px', padding:'9px 12px', borderRadius:8, border:'1px solid #1e293b', background:'transparent', color:'#64748b', fontSize:12, cursor:'pointer', textAlign:'left' },
  main:      { flex:1, marginLeft:240, padding:'28px 32px', minHeight:'100vh' },
};
