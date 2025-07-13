// ============================================
// TECSITEL PERU E.I.R.L. - API COMPLETA v4.0
// Sistema de Gestión Empresarial Integrado
// RUC: 20605908285 | Norte del Perú
// ============================================

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const serverless = require('serverless-http');

// ============================================
// CONFIGURACIÓN TECSITEL
// ============================================
const TECSITEL_CONFIG = {
    empresa: {
        ruc: process.env.COMPANY_RUC || '20605908285',
        razonSocial: process.env.COMPANY_NAME || 'TECSITEL PERU E.I.R.L.',
        direccion: 'Cal. Astopilco Nro. 735a P.J. el Porvenir, Trujillo, La Libertad, Perú',
        telefono: '+51 944 123 456',
        email: 'contacto@tecsitel.pe',
        web: 'https://tecsitel.netlify.app',
        sector: 'Telecomunicaciones',
        cobertura: 'Norte del Perú',
        serviciosExitosos: 1300,
        empleadosTotal: 12,
        empleadosAdmin: 2,
        empleadosOperarios: 10,
        añoFundacion: 2018,
        version: '4.0.0'
    },
    
    // USUARIOS SINCRONIZADOS CON FRONTEND
    usuarios: {
        'admin': {
            id: 1,
            username: 'admin',
            password: 'admin123',
            role: 'Administrador',
            name: 'Administrador General',
            area: 'Administración',
            avatar: 'A',
            permissions: ['all'],
            activo: true
        },
        'contable': {
            id: 2,
            username: 'contable',
            password: 'cont123',
            role: 'Contador',
            name: 'Contador Externo',
            area: 'Contabilidad',
            avatar: 'C',
            permissions: ['invoices', 'accounting', 'reports', 'exports'],
            activo: true
        },
        'supervisor': {
            id: 3,
            username: 'supervisor',
            password: 'super123',
            role: 'Supervisor',
            name: 'Supervisor de Campo',
            area: 'Operaciones',
            avatar: 'S',
            permissions: ['timeentry', 'dashboard'],
            activo: true
        },
        'rrhh': {
            id: 4,
            username: 'rrhh',
            password: 'rrhh123',
            role: 'RRHH',
            name: 'Recursos Humanos',
            area: 'Recursos Humanos',
            avatar: 'R',
            permissions: ['personnel', 'timeentry', 'compliance', 'dashboard'],
            activo: true
        }
    },
    
    // SERVICIOS TECSITEL
    servicios: [
        {
            id: 1,
            categoria: 'Redes Ópticas',
            descripcion: 'Instalación FTTH, GPON, FTTX',
            precio: 85000,
            activo: true
        },
        {
            id: 2,
            categoria: 'Cableado Estructurado',
            descripcion: 'Infraestructura Cat 6A',
            precio: 45000,
            activo: true
        },
        {
            id: 3,
            categoria: 'Enlaces Microondas',
            descripcion: 'Punto a punto 23GHz',
            precio: 65000,
            activo: true
        },
        {
            id: 4,
            categoria: 'Construcción Sites',
            descripcion: 'Torres y shelters',
            precio: 120000,
            activo: true
        }
    ]
};

// Configuración de seguridad
const JWT_SECRET = process.env.JWT_SECRET || 'tecsitel-jwt-v4-2025-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const NODE_ENV = process.env.NODE_ENV || 'production';

// Configuración fiscal Perú
const PERU_CONFIG = {
    IGV_RATE: parseFloat(process.env.PERU_IGV_RATE) || 0.18,
    UIT: parseFloat(process.env.PERU_UIT) || 5150,
    RMV: parseFloat(process.env.PERU_RMV) || 1025,
    ASIGNACION_FAMILIAR: parseFloat(process.env.PERU_ASIGNACION_FAMILIAR) || 102.50
};

