# 🏢 Tecsitel v4.0 - Sistema de Gestión Empresarial

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](https://github.com/usuario/tecsitel-v4)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-%3E%3D15.0-blue.svg)](https://postgresql.org/)
[![Netlify](https://img.shields.io/badge/deploy-netlify-blue.svg)](https://netlify.com/)

Sistema integral de gestión empresarial con facturación electrónica, control de personal, contabilidad y cumplimiento normativo para empresas peruanas.

## 🚀 Características Principales

### ✨ **Nuevo en v4.0**
- 🔐 **Sistema de roles y permisos** - Acceso diferenciado por tipo de usuario
- ⏰ **Control de asistencia digital** - Marcaje de horarios con cumplimiento SUNAFIL
- 🎨 **Interfaz completamente renovada** - Diseño moderno y responsive
- 📱 **Optimización móvil** - Experiencia nativa en dispositivos móviles
- 🔒 **Seguridad mejorada** - Autenticación JWT y encriptación avanzada

### 🏆 **Funcionalidades Core**
- 📄 **Facturación Electrónica** - Compatible con SUNAT
- 👥 **Gestión de Personal** - CRUD completo de empleados
- 💰 **Contabilidad** - Balance general y reportes financieros
- ⚖️ **Cumplimiento Normativo** - SUNAT, SUNAFIL, MINTRA
- 📊 **Dashboard Inteligente** - Estadísticas y métricas en tiempo real
- ☁️ **Respaldos Automáticos** - Exportación y backup de datos

## 🛠️ Stack Tecnológico

### **Frontend**
- HTML5, CSS3, JavaScript ES6+
- Diseño responsivo moderno
- PWA ready

### **Backend**
- Node.js + Express.js
- Netlify Functions (Serverless)
- JWT Authentication
- bcryptjs para cifrado

### **Base de Datos**
- PostgreSQL 15
- Neon (Cloud PostgreSQL)
- Migraciones automáticas
- Índices optimizados

### **Deployment**
- Netlify (Frontend + Functions)
- CDN global
- SSL automático
- Environment variables

## 🎭 Roles de Usuario

| Rol | Permisos | Descripción |
|-----|----------|-------------|
| **👑 Administrador General** | Acceso completo | Control total del sistema |
| **💰 Contabilidad** | Facturas, Contabilidad, Cumplimiento | Gestión financiera |
| **👥 Recursos Humanos** | Personal, Asistencia, Cumplimiento | Gestión de RRHH |
| **⏰ Supervisor** | Dashboard, Asistencia | Control de horarios |

## 📋 Prerrequisitos

- Node.js >= 18.0.0
- npm >= 8.0.0
- Cuenta en [Neon](https://neon.tech/) (PostgreSQL)
- Cuenta en [Netlify](https://netlify.com/)
- Git

## 🚀 Instalación Rápida

### 1️⃣ **Clonar el Repositorio**

```bash
git clone https://github.com/usuario/tecsitel-v4.git
cd tecsitel-v4
```

### 2️⃣ **Instalar Dependencias**

```bash
npm install
```

### 3️⃣ **Configurar Base de Datos en Neon**

1. Ve a [Neon.tech](https://neon.tech/) y crea una cuenta
2. Crea un nuevo proyecto llamado `tecsitel-v4`
3. Copia la URL de conexión
4. Ejecuta el script SQL de esquema:

```bash
# Copia el contenido de database_schema.sql
# Pégalo en el SQL Editor de Neon y ejecuta
```

### 4️⃣ **Configurar Variables de Entorno**

```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita .env con tus valores reales
nano .env
```

**Variables OBLIGATORIAS:**
```env
DATABASE_URL=postgres://user:pass@host/db?sslmode=require
JWT_SECRET=tu_clave_jwt_super_secreta_de_64_caracteres
NODE_ENV=production
```

### 5️⃣ **Desplegar en Netlify**

#### **Opción A: Deploy desde Git (Recomendado)**

1. Sube tu código a GitHub
2. Ve a [Netlify](https://netlify.com/)
3. Click "New site from Git"
4. Conecta tu repositorio
5. Configuración de build:
   - **Build command:** `npm run build`
   - **Publish directory:** `.`
6. Configura variables de entorno en Netlify

#### **Opción B: Deploy manual**

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login en Netlify
netlify login

# Deploy
netlify init
netlify deploy --prod
```

### 6️⃣ **Configurar Variables de Entorno en Netlify**

Ve a: **Site settings > Environment variables**

Agrega estas variables (marca como "Secret" las sensibles):

```
DATABASE_URL=postgres://...
JWT_SECRET=tu_clave_secreta
NODE_ENV=production
CORS_ORIGIN=https://tu-sitio.netlify.app
```

## 🔧 Configuración Avanzada

### **Estructura del Proyecto**

```
tecsitel-v4/
├── 📁 netlify/
│   └── 📁 functions/
│       └── 📄 api.js              # Backend API
├── 📄 index.html                  # Frontend principal
├── 📄 styles.css                  # Estilos CSS
├── 📄 script.js                   # JavaScript frontend
├── 📄 netlify.toml                # Configuración Netlify
├── 📄 package.json                # Dependencias
├── 📄 database_schema.sql         # Esquema de BD
├── 📄 .env.example                # Variables de entorno
└── 📄 README.md                   # Esta documentación
```

### **Configuración de Seguridad**

El sistema incluye múltiples capas de seguridad:

- 🔐 **Autenticación JWT** con tokens seguros
- 🛡️ **Cifrado bcryptjs** para contraseñas
- 🚫 **Rate limiting** anti-ataques
- 🔒 **CORS** configurado
- 🛠️ **Headers de seguridad** (CSP, HSTS, etc.)
- 📝 **Validación de inputs** y sanitización
- 🏷️ **RLS** (Row Level Security) en PostgreSQL

## 🎯 Uso del Sistema

### **Acceso de Demo**

Usuarios predefinidos para pruebas:

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `admin` | `admin123` | Administrador General |
| `contabilidad` | `conta123` | Contabilidad |
| `rrhh` | `rrhh123` | Recursos Humanos |
| `supervisor` | `super123` | Supervisor |

### **Funcionalidades por Rol**

#### **👑 Administrador General**
- Acceso completo a todas las funciones
- Gestión de usuarios y permisos
- Configuración del sistema
- Reportes ejecutivos

#### **💰 Contabilidad**
- Gestión de facturas
- Balance general
- Reportes financieros
- Cumplimiento tributario

#### **👥 Recursos Humanos**
- Gestión de empleados
- Control de asistencia
- Reportes de personal
- Cumplimiento laboral

#### **⏰ Supervisor**
- Marcaje de horarios
- Visualización de asistencia
- Dashboard básico

## 📊 API Endpoints

### **Autenticación**
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/verify` - Verificar token

### **Empleados**
- `GET /api/employees` - Listar empleados
- `POST /api/employees` - Crear empleado
- `PUT /api/employees/:dni` - Actualizar empleado
- `DELETE /api/employees/:dni` - Eliminar empleado

### **Registro de Tiempo**
- `GET /api/time-entries` - Listar registros
- `POST /api/time-entries` - Crear registro
- `PUT /api/time-entries/:id` - Actualizar registro

### **Facturas**
- `GET /api/invoices` - Listar facturas
- `POST /api/invoices` - Crear factura

### **Dashboard**
- `GET /api/dashboard/stats` - Estadísticas

## 🔄 Scripts Disponibles

```bash
# Desarrollo local
npm run dev

# Verificar variables de entorno
npm run env:check

# Linting y formato
npm run lint
npm run format

# Testing
npm run test
npm run test:watch

# Deploy
npm run deploy
npm run preview

# Ver logs
npm run logs
```

## 🛡️ Seguridad y Cumplimiento

### **Normativas Peruanas**
- ✅ **SUNAT** - Facturación electrónica
- ✅ **SUNAFIL** - Control de asistencia
- ✅ **MINTRA** - Derechos laborales
- ✅ **Ley de Protección de Datos**

### **Buenas Prácticas**
- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración
- Validación de inputs
- Logs de auditoría
- Backups automáticos

## 📈 Monitoreo y Métricas

### **Métricas Incluidas**
- 💰 Ingresos totales
- 📋 Facturas pendientes
- 👥 Empleados activos
- ⚖️ Nivel de cumplimiento
- ⏰ Horas trabajadas
- 📊 Estadísticas de uso

### **Logs y Debugging**
- Logs estructurados en JSON
- Error tracking integrado
- Performance monitoring
- Uptime monitoring via Netlify

## 🚨 Troubleshooting

### **Problemas Comunes**

#### ❌ **Error de conexión a base de datos**
```bash
# Verificar URL de conexión
echo $DATABASE_URL

# Verificar conectividad
psql $DATABASE_URL -c "SELECT 1;"
```

#### ❌ **Token JWT inválido**
```bash
# Verificar JWT_SECRET
echo $JWT_SECRET | wc -c  # Debe ser > 32 caracteres
```

#### ❌ **Error en deploy de Netlify**
```bash
# Verificar variables de entorno
netlify env:list

# Ver logs de función
netlify functions:log api
```

#### ❌ **Usuarios no pueden hacer login**
- Verificar que los usuarios estén en la base de datos
- Verificar que las contraseñas estén hasheadas correctamente
- Verificar configuración de CORS

### **Verificación del Sistema**

```bash
# Health check de la API
curl https://tu-sitio.netlify.app/.netlify/functions/api/health

# Verificar base de datos
npm run db:check

# Verificar variables de entorno
npm run env:check
```

## 🔄 Actualizaciones y Mantenimiento

### **Backup de Datos**
```sql
-- Backup manual desde Neon
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### **Migraciones**
```bash
# Aplicar nuevas migraciones
npm run db:migrate

# Rollback si es necesario
npm run db:rollback
```

### **Actualización de Dependencias**
```bash
# Verificar dependencias desactualizadas
npm outdated

# Actualizar (con cuidado)
npm update

# Verificar vulnerabilidades
npm audit
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

- 📧 **Email:** admin@tecsitel.com
- 🌐 **Website:** https://tecsitel.com
- 📱 **WhatsApp:** +51-1-234-5678
- 💬 **Discord:** [Servidor de la comunidad](https://discord.gg/tecsitel)

## 🎉 Agradecimientos

- Equipo de desarrollo Tecsitel
- Comunidad de desarrolladores peruanos
- Contribuidores del proyecto
- Beta testers y usuarios

---

**Desarrollado con ❤️ en Perú para empresas peruanas**

**Tecsitel Peru E.I.R.L. © 2025 - Todos los derechos reservados**

---

## 📚 Documentación Adicional

- [🔧 Guía de Configuración Avanzada](docs/advanced-setup.md)
- [🎨 Guía de Personalización](docs/customization.md)
- [🔌 Documentación de API](docs/api-reference.md)
- [🧪 Guía de Testing](docs/testing.md)
- [🚀 Guía de Deploy](docs/deployment.md)
- [🔐 Guía de Seguridad](docs/security.md)

## 🗺️ Roadmap

### **v4.1 (Q1 2025)**
- [ ] Integración directa con SUNAT
- [ ] Notificaciones push
- [ ] Reportes PDF automáticos
- [ ] Dashboard de métricas avanzadas

### **v4.2 (Q2 2025)**
- [ ] App móvil nativa
- [ ] Integración con bancos
- [ ] Workflow de aprobaciones
- [ ] Chat interno

### **v5.0 (Q3 2025)**
- [ ] IA para predicciones
- [ ] Módulo de inventario
- [ ] E-commerce integrado
- [ ] Facturación internacional

---

*¿Necesitas ayuda? ¡No dudes en contactarnos!* 🚀