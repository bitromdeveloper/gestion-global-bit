import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useAuth } from '../components/AuthContext';
import { TIPOS_TUBO, SECTORES } from '../lib/constants';

export default function Movimientos() {
  const { user } = useAuth();
  const [tubos, setTubos]       = useState([]);
  const [operacion, setOperacion] = useState('');
  const [tuboId, setTuboId]     = useState('');
  const [destino, setDestino]   = useState('');
  const [pedidoPor, setPedidoPor] = useState('');
  const [observaciones, setObs] = useState('');
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState({ type:'', text:'' });

  // Tubos disponibles según la operación
  const [nuevoTubo, setNuevoTubo] = useState({
    codigo:'', tipo:'O2', capacidad:'', unidad:'kg',
    pedido_por:'', precio_unitario:'', alquiler_mensual:'', precio_transporte:'',
  });

  useEffect(() => { fetchTubos(); }, []);
  const fetchTubos = async () => {
    try { setTubos(await db.getTubos()); } catch {}
  };

  const sector = user?.sector;

  // Operaciones disponibles según el sector
  const operacionesDisponibles = () => {
    if (sector === 'almacen' || sector === 'admin') return ['Carga', 'Alta', 'Baja'];
    if (sector === 'mantenimiento') return ['Consumo', 'Devolución'];
    if (sector === 'infraestructura') return ['Consumo', 'Devolución'];
    return [];
  };

  // Nombre del sector con mayúscula para comparar con ubicacion/pedido_por
  const miSector = sector === 'mantenimiento' ? 'Mantenimiento'
    : sector === 'infraestructura' ? 'Infraestructura'
    : null;

  // Tubos filtrados según la operación y el sector
  const tubosFiltrados = () => {
    if (operacion === 'Carga') return tubos.filter(t => t.ubicacion === 'Almacén' && t.estado === 'Vacío');
    if (operacion === 'Baja')  return tubos.filter(t => t.ubicacion === 'Almacén');
    if (operacion === 'Consumo') {
      const base = tubos.filter(t => t.ubicacion === 'Almacén' && t.estado === 'Lleno');
      // Mto/Infra: solo ven los que almacén cargó para su sector
      if (miSector) return base.filter(t => t.pedido_por === miSector);
      // Admin/Almacén: ven todos los llenos en Almacén
      return base;
    }
    if (operacion === 'Devolución') {
      // Solo los tubos físicamente en su sector
      if (sector === 'admin') return tubos.filter(t => t.ubicacion !== 'Almacén');
      return tubos.filter(t => t.ubicacion === miSector);
    }
    return [];
  };

  // Destinos disponibles para Consumo según el sector
  const destinosDisponibles = () => {
    if (sector === 'mantenimiento') return ['Mantenimiento'];
    if (sector === 'infraestructura') return ['Infraestructura'];
    if (sector === 'admin' || sector === 'almacen') return ['Mantenimiento', 'Infraestructura', 'Sub Base'];
    return [];
  };

  const tuboSeleccionado = tubos.find(t => t.id === tuboId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg({ type:'', text:'' });
    try {
      if (operacion === 'Carga') {
        await db.registrarCarga(tuboId, user.username);
        setMsg({ type:'success', text:`✓ Tubo ${tuboSeleccionado?.codigo} cargado correctamente` });
      } else if (operacion === 'Consumo') {
        if (!destino) throw new Error('Seleccioná el destino');
        await db.registrarConsumo(tuboId, destino, user.username);
        setMsg({ type:'success', text:`✓ Tubo ${tuboSeleccionado?.codigo} consumido por ${destino}` });
      } else if (operacion === 'Devolución') {
        await db.registrarDevolucion(tuboId, miSector || tuboSeleccionado?.ubicacion, user.username);
        setMsg({ type:'success', text:`✓ Tubo ${tuboSeleccionado?.codigo} devuelto a Almacén (vacío)` });
      } else if (operacion === 'Alta') {
        if (!nuevoTubo.codigo) throw new Error('El código es obligatorio');
        if (!nuevoTubo.capacidad) throw new Error('La capacidad es obligatoria');
        if (!nuevoTubo.pedido_por) throw new Error('Indicá quién solicitó el tubo');
        await db.registrarAlta({
          ...nuevoTubo,
          capacidad: parseFloat(nuevoTubo.capacidad),
          precio_unitario: parseFloat(nuevoTubo.precio_unitario) || 0,
          alquiler_mensual: parseFloat(nuevoTubo.alquiler_mensual) || 0,
          precio_transporte: parseFloat(nuevoTubo.precio_transporte) || 0,
          estado: 'Lleno', ubicacion: 'Almacén',
          fecha_entrada: new Date().toISOString().split('T')[0],
        }, user.username);
        setMsg({ type:'success', text:`✓ Tubo ${nuevoTubo.codigo.toUpperCase()} dado de alta correctamente` });
        setNuevoTubo({ codigo:'', tipo:'O2', capacidad:'', unidad:'kg', pedido_por:'', precio_unitario:'', alquiler_mensual:'', precio_transporte:'' });
      } else if (operacion === 'Baja') {
        await db.registrarBaja(tuboId, observaciones, user.username);
        setMsg({ type:'success', text:`✓ Tubo ${tuboSeleccionado?.codigo} dado de baja` });
      }
      setTuboId(''); setDestino(''); setObs('');
      fetchTubos();
    } catch (err) { setMsg({ type:'error', text:`✗ ${err.message}` }); }
    setLoading(false);
  };

  const ops = operacionesDisponibles();
  const f = k => e => setNuevoTubo(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div style={s.pageHeader}><h2 style={s.pageTitle}>Registrar Movimiento</h2></div>
      <div style={s.card}>
        {msg.text && <div style={msg.type === 'error' ? s.errorMsg : s.successMsg}>{msg.text}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          {/* Selección de operación */}
          <div style={s.field}>
            <label style={s.label}>Tipo de operación *</label>
            <div style={s.opBtns}>
              {ops.map(op => (
                <button key={op} type="button"
                  style={{ ...s.opBtn, ...(operacion === op ? s.opBtnActive : {}) }}
                  onClick={() => { setOperacion(op); setTuboId(''); setDestino(''); }}>
                  {op === 'Carga'     && '🔄 Carga (vacío → lleno)'}
                  {op === 'Consumo'   && '📤 Consumo'}
                  {op === 'Devolución'&& '📥 Devolución a Almacén'}
                  {op === 'Alta'      && '➕ Alta de tubo nuevo'}
                  {op === 'Baja'      && '➖ Baja de tubo'}
                </button>
              ))}
            </div>
          </div>

          {/* FORMULARIO según operación */}

          {/* CARGA / BAJA / ENTREGA / DEVOLUCIÓN — selector de tubo */}
          {['Carga','Baja','Consumo','Devolución'].includes(operacion) && (
            <>
              <div style={s.field}>
                <label style={s.label}>
                  {operacion === 'Carga'      && 'Tubo vacío a cargar *'}
                  {operacion === 'Baja'       && 'Tubo a dar de baja *'}
                  {operacion === 'Consumo'    && 'Tubo lleno a consumir *'}
                  {operacion === 'Devolución' && 'Tubo a devolver *'}
                </label>
                <select style={s.input} value={tuboId} onChange={e => setTuboId(e.target.value)} required>
                  <option value="">Seleccionar tubo...</option>
                  {tubosFiltrados().map(t => (
                    <option key={t.id} value={t.id}>
                      {t.codigo} — {t.tipo}
                    </option>
                  ))}
                </select>
                {tubosFiltrados().length === 0 && (
                  <span style={s.hint}>
                    {operacion === 'Carga'      && 'No hay tubos vacíos en Almacén'}
                    {operacion === 'Consumo'    && 'No hay tubos llenos en Almacén'}
                    {operacion === 'Devolución' && 'No tenés tubos para devolver'}
                    {operacion === 'Baja'       && 'No hay tubos en Almacén'}
                  </span>
                )}
              </div>

              {tuboSeleccionado && (
                <div style={s.tuboInfo}>
                  <span>Código: <strong>{tuboSeleccionado.codigo}</strong></span>
                  <span>Tipo: <strong>{tuboSeleccionado.tipo}</strong></span>
                  <span>Estado: <strong>{tuboSeleccionado.estado}</strong></span>
                  <span>Ubicación: <strong>{tuboSeleccionado.ubicacion}</strong></span>
                  {tuboSeleccionado.pedido_por && <span>Pedido por: <strong>{tuboSeleccionado.pedido_por}</strong></span>}
                </div>
              )}

              {operacion === 'Devolución' && tuboId && (
                <div style={s.alertInfo}>
                  El tubo volverá a Almacén automáticamente como <strong>Vacío</strong>
                </div>
              )}

              {operacion === 'Consumo' && (
                <div style={s.field}>
                  <label style={s.label}>Destino *</label>
                  <select style={s.input} value={destino} onChange={e => setDestino(e.target.value)} required>
                    <option value="">Seleccionar destino...</option>
                    {destinosDisponibles().map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              )}

              {operacion === 'Baja' && (
                <div style={s.field}>
                  <label style={s.label}>Motivo de baja</label>
                  <textarea style={{ ...s.input, minHeight:72, resize:'vertical' }}
                    value={observaciones} onChange={e => setObs(e.target.value)}
                    placeholder="Motivo o descripción (opcional)..." />
                </div>
              )}
            </>
          )}

          {/* ALTA — formulario completo de tubo nuevo */}
          {operacion === 'Alta' && (
            <div style={s.altaGrid}>
              <div style={s.field}>
                <label style={s.label}>Código *</label>
                <input style={s.input} value={nuevoTubo.codigo} onChange={f('codigo')} placeholder="T009" required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Tipo *</label>
                <select style={s.input} value={nuevoTubo.tipo} onChange={f('tipo')}>
                  {TIPOS_TUBO.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Capacidad *</label>
                <input style={s.input} type="number" value={nuevoTubo.capacidad} onChange={f('capacidad')} placeholder="50" required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Unidad</label>
                <select style={s.input} value={nuevoTubo.unidad} onChange={f('unidad')}>
                  <option value="kg">kg</option>
                  <option value="m3">m3</option>
                </select>
              </div>
              <div style={{ ...s.field, gridColumn:'1/-1' }}>
                <label style={s.label}>Pedido por (sector que lo solicitó) *</label>
                <select style={s.input} value={nuevoTubo.pedido_por} onChange={f('pedido_por')} required>
                  <option value="">Seleccionar sector...</option>
                  {SECTORES.map(sec => <option key={sec}>{sec}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Precio unitario</label>
                <input style={s.input} type="number" step="0.01" value={nuevoTubo.precio_unitario} onChange={f('precio_unitario')} placeholder="0.00" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Alquiler mensual</label>
                <input style={s.input} type="number" step="0.01" value={nuevoTubo.alquiler_mensual} onChange={f('alquiler_mensual')} placeholder="0.00" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Precio transporte</label>
                <input style={s.input} type="number" step="0.01" value={nuevoTubo.precio_transporte} onChange={f('precio_transporte')} placeholder="0.00" />
              </div>
              <div style={{ ...s.alertInfo, gridColumn:'1/-1' }}>
                El tubo se dará de alta como <strong>Lleno</strong> en <strong>Almacén</strong>
              </div>
            </div>
          )}

          {operacion && (
            <div style={s.footer}>
              <span style={s.registrando}>Registrando como: <strong>{user?.username}</strong></span>
              <button style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

const s = {
  pageHeader:  { marginBottom:24 },
  pageTitle:   { margin:0, fontSize:22, fontWeight:700, color:'#0f172a' },
  card:        { background:'#fff', borderRadius:12, padding:28, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', maxWidth:760 },
  form:        { display:'flex', flexDirection:'column', gap:20 },
  field:       { display:'flex', flexDirection:'column', gap:6 },
  label:       { fontSize:13, fontWeight:600, color:'#374151' },
  input:       { padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, color:'#0f172a', outline:'none', background:'#fff', fontFamily:'inherit' },
  hint:        { fontSize:12, color:'#f59e0b', marginTop:4 },
  opBtns:      { display:'flex', flexWrap:'wrap', gap:8 },
  opBtn:       { padding:'9px 16px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer', color:'#475569', fontWeight:500 },
  opBtnActive: { background:'#eff6ff', borderColor:'#2563eb', color:'#2563eb', fontWeight:700 },
  tuboInfo:    { background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 14px', display:'flex', gap:20, flexWrap:'wrap', fontSize:13, color:'#1e40af' },
  alertInfo:   { background:'#fef3c7', border:'1px solid #fde68a', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#92400e' },
  altaGrid:    { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 },
  footer:      { display:'flex', justifyContent:'space-between', alignItems:'center' },
  registrando: { fontSize:13, color:'#64748b' },
  submitBtn:   { padding:'10px 28px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  successMsg:  { background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#065f46' },
  errorMsg:    { background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#991b1b' },
};
