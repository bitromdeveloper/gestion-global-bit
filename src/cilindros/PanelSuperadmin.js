import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import CilindrosApp from './CilindrosApp';
import GasesApp from '../gases/GasesApp';
import UsuariosTab from './UsuariosTab';
import AuditoriaTab from './AuditoriaTab';

// ============================================================================
// PANEL SUPERADMIN (bitrom) — Cilindros, Gases, Usuarios y Auditoría.
// ============================================================================
export default function PanelSuperadmin() {
  const { user, logout } = useAuth();
  const [vista, setVista] = useState('cilindros');

  const TABS = [
    { id: 'cilindros', label: 'Cilindros' },
    { id: 'gases', label: 'Gases' },
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'auditoria', label: 'Auditoría' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#1C1F22' }}>
      <div style={s.topbar}>
        <div style={s.brand}>Panel Superadmin — {user?.nombre}</div>
        <div style={s.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              style={{ ...s.tab, ...(vista === t.id ? s.tabActive : {}) }}
              onClick={() => setVista(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button style={s.logout} onClick={logout}>Cerrar sesión</button>
      </div>

      <div>
        {vista === 'cilindros' && <CilindrosApp />}
        {vista === 'gases' && <GasesApp />}
        {vista === 'usuarios' && <UsuariosTab />}
        {vista === 'auditoria' && <AuditoriaTab />}
      </div>
    </div>
  );
}

const s = {
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 24px', borderBottom: '1px solid #2E3338', background: '#1A1D20',
    fontFamily: "'Oswald', sans-serif", color: '#E8E6E1',
  },
  brand: { fontSize: 14, fontWeight: 600, letterSpacing: '0.04em' },
  tabs: { display: 'flex', gap: 8 },
  tab: {
    background: 'none', border: '1px solid #3A4048', color: '#8B9199',
    padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
  },
  tabActive: { background: '#262B30', color: '#5B7A99', borderColor: '#5B7A99' },
  logout: {
    background: 'none', border: 'none', color: '#8B9199', fontSize: 12, cursor: 'pointer',
  },
};
