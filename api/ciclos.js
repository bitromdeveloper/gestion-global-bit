const { supabase, verificarToken, corsHeaders, errorResponse } = require('./_lib');

const TIPOS_TUBO = ['O2', 'Butano', 'N2', 'Atal'];

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).setHeaders(corsHeaders()).end();

  const usuario = verificarToken(req);
  if (!usuario) return errorResponse(res, 401, 'No autorizado');

  if (!['admin', 'compras'].includes(usuario.sector))
    return errorResponse(res, 403, 'Sin permisos');

  res.setHeaders(corsHeaders());

  // GET - obtener ciclos de un mes
  if (req.method === 'GET') {
    const mes = req.query.mes;
    if (!mes) return errorResponse(res, 400, 'Falta el parámetro mes');

    const { data, error } = await supabase
      .from('ciclos_mensuales')
      .select('*')
      .eq('mes', mes)
      .order('tipo_tubo');
    if (error) return errorResponse(res, 500, error.message);
    return res.status(200).json(data);
  }

  // POST - iniciar ciclo del mes desde inventario actual
  if (req.method === 'POST') {
    const { mes } = req.body;
    if (!mes) return errorResponse(res, 400, 'Falta el mes');

    const resultados = [];
    for (const tipo of TIPOS_TUBO) {
      const { data: tubosData } = await supabase
        .from('tubos')
        .select('alquiler_mensual, precio_transporte')
        .eq('tipo', tipo)
        .eq('activo', true);

      if (!tubosData || tubosData.length === 0) continue;

      const cantidad = tubosData.length;
      const alquiler = parseFloat(tubosData[0]?.alquiler_mensual) || 0;
      const transporte = parseFloat(tubosData[0]?.precio_transporte) || 0;

      const { data } = await supabase.from('ciclos_mensuales').upsert({
        mes,
        tipo_tubo: tipo,
        cantidad_stock: cantidad,
        precio_alquiler_mensual: alquiler,
        precio_transporte_tubo: transporte,
        cambios_realizados: 0,
      }, { onConflict: 'mes,tipo_tubo', ignoreDuplicates: true }).select().single();

      if (data) resultados.push(data);
    }
    return res.status(201).json(resultados);
  }

  // PUT - actualizar un campo de un ciclo
  if (req.method === 'PUT') {
    const { id, ...campos } = req.body;
    if (!id) return errorResponse(res, 400, 'Falta el ID');

    const { data, error } = await supabase
      .from('ciclos_mensuales')
      .update(campos)
      .eq('id', id)
      .select()
      .single();
    if (error) return errorResponse(res, 500, error.message);
    return res.status(200).json(data);
  }

  return errorResponse(res, 405, 'Método no permitido');
};
