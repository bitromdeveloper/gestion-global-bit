import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { TIPOS_TUBO } from '../lib/constants';

export default function Precios() {
  const [tubos, setTubos]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);
  const [msg, setMsg]         = useState({ type:'', text:'' });

  // Tarifas editables por tipo — se inicializan desde los tubos
  const [tarifas, setTarifas] = useState({});

  useEffect(() => { fetchTubos(); }, []);

  const fetchTubos = async () => {
    setLoading(true);
    try {
      const data = await db.getTubos();
      setTubos(data || []);

      // Inicializar tarifas desde el primer tubo de cada tipo
      const t = {};
      TIPOS_TUBO.forEach(tipo => {
        const tubo = data?.find(t => t.tipo === tipo);
        if (tubo) {
          t[tipo] = {
            precio_unitario:  parseFloat(tubo.precio_unitario)  || 0,
            alquiler_mensual: parseFloat(tubo.alquiler_mensual) || 0,
            precio_transporte:parseFloat(tubo.precio_transporte)|| 0,
            unidad: tubo.unidad,
          };
        }
      });
      setTarifas(t);
    } catch {}
    setLoading(false);
  };

  // Guardar tarifas de un tipo — actualiza TODOS los tubos de ese tipo
  const handleGuardar = async (tipo) => {
    setSaving(tipo);
    setMsg({ type:'', text:'' });
    try {
      const tarifa = tarifas[tipo];
      const tubosDelTipo = tubos.filter(t => t.tipo === tipo);

      // Actualizar cada tubo del tipo con los nuevos precios
      for (const tubo of tubosDelTipo) {
        await supabase.from('tubos').update({
          precio_unitario:   tarifa.precio_unitario,
          alquiler_mensual:  tarifa.alquiler_mensual,
          precio_transporte: tarifa.precio_transporte,
          updated_at: new Date().toISOString(),
        }).eq('id', tubo.id);
      }

      // Refrescar tubos para que los cálculos queden actualizados
      await fetchTubos();
      setMsg({ type:'success', text:`✓ Tarifas de ${tipo} actualizadas en ${tubosDelTipo.length} tubo${tubosDelTipo.length > 1 ? 's' : ''}` });
      setTimeout(() => setMsg({ type:'', text:'' }), 3000);
    } catch (err) {
      setMsg({ type:'error', text:'✗ Error al guardar: ' + err.message });
    }
    setSaving(null);
  };

  const setTarifa = (tipo, campo, valor) => {
    setTarifas(prev => ({
      ...prev,
      [tipo]: { ...prev[tipo], [campo]: parseFloat(valor) || 0 }
    }));
  };

  if (loading) return <div style={s.loading}>Cargando...</div>;

  // Resumen de alquiler total
  const totalAlquilerMes = TIPOS_TUBO.reduce((sum, tipo) => {
    const cantidad = tubos.filter(t => t.tipo === tipo).length;
    const alquiler = tarifas[tipo]?.alquiler_mensual || 0;
    return sum + (cantidad * alquiler);
  }, 0);

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Precios y Tarifas</h2>
          <p style={s.pageSub}>Modificá las tarifas por tipo de gas. Se aplican a todos los tubos de ese tipo automáticamente.</p>
        </div>
      </div>

      {msg.text && (
        <div style={msg.type === 'error' ? s.errorMsg : s.successMsg}>{msg.text}</div>
      )}

      {/* Tarjetas editables por tipo */}
      <div style={s.tipoGrid}>
        {TIPOS_TUBO.map(tipo => {
          const tarifa   = tarifas[tipo];
          const cantidad = tubos.filter(t => t.tipo === tipo).length;
          if (!tarifa) return null;

          const costoAlquilerTotal = tarifa.alquiler_mensual * cantidad;
          const isSaving = saving === tipo;

          return (
            <div key={tipo} style={s.tipoCard}>
              <div style={s.tipoHeader}>
                <div style={s.tipoNombre}>{tipo}</div>
                <div style={s.tipoCantidad}>{cantidad} tubo{cantidad !== 1 ? 's' : ''}</div>
              </div>

              <div style={s.campos}>
                <div style={s.campo}>
                  <label style={s.campoLabel}>Precio gas (por {tarifa.unidad})</label>
                  <div style={s.campoInput}>
                    <span style={s.prefix}>$</span>
                    <input style={s.input} type="number" step="0.01" min="0"
                      value={tarifa.precio_unitario}
                      onChange={e => setTarifa(tipo, 'precio_unitario', e.target.value)} />
                    <span style={s.suffix}>/{tarifa.unidad}</span>
                  </div>
                </div>

                <div style={s.campo}>
                  <label style={s.campoLabel}>Alquiler mensual por tubo</label>
                  <div style={s.campoInput}>
                    <span style={s.prefix}>$</span>
                    <input style={s.input} type="number" step="0.01" min="0"
                      value={tarifa.alquiler_mensual}
                      onChange={e => setTarifa(tipo, 'alquiler_mensual', e.target.value)} />
                    <span style={s.suffix}>/mes</span>
                  </div>
                </div>

                <div style={s.campo}>
                  <label style={s.campoLabel}>Transporte por recarga</label>
                  <div style={s.campoInput}>
                    <span style={s.prefix}>$</span>
                    <input style={s.input} type="number" step="0.01" min="0"
                      value={tarifa.precio_transporte}
                      onChange={e => setTarifa(tipo, 'precio_transporte', e.target.value)} />
                    <span style={s.suffix}>/recarga</span>
                  </div>
                </div>
              </div>

              {/* Cálculo automático de alquiler */}
              <div style={s.calculoRow}>
                <span style={s.calculoLabel}>
                  {cantidad} tubos × ${tarifa.alquiler_mensual.toFixed(2)}
                </span>
                <span style={s.calculoValor}>${costoAlquilerTotal.toFixed(2)}/mes</span>
              </div>

              <button
                style={{ ...s.guardarBtn, opacity: isSaving ? 0.7 : 1 }}
                onClick={() => handleGuardar(tipo)}
                disabled={isSaving}>
                {isSaving ? 'Guardando...' : `Guardar tarifas de ${tipo}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Resumen total de alquiler mensual */}
      <div style={s.resumenCard}>
        <div style={s.resumenTitulo}>Alquiler mensual total del stock actual</div>
        <div style={s.resumenDetalle}>
          {TIPOS_TUBO.map(tipo => {
            const tarifa   = tarifas[tipo];
            const cantidad = tubos.filter(t => t.tipo === tipo).length;
            if (!tarifa || cantidad === 0) return null;
            return (
              <div key={tipo} style={s.resumenItem}>
                <span style={s.resumenLabel}>{tipo} — {cantidad} tubos × ${tarifa.alquiler_mensual.toFixed(2)}</span>
                <span style={s.resumenValor}>${(cantidad * tarifa.alquiler_mensual).toFixed(2)}</span>
              </div>
            );
          })}
          <div style={{ ...s.resumenItem, borderTop:'2px solid #e2e8f0', paddingTop:12, marginTop:8 }}>
            <span style={{ ...s.resumenLabel, fontWeight:700, color:'#0f172a', fontSize:15 }}>TOTAL ALQUILER MENSUAL</span>
            <span style={{ ...s.resumenValor, fontSize:18, color:'#2563eb' }}>${totalAlquilerMes.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style={s.nota}>
        <strong>Nota:</strong> Al guardar, los nuevos precios se aplican a todos los tubos de ese tipo.
        Los cálculos de costos del mes actual se actualizarán automáticamente.
      </div>
    </div>
  );
}

const s = {
  loading:       { textAlign:'center', color:'#94a3b8', padding:'60px 0' },
  pageHeader:    { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 },
  pageTitle:     { margin:'0 0 4px', fontSize:22, fontWeight:700, color:'#0f172a' },
  pageSub:       { margin:0, fontSize:13, color:'#64748b' },
  tipoGrid:      { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16, marginBottom:20 },
  tipoCard:      { background:'#fff', borderRadius:12, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  tipoHeader:    { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  tipoNombre:    { fontSize:20, fontWeight:800, color:'#0f172a' },
  tipoCantidad:  { fontSize:13, color:'#64748b', background:'#f1f5f9', padding:'4px 10px', borderRadius:99 },
  campos:        { display:'flex', flexDirection:'column', gap:14, marginBottom:16 },
  campo:         { display:'flex', flexDirection:'column', gap:5 },
  campoLabel:    { fontSize:12, fontWeight:600, color:'#374151' },
  campoInput:    { display:'flex', alignItems:'center', gap:4 },
  prefix:        { fontSize:14, color:'#64748b', fontWeight:500 },
  suffix:        { fontSize:13, color:'#64748b' },
  input:         { flex:1, padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, color:'#0f172a', outline:'none', fontFamily:'inherit' },
  calculoRow:    { display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc', borderRadius:8, padding:'10px 14px', marginBottom:16 },
  calculoLabel:  { fontSize:13, color:'#64748b' },
  calculoValor:  { fontSize:14, fontWeight:700, color:'#2563eb' },
  guardarBtn:    { width:'100%', padding:'10px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' },
  resumenCard:   { background:'#fff', borderRadius:12, padding:24, marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  resumenTitulo: { fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:16 },
  resumenDetalle:{ display:'flex', flexDirection:'column', gap:8 },
  resumenItem:   { display:'flex', justifyContent:'space-between', alignItems:'center' },
  resumenLabel:  { fontSize:14, color:'#475569' },
  resumenValor:  { fontSize:14, fontWeight:600, color:'#0f172a' },
  successMsg:    { background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:8, padding:'10px 16px', fontSize:13, color:'#065f46', marginBottom:16 },
  errorMsg:      { background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 16px', fontSize:13, color:'#991b1b', marginBottom:16 },
  nota:          { background:'#fef9c3', border:'1px solid #fde68a', borderRadius:8, padding:'12px 16px', fontSize:13, color:'#713f12' },
};
