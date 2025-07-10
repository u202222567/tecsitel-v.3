# 🏢 Tecsitel v.3 - Sistema de Gestión Empresarial Integral

[![Version](https://img.shields.io/badge/version-3.0.1-blue.svg)](https://github.com/tu-usuario/tecsitel-v3)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![SUNAT](https://img.shields.io/badge/SUNAT-Compliant-success.svg)](https://www.sunat.gob.pe)
[![PCGE](https://img.shields.io/badge/PCGE-2024-orange.svg)](https://www.gob.pe/institucion/sunat/normas-legales/1002072-340-2019-ef-15)

**Sistema de gestión empresarial completo para empresas peruanas** que cumple con todas las normativas vigentes de SUNAT, SUNAFIL y MINTRA. Incluye facturación electrónica, contabilidad con Plan Contable General Empresarial (PCGE), gestión de recursos humanos y exportación de libros electrónicos.

## 🚀 Características Principales

### 📊 **Dashboard Integral**
- Métricas financieras en tiempo real
- Indicadores de cumplimiento normativo
- Actividad reciente de la empresa
- Alertas y notificaciones importantes

### 💰 **Contabilidad Avanzada**
- **Plan Contable General Empresarial (PCGE)** completo
- Asientos contables con validación automática
- Balance de comprobación
- Estado de resultados
- **Exportación PLE** para SUNAT
- Reportes financieros personalizables

### 📄 **Facturación Electrónica**
- Facturación según normativa SUNAT 3.0
- Generación automática de XML
- Validación de RUC en tiempo real
- Soporte para exportaciones (exentas de IGV)
- Múltiples monedas (PEN, USD, EUR)

### 👥 **Gestión de Recursos Humanos**
- Registro completo de empleados
- **Cálculo automático de planilla** según normativa
- Generación de boletas de pago
- Control de asistencia digital
- **Exportación PLAME** para SUNAT
- **T-Registro** para SUNAFIL
- Cálculo de CTS, vacaciones y beneficios

### ⚖️ **Cumplimiento Normativo**
- **SUNAT**: Libros electrónicos PLE
- **SUNAFIL**: Control de asistencia y T-Registro
- **MINTRA**: PLAME y contratos
- Validaciones automáticas
- Alertas de vencimientos

### 🔐 **Administración y Seguridad**
- Sistema de roles y permisos
- Auditoría completa de transacciones
- Respaldos automáticos programables
- Configuración de empresa
- Gestión de usuarios

### 📤 **Exportación Avanzada**
- **CSV** con múltiples secciones
- **JSON** estructurado
- **TXT** formato SUNAT (PLE)
- **PLAME** mensual
- Respaldos completos automáticos

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Node.js, Express, Netlify Functions
- **Base de datos**: PostgreSQL
- **Autenticación**: JWT + bcrypt
- **Arquitectura**: Serverless (Netlify)
- **Estándares**: PCGE 2024, Normativas SUNAT 2024

## 📋 Requisitos del Sistema

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conexión a internet para validaciones SUNAT

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/tecsitel-v3.git
cd tecsitel-v3
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Crear archivo `.env` en la raíz del proyecto:
```env
# Base de datos
DATABASE_URL=postgresql://usuario:password@localhost:5432/tecsitel

# JWT
JWT_SECRET=tu_clave_secreta_super_segura

# SUNAT (opcional para validaciones)
SUNAT_USER=tu_usuario_sunat
SUNAT_PASSWORD=tu_password_sunat
```

### 4. Inicializar Base de Datos
```bash
# Si usas PostgreSQL local
createdb tecsitel
```

### 5. Ejecutar en Desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:8888`

## 🔐 Credenciales de Acceso

### Por Defecto:
- **Usuario**: `admin`
- **Contraseña**: `admin123`

### Demo:
- **Usuario**: `demo`
- **Contraseña**: `demo`

## 📁 Estructura del Proyecto

```
tecsitel-v3/
├── index.html                 # Aplicación principal
├── modules/
│   └── advanced-modules.js    # Módulos avanzados (contabilidad, RRHH)
├── netlify/
│   └── functions/
│       └── api.js            # API backend
├── package.json              # Configuración del proyecto
├── README.md                 # Este archivo
└── .env.example             # Variables de entorno ejemplo
```

## 🎯 Uso del Sistema

### 1. **Configuración Inicial**
1. Acceder con credenciales de administrador
2. Ir a **Administración** → **Configuración Empresa**
3. Completar datos de la empresa (RUC, razón social, etc.)
4. Configurar parámetros fiscales

### 2. **Gestión de Empleados**
1. **Personal** → **Nuevo Empleado**
2. Completar datos personales y laborales
3. Configurar sistema de pensiones (AFP/ONP)
4. Asignar cargo y sueldo básico

### 3. **Facturación**
1. **Facturas** → **Nueva Factura**
2. Ingresar datos del cliente (RUC se valida automáticamente)
3. Especificar monto y moneda
4. Marcar si es exportación (exenta de IGV)

### 4. **Contabilidad**
1. **Contabilidad Pro** → **Nuevo Asiento**
2. Seleccionar cuentas del PCGE
3. Ingresar movimientos (Debe = Haber)
4. Generar reportes y exportar PLE

### 5. **Planilla**
1. **Planilla** → **Calcular Planilla**
2. Revisar cálculos automáticos
3. Generar boletas de pago
4. Exportar PLAME para SUNAT

## 📊 Reportes y Exportaciones

### Contables:
- **Balance de Comprobación**: CSV detallado
- **Estado de Resultados**: TXT formateado
- **Libros PLE**: TXT formato SUNAT

### Laborales:
- **PLAME**: Archivos TXT para SUNAT
- **T-Registro**: Excel para SUNAFIL
- **Boletas**: TXT individuales por empleado

### Respaldos:
- **CSV Completo**: Todas las secciones
- **JSON Estructurado**: Datos completos
- **Respaldo Avanzado**: JSON con auditoría

## ⚖️ Cumplimiento Normativo

### SUNAT (Superintendencia Nacional de Aduanas y de Administración Tributaria)
- ✅ Facturación Electrónica 3.0
- ✅ Plan Contable General Empresarial (PCGE)
- ✅ Programa de Libros Electrónicos (PLE)
- ✅ PLAME (Planilla Mensual de Pagos)
- ✅ Validación de RUC

### SUNAFIL (Superintendencia Nacional de Fiscalización Laboral)
- ✅ T-Registro actualizado
- ✅ Control de asistencia digital
- ✅ Registro de empleados

### MINTRA (Ministerio de Trabajo y Promoción del Empleo)
- ✅ PLAME presentado
- ✅ Contratos registrados
- ✅ Beneficios sociales calculados

## 🔧 Configuración Avanzada

### Roles de Usuario:
- **Administrador**: Acceso completo
- **Contador**: Contabilidad y facturas
- **RRHH**: Gestión de personal y planilla
- **Usuario**: Solo lectura y facturas básicas

### Parámetros 2024:
- **UIT**: S/ 5,150
- **RMV**: S/ 1,025
- **Asignación Familiar**: S/ 102.50
- **EsSalud**: 9%
- **ONP**: 13%

## 🚀 Despliegue en Producción

### Netlify (Recomendado):
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Desplegar
netlify deploy --prod
```

### Vercel:
```bash
# Instalar Vercel CLI
npm install -g vercel

# Desplegar
vercel --prod
```

### Servidor Propio:
1. Configurar servidor web (nginx/apache)
2. Configurar base de datos PostgreSQL
3. Configurar variables de entorno
4. Subir archivos al servidor

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📞 Soporte

- **Email**: soporte@tecsitel.com
- **Website**: https://tecsitel.com
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/tecsitel-v3/issues)

## 🏆 Características Destacadas

### ✨ Innovaciones v.3:
- **Contabilidad completa con PCGE 2024**
- **Cálculo automático de planilla**
- **Exportación PLE automática**
- **Auditoría completa de transacciones**
- **Sistema de roles avanzado**
- **Respaldos automáticos**

### 🎯 Próximas Versiones:
- Integración directa con SUNAT
- Firma digital para documentos
- App móvil para control de asistencia
- Reportes con gráficos interactivos
- Integración con bancos

## 📈 Roadmap

### v3.1 (Q2 2024):
- [ ] Integración API SUNAT
- [ ] Firma digital
- [ ] Reportes gráficos

### v3.2 (Q3 2024):
- [ ] App móvil
- [ ] Integración bancaria
- [ ] Módulo de inventarios

### v4.0 (Q4 2024):
- [ ] Inteligencia artificial
- [ ] Análisis predictivo
- [ ] Dashboard ejecutivo

---

**Desarrollado con ❤️ para empresas peruanas**

*Tecsitel v.3 - Gestión empresarial moderna que cumple con todas las normativas*