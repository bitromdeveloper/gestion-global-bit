import React from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import LoginPage from './pages/LoginPage';
import GasesApp from './gases/GasesApp';
import CilindrosApp from './cilindros/CilindrosApp';
import PanelSuperadmin from './cilindros/PanelSuperadmin';

// ============================================================================
// PUNTO DE ENTRADA ÚNICO
// Un solo LoginPage. Después de loguear, decide a dónde mandar a cada uno
// según user.rol / user.modulo (vienen de public.perfiles).
// ============================================================================
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f172a' }}>
      <div style={{ color:'#60a5fa', fontSize:16 }}>Cargando...</div>
    </div>
  );

  if (!user) return <LoginPage />;

  if (user.rol === 'superadmin')   return <PanelSuperadmin />;
  if (user.modulo === 'cilindros') return <CilindrosApp />;
  if (user.modulo === 'gases')     return <GasesApp />;

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f172a', color:'#fff' }}>
      Tu usuario no tiene un módulo asignado. Contactá al administrador.
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
