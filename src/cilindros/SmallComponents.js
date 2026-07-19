import React from 'react';
import styles from './styles';

export function Stat({ label, value, accent }) {
  return (
    <div style={styles.statBox}>
      <div style={{ ...styles.statValue, color: accent || '#E8E6E1' }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

export function Field({ label, value }) {
  return (
    <div>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldValue}>{value}</div>
    </div>
  );
}
