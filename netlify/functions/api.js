// ============================================
// TECSITEL PERU E.I.R.L. - API v4.0 SINCRONIZADA
// Sistema de Gestión Empresarial Completo
// ============================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const serverless = require('serverless-http');

// ============================================
// CONFIGURACIÓN SINCRONIZADA CON FRONTEND
// ============================================
const TECSITEL_CONFIG = {
    empresa: {
        ruc: process.env.COMPANY_RUC || '20605908285',
        razonSocial: process.env.COMPANY_NAME || 'TECSITEL PERU E.I.R.L.',
        direccion: process.env.COMPANY_ADDRESS || 'Cal. Astopilco Nro. 735a P.J. el Porvenir, Trujillo, La Libertad, Perú',
        telefono: '+51 944 123 456',
        email: 'contacto@tecsitel.pe',
        web: 'https://tecsitel.netlify.app',
        sector: 'Telecomunicaciones',
        cobertura: 'Norte del Perú',
        serviciosExitosos: 1300,
        empleadosTotal: 12,
        empleadosAdmin: 2,
        empleadosOperarios: 10,
        añoFundacion: 2018
    },
    
    // USUARIOS SINCRONIZADOS CON EL FRONTEND
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
    
    // MÓDULOS SINCRONIZADOS
    modulos: {
        'dashboard': { name: 'Dashboard', icon: '📊' },
        'invoices': { name: 'Facturas', icon: '📄' },
        'accounting': { name: 'Contabilidad', icon: '💰' },
        'personnel': { name: 'Personal', icon: '👥' },
        'timeentry': { name: 'Marcaje', icon: '⏰' },
        'compliance': { name: 'Cumplimiento', icon: '⚖️' },
        'reports': { name: 'Reportes', icon: '📊' },
        'exports': { name: 'Exportaciones', icon: '📤' }
    }
};

// Configuración de seguridad
const JWT_SECRET = process.env.JWT_SECRET || 'tecsitel-jwt-v4-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const NODE_ENV = process.env.NODE_ENV || 'production';
const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

// Configuración fiscal Perú
const PERU_CONFIG = {
    IGV_RATE: parseFloat(process.env.PERU_IGV_RATE) || 0.18,
    UIT: parseFloat(process.env.PERU_UIT) || 5150,
    RMV: parseFloat(process.env.PERU_RMV) || 1025,
    ASIGNACION_FAMILIAR: parseFloat(process.env.PERU_ASIGNACION_FAMILIAR) || 102.50
};

// Logger
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

// Conexión a base de datos (opcional)
let pool = null;
if (DATABASE_URL) {
    try {
        pool = new Pool({
            connectionString: DATABASE_URL,
            ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        logger.info('✅ Pool de base de datos PostgreSQL inicializado');
    } catch (error) {
        logger.warn('⚠️ Error inicializando base de datos, usando modo simulado:', error.message);
    }
}

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            error: 'Token de acceso requerido',
            code: 'NO_TOKEN',
            empresa: TECSITEL_CONFIG.empresa.razonSocial
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                error: 'Token inválido o expirado',
                code: 'INVALID_TOKEN',
                empresa: TECSITEL_CONFIG.empresa.razonSocial
            });
        }
        req.user = user;
        next();
    });
};

