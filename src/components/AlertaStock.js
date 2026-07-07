import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import { TIPOS_TUBO } from '../lib/constants';

const DIAS_LIMITE_EN_USO = 30; // días máximos razonables sin devolver un tubo

export default function AlertaStock() {
  const [alertasStock, setAlertasStock] = useState([]);
  const [alertasTiempo, setAlertasTiempo] = useState([]);
  const [visible, setVisible]     = useState(false);
  const [dismissed, setDismissed] = useState([]);

  const checkStock = useCallback(async () => {
    try {
      const [tubos, movimientos] = await Promise.all([db.getTubos(), db.getMovimientos()]);

      // Stock bajo por tipo
      const nuevasStock = TIPOS_TUBO.map(tipo => {
        const llenosEnAlmacen = tubos.filter(
          t => t.tipo === tipo && t.ubicacion === 'Almacén' && t.estado === 'Lleno'
        ).length;
        return { tipo, cantidad: llenosEnAlmacen };
      }).filter(a => a.cantidad <= 1);

      // Tubos en uso hace demasiado tiempo sin devolver
      const hoy = new Date();
      const enUsoTubos = tubos.filter(t => t.estado === 'En uso');
      const nuevasTiempo = enUsoTubos.map(t => {
        // Buscar el último movimiento de salida de este tubo (Consumo)
        const ultimoConsumo = movimientos
          .filter(m => m.tubo_id === t.id && m.tipo_operacion === 'Consumo')
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
        if (!ultimoConsumo) return null;
        const dias = Math.floor((hoy - new Date(ultimoConsumo.fecha)) / (1000 * 60 * 60 * 24));
        return dias >= DIAS_LIMITE_EN_USO ? { codigo: t.codigo, tipo: t.tipo, ubicacion: t.ubicacion, dias } : null;
      }).filter(Boolean);

      setAlertasStock(nuevasStock);
      setAlertasTiempo(nuevasTiempo);

      // Mostrar popup si hay alertas nuevas no descartadas
      const todasKeys = [
        ...nuevasStock.map(a => `stock-${a.tipo}-${a.cantidad}`),
        ...nuevasTiempo.map(a => `tiempo-${a.codigo}-${a.dias}`),
      ];
      const hayNuevas = todasKeys.some(k => !dismissed.includes(k));
      if (hayNuevas && (nuevasStock.length > 0 || nuevasTiempo.length > 0)) setVisible(true);

    } catch {}
  }, [dismissed]);

  // Chequear al montar y cada 5 minutos
  useEffect(() => {
    checkStock();
    const interval = setInterval(checkStock, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkStock]);

  const handleDismiss = () => {
    setDismissed(prev => [
      ...prev,
      ...alertasStock.map(a => `stock-${a.tipo}-${a.cantidad}`),
      ...alertasTiempo.map(a => `tiempo-${a.codigo}-${a.dias}`),
    ]);
    setVisible(false);
  };

  if (!visible || (alertasStock.length === 0 && alertasTiempo.length === 0)) return null;

  return (
    <>
      {/* Overlay semitransparente */}
      <div style={s.overlay} onClick={handleDismiss} />

      {/* Modal de alerta */}
      <div style={s.modal}>
        <div style={s.iconWrap}>
          <span style={s.icon}>⚠️</span>
        </div>

        <h3 style={s.title}>Atención requerida</h3>

        {alertasStock.length > 0 && (
          <>
            <p style={s.subtitle}>
              Los siguientes gases tienen <strong>1 o menos tubos llenos</strong> en Almacén:
            </p>
            <div style={s.alertList}>
              {alertasStock.map(a => (
                <div key={a.tipo} style={s.alertItem}>
                  <div style={s.alertTipo}>{a.tipo}</div>
                  <div style={a.cantidad === 0 ? s.alertCantidadCero : s.alertCantidad}>
                    {a.cantidad === 0 ? '⛔ Sin tubos llenos' : `⚠️ Solo ${a.cantidad} tubo lleno`}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {alertasTiempo.length > 0 && (
          <>
            <p style={s.subtitle}>
              Los siguientes tubos están <strong>en uso hace más de {DIAS_LIMITE_EN_USO} días</strong> sin devolverse:
            </p>
            <div style={s.alertList}>
              {alertasTiempo.map(a => (
                <div key={a.codigo} style={s.alertItemTiempo}>
                  <div style={s.alertTipo}>{a.codigo} — {a.tipo}</div>
                  <div style={s.alertCantidadCero}>📍 {a.ubicacion} · {a.dias} días</div>
                </div>
              ))}
            </div>
          </>
        )}

        <p style={s.nota}>
          {alertasStock.length > 0 && 'Considerá solicitar reposición al proveedor. '}
          {alertasTiempo.length > 0 && 'Verificá si esos tubos siguen en uso o fueron olvidados.'}
        </p>

        <button style={s.btn} onClick={handleDismiss}>
          Entendido
        </button>
      </div>
    </>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 999,
  },
  modal: {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#fff',
    borderRadius: 16,
    padding: '32px 36px',
    width: '100%', maxWidth: 420,
    zIndex: 1000,
    boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
    textAlign: 'center',
  },
  iconWrap: {
    width: 64, height: 64,
    background: '#fef3c7',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
  icon:     { fontSize: 32 },
  title:    { margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#0f172a' },
  subtitle: { margin: '0 0 20px', fontSize: 14, color: '#475569', lineHeight: 1.5 },
  alertList:{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
  alertItem:{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#fffbeb', border: '1px solid #fde68a',
    borderRadius: 10, padding: '12px 16px',
  },
  alertItemTiempo:{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: 10, padding: '12px 16px',
  },
  alertTipo:{ fontSize: 16, fontWeight: 800, color: '#0f172a' },
  alertCantidad:    { fontSize: 13, fontWeight: 600, color: '#d97706' },
  alertCantidadCero:{ fontSize: 13, fontWeight: 600, color: '#dc2626' },
  nota:  { fontSize: 12, color: '#94a3b8', margin: '0 0 20px' },
  btn: {
    width: '100%', padding: '12px',
    background: '#2563eb', color: '#fff',
    border: 'none', borderRadius: 8,
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
};
