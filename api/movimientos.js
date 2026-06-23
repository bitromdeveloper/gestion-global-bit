const { supabase, verificarToken, corsHeaders, errorResponse } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).setHeaders(corsHeaders()).end();

  const usuario = verificarToken(req);
  if (!usuario) return errorResponse(res, 401, 'No autorizado');

  res.setHeaders(corsHeaders());

  // GET - historial (almacen, compras, admin)
  if (req.method === 'GET') {
    if (!['admin', 'almacen', 'compras'].includes(usuario.sector))
      return errorResponse(res, 403, 'Sin permisos');

    const { data, error } = await supabase
      .from('movimientos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) return errorResponse(res, 500, error.message);
    return res.status(200).json(data);
  }

  // POST - registrar movimiento (almacen y admin)
  if (req.method === 'POST') {
    if (!['admin', 'almacen'].includes(usuario.sector))
      return errorResponse(res, 403, 'Sin permisos para registrar movimientos');

    const { tubo_id, estado_nuevo, ubicacion_destino, ...resto } = req.body;

    // 1. Insertar movimiento
    const { data: mov, error: movErr } = await supabase
      .from('movimientos')
      .insert({ tubo_id, estado_nuevo, ...resto, usuario_registra: usuario.username })
      .select()
      .single();
    if (movErr) return errorResponse(res, 500, movErr.message);

    // 2. Actualizar estado del tubo
    const updates = { estado: estado_nuevo, updated_at: new Date().toISOString() };
    if (ubicacion_destino) updates.ubicacion = ubicacion_destino;
    await supabase.from('tubos').update(updates).eq('id', tubo_id);

    return res.status(201).json(mov);
  }

  return errorResponse(res, 405, 'Método no permitido');
};
