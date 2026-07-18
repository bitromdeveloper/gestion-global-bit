import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';

// ============================================================================
// Igual que antes, pero en vez de traer los datos embebidos en el archivo,
// los lee en vivo de Supabase (cilindros.catalogo + cilindros.reparaciones).
// Cualquier cambio en la base (nuevas reparaciones, correcciones de
// descripciones, etc.) se refleja solo, sin tocar este componente.
// ============================================================================

const STATUS_STYLE = {
  'Reparado - Recibido en Almacén': { color: '#4FA98C', bg: 'rgba(79,169,140,0.14)', label: 'Reparado — en almacén', dot: '#4FA98C' },
  'En poder del proveedor (en reparación)': { color: '#E8871E', bg: 'rgba(232,135,30,0.14)', label: 'En poder del proveedor', dot: '#E8871E' },
  'SIN_REPARACIONES': { color: '#5A6068', bg: 'rgba(90,96,104,0.12)', label: 'Sin reparaciones registradas', dot: '#5A6068' },
};

const ESTADO_OPERATIVO_STYLE = {
  en_uso:          { label: 'En uso',                    color: '#5B7A99', bg: 'rgba(91,122,153,0.16)' },
  en_stock:        { label: 'En stock (reparado)',        color: '#4FA98C', bg: 'rgba(79,169,140,0.16)' },
  en_proveedor:    { label: 'En poder del proveedor',     color: '#E8871E', bg: 'rgba(232,135,30,0.16)' },
  roto_en_almacen: { label: 'Roto — en almacén',          color: '#C0392B', bg: 'rgba(192,57,43,0.16)' },
  baja:            { label: 'Dado de baja',               color: '#5A6068', bg: 'rgba(90,96,104,0.16)' },
};

function parseDate(s) {
  if (!s) return null;
  return new Date(s);
}

function fmtMoney(n, currency) {
  if (n === null || n === undefined || n === '') return '—';
  const v = Number(n);
  return (currency === 'USD' ? 'US$ ' : '$ ') + v.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString('es-AR');
}

function diasDesde(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d)) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function fmtHaceTiempo(s) {
  const dias = diasDesde(s);
  if (dias === null) return '';
  if (dias < 0) return '';
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  if (dias < 365) return `hace ${Math.floor(dias / 30)} ${Math.floor(dias / 30) === 1 ? 'mes' : 'meses'}`;
  return `hace ${Math.floor(dias / 365)} ${Math.floor(dias / 365) === 1 ? 'año' : 'años'}`;
}

const ANIOS_SIN_ACTIVIDAD_PARA_BAJA = 4;

function esInactivo(fechaUltimaOc) {
  if (!fechaUltimaOc) return true; // nunca tuvo ninguna OC
  const dias = diasDesde(fechaUltimaOc);
  return dias === null || dias > ANIOS_SIN_ACTIVIDAD_PARA_BAJA * 365;
}

