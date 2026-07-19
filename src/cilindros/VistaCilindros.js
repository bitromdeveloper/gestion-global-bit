import React from 'react';
import styles from './styles';
import { STATUS_STYLE, ESTADO_OPERATIVO_STYLE, fmtDate, fmtMoney, fmtHaceTiempo, esInactivo } from './helpers';
import { Field } from './SmallComponents';

// ============================================================================
// Vista "Cilindros": sidebar con los tipos catalogados + panel principal
// (grid de códigos, o detalle de un código con reparaciones, estado
// operativo, e historial). Recibe todo el estado necesario en un solo
// objeto "vm" (view-model) armado por CilindrosApp — así el JSX de acá
// queda igual al que tenía antes cuando vivía todo junto en un archivo.
// ============================================================================

export default function VistaCilindros({ vm }) {
  const {
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
  } = vm;

  return (
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
                onClick={() => { setSelectedGroup(g.name); setSelectedCode(null); setCodeQuery(''); setFechaDesde(''); setFechaHasta(''); setFiltroEstadoOperativo('todos'); }}
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
            <div style={styles.dashboard}>
              <div style={styles.dashboardHeader}>
                <div style={styles.emptyIcon}>◧</div>
                <div>
                  <div style={styles.emptyTitle}>Resumen general</div>
                  <div style={styles.emptyText}>{groups.length} tipos de cilindro catalogados — elegí uno del listado para ver el detalle</div>
                </div>
              </div>

              <div style={styles.alertasSection}>
                <div style={styles.alertasTitle}>
                  ⚠ Alertas — {alertasOperativas.length} cilindro{alertasOperativas.length === 1 ? '' : 's'} hace 30+ días sin volver
                </div>

                {alertasOperativas.length === 0 ? (
                  <div style={styles.alertasVacio}>No hay ningún cilindro en poder del proveedor o roto hace más de 30 días. Todo al día.</div>
                ) : (
                  <div style={styles.alertasList}>
                    {alertasOperativas.map((a) => (
                      <div key={a.codigo} style={styles.alertaRow} onClick={() => irACodigo(a.codigo)} className="row-hover">
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
                        <span style={styles.alertaDias}>hace {a.dias} días</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                <div style={styles.filterDateGroup}>
                  <span style={styles.filterDateLabel}>Estado</span>
                  <select
                    value={filtroEstadoOperativo}
                    onChange={(e) => setFiltroEstadoOperativo(e.target.value)}
                    style={styles.filterDateInput}
                  >
                    <option value="todos">Todos</option>
                    <option value="en_uso">En uso</option>
                    <option value="en_stock">En stock (reparado)</option>
                    <option value="en_proveedor">En poder del proveedor</option>
                    <option value="roto_en_almacen">Roto — en almacén</option>
                    <option value="baja">Dado de baja</option>
                  </select>
                </div>
                {(codeQuery || fechaDesde || fechaHasta || filtroEstadoOperativo !== 'todos') && (
                  <button
                    style={styles.filterClearBtn}
                    onClick={() => { setCodeQuery(''); setFechaDesde(''); setFechaHasta(''); setFiltroEstadoOperativo('todos'); }}
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
                  {(esAdmin || puedeDarBaja || puedeRegistrarMovimiento || puedeRegistrarReparacion) && (
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
                      {puedeRegistrarReparacion && (
                        <button style={styles.adminBtn} onClick={() => setMostrarFormReparacion(true)}>
                          Registrar reparación (OC)
                        </button>
                      )}
                      {puedeRegistrarMovimiento && (
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
                          desde {fmtDate(m.fecha)}{unidadNombre(m.unidad_id) ? ` · Unidad: ${unidadNombre(m.unidad_id)}` : ''}{m.proveedor ? ` · ${m.proveedor}` : ''}{m.observaciones ? ` · ${m.observaciones}` : ''}
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

                      if (editandoMovimientoId === m.id) {
                        return (
                          <div key={m.id} style={{ ...styles.movRow, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                            <div style={styles.adminFormRow}>
                              <div style={{ width: 200 }}>
                                <div style={styles.fieldLabel}>Estado</div>
                                <select
                                  style={styles.adminInput}
                                  value={formEditarMovimiento.estado}
                                  onChange={(e) => setFormEditarMovimiento((f) => ({ ...f, estado: e.target.value }))}
                                >
                                  <option value="en_uso">En uso</option>
                                  <option value="en_stock">En stock (reparado)</option>
                                  <option value="en_proveedor">En poder del proveedor</option>
                                  <option value="roto_en_almacen">Roto — en almacén</option>
                                  <option value="baja">Dado de baja</option>
                                </select>
                              </div>
                              <div style={{ width: 150 }}>
                                <div style={styles.fieldLabel}>Fecha</div>
                                <input
                                  type="date"
                                  style={styles.adminInput}
                                  value={formEditarMovimiento.fecha}
                                  onChange={(e) => setFormEditarMovimiento((f) => ({ ...f, fecha: e.target.value }))}
                                />
                              </div>
                              {formEditarMovimiento.estado === 'en_proveedor' && (
                                <div style={{ flex: 1 }}>
                                  <div style={styles.fieldLabel}>Proveedor</div>
                                  <input
                                    style={styles.adminInput}
                                    value={formEditarMovimiento.proveedor}
                                    onChange={(e) => setFormEditarMovimiento((f) => ({ ...f, proveedor: e.target.value }))}
                                  />
                                </div>
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={styles.fieldLabel}>Observaciones</div>
                                <input
                                  style={styles.adminInput}
                                  value={formEditarMovimiento.observaciones}
                                  onChange={(e) => setFormEditarMovimiento((f) => ({ ...f, observaciones: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div style={styles.adminFormActions}>
                              <button style={styles.adminBtn} onClick={() => setEditandoMovimientoId(null)}>Cancelar</button>
                              <button style={styles.adminBtnPrimary} disabled={guardandoEditarMovimiento} onClick={guardarEditarMovimiento}>
                                {guardandoEditarMovimiento ? 'Guardando...' : 'Guardar corrección'}
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={m.id} style={styles.movRow}>
                          <span style={{ ...styles.statusBadge, color: es.color, background: es.bg, minWidth: 150, textAlign: 'center' }}>
                            {es.label}
                          </span>
                          <span style={styles.movFecha}>{fmtDate(m.fecha)} <span style={{ color: '#5A6068' }}>({fmtHaceTiempo(m.fecha)})</span></span>
                          <span style={styles.movObs}>
                            {unidadNombre(m.unidad_id) ? `Unidad: ${unidadNombre(m.unidad_id)}` : ''}
                            {unidadNombre(m.unidad_id) && (m.observaciones || m.proveedor) ? ' · ' : ''}
                            {m.observaciones || (m.proveedor ? `Proveedor: ${m.proveedor}` : '') || (!unidadNombre(m.unidad_id) ? '—' : '')}
                          </span>
                          {esAdmin && (
                            <button style={styles.adminBtn} onClick={() => abrirEditarMovimiento(m)}>Editar</button>
                          )}
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

              {/* Formulario: registrar reparación (OC) */}
              {mostrarFormReparacion && (
                <div style={styles.adminPanel}>
                  <div style={styles.adminPanelTitle}>Registrar reparación (OC) — {selectedCode}</div>
                  <div style={styles.adminFormRow}>
                    <div style={{ width: 160 }}>
                      <div style={styles.fieldLabel}>Fecha de solicitud</div>
                      <input
                        type="date"
                        style={styles.adminInput}
                        value={formReparacion.fecha_solicitud}
                        onChange={(e) => setFormReparacion((f) => ({ ...f, fecha_solicitud: e.target.value }))}
                      />
                    </div>
                    <div style={{ width: 160 }}>
                      <div style={styles.fieldLabel}>OC definitiva *</div>
                      <input
                        style={styles.adminInput}
                        value={formReparacion.oc_definitiva}
                        onChange={(e) => setFormReparacion((f) => ({ ...f, oc_definitiva: e.target.value }))}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.fieldLabel}>Proveedor</div>
                      <input
                        style={styles.adminInput}
                        value={formReparacion.proveedor}
                        onChange={(e) => setFormReparacion((f) => ({ ...f, proveedor: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div style={styles.adminFormRow}>
                    <div style={{ width: 140 }}>
                      <div style={styles.fieldLabel}>Precio unitario</div>
                      <input
                        type="number" step="0.01"
                        style={styles.adminInput}
                        value={formReparacion.precio_unitario}
                        onChange={(e) => setFormReparacion((f) => ({ ...f, precio_unitario: e.target.value }))}
                      />
                    </div>
                    <div style={{ width: 140 }}>
                      <div style={styles.fieldLabel}>Precio total</div>
                      <input
                        type="number" step="0.01"
                        style={styles.adminInput}
                        value={formReparacion.precio_total}
                        onChange={(e) => setFormReparacion((f) => ({ ...f, precio_total: e.target.value }))}
                      />
                    </div>
                    <div style={{ width: 100 }}>
                      <div style={styles.fieldLabel}>Moneda</div>
                      <select
                        style={styles.adminInput}
                        value={formReparacion.moneda}
                        onChange={(e) => setFormReparacion((f) => ({ ...f, moneda: e.target.value }))}
                      >
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#8B9199', marginBottom: 12 }}>
                    Queda cargada como "En poder del proveedor" — cuando vuelva, registrá el movimiento correspondiente (no hace falta editar esto).
                  </div>
                  <div style={styles.adminFormActions}>
                    <button style={styles.adminBtn} onClick={() => setMostrarFormReparacion(false)}>Cancelar</button>
                    <button
                      style={styles.adminBtnPrimary}
                      disabled={guardandoReparacion}
                      onClick={() => registrarReparacion(selectedCode)}
                    >
                      {guardandoReparacion ? 'Guardando...' : 'Guardar reparación'}
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
                    {formMovimiento.estado === 'en_uso' && (
                      <div style={{ flex: 1 }}>
                        <div style={styles.fieldLabel}>Unidad *</div>
                        {unidades.filter((u) => u.activa).length === 0 ? (
                          <div style={styles.unidadesVacioAviso}>
                            No hay unidades dadas de alta. Andá a la pestaña "Unidades" para crear una.
                          </div>
                        ) : (
                          <select
                            style={styles.adminInput}
                            value={formMovimiento.unidad_id}
                            onChange={(e) => setFormMovimiento((f) => ({ ...f, unidad_id: e.target.value }))}
                          >
                            <option value="">Seleccionar unidad...</option>
                            {unidades.filter((u) => u.activa).map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.identificador}{u.equipo ? ` — ${u.equipo}` : ''}
                              </option>
                            ))}
                          </select>
                        )}
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

  );
}
