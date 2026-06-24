-- =====================================================
-- CONTROL DE TUBOS - BENITO ROGGIO AMBIENTAL v2
-- Ejecutar completo en Supabase > SQL Editor
-- =====================================================

-- Borrar tablas anteriores si existen
DROP TABLE IF EXISTS ciclos_mensuales CASCADE;
DROP TABLE IF EXISTS movimientos CASCADE;
DROP TABLE IF EXISTS tubos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- 1. USUARIOS
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  sector TEXT NOT NULL CHECK (sector IN ('admin', 'almacen', 'compras', 'mantenimiento', 'infraestructura')),
  email1 TEXT,
  email2 TEXT,
  email3 TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TUBOS
CREATE TABLE tubos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('O2', 'Butano', 'N2', 'Atal')),
  capacidad NUMERIC NOT NULL,
  unidad TEXT NOT NULL CHECK (unidad IN ('kg', 'm3')),
  estado TEXT NOT NULL DEFAULT 'Lleno' CHECK (estado IN ('Lleno', 'Vacío')),
  ubicacion TEXT NOT NULL CHECK (ubicacion IN ('Almacén', 'Mantenimiento', 'Infraestructura', 'Sub Base')),
  pedido_por TEXT,              -- sector que solicitó el tubo
  precio_unitario NUMERIC DEFAULT 0,
  alquiler_mensual NUMERIC DEFAULT 0,
  precio_transporte NUMERIC DEFAULT 0,
  fecha_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MOVIMIENTOS (auditoría completa)
CREATE TABLE movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_operacion TEXT NOT NULL CHECK (tipo_operacion IN (
    'Carga',          -- vacío → lleno (Almacén)
    'Entrega',        -- Almacén → Mto/Infra/SubBase
    'Devolución',     -- Mto/Infra → Almacén (llega vacío)
    'Alta',           -- tubo nuevo al sistema
    'Baja'            -- tubo retirado del sistema
  )),
  tubo_id UUID REFERENCES tubos(id),
  tubo_codigo TEXT NOT NULL,
  tubo_tipo TEXT NOT NULL,
  ubicacion_origen TEXT,
  ubicacion_destino TEXT,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  pedido_por TEXT,              -- solo en Altas
  usuario_registra TEXT NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CICLOS MENSUALES
CREATE TABLE ciclos_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes TEXT NOT NULL,
  tipo_tubo TEXT NOT NULL,
  cantidad_stock INT DEFAULT 0,
  precio_alquiler_mensual NUMERIC DEFAULT 0,
  precio_transporte_tubo NUMERIC DEFAULT 0,
  cambios_realizados INT DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mes, tipo_tubo)
);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

INSERT INTO usuarios (username, password_hash, sector) VALUES
  ('admin.bra',          'tubos.admin',          'admin'),
  ('almacen.bra',        'tubos.almacen',        'almacen'),
  ('compras.bra',        'tubos.compras',        'compras'),
  ('mantenimiento.bra',  'gases.mantenimiento',  'mantenimiento'),
  ('infraestructura.bra','tubos.infraestructura','infraestructura')
ON CONFLICT (username) DO NOTHING;

-- Tubos de ejemplo
INSERT INTO tubos (codigo, tipo, capacidad, unidad, estado, ubicacion, pedido_por, precio_unitario, alquiler_mensual, precio_transporte) VALUES
  ('T001', 'O2',    50,  'kg', 'Lleno', 'Almacén',        'Mantenimiento', 25.50, 15.00, 8.00),
  ('T002', 'O2',    50,  'kg', 'Lleno', 'Mantenimiento',  'Mantenimiento', 25.50, 15.00, 8.00),
  ('T003', 'O2',    50,  'kg', 'Vacío', 'Almacén',        'Mantenimiento', 25.50, 15.00, 8.00),
  ('T004', 'Butano',25,  'kg', 'Lleno', 'Infraestructura','Infraestructura',18.00,12.00, 6.00),
  ('T005', 'Butano',25,  'kg', 'Lleno', 'Almacén',        'Infraestructura',18.00,12.00, 6.00),
  ('T006', 'N2',    100, 'm3', 'Lleno', 'Almacén',        'Sub Base',      30.00, 18.00, 10.00),
  ('T007', 'N2',    100, 'm3', 'Vacío', 'Almacén',        'Sub Base',      30.00, 18.00, 10.00),
  ('T008', 'Atal',  40,  'kg', 'Lleno', 'Almacén',        'Mantenimiento', 22.00, 14.00, 7.00)
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- SEGURIDAD
-- =====================================================

ALTER TABLE usuarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tubos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciclos_mensuales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso_anon" ON usuarios        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "acceso_anon" ON tubos           FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "acceso_anon" ON movimientos     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "acceso_anon" ON ciclos_mensuales FOR ALL TO anon USING (true) WITH CHECK (true);