export default function CilindrosApp() {
  const { user, logout, changePassword } = useAuth();
  const esAdmin = user?.rol === 'admin' || user?.rol === 'superadmin';
  const puedeDarBaja = esAdmin || user?.rol === 'almacen';

  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [mostrarCambiarPass, setMostrarCambiarPass] = useState(false);
  const [passForm, setPassForm] = useState({ actual: '', nueva: '', confirmar: '' });
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });
  const [guardandoPass, setGuardandoPass] = useState(false);

  async function handleCambiarPassword(e) {
    e.preventDefault();
    setPassMsg({ type: '', text: '' });
    if (passForm.nueva !== passForm.confirmar) { setPassMsg({ type: 'error', text: 'Las contraseñas no coinciden' }); return; }
    if (passForm.nueva.length < 6) { setPassMsg({ type: 'error', text: 'Mínimo 6 caracteres' }); return; }
    setGuardandoPass(true);
    const result = await changePassword(passForm.actual, passForm.nueva);
    setGuardandoPass(false);
    if (result.error) setPassMsg({ type: 'error', text: result.error });
    else {
      setPassMsg({ type: 'success', text: '✓ Contraseña actualizada' });
      setPassForm({ actual: '', nueva: '', confirmar: '' });
    }
  }

  const [catalogo, setCatalogo] = useState([]);
  const [reparaciones, setReparaciones] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function fetchTodo(tabla) {
    const PAGE = 1000;
    let desde = 0;
    let todo = [];
    while (true) {
      const { data, error } = await supabase
        .schema('cilindros')
        .from(tabla)
        .select('*')
        .range(desde, desde + PAGE - 1);
      if (error) throw error;
      todo = todo.concat(data || []);
      if (!data || data.length < PAGE) break; // llegamos al final
      desde += PAGE;
    }
    return todo;
  }

  async function cargarDatos() {
    setLoading(true);
    setError(null);
    try {
      const [cat, rep, mov] = await Promise.all([
        fetchTodo('catalogo'),
        fetchTodo('reparaciones'),
        fetchTodo('movimientos'),
      ]);
      setCatalogo(cat);
      // Filtro de seguridad: una reparación sin OC definitiva no es una reparación
      // real (quedó como solicitud que nunca se concretó). Ya se limpiaron de la
      // base, pero esto evita que vuelvan a colarse si alguien carga una a mano.
      setReparaciones((rep || []).filter((r) => !!r.oc_definitiva));
      setMovimientos(mov || []);
    } catch (e) {
      console.error('Error cargando datos de cilindros:', e);
      setError('No se pudieron cargar los datos. Reintentá en unos segundos.');
    }
    setLoading(false);
  }

  const data = useMemo(() => {
    const repPorCodigo = {};
    reparaciones.forEach((r) => {
      if (!repPorCodigo[r.codigo]) repPorCodigo[r.codigo] = [];
      repPorCodigo[r.codigo].push(r);
    });

    return catalogo.flatMap((c) => {
      const reps = repPorCodigo[c.codigo];
      if (!reps || reps.length === 0) {
        return [{
          codigo: c.codigo,
          descripcion_original: c.descripcion_original,
          descripcion_corta: c.descripcion_original,
          equipo: c.equipo,
          grupo_final: c.descripcion_unificada || c.equipo || 'SIN CLASIFICAR',
          fecha_solicitud: null,
          proveedor: null,
          oc_definitiva: null,
          precio_total: null,
          moneda: 'ARS',
          remito_nro: null,
          remito_estado: null,
          remito_fecha: null,
          factura_numero: null,
          factura_estado: null,
          estado_reparacion: 'SIN_REPARACIONES',
        }];
      }
      return reps.map((r) => ({
        codigo: c.codigo,
        descripcion_original: c.descripcion_original,
        descripcion_corta: c.descripcion_original,
        equipo: c.equipo,
        grupo_final: c.descripcion_unificada || c.equipo || 'SIN CLASIFICAR',
        fecha_solicitud: r.fecha_solicitud,
        proveedor: r.proveedor,
        oc_definitiva: r.oc_definitiva,
        precio_total: r.precio_total,
        moneda: r.moneda,
        remito_nro: r.remito_nro,
        remito_estado: r.remito_estado,
        remito_fecha: r.remito_fecha,
        factura_numero: r.factura_numero,
        factura_estado: r.factura_estado,
        estado_reparacion: r.estado_reparacion,
      }));
    });
  }, [catalogo, reparaciones]);

  const groups = useMemo(() => {
    const map = {};
    data.forEach((r) => {
      const key = r.grupo_final;
      if (!map[key]) map[key] = { name: key, codes: new Set(), rows: [] };
      map[key].codes.add(r.codigo);
      map[key].rows.push(r);
    });
    return Object.values(map).map((g) => {
      const fechas = g.rows.map((r) => r.fecha_solicitud).filter(Boolean).sort().reverse();
      return { ...g, codeCount: g.codes.size, repairCount: g.rows.length, ultimaActividad: fechas[0] || null };
    });
  }, [data]);

  const [ordenSidebar, setOrdenSidebar] = useState('cantidad'); // 'cantidad' | 'reciente'

  const groupsOrdenados = useMemo(() => {
    const copia = [...groups];
    if (ordenSidebar === 'reciente') {
      copia.sort((a, b) => {
        if (!a.ultimaActividad) return 1;
        if (!b.ultimaActividad) return -1;
        return b.ultimaActividad.localeCompare(a.ultimaActividad);
      });
    } else {
      copia.sort((a, b) => b.codeCount - a.codeCount);
    }
    return copia;
  }, [groups, ordenSidebar]);

  const [query, setQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [codeQuery, setCodeQuery] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [ocultarInactivos, setOcultarInactivos] = useState(false);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groupsOrdenados;
    const q = query.trim().toUpperCase();
    return groupsOrdenados.filter(
      (g) => g.name.toUpperCase().includes(q) || g.rows.some((r) => r.codigo.toUpperCase().includes(q))
    );
  }, [groupsOrdenados, query]);

  const activeGroup = groupsOrdenados.find((g) => g.name === selectedGroup) || null;

  const codesInGroup = useMemo(() => {
    if (!activeGroup) return [];
    const byCode = {};
    activeGroup.rows.forEach((r) => {
      if (!byCode[r.codigo]) byCode[r.codigo] = [];
      byCode[r.codigo].push(r);
    });
    return Object.entries(byCode)
      .map(([codigo, rows]) => {
        const sorted = [...rows].sort((a, b) => (parseDate(b.fecha_solicitud) || 0) - (parseDate(a.fecha_solicitud) || 0));
        return { codigo, rows: sorted, last: sorted[0], count: rows.length };
      })
      .sort((a, b) => (parseDate(b.last.fecha_solicitud) || 0) - (parseDate(a.last.fecha_solicitud) || 0));
  }, [activeGroup]);

  const chartMensual = useMemo(() => {
    if (!activeGroup) return [];
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().slice(0, 7);
    });
    return meses.map((m) => ({
      mes: m,
      label: new Date(m + '-01').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
      cantidad: activeGroup.rows.filter((r) => r.fecha_solicitud && r.fecha_solicitud.startsWith(m)).length,
    }));
  }, [activeGroup]);

  const codesInGroupFiltrados = useMemo(() => {
    let filtrados = codesInGroup;
    if (codeQuery.trim()) {
      const q = codeQuery.trim().toUpperCase();
      filtrados = filtrados.filter((c) => c.codigo.toUpperCase().includes(q));
    }
    if (fechaDesde) {
      filtrados = filtrados.filter((c) => c.last.fecha_solicitud && c.last.fecha_solicitud >= fechaDesde);
    }
    if (fechaHasta) {
      filtrados = filtrados.filter((c) => c.last.fecha_solicitud && c.last.fecha_solicitud <= fechaHasta);
    }
    if (ocultarInactivos) {
      filtrados = filtrados.filter((c) => !esInactivo(c.last.fecha_solicitud));
    }
    return filtrados;
  }, [codesInGroup, codeQuery, fechaDesde, fechaHasta, ocultarInactivos]);

  const cantidadInactivosEnGrupo = useMemo(
    () => codesInGroup.filter((c) => esInactivo(c.last.fecha_solicitud)).length,
    [codesInGroup]
  );

  const historialMovimientos = useMemo(() => {
    if (!selectedCode) return [];
    return movimientos
      .filter((m) => m.codigo === selectedCode)
      .sort((a, b) => b.id - a.id);
  }, [selectedCode, movimientos]);

  const selectedCodeRows = useMemo(() => {
    if (!selectedCode) return [];
    return data
      .filter((r) => r.codigo === selectedCode)
      .sort((a, b) => (parseDate(b.fecha_solicitud) || 0) - (parseDate(a.fecha_solicitud) || 0));
  }, [selectedCode, data]);

  const estadoActualPorCodigo = useMemo(() => {
    // Importante: se compara por "id" (orden real de creación en la base), no por
    // "fecha" — la fecha se puede editar a mano al dar de baja (para poner una
    // fecha pasada), así que no sirve para saber qué movimiento es el más reciente
    // de verdad. El id (autoincremental) nunca miente sobre el orden real.
    const map = {};
    movimientos.forEach((m) => {
      const actual = map[m.codigo];
      if (!actual || m.id > actual.id) map[m.codigo] = m;
    });
    return map;
  }, [movimientos]);

  // ---- Edición de catalogación (solo admin) ----
  const [editandoCatalogo, setEditandoCatalogo] = useState(false);
  const [formCatalogo, setFormCatalogo] = useState({ descripcion_unificada: '', equipo: '' });
  const [guardandoCatalogo, setGuardandoCatalogo] = useState(false);

  // ---- Registrar movimiento (solo admin) ----
  const [mostrarFormMovimiento, setMostrarFormMovimiento] = useState(false);
  const [formMovimiento, setFormMovimiento] = useState({ estado: 'en_stock', proveedor: '', observaciones: '' });
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);

  // ---- Dar de baja (admin + almacén) ----
  const hoyISO = () => new Date().toISOString().slice(0, 10);
  const [mostrarFormBaja, setMostrarFormBaja] = useState(false);
  const [formBaja, setFormBaja] = useState({ fecha: hoyISO(), motivo: '' });
  const [guardandoBaja, setGuardandoBaja] = useState(false);
  const [cancelandoBaja, setCancelandoBaja] = useState(false);
  const [mostrarHistorialMovimientos, setMostrarHistorialMovimientos] = useState(false);

  async function guardarCatalogacion(codigo) {
    setGuardandoCatalogo(true);
    const { error } = await supabase
      .schema('cilindros')
      .from('catalogo')
      .update({
        descripcion_unificada: formCatalogo.descripcion_unificada,
        equipo: formCatalogo.equipo,
        actualizado_en: new Date().toISOString(),
      })
      .eq('codigo', codigo);
    setGuardandoCatalogo(false);
    if (error) {
      alert('Error al guardar: ' + error.message);
      return;
    }
    setEditandoCatalogo(false);
    await cargarDatos();
  }

  async function registrarMovimiento(codigo) {
    setGuardandoMovimiento(true);
    const { error } = await supabase
      .schema('cilindros')
      .from('movimientos')
      .insert({
        codigo,
        estado: formMovimiento.estado,
        proveedor: formMovimiento.estado === 'en_proveedor' ? formMovimiento.proveedor : null,
        observaciones: formMovimiento.observaciones || null,
        registrado_por: user?.id || null,
      });
    setGuardandoMovimiento(false);
    if (error) {
      alert('Error al registrar el movimiento: ' + error.message);
      return;
    }
    setMostrarFormMovimiento(false);
    setFormMovimiento({ estado: 'en_stock', proveedor: '', observaciones: '' });
    await cargarDatos();
  }

  async function darDeBaja(codigo) {
    if (!formBaja.motivo.trim()) {
      alert('Contá el motivo de la baja (rotura irreparable, etc.)');
      return;
    }
    setGuardandoBaja(true);
    try {
      const { data, error } = await supabase
        .schema('cilindros')
        .from('movimientos')
        .insert({
          codigo,
          estado: 'baja',
          observaciones: formBaja.motivo,
          fecha: new Date(formBaja.fecha + 'T12:00:00').toISOString(),
          registrado_por: user?.id || null,
        })
        .select();

      if (error) {
        console.error('Error de Supabase al dar de baja:', error);
        alert('Error al registrar la baja: ' + error.message);
        return;
      }
      if (!data || data.length === 0) {
        console.error('El insert de la baja no devolvió filas — posible bloqueo de RLS.');
        alert('No se pudo registrar la baja: el servidor no confirmó el cambio. Revisá la consola.');
        return;
      }
      console.log('Baja registrada correctamente:', data);
      setMostrarFormBaja(false);
      setFormBaja({ fecha: hoyISO(), motivo: '' });
      await cargarDatos();
    } catch (e) {
      console.error('Excepción al dar de baja:', e);
      alert('Ocurrió un error inesperado al registrar la baja. Mirá la consola para más detalle.');
    } finally {
      setGuardandoBaja(false);
    }
  }

  async function cancelarBaja(codigo) {
    if (!window.confirm('¿Cancelar la baja de este cilindro? Va a volver a figurar activo.')) return;
    setCancelandoBaja(true);
    try {
      // Busca el estado anterior a la baja para restaurarlo (si no hay historial previo, vuelve a "en_stock")
      // Se ordena por "id" (orden real de creación), no por "fecha", por la misma
      // razón que en estadoActualPorCodigo: la fecha de la baja puede estar editada a mano.
      const historialCodigo = movimientos
        .filter((m) => m.codigo === codigo)
        .sort((a, b) => b.id - a.id);
      const estadoAnterior = historialCodigo.find((m) => m.estado !== 'baja')?.estado || 'en_stock';

      const { data, error } = await supabase
        .schema('cilindros')
        .from('movimientos')
        .insert({
          codigo,
          estado: estadoAnterior,
          observaciones: 'Baja cancelada (corrección de error)',
          registrado_por: user?.id || null,
        })
        .select();

      if (error) {
        console.error('Error de Supabase al cancelar la baja:', error);
        alert('Error al cancelar la baja: ' + error.message);
        return;
      }
      if (!data || data.length === 0) {
        console.error('El insert no devolvió filas — probablemente una policy de RLS lo bloqueó silenciosamente.');
        alert('No se pudo cancelar la baja: el servidor no confirmó el cambio (posible permiso insuficiente). Revisá la consola.');
        return;
      }
      console.log('Baja cancelada correctamente:', data);
      await cargarDatos();
    } catch (e) {
      console.error('Excepción al cancelar la baja:', e);
      alert('Ocurrió un error inesperado al cancelar la baja. Mirá la consola para más detalle.');
    } finally {
      setCancelandoBaja(false);
    }
  }

  const totals = useMemo(() => {
    const codes = new Set(catalogo.map((c) => c.codigo));
    const enProveedor = reparaciones.filter((r) => r.estado_reparacion === 'En poder del proveedor (en reparación)').length;
    const enAlmacen = reparaciones.filter((r) => r.estado_reparacion === 'Reparado - Recibido en Almacén').length;
    return { codigos: codes.size, reparaciones: reparaciones.length, enProveedor, enAlmacen };
  }, [catalogo, reparaciones]);

  if (loading) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.loadingText}>Cargando cilindros...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.loadingText}>{error}</div>
        <button style={styles.retryBtn} onClick={cargarDatos}>Reintentar</button>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #3A4048; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        .row-hover:hover { background: #262B30 !important; }
        .card-hover:hover { border-color: #5B7A99 !important; transform: translateY(-1px); }
        button { font-family: inherit; }
      `}</style>

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.plateIcon}>⛭</div>
          <div>
            <div style={styles.title}>REGISTRO DE CILINDROS · IUSA</div>
            <div style={styles.subtitle}>Seguimiento de reparaciones — Base Cliba I.U.S.A.</div>
          </div>
        </div>
        <div style={styles.headerStats}>
          <Stat label="Códigos activos" value={totals.codigos} />
          <Stat label="Reparaciones (OC)" value={totals.reparaciones} />
          <Stat label="En proveedor" value={totals.enProveedor} accent="#E8871E" />
          <Stat label="En almacén" value={totals.enAlmacen} accent="#4FA98C" />
          <button style={styles.refreshBtn} onClick={cargarDatos} title="Actualizar datos">↻</button>

          <div style={{ position: 'relative' }}>
            <button style={styles.userChip} onClick={() => setMenuUsuarioAbierto((v) => !v)}>
              <span style={styles.userAvatar}>{(user?.nombre || '?').charAt(0).toUpperCase()}</span>
              <span style={styles.userChipText}>
                <span style={styles.userChipName}>{user?.nombre}</span>
                <span style={styles.userChipRol}>{user?.rol}</span>
              </span>
              <span style={{ color: '#5A6068', fontSize: 10 }}>▾</span>
            </button>

            {menuUsuarioAbierto && (
              <div style={styles.userMenu}>
                <button
                  style={styles.userMenuItem}
                  onClick={() => { setMostrarCambiarPass(true); setMenuUsuarioAbierto(false); }}
                >
                  Cambiar contraseña
                </button>
                <button style={{ ...styles.userMenuItem, color: '#E8871E' }} onClick={logout}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mostrarCambiarPass && (
        <div style={styles.modalOverlay} onClick={() => setMostrarCambiarPass(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.adminPanelTitle}>Cambiar contraseña</div>
            {passMsg.text && (
              <div style={{ ...styles.passMsg, color: passMsg.type === 'error' ? '#E8871E' : '#4FA98C' }}>
                {passMsg.text}
              </div>
            )}
            <form onSubmit={handleCambiarPassword}>
              <div style={{ marginBottom: 10 }}>
                <div style={styles.fieldLabel}>Contraseña actual</div>
                <input
                  style={styles.adminInput} type="password" required
                  value={passForm.actual}
                  onChange={(e) => setPassForm((f) => ({ ...f, actual: e.target.value }))}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={styles.fieldLabel}>Nueva contraseña</div>
                <input
                  style={styles.adminInput} type="password" required
                  value={passForm.nueva}
                  onChange={(e) => setPassForm((f) => ({ ...f, nueva: e.target.value }))}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={styles.fieldLabel}>Confirmar nueva</div>
                <input
                  style={styles.adminInput} type="password" required
                  value={passForm.confirmar}
                  onChange={(e) => setPassForm((f) => ({ ...f, confirmar: e.target.value }))}
                />
              </div>
              <div style={styles.adminFormActions}>
                <button type="button" style={styles.adminBtn} onClick={() => setMostrarCambiarPass(false)}>Cerrar</button>
                <button type="submit" style={styles.adminBtnPrimary} disabled={guardandoPass}>
                  {guardandoPass ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={styles.body}>
        <div style={styles.sidebar}>
          <input
            placeholder="Buscar tipo o código..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={styles.search}
          />
          <div style={styles.sortToggle}>
            <span style={styles.sortToggleLabel}>Ordenar por</span>
            <button
              style={{ ...styles.sortToggleBtn, ...(ordenSidebar === 'cantidad' ? styles.sortToggleBtnActive : {}) }}
              onClick={() => setOrdenSidebar('cantidad')}
            >
              Cantidad
            </button>
            <button
              style={{ ...styles.sortToggleBtn, ...(ordenSidebar === 'reciente' ? styles.sortToggleBtnActive : {}) }}
              onClick={() => setOrdenSidebar('reciente')}
            >
              Actividad reciente
            </button>
          </div>
          <div style={styles.sidebarScroll}>
            {filteredGroups.map((g) => (
              <div
                key={g.name}
                onClick={() => { setSelectedGroup(g.name); setSelectedCode(null); setCodeQuery(''); setFechaDesde(''); setFechaHasta(''); }}
                style={{
                  ...styles.groupItem,
                  ...(selectedGroup === g.name ? styles.groupItemActive : {}),
                }}
                className="row-hover"
              >
                <div style={styles.groupItemTop}>
                  <span style={styles.groupCount}>{g.codeCount}</span>
                </div>
                <div style={styles.groupName}>{g.name}</div>
                {ordenSidebar === 'reciente' && g.ultimaActividad && (
                  <div style={styles.groupActividad}>{fmtHaceTiempo(g.ultimaActividad)}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.main}>
          {!activeGroup && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>◧</div>
              <div style={styles.emptyTitle}>Seleccioná un tipo de cilindro</div>
              <div style={styles.emptyText}>{groups.length} tipos de cilindro catalogados</div>
            </div>
          )}

          {activeGroup && !selectedCode && (
            <div>
              <div style={styles.mainHeader}>
                <h2 style={styles.mainTitle}>{activeGroup.name}</h2>
                <div style={styles.mainMeta}>{codesInGroup.length} códigos · {activeGroup.repairCount} reparaciones registradas</div>
              </div>

              <div style={styles.filterBar}>
                <input
                  placeholder="Buscar código..."
                  value={codeQuery}
                  onChange={(e) => setCodeQuery(e.target.value)}
                  style={styles.filterInput}
                />
                <div style={styles.filterDateGroup}>
                  <span style={styles.filterDateLabel}>Última reparación desde</span>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    style={styles.filterDateInput}
                  />
                </div>
                <div style={styles.filterDateGroup}>
                  <span style={styles.filterDateLabel}>hasta</span>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    style={styles.filterDateInput}
                  />
                </div>
                {(codeQuery || fechaDesde || fechaHasta) && (
                  <button
                    style={styles.filterClearBtn}
                    onClick={() => { setCodeQuery(''); setFechaDesde(''); setFechaHasta(''); }}
                  >
                    Limpiar filtros
                  </button>
                )}
                {cantidadInactivosEnGrupo > 0 && (
                  <button
                    style={{ ...styles.filterClearBtn, ...(ocultarInactivos ? styles.filterToggleActive : {}) }}
                    onClick={() => setOcultarInactivos((v) => !v)}
                  >
                    {ocultarInactivos ? 'Mostrar' : 'Ocultar'} sin actividad 4+ años ({cantidadInactivosEnGrupo})
                  </button>
                )}
                <span style={styles.filterCount}>{codesInGroupFiltrados.length} de {codesInGroup.length}</span>
              </div>

              <div style={styles.chartCard}>
                <div style={styles.chartTitle}>Reparaciones por mes — últimos 6 meses</div>
                <div style={styles.chartWrap}>
                  {chartMensual.map((c) => {
                    const max = Math.max(...chartMensual.map((x) => x.cantidad), 1);
                    return (
                      <div key={c.mes} style={styles.chartCol}>
                        <div style={styles.chartBarWrap}>
                          <div
                            style={{ ...styles.chartBar, height: `${(c.cantidad / max) * 100}%` }}
                            title={`${c.cantidad} reparaciones`}
                          />
                        </div>
                        <div style={styles.chartValue}>{c.cantidad}</div>
                        <div style={styles.chartLabel}>{c.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {codesInGroupFiltrados.length === 0 && (
                <div style={styles.filterEmpty}>No hay códigos que coincidan con estos filtros.</div>
              )}

              <div style={styles.codeGrid}>
                {codesInGroupFiltrados.map(({ codigo, last, count }) => {
                  const st = STATUS_STYLE[last.estado_reparacion] || { color: '#8B9199', bg: 'rgba(139,145,153,0.14)', label: last.estado_reparacion, dot: '#5A6068' };
                  const inactivo = esInactivo(last.fecha_solicitud);
                  const bajaManual = estadoActualPorCodigo[codigo]?.estado === 'baja';
                  return (
                    <div key={codigo} style={{ ...styles.codeCard, ...(inactivo || bajaManual ? styles.codeCardInactivo : {}) }} className="card-hover" onClick={() => { setSelectedCode(codigo); setMostrarHistorialMovimientos(false); }}>
                      {bajaManual && <div style={{ ...styles.bajaTag, background: 'rgba(192,57,43,0.22)' }}>BAJA REGISTRADA</div>}
                      {!bajaManual && inactivo && <div style={styles.bajaTag}>SIN ACTIVIDAD — 4+ años</div>}
                      <div style={styles.codeCardTop}>
                        <span style={styles.codeText}>{codigo}</span>
                        <span style={{ ...styles.statusDot, background: st.dot }} />
                      </div>
                      <div style={styles.codeCardDesc}>{last.descripcion_corta}</div>
                      <div style={styles.codeCardBottom}>
                        <span style={{ ...styles.statusBadge, color: st.color, background: st.bg }}>{st.label}</span>
                        <span style={styles.codeCardCount}>{count} rep.</span>
                      </div>
                      <div style={styles.codeCardDate}>
                        Última OC: {fmtDate(last.fecha_solicitud)} {last.proveedor ? `· ${last.proveedor}` : ''}
                        {last.fecha_solicitud && <span style={styles.codeCardHace}> · {fmtHaceTiempo(last.fecha_solicitud)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedCode && (
            <div>
              <button style={styles.backBtn} onClick={() => setSelectedCode(null)}>← Volver a {activeGroup?.name}</button>
              <div style={styles.mainHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ ...styles.mainTitle, fontFamily: "'IBM Plex Mono', monospace" }}>{selectedCode}</h2>
                    <div style={styles.mainMeta}>{selectedCodeRows[0]?.descripcion_original} · {selectedCodeRows.length} reparaciones</div>
                    {estadoActualPorCodigo[selectedCode]?.estado === 'baja' ? (
                      <div style={{ ...styles.bajaTag, marginTop: 8, display: 'inline-block', background: 'rgba(192,57,43,0.22)' }}>BAJA REGISTRADA</div>
                    ) : esInactivo(selectedCodeRows.find((r) => r.fecha_solicitud)?.fecha_solicitud) ? (
                      <div style={{ ...styles.bajaTag, marginTop: 8, display: 'inline-block' }}>SIN ACTIVIDAD — 4+ años</div>
                    ) : null}
                  </div>
                  {(esAdmin || puedeDarBaja) && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {esAdmin && (
                        <button
                          style={styles.adminBtn}
                          onClick={() => {
                            const c = catalogo.find((x) => x.codigo === selectedCode);
                            setFormCatalogo({ descripcion_unificada: c?.descripcion_unificada || '', equipo: c?.equipo || '' });
                            setEditandoCatalogo(true);
                          }}
                        >
                          Editar catalogación
                        </button>
                      )}
                      {esAdmin && (
                        <button style={styles.adminBtnPrimary} onClick={() => setMostrarFormMovimiento(true)}>
                          Registrar movimiento
                        </button>
                      )}
                      {puedeDarBaja && estadoActualPorCodigo[selectedCode]?.estado === 'baja' ? (
                        <button style={styles.adminBtnBaja} disabled={cancelandoBaja} onClick={() => cancelarBaja(selectedCode)}>
                          {cancelandoBaja ? 'Cancelando...' : 'Cancelar baja'}
                        </button>
                      ) : puedeDarBaja ? (
                        <button style={styles.adminBtnDanger} onClick={() => setMostrarFormBaja(true)}>
                          Dar de baja
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Estado operativo actual */}
              {estadoActualPorCodigo[selectedCode] && (
                <div style={styles.estadoActualCard}>
                  {(() => {
                    const m = estadoActualPorCodigo[selectedCode];
                    const es = ESTADO_OPERATIVO_STYLE[m.estado] || { label: m.estado, color: '#8B9199', bg: 'rgba(139,145,153,0.14)' };
                    return (
                      <>
                        <span style={{ ...styles.statusBadge, color: es.color, background: es.bg, fontSize: 12 }}>{es.label}</span>
                        <span style={styles.estadoActualMeta}>
                          desde {fmtDate(m.fecha)}{m.proveedor ? ` · ${m.proveedor}` : ''}{m.observaciones ? ` · ${m.observaciones}` : ''}
                        </span>
                      </>
                    );
                  })()}
                  {historialMovimientos.length > 0 && (
                    <button
                      style={styles.verHistorialBtn}
                      onClick={() => setMostrarHistorialMovimientos((v) => !v)}
                    >
                      {mostrarHistorialMovimientos ? 'Ocultar' : 'Ver'} historial de estado ({historialMovimientos.length})
                    </button>
                  )}
                </div>
              )}

              {/* Historial completo de cambios de estado operativo (en uso / stock / proveedor / baja / cancelaciones) */}
              {mostrarHistorialMovimientos && historialMovimientos.length > 0 && (
                <div style={styles.adminPanel}>
                  <div style={styles.adminPanelTitle}>Historial de estado operativo — {selectedCode}</div>
                  <div style={styles.movTable}>
                    {historialMovimientos.map((m) => {
                      const es = ESTADO_OPERATIVO_STYLE[m.estado] || { label: m.estado, color: '#8B9199', bg: 'rgba(139,145,153,0.14)' };
                      return (
                        <div key={m.id} style={styles.movRow}>
                          <span style={{ ...styles.statusBadge, color: es.color, background: es.bg, minWidth: 150, textAlign: 'center' }}>
                            {es.label}
                          </span>
                          <span style={styles.movFecha}>{fmtDate(m.fecha)} <span style={{ color: '#5A6068' }}>({fmtHaceTiempo(m.fecha)})</span></span>
                          <span style={styles.movObs}>{m.observaciones || (m.proveedor ? `Proveedor: ${m.proveedor}` : '—')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Formulario: editar catalogación */}
              {editandoCatalogo && (
                <div style={styles.adminPanel}>
                  <div style={styles.adminPanelTitle}>Editar catalogación de {selectedCode}</div>
                  <div style={styles.adminFormRow}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.fieldLabel}>Descripción unificada</div>
                      <input
                        style={styles.adminInput}
                        value={formCatalogo.descripcion_unificada}
                        onChange={(e) => setFormCatalogo((f) => ({ ...f, descripcion_unificada: e.target.value }))}
                      />
                    </div>
                    <div style={{ width: 200 }}>
                      <div style={styles.fieldLabel}>Equipo</div>
                      <input
                        style={styles.adminInput}
                        value={formCatalogo.equipo}
                        onChange={(e) => setFormCatalogo((f) => ({ ...f, equipo: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div style={styles.adminFormActions}>
                    <button style={styles.adminBtn} onClick={() => setEditandoCatalogo(false)}>Cancelar</button>
                    <button
                      style={styles.adminBtnPrimary}
                      disabled={guardandoCatalogo}
                      onClick={() => guardarCatalogacion(selectedCode)}
                    >
                      {guardandoCatalogo ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Formulario: registrar movimiento */}
              {mostrarFormMovimiento && (
                <div style={styles.adminPanel}>
                  <div style={styles.adminPanelTitle}>Registrar movimiento — {selectedCode}</div>
                  <div style={styles.adminFormRow}>
                    <div style={{ width: 220 }}>
                      <div style={styles.fieldLabel}>Nuevo estado</div>
                      <select
                        style={styles.adminInput}
                        value={formMovimiento.estado}
                        onChange={(e) => setFormMovimiento((f) => ({ ...f, estado: e.target.value }))}
                      >
                        <option value="en_uso">En uso</option>
                        <option value="en_stock">En stock (reparado)</option>
                        <option value="en_proveedor">En poder del proveedor</option>
                        <option value="roto_en_almacen">Roto — en almacén</option>
                        <option value="baja">Dado de baja</option>
                      </select>
                    </div>
                    {formMovimiento.estado === 'en_proveedor' && (
                      <div style={{ flex: 1 }}>
                        <div style={styles.fieldLabel}>Proveedor</div>
                        <input
                          style={styles.adminInput}
                          value={formMovimiento.proveedor}
                          onChange={(e) => setFormMovimiento((f) => ({ ...f, proveedor: e.target.value }))}
                        />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={styles.fieldLabel}>Observaciones (opcional)</div>
                      <input
                        style={styles.adminInput}
                        value={formMovimiento.observaciones}
                        onChange={(e) => setFormMovimiento((f) => ({ ...f, observaciones: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div style={styles.adminFormActions}>
                    <button style={styles.adminBtn} onClick={() => setMostrarFormMovimiento(false)}>Cancelar</button>
                    <button
                      style={styles.adminBtnPrimary}
                      disabled={guardandoMovimiento}
                      onClick={() => registrarMovimiento(selectedCode)}
                    >
                      {guardandoMovimiento ? 'Guardando...' : 'Guardar movimiento'}
                    </button>
                  </div>
                </div>
              )}

              {/* Formulario: dar de baja */}
              {mostrarFormBaja && (
                <div style={{ ...styles.adminPanel, borderColor: '#C0392B' }}>
                  <div style={{ ...styles.adminPanelTitle, color: '#E88A83' }}>Dar de baja — {selectedCode}</div>
                  <div style={styles.adminFormRow}>
                    <div style={{ width: 200 }}>
                      <div style={styles.fieldLabel}>Fecha de la baja</div>
                      <input
                        type="date"
                        style={styles.adminInput}
                        value={formBaja.fecha}
                        onChange={(e) => setFormBaja((f) => ({ ...f, fecha: e.target.value }))}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.fieldLabel}>Motivo *</div>
                      <input
                        style={styles.adminInput}
                        placeholder="Ej: rotura irreparable, cuerpo fisurado, etc."
                        value={formBaja.motivo}
                        onChange={(e) => setFormBaja((f) => ({ ...f, motivo: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div style={styles.adminFormActions}>
                    <button style={styles.adminBtn} onClick={() => setMostrarFormBaja(false)}>Cancelar</button>
                    <button
                      style={styles.adminBtnDanger}
                      disabled={guardandoBaja}
                      onClick={() => darDeBaja(selectedCode)}
                    >
                      {guardandoBaja ? 'Guardando...' : 'Confirmar baja'}
                    </button>
                  </div>
                </div>
              )}

              <div style={styles.timeline}>
                {selectedCodeRows.map((r, i) => {
                  const st = STATUS_STYLE[r.estado_reparacion] || { color: '#8B9199', bg: 'rgba(139,145,153,0.14)', dot: '#5A6068' };
                  return (
                    <div key={i} style={styles.timelineItem}>
                      <div style={styles.timelineDotWrap}>
                        <span style={{ ...styles.timelineDot, background: st.dot }} />
                        {i < selectedCodeRows.length - 1 && <span style={styles.timelineLine} />}
                      </div>
                      <div style={styles.timelineCard}>
                        <div style={styles.timelineTop}>
                          <span style={{ ...styles.statusBadge, color: st.color, background: st.bg }}>{r.estado_reparacion}</span>
                          <span style={styles.timelineDate}>
                            {fmtDate(r.fecha_solicitud)}
                            {r.fecha_solicitud && <span style={{ color: '#5A6068' }}> · {fmtHaceTiempo(r.fecha_solicitud)}</span>}
                          </span>
                        </div>
                        <div style={styles.timelineGrid}>
                          <Field label="Proveedor" value={r.proveedor || '—'} />
                          <Field label="OC definitiva" value={r.oc_definitiva || '—'} />
                          <Field label="Precio total" value={fmtMoney(r.precio_total, r.moneda)} />
                          <Field label="Remito" value={r.remito_nro ? `${r.remito_nro} (${r.remito_estado})` : '—'} />
                          <Field label="Fecha remito" value={fmtDate(r.remito_fecha)} />
                          <Field label="Factura" value={r.factura_numero ? `${r.factura_numero} (${r.factura_estado})` : '—'} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.footer}>
        Dato de estado: inferido a partir de OC / Remito / Factura del reporte de compras (no refleja ubicación física en tiempo real).
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={styles.statBox}>
      <div style={{ ...styles.statValue, color: accent || '#E8E6E1' }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldValue}>{value}</div>
    </div>
  );
}

const styles = {
  app: {
    fontFamily: "'Oswald', sans-serif",
    background: '#1C1F22',
    color: '#E8E6E1',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  centerScreen: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: '#1C1F22', gap: 16,
  },
  loadingText: { color: '#8B9199', fontFamily: "'Oswald', sans-serif", fontSize: 14 },
  retryBtn: {
    padding: '8px 18px', background: '#24282C', border: '1px solid #3A4048', borderRadius: 6,
    color: '#E8E6E1', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 13,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 28px',
    borderBottom: '1px solid #2E3338',
    background: '#1A1D20',
    flexWrap: 'wrap',
    gap: 16,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  plateIcon: {
    width: 40, height: 40, borderRadius: 6, background: '#24282C', border: '1px solid #3A4048',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#5B7A99',
  },
  title: { fontSize: 17, fontWeight: 600, letterSpacing: '0.06em' },
  subtitle: { fontSize: 12, color: '#8B9199', marginTop: 2, letterSpacing: '0.02em' },
  headerStats: { display: 'flex', gap: 22, alignItems: 'center' },
  statBox: { textAlign: 'right' },
  statValue: { fontSize: 22, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" },
  statLabel: { fontSize: 10, color: '#8B9199', textTransform: 'uppercase', letterSpacing: '0.05em' },
  refreshBtn: {
    background: '#24282C', border: '1px solid #3A4048', color: '#8B9199', borderRadius: 6,
    width: 32, height: 32, cursor: 'pointer', fontSize: 15,
  },
  body: { display: 'flex', flex: 1, minHeight: 0 },
  sidebar: {
    width: 320, borderRight: '1px solid #2E3338', display: 'flex', flexDirection: 'column',
    background: '#1A1D20', flexShrink: 0,
  },
  search: {
    margin: 14, padding: '9px 12px', background: '#24282C', border: '1px solid #3A4048',
    borderRadius: 6, color: '#E8E6E1', fontSize: 13, outline: 'none', fontFamily: "'Oswald', sans-serif",
  },
  sidebarScroll: { overflowY: 'auto', flex: 1, padding: '0 8px 14px' },
  groupItem: { padding: '10px 12px', borderRadius: 6, cursor: 'pointer', marginBottom: 3 },
  groupItemActive: { background: '#262B30', boxShadow: 'inset 2px 0 0 #5B7A99' },
  groupItemTop: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4 },
  groupCount: { fontSize: 12, color: '#8B9199', fontFamily: "'IBM Plex Mono', monospace" },
  groupName: { fontSize: 13, lineHeight: 1.3, color: '#D8D6D1' },
  main: { flex: 1, overflowY: 'auto', padding: '24px 32px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70%', color: '#5A6068' },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: 500, marginBottom: 6, color: '#8B9199' },
  emptyText: { fontSize: 12, textAlign: 'center', maxWidth: 340 },
  mainHeader: { marginBottom: 22 },
  mainTitle: { fontSize: 22, fontWeight: 600, margin: '8px 0 4px', letterSpacing: '0.01em' },
  mainMeta: { fontSize: 12, color: '#8B9199' },
  codeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 },
  codeCard: {
    background: '#24282C', border: '1px solid #2E3338', borderRadius: 8, padding: 14, cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  codeCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  codeText: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 500, color: '#E8E6E1' },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  codeCardDesc: { fontSize: 11.5, color: '#9AA0A6', marginBottom: 10, minHeight: 28, lineHeight: 1.35 },
  codeCardBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statusBadge: { fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.02em' },
  codeCardCount: { fontSize: 11, color: '#5A6068', fontFamily: "'IBM Plex Mono', monospace" },
  codeCardDate: { fontSize: 10.5, color: '#5A6068' },
  backBtn: {
    background: 'none', border: 'none', color: '#5B7A99', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 14,
    letterSpacing: '0.02em',
  },
  timeline: { display: 'flex', flexDirection: 'column' },
  timelineItem: { display: 'flex', gap: 14 },
  timelineDotWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, background: '#2E3338', minHeight: 30 },
  timelineCard: { background: '#24282C', border: '1px solid #2E3338', borderRadius: 8, padding: 14, marginBottom: 16, flex: 1 },
  timelineTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  timelineDate: { fontSize: 12, color: '#8B9199', fontFamily: "'IBM Plex Mono', monospace" },
  timelineGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 },
  fieldLabel: { fontSize: 9.5, color: '#5A6068', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 },
  fieldValue: { fontSize: 12.5, color: '#D8D6D1' },
  footer: {
    padding: '10px 28px', borderTop: '1px solid #2E3338', fontSize: 10.5, color: '#5A6068', background: '#1A1D20',
  },
  adminBtn: {
    background: '#24282C', border: '1px solid #3A4048', color: '#D8D6D1', borderRadius: 6,
    padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: "'Oswald', sans-serif",
  },
  adminBtnPrimary: {
    background: '#5B7A99', border: '1px solid #5B7A99', color: '#fff', borderRadius: 6,
    padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontWeight: 500,
  },
  adminBtnDanger: {
    background: '#C0392B', border: '1px solid #C0392B', color: '#fff', borderRadius: 6,
    padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontWeight: 500,
  },
  adminBtnBaja: {
    background: '#24282C', border: '1px solid #4FA98C', color: '#4FA98C', borderRadius: 6,
    padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontWeight: 500,
  },
  estadoActualCard: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
    padding: '10px 14px', background: '#24282C', border: '1px solid #2E3338', borderRadius: 8,
  },
  estadoActualMeta: { fontSize: 11.5, color: '#8B9199' },
  adminPanel: {
    background: '#24282C', border: '1px solid #3A4048', borderRadius: 8, padding: 16, marginBottom: 18,
  },
  adminPanelTitle: { fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#E8E6E1' },
  adminFormRow: { display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  adminInput: {
    width: '100%', padding: '8px 10px', background: '#1C1F22', border: '1px solid #3A4048', borderRadius: 6,
    color: '#E8E6E1', fontSize: 13, fontFamily: "'Oswald', sans-serif", marginTop: 4,
  },
  adminFormActions: { display: 'flex', justifyContent: 'flex-end', gap: 8 },

  userChip: {
    display: 'flex', alignItems: 'center', gap: 8, background: '#24282C', border: '1px solid #3A4048',
    borderRadius: 20, padding: '5px 10px 5px 5px', cursor: 'pointer',
  },
  userAvatar: {
    width: 26, height: 26, borderRadius: '50%', background: '#5B7A99', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0,
  },
  userChipText: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 },
  userChipName: { fontSize: 11.5, color: '#E8E6E1', fontWeight: 500 },
  userChipRol: { fontSize: 9.5, color: '#8B9199', textTransform: 'uppercase', letterSpacing: '0.03em' },
  userMenu: {
    position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#24282C', border: '1px solid #3A4048',
    borderRadius: 8, overflow: 'hidden', minWidth: 170, zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  userMenuItem: {
    display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none',
    color: '#D8D6D1', fontSize: 12.5, cursor: 'pointer', fontFamily: "'Oswald', sans-serif",
  },
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 100,
  },
  modalCard: {
    background: '#24282C', border: '1px solid #3A4048', borderRadius: 10, padding: 22, width: 320,
  },
  passMsg: { fontSize: 12, marginBottom: 12 },

  filterBar: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap',
    background: '#1A1D20', border: '1px solid #2E3338', borderRadius: 8, padding: '10px 14px',
  },
  filterInput: {
    padding: '7px 10px', background: '#24282C', border: '1px solid #3A4048', borderRadius: 6,
    color: '#E8E6E1', fontSize: 12.5, fontFamily: "'Oswald', sans-serif", width: 180, outline: 'none',
  },
  filterDateGroup: { display: 'flex', alignItems: 'center', gap: 6 },
  filterDateLabel: { fontSize: 11, color: '#8B9199', whiteSpace: 'nowrap' },
  filterDateInput: {
    padding: '6px 8px', background: '#24282C', border: '1px solid #3A4048', borderRadius: 6,
    color: '#E8E6E1', fontSize: 12, fontFamily: "'Oswald', sans-serif",
  },
  filterClearBtn: {
    background: 'none', border: '1px solid #3A4048', color: '#8B9199', borderRadius: 6,
    padding: '6px 12px', fontSize: 11.5, cursor: 'pointer', fontFamily: "'Oswald', sans-serif",
  },
  filterCount: { fontSize: 11.5, color: '#5A6068', marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace" },
  filterEmpty: { padding: '30px 0', textAlign: 'center', color: '#5A6068', fontSize: 13 },

  sortToggle: { display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px 12px', flexWrap: 'wrap' },
  sortToggleLabel: { fontSize: 10, color: '#5A6068', textTransform: 'uppercase', letterSpacing: '0.04em', width: '100%', marginBottom: 2 },
  sortToggleBtn: {
    background: '#24282C', border: '1px solid #3A4048', color: '#8B9199', borderRadius: 5,
    padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: "'Oswald', sans-serif",
  },
  sortToggleBtnActive: { background: '#262B30', color: '#5B7A99', borderColor: '#5B7A99' },
  groupActividad: { fontSize: 10, color: '#5A6068', marginTop: 2, fontStyle: 'italic' },
  codeCardHace: { color: '#5A6068', fontStyle: 'italic' },

  chartCard: {
    background: '#24282C', border: '1px solid #2E3338', borderRadius: 8, padding: '16px 20px', marginBottom: 18,
  },
  chartTitle: { fontSize: 12, fontWeight: 600, color: '#8B9199', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.03em' },
  chartWrap: { display: 'flex', alignItems: 'flex-end', gap: 14, height: 110, padding: '0 4px' },
  chartCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  chartBarWrap: { display: 'flex', alignItems: 'flex-end', height: 70, width: '100%', justifyContent: 'center' },
  chartBar: { width: 26, borderRadius: '4px 4px 0 0', background: '#5B7A99', minHeight: 2, transition: 'height 0.3s' },
  chartValue: { fontSize: 12, fontWeight: 600, color: '#E8E6E1', marginTop: 6, fontFamily: "'IBM Plex Mono', monospace" },
  chartLabel: { fontSize: 10, color: '#5A6068', marginTop: 2, textTransform: 'capitalize' },

  filterToggleActive: { background: 'rgba(192,57,43,0.14)', color: '#C0392B', borderColor: '#C0392B' },
  codeCardInactivo: { opacity: 0.65, borderStyle: 'dashed' },
  bajaTag: {
    fontSize: 9.5, fontWeight: 600, color: '#C0392B', background: 'rgba(192,57,43,0.14)',
    padding: '3px 7px', borderRadius: 4, marginBottom: 8, letterSpacing: '0.02em', textTransform: 'uppercase',
  },

  verHistorialBtn: {
    marginLeft: 'auto', background: 'none', border: '1px solid #3A4048', color: '#8B9199',
    borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: "'Oswald', sans-serif",
  },
  movTable: { display: 'flex', flexDirection: 'column', gap: 8 },
  movRow: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '9px 12px', background: '#1C1F22',
    borderRadius: 6, border: '1px solid #2E3338', flexWrap: 'wrap',
  },
  movFecha: { fontSize: 12, color: '#D8D6D1', fontFamily: "'IBM Plex Mono', monospace", minWidth: 160 },
  movObs: { fontSize: 12, color: '#8B9199', flex: 1 },
};
