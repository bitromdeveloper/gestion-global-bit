import { supabase } from './supabase';

export const db = {

  // ─── TUBOS ────────────────────────────────────────────────────────────────

  getTubos: async () => {
    const { data, error } = await supabase
      .from('tubos').select('*')
      .eq('activo', true)
      .order('tipo').order('codigo');
    if (error) throw new Error(error.message);
    return data;
  },

  // Todos los tubos alguna vez registrados (activos e inactivos) para lista de intercambio
  getTodosLosTubos: async () => {
    const { data, error } = await supabase
      .from('tubos').select('*')
      .order('tipo').order('codigo');
    if (error) throw new Error(error.message);
    return data;
  },

  crearTubo: async (tubo) => {
    const { data, error } = await supabase
      .from('tubos').insert({ ...tubo, activo: true }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  editarTubo: async ({ id, ...campos }) => {
    const { data, error } = await supabase
      .from('tubos')
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  darBajaTubo: async (id) => {
    const { error } = await supabase
      .from('tubos')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ─── MOVIMIENTOS ──────────────────────────────────────────────────────────

  getMovimientos: async ({ limit = 300 } = {}) => {
    const { data, error } = await supabase
      .from('movimientos').select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data;
  },

  // INTERCAMBIO CON PROVEEDOR: sale un vacío, entra un lleno (1 a 1)
  // tuboSaleId: tubo vacío que se va con el proveedor
  // tuboEntraId: tubo lleno que llega (ya existente en sistema) o null si es nuevo
  // tuboNuevoData: datos del tubo nuevo si no existe en sistema
  registrarIntercambio: async (tuboSaleId, tuboEntraId, tuboNuevoData, usuario) => {
    const hoy = new Date().toISOString().split('T')[0];

    // 1. Marcar el tubo que sale como "En poder del proveedor" y desactivarlo
    const { data: tuboSale } = await supabase.from('tubos').select('*').eq('id', tuboSaleId).single();
    if (!tuboSale) throw new Error('Tubo saliente no encontrado');
    if (tuboSale.estado !== 'Vacío') throw new Error('El tubo que sale debe estar Vacío');

    await supabase.from('tubos').update({
      estado: 'En poder del proveedor',
      activo: false,
      updated_at: new Date().toISOString(),
    }).eq('id', tuboSaleId);

    // 2. Activar o crear el tubo que entra
    let tuboEntra;
    if (tuboEntraId) {
      // Tubo conocido que vuelve del proveedor
      const { data } = await supabase.from('tubos').select('*').eq('id', tuboEntraId).single();
      if (!data) throw new Error('Tubo entrante no encontrado');
      await supabase.from('tubos').update({
        estado: 'Lleno',
        activo: true,
        ubicacion: 'Almacén',
        en_proveedor: false,
        updated_at: new Date().toISOString(),
      }).eq('id', tuboEntraId);
      tuboEntra = data;
    } else {
      // Tubo nuevo que nunca estuvo en el sistema
      const { data, error } = await supabase.from('tubos').insert({
        ...tuboNuevoData,
        estado: 'Lleno',
        activo: true,
        ubicacion: 'Almacén',
        en_proveedor: false,
        fecha_entrada: hoy,
      }).select().single();
      if (error) throw new Error(error.message);
      tuboEntra = data;
    }

    // 3. Registrar ambos movimientos
    await supabase.from('movimientos').insert([
      {
        tipo_operacion: 'Intercambio',
        tubo_id: tuboSaleId,
        tubo_codigo: tuboSale.codigo,
        tubo_tipo: tuboSale.tipo,
        ubicacion_origen: 'Almacén',
        ubicacion_destino: 'Proveedor',
        estado_anterior: 'Vacío',
        estado_nuevo: 'En poder del proveedor',
        observaciones: `Intercambio — entra ${tuboEntra.codigo}`,
        usuario_registra: usuario,
        fecha: hoy,
      },
      {
        tipo_operacion: 'Intercambio',
        tubo_id: tuboEntra.id,
        tubo_codigo: tuboEntra.codigo,
        tubo_tipo: tuboEntra.tipo,
        ubicacion_origen: 'Proveedor',
        ubicacion_destino: 'Almacén',
        estado_anterior: 'En poder del proveedor',
        estado_nuevo: 'Lleno',
        observaciones: `Intercambio — sale ${tuboSale.codigo}`,
        usuario_registra: usuario,
        fecha: hoy,
      },
    ]);

    return { tuboSale, tuboEntra };
  },

  // ENTREGA A SECTOR: Almacén → sector, con o sin devolución de vacío
  registrarEntregaConDevolucion: async ({ tuboLlenoId, destino, tuboVacioId, sinDevolucion, usuario }) => {
    const hoy = new Date().toISOString().split('T')[0];

    const { data: tuboLleno } = await supabase.from('tubos').select('*').eq('id', tuboLlenoId).single();
    if (!tuboLleno) throw new Error('Tubo no encontrado');
    if (tuboLleno.estado !== 'Lleno') throw new Error('El tubo debe estar Lleno');
    if (tuboLleno.ubicacion !== 'Almacén') throw new Error('El tubo debe estar en Almacén');

    // Mover tubo lleno al sector
    await supabase.from('tubos').update({
      ubicacion: destino,
      estado: 'En uso',
      updated_at: new Date().toISOString(),
    }).eq('id', tuboLlenoId);

    await supabase.from('movimientos').insert({
      tipo_operacion: 'Consumo',
      tubo_id: tuboLlenoId,
      tubo_codigo: tuboLleno.codigo,
      tubo_tipo: tuboLleno.tipo,
      ubicacion_origen: 'Almacén',
      ubicacion_destino: destino,
      estado_anterior: 'Lleno',
      estado_nuevo: 'En uso',
      usuario_registra: usuario,
      fecha: hoy,
    });

    // Si recibe vacío a cambio
    if (!sinDevolucion && tuboVacioId) {
      const { data: tuboVacio } = await supabase.from('tubos').select('*').eq('id', tuboVacioId).single();
      if (tuboVacio) {
        await supabase.from('tubos').update({
          ubicacion: 'Almacén',
          estado: 'Vacío',
          updated_at: new Date().toISOString(),
        }).eq('id', tuboVacioId);

        await supabase.from('movimientos').insert({
          tipo_operacion: 'Devolución',
          tubo_id: tuboVacioId,
          tubo_codigo: tuboVacio.codigo,
          tubo_tipo: tuboVacio.tipo,
          ubicacion_origen: destino,
          ubicacion_destino: 'Almacén',
          estado_anterior: 'En uso',
          estado_nuevo: 'Vacío',
          usuario_registra: usuario,
          fecha: hoy,
        });
      }
    }
  },

  // CONSUMO legacy (por si se usa en algún lugar)
  registrarConsumo: async (tubo_id, destino, usuario) => {
    const { data: tubo } = await supabase.from('tubos').select('*').eq('id', tubo_id).single();
    if (!tubo) throw new Error('Tubo no encontrado');
    if (tubo.estado !== 'Lleno') throw new Error('Solo se pueden consumir tubos llenos');
    if (tubo.ubicacion !== 'Almacén') throw new Error('El tubo debe estar en Almacén');

    await supabase.from('tubos').update({
      ubicacion: destino, estado: 'En uso', updated_at: new Date().toISOString()
    }).eq('id', tubo_id);

    await supabase.from('movimientos').insert({
      tipo_operacion: 'Consumo',
      tubo_id, tubo_codigo: tubo.codigo, tubo_tipo: tubo.tipo,
      ubicacion_origen: 'Almacén', ubicacion_destino: destino,
      estado_anterior: 'Lleno', estado_nuevo: 'En uso',
      usuario_registra: usuario,
      fecha: new Date().toISOString().split('T')[0],
    });
  },

  // DEVOLUCIÓN: sector → Almacén (vacío)
  registrarDevolucion: async (tubo_id, sector, usuario) => {
    const { data: tubo } = await supabase.from('tubos').select('*').eq('id', tubo_id).single();
    if (!tubo) throw new Error('Tubo no encontrado');
    if (tubo.ubicacion === 'Almacén') throw new Error('El tubo ya está en Almacén');
    if (sector && tubo.ubicacion !== sector) throw new Error(`El tubo no está en ${sector}`);

    await supabase.from('tubos').update({
      ubicacion: 'Almacén', estado: 'Vacío',
      updated_at: new Date().toISOString()
    }).eq('id', tubo_id);

    await supabase.from('movimientos').insert({
      tipo_operacion: 'Devolución',
      tubo_id, tubo_codigo: tubo.codigo, tubo_tipo: tubo.tipo,
      ubicacion_origen: tubo.ubicacion, ubicacion_destino: 'Almacén',
      estado_anterior: 'En uso', estado_nuevo: 'Vacío',
      usuario_registra: usuario,
      fecha: new Date().toISOString().split('T')[0],
    });
  },

  // ALTA: tubo nuevo al sistema
  registrarAlta: async (tuboData, usuario) => {
    const { data: tubo, error } = await supabase
      .from('tubos').insert({ ...tuboData, activo: true }).select().single();
    if (error) throw new Error(error.message);

    await supabase.from('movimientos').insert({
      tipo_operacion: 'Alta',
      tubo_id: tubo.id, tubo_codigo: tubo.codigo, tubo_tipo: tubo.tipo,
      ubicacion_destino: 'Almacén',
      estado_nuevo: 'Lleno',
      pedido_por: tuboData.pedido_por,
      usuario_registra: usuario,
      fecha: new Date().toISOString().split('T')[0],
    });
    return tubo;
  },

  // BAJA: tubo retirado permanentemente del sistema
  registrarBaja: async (tubo_id, observaciones, usuario) => {
    const { data: tubo } = await supabase.from('tubos').select('*').eq('id', tubo_id).single();
    if (!tubo) throw new Error('Tubo no encontrado');

    await supabase.from('tubos').update({
      activo: false, updated_at: new Date().toISOString()
    }).eq('id', tubo_id);

    await supabase.from('movimientos').insert({
      tipo_operacion: 'Baja',
      tubo_id, tubo_codigo: tubo.codigo, tubo_tipo: tubo.tipo,
      ubicacion_origen: tubo.ubicacion,
      estado_anterior: tubo.estado,
      observaciones,
      usuario_registra: usuario,
      fecha: new Date().toISOString().split('T')[0],
    });
  },

  // ─── HISTORIAL ────────────────────────────────────────────────────────────

  getResumenMensual: async (mes) => {
    const { data, error } = await supabase
      .from('movimientos')
      .select('*')
      .gte('fecha', `${mes}-01`)
      .lte('fecha', `${mes}-31`)
      .order('fecha');
    if (error) throw new Error(error.message);
    return data;
  },

  getCiclos: async (mes) => {
    const { data, error } = await supabase
      .from('ciclos_mensuales').select('*').eq('mes', mes).order('tipo_tubo');
    if (error) throw new Error(error.message);
    return data;
  },

  actualizarCiclo: async ({ id, ...campos }) => {
    const { data, error } = await supabase
      .from('ciclos_mensuales').update(campos).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
};
