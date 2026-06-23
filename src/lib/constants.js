export const PERMISOS = {
  admin: {
    verTubos: true, verMovimientos: true, verCostos: true,
    registrarMovimientos: true, gestionarTubos: true, verReportes: true,
  },
  almacen: {
    verTubos: true, verMovimientos: true, verCostos: false,
    registrarMovimientos: true, gestionarTubos: true, verReportes: false,
  },
  compras: {
    verTubos: true, verMovimientos: true, verCostos: true,
    registrarMovimientos: false, gestionarTubos: false, verReportes: true,
  },
  mantenimiento: {
    verTubos: true, verMovimientos: false, verCostos: false,
    registrarMovimientos: false, gestionarTubos: false, verReportes: false,
  },
  infraestructura: {
    verTubos: true, verMovimientos: false, verCostos: false,
    registrarMovimientos: false, gestionarTubos: false, verReportes: false,
  },
};

export const TIPOS_TUBO = ['O2', 'Butano', 'N2', 'Atal'];
export const ESTADOS_TUBO = ['Lleno', 'Vacío', 'En Reparación', 'Retirado'];
export const UBICACIONES = ['Almacén', 'Mantenimiento', 'Infraestructura', 'Proveedor'];
export const TIPOS_OPERACION = ['Entrega', 'Cambio', 'Retorno', 'Devolución'];
export const SECTORES = ['Almacén', 'Mantenimiento', 'Infraestructura', 'Proveedor', 'Compras'];
