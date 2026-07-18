import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { PERMISOS } from './lib/constants';
import Layout from './components/Layout';
import AlertaStock from './components/AlertaStock';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import DashboardMantenimiento from './pages/DashboardMantenimiento';
import DashboardInfraestructura from './pages/DashboardInfraestructura';
import Movimientos from './pages/Movimientos';
import Historial from './pages/Historial';
import CiclosMensuales from './pages/CiclosMensuales';
import Precios from './pages/Precios';
import Perfil from './pages/Perfil';
import CilindrosApp from './cilindros/CilindrosApp';
import PanelSuperadmin from './cilindros/PanelSuperadmin';

// ============================================================================
// GASES — esto es exactamente lo que antes era "AppContent" en el App.js viejo.
// No se tocó ninguna línea de lógica, solo se renombró.
// ============================================================================
function GasesApp() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  const permisos = PERMISOS[user.sector] || {};

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        if (user.sector === 'mantenimiento')  return <DashboardMantenimiento />;
        if (user.sector === 'infraestructura') return <DashboardInfraestructura />;
        return <Dashboard />;
      case 'movimientos': return permisos.hacerMovimientos ? <Movimientos /> : null;
      case 'historial':   return permisos.verHistorial     ? <Historial />   : null;
      case 'costos':      return permisos.verCostos        ? <CiclosMensuales /> : null;
      case 'precios':     return permisos.editarPrecios   ? <Precios />         : null;
      case 'perfil':      return <Perfil />;
      default:            return <Dashboard />;
    }
  };

  return (
    <>
      <AlertaStock />
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </Layout>
    </>
  );
}

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
