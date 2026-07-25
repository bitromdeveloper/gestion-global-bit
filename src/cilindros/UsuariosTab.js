import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ============================================================================
// PESTAÑA USUARIOS (Panel Superadmin) — ver, editar rol/módulo, activar o
// desactivar. NO crea usuarios nuevos: eso requiere la Service Role Key de
// Supabase, que nunca debe estar en código de frontend por seguridad. Para
// altas nuevas seguimos usando el script SQL (o, más adelante, una Edge
// Function si se quiere un botón real de "crear usuario").
// ============================================================================

const ROLES = ['admin', 'mantenimiento', 'almacen', 'compras', 'infraestructura', 'superadmin'];
const MODULOS = ['gases', 'cilindros'];

export default function UsuariosTab() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ rol: '', modulo: '', activo: true });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .order('modulo', { ascending: true, nullsFirst: true })
      .order('rol');
    if (error) console.error('Error cargando usuarios:', error);
    setUsuarios(data || []);
    setLoading(false);
  }

  function abrirEditar(u) {
    setEditandoId(u.id);
    setForm({ rol: u.rol, modulo: u.modulo || '', activo: u.activo });
  }

  async function guardar() {
    setGuardando(true);
    try {
      const { error } = await supabase
        .from('perfiles')
        .update({
          rol: form.rol,
          modulo: form.rol === 'superadmin' ? null : (form.modulo || null),
          activo: form.activo,
        })
        .eq('id', editandoId);
      if (error) {
        alert('Error al guardar: ' + error.message);
        return;
      }
      setEditandoId(null);
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  if (loading) return <div style={s.loading}>Cargando usuarios...</div>;

  return (
    <div style={s.wrap}>
      <div style={s.aviso}>
        Acá se editan roles y se activa/desactiva accesos. Para dar de alta un usuario
        nuevo, seguí usando el script SQL — crear un login nuevo requiere permisos que
        no es seguro tener en el navegador.
      </div>

      <div style={s.tabla}>
        <div style={s.filaHeader}>
          <span style={{ flex: 2 }}>Nombre</span>
          <span style={{ flex: 1 }}>Módulo</span>
          <span style={{ flex: 1 }}>Rol</span>
          <span style={{ flex: 1 }}>Estado</span>
          <span style={{ width: 90 }}></span>
        </div>

        {usuarios.map((u) => (
          <div key={u.id}>
            <div style={s.fila}>
              <span style={{ flex: 2, fontWeight: 500 }}>{u.nombre}</span>
              <span style={{ flex: 1, color: '#8B9199' }}>{u.modulo || '—'}</span>
              <span style={{ flex: 1 }}>
                <span style={{ ...s.badge, ...(u.rol === 'superadmin' ? s.badgeSuperadmin : {}) }}>{u.rol}</span>
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ ...s.badge, ...(u.activo ? s.badgeActivo : s.badgeInactivo) }}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </span>
              <span style={{ width: 90 }}>
                <button style={s.btnEditar} onClick={() => abrirEditar(u)}>Editar</button>
              </span>
            </div>

            {editandoId === u.id && (
              <div style={s.panelEdicion}>
                <div style={s.formRow}>
                  <div>
                    <div style={s.label}>Rol</div>
                    <select style={s.input} value={form.rol} onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  {form.rol !== 'superadmin' && (
                    <div>
                      <div style={s.label}>Módulo</div>
                      <select style={s.input} value={form.modulo} onChange={(e) => setForm((f) => ({ ...f, modulo: e.target.value }))}>
                        <option value="">Seleccionar...</option>
                        {MODULOS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <div style={s.label}>Estado</div>
                    <select
                      style={s.input}
                      value={form.activo ? '1' : '0'}
                      onChange={(e) => setForm((f) => ({ ...f, activo: e.target.value === '1' }))}
                    >
                      <option value="1">Activo</option>
                      <option value="0">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div style={s.acciones}>
                  <button style={s.btnCancelar} onClick={() => setEditandoId(null)}>Cancelar</button>
                  <button style={s.btnGuardar} disabled={guardando} onClick={guardar}>
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  wrap: { padding: '24px 32px', fontFamily: "'Oswald', sans-serif", color: '#E8E6E1' },
  loading: { padding: 40, textAlign: 'center', color: '#8B9199', fontFamily: "'Oswald', sans-serif" },
  aviso: {
    fontSize: 12, color: '#E8871E', background: 'rgba(232,135,30,0.1)', border: '1px solid rgba(232,135,30,0.3)',
    borderRadius: 8, padding: '10px 14px', marginBottom: 20, lineHeight: 1.5,
  },
  tabla: { background: '#24282C', border: '1px solid #2E3338', borderRadius: 10, overflow: 'hidden' },
  filaHeader: {
    display: 'flex', padding: '10px 16px', background: '#1A1D20', fontSize: 10.5, color: '#5A6068',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  fila: {
    display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, borderTop: '1px solid #2E3338',
  },
  badge: {
    fontSize: 10.5, padding: '3px 9px', borderRadius: 20, background: '#1C1F22', color: '#8B9199',
    textTransform: 'uppercase', letterSpacing: '0.02em',
  },
  badgeSuperadmin: { background: 'rgba(91,122,153,0.2)', color: '#5B7A99' },
  badgeActivo: { background: 'rgba(79,169,140,0.16)', color: '#4FA98C' },
  badgeInactivo: { background: 'rgba(192,57,43,0.16)', color: '#C0392B' },
  btnEditar: {
    background: 'none', border: '1px solid #3A4048', color: '#8B9199', borderRadius: 6,
    padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
  },
  panelEdicion: { padding: '14px 16px', background: '#1C1F22', borderTop: '1px solid #2E3338' },
  formRow: { display: 'flex', gap: 14, marginBottom: 14 },
  label: { fontSize: 10, color: '#5A6068', textTransform: 'uppercase', marginBottom: 4 },
  input: {
    padding: '7px 10px', background: '#24282C', border: '1px solid #3A4048', borderRadius: 6,
    color: '#E8E6E1', fontSize: 12.5, fontFamily: 'inherit', minWidth: 160,
  },
  acciones: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  btnCancelar: {
    background: 'none', border: '1px solid #3A4048', color: '#8B9199', borderRadius: 6,
    padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
  },
  btnGuardar: {
    background: '#5B7A99', border: '1px solid #5B7A99', color: '#fff', borderRadius: 6,
    padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
  },
};
