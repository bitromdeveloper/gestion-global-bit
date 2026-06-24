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

  // CARGA: vacío → lleno (Almacén recibe carga del proveedor)
  registrarCarga: async (tubo_id, usuario) => {
    const { data: tubo } = await supabase.from('tubos').select('*').eq('id', tubo_id).single();
    if (!tubo) throw new Error('Tubo no encontrado');
    if (tubo.estado !== 'Vacío') throw new Error('El tubo ya está lleno');
    if (tubo.ubicacion !== 'Almacén') throw new Error('El tubo debe estar en Almacén para cargarlo');

    await supabase.from('tubos').update({ estado: 'Lleno', updated_at: new Date().toISOString() }).eq('id', tubo_id);

    await supabase.from('movimientos').insert({
      tipo_operacion: 'Carga',
      tubo_id, tubo_codigo: tubo.codigo, tubo_tipo: tubo.tipo,
      ubicacion_origen: 'Almacén', ubicacion_destino: 'Almacén',
      estado_anterior: 'Vacío', estado_nuevo: 'Lleno',
      usuario_registra: usuario,
    });
  },

  // CONSUMO: Almacén → Mto/Infra/SubBase (solo llenos pedidos por ese sector)
  registrarConsumo: async (tubo_id, destino, usuario) => {
    const { data: tubo } = await supabase.from('tubos').select('*').eq('id', tubo_id).single();
    if (!tubo) throw new Error('Tubo no encontrado');
    if (tubo.estado !== 'Lleno') throw new Error('Solo se pueden consumir tubos llenos');
    if (tubo.ubicacion !== 'Almacén') throw new Error('El tubo debe estar en Almacén');
    if (tubo.pedido_por && tubo.pedido_por !== destino) throw new Error(`Este tubo fue pedido por ${tubo.pedido_por}, no por ${destino}`);

    await supabase.from('tubos').update({
      ubicacion: destino, updated_at: new Date().toISOString()
    }).eq('id', tubo_id);

    await supabase.from('movimientos').insert({
      tipo_operacion: 'Consumo',
      tubo_id, tubo_codigo: tubo.codigo, tubo_tipo: tubo.tipo,
      ubicacion_origen: 'Almacén', ubicacion_destino: destino,
      estado_anterior: 'Lleno', estado_nuevo: 'Lleno',
      usuario_registra: usuario,
    });
  },

  // DEVOLUCIÓN: Mto/Infra → Almacén (llega automáticamente vacío)
  registrarDevolucion: async (tubo_id, sector, usuario) => {
    const { data: tubo } = await supabase.from('tubos').select('*').eq('id', tubo_id).single();
    if (!tubo) throw new Error('Tubo no encontrado');
    if (tubo.ubicacion === 'Almacén') throw new Error('El tubo ya está en Almacén');
    if (tubo.ubicacion !== sector) throw new Error(`El tubo no está en ${sector}`);

    await supabase.from('tubos').update({
      ubicacion: 'Almacén', estado: 'Vacío',
      updated_at: new Date().toISOString()
    }).eq('id', tubo_id);

    await supabase.from('movimientos').insert({
      tipo_operacion: 'Devolución',
      tubo_id, tubo_codigo: tubo.codigo, tubo_tipo: tubo.tipo,
      ubicacion_origen: tubo.ubicacion, ubicacion_destino: 'Almacén',
      estado_anterior: 'Lleno', estado_nuevo: 'Vacío',
      usuario_registra: usuario,
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
    });
    return tubo;
  },

  // BAJA: tubo retirado del sistema
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
    });
  },

  // ─── HISTORIAL / CONSUMO ──────────────────────────────────────────────────

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

  // ─── CICLOS ───────────────────────────────────────────────────────────────

  getCiclos: async (mes) => {
    const { data, error } = await supabase
      .from('ciclos_mensuales').select('*').eq('mes', mes).order('tipo_tubo');
    if (error) throw new Error(error.message);
    return data;
  },

  iniciarCiclo: async (mes) => {
    const TIPOS = ['O2', 'Butano', 'N2', 'Atal'];
    for (const tipo of TIPOS) {
      const { data: tubos } = await supabase
        .from('tubos').select('alquiler_mensual, precio_transporte')
        .eq('tipo', tipo).eq('activo', true);
      if (!tubos || tubos.length === 0) continue;
      await supabase.from('ciclos_mensuales').upsert({
        mes, tipo_tubo: tipo,
        cantidad_stock: tubos.length,
        precio_alquiler_mensual: parseFloat(tubos[0]?.alquiler_mensual) || 0,
        precio_transporte_tubo: parseFloat(tubos[0]?.precio_transporte) || 0,
        cambios_realizados: 0,
      }, { onConflict: 'mes,tipo_tubo', ignoreDuplicates: true });
    }
  },

  actualizarCiclo: async ({ id, ...campos }) => {
    const { data, error } = await supabase
      .from('ciclos_mensuales').update(campos).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
};
