import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { PERMISOS } from './lib/constants';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import { Movimientos } from './pages/Movimientos';
import RegistrarMovimiento from './pages/RegistrarMovimiento';
import GestionTubos from './pages/GestionTubos';
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
      case 'dashboard':    return <Dashboard />;
      case 'movimientos':  return permisos.verMovimientos ? <Movimientos /> : null;
      case 'registrar':    return permisos.registrarMovimientos ? <RegistrarMovimiento /> : null;
      case 'tubos':        return permisos.gestionarTubos ? <GestionTubos /> : null;
      case 'costos':       return permisos.verCostos ? <CiclosMensuales /> : null;
      case 'perfil':       return <Perfil />;
      default:             return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
