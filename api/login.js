const jwt = require('jsonwebtoken');
const { supabase, corsHeaders, errorResponse } = require('./_lib');

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type')
      .end();
  }

  if (req.method !== 'POST') return errorResponse(res, 405, 'Método no permitido');

  const { username, password } = req.body;
  if (!username || !password) return errorResponse(res, 400, 'Faltan credenciales');

  // Buscar usuario en Supabase (con service key, desde el servidor)
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, username, sector, email1, email2, email3')
    .eq('username', username.trim())
    .eq('password_hash', password)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  // Generar JWT con 8 horas de expiración
  const token = jwt.sign(
    { id: data.id, username: data.username, sector: data.sector },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return res.status(200).setHeaders(corsHeaders()).json({
    token,
    user: {
      id: data.id,
      username: data.username,
      sector: data.sector,
      email1: data.email1,
      email2: data.email2,
      email3: data.email3,
    },
  });
};