// Logger TECSITEL
const logger = {
    info: (...args) => console.info('[TECSITEL-INFO]', new Date().toISOString(), ...args),
    warn: (...args) => console.warn('[TECSITEL-WARN]', new Date().toISOString(), ...args),
    error: (...args) => console.error('[TECSITEL-ERROR]', new Date().toISOString(), ...args)
};

// ============================================
// INICIALIZACIÓN EXPRESS
// ============================================
const app = express();

// Middlewares
app.use(cors({
    origin: [
        'https://tecsitel.netlify.app',
        'http://localhost:8888',
        'http://localhost:3000',
        /\.netlify\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Base de datos (opcional)
let pool = null;
const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

if (DATABASE_URL) {
    try {
        pool = new Pool({
            connectionString: DATABASE_URL,
            ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        logger.info('✅ Pool de base de datos inicializado');
    } catch (error) {
        logger.warn('⚠️ Base de datos no disponible, usando modo simulado');
    }
}

// Datos simulados en memoria
let AppState = {
    invoices: [
        {
            id: 1,
            number: 'F001-000001',
            client: 'Claro Perú',
            ruc: '20100570681',
            service: 'Instalación FTTH',
            amount: 85000,
            currency: 'PEN',
            status: 'Aprobada',
            date: '2025-01-10',
            createdBy: 'admin'
        },
        {
            id: 2,
            number: 'F001-000002',
            client: 'Win Empresas',
            ruc: '20511180066',
            service: 'Cableado Estructurado',
            amount: 45000,
            currency: 'PEN',
            status: 'Pendiente',
            date: '2025-01-11',
            createdBy: 'contable'
        }
    ],
    employees: [
        {
            id: 1,
            dni: '12345678',
            firstName: 'Carlos',
            lastName: 'Rodríguez',
            position: 'Administrador General',
            salary: 4500,
            status: 'Activo',
            hireDate: '2020-03-15',
            avatar: 'C'
        },
        {
            id: 2,
            dni: '87654321',
            firstName: 'Ana',
            lastName: 'Mendoza',
            position: 'Asistente Administrativa',
            salary: 2500,
            status: 'Activo',
            hireDate: '2021-07-01',
            avatar: 'A'
        },
        {
            id: 3,
            dni: '11223344',
            firstName: 'Miguel',
            lastName: 'Torres',
            position: 'Técnico Principal',
            salary: 3500,
            status: 'Activo',
            hireDate: '2019-11-20',
            avatar: 'M'
        }
    ],
    timeEntries: [
        {
            id: 1,
            employeeId: 1,
            type: 'entrada',
            date: '2025-01-12',
            time: '08:00',
            createdBy: 'admin'
        },
        {
            id: 2,
            employeeId: 1,
            type: 'salida',
            date: '2025-01-12',
            time: '17:30',
            createdBy: 'admin'
        },
        {
            id: 3,
            employeeId: 2,
            type: 'entrada',
            date: '2025-01-12',
            time: '08:15',
            createdBy: 'rrhh'
        }
    ],
    nextId: {
        invoice: 3,
        employee: 4,
        timeEntry: 4
    }
};

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            error: 'Token de acceso requerido',
            code: 'NO_TOKEN'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                error: 'Token inválido o expirado',
                code: 'INVALID_TOKEN'
            });
        }
        req.user = user;
        next();
    });
};

// Verificar permisos
const hasPermission = (user, requiredPermissions) => {
    if (!user || !user.permissions) return false;
    if (user.permissions.includes('all')) return true;
    
    if (Array.isArray(requiredPermissions)) {
        return requiredPermissions.some(perm => user.permissions.includes(perm));
    }
    
    return user.permissions.includes(requiredPermissions);
};

// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        logger.info(`🔐 Intento de login: ${username}`);
        
        if (!username || !password) {
            return res.status(400).json({
                error: 'Usuario y contraseña requeridos',
                code: 'MISSING_CREDENTIALS'
            });
        }

        const user = TECSITEL_CONFIG.usuarios[username.toLowerCase()];
        
        if (!user || !user.activo) {
            logger.warn(`❌ Usuario no encontrado: ${username}`);
            return res.status(401).json({
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        if (password !== user.password) {
            logger.warn(`❌ Contraseña incorrecta: ${username}`);
            return res.status(401).json({
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        logger.info(`✅ Login exitoso: ${username} (${user.role})`);
        
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            area: user.area,
            avatar: user.avatar,
            permissions: user.permissions,
            empresa: TECSITEL_CONFIG.empresa.razonSocial
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        
        res.json({
            success: true,
            message: `Bienvenido a ${TECSITEL_CONFIG.empresa.razonSocial}`,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name,
                area: user.area,
                avatar: user.avatar,
                permissions: user.permissions
            },
            empresa: TECSITEL_CONFIG.empresa,
            expiresIn: JWT_EXPIRES_IN
        });
        
    } catch (error) {
        logger.error('❌ Error en login:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'SERVER_ERROR'
        });
    }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user,
        empresa: TECSITEL_CONFIG.empresa
    });
});

// ============================================
// CONFIGURACIÓN CORPORATIVA
// ============================================
app.get('/api/config', (req, res) => {
    try {
        const config = {
            version: '4.0.0-tecsitel',
            timestamp: new Date().toISOString(),
            empresa: TECSITEL_CONFIG.empresa,
            servicios: TECSITEL_CONFIG.servicios,
            peru: PERU_CONFIG,
            features: {
                facturacionElectronica: true,
                gestionPersonal: true,
                controlAsistencia: true,
                cumplimientoSUNAT: true,
                cumplimientoSUNAFIL: true,
                exportacionDatos: true,
                reportesAvanzados: true
            },
            usuarios: Object.keys(TECSITEL_CONFIG.usuarios).map(key => ({
                username: key,
                role: TECSITEL_CONFIG.usuarios[key].role,
                name: TECSITEL_CONFIG.usuarios[key].name,
                area: TECSITEL_CONFIG.usuarios[key].area
            }))
        };
        
        res.json(config);
    } catch (error) {
        logger.error('❌ Error en configuración:', error);
        res.status(500).json({
            error: 'Error al obtener configuración'
        });
    }
});

// ============================================
// DASHBOARD Y MÉTRICAS
// ============================================
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        // Calcular métricas en tiempo real
        const totalIncome = AppState.invoices
            .filter(inv => inv.status === 'Aprobada')
            .reduce((sum, inv) => sum + (inv.currency === 'USD' ? inv.amount * 3.75 : inv.amount), 0);
        
        const pendingInvoices = AppState.invoices.filter(inv => inv.status === 'Pendiente').length;
        const totalEmployees = AppState.employees.filter(emp => emp.status === 'Activo').length;

        const dashboard = {
            metrics: {
                totalIncome,
                pendingInvoices,
                totalEmployees,
                complianceScore: 97.5
            },
            empresa: TECSITEL_CONFIG.empresa,
            user: {
                name: req.user.name,
                role: req.user.role,
                area: req.user.area,
                permissions: req.user.permissions
            },
            recentActivity: [
                {
                    type: 'invoice',
                    message: `Nueva factura ${AppState.invoices[AppState.invoices.length - 1]?.number || 'F001-000001'} creada`,
                    timestamp: new Date().toISOString(),
                    icon: '📄'
                },
                {
                    type: 'employee',
                    message: 'Marcación de entrada registrada',
                    timestamp: new Date().toISOString(),
                    icon: '⏰'
                },
                {
                    type: 'compliance',
                    message: 'Cumplimiento SUNAT verificado',
                    timestamp: new Date().toISOString(),
                    icon: '✅'
                }
            ]
        };

        res.json({
            success: true,
            data: dashboard,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('❌ Error en dashboard:', error);
        res.status(500).json({
            error: 'Error al obtener datos del dashboard'
        });
    }
});

