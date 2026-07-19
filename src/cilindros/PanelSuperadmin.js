import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import CilindrosApp from './CilindrosApp';
import GasesApp from '../gases/GasesApp';

// ============================================================================
// PANEL SUPERADMIN (bitrom) — ahora sí ve ambos módulos completos.
// ============================================================================
export default function PanelSuperadmin() {
  const { user, logout } = useAuth();
  const [vista, setVista] = useState('cilindros');

  return (
    <div style={{ minHeight: '100vh', background: '#1C1F22' }}>
      <div style={s.topbar}>
        <div style={s.brand}>Panel Superadmin — {user?.nombre}</div>
        <div style={s.tabs}>
          <button style={{ ...s.tab, ...(vista === 'cilindros' ? s.tabActive : {}) }} onClick={() => setVista('cilindros')}>
            Cilindros
          </button>
          <button style={{ ...s.tab, ...(vista === 'gases' ? s.tabActive : {}) }} onClick={() => setVista('gases')}>
            Gases
          </button>
        </div>
        <button style={s.logout} onClick={logout}>Cerrar sesión</button>
      </div>

      <div>
        {vista === 'cilindros' && <CilindrosApp />}
        {vista === 'gases' && <GasesApp />}
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
