export default {
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
  headerRow1: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 24px', borderBottom: '1px solid #2E3338', background: '#1A1D20', gap: 20,
  },
  headerBrand: { display: 'flex', alignItems: 'center', gap: 10 },
  headerTabs: { display: 'flex', gap: 4 },
  headerRow2: {
    display: 'flex', alignItems: 'center', gap: 16, padding: '10px 24px',
    borderBottom: '1px solid #2E3338', background: '#181B1E', flexWrap: 'wrap',
  },
  headerActions: { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  statsInline: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#8B9199', whiteSpace: 'nowrap' },
  statsDivider: { color: '#3A4048' },
  plateIcon: {
    width: 30, height: 30, borderRadius: 5, background: '#24282C', border: '1px solid #3A4048',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#5B7A99',
  },
  title: { fontSize: 13.5, fontWeight: 600, letterSpacing: '0.05em' },

  globalSearchInput: {
    width: 280, padding: '9px 14px', background: '#24282C', border: '1px solid #3A4048', borderRadius: 20,
    color: '#E8E6E1', fontSize: 13, fontFamily: "'Oswald', sans-serif", outline: 'none',
  },
  globalSearchDropdown: {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 380, background: '#24282C',
    border: '1px solid #3A4048', borderRadius: 8, overflow: 'hidden', zIndex: 30,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: 320, overflowY: 'auto',
  },
  globalSearchEmpty: { padding: '12px 14px', fontSize: 12, color: '#5A6068' },
  globalSearchItem: {
    display: 'flex', flexDirection: 'column', gap: 2, padding: '9px 14px', cursor: 'pointer',
    borderBottom: '1px solid #2E3338',
  },
  globalSearchCodigo: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: '#E8E6E1', fontWeight: 500 },
  globalSearchDesc: { fontSize: 11.5, color: '#8B9199' },
  statBox: { textAlign: 'right' },
  statValue: { fontSize: 22, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" },
  statLabel: { fontSize: 10, color: '#8B9199', textTransform: 'uppercase', letterSpacing: '0.05em' },
  refreshBtn: {
    background: '#24282C', border: '1px solid #3A4048', color: '#8B9199', borderRadius: 5,
    width: 26, height: 26, cursor: 'pointer', fontSize: 12,
  },
  body: { display: 'flex', flex: 1, minHeight: 0 },
  sidebar: {
    width: 260, borderRight: '1px solid #2E3338', display: 'flex', flexDirection: 'column',
    background: '#1A1D20', flexShrink: 0, position: 'relative', transition: 'width 0.15s ease',
  },
  sidebarColapsado: { width: 34, overflow: 'hidden' },
  sidebarToggle: {
    position: 'absolute', top: 10, right: -12, width: 24, height: 24, borderRadius: '50%',
    background: '#24282C', border: '1px solid #3A4048', color: '#8B9199', cursor: 'pointer',
    fontSize: 13, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  search: {
    margin: '14px 12px 10px', padding: '7px 10px', background: '#1C1F22', border: '1px solid #2E3338',
    borderRadius: 5, color: '#E8E6E1', fontSize: 12.5, outline: 'none', fontFamily: "'Oswald', sans-serif",
  },
  sidebarScroll: { overflowY: 'auto', flex: 1, padding: '2px 0 14px' },
  groupItem: {
    padding: '8px 14px', cursor: 'pointer', borderLeft: '2px solid transparent',
  },
  groupItemActive: { background: '#1F2225', borderLeftColor: '#5B7A99' },
  groupItemTop: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 2 },
  groupCount: { fontSize: 11, color: '#5A6068', fontFamily: "'IBM Plex Mono', monospace" },
  groupName: { fontSize: 12.5, lineHeight: 1.3, color: '#B8B6B1' },
  main: { flex: 1, overflowY: 'auto', padding: '24px 32px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70%', color: '#5A6068' },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: 500, marginBottom: 6, color: '#8B9199' },
  emptyText: { fontSize: 12, textAlign: 'center', maxWidth: 340 },

  dashboard: { display: 'flex', flexDirection: 'column', gap: 22 },
  dashboardHeader: { display: 'flex', alignItems: 'center', gap: 16 },
  alertasSection: {
    background: '#24282C', border: '1px solid #2E3338', borderRadius: 10, padding: '18px 20px',
  },
  alertasTitle: { fontSize: 13, fontWeight: 600, color: '#E8871E', marginBottom: 14 },
  alertasVacio: { fontSize: 12.5, color: '#4FA98C', padding: '8px 0' },
  alertasList: { display: 'flex', flexDirection: 'column', gap: 8 },
  alertaRow: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: '#1C1F22',
    borderRadius: 6, border: '1px solid #2E3338', cursor: 'pointer', flexWrap: 'wrap',
  },
  alertaCodigo: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: '#E8E6E1', fontWeight: 500 },
  alertaDesc: { fontSize: 12, color: '#8B9199', flex: 1 },
  alertaProveedor: { fontSize: 11.5, color: '#5B7A99' },
  alertaDias: { fontSize: 11.5, color: '#E8871E', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" },
  mainHeader: { marginBottom: 22 },
  mainTitle: { fontSize: 22, fontWeight: 600, margin: '8px 0 4px', letterSpacing: '0.01em' },
  mainMeta: { fontSize: 12, color: '#8B9199' },
  gastoTotalUsd: { color: '#4FA98C', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" },
  codeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 },
  equipoDescCard: {
    background: '#212427', border: '1px solid #2A2E32', borderRadius: 4, padding: '14px 16px', cursor: 'pointer',
    transition: 'background 0.12s ease',
  },
  equipoDescNombre: { fontSize: 13, color: '#D8D6D1', lineHeight: 1.35, marginBottom: 8 },
  equipoDescCount: { fontSize: 11, color: '#5B7A99', fontFamily: "'IBM Plex Mono', monospace" },

  descList: {
    display: 'flex', flexDirection: 'column', border: '1px solid #2A2E32', borderRadius: 6, overflow: 'hidden',
  },
  descListHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px',
    background: '#1A1D20', borderBottom: '1px solid #2A2E32',
  },
  descListItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px',
    borderBottom: '1px solid #2A2E32', cursor: 'pointer',
  },
  descListNombre: { fontSize: 13, color: '#D8D6D1' },
  descListCount: { fontSize: 11.5, color: '#5B7A99', fontFamily: "'IBM Plex Mono', monospace" },
  mostrarMasBtn: {
    display: 'block', margin: '14px auto 0', background: 'transparent', border: '1px solid #3A4048',
    color: '#8B9199', borderRadius: 6, padding: '8px 18px', fontSize: 12, cursor: 'pointer', fontFamily: "'Oswald', sans-serif",
  },

  colHeaderItem: {
    fontSize: 10, color: '#8B9199', textTransform: 'uppercase', letterSpacing: '0.03em',
    cursor: 'pointer', userSelect: 'none', padding: '2px 4px', borderRadius: 3,
  },
  colHeaderRight: { textAlign: 'right' },

  codeListWrap: {
    display: 'flex', flexDirection: 'column', border: '1px solid #2A2E32', borderRadius: 6, overflow: 'hidden',
  },
  codeListHeader: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '8px 16px',
    background: '#1A1D20', borderBottom: '1px solid #2A2E32', flexWrap: 'wrap',
  },
  codeListItem: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px',
    borderBottom: '1px solid #2A2E32', borderLeft: '3px solid #3A4048',
    cursor: 'pointer', background: '#212427', flexWrap: 'wrap',
  },
  colCodigo: { minWidth: 140, flexShrink: 0 },
  colDesc: { flex: 1, minWidth: 170 },
  colProveedor: { minWidth: 140, flexShrink: 0 },
  colFecha: { minWidth: 130, flexShrink: 0 },
  colMonto: { minWidth: 90, flexShrink: 0, textAlign: 'right' },
  colOc: { minWidth: 80, flexShrink: 0 },
  colEstado: { minWidth: 140, flexShrink: 0 },
  colRep: { minWidth: 32, flexShrink: 0, textAlign: 'right' },
  codeListCodigo: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: '#E8E6E1' },
  codeListDesc: { fontSize: 12, color: '#9AA0A6' },
  codeListTag: { fontSize: 9.5, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' },
  codeListMeta: { fontSize: 11, color: '#8B9199' },
  codeListMonto: { fontSize: 11.5, color: '#D8D6D1', fontFamily: "'IBM Plex Mono', monospace" },
  codeListHace: { color: '#5A6068', fontSize: 10 },
  codeListCount: { fontSize: 10.5, color: '#5B7A99', fontFamily: "'IBM Plex Mono', monospace" },
  codeCard: {
    background: '#212427', borderTop: '1px solid #2A2E32', borderRight: '1px solid #2A2E32', borderBottom: '1px solid #2A2E32',
    borderLeft: '3px solid #3A4048', borderRadius: 4, padding: '12px 14px', cursor: 'pointer',
    transition: 'background 0.12s ease',
  },
  codeCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  codeText: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 600, color: '#E8E6E1', letterSpacing: '0.01em' },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  codeCardDesc: { fontSize: 11, color: '#7D8288', marginBottom: 9, minHeight: 26, lineHeight: 1.35 },
  codeCardBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  statusBadge: { fontSize: 9.5, fontWeight: 500, padding: '2px 7px', borderRadius: 3, letterSpacing: '0.02em' },
  codeCardCount: { fontSize: 10.5, color: '#5A6068', fontFamily: "'IBM Plex Mono', monospace" },
  codeCardDate: { fontSize: 10, color: '#5A6068' },
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(91,122,153,0.1)', border: '1px solid #5B7A99', color: '#7B9AB8',
    fontSize: 12, fontWeight: 500, cursor: 'pointer', padding: '7px 14px', borderRadius: 6,
    marginBottom: 16, letterSpacing: '0.02em', fontFamily: "'Oswald', sans-serif",
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
    background: 'transparent', border: '1px solid #3A4048', color: '#B8B6B1', borderRadius: 5,
    padding: '5px 11px', fontSize: 11.5, cursor: 'pointer', fontFamily: "'Oswald', sans-serif",
  },
  adminBtnPrimary: {
    background: 'transparent', border: '1px solid #5B7A99', color: '#7B9AB8', borderRadius: 5,
    padding: '5px 11px', fontSize: 11.5, cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontWeight: 500,
  },
  adminBtnDanger: {
    background: 'transparent', border: '1px solid #A85248', color: '#C97369', borderRadius: 5,
    padding: '5px 11px', fontSize: 11.5, cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontWeight: 500,
  },
  adminBtnBaja: {
    background: 'transparent', border: '1px solid #4FA98C', color: '#4FA98C', borderRadius: 5,
    padding: '5px 11px', fontSize: 11.5, cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontWeight: 500,
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
    display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: '1px solid #3A4048',
    borderRadius: 18, padding: '3px 8px 3px 3px', cursor: 'pointer',
  },
  userAvatar: {
    width: 21, height: 21, borderRadius: '50%', background: '#3D4E5C', color: '#B8CADA',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600, flexShrink: 0,
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
    background: 'transparent', border: '1px solid #3A4048', color: '#8B9199', borderRadius: 5,
    padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: "'Oswald', sans-serif",
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

  filterToggleActive: { background: 'rgba(168,82,72,0.12)', color: '#C97369', borderColor: '#A85248' },
  codeCardInactivo: { opacity: 0.65, borderStyle: 'dashed' },
  bajaTag: {
    fontSize: 9.5, fontWeight: 600, color: '#C97369', background: 'rgba(168,82,72,0.12)',
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

  tabBar: {
    display: 'flex', gap: 4, padding: '10px 28px 0', background: '#1A1D20', borderBottom: '1px solid #2E3338',
  },
  tabBtn: {
    background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#8B9199',
    padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'Oswald', sans-serif",
    letterSpacing: '0.02em',
  },
  tabBtnActive: { color: '#E8E6E1', borderBottomColor: '#5B7A99' },

  unidadesWrap: { padding: '24px 32px' },
  unidadesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 },
  unidadCard: {
    background: '#24282C', border: '1px solid #2E3338', borderRadius: 8, padding: 14,
  },
  unidadNombre: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 600, color: '#E8E6E1', marginBottom: 4 },
  unidadEquipo: { fontSize: 11, color: '#5B7A99', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 },
  unidadDescripcion: { fontSize: 12, color: '#8B9199', marginBottom: 10, lineHeight: 1.4 },
  unidadAcciones: { display: 'flex', gap: 8 },
  unidadesVacioAviso: {
    fontSize: 11.5, color: '#E8871E', background: 'rgba(232,135,30,0.1)', border: '1px solid rgba(232,135,30,0.3)',
    borderRadius: 6, padding: '8px 10px', marginTop: 4,
  },

  toastStack: {
    position: 'fixed', top: 16, right: 16, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340,
  },
  toast: {
    background: '#24282C', border: '1px solid #3A4048', borderLeft: '4px solid #5B7A99', borderRadius: 6,
    padding: '10px 14px', fontSize: 12.5, color: '#E8E6E1', boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
  },
};
