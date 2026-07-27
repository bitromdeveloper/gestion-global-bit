import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

// ============================================================================
// IMPORTAR REPORTE — sube el Excel de compras y actualiza cilindros.
//
// Por código (agrupando todas sus filas del reporte):
//  1. Si tiene OC (en este reporte o ya en nuestra base) -> se procesa como
//     reparación normal en cilindros.reparaciones (estado "En poder del
//     proveedor" sale solo, como siempre).
//  2. Si NO tiene OC en ningún lado -> se mira la fila MÁS RECIENTE de ese
//     código en el reporte y su ESTADO_FINAL_RC:
//       - Con OC Definitiva / Aprobada - OC eliminada / Pendiente /
//         En Licitación  -> movimiento "en_proveedor"
//       - Borrada / Devuelta / Rechazada / Aprobada -> movimiento "baja"
//     (esto va a cilindros.movimientos, no a reparaciones, porque no hay
//     ninguna OC real que registrar — solo un cambio de estado operativo)
//
// Si el código todavía no está en el catálogo, se da de alta solo, marcado
// "pendiente_revision" para que un admin le asigne descripción después.
//
// No duplica movimientos: si el estado actual del código ya es el mismo que
// se calcularía, no inserta nada — así se puede reimportar semana a semana
// sin ensuciar el historial con filas repetidas.
// ============================================================================

const ESTADOS_ACTIVOS = ['Con OC Definitiva', 'Aprobada - OC eliminada', 'Pendiente', 'En Licitación'];
const ESTADOS_BAJA = ['Borrada', 'Devuelta', 'Rechazada', 'Aprobada'];

function normalizar(s) {
  return (s || '').toString().trim().toLowerCase();
}
function estaEnLista(valor, lista) {
  const v = normalizar(valor);
  return lista.some((x) => normalizar(x) === v);
}