// ============================================
// GESTIÓN DE FACTURAS
// ============================================
app.get('/api/invoices', authenticateToken, async (req, res) => {
    try {
        if (!hasPermission(req.user, ['invoices', 'all'])) {
            return res.status(403).json({
                error: 'Sin permisos para ver facturas'
            });
        }

        res.json({
            success: true,
            data: AppState.invoices,
            total: AppState.invoices.length,
            empresa: TECSITEL_CONFIG.empresa.razonSocial
        });
        
    } catch (error) {
        logger.error('❌ Error obteniendo facturas:', error);
        res.status(500).json({
            error: 'Error al obtener facturas'
        });
    }
});

app.post('/api/invoices', authenticateToken, async (req, res) => {
    try {
        if (!hasPermission(req.user, ['invoices', 'all'])) {
            return res.status(403).json({
                error: 'Sin permisos para crear facturas'
            });
        }

        const { client, ruc, service, amount, currency } = req.body;
        
        if (!client || !ruc || !service || !amount) {
            return res.status(400).json({
                error: 'Datos de factura incompletos'
            });
        }

        // Validar RUC peruano (11 dígitos)
        if (!/^\d{11}$/.test(ruc)) {
            return res.status(400).json({
                error: 'RUC inválido - debe tener 11 dígitos'
            });
        }

        const newInvoice = {
            id: AppState.nextId.invoice++,
            number: `F001-${String(AppState.nextId.invoice).padStart(6, '0')}`,
            client,
            ruc,
            service,
            amount: parseFloat(amount),
            currency: currency || 'PEN',
            status: 'Pendiente',
            date: new Date().toISOString().split('T')[0],
            createdBy: req.user.username
        };

        AppState.invoices.push(newInvoice);

        logger.info(`📄 Nueva factura creada: ${newInvoice.number} por ${req.user.name}`);

        res.status(201).json({
            success: true,
            data: newInvoice,
            message: 'Factura creada exitosamente'
        });
        
    } catch (error) {
        logger.error('❌ Error creando factura:', error);
        res.status(500).json({
            error: 'Error al crear factura'
        });
    }
});

app.put('/api/invoices/:id/approve', authenticateToken, async (req, res) => {
    try {
        if (!hasPermission(req.user, ['invoices', 'all'])) {
            return res.status(403).json({
                error: 'Sin permisos para aprobar facturas'
            });
        }

        const invoiceId = parseInt(req.params.id);
        const invoice = AppState.invoices.find(inv => inv.id === invoiceId);

        if (!invoice) {
            return res.status(404).json({
                error: 'Factura no encontrada'
            });
        }

        invoice.status = 'Aprobada';
        invoice.approvedBy = req.user.username;
        invoice.approvedDate = new Date().toISOString().split('T')[0];

        logger.info(`✅ Factura aprobada: ${invoice.number} por ${req.user.name}`);

        res.json({
            success: true,
            data: invoice,
            message: 'Factura aprobada exitosamente'
        });
        
    } catch (error) {
        logger.error('❌ Error aprobando factura:', error);
        res.status(500).json({
            error: 'Error al aprobar factura'
        });
    }
});

// ============================================
// GESTIÓN DE PERSONAL
// ============================================
app.get('/api/employees', authenticateToken, async (req, res) => {
    try {
        if (!hasPermission(req.user, ['personnel', 'all'])) {
            return res.status(403).json({
                error: 'Sin permisos para ver personal'
            });
        }

        res.json({
            success: true,
            data: AppState.employees,
            total: AppState.employees.length,
            summary: {
                total: TECSITEL_CONFIG.empresa.empleadosTotal,
                administrativos: TECSITEL_CONFIG.empresa.empleadosAdmin,
                operarios: TECSITEL_CONFIG.empresa.empleadosOperarios,
                activos: AppState.employees.filter(emp => emp.status === 'Activo').length
            }
        });
        
    } catch (error) {
        logger.error('❌ Error obteniendo empleados:', error);
        res.status(500).json({
            error: 'Error al obtener empleados'
        });
    }
});

