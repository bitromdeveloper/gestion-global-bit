const { supabase, verificarToken, corsHeaders, errorResponse } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).setHeaders(corsHeaders()).end();

  const usuario = verificarToken(req);
  if (!usuario) return errorResponse(res, 401, 'No autorizado');

  res.setHeaders(corsHeaders());

  // PUT - cambiar contraseña o emails
  if (req.method === 'PUT') {
    const { tipo, passwordActual, passwordNueva, email1, email2, email3 } = req.body;

    if (tipo === 'password') {
      // Verificar contraseña actual
      const { data, error } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', usuario.id)
        .eq('password_hash', passwordActual)
        .single();

      if (error || !data) return errorResponse(res, 401, 'Contraseña actual incorrecta');

      const { error: upErr } = await supabase
        .from('usuarios')
        .update({ password_hash: passwordNueva, updated_at: new Date().toISOString() })
        .eq('id', usuario.id);

      if (upErr) return errorResponse(res, 500, 'Error al actualizar contraseña');
      return res.status(200).json({ success: true });
    }

    if (tipo === 'emails') {
      const { error } = await supabase
        .from('usuarios')
        .update({ email1: email1 || null, email2: email2 || null, email3: email3 || null, updated_at: new Date().toISOString() })
        .eq('id', usuario.id);

      if (error) return errorResponse(res, 500, 'Error al actualizar emails');
      return res.status(200).json({ success: true });
    }

    return errorResponse(res, 400, 'Tipo de actualización inválido');
  }

  return errorResponse(res, 405, 'Método no permitido');
};
