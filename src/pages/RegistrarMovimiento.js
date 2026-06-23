import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { TIPOS_OPERACION, SECTORES } from '../lib/constants';

export default function RegistrarMovimiento() {
  const { user } = useAuth();
  const [tubos, setTubos] = useState([]);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo_operacion: '',
    tubo_id: '',
    estado_anterior: '',
    estado_nuevo: '',
    sector_origen: '',
    sector_destino: '',
    observaciones: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getTubos().then(data => setTubos((data || []).filter(t => t.activo)));
  }, []);

  const tuboSeleccionado = tubos.find(t => t.id === form.tubo_id);

  const handleTuboChange = (id) => {
    const t = tubos.find(t => t.id === id);
    setForm(f => ({ ...f, tubo_id: id, estado_anterior: t?.estado || '', sector_origen: t?.ubicacion || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!form.tubo_id || !form.tipo_operacion || !form.estado_nuevo) {
      setError('Completá todos los campos obligatorios');
      setLoading(false);
      return;
    }

    try {
      const tubo = tubos.find(t => t.id === form.tubo_id);
      await api.registrarMovimiento({
        fecha: form.fecha,
        tipo_operacion: form.tipo_operacion,
        tubo_id: form.tubo_id,
        tubo_codigo: tubo?.codigo || '',
        estado_anterior: form.estado_anterior,
        estado_nuevo: form.estado_nuevo,
        sector_origen: form.sector_origen,
        sector_destino: form.sector_destino,
        ubicacion_destino: form.sector_destino || null,
        observaciones: form.observaciones,
      });
      setSuccess(`Movimiento registrado correctamente para ${tubo?.codigo}`);
      setForm({ fecha: new Date().toISOString().split('T')[0], tipo_operacion: '', tubo_id: '', estado_anterior: '', estado_nuevo: '', sector_origen: '', sector_destino: '', observaciones: '' });
      const data = await api.getTubos();
      setTubos((data || []).filter(t => t.activo));
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={s.pageHeader}><h2 style={s.pageTitle}>Registrar Movimiento</h2></div>
      <div style={s.formCard}>
        {success && <div style={s.successMsg}>✓ {success}</div>}
        {error && <div style={s.errorMsg}>✗ {error}</div>}
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Fecha *</label>
              <input style={s.input} type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Tipo de operación *</label>
              <select style={s.input} value={form.tipo_operacion} onChange={e => setForm(f => ({ ...f, tipo_operacion: e.target.value }))} required>
                <option value="">Seleccionar...</option>
                {TIPOS_OPERACION.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Tubo *</label>
            <select style={s.input} value={form.tubo_id} onChange={e => handleTuboChange(e.target.value)} required>
              <option value="">Seleccionar tubo...</option>
              {tubos.map(t => (
                <option key={t.id} value={t.id}>{t.codigo} — {t.tipo} — {t.estado} — {t.ubicacion}</option>
              ))}
            </select>
          </div>
          {tuboSeleccionado && (
            <div style={s.tuboInfo}>
              <span>Código: <strong>{tuboSeleccionado.codigo}</strong></span>
              <span>Tipo: <strong>{tuboSeleccionado.tipo}</strong></span>
              <span>Estado actual: <strong>{tuboSeleccionado.estado}</strong></span>
              <span>Ubicación: <strong>{tuboSeleccionado.ubicacion}</strong></span>
            </div>
          )}
          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Estado anterior</label>
              <input style={{ ...s.input, background: '#f8fafc', color: '#64748b' }} value={form.estado_anterior} readOnly />
            </div>
            <div style={s.field}>
              <label style={s.label}>Estado nuevo *</label>
              <select style={s.input} value={form.estado_nuevo} onChange={e => setForm(f => ({ ...f, estado_nuevo: e.target.value }))} required>
                <option value="">Seleccionar...</option>
                {['Lleno','Vacío','En Reparación','Retirado'].map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Sector de origen</label>
              <select style={s.input} value={form.sector_origen} onChange={e => setForm(f => ({ ...f, sector_origen: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {SECTORES.map(sec => <option key={sec}>{sec}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Sector de destino</label>
              <select style={s.input} value={form.sector_destino} onChange={e => setForm(f => ({ ...f, sector_destino: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {SECTORES.map(sec => <option key={sec}>{sec}</option>)}
              </select>
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Observaciones</label>
            <textarea style={{ ...s.input, resize: 'vertical', minHeight: 72 }} value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Detalles adicionales (opcional)..." />
          </div>
          <div style={s.formFooter}>
            <span style={s.registrando}>Registrando como: <strong>{user?.username}</strong></span>
            <button style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  pageHeader: { marginBottom: 24 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' },
  formCard: { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', maxWidth: 720 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#0f172a', outline: 'none', background: '#fff', fontFamily: 'inherit' },
  tuboInfo: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: '#1e40af' },
  formFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  registrando: { fontSize: 13, color: '#64748b' },
  submitBtn: { padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  successMsg: { background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#065f46', marginBottom: 12 },
  errorMsg: { background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b', marginBottom: 12 },
};