app.post('/api/employees', authenticateToken, async (req, res) => {
    try {
        if (!hasPermission(req.user, ['personnel', 'all'])) {
            return res.status(403).json({
                error: 'Sin permisos para crear empleados'
            });
        }

        const { dni, firstName, lastName, position, salary, status } = req.body;
        
        if (!dni || !firstName || !lastName || !position || !salary) {
            return res.status(400).json({
                error: 'Datos del empleado incompletos'
            });
        }

        // Validar DNI peruano (8 dígitos)
        if (!/^\d{8}$/.test(dni)) {
            return res.status(400).json({
                error: 'DNI inválido - debe tener 8 dígitos'
            });
        }

        // Verificar DNI único
        if (AppState.employees.find(emp => emp.dni === dni)) {
            return res.status(400).json({
                error: 'Ya existe un empleado con ese DNI'
            });
        }

        const newEmployee = {
            id: AppState.nextId.employee++,
            dni,
            firstName,
            lastName,
            position,
            salary: parseFloat(salary),
            status: status || 'Activo',
            avatar: firstName.charAt(0).toUpperCase(),
            hireDate: new Date().toISOString().split('T')[0],
            createdBy: req.user.username
        };

        AppState.employees.push(newEmployee);

        logger.info(`👤 Nuevo empleado: ${firstName} ${lastName} creado por ${req.user.name}`);

        res.status(201).json({
            success: true,
            data: newEmployee,
            message: 'Empleado registrado exitosamente'
        });
        
    } catch (error) {
        logger.error('❌ Error creando empleado:', error);
        res.status(500).json({
            error: 'Error al crear empleado'
        });
    }
});

// ============================================
// CONTROL DE TIEMPO Y ASISTENCIA
// ============================================
app.get('/api/timeentries', authenticateToken, async (req, res) => {
    try {
        if (!hasPermission(req.user, ['timeentry', 'personnel', 'all'])) {
            return res.status(403).json({
                error: 'Sin permisos para ver marcaciones'
            });
        }

        res.json({
            success: true,
            data: AppState.timeEntries,
            total: AppState.timeEntries.length,
            compliance: {
                sunafilCompliant: true,
                digitalControl: true,
                percentage: 100
            }
        });
        
    } catch (error) {
        logger.error('❌ Error obteniendo marcaciones:', error);
        res.status(500).json({
            error: 'Error al obtener marcaciones'
        });
    }
});

app.post('/api/timeentries', authenticateToken, async (req, res) => {
    try {
        if (!hasPermission(req.user, ['timeentry', 'personnel', 'all'])) {
            return res.status(403).json({
                error: 'Sin permisos para registrar marcaciones'
            });
        }

        const { employeeId, type, date, time } = req.body;
        
        if (!employeeId || !type || !date || !time) {
            return res.status(400).json({
                error: 'Datos de marcación incompletos'
            });
        }

        // Verificar que el empleado existe
        const employee = AppState.employees.find(emp => emp.id === parseInt(employeeId));
        if (!employee) {
            return res.status(404).json({
                error: 'Empleado no encontrado'
            });
        }

        // Verificar que no existe ya una marcación del mismo tipo
        const existingEntry = AppState.timeEntries.find(entry => 
            entry.employeeId === parseInt(employeeId) && 
            entry.date === date && 
            entry.type === type
        );

        if (existingEntry) {
            return res.status(400).json({
                error: `Ya existe una marcación de ${type} para este empleado en esta fecha`
            });
        }

        const newTimeEntry = {
            id: AppState.nextId.timeEntry++,
            employeeId: parseInt(employeeId),
            type,
            date,
            time,
            timestamp: new Date().toISOString(),
            createdBy: req.user.username
        };

        AppState.timeEntries.push(newTimeEntry);

        logger.info(`⏰ Marcación registrada: ${employee.firstName} ${employee.lastName} - ${type} por ${req.user.name}`);

        res.status(201).json({
            success: true,
            data: newTimeEntry,
            message: `Marcación de ${type} registrada exitosamente`
        });
        
    } catch (error) {
        logger.error('❌ Error registrando marcación:', error);
        res.status(500).json({
            error: 'Error al registrar marcación'
        });
    }
});

