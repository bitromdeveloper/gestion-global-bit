import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

// ============================================================================
// IMPORTAR REPORTE — sube el Excel de compras y actualiza cilindros.reparaciones.
// Si aparece un código que todavía no está en el catálogo, se da de alta
// SOLO, pero marcado como "pendiente_revision" — no se le asigna ninguna
// descripción unificada acá. Eso lo hace un admin después, desde
// "Pendientes de catalogar", eligiendo entre las descripciones ya existentes
// (nunca texto libre — una categoría nueva de verdad se agrega a mano en la
// tabla, fuera de la app).
// ============================================================================

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

function calcularEstado(row) {
  if (row.remito_estado === 'Verificado') return 'Reparado - Recibido en Almacén';
  if (row.oc_definitiva) return 'En poder del proveedor (en reparación)';
  return null;
}

export default function ImportarReporte({ catalogoCodigos, usuarioId, onImportado, onCerrar }) {
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

      // Filtro: solo IUSA (no San Isidro) y con OC definitiva.
      const filtradas = filas.filter((f) => {
        const planta = f.REQ_Planta_descripcion || f.Planta || '';
        const oc = f.OC_definitiva;
        return planta.toString().toUpperCase() === 'IUSA' && oc !== null && oc !== undefined && oc !== '';
      });

      const codigosSet = new Set(catalogoCodigos);
      const codigosNuevos = new Map(); // codigo -> descripcion cruda del reporte
      const filasValidas = [];

      for (const f of filtradas) {
        const codigo = f.REQ_Material;
        if (!codigo) continue;

        if (!codigosSet.has(codigo) && !codigosNuevos.has(codigo)) {
          const descripcionCruda = f.REQ_descripcion_corta || f.REQ_descripcion_larga || codigo;
          codigosNuevos.set(codigo, descripcionCruda);
        }

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
        row.estado_reparacion = calcularEstado(row);
        filasValidas.push(row);
      }

      // Dar de alta los códigos nuevos como "pendiente de revisión"
      // (si el usuario que importa no tiene permiso — ej. compras sin ese
      // alcance — Supabase va a rechazar el insert y avisamos abajo).
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

      // Solo se insertan reparaciones de códigos que existen en catálogo
      // (los que fallaron al catalogar quedan afuera de este import, se
      // pueden reintentar en la próxima corrida una vez resuelto el permiso).
      const codigosSetFinal = new Set([...catalogoCodigos, ...codigosNuevos.keys()]);
      const filasFinales = filasValidas.filter((r) => codigosSetFinal.has(r.codigo));

      const BLOQUE = 300;
      let insertadas = 0;
      for (let i = 0; i < filasFinales.length; i += BLOQUE) {
        const bloque = filasFinales.slice(i, i + BLOQUE);
        const { error } = await supabase
          .schema('cilindros')
          .from('reparaciones')
          .upsert(bloque, { onConflict: 'codigo,oc_definitiva' });
        if (error) throw error;
        insertadas += bloque.length;
      }

      setResultado({
        total,
        filtradas: filtradas.length,
        catalogadosNuevos,
        erroresCatalogacion,
        insertadas,
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
          Subí el Excel del reporte (mismo formato de siempre). Se actualizan las
          reparaciones de IUSA con OC. Si aparece un código que todavía no está
          catalogado, se da de alta solo — pero queda marcado como <strong>pendiente</strong> hasta
          que un admin le asigne una descripción desde "Pendientes de catalogar".
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
            <div>Filas IUSA con OC: <strong>{resultado.filtradas}</strong></div>
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
            <div style={{ color: '#4FA98C' }}>Reparaciones cargadas / actualizadas: <strong>{resultado.insertadas}</strong></div>
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
  card: { background: '#24282C', border: '1px solid #3A4048', borderRadius: 10, padding: 24, width: 480, fontFamily: "'Oswald', sans-serif", color: '#E8E6E1' },
  titulo: { fontSize: 15, fontWeight: 600, marginBottom: 10 },
  texto: { fontSize: 12, color: '#8B9199', lineHeight: 1.5, marginBottom: 16 },
  fileInput: { fontSize: 12, color: '#D8D6D1', marginBottom: 16, width: '100%' },
  resumen: { fontSize: 12.5, background: '#1C1F22', border: '1px solid #2E3338', borderRadius: 8, padding: 12, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 },
  acciones: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  btnSecundario: { background: '#1C1F22', border: '1px solid #3A4048', color: '#D8D6D1', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  btnPrimario: { background: '#5B7A99', border: '1px solid #5B7A99', color: '#fff', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 },
};
