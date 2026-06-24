export const TIPOS_TUBO     = ['O2', 'Butano', 'N2', 'Atal'];
export const UBICACIONES     = ['Almacén', 'Mantenimiento', 'Infraestructura', 'Sub Base'];
export const SECTORES        = ['Mantenimiento', 'Infraestructura', 'Sub Base', 'Compras', 'Admin'];

export const PERMISOS = {
  admin: {
    verDashboard: true, verMovimientos: true, verCostos: true,
    verHistorial: true, gestionarTubos: true, hacerMovimientos: true, editarPrecios: true,
  },
  almacen: {
    verDashboard: true, verMovimientos: true, verCostos: false,
    verHistorial: true, gestionarTubos: true, hacerMovimientos: true, editarPrecios: false,
  },
  compras: {
    verDashboard: true, verMovimientos: false, verCostos: true,
    verHistorial: true, gestionarTubos: false, hacerMovimientos: false, editarPrecios: true,
  },
  mantenimiento: {
    verDashboard: true, verMovimientos: false, verCostos: false,
    verHistorial: false, gestionarTubos: false, hacerMovimientos: true,
  },
  infraestructura: {
    verDashboard: true, verMovimientos: false, verCostos: false,
    verHistorial: false, gestionarTubos: false, hacerMovimientos: true,
  },
};

// Qué movimientos puede hacer cada sector
export const MOVIMIENTOS_PERMITIDOS = {
  almacen:        ['Carga', 'Alta', 'Baja'],
  mantenimiento:  ['Consumo', 'Devolución'],
  infraestructura:['Consumo', 'Devolución'],
  admin:          ['Carga', 'Alta', 'Baja', 'Consumo', 'Devolución'],
};
