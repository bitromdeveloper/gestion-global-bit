import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import styles from './styles';

// ============================================================================
// PESTAÑA UNIDADES — alta / edición / activar-desactivar de la flota.
// Estas son las unidades que después aparecen como destino al asignar un
// cilindro (estado "en_uso" en Registrar movimiento).
// ============================================================================
export default function UnidadesTab({ unidades, puedeGestionar, onRefresh }) {
  const [query, setQuery] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ identificador: '', equipo: '', descripcion: '' });
  const [guardando, setGuardando] = useState(false);
  const [mostrarInactivas, setMostrarInactivas] = useState(false);

  const unidadesFiltradas = useMemo(() => {
    let lista = unidades;
    if (!mostrarInactivas) lista = lista.filter((u) => u.activa);
    if (query.trim()) {
      const q = query.trim().toUpperCase();
      lista = lista.filter(
        (u) => u.identificador?.toUpperCase().includes(q) || u.equipo?.toUpperCase().includes(q)
      );
    }
    return [...lista].sort((a, b) => (a.identificador || '').localeCompare(b.identificador || ''));
  }, [unidades, query, mostrarInactivas]);

  function abrirNueva() {
    setEditandoId(null);
    setForm({ identificador: '', equipo: '', descripcion: '' });
    setMostrarForm(true);
  }

  function abrirEditar(u) {
    setEditandoId(u.id);
    setForm({ identificador: u.identificador || '', equipo: u.equipo || '', descripcion: u.descripcion || '' });
    setMostrarForm(true);
  }

  async function guardar() {
    if (!form.identificador.trim()) {
      alert('El identificador de la unidad es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      let error;
      if (editandoId) {
        ({ error } = await supabase
          .schema('cilindros')
          .from('unidades')
          .update({ identificador: form.identificador, equipo: form.equipo || null, descripcion: form.descripcion || null })
          .eq('id', editandoId));
      } else {
        ({ error } = await supabase
          .schema('cilindros')
          .from('unidades')
          .insert({ identificador: form.identificador, equipo: form.equipo || null, descripcion: form.descripcion || null, activa: true }));
      }
      if (error) {
        console.error('Error al guardar unidad:', error);
        alert('Error al guardar: ' + error.message);
        return;
      }
      setMostrarForm(false);
      setForm({ identificador: '', equipo: '', descripcion: '' });
      setEditandoId(null);
      await onRefresh();
    } catch (e) {
      console.error('Excepción al guardar unidad:', e);
      alert('Ocurrió un error inesperado. Mirá la consola.');
    } finally {
      setGuardando(false);
    }
  }

  async function toggleActiva(u) {
    const accion = u.activa ? 'desactivar' : 'reactivar';
    if (!window.confirm(`¿${accion === 'desactivar' ? 'Desactivar' : 'Reactivar'} la unidad "${u.identificador}"?`)) return;
    const { error } = await supabase
      .schema('cilindros')
      .from('unidades')
      .update({ activa: !u.activa })
      .eq('id', u.id);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    await onRefresh();
  }

  return (
    <div style={styles.unidadesWrap}>
      <div style={styles.filterBar}>
        <input
          placeholder="Buscar unidad..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.filterInput}
        />
        <button
          style={{ ...styles.filterClearBtn, ...(mostrarInactivas ? styles.filterToggleActive : {}) }}
          onClick={() => setMostrarInactivas((v) => !v)}
        >
          {mostrarInactivas ? 'Ocultar' : 'Mostrar'} inactivas
        </button>
        <span style={styles.filterCount}>{unidadesFiltradas.length} de {unidades.length}</span>
        {puedeGestionar && (
          <button style={styles.adminBtnPrimary} onClick={abrirNueva}>+ Nueva unidad</button>
        )}
      </div>

      {mostrarForm && (
        <div style={styles.adminPanel}>
          <div style={styles.adminPanelTitle}>{editandoId ? 'Editar unidad' : 'Nueva unidad'}</div>
          <div style={styles.adminFormRow}>
            <div style={{ width: 200 }}>
              <div style={styles.fieldLabel}>Identificador *</div>
              <input
                style={styles.adminInput}
                placeholder="Ej: AMS-04, HIDROGRUA-02"
                value={form.identificador}
                onChange={(e) => setForm((f) => ({ ...f, identificador: e.target.value }))}
              />
            </div>
            <div style={{ width: 200 }}>
              <div style={styles.fieldLabel}>Equipo</div>
              <input
                style={styles.adminInput}
                placeholder="Ej: AMS"
                value={form.equipo}
                onChange={(e) => setForm((f) => ({ ...f, equipo: e.target.value }))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.fieldLabel}>Detalle (opcional)</div>
              <input
                style={styles.adminInput}
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
          </div>
          <div style={styles.adminFormActions}>
            <button style={styles.adminBtn} onClick={() => setMostrarForm(false)}>Cancelar</button>
            <button style={styles.adminBtnPrimary} disabled={guardando} onClick={guardar}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {unidadesFiltradas.length === 0 ? (
        <div style={styles.filterEmpty}>
          {unidades.length === 0
            ? 'Todavía no hay ninguna unidad dada de alta.'
            : 'No hay unidades que coincidan con la búsqueda.'}
        </div>
      ) : (
        <div style={styles.unidadesGrid}>
          {unidadesFiltradas.map((u) => (
            <div key={u.id} style={{ ...styles.unidadCard, ...(!u.activa ? styles.codeCardInactivo : {}) }}>
              {!u.activa && <div style={styles.bajaTag}>INACTIVA</div>}
              <div style={styles.unidadNombre}>{u.identificador}</div>
              {u.equipo && <div style={styles.unidadEquipo}>{u.equipo}</div>}
              {u.descripcion && <div style={styles.unidadDescripcion}>{u.descripcion}</div>}
              {puedeGestionar && (
                <div style={styles.unidadAcciones}>
                  <button style={styles.adminBtn} onClick={() => abrirEditar(u)}>Editar</button>
                  <button
                    style={u.activa ? styles.adminBtn : styles.adminBtnBaja}
                    onClick={() => toggleActiva(u)}
                  >
                    {u.activa ? 'Desactivar' : 'Reactivar'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
