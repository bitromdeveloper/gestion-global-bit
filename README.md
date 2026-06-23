# Control de Gases — BRA (Versión Segura)

## Arquitectura de seguridad

```
Browser (React)
    ↓  solo habla con /api/
Vercel Serverless Functions  ← service key vive aquí (SECRETO)
    ↓  service key nunca llega al browser
Supabase PostgreSQL
```

**Lo que el browser nunca ve:**
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- JWT_SECRET

---

## PASO 1: Supabase

1. Ir a https://supabase.com → crear proyecto (región: São Paulo)
2. SQL Editor → ejecutar `SUPABASE_SETUP.sql`
3. Ir a Settings > API y copiar:
   - **Project URL**: `https://xxxx.supabase.co`
   - **service_role** key (NO la anon key — la service role está más abajo en la misma página)

---

## PASO 2: Generar JWT_SECRET

Necesitás una cadena aleatoria larga. Podés usar cualquiera de estas opciones:

```bash
# Opción A: en terminal (Linux/Mac)
openssl rand -base64 32

# Opción B: en Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción C: usar cualquier generador online de strings aleatorias de 32+ chars
# Ejemplo: "k8mX2pQw9nLvR4tYhJsE7dBzCuA1fGiN"
```

---

## PASO 3: Subir a GitHub (privado)

1. Crear repo privado en github.com
2. Subir esta carpeta al repo

---

## PASO 4: Deploy en Vercel

1. Ir a https://vercel.com → New Project → importar tu repo
2. En **Environment Variables** agregar las 3 variables:

| Variable | Valor |
|----------|-------|
| `SUPABASE_URL` | `https://zaeivbpacgpnlrxzqkoi.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (la service_role key, NO la anon) |
| `JWT_SECRET` | el string aleatorio que generaste |

3. Click en **Deploy**
4. Vercel compila React + activa las API routes automáticamente

---

## Variables de entorno

```env
# Solo viven en el servidor de Vercel, NUNCA en el browser
SUPABASE_URL=https://zaeivbpacgpnlrxzqkoi.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  ← service_role key
JWT_SECRET=string-aleatorio-de-32-chars
```

**Importante:** NO crear archivo `.env` en el proyecto. Las variables se configuran
directamente en el dashboard de Vercel. Así nunca quedan en el repo.

---

## Dónde encontrar la service_role key en Supabase

```
Supabase Dashboard
    → Settings (ícono engranaje)
    → API
    → Project API keys
    → service_role  ← esta (tiene "SECRET" al lado)
```

La anon key es pública por diseño. La service_role key bypasea RLS y tiene acceso total — por eso la guardamos solo en el servidor.

---

## Estructura del proyecto

```
tubos-bra-secure/
├── api/                        ← Vercel Serverless Functions (SERVIDOR)
│   ├── _lib.js                 ← Supabase client + auth helper
│   ├── login.js                ← POST /api/login
│   ├── tubos.js                ← GET/POST/PUT /api/tubos
│   ├── movimientos.js          ← GET/POST /api/movimientos
│   ├── ciclos.js               ← GET/POST/PUT /api/ciclos
│   └── perfil.js               ← PUT /api/perfil
├── src/                        ← React (BROWSER, código público)
│   ├── lib/
│   │   ├── api.js              ← Cliente HTTP (solo habla con /api/)
│   │   └── constants.js        ← Tipos, estados, permisos
│   ├── components/
│   │   ├── AuthContext.js      ← Auth state + JWT en localStorage
│   │   └── Layout.js           ← Sidebar
│   └── pages/
│       ├── LoginPage.js
│       ├── Dashboard.js
│       ├── Movimientos.js
│       ├── RegistrarMovimiento.js
│       ├── GestionTubos.js
│       ├── CiclosMensuales.js
│       └── Perfil.js
├── vercel.json                 ← Config de builds y routes
├── SUPABASE_SETUP.sql
└── README.md
```

---

## Cómo funciona el JWT

1. Usuario ingresa usuario + contraseña
2. `/api/login` valida contra Supabase (con service key, desde el servidor)
3. Si es correcto, genera un JWT firmado con `JWT_SECRET` con 8h de expiración
4. El browser guarda ese JWT en localStorage
5. Cada request siguiente manda el JWT en el header `Authorization: Bearer ...`
6. Cada API route verifica el JWT antes de hacer cualquier cosa
7. Si el JWT expiró o es inválido → 401 → logout automático

---

## Usuarios iniciales

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin.bra | tubos.admin | Todo |
| almacen.bra | tubos.almacen | Registra movimientos, gestiona tubos |
| compras.bra | tubos.compras | Ve costos y reportes |
| mantenimiento.bra | gases.mantenimiento | Solo consulta estado |

---

## Si Supabase se pausa

Los datos no se pierden. Ir a supabase.com → tu proyecto → "Restore project". 
En ~10 minutos vuelve todo. Con uso regular (al menos 1 login por semana) no se pausa.
