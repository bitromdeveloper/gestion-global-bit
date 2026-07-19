import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { PERMISOS } from '../lib/constants';
import Layout from '../components/Layout';
import AlertaStock from '../components/AlertaStock';
import Dashboard from '../pages/Dashboard';
import DashboardMantenimiento from '../pages/DashboardMantenimiento';
import DashboardInfraestructura from '../pages/DashboardInfraestructura';
import Movimientos from '../pages/Movimientos';
import Historial from '../pages/Historial';
import CiclosMensuales from '../pages/CiclosMensuales';
import Precios from '../pages/Precios';
import Perfil from '../pages/Perfil';

// ============================================================================
// Es exactamente lo que antes vivía como función interna "GasesApp" dentro
// de App.js — se saca a su propio archivo para poder importarlo también
// desde PanelSuperadmin (así bitrom puede "espiar" el módulo de gases sin
// tener que loguearse con un usuario de gases).
// ============================================================================
export default function GasesApp() {
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
