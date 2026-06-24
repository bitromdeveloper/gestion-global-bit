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
import Perfil from './pages/Perfil';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f172a' }}>
      <div style={{ color:'#60a5fa', fontSize:16 }}>Cargando...</div>
    </div>
  );

  if (!user) return <LoginPage />;

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

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