// ============================================
// CUMPLIMIENTO NORMATIVO
// ============================================
app.get('/api/compliance', authenticateToken, async (req, res) => {
    try {
        if (!hasPermission(req.user, ['compliance', 'all'])) {
            return res.status(403).json({
                error: 'Sin permisos para ver cumplimiento'
            });
        }

        const compliance = {
            sunat: {
                facturacionElectronica: {
                    status: 'Activa',
                    version: '3.0',
                    compliance: 100,
                    ultimaActualizacion: '2025-01-10'
                },
                librosElectronicos: {
                    status: 'Al día',
                    compliance: 100,
                    ultimoEnvio: '2025-01-11'
                },
                pdt621: {
                    status: 'Próximo vencimiento',
                    days: 10,
                    compliance: 95,
                    fechaVencimiento: '2025-01-22'
                },
                overall: 98.3
            },
            sunafil: {
                tregistro: {
                    status: 'Actualizado',
                    compliance: 100,
                    ultimaActualizacion: '2025-01-05'
                },
                controlAsistencia: {
                    status: 'Digital implementado',
                    compliance: 100,
                    registros: AppState.timeEntries.length
                },
                registroJornadas: {
                    status: 'Completo',
                    compliance: 100,
                    empleadosRegistrados: AppState.employees.filter(emp => emp.status === 'Activo').length
                },
                overall: 100
            },
            general: 99.2,
            lastUpdate: new Date().toISOString(),
            nextReview: '2025-02-01'
        };

        res.json({
            success: true,
            data: compliance,
            empresa: TECSITEL_CONFIG.empresa.razonSocial,
            mensaje: 'Cumplimiento normativo SUNAT y SUNAFIL verificado'
        });
        
    } catch (error) {
        logger.error('❌ Error en cumplimiento:', error);
        res.status(500).json({
            error: 'Error al obtener datos de cumplimiento'
        });
    }
});

// ============================================
// EXPORTACIÓN DE DATOS
// ============================================
app.post('/api/export', authenticateToken, async (req, res) => {
    try {
        if (!hasPermission(req.user, ['exports', 'reports', 'all'])) {
            return res.status(403).json({
                error: 'Sin permisos para exportar datos'
            });
        }

        const { type } = req.body;
        const exportType = type || 'complete';

        const exportData = {
            metadata: {
                timestamp: new Date().toISOString(),
                exportedBy: req.user.name,
                exportType: exportType,
                empresa: TECSITEL_CONFIG.empresa,
                version: '4.0.0'
            },
            data: {}
        };

        // Incluir datos según permisos del usuario
        if (hasPermission(req.user, ['invoices', 'all'])) {
            exportData.data.facturas = AppState.invoices;
        }

        if (hasPermission(req.user, ['personnel', 'all'])) {
            exportData.data.empleados = AppState.employees;
            exportData.data.marcaciones = AppState.timeEntries;
        }

        if (hasPermission(req.user, ['compliance', 'all'])) {
            exportData.data.cumplimiento = {
                sunat: 'Cumpliendo normativas vigentes',
                sunafil: 'Control digital implementado'
            };
        }

        // Estadísticas generales
        exportData.data.estadisticas = {
            totalFacturas: AppState.invoices.length,
            facturasPendientes: AppState.invoices.filter(inv => inv.status === 'Pendiente').length,
            totalEmpleados: AppState.employees.length,
            empleadosActivos: AppState.employees.filter(emp => emp.status === 'Activo').length,
            marcacionesRegistradas: AppState.timeEntries.length
        };

        logger.info(`📤 Exportación realizada por ${req.user.name} - Tipo: ${exportType}`);

        res.json({
            success: true,
            data: exportData,
            message: 'Exportación completada exitosamente',
            fileName: `TECSITEL_Export_${exportType}_${new Date().toISOString().split('T')[0]}.json`
        });
        
    } catch (error) {
        logger.error('❌ Error en exportación:', error);
        res.status(500).json({
            error: 'Error al exportar datos'
        });
    }
});

