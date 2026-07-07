import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useAuth } from '../components/AuthContext';
import { TIPOS_TUBO, SECTORES } from '../lib/constants';

const SECTORES_DESTINO = ['Mantenimiento', 'Infraestructura', 'Sub Base'];

export default function Movimientos() {
  const { user } = useAuth();
  const [tubos, setTubos]         = useState([]);
  const [todosTubos, setTodosTubos] = useState([]);
  const [operacion, setOperacion] = useState('');
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState({ type:'', text:'' });

  // Estados para Intercambio
  const [tuboSaleId, setTuboSaleId]   = useState('');
  const [tuboEntraId, setTuboEntraId] = useState('');
  const [esNuevo, setEsNuevo]         = useState(false);
  const [nuevoTubo, setNuevoTubo]     = useState({ codigo:'', tipo:'O2', capacidad:'', unidad:'kg', pedido_por:'' });

  // Estados para Entrega a sector
  const [tuboLlenoId, setTuboLlenoId]   = useState('');
  const [destino, setDestino]           = useState('');
  const [sinDevolucion, setSinDevolucion] = useState(false);
  const [tuboVacioId, setTuboVacioId]   = useState('');

  // Estados para Alta/Baja
  const [altaTubo, setAltaTubo]     = useState({ codigo:'', tipo:'O2', capacidad:'', unidad:'kg', pedido_por:'', precio_unitario:'', alquiler_mensual:'', precio_transporte:'' });
  const [bajaId, setBajaId]         = useState('');
  const [bajaObs, setBajaObs]       = useState('');
  const [bajaConfirmCodigo, setBajaConfirmCodigo] = useState('');

  useEffect(() => { fetchTubos(); }, []);

  const fetchTubos = async () => {
    try {
      const [activos, todos] = await Promise.all([db.getTubos(), db.getTodosLosTubos()]);
      setTubos(activos || []);
      setTodosTubos(todos || []);
    } catch {}
  };

  const reset = () => {
    setTuboSaleId(''); setTuboEntraId(''); setEsNuevo(false);
    setNuevoTubo({ codigo:'', tipo:'O2', capacidad:'', unidad:'kg', pedido_por:'' });
    setTuboLlenoId(''); setDestino(''); setSinDevolucion(false); setTuboVacioId('');
    setBajaId(''); setBajaObs(''); setBajaConfirmCodigo('');
    setAltaTubo({ codigo:'', tipo:'O2', capacidad:'', unidad:'kg', pedido_por:'', precio_unitario:'', alquiler_mensual:'', precio_transporte:'' });
  };

  const handleSubmit = async () => {
    setLoading(true); setMsg({ type:'', text:'' });
    try {
      if (operacion === 'Intercambio') {
        if (!tuboSaleId) throw new Error('Seleccioná el tubo vacío que sale');
        if (!esNuevo && !tuboEntraId) throw new Error('Seleccioná el tubo que entra o indicá que es nuevo');
        if (esNuevo && !nuevoTubo.codigo) throw new Error('Ingresá el código del tubo nuevo');
        await db.registrarIntercambio(
          tuboSaleId,
          esNuevo ? null : tuboEntraId,
          esNuevo ? { ...nuevoTubo, capacidad: parseFloat(nuevoTubo.capacidad) } : null,
          user.username
        );
        setMsg({ type:'success', text:'✓ Intercambio con proveedor registrado correctamente' });
      } else if (operacion === 'Entrega') {
        if (!tuboLlenoId) throw new Error('Seleccioná el tubo lleno a entregar');
        if (!destino) throw new Error('Seleccioná el sector destino');
        if (!sinDevolucion && !tuboVacioId) throw new Error('Seleccioná el tubo vacío que devuelve, o marcá "no devuelve vacío"');

        const tuboAEntregar = tubos.find(t => t.id === tuboLlenoId);
        if (tuboAEntregar?.pedido_por && tuboAEntregar.pedido_por !== destino) {
          const confirmar = window.confirm(
            `⚠ ATENCIÓN: el tubo ${tuboAEntregar.codigo} fue pedido por ${tuboAEntregar.pedido_por}, no por ${destino}.\n\n¿Confirmás que querés entregarlo de todas formas a ${destino}?`
          );
          if (!confirmar) { setLoading(false); return; }
        }

        await db.registrarEntregaConDevolucion({
          tuboLlenoId, destino, tuboVacioId: sinDevolucion ? null : tuboVacioId,
          sinDevolucion, usuario: user.username
        });
        setMsg({ type:'success', text:`✓ Tubo entregado a ${destino}${sinDevolucion ? '' : ' — vacío recibido'}` });
      } else if (operacion === 'Alta') {
        if (!altaTubo.codigo) throw new Error('El código es obligatorio');
        if (!altaTubo.capacidad) throw new Error('La capacidad es obligatoria');
        if (!altaTubo.pedido_por) throw new Error('Indicá quién solicitó el tubo');
        await db.registrarAlta({
          ...altaTubo,
          capacidad: parseFloat(altaTubo.capacidad),
          precio_unitario: parseFloat(altaTubo.precio_unitario) || 0,
          alquiler_mensual: parseFloat(altaTubo.alquiler_mensual) || 0,
          precio_transporte: parseFloat(altaTubo.precio_transporte) || 0,
          estado: 'Lleno', ubicacion: 'Almacén',
          fecha_entrada: new Date().toISOString().split('T')[0],
        }, user.username);
        setMsg({ type:'success', text:`✓ Tubo ${altaTubo.codigo.toUpperCase()} dado de alta` });
      } else if (operacion === 'Baja') {
        if (!bajaId) throw new Error('Seleccioná el tubo a dar de baja');
        const tuboABaja = tubosBaja.find(t => t.id === bajaId);
        if (bajaConfirmCodigo.trim().toUpperCase() !== tuboABaja?.codigo.toUpperCase()) {
          throw new Error(`Para confirmar, escribí el código exacto: ${tuboABaja?.codigo}`);
        }
        await db.registrarBaja(bajaId, bajaObs, user.username);
        setMsg({ type:'success', text:'✓ Tubo dado de baja permanentemente' });
      }
      reset();
      fetchTubos();
    } catch (err) { setMsg({ type:'error', text:`✗ ${err.message}` }); }
    setLoading(false);
  };

  // Listas filtradas
  const vaciosEnAlmacen  = tubos.filter(t => t.ubicacion === 'Almacén' && t.estado === 'Vacío');
  const llenosEnAlmacen  = tubos.filter(t => t.ubicacion === 'Almacén' && t.estado === 'Lleno');
  const enUsoEnDestino   = destino ? tubos.filter(t => t.ubicacion === destino && t.estado === 'En uso') : [];
  const tubosBaja        = tubos.filter(t => t.ubicacion === 'Almacén');

  // Tubos que alguna vez estuvieron (inactivos, en poder del proveedor)
  const tubosDelProveedor = todosTubos.filter(t =>
    !t.activo && t.estado === 'En poder del proveedor'
  );

  const tipoDelSale = tuboSaleId ? tubos.find(t => t.id === tuboSaleId)?.tipo : null;
  const tubosEntraFiltrados = tuboEntraId === '' && tipoDelSale
    ? tubosDelProveedor.filter(t => t.tipo === tipoDelSale)
    : tubosDelProveedor;

  const tuboLlenoEntrega = tuboLlenoId ? tubos.find(t => t.id === tuboLlenoId) : null;

  const f = k => e => setNuevoTubo(p => ({ ...p, [k]: e.target.value }));
  const fa = k => e => setAltaTubo(p => ({ ...p, [k]: e.target.value }));

  const ops = [
    { id:'Intercambio', label:'🔄 Intercambio con proveedor', sub:'Sale un vacío, entra un lleno' },
    { id:'Entrega',     label:'📤 Entrega a sector',          sub:'Almacén entrega un lleno a un sector' },
    { id:'Alta',        label:'➕ Alta de tubo',              sub:'Incorporar un tubo nuevo al stock' },
    { id:'Baja',        label:'➖ Baja de tubo',              sub:'Retirar permanentemente del stock' },
  ];

  return (
    <div>
      <div style={s.pageHeader}><h2 style={s.pageTitle}>Registrar Movimiento</h2></div>

      {/* Selector de operación */}
      <div style={s.opGrid}>
        {ops.map(op => (
          <button key={op.id}
            style={{ ...s.opCard, ...(operacion === op.id ? s.opCardActive : {}) }}
            onClick={() => { setOperacion(op.id); reset(); setMsg({ type:'', text:'' }); }}>
            <div style={s.opLabel}>{op.label}</div>
            <div style={s.opSub}>{op.sub}</div>
          </button>
        ))}
      </div>

      {msg.text && (
        <div style={msg.type === 'error' ? s.errorMsg : s.successMsg}>{msg.text}</div>
      )}

      {/* ── INTERCAMBIO ── */}
      {operacion === 'Intercambio' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Intercambio con proveedor</h3>
          <p style={s.cardSub}>El proveedor se lleva un tubo vacío y deja uno lleno a cambio</p>

          <div style={s.formGrid}>
            {/* Tubo que SALE */}
            <div style={s.fieldGroup}>
              <div style={s.fieldGroupTitle}>📤 Tubo que sale (vacío → proveedor)</div>
              <div style={s.field}>
                <label style={s.label}>Seleccionar tubo vacío *</label>
                <select style={s.input} value={tuboSaleId} onChange={e => { setTuboSaleId(e.target.value); setTuboEntraId(''); }}>
                  <option value="">Seleccionar...</option>
                  {vaciosEnAlmacen.map(t => (
                    <option key={t.id} value={t.id}>{t.codigo} — {t.tipo} — {t.capacidad}{t.unidad}</option>
                  ))}
                </select>
                {vaciosEnAlmacen.length === 0 && <span style={s.hint}>No hay tubos vacíos en Almacén</span>}
              </div>
            </div>

            {/* Tubo que ENTRA */}
            <div style={s.fieldGroup}>
              <div style={s.fieldGroupTitle}>📥 Tubo que entra (lleno ← proveedor)</div>

              <div style={s.toggleRow}>
                <button style={{ ...s.toggleBtn, ...(esNuevo ? {} : s.toggleBtnActive) }}
                  onClick={() => setEsNuevo(false)}>Tubo conocido</button>
                <button style={{ ...s.toggleBtn, ...(esNuevo ? s.toggleBtnActive : {}) }}
                  onClick={() => setEsNuevo(true)}>Tubo nuevo</button>
              </div>

              {!esNuevo ? (
                <div style={s.field}>
                  <label style={s.label}>Seleccionar tubo del proveedor *</label>
                  <select style={s.input} value={tuboEntraId} onChange={e => setTuboEntraId(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {(tipoDelSale ? tubosDelProveedor.filter(t => t.tipo === tipoDelSale) : tubosDelProveedor).map(t => (
                      <option key={t.id} value={t.id}>{t.codigo} — {t.tipo} — {t.capacidad}{t.unidad}</option>
                    ))}
                  </select>
                  {tubosDelProveedor.length === 0 && (
                    <span style={s.hint}>No hay tubos registrados en poder del proveedor. Usá "Tubo nuevo".</span>
                  )}
                </div>
              ) : (
                <div style={s.nuevoGrid}>
                  <div style={s.field}>
                    <label style={s.label}>Código *</label>
                    <input style={s.input} value={nuevoTubo.codigo} onChange={f('codigo')} placeholder="T009" />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Tipo *</label>
                    <select style={s.input} value={nuevoTubo.tipo} onChange={f('tipo')}>
                      {TIPOS_TUBO.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Capacidad *</label>
                    <input style={s.input} type="number" value={nuevoTubo.capacidad} onChange={f('capacidad')} placeholder="50" />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Unidad</label>
                    <select style={s.input} value={nuevoTubo.unidad} onChange={f('unidad')}>
                      <option value="kg">kg</option>
                      <option value="m3">m3</option>
                    </select>
                  </div>
                  <div style={{ ...s.field, gridColumn:'1/-1' }}>
                    <label style={s.label}>Pedido por</label>
                    <select style={s.input} value={nuevoTubo.pedido_por} onChange={f('pedido_por')}>
                      <option value="">Seleccionar sector...</option>
                      {SECTORES.map(sec => <option key={sec}>{sec}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={s.footer}>
            <span style={s.registrando}>Registrando como: <strong>{user?.username}</strong></span>
            <button style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? 'Guardando...' : 'Confirmar intercambio'}
            </button>
          </div>
        </div>
      )}

      {/* ── ENTREGA A SECTOR ── */}
      {operacion === 'Entrega' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Entrega a sector</h3>

          <div style={s.formGrid}>
            <div style={s.field}>
              <label style={s.label}>Tubo lleno a entregar *</label>
              <select style={s.input} value={tuboLlenoId} onChange={e => setTuboLlenoId(e.target.value)}>
                <option value="">Seleccionar...</option>
                {llenosEnAlmacen.map(t => (
                  <option key={t.id} value={t.id}>{t.codigo} — {t.tipo} — {t.capacidad}{t.unidad}{t.pedido_por ? ` (para ${t.pedido_por})` : ''}</option>
                ))}
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label}>Sector destino *</label>
              <select style={s.input} value={destino} onChange={e => { setDestino(e.target.value); setTuboVacioId(''); }}>
                <option value="">Seleccionar...</option>
                {SECTORES_DESTINO.map(sec => <option key={sec}>{sec}</option>)}
              </select>
              {tuboLlenoEntrega && destino && tuboLlenoEntrega.pedido_por && tuboLlenoEntrega.pedido_por !== destino && (
                <span style={s.warningText}>
                  ⚠ Este tubo fue pedido por {tuboLlenoEntrega.pedido_por}, no por {destino}
                </span>
              )}
            </div>
          </div>

          {/* Devolución de vacío */}
          <div style={s.devolucionSection}>
            <div style={s.devolucionHeader}>
              <div>
                <div style={s.devolucionTitle}>Devolución de tubo vacío</div>
                <div style={s.devolucionSub}>Por defecto el sector entrega un vacío a cambio</div>
              </div>
              <label style={s.checkLabel}>
                <input type="checkbox" checked={sinDevolucion} onChange={e => { setSinDevolucion(e.target.checked); setTuboVacioId(''); }} />
                &nbsp; No devuelve vacío en esta entrega
              </label>
            </div>

            {!sinDevolucion && (
              <div style={s.field}>
                <label style={s.label}>Tubo vacío que devuelve {destino || 'el sector'} *</label>
                <select style={s.input} value={tuboVacioId} onChange={e => setTuboVacioId(e.target.value)}
                  disabled={!destino}>
                  <option value="">{destino ? 'Seleccionar...' : 'Primero seleccioná el sector'}</option>
                  {enUsoEnDestino.map(t => (
                    <option key={t.id} value={t.id}>{t.codigo} — {t.tipo}</option>
                  ))}
                </select>
                {destino && enUsoEnDestino.length === 0 && (
                  <span style={s.hint}>{destino} no tiene tubos en uso registrados. Marcá "No devuelve vacío".</span>
                )}
              </div>
            )}
          </div>

          {/* Zona provisional */}
          <div style={s.provisional}>
            <span style={s.provisionalBadge}>⚠ Función provisional — en revisión</span>
            <span style={s.provisionalText}>En una próxima versión esta operación quedará exclusivamente en Almacén. Mantenimiento e Infraestructura no podrán registrar entregas.</span>
          </div>

          <div style={s.footer}>
            <span style={s.registrando}>Registrando como: <strong>{user?.username}</strong></span>
            <button style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? 'Guardando...' : 'Confirmar entrega'}
            </button>
          </div>
        </div>
      )}

      {/* ── ALTA ── */}
      {operacion === 'Alta' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Alta de tubo nuevo</h3>
          <div style={s.nuevoGrid}>
            <div style={s.field}>
              <label style={s.label}>Código *</label>
              <input style={s.input} value={altaTubo.codigo} onChange={fa('codigo')} placeholder="T021" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Tipo *</label>
              <select style={s.input} value={altaTubo.tipo} onChange={fa('tipo')}>
                {TIPOS_TUBO.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Capacidad *</label>
              <input style={s.input} type="number" value={altaTubo.capacidad} onChange={fa('capacidad')} placeholder="50" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Unidad</label>
              <select style={s.input} value={altaTubo.unidad} onChange={fa('unidad')}>
                <option value="kg">kg</option>
                <option value="m3">m3</option>
              </select>
            </div>
            <div style={{ ...s.field, gridColumn:'1/-1' }}>
              <label style={s.label}>Pedido por *</label>
              <select style={s.input} value={altaTubo.pedido_por} onChange={fa('pedido_por')}>
                <option value="">Seleccionar sector...</option>
                {SECTORES.map(sec => <option key={sec}>{sec}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Precio gas (por unidad)</label>
              <input style={s.input} type="number" step="0.01" value={altaTubo.precio_unitario} onChange={fa('precio_unitario')} placeholder="0.00" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Alquiler mensual</label>
              <input style={s.input} type="number" step="0.01" value={altaTubo.alquiler_mensual} onChange={fa('alquiler_mensual')} placeholder="0.00" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Transporte</label>
              <input style={s.input} type="number" step="0.01" value={altaTubo.precio_transporte} onChange={fa('precio_transporte')} placeholder="0.00" />
            </div>
          </div>
          <div style={{ ...s.alertInfo, marginTop:16 }}>
            El tubo ingresará como <strong>Lleno</strong> en <strong>Almacén</strong>
          </div>
          <div style={s.footer}>
            <span style={s.registrando}>Registrando como: <strong>{user?.username}</strong></span>
            <button style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? 'Guardando...' : 'Dar de alta'}
            </button>
          </div>
        </div>
      )}

      {/* ── BAJA ── */}
      {operacion === 'Baja' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Baja de tubo</h3>
          <p style={s.cardSub}>El tubo se retira permanentemente del stock. Esta acción no se puede deshacer.</p>
          <div style={s.field}>
            <label style={s.label}>Tubo a dar de baja *</label>
            <select style={s.input} value={bajaId} onChange={e => setBajaId(e.target.value)}>
              <option value="">Seleccionar...</option>
              {tubosBaja.map(t => (
                <option key={t.id} value={t.id}>{t.codigo} — {t.tipo} — {t.estado}</option>
              ))}
            </select>
          </div>
          <div style={{ ...s.field, marginTop:12 }}>
            <label style={s.label}>Motivo (opcional)</label>
            <textarea style={{ ...s.input, minHeight:72, resize:'vertical' }}
              value={bajaObs} onChange={e => setBajaObs(e.target.value)} placeholder="Motivo de la baja..." />
          </div>

          {bajaId && (
            <div style={s.confirmBox}>
              <div style={s.confirmTitle}>⚠ Confirmación requerida</div>
              <div style={s.confirmText}>
                Escribí el código <strong>{tubosBaja.find(t => t.id === bajaId)?.codigo}</strong> para confirmar la baja
              </div>
              <input style={s.input} value={bajaConfirmCodigo}
                onChange={e => setBajaConfirmCodigo(e.target.value)}
                placeholder={`Escribí ${tubosBaja.find(t => t.id === bajaId)?.codigo} para confirmar`} />
            </div>
          )}

          <div style={s.footer}>
            <span style={s.registrando}>Registrando como: <strong>{user?.username}</strong></span>
            <button style={{ ...s.submitBtn, background:'#dc2626', opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? 'Guardando...' : 'Confirmar baja'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  pageHeader:        { marginBottom:24 },
  pageTitle:         { margin:0, fontSize:22, fontWeight:700, color:'#0f172a' },
  opGrid:            { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 },
  opCard:            { background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'16px 18px', cursor:'pointer', textAlign:'left', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' },
  opCardActive:      { background:'#eff6ff', borderColor:'#2563eb' },
  opLabel:           { fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:4 },
  opSub:             { fontSize:12, color:'#64748b' },
  card:              { background:'#fff', borderRadius:12, padding:28, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', maxWidth:860 },
  cardTitle:         { margin:'0 0 4px', fontSize:17, fontWeight:700, color:'#0f172a' },
  cardSub:           { margin:'0 0 24px', fontSize:13, color:'#64748b' },
  formGrid:          { display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 },
  fieldGroup:        { background:'#f8fafc', borderRadius:10, padding:'16px 18px' },
  fieldGroupTitle:   { fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:12 },
  field:             { display:'flex', flexDirection:'column', gap:5, marginBottom:12 },
  label:             { fontSize:13, fontWeight:600, color:'#374151' },
  input:             { padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, color:'#0f172a', outline:'none', background:'#fff', fontFamily:'inherit' },
  hint:              { fontSize:12, color:'#f59e0b', marginTop:2 },
  warningText:       { fontSize:12, color:'#dc2626', fontWeight:600, marginTop:4, display:'block' },
  toggleRow:         { display:'flex', gap:6, marginBottom:12 },
  toggleBtn:         { flex:1, padding:'7px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer', color:'#475569' },
  toggleBtnActive:   { background:'#eff6ff', borderColor:'#2563eb', color:'#2563eb', fontWeight:700 },
  nuevoGrid:         { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  devolucionSection: { background:'#f8fafc', borderRadius:10, padding:'16px 18px', marginBottom:20 },
  devolucionHeader:  { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 },
  devolucionTitle:   { fontSize:13, fontWeight:700, color:'#0f172a' },
  devolucionSub:     { fontSize:12, color:'#64748b', marginTop:2 },
  checkLabel:        { display:'flex', alignItems:'center', fontSize:13, color:'#475569', cursor:'pointer', whiteSpace:'nowrap' },
  provisional:       { background:'#fef9c3', border:'1px solid #fde68a', borderRadius:8, padding:'10px 14px', marginBottom:20, display:'flex', gap:10, alignItems:'flex-start' },
  provisionalBadge:  { fontSize:12, fontWeight:700, color:'#92400e', whiteSpace:'nowrap' },
  provisionalText:   { fontSize:12, color:'#78350f' },
  alertInfo:         { background:'#fef3c7', border:'1px solid #fde68a', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#92400e' },
  footer:            { display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:20, paddingTop:16, borderTop:'1px solid #f1f5f9' },
  registrando:       { fontSize:13, color:'#64748b' },
  submitBtn:         { padding:'10px 28px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  successMsg:        { background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#065f46', marginBottom:16 },
  errorMsg:          { background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#991b1b', marginBottom:16 },
  confirmBox:        { background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:10, padding:'14px 16px', marginTop:16 },
  confirmTitle:      { fontSize:13, fontWeight:700, color:'#991b1b', marginBottom:4 },
  confirmText:       { fontSize:12, color:'#7f1d1d', marginBottom:10 },
};
