// Cliente HTTP centralizado
// El browser NUNCA habla con Supabase directamente
// Todas las llamadas van a /api/ (Vercel Serverless Functions)

const BASE = '';  // mismo dominio, Vercel lo resuelve

function getToken() {
  return localStorage.getItem('tubos_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    // Token expirado o inválido → logout automático
    localStorage.removeItem('tubos_token');
    localStorage.removeItem('tubos_user');
    window.location.reload();
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en el servidor');
  return data;
}

// AUTH
export const api = {
  login: (username, password) =>
    request('/login', { method: 'POST', body: { username, password } }),

  // TUBOS
  getTubos: () => request('/tubos'),
  crearTubo: (tubo) => request('/tubos', { method: 'POST', body: tubo }),
  editarTubo: (tubo) => request('/tubos', { method: 'PUT', body: tubo }),

  // MOVIMIENTOS
  getMovimientos: () => request('/movimientos'),
  registrarMovimiento: (mov) => request('/movimientos', { method: 'POST', body: mov }),

  // CICLOS
  getCiclos: (mes) => request(`/ciclos?mes=${mes}`),
  iniciarCiclo: (mes) => request('/ciclos', { method: 'POST', body: { mes } }),
  actualizarCiclo: (ciclo) => request('/ciclos', { method: 'PUT', body: ciclo }),

  // PERFIL
  cambiarPassword: (passwordActual, passwordNueva) =>
    request('/perfil', { method: 'PUT', body: { tipo: 'password', passwordActual, passwordNueva } }),
  actualizarEmails: (email1, email2, email3) =>
    request('/perfil', { method: 'PUT', body: { tipo: 'emails', email1, email2, email3 } }),
};
