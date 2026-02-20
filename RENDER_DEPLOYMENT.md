## DEPLOYMENT A RENDER - Guía paso a paso

### PASO 1: Conectar GitHub a Render
1. Ve a https://dashboard.render.com
2. Haz clic en "New +" → "Web Service"
3. Selecciona "Deploy an existing repository"
4. Busca "SMOT-Fer/SaaS-BE"
5. Selecciona "Connect"

### PASO 2: Configurar el servicio
```
Name: saas-be (o como prefieras)
Environment: Node
Region: Frankfurt (closest EU) o Virginia (US)
Branch: main
Build Command: npm install
Start Command: npm start
Plan: Free (o Paid si necesitas)
```

### PASO 3: Agregar variables de entorno
En "Environment Variables", copia y pega EXACTAMENTE esto:

```
DATABASE_URL=postgresql://postgres.lyddvcklsjslqkbzvzyf:SMOTFerDM21@aws-1-us-east-2.pooler.supabase.com:5432/postgres
PORT=3000
NODE_ENV=production
JWT_SECRET=5c5859e14b6e77041ae0ed35b4f46c36a2c66cb025b74d4246bf644827ce4b07
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3001
CSRF_SECRET=6f1584291ebe2061d64a72362c96d82241691e777d4d88d6bc132eaeb24b7303
RATE_LIMIT=100
AUTH_RATE_LIMIT=5
ENABLE_AUDIT_LOG=true
FRONTEND_URL=http://localhost:3001
```

**✅ Ya están listos para copiar y pegar. Solo actualiza CORS_ORIGIN y FRONTEND_URL cuando tengas tu URL de Render.**

### PASO 4: Deploy
1. Haz clic en "Create Web Service"
2. Espera a que Render clone el repo
3. Verifica que npm install y npm start se ejecuten sin errores
4. Copia la URL pública: `https://saas-be.onrender.com`

### PASO 5: Verificar que funciona
```bash
curl https://saas-be.onrender.com/healthz
# Debe retornar: {"status":"healthy"}
```

### PASO 6: Ejecutar migrations en PostgreSQL remoto

Una vez que Render esté online, copia y pega esto en PowerShell:

```powershell
cd c:\Users\User\OneDrive\Escritorio\estudio
$env:DATABASE_URL="postgresql://postgres.lyddvcklsjslqkbzvzyf:SMOTFerDM21@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
npm run migrate:up
```

**Debe retornar algo como:**
```
[INFO] Processed migration 001-init-schema.sql
[INFO] Processed migration 002-add-soft-deletes.sql
[INFO] Processed migration 003-add-audit-tables.sql
[INFO] Processed migration 004-create-personas.sql
[INFO] Processed migration 005-add-soft-deletes-personas.sql
```

---

## CHECKLIST FINAL

Cuando Render haya deployado exitosamente:

- [ ] Dashboard Render: https://dashboard.render.com
- [ ] Copia tu URL pública (ej: `https://saas-be-xxxxx.onrender.com`)
- [ ] Prueba: `https://saas-be-xxxxx.onrender.com/healthz`
- [ ] Verifica logs en Render dashboard si hay errores
- [ ] Ejecuta: `npm run migrate:up` (desde tu local)
- [ ] Actualiza CORS_ORIGIN con tu frontend URL
- [ ] Actualiza FRONTEND_URL con tu frontend URL

---

## TUS DATOS GUARDADOS

**Base de datos:**
```
postgresql://postgres.lyddvcklsjslqkbzvzyf:SMOTFerDM21@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

**JWT Secret:**
```
5c5859e14b6e77041ae0ed35b4f46c36a2c66cb025b74d4246bf644827ce4b07
```

**CSRF Secret:**
```
6f1584291ebe2061d64a72362c96d82241691e777d4d88d6bc132eaeb24b7303
```

---

## ¿Necesitas ayuda?

- ❌ **Error "npm: not found"** → Render no tiene Node instalado, selecciona `Node` en Environment type
- ❌ **Error "Cannot find module"** → Falta build command, asegúrate que sea `npm install`
- ❌ **Error "Connection refused"** → BD no accesible, verifica DATABASE_URL
