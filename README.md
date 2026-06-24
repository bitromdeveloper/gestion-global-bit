# 🧪 Gas Cylinder Control System — Benito Roggio Ambiental

> **[English below](#english-version)**

---

## Versión en Español

### Sistema de Control de Tubos de Gas Industrial

Aplicación web full-stack para el seguimiento del inventario de tubos de gas industrial entre distintos sectores de la empresa, desarrollada para reemplazar el control manual en un entorno productivo real.

**Demo en vivo:** `[tu-app.vercel.app]`

---

### El problema

La empresa gestiona tubos de gas industrial (O₂, Butano, N₂, Atal) distribuidos entre varios sectores. Anteriormente no existía ningún sistema formal de seguimiento — sin historial de quién movió qué tubo, cuándo ni por qué. El proveedor cobra alquiler mensual por tubo más un cargo de transporte por entrega, que se calculaban de forma manual.

### La solución

Una aplicación web interna con control de acceso por roles donde cada sector ve exactamente lo que necesita:

- **Almacén** registra altas, bajas, cargas (vacío → lleno) y consumos por sector
- **Mantenimiento** ve sus tubos en uso, los disponibles para ellos en Almacén, y su historial de consumo
- **Infraestructura** tiene su propio panel simplificado (consume Atal ocasionalmente)
- **Compras** controla costos mensuales y ciclos de facturación
- **Admin** tiene acceso total

---

### Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Custom (usuario/contraseña por sector) |
| Hosting | Vercel |

---

### Funcionalidades

- **Control de acceso por roles** — 5 roles con permisos diferenciados
- **Inventario de tubos** — alta, baja, edición con seguimiento de estado (Lleno / Vacío) y ubicación
- **Campo "Pedido por"** — cada tubo registra qué sector lo solicitó; Mantenimiento e Infraestructura solo ven los tubos cargados para ellos
- **Movimientos con reglas de negocio:**
  - Consumo: solo tubos llenos, solo los asignados al sector
  - Devolución: vuelve automáticamente como Vacío a Almacén
  - Alta/Baja: solo Almacén y Admin
  - Carga: Almacén recarga tubos vacíos
- **Dashboard general** — 4 tarjetas por tipo de gas (clickeables para ver detalle), distribución por sector con estados "Lleno / En uso / Vacío"
- **Panel de Mantenimiento** — tubos en uso, disponibles en Almacén, resumen mensual (en uso / consumidos), historial propio
- **Panel de Infraestructura** — vista simplificada con sus tubos y consumos del mes
- **Historial** — movimientos por mes con resumen de cargas, consumos y devoluciones por tipo de gas
- **Ciclos mensuales** — costos de alquiler y transporte editables en línea con cálculo automático
- **Alertas de stock bajo** — popup automático cuando hay 1 o menos tubos llenos de algún tipo en Almacén

---

### Roles y permisos

| Función | Admin | Almacén | Compras | Mantenimiento | Infraestructura |
|---------|:-----:|:-------:|:-------:|:-------------:|:---------------:|
| Dashboard general | ✓ | ✓ | ✓ | — | — |
| Panel propio | — | — | — | ✓ | ✓ |
| Registrar movimientos | ✓ | ✓ | — | ✓ | ✓ |
| Alta / Baja de tubos | ✓ | ✓ | — | — | — |
| Ver historial | ✓ | ✓ | ✓ | — | — |
| Ver costos y ciclos | ✓ | — | ✓ | — | — |

---

### Usuarios del sistema

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin.bra | tubos.admin | Administrador |
| almacen.bra | tubos.almacen | Almacén |
| compras.bra | tubos.compras | Compras |
| mantenimiento.bra | gases.mantenimiento | Mantenimiento |
| infraestructura.bra | tubos.infraestructura | Infraestructura |

---

### Estructura del proyecto

```
├── src/
│   ├── lib/
│   │   ├── supabase.js          ← Cliente Supabase
│   │   ├── db.js                ← Todas las operaciones con reglas de negocio
│   │   └── constants.js         ← Roles, permisos, tipos de gas
│   ├── components/
│   │   ├── AuthContext.js       ← Auth state
│   │   ├── Layout.js            ← Sidebar con navegación por rol
│   │   └── AlertaStock.js       ← Popup de stock bajo
│   └── pages/
│       ├── LoginPage.js
│       ├── Dashboard.js              ← Vista general (Almacén, Compras, Admin)
│       ├── DashboardMantenimiento.js ← Panel propio de Mantenimiento
│       ├── DashboardInfraestructura.js← Panel propio de Infraestructura
│       ├── Movimientos.js            ← Registrar movimientos
│       ├── Historial.js              ← Historial por mes
│       ├── CiclosMensuales.js        ← Costos y ciclos
│       └── Perfil.js                 ← Contraseña y emails
├── SUPABASE_SETUP.sql           ← Ejecutar en Supabase SQL Editor
└── .env.example                 ← Template de variables de entorno
```

---

### Setup

**1. Supabase**
- Crear proyecto en supabase.com (región: São Paulo)
- SQL Editor → ejecutar `SUPABASE_SETUP.sql`
- Settings → API → copiar URL y anon key

**2. Variables de entorno**
```bash
cp .env.example .env.local
# Completar con tus credenciales de Supabase
```

**3. Correr localmente**
```bash
npm install
npm start
```

**4. Deploy en Vercel**
- Importar repo en vercel.com
- Agregar variables de entorno: `REACT_APP_SUPABASE_URL` y `REACT_APP_SUPABASE_ANON_KEY`
- Deploy

---

### Seguridad

- RLS (Row Level Security) activado en Supabase con políticas para la anon key
- Las reglas de negocio se validan tanto en el frontend como en `db.js`
- Las contraseñas se almacenan como texto plano — aceptable para uso interno con usuarios controlados
- La anon key es visible en el bundle de React (comportamiento estándar para apps sin backend)

---

*Desarrollado para uso interno en Benito Roggio Ambiental — gestión de flota de recolección de residuos, Buenos Aires.*

---
---

## English Version

### Industrial Gas Cylinder Control System

A full-stack web application for tracking industrial gas cylinder inventory across multiple departments, built to replace manual control in a real production environment.

**Live demo:** `[your-app.vercel.app]`

---

### The Problem

The company manages industrial gas cylinders (O₂, Butane, N₂, Atal) across multiple sectors with no formal tracking system — no audit trail of who moved what, when, or why.

### The Solution

A role-based internal web app where each sector sees exactly what it needs:

- **Warehouse** registers new cylinders, retirements, recharges, and consumption by sector
- **Maintenance** sees its cylinders in use, available ones at Warehouse, and its consumption history
- **Infrastructure** has its own simplified panel (occasional Atal usage)
- **Procurement** monitors monthly costs and billing cycles
- **Admin** has full access

---

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 |
| Database | Supabase (PostgreSQL) |
| Auth | Custom (username/password per sector) |
| Hosting | Vercel |

---

### Features

- **Role-based access control** — 5 roles with differentiated permissions
- **Cylinder inventory** — create, retire, recharge, track state (Full / Empty) and location
- **"Requested by" field** — each cylinder records which sector requested it; Maintenance and Infrastructure only see cylinders loaded for them
- **Business rule enforcement:**
  - Consumption: only full cylinders assigned to the requesting sector
  - Return: automatically marks cylinder as Empty back at Warehouse
  - Create/Retire: Warehouse and Admin only
  - Recharge: Warehouse recharges empty cylinders
- **General dashboard** — 4 clickable cards by gas type, sector distribution with Full/In use/Empty states
- **Maintenance panel** — cylinders in use, available at Warehouse, monthly summary, own history
- **Infrastructure panel** — simplified view with its cylinders and monthly consumption
- **History** — monthly movements with summary by gas type
- **Monthly cycles** — inline-editable rental and transport costs with automatic calculation
- **Low stock alerts** — automatic popup when 1 or fewer full cylinders of any type remain at Warehouse

---

### Roles & Permissions

| Feature | Admin | Warehouse | Procurement | Maintenance | Infrastructure |
|---------|:-----:|:---------:|:-----------:|:-----------:|:--------------:|
| General dashboard | ✓ | ✓ | ✓ | — | — |
| Own sector panel | — | — | — | ✓ | ✓ |
| Register movements | ✓ | ✓ | — | ✓ | ✓ |
| Create / Retire cylinders | ✓ | ✓ | — | — | — |
| View history | ✓ | ✓ | ✓ | — | — |
| View costs & cycles | ✓ | — | ✓ | — | — |

---

### Project Structure

```
├── src/
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── db.js                ← All DB operations with business rules
│   │   └── constants.js
│   ├── components/
│   │   ├── AuthContext.js
│   │   ├── Layout.js
│   │   └── AlertaStock.js       ← Low stock popup
│   └── pages/
│       ├── Dashboard.js
│       ├── DashboardMantenimiento.js
│       ├── DashboardInfraestructura.js
│       ├── Movimientos.js
│       ├── Historial.js
│       ├── CiclosMensuales.js
│       └── Perfil.js
├── SUPABASE_SETUP.sql
└── .env.example
```

---

### Setup

```bash
# 1. Run SUPABASE_SETUP.sql in Supabase SQL Editor
# 2. Configure environment
cp .env.example .env.local
# Fill in your Supabase URL and anon key

# 3. Run locally
npm install
npm start
```

---

*Built for internal use at Benito Roggio Ambiental — waste collection fleet management, Buenos Aires.*