function parseFechaDDMMYYYY(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const anio = y.length === 2 ? `20${y}` : y;
  return `${anio}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function calcularEstadoReparacion(row) {
  if (row.remito_estado === 'Verificado') return 'Reparado - Recibido en Almacén';
  if (row.oc_definitiva) return 'En poder del proveedor (en reparación)';
  return null;
}

export default function ImportarReporte({ catalogoCodigos, codigosConOcEnDB, estadoActualPorCodigo, usuarioId, onImportado, onCerrar }) {
  const [archivo, setArchivo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);

  async function procesarArchivo() {
    if (!archivo) return;
    setProcesando(true);
    setResultado(null);

    try {
      const buffer = await archivo.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const primeraHoja = wb.Sheets[wb.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(primeraHoja, { defval: null });

      const total = filas.length;

      // Filtro base: solo IUSA (no San Isidro) y código de cilindro (CIL...).
      // OJO: acá NO se filtra por OC — necesitamos ver también las filas sin
      // OC para poder clasificarlas por ESTADO_FINAL_RC.
      const filtradas = filas.filter((f) => {
        const planta = f.REQ_Planta_descripcion || f.Planta || '';
        const codigo = (f.REQ_Material || '').toString().toUpperCase();
        return planta.toString().toUpperCase() === 'IUSA' && codigo.startsWith('CIL');
      });

      // Agrupar por código
      const porCodigo = new Map();
      filtradas.forEach((f) => {
        const codigo = f.REQ_Material;
        if (!codigo) return;
        if (!porCodigo.has(codigo)) porCodigo.set(codigo, []);
        porCodigo.get(codigo).push(f);
      });

      const codigosSet = new Set(catalogoCodigos);
      const codigosNuevos = new Map(); // codigo -> descripcion cruda
      const filasReparacionesAInsertar = [];
      const movimientosAInsertar = []; // { codigo, estado, observaciones }
      let sinClasificar = 0;

      for (const [codigo, filasCodigo] of porCodigo) {
        const tieneOcEnReporte = filasCodigo.some(
          (f) => f.OC_definitiva !== null && f.OC_definitiva !== undefined && f.OC_definitiva !== ''
        );
        const tieneOc = tieneOcEnReporte || codigosConOcEnDB.has(codigo);

        const marcarComoNuevoSiHaceFalta = () => {
          if (!codigosSet.has(codigo) && !codigosNuevos.has(codigo)) {
            const descripcionCruda = filasCodigo[0].REQ_descripcion_corta || filasCodigo[0].REQ_descripcion_larga || codigo;
            codigosNuevos.set(codigo, descripcionCruda);
          }
        };

        if (tieneOc) {
          // Reparación normal: se cargan todas las filas de este código que
          // efectivamente tengan OC (las que no tienen, se ignoran — ya
          // sabemos que este código está en uso por las que sí tienen).
          filasCodigo
            .filter((f) => f.OC_definitiva !== null && f.OC_definitiva !== undefined && f.OC_definitiva !== '')
            .forEach((f) => {
              const row = {
                codigo,
                fecha_solicitud: parseFechaDDMMYYYY(f.REQ_fecha_creacion),
                oc_definitiva: String(f.OC_definitiva),
                proveedor: f.OC_proveedor || null,
                precio_unitario: f.REQ_precio || null,
                precio_total: f.REQ_Precio_total || null,
                moneda: f.REQ_moneda || 'ARS',
                remito_nro: f.REMITO_nro || null,
                remito_estado: f.REMITO_estado || null,
                remito_fecha: parseFechaDDMMYYYY(f.REMITO_fecha),
                factura_numero: f.FACTURA_numero || null,
                factura_estado: f.FACTURA_estado || null,
                estado_final_rc: f.ESTADO_FINAL_RC || null,
              };
              row.estado_reparacion = calcularEstadoReparacion(row);
              filasReparacionesAInsertar.push(row);
            });
          marcarComoNuevoSiHaceFalta();
        } else {
          // Sin OC en ningún lado: clasificar por la fila más reciente
          const masReciente = [...filasCodigo].sort((a, b) => {
            const da = parseFechaDDMMYYYY(a.REQ_fecha_creacion) || '';
            const db = parseFechaDDMMYYYY(b.REQ_fecha_creacion) || '';
            return db.localeCompare(da); // más reciente primero
          })[0];
          const estadoRC = masReciente.ESTADO_FINAL_RC;

          let nuevoEstado = null;
          let motivo = null;
          if (estaEnLista(estadoRC, ESTADOS_ACTIVOS)) {
            nuevoEstado = 'en_proveedor';
            motivo = `RC: ${estadoRC} (automático desde importación)`;
          } else if (estaEnLista(estadoRC, ESTADOS_BAJA)) {
            nuevoEstado = 'baja';
            motivo = `RC: ${estadoRC} (automático desde importación)`;
          } else {
            sinClasificar++;
          }

          if (nuevoEstado) {
            // No duplicar: si el estado actual del código ya es este mismo, no insertar de nuevo
            const estadoActual = estadoActualPorCodigo[codigo]?.estado;
            if (estadoActual !== nuevoEstado) {
              movimientosAInsertar.push({ codigo, estado: nuevoEstado, observaciones: motivo });
            }
            marcarComoNuevoSiHaceFalta();
          }
        }
      }

      // Dar de alta los códigos nuevos como "pendiente de revisión"
      let catalogadosNuevos = 0;
      let erroresCatalogacion = 0;
      for (const [codigo, descripcion] of codigosNuevos) {
        const { error } = await supabase
          .schema('cilindros')
          .from('catalogo')
          .insert({
            codigo,
            descripcion_original: descripcion,
            descripcion_unificada: null,
            equipo: null,
            pendiente_revision: true,
            creado_por: usuarioId || null,
          });
        if (error) {
          console.error(`No se pudo catalogar ${codigo}:`, error.message);
          erroresCatalogacion++;
        } else {
          catalogadosNuevos++;
        }
      }

      const codigosSetFinal = new Set([...catalogoCodigos, ...codigosNuevos.keys()]);
      let reparacionesFinales = filasReparacionesAInsertar.filter((r) => codigosSetFinal.has(r.codigo));

      // Deduplicar por (código, OC): si el reporte trae la misma OC repetida
      // más de una vez (reenvío, corrección, etc.), Postgres rechaza el
      // upsert entero si dos filas del mismo lote apuntan al mismo conflicto.
      // Nos quedamos con la más "completa" (la que tiene remito verificado,
      // si alguna la tiene; si no, la última del archivo).
      const dedupMap = new Map();
      for (const row of reparacionesFinales) {
        const key = `${row.codigo}||${row.oc_definitiva}`;
        const existente = dedupMap.get(key);
        if (!existente || row.remito_estado === 'Verificado') {
          dedupMap.set(key, row);
        }
      }
      const duplicadosDetectados = reparacionesFinales.length - dedupMap.size;
      reparacionesFinales = [...dedupMap.values()];

      const movimientosFinales = movimientosAInsertar.filter((m) => codigosSetFinal.has(m.codigo));

      // Upsert de reparaciones (en bloques)
      const BLOQUE = 300;
      let repInsertadas = 0;
      for (let i = 0; i < reparacionesFinales.length; i += BLOQUE) {
        const bloque = reparacionesFinales.slice(i, i + BLOQUE);
        const { error } = await supabase
          .schema('cilindros')
          .from('reparaciones')
          .upsert(bloque, { onConflict: 'codigo,oc_definitiva' });
        if (error) throw error;
        repInsertadas += bloque.length;
      }

      // Insert de movimientos automáticos (uno por vez, son pocos)
      let movInsertados = 0;
      for (const m of movimientosFinales) {
        const { error } = await supabase
          .schema('cilindros')
          .from('movimientos')
          .insert({ codigo: m.codigo, estado: m.estado, observaciones: m.observaciones, registrado_por: usuarioId || null });
        if (error) {
          console.error(`No se pudo registrar movimiento de ${m.codigo}:`, error.message);
        } else {
          movInsertados++;
        }
      }

      setResultado({
        total,
        codigosDetectados: porCodigo.size,
        catalogadosNuevos,
        erroresCatalogacion,
        duplicadosDetectados,
        repInsertadas,
        movInsertados,
        sinClasificar,
      });
      if (onImportado) await onImportado();
    } catch (e) {
      console.error('Error importando reporte:', e);
      setResultado({ error: e.message });
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.card} onClick={(e) => e.stopPropagation()}>
        <div style={s.titulo}>Importar reporte de compras</div>
        <p style={s.texto}>
          Subí el Excel del reporte. Se filtra automáticamente a solo IUSA y códigos de
          cilindro (<strong>CIL...</strong>). Los códigos con OC se cargan como reparación;
          los que no tienen OC se clasifican por su último <strong>ESTADO_FINAL_RC</strong>:
          en poder del proveedor o dados de baja automáticamente. No duplica nada si volvés
          a importar el mismo reporte más adelante.
        </p>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setArchivo(e.target.files[0])}
          style={s.fileInput}
        />

        {resultado && !resultado.error && (
          <div style={s.resumen}>
            <div>Filas en el archivo: <strong>{resultado.total}</strong></div>
            <div>Códigos de cilindro detectados (IUSA): <strong>{resultado.codigosDetectados}</strong></div>
            {resultado.catalogadosNuevos > 0 && (
              <div style={{ color: '#E8871E' }}>
                Códigos nuevos dados de alta (pendientes de revisión): <strong>{resultado.catalogadosNuevos}</strong>
              </div>
            )}
            {resultado.erroresCatalogacion > 0 && (
              <div style={{ color: '#C0392B' }}>
                Códigos nuevos que no se pudieron catalogar (sin permiso): <strong>{resultado.erroresCatalogacion}</strong>
              </div>
            )}
            {resultado.duplicadosDetectados > 0 && (
              <div style={{ color: '#8B9199' }}>
                Filas duplicadas (mismo código + OC repetido en el archivo): <strong>{resultado.duplicadosDetectados}</strong>
              </div>
            )}
            <div style={{ color: '#4FA98C' }}>Reparaciones cargadas / actualizadas: <strong>{resultado.repInsertadas}</strong></div>
            <div style={{ color: '#5B7A99' }}>Movimientos automáticos registrados (en proveedor / baja): <strong>{resultado.movInsertados}</strong></div>
            {resultado.sinClasificar > 0 && (
              <div style={{ color: '#E8871E' }}>
                Códigos sin OC con un ESTADO_FINAL_RC no reconocido: <strong>{resultado.sinClasificar}</strong> (revisar a mano)
              </div>
            )}
          </div>
        )}
        {resultado && resultado.error && (
          <div style={{ ...s.resumen, color: '#E8871E' }}>Error: {resultado.error}</div>
        )}

        <div style={s.acciones}>
          <button style={s.btnSecundario} onClick={onCerrar}>Cerrar</button>
          <button style={s.btnPrimario} disabled={!archivo || procesando} onClick={procesarArchivo}>
            {procesando ? 'Procesando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  card: { background: '#24282C', border: '1px solid #3A4048', borderRadius: 10, padding: 24, width: 500, fontFamily: "'Oswald', sans-serif", color: '#E8E6E1' },
  titulo: { fontSize: 15, fontWeight: 600, marginBottom: 10 },
  texto: { fontSize: 12, color: '#8B9199', lineHeight: 1.5, marginBottom: 16 },
  fileInput: { fontSize: 12, color: '#D8D6D1', marginBottom: 16, width: '100%' },
  resumen: { fontSize: 12.5, background: '#1C1F22', border: '1px solid #2E3338', borderRadius: 8, padding: 12, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 },
  acciones: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  btnSecundario: { background: '#1C1F22', border: '1px solid #3A4048', color: '#D8D6D1', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  btnPrimario: { background: '#5B7A99', border: '1px solid #5B7A99', color: '#fff', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 },
};
