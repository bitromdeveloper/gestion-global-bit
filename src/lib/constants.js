export const TIPOS_TUBO     = ['O2', 'Butano', 'N2', 'Atal'];
export const UBICACIONES     = ['Almacén', 'Mantenimiento', 'Infraestructura', 'Sub Base'];
export const ESTADOS_TUBO    = ['Lleno', 'En uso', 'Vacío', 'En poder del proveedor'];
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
  // El superadmin (bitrom) puede "espiar" el módulo de gases desde su panel
  // sin ser un usuario de gases propiamente dicho — necesita ver todo.
  superadmin: {
    verDashboard: true, verMovimientos: true, verCostos: true,
    verHistorial: true, gestionarTubos: true, hacerMovimientos: true, editarPrecios: true,
  },
};

// Qué movimientos puede hacer cada sector
export const MOVIMIENTOS_PERMITIDOS = {
  almacen:        ['Carga', 'Alta', 'Baja'],
  mantenimiento:  ['Consumo', 'Devolución'],
  infraestructura:['Consumo', 'Devolución'],
  admin:          ['Carga', 'Alta', 'Baja', 'Consumo', 'Devolución'],
  superadmin:     ['Carga', 'Alta', 'Baja', 'Consumo', 'Devolución'],
};
