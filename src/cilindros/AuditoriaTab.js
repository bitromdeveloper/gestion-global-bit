import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// ============================================================================
// PESTAÑA AUDITORÍA (Panel Superadmin) — junta cilindros.auditoria y
// public.auditoria_gases en una sola vista, con filtro por módulo/usuario.
// ============================================================================

export default function AuditoriaTab() {
  const [registros, setRegistros] = useState([]);
  const [perfiles, setPerfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtroModulo, setFiltroModulo] = useState('todos'); // todos | cilindros | gases
  const [filtroUsuario, setFiltroUsuario] = useState('todos');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [{ data: audCil }, { data: audGas }, { data: perf }] = await Promise.all([
        supabase.schema('cilindros').from('auditoria').select('*').order('fecha', { ascending: false }).limit(500),
        supabase.from('auditoria_gases').select('*').order('fecha', { ascending: false }).limit(500),
        supabase.from('perfiles').select('id, nombre'),
      ]);

      const mapaPerfiles = {};
      (perf || []).forEach((p) => { mapaPerfiles[p.id] = p.nombre; });
      setPerfiles(mapaPerfiles);

      const combinado = [
        ...(audCil || []).map((r) => ({ ...r, modulo: 'cilindros' })),
        ...(audGas || []).map((r) => ({ ...r, modulo: 'gases' })),
      ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      setRegistros(combinado);
    } catch (e) {
      console.error('Error cargando auditoría:', e);
    }
    setLoading(false);
  }

  const usuariosDisponibles = useMemo(() => {
    const ids = new Set(registros.map((r) => r.usuario_id).filter(Boolean));
    return [...ids].map((id) => ({ id, nombre: perfiles[id] || id }));
  }, [registros, perfiles]);

  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) => {
      if (filtroModulo !== 'todos' && r.modulo !== filtroModulo) return false;
      if (filtroUsuario !== 'todos' && r.usuario_id !== filtroUsuario) return false;
      return true;
    });
  }, [registros, filtroModulo, filtroUsuario]);

  const ACCION_COLOR = { INSERT: '#4FA98C', UPDATE: '#E8871E', DELETE: '#C0392B' };

  if (loading) return <div style={s.loading}>Cargando auditoría...</div>;

  return (
    <div style={s.wrap}>
      <div style={s.filtros}>
        <select style={s.select} value={filtroModulo} onChange={(e) => setFiltroModulo(e.target.value)}>
          <option value="todos">Todos los módulos</option>
          <option value="cilindros">Cilindros</option>
          <option value="gases">Gases</option>
        </select>
        <select style={s.select} value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)}>
          <option value="todos">Todos los usuarios</option>
          {usuariosDisponibles.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
        <span style={s.count}>{registrosFiltrados.length} de {registros.length} (últimos 500 por módulo)</span>
        <button style={s.btnRefrescar} onClick={cargar}>↻ Actualizar</button>
      </div>

      <div style={s.tabla}>
        <div style={s.filaHeader}>
          <span style={{ width: 90 }}>Módulo</span>
          <span style={{ width: 130 }}>Tabla</span>
          <span style={{ width: 80 }}>Acción</span>
          <span style={{ width: 140 }}>Registro</span>
          <span style={{ flex: 1 }}>Usuario</span>
          <span style={{ width: 150 }}>Fecha</span>
        </div>
        {registrosFiltrados.length === 0 ? (
          <div style={s.vacio}>No hay registros con estos filtros.</div>
        ) : (
          registrosFiltrados.slice(0, 300).map((r) => (
            <div key={`${r.modulo}-${r.id}`} style={s.fila}>
              <span style={{ width: 90 }}>
                <span style={{ ...s.badgeModulo, ...(r.modulo === 'gases' ? s.badgeGases : s.badgeCilindros) }}>
                  {r.modulo}
                </span>
              </span>
              <span style={{ width: 130, color: '#D8D6D1' }}>{r.tabla}</span>
              <span style={{ width: 80, color: ACCION_COLOR[r.accion] || '#8B9199', fontWeight: 600 }}>{r.accion}</span>
              <span style={{ width: 140, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>{r.registro_pk || '—'}</span>
              <span style={{ flex: 1 }}>{perfiles[r.usuario_id] || '—'}</span>
              <span style={{ width: 150, fontSize: 11.5, color: '#8B9199' }}>{new Date(r.fecha).toLocaleString('es-AR')}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const s = {
  wrap: { padding: '24px 32px', fontFamily: "'Oswald', sans-serif", color: '#E8E6E1' },
  loading: { padding: 40, textAlign: 'center', color: '#8B9199', fontFamily: "'Oswald', sans-serif" },
  filtros: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  select: {
    padding: '7px 10px', background: '#24282C', border: '1px solid #3A4048', borderRadius: 6,
    color: '#E8E6E1', fontSize: 12.5, fontFamily: 'inherit',
  },
  count: { fontSize: 11.5, color: '#5A6068' },
  btnRefrescar: {
    marginLeft: 'auto', background: 'none', border: '1px solid #3A4048', color: '#8B9199', borderRadius: 6,
    padding: '6px 12px', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit',
  },
  tabla: { background: '#24282C', border: '1px solid #2E3338', borderRadius: 10, overflow: 'hidden' },
  filaHeader: {
    display: 'flex', padding: '10px 16px', background: '#1A1D20', fontSize: 10.5, color: '#5A6068',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  fila: {
    display: 'flex', alignItems: 'center', padding: '10px 16px', fontSize: 12.5, borderTop: '1px solid #2E3338',
  },
  vacio: { padding: 30, textAlign: 'center', color: '#5A6068', fontSize: 13 },
  badgeModulo: { fontSize: 10, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' },
  badgeCilindros: { background: 'rgba(91,122,153,0.2)', color: '#5B7A99' },
  badgeGases: { background: 'rgba(79,169,140,0.16)', color: '#4FA98C' },
};