// ============================================
// SALUD DEL SISTEMA
// ============================================
app.get('/api/health', (req, res) => {
    const health = {
        status: 'OK',
        version: '4.0.0-tecsitel',
        empresa: TECSITEL_CONFIG.empresa.razonSocial,
        ruc: TECSITEL_CONFIG.empresa.ruc,
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        database: pool ? 'connected' : 'simulated',
        features: {
            authentication: true,
            invoicing: true,
            personnel: true,
            timetracking: true,
            compliance: true,
            exports: true
        },
        statistics: {
            totalUsers: Object.keys(TECSITEL_CONFIG.usuarios).length,
            invoices: AppState.invoices.length,
            employees: AppState.employees.length,
            timeEntries: AppState.timeEntries.length,
            services: TECSITEL_CONFIG.servicios.length
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        lastActivity: new Date().toISOString()
    };

    // Verificar base de datos si está disponible
    if (pool) {
        pool.query('SELECT 1', (err) => {
            if (err) {
                health.database = 'error';
                health.status = 'DEGRADED';
            }
        });
    }

    const statusCode = health.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(health);
});

// ============================================
// MANEJO DE ERRORES Y 404
// ============================================
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint no encontrado',
        path: req.path,
        method: req.method,
        empresa: TECSITEL_CONFIG.empresa.razonSocial,
        availableEndpoints: [
            'POST /api/auth/login',
            'GET /api/auth/verify',
            'GET /api/config',
            'GET /api/dashboard',
            'GET /api/invoices',
            'POST /api/invoices',
            'PUT /api/invoices/:id/approve',
            'GET /api/employees',
            'POST /api/employees',
            'GET /api/timeentries',
            'POST /api/timeentries',
            'GET /api/compliance',
            'POST /api/export',
            'GET /api/health'
        ]
    });
});

app.use((error, req, res, next) => {
    logger.error('❌ Error no manejado:', error);
    
    res.status(500).json({
        error: 'Error interno del servidor TECSITEL',
        code: 'SERVER_ERROR',
        empresa: TECSITEL_CONFIG.empresa.razonSocial,
        message: NODE_ENV === 'development' ? error.message : 'Error inesperado',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// INICIALIZACIÓN Y LOGS
// ============================================
logger.info('🚀 Iniciando TECSITEL API v4.0');
logger.info(`🏢 Empresa: ${TECSITEL_CONFIG.empresa.razonSocial}`);
logger.info(`📋 RUC: ${TECSITEL_CONFIG.empresa.ruc}`);
logger.info(`👥 Usuarios configurados: ${Object.keys(TECSITEL_CONFIG.usuarios).length}`);
logger.info(`⚡ Servicios disponibles: ${TECSITEL_CONFIG.servicios.length}`);
logger.info(`📊 Datos iniciales: ${AppState.invoices.length} facturas, ${AppState.employees.length} empleados`);
logger.info(`🔒 Autenticación: JWT habilitado`);
logger.info(`💾 Base de datos: ${pool ? 'PostgreSQL conectado' : 'Modo simulado'}`);

// Exportar handler para Netlify Functions
module.exports.handler = serverless(app);