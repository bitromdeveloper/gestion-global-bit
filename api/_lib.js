const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Estas variables SOLO existen en el servidor de Vercel, nunca llegan al browser
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key, no anon key
);

const JWT_SECRET = process.env.JWT_SECRET;

// Verificar token en cada request
function verificarToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
}

// Headers CORS estándar
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

// Respuesta de error
function errorResponse(res, status, message) {
  return res.status(status).json({ error: message });
}

module.exports = { supabase, verificarToken, corsHeaders, errorResponse };
