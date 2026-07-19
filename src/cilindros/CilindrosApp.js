import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import styles from './styles';
import { parseDate, esInactivo, diasDesde } from './helpers';
import { Stat } from './SmallComponents';
import UnidadesTab from './UnidadesTab';
import VistaCilindros from './VistaCilindros';

// ============================================================================
// Orquestador del módulo Cilindros: trae los datos de Supabase, calcula
// todo lo derivado (grupos, filtros, estado actual, etc.) y arma un solo
// objeto "vm" que le pasa a VistaCilindros. El header, las pestañas y el
// modal de cambiar contraseña quedan acá porque son compartidos por las
// dos pestañas (Cilindros / Unidades).
// ============================================================================

export default function CilindrosApp() {
  const { user, logout, changePassword } = useAuth();
  const esAdmin = user?.rol === 'admin' || user?.rol === 'superadmin';
  const puedeDarBaja = esAdmin || user?.rol === 'almacen';
  const puedeRegistrarMovimiento = esAdmin || user?.rol === 'mantenimiento';
  const puedeRegistrarReparacion = esAdmin || user?.rol === 'compras';

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
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [vistaPrincipal, setVistaPrincipal] = useState('cilindros'); // 'cilindros' | 'unidades'
  const puedeGestionarUnidades = esAdmin || user?.rol === 'mantenimiento';

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
      const [cat, rep, mov, uni] = await Promise.all([
        fetchTodo('catalogo'),
        fetchTodo('reparaciones'),
        fetchTodo('movimientos'),
        fetchTodo('unidades'),
      ]);
      setCatalogo(cat);
      // Filtro de seguridad: una reparación sin OC definitiva no es una reparación
      // real (quedó como solicitud que nunca se concretó). Ya se limpiaron de la
      // base, pero esto evita que vuelvan a colarse si alguien carga una a mano.
      setReparaciones((rep || []).filter((r) => !!r.oc_definitiva));
      setMovimientos(mov || []);
      setUnidades(uni || []);
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

  // ---- Buscador global (siempre visible, no depende de estar dentro de un grupo) ----
  const [busquedaGlobal, setBusquedaGlobal] = useState('');
  const [busquedaGlobalAbierta, setBusquedaGlobalAbierta] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [codeQuery, setCodeQuery] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [ocultarInactivos, setOcultarInactivos] = useState(false);
  const [filtroEstadoOperativo, setFiltroEstadoOperativo] = useState('todos'); // 'todos' | 'en_uso' | 'en_stock' | 'en_proveedor' | 'roto_en_almacen' | 'baja'

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

  const codesInGroupFiltradosBase = useMemo(() => {
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
  const [formMovimiento, setFormMovimiento] = useState({ estado: 'en_stock', proveedor: '', observaciones: '', unidad_id: '' });
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);

  // ---- Dar de baja (admin + almacén) ----
  const hoyISO = () => new Date().toISOString().slice(0, 10);
  const [mostrarFormBaja, setMostrarFormBaja] = useState(false);

  // ---- Registrar reparación nueva (rol compras + admin) ----
  const FORM_REPARACION_INICIAL = {
    fecha_solicitud: hoyISO(), oc_definitiva: '', proveedor: '',
    precio_unitario: '', precio_total: '', moneda: 'ARS',
  };
  const [mostrarFormReparacion, setMostrarFormReparacion] = useState(false);
  const [formReparacion, setFormReparacion] = useState(FORM_REPARACION_INICIAL);
  const [guardandoReparacion, setGuardandoReparacion] = useState(false);
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
    if (formMovimiento.estado === 'en_uso' && !formMovimiento.unidad_id) {
      alert('Elegí a qué unidad se le asigna el cilindro.');
      return;
    }
    setGuardandoMovimiento(true);
    try {
      const { data, error } = await supabase
        .schema('cilindros')
        .from('movimientos')
        .insert({
          codigo,
          estado: formMovimiento.estado,
          proveedor: formMovimiento.estado === 'en_proveedor' ? formMovimiento.proveedor : null,
          unidad_id: formMovimiento.estado === 'en_uso' ? formMovimiento.unidad_id : null,
          observaciones: formMovimiento.observaciones || null,
          registrado_por: user?.id || null,
        })
        .select();

      if (error) {
        console.error('Error de Supabase al registrar movimiento:', error);
        alert('Error al registrar el movimiento: ' + error.message);
        return;
      }
      if (!data || data.length === 0) {
        console.error('El insert del movimiento no devolvió filas — posible bloqueo de RLS.');
        alert('No se pudo registrar el movimiento: el servidor no confirmó el cambio. Revisá la consola.');
        return;
      }
      setMostrarFormMovimiento(false);
      setFormMovimiento({ estado: 'en_stock', proveedor: '', observaciones: '', unidad_id: '' });
      await cargarDatos();
    } catch (e) {
      console.error('Excepción al registrar movimiento:', e);
      alert('Ocurrió un error inesperado. Mirá la consola para más detalle.');
    } finally {
      setGuardandoMovimiento(false);
    }
  }

  async function registrarReparacion(codigo) {
    if (!formReparacion.oc_definitiva.trim()) {
      alert('La OC definitiva es obligatoria.');
      return;
    }
    setGuardandoReparacion(true);
    try {
      const { data, error } = await supabase
        .schema('cilindros')
        .from('reparaciones')
        .insert({
          codigo,
          fecha_solicitud: formReparacion.fecha_solicitud,
          oc_definitiva: formReparacion.oc_definitiva,
          proveedor: formReparacion.proveedor || null,
          precio_unitario: formReparacion.precio_unitario ? Number(formReparacion.precio_unitario) : null,
          precio_total: formReparacion.precio_total ? Number(formReparacion.precio_total) : null,
          moneda: formReparacion.moneda || 'ARS',
          // Recién se manda a reparar, todavía no volvió — remito/factura se
          // completan solos cuando alguien registre el movimiento "En stock".
          estado_reparacion: 'En poder del proveedor (en reparación)',
          estado_final_rc: 'Con OC Definitiva',
        })
        .select();

      if (error) {
        console.error('Error de Supabase al registrar la reparación:', error);
        alert('Error al registrar la reparación: ' + error.message);
        return;
      }
      if (!data || data.length === 0) {
        console.error('El insert de la reparación no devolvió filas — posible bloqueo de RLS.');
        alert('No se pudo registrar la reparación: el servidor no confirmó el cambio. Revisá la consola.');
        return;
      }
      setMostrarFormReparacion(false);
      setFormReparacion(FORM_REPARACION_INICIAL);
      await cargarDatos();
    } catch (e) {
      console.error('Excepción al registrar la reparación:', e);
      alert('Ocurrió un error inesperado. Mirá la consola para más detalle.');
    } finally {
      setGuardandoReparacion(false);
    }
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

  // ---- Corregir un movimiento cargado mal (solo admin) ----
  const [editandoMovimientoId, setEditandoMovimientoId] = useState(null);
  const [formEditarMovimiento, setFormEditarMovimiento] = useState({ estado: '', proveedor: '', observaciones: '', fecha: '' });
  const [guardandoEditarMovimiento, setGuardandoEditarMovimiento] = useState(false);

  function abrirEditarMovimiento(m) {
    setEditandoMovimientoId(m.id);
    setFormEditarMovimiento({
      estado: m.estado,
      proveedor: m.proveedor || '',
      observaciones: m.observaciones || '',
      fecha: m.fecha ? m.fecha.slice(0, 10) : hoyISO(),
    });
  }

  async function guardarEditarMovimiento() {
    setGuardandoEditarMovimiento(true);
    try {
      const { data, error } = await supabase
        .schema('cilindros')
        .from('movimientos')
        .update({
          estado: formEditarMovimiento.estado,
          proveedor: formEditarMovimiento.estado === 'en_proveedor' ? formEditarMovimiento.proveedor : null,
          observaciones: formEditarMovimiento.observaciones || null,
          fecha: new Date(formEditarMovimiento.fecha + 'T12:00:00').toISOString(),
        })
        .eq('id', editandoMovimientoId)
        .select();

      if (error) {
        console.error('Error al corregir el movimiento:', error);
        alert('Error al guardar la corrección: ' + error.message);
        return;
      }
      if (!data || data.length === 0) {
        console.error('El update no devolvió filas — posible bloqueo de RLS.');
        alert('No se pudo guardar: el servidor no confirmó el cambio. Revisá la consola.');
        return;
      }
      setEditandoMovimientoId(null);
      await cargarDatos();
    } catch (e) {
      console.error('Excepción al corregir el movimiento:', e);
      alert('Ocurrió un error inesperado. Mirá la consola para más detalle.');
    } finally {
      setGuardandoEditarMovimiento(false);
    }
  }

  const unidadNombre = (unidadId) => {
    if (!unidadId) return null;
    const u = unidades.find((x) => String(x.id) === String(unidadId));
    return u ? u.identificador : `Unidad #${unidadId}`;
  };

  // Última reparación (del historial de compras) por código, para poder
  // combinarla con el estado operativo manual (movimientos).
  const ultimaReparacionPorCodigo = useMemo(() => {
    const map = {};
    reparaciones.forEach((r) => {
      const actual = map[r.codigo];
      if (!actual || (r.fecha_solicitud || '') > (actual.fecha_solicitud || '')) map[r.codigo] = r;
    });
    return map;
  }, [reparaciones]);

  // ============================================================================
  // ESTADO EFECTIVO: combina las dos fuentes de estado que hoy conviven:
  //  - cilindros.movimientos (carga manual: en_uso/en_stock/en_proveedor/roto/baja)
  //  - cilindros.reparaciones (viene del reporte de compras histórico: si la
  //    última reparación no tiene remito, el cilindro sigue "en poder del
  //    proveedor" aunque nadie haya cargado nunca un movimiento a mano)
  // Gana la fuente con la fecha más reciente. Si nunca se cargó un
  // movimiento, se usa lo que diga la última reparación.
  // ============================================================================
  const estadoEfectivoPorCodigo = useMemo(() => {
    const map = {};
    catalogo.forEach((c) => {
      const mov = estadoActualPorCodigo[c.codigo];
      const rep = ultimaReparacionPorCodigo[c.codigo];

      const fechaMov = mov?.fecha ? new Date(mov.fecha) : null;
      const fechaRep = rep?.fecha_solicitud ? new Date(rep.fecha_solicitud) : null;

      if (fechaMov && (!fechaRep || fechaMov >= fechaRep)) {
        map[c.codigo] = { estado: mov.estado, fecha: mov.fecha, proveedor: mov.proveedor, origen: 'movimiento' };
      } else if (rep && rep.estado_reparacion === 'En poder del proveedor (en reparación)') {
        map[c.codigo] = { estado: 'en_proveedor', fecha: rep.fecha_solicitud, proveedor: rep.proveedor, origen: 'reparacion' };
      } else if (rep && rep.estado_reparacion === 'Reparado - Recibido en Almacén') {
        map[c.codigo] = { estado: 'en_stock', fecha: rep.remito_fecha || rep.fecha_solicitud, proveedor: null, origen: 'reparacion' };
      } else if (mov) {
        map[c.codigo] = { estado: mov.estado, fecha: mov.fecha, proveedor: mov.proveedor, origen: 'movimiento' };
      }
    });
    return map;
  }, [catalogo, estadoActualPorCodigo, ultimaReparacionPorCodigo]);

  const DIAS_ALERTA_ESTADO = 30;

  // Todos los códigos actualmente "en poder del proveedor" o "roto en almacén",
  // sin importar hace cuánto — la vista completa que se puede abrir desde el
  // dashboard con un botón.
  const cilindrosEnProveedorORoto = useMemo(() => {
    return Object.entries(estadoEfectivoPorCodigo)
      .filter(([, e]) => e.estado === 'en_proveedor' || e.estado === 'roto_en_almacen')
      .map(([codigo, e]) => {
        const dias = diasDesde(e.fecha);
        const c = catalogo.find((x) => x.codigo === codigo);
        return {
          codigo,
          estado: e.estado,
          dias,
          fecha: e.fecha,
          descripcion_unificada: c?.descripcion_unificada || c?.descripcion_original || '',
          proveedor: e.proveedor,
          origen: e.origen,
        };
      })
      .sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1));
  }, [estadoEfectivoPorCodigo, catalogo]);

  // Alertas = el subconjunto de la lista de arriba con 30+ días
  const alertasOperativas = useMemo(
    () => cilindrosEnProveedorORoto.filter((a) => a.dias !== null && a.dias >= DIAS_ALERTA_ESTADO),
    [cilindrosEnProveedorORoto]
  );

  // Vista "todos en poder del proveedor" que se abre con el botón del dashboard
  const [mostrarTodosEnProveedor, setMostrarTodosEnProveedor] = useState(false);

  // Filtro final por estado operativo (usa estadoEfectivoPorCodigo, que se
  // calcula más arriba combinando movimientos + reparaciones histórico).
  const codesInGroupFiltrados = useMemo(() => {
    if (filtroEstadoOperativo === 'todos') return codesInGroupFiltradosBase;
    return codesInGroupFiltradosBase.filter(
      (c) => estadoEfectivoPorCodigo[c.codigo]?.estado === filtroEstadoOperativo
    );
  }, [codesInGroupFiltradosBase, filtroEstadoOperativo, estadoEfectivoPorCodigo]);

  const totals = useMemo(() => {
    const codes = new Set(catalogo.map((c) => c.codigo));
    const estados = Object.values(estadoEfectivoPorCodigo);
    const enProveedor = estados.filter((e) => e.estado === 'en_proveedor').length;
    const enAlmacen = estados.filter((e) => e.estado === 'en_stock').length;
    return { codigos: codes.size, reparaciones: reparaciones.length, enProveedor, enAlmacen };
  }, [catalogo, reparaciones, estadoEfectivoPorCodigo]);

  function irACodigo(codigo) {
    const grupo = groups.find((g) => g.codes.has(codigo));
    if (grupo) setSelectedGroup(grupo.name);
    setSelectedCode(codigo);
    setMostrarHistorialMovimientos(false);
    setBusquedaGlobal('');
    setBusquedaGlobalAbierta(false);
    setVistaPrincipal('cilindros');
  }

  const resultadosBusquedaGlobal = useMemo(() => {
    if (!busquedaGlobal.trim()) return [];
    const q = busquedaGlobal.trim().toUpperCase();
    return catalogo
      .filter(
        (c) =>
          c.codigo.toUpperCase().includes(q) ||
          (c.descripcion_unificada || '').toUpperCase().includes(q) ||
          (c.descripcion_original || '').toUpperCase().includes(q)
      )
      .slice(0, 8);
  }, [busquedaGlobal, catalogo]);

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

  const vm = {
    query, setQuery,
    ordenSidebar, setOrdenSidebar,
    filteredGroups,
    selectedGroup, setSelectedGroup,
    selectedCode, setSelectedCode,
    codeQuery, setCodeQuery,
    fechaDesde, setFechaDesde,
    fechaHasta, setFechaHasta,
    ocultarInactivos, setOcultarInactivos,
    groups,
    activeGroup,
    codesInGroup,
    codesInGroupFiltrados,
    cantidadInactivosEnGrupo,
    chartMensual,
    selectedCodeRows,
    estadoActualPorCodigo,
    historialMovimientos,
    mostrarHistorialMovimientos, setMostrarHistorialMovimientos,
    esAdmin, puedeDarBaja, puedeRegistrarMovimiento, puedeRegistrarReparacion,
    catalogo,
    editandoCatalogo, setEditandoCatalogo,
    formCatalogo, setFormCatalogo,
    guardandoCatalogo, guardarCatalogacion,
    mostrarFormMovimiento, setMostrarFormMovimiento,
    formMovimiento, setFormMovimiento,
    guardandoMovimiento, registrarMovimiento,
    unidades,
    mostrarFormBaja, setMostrarFormBaja,
    formBaja, setFormBaja,
    guardandoBaja, darDeBaja,
    cancelandoBaja, cancelarBaja,
    unidadNombre,
    mostrarFormReparacion, setMostrarFormReparacion,
    formReparacion, setFormReparacion,
    guardandoReparacion, registrarReparacion,
    alertasOperativas,
    irACodigo,
    filtroEstadoOperativo, setFiltroEstadoOperativo,
    editandoMovimientoId, abrirEditarMovimiento,
    formEditarMovimiento, setFormEditarMovimiento,
    guardandoEditarMovimiento, guardarEditarMovimiento,
    setEditandoMovimientoId,
  };

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

        <div style={{ position: 'relative' }}>
          <input
            placeholder="🔍 Buscar código o descripción..."
            value={busquedaGlobal}
            onChange={(e) => { setBusquedaGlobal(e.target.value); setBusquedaGlobalAbierta(true); }}
            onFocus={() => setBusquedaGlobalAbierta(true)}
            onBlur={() => setTimeout(() => setBusquedaGlobalAbierta(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Enter' && resultadosBusquedaGlobal[0]) irACodigo(resultadosBusquedaGlobal[0].codigo); }}
            style={styles.globalSearchInput}
          />
          {busquedaGlobalAbierta && busquedaGlobal.trim() && (
            <div style={styles.globalSearchDropdown}>
              {resultadosBusquedaGlobal.length === 0 ? (
                <div style={styles.globalSearchEmpty}>Sin resultados</div>
              ) : (
                resultadosBusquedaGlobal.map((c) => (
                  <div key={c.codigo} style={styles.globalSearchItem} className="row-hover" onClick={() => irACodigo(c.codigo)}>
                    <span style={styles.globalSearchCodigo}>{c.codigo}</span>
                    <span style={styles.globalSearchDesc}>{c.descripcion_unificada || c.descripcion_original}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div style={styles.headerStats}>
          <Stat label="Códigos activos" value={totals.codigos} />
          <Stat label="Reparaciones (OC)" value={totals.reparaciones} />
          <Stat label="En proveedor" value={totals.enProveedor} accent="#E8871E" />
          <Stat label="En almacén" value={totals.enAlmacen} accent="#4FA98C" />
          <button
            style={{ ...styles.adminBtnPrimary, ...(mostrarTodosEnProveedor ? styles.filterToggleActive : {}) }}
            onClick={() => setMostrarTodosEnProveedor((v) => !v)}
          >
            📦 En poder del proveedor ({cilindrosEnProveedorORoto.length})
          </button>
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

      {mostrarTodosEnProveedor && (
        <div style={styles.modalOverlay} onClick={() => setMostrarTodosEnProveedor(false)}>
          <div style={{ ...styles.modalCard, width: 640, maxHeight: '75vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.adminPanelTitle}>
              En poder del proveedor o roto — {cilindrosEnProveedorORoto.length}
            </div>
            {cilindrosEnProveedorORoto.length === 0 ? (
              <div style={styles.alertasVacio}>No hay ningún cilindro en poder del proveedor ni roto en este momento.</div>
            ) : (
              <div style={styles.alertasList}>
                {cilindrosEnProveedorORoto.map((a) => (
                  <div
                    key={a.codigo}
                    style={styles.alertaRow}
                    className="row-hover"
                    onClick={() => { irACodigo(a.codigo); setMostrarTodosEnProveedor(false); }}
                  >
                    <span style={{
                      ...styles.statusBadge,
                      ...(a.estado === 'roto_en_almacen'
                        ? { color: '#C0392B', background: 'rgba(192,57,43,0.16)' }
                        : { color: '#E8871E', background: 'rgba(232,135,30,0.16)' }),
                      minWidth: 150, textAlign: 'center',
                    }}>
                      {a.estado === 'roto_en_almacen' ? 'Roto — en almacén' : 'En poder del proveedor'}
                    </span>
                    <span style={styles.alertaCodigo}>{a.codigo}</span>
                    <span style={styles.alertaDesc}>{a.descripcion_unificada}</span>
                    {a.proveedor && <span style={styles.alertaProveedor}>{a.proveedor}</span>}
                    <span style={styles.alertaDias}>{a.dias !== null ? `hace ${a.dias} días` : ''}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ ...styles.adminFormActions, marginTop: 16 }}>
              <button style={styles.adminBtn} onClick={() => setMostrarTodosEnProveedor(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.tabBar}>
        <button
          style={{ ...styles.tabBtn, ...(vistaPrincipal === 'cilindros' ? styles.tabBtnActive : {}) }}
          onClick={() => setVistaPrincipal('cilindros')}
        >
          Cilindros
        </button>
        <button
          style={{ ...styles.tabBtn, ...(vistaPrincipal === 'unidades' ? styles.tabBtnActive : {}) }}
          onClick={() => setVistaPrincipal('unidades')}
        >
          Unidades {unidades.length > 0 ? `(${unidades.length})` : ''}
        </button>
      </div>

      {vistaPrincipal === 'cilindros' && (
        <VistaCilindros vm={vm} />
      )}

      {vistaPrincipal === 'unidades' && (
        <UnidadesTab
          unidades={unidades}
          puedeGestionar={puedeGestionarUnidades}
          onRefresh={cargarDatos}
        />
      )}

      <div style={styles.footer}>
        Dato de estado: inferido a partir de OC / Remito / Factura del reporte de compras (no refleja ubicación física en tiempo real).
      </div>
    </div>
  );
}