// ============================================
// AUTENTICACIÓN SINCRONIZADA
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

        // Buscar usuario en configuración
        const user = TECSITEL_CONFIG.usuarios[username.toLowerCase()];
        
        if (!user || !user.activo) {
            logger.warn(`❌ Usuario no encontrado o inactivo: ${username}`);
            return res.status(401).json({
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Verificar contraseña (en producción usar bcrypt)
        if (password !== user.password) {
            logger.warn(`❌ Contraseña incorrecta para: ${username}`);
            return res.status(401).json({
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        logger.info(`✅ Login exitoso: ${username} (${user.role})`);
        
        // Generar token JWT
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

// Verificar token
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
            modulos: TECSITEL_CONFIG.modulos,
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
                area: TECSITEL_CONFIG.usuarios[key].area,
                // No incluir passwords en config pública
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
// GESTIÓN DE FACTURAS
// ============================================
app.get('/api/invoices', authenticateToken, async (req, res) => {
    try {
        // Verificar permisos
        if (!req.user.permissions.includes('all') && 
            !req.user.permissions.includes('invoices')) {
            return res.status(403).json({
                error: 'Sin permisos para ver facturas'
            });
        }

        // Datos simulados de facturas
        const invoices = [
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
        ];

        res.json({
            success: true,
            data: invoices,
            total: invoices.length,
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
        if (!req.user.permissions.includes('all') && 
            !req.user.permissions.includes('invoices')) {
            return res.status(403).json({
                error: 'Sin permisos para crear facturas'
            });
        }

        const { client, ruc, service, amount, currency } = req.body;
        
        // Validaciones básicas
        if (!client || !ruc || !service || !amount) {
            return res.status(400).json({
                error: 'Datos de factura incompletos'
            });
        }

        // Simular creación de factura
        const newInvoice = {
            id: Date.now(),
            number: `F001-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
            client,
            ruc,
            service,
            amount: parseFloat(amount),
            currency: currency || 'PEN',
            status: 'Pendiente',
            date: new Date().toISOString().split('T')[0],
            createdBy: req.user.username
        };

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

// ============================================
// GESTIÓN DE PERSONAL
// ============================================
app.get('/api/employees', authenticateToken, async (req, res) => {
    try {
        if (!req.user.permissions.includes('all') && 
            !req.user.permissions.includes('personnel')) {
            return res.status(403).json({
                error: 'Sin permisos para ver personal'
            });
        }

        const employees = [
            {
                id: 1,
                dni: '12345678',
                firstName: 'Carlos',
                lastName: 'Rodríguez',
                position: 'Administrador General',
                salary: 4500,
                status: 'Activo',
                hireDate: '2020-03-15'
            },
            {
                id: 2,
                dni: '87654321',
                firstName: 'Ana',
                lastName: 'Mendoza',
                position: 'Asistente Administrativa',
                salary: 2500,
                status: 'Activo',
                hireDate: '2021-07-01'
            }
        ];

        res.json({
            success: true,
            data: employees,
            total: employees.length,
            summary: {
                total: TECSITEL_CONFIG.empresa.empleadosTotal,
                administrativos: TECSITEL_CONFIG.empresa.empleadosAdmin,
                operarios: TECSITEL_CONFIG.empresa.empleadosOperarios
            }
        });
        
    } catch (error) {
        logger.error('❌ Error obteniendo empleados:', error);
        res.status(500).json({
            error: 'Error al obtener empleados'
        });
    }
});

// ============================================
// CONTROL DE TIEMPO Y ASISTENCIA
// ============================================
app.get('/api/timeentries', authenticateToken, async (req, res) => {
    try {
        if (!req.user.permissions.includes('all') && 
            !req.user.permissions.includes('timeentry') &&
            !req.user.permissions.includes('personnel')) {
            return res.status(403).json({
                error: 'Sin permisos para ver marcaciones'
            });
        }

        const timeEntries = [
            {
                id: 1,
                employeeId: 1,
                type: 'entrada',
                date: '2025-01-12',
                time: '08:00',
                createdBy: req.user.username
            },
            {
                id: 2,
                employeeId: 1,
                type: 'salida',
                date: '2025-01-12',
                time: '17:30',
                createdBy: req.user.username
            }
        ];

        res.json({
            success: true,
            data: timeEntries,
            total: timeEntries.length,
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

// ============================================
// DASHBOARD Y MÉTRICAS
// ============================================
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const dashboard = {
            metrics: {
                totalIncome: 130000,
                pendingInvoices: 1,
                totalEmployees: TECSITEL_CONFIG.empresa.empleadosTotal,
                complianceScore: 95
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
                    message: 'Nueva factura F001-000002 creada',
                    timestamp: new Date().toISOString()
                },
                {
                    type: 'employee',
                    message: 'Marcación de entrada registrada',
                    timestamp: new Date().toISOString()
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
// CUMPLIMIENTO NORMATIVO
// ============================================
app.get('/api/compliance', authenticateToken, async (req, res) => {
    try {
        if (!req.user.permissions.includes('all') && 
            !req.user.permissions.includes('compliance')) {
            return res.status(403).json({
                error: 'Sin permisos para ver cumplimiento'
            });
        }

        const compliance = {
            sunat: {
                facturacionElectronica: {
                    status: 'Activa',
                    version: '3.0',
                    compliance: 100
                },
                librosElectronicos: {
                    status: 'Al día',
                    compliance: 100
                },
                pdt621: {
                    status: 'Próximo vencimiento',
                    days: 10,
                    compliance: 95
                },
                overall: 98
            },
            sunafil: {
                tregistro: {
                    status: 'Actualizado',
                    compliance: 100
                },
                controlAsistencia: {
                    status: 'Digital implementado',
                    compliance: 100
                },
                registroJornadas: {
                    status: 'Completo',
                    compliance: 100
                },
                overall: 100
            },
            general: 97.5
        };

        res.json({
            success: true,
            data: compliance,
            empresa: TECSITEL_CONFIG.empresa.razonSocial,
            lastUpdate: new Date().toISOString()
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
        if (!req.user.permissions.includes('all') && 
            !req.user.permissions.includes('exports')) {
            return res.status(403).json({
                error: 'Sin permisos para exportar'
            });
        }

        const exportData = {
            timestamp: new Date().toISOString(),
            exportedBy: req.user.name,
            empresa: TECSITEL_CONFIG.empresa,
            version: '4.0.0-tecsitel',
            data: {
                invoices: 'included',
                employees: 'included',
                timeEntries: 'included',
                compliance: 'included'
            }
        };

        logger.info(`📤 Exportación realizada por ${req.user.name}`);

        res.json({
            success: true,
            data: exportData,
            message: 'Exportación completada exitosamente',
            downloadUrl: '/api/download/export-' + Date.now() + '.json'
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
        users: Object.keys(TECSITEL_CONFIG.usuarios).length,
        uptime: process.uptime()
    };

    res.json(health);
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
            'GET /api/invoices',
            'POST /api/invoices',
            'GET /api/employees',
            'GET /api/timeentries',
            'GET /api/dashboard',
            'GET /api/compliance',
            'POST /api/export',
            'GET /api/health'
        ]
    });
});

app.use((error, req, res, next) => {
    logger.error('❌ Error no manejado:', error);
    
    res.status(500).json({
        error: 'Error interno del servidor',
        code: 'SERVER_ERROR',
        empresa: TECSITEL_CONFIG.empresa.razonSocial,
        message: NODE_ENV === 'development' ? error.message : 'Error inesperado'
    });
});

// ============================================
// INICIALIZACIÓN
// ============================================
logger.info('🚀 Iniciando TECSITEL API v4.0');
logger.info(`🏢 Empresa: ${TECSITEL_CONFIG.empresa.razonSocial}`);
logger.info(`📋 RUC: ${TECSITEL_CONFIG.empresa.ruc}`);
logger.info(`👥 Usuarios configurados: ${Object.keys(TECSITEL_CONFIG.usuarios).length}`);
logger.info(`📊 Módulos disponibles: ${Object.keys(TECSITEL_CONFIG.modulos).length}`);

// Exportar para Netlify Functions
module.exports.handler = serverless(app);
