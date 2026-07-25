import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ============================================================================
// PENDIENTES DE CATALOGAR — códigos que se dieron de alta solos al importar
// un reporte. Un admin les asigna descripción + equipo (de los YA existentes,
// nunca texto libre) con recomendación por similitud, y confirma con su
// contraseña antes de guardar. Queda registrado quién dio de alta y quién
// aprobó cada uno.
// ============================================================================

// Similitud simple por superposición de palabras (sin librerías externas).
// Sirve para ordenar las opciones más parecidas arriba del desplegable.
function similitud(a, b) {
  const norm = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÑ\s]/g, ' ').split(/\s+/).filter(Boolean);
  const palabrasA = new Set(norm(a));
  const palabrasB = new Set(norm(b));
  if (palabrasA.size === 0 || palabrasB.size === 0) return 0;
  let comunes = 0;
  palabrasA.forEach((p) => { if (palabrasB.has(p)) comunes++; });
  return comunes / Math.max(palabrasA.size, palabrasB.size);
}

export default function PendientesCatalogacion({ usuarioId, onCerrar, onActualizado }) {
  const [pendientes, setPendientes] = useState([]);
  const [descripcionesExistentes, setDescripcionesExistentes] = useState([]);
  const [equiposExistentes, setEquiposExistentes] = useState([]);
  const [equipoPorDescripcion, setEquipoPorDescripcion] = useState({});
  const [perfilesNombre, setPerfilesNombre] = useState({});
  const [loading, setLoading] = useState(true);
  const [seleccion, setSeleccion] = useState({}); // codigo -> { descripcion, equipo }
  const [confirmandoCodigo, setConfirmandoCodigo] = useState(null);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorConfirm, setErrorConfirm] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [{ data: todos, error }, { data: perfiles }] = await Promise.all([
        supabase.schema('cilindros').from('catalogo').select('*'),
        supabase.from('perfiles').select('id, nombre'),
      ]);
      if (error) throw error;

      setPendientes((todos || []).filter((c) => c.pendiente_revision));

      const mapaNombres = {};
      (perfiles || []).forEach((p) => { mapaNombres[p.id] = p.nombre; });
      setPerfilesNombre(mapaNombres);

      const unicas = [...new Set((todos || []).map((c) => c.descripcion_unificada).filter(Boolean))].sort();
      setDescripcionesExistentes(unicas);

      const equipos = [...new Set((todos || []).map((c) => c.equipo).filter(Boolean))].sort();
      setEquiposExistentes(equipos);

      // Para cada descripción, cuál es el equipo más común entre los códigos que ya la usan
      const conteo = {};
      (todos || []).forEach((c) => {
        if (!c.descripcion_unificada || !c.equipo) return;
        conteo[c.descripcion_unificada] = conteo[c.descripcion_unificada] || {};
        conteo[c.descripcion_unificada][c.equipo] = (conteo[c.descripcion_unificada][c.equipo] || 0) + 1;
      });
      const equipoRecomendado = {};
      Object.entries(conteo).forEach(([desc, mapa]) => {
        equipoRecomendado[desc] = Object.entries(mapa).sort((a, b) => b[1] - a[1])[0][0];
      });
      setEquipoPorDescripcion(equipoRecomendado);
    } catch (e) {
      console.error('Error cargando pendientes:', e);
    }
    setLoading(false);
  }

  function elegirDescripcion(codigo, descripcion) {
    setSeleccion((s) => ({
      ...s,
      [codigo]: { descripcion, equipo: equipoPorDescripcion[descripcion] || s[codigo]?.equipo || '' },
    }));
  }

  function elegirEquipo(codigo, equipo) {
    setSeleccion((s) => ({ ...s, [codigo]: { ...s[codigo], equipo } }));
  }

  function descripcionesOrdenadasPor(descripcionCruda) {
    return [...descripcionesExistentes]
      .map((d) => ({ d, score: similitud(descripcionCruda, d) }))
      .sort((a, b) => b.score - a.score);
  }

  function abrirConfirmacion(codigo) {
    const sel = seleccion[codigo];
    if (!sel?.descripcion) {
      alert('Elegí una descripción de la lista.');
      return;
    }
    setErrorConfirm('');
    setPasswordConfirm('');
    setConfirmandoCodigo(codigo);
  }

  async function confirmarYGuardar() {
    setErrorConfirm('');
    if (!passwordConfirm) {
      setErrorConfirm('Ingresá tu contraseña para confirmar.');
      return;
    }
    setGuardando(true);
    try {
      // Reautentica con la contraseña ingresada — si es incorrecta, falla acá
      // y no se guarda nada.
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email;
      const { error: errorAuth } = await supabase.auth.signInWithPassword({ email, password: passwordConfirm });
      if (errorAuth) {
        setErrorConfirm('Contraseña incorrecta.');
        setGuardando(false);
        return;
      }

      const codigo = confirmandoCodigo;
      const sel = seleccion[codigo];

      const { error } = await supabase
        .schema('cilindros')
        .from('catalogo')
        .update({
          descripcion_unificada: sel.descripcion,
          equipo: sel.equipo || null,
          pendiente_revision: false,
          aprobado_por: usuarioId || null,
          aprobado_en: new Date().toISOString(),
        })
        .eq('codigo', codigo);

      if (error) {
        setErrorConfirm('Error al guardar: ' + error.message);
        setGuardando(false);
        return;
      }

      setConfirmandoCodigo(null);
      setPasswordConfirm('');
      await cargar();
      if (onActualizado) await onActualizado();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.card} onClick={(e) => e.stopPropagation()}>
        <div style={s.titulo}>Pendientes de catalogar {pendientes.length > 0 ? `(${pendientes.length})` : ''}</div>
        <p style={s.texto}>
          Estos códigos se dieron de alta solos al importar un reporte. Elegí para cada uno
          una descripción y equipo de los que ya existen (se ordenan por similitud con el
          nombre que trajo el reporte). Si hace falta una categoría nueva de verdad, se agrega
          a mano en la tabla de catálogo — esto acá no lo permite.
        </p>

        {loading ? (
          <div style={s.vacio}>Cargando...</div>
        ) : pendientes.length === 0 ? (
          <div style={s.vacioOk}>No hay ningún código pendiente de catalogar. 🎉</div>
        ) : (
          <div style={s.lista}>
            {pendientes.map((p) => {
              const opciones = descripcionesOrdenadasPor(p.descripcion_original);
              const sel = seleccion[p.codigo] || {};
              return (
                <div key={p.codigo} style={s.fila}>
                  <div style={s.filaTop}>
                    <div style={s.filaInfo}>
                      <span style={s.codigo}>{p.codigo}</span>
                      <span style={s.descripcionCruda}>{p.descripcion_original}</span>
                      {p.creado_por && (
                        <span style={s.trazabilidad}>Dado de alta por: {perfilesNombre[p.creado_por] || '—'}</span>
                      )}
                    </div>
                  </div>

                  {confirmandoCodigo === p.codigo ? (
                    <div style={s.confirmBox}>
                      <div style={s.confirmTexto}>
                        Vas a catalogar <strong>{p.codigo}</strong> como <strong>{sel.descripcion}</strong>
                        {sel.equipo ? ` (${sel.equipo})` : ''}. Ingresá tu contraseña para confirmar:
                      </div>
                      <input
                        type="password"
                        style={s.inputPassword}
                        placeholder="Tu contraseña"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') confirmarYGuardar(); }}
                        autoFocus
                      />
                      {errorConfirm && <div style={s.errorTexto}>{errorConfirm}</div>}
                      <div style={s.confirmAcciones}>
                        <button style={s.btnSecundario} onClick={() => setConfirmandoCodigo(null)}>Cancelar</button>
                        <button style={s.btnAsignar} disabled={guardando} onClick={confirmarYGuardar}>
                          {guardando ? 'Confirmando...' : 'Confirmar y guardar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={s.filaSelects}>
                      <select
                        style={s.select}
                        value={sel.descripcion || ''}
                        onChange={(e) => elegirDescripcion(p.codigo, e.target.value)}
                      >
                        <option value="">Elegir descripción...</option>
                        {opciones.map(({ d, score }) => (
                          <option key={d} value={d}>
                            {score > 0.3 ? '⭐ ' : ''}{d}
                          </option>
                        ))}
                      </select>
                      <select
                        style={s.select}
                        value={sel.equipo || ''}
                        onChange={(e) => elegirEquipo(p.codigo, e.target.value)}
                      >
                        <option value="">Equipo (opcional)...</option>
                        {equiposExistentes.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
                      </select>
                      <button style={s.btnAsignar} onClick={() => abrirConfirmacion(p.codigo)}>
                        Asignar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={s.acciones}>
          <button style={s.btnSecundario} onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  card: {
    background: '#24282C', border: '1px solid #3A4048', borderRadius: 10, padding: 24, width: 720,
    maxHeight: '80vh', overflowY: 'auto', fontFamily: "'Oswald', sans-serif", color: '#E8E6E1',
  },
  titulo: { fontSize: 15, fontWeight: 600, marginBottom: 10 },
  texto: { fontSize: 12, color: '#8B9199', lineHeight: 1.5, marginBottom: 16 },
  vacio: { padding: 20, textAlign: 'center', color: '#8B9199', fontSize: 13 },
  vacioOk: { padding: 20, textAlign: 'center', color: '#4FA98C', fontSize: 13 },
  lista: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 },
  fila: {
    display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', background: '#1C1F22',
    border: '1px solid #2E3338', borderRadius: 8,
  },
  filaTop: { display: 'flex' },
  filaInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  codigo: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, fontWeight: 500 },
  descripcionCruda: { fontSize: 11.5, color: '#8B9199' },
  trazabilidad: { fontSize: 10.5, color: '#5A6068', fontStyle: 'italic' },
  filaSelects: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  select: {
    padding: '7px 10px', background: '#24282C', border: '1px solid #3A4048', borderRadius: 6,
    color: '#E8E6E1', fontSize: 12, fontFamily: 'inherit', minWidth: 200, flex: 1,
  },
  btnAsignar: {
    background: '#5B7A99', border: '1px solid #5B7A99', color: '#fff', borderRadius: 6,
    padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
  },
  confirmBox: {
    background: '#24282C', border: '1px solid #E8871E', borderRadius: 8, padding: 12,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  confirmTexto: { fontSize: 12, color: '#D8D6D1', lineHeight: 1.5 },
  inputPassword: {
    padding: '8px 10px', background: '#1C1F22', border: '1px solid #3A4048', borderRadius: 6,
    color: '#E8E6E1', fontSize: 12.5, fontFamily: 'inherit',
  },
  errorTexto: { fontSize: 11.5, color: '#C0392B' },
  confirmAcciones: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  acciones: { display: 'flex', justifyContent: 'flex-end' },
  btnSecundario: { background: '#1C1F22', border: '1px solid #3A4048', color: '#D8D6D1', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
};
