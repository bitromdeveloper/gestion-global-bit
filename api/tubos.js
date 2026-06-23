const { supabase, verificarToken, corsHeaders, errorResponse } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).setHeaders(corsHeaders()).end();

  const usuario = verificarToken(req);
  if (!usuario) return errorResponse(res, 401, 'No autorizado');

  res.setHeaders(corsHeaders());

  // GET - obtener todos los tubos
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('tubos')
      .select('*')
      .order('tipo')
      .order('codigo');
    if (error) return errorResponse(res, 500, error.message);
    return res.status(200).json(data);
  }

  // POST - crear tubo nuevo (solo almacen y admin)
  if (req.method === 'POST') {
    if (!['admin', 'almacen'].includes(usuario.sector))
      return errorResponse(res, 403, 'Sin permisos para esta acción');

    const { data, error } = await supabase.from('tubos').insert(req.body).select().single();
    if (error) return errorResponse(res, 500, error.message);
    return res.status(201).json(data);
  }

  // PUT - editar tubo (solo almacen y admin)
  if (req.method === 'PUT') {
    if (!['admin', 'almacen'].includes(usuario.sector))
      return errorResponse(res, 403, 'Sin permisos para esta acción');

    const { id, ...campos } = req.body;
    if (!id) return errorResponse(res, 400, 'Falta el ID del tubo');

    const { data, error } = await supabase
      .from('tubos')
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return errorResponse(res, 500, error.message);
    return res.status(200).json(data);
  }

  return errorResponse(res, 405, 'Método no permitido');
};
