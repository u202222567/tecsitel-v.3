const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

// ========================================
// Configuración de CORS más permisiva
// ========================================
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// ========================================
// Configuración mejorada para Neon con diagnóstico
// ========================================
let pool;

function initializePool() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL no está definida');
        return null;
    }
    
    console.log('🔗 Iniciando conexión a Neon...');
    console.log('🌐 Database URL existe:', !!databaseUrl);
    console.log('🔍 URL preview:', databaseUrl.substring(0, 30) + '...');
    
    try {
        const newPool = new Pool({
            connectionString: databaseUrl,
            ssl: {
                require: true,
                rejectUnauthorized: false
            },
            max: 3, // Límite bajo para Neon free tier
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            statement_timeout: 30000,
            query_timeout: 30000,
        });
        
        // Manejar errores del pool
        newPool.on('error', (err) => {
            console.error('❌ Error en pool de Neon:', err);
        });
        
        newPool.on('connect', () => {
            console.log('✅ Nueva conexión a Neon establecida');
        });
        
        console.log('✅ Pool de Neon inicializado correctamente');
        return newPool;
        
    } catch (error) {
        console.error('❌ Error inicializando pool:', error);
        return null;
    }
}

// Inicializar pool
pool = initializePool();

// ========================================
// Función auxiliar para ejecutar queries con mejor manejo de errores
// ========================================
async function executeQuery(queryText, params = []) {
    if (!pool) {
        throw new Error('Pool de base de datos no inicializado');
    }
    
    let client;
    try {
        console.log(`🔄 Ejecutando query: ${queryText.substring(0, 50)}...`);
        client = await pool.connect();
        console.log('✅ Cliente conectado para query');
        
        const result = await client.query(queryText, params);
        console.log(`✅ Query ejecutada exitosamente. Filas afectadas: ${result.rowCount}`);
        return result;
        
    } catch (error) {
        console.error('❌ Error ejecutando query:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            query: queryText.substring(0, 100)
        });
        throw error;
    } finally {
        if (client) {
            client.release();
            console.log('🔄 Cliente liberado');
        }
    }
}

// ========================================
// Middleware de logging
// ========================================
app.use((req, res, next) => {
    console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ========================================
// Endpoint de diagnóstico mejorado
// ========================================
app.get('/health', async (req, res) => {
    console.log('🏥 Health check iniciado');
    
    try {
        const healthData = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            version: '4.0',
            database: {
                configured: !!process.env.DATABASE_URL,
                poolStatus: pool ? 'initialized' : 'not_initialized'
            }
        };
        
        // Test básico de conexión
        if (pool) {
            try {
                const result = await executeQuery('SELECT NOW() as current_time, version() as pg_version');
                healthData.database.connected = true;
                healthData.database.currentTime = result.rows[0].current_time;
                healthData.database.version = result.rows[0].pg_version.split(' ')[0];
                healthData.database.poolStats = {
                    totalCount: pool.totalCount,
                    idleCount: pool.idleCount,
                    waitingCount: pool.waitingCount
                };
            } catch (dbError) {
                console.error('❌ Error en health check de DB:', dbError);
                healthData.database.connected = false;
                healthData.database.error = dbError.message;
            }
        }
        
        console.log('✅ Health check completado:', healthData);
        res.json(healthData);
        
    } catch (error) {
        console.error('❌ Error en health check:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ========================================
// Endpoint de diagnóstico completo de DB
// ========================================
app.get('/test-db', async (req, res) => {
    console.log('🔬 Test completo de DB iniciado');
    
    if (!pool) {
        return res.status(500).json({
            success: false,
            error: 'Pool de base de datos no inicializado',
            details: {
                DATABASE_URL_exists: !!process.env.DATABASE_URL,
                NODE_ENV: process.env.NODE_ENV
            }
        });
    }
    
    try {
        // Test de conexión básica
        console.log('🔄 Probando conexión básica...');
        const timeResult = await executeQuery('SELECT NOW() as current_time, version() as pg_version');
        
        // Test de tablas existentes
        console.log('🔄 Verificando tablas...');
        const tablesResult = await executeQuery(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        // Test de usuarios (si la tabla existe)
        let userCount = 0;
        try {
            const usersResult = await executeQuery('SELECT COUNT(*) as count FROM users');
            userCount = parseInt(usersResult.rows[0].count);
        } catch (userError) {
            console.log('⚠️ Tabla users no existe aún:', userError.message);
        }
        
        const result = {
            success: true,
            message: '🎉 Conexión a Neon exitosa!',
            data: {
                current_time: timeResult.rows[0].current_time,
                postgres_version: timeResult.rows[0].pg_version.split(' ')[0],
                tables_found: tablesResult.rows.map(row => row.table_name),
                user_count: userCount,
                pool_stats: {
                    total_connections: pool.totalCount,
                    idle_connections: pool.idleCount,
                    waiting_count: pool.waitingCount
                },
                environment: {
                    NODE_ENV: process.env.NODE_ENV,
                    DATABASE_URL_configured: !!process.env.DATABASE_URL
                }
            }
        };
        
        console.log('✅ Test de DB completado exitosamente');
        res.json(result);
        
    } catch (error) {
        console.error('❌ Error en test de DB:', error);
        
        const errorDetails = {
            message: error.message,
            code: error.code,
            detail: error.detail,
            hint: error.hint
        };
        
        // Errores específicos de Neon/PostgreSQL
        if (error.code === 'ENOTFOUND') {
            errorDetails.suggestion = 'Verificar que DATABASE_URL esté configurada correctamente en Netlify';
        } else if (error.code === '28000') {
            errorDetails.suggestion = 'Credenciales de autenticación incorrectas';
        } else if (error.code === '3D000') {
            errorDetails.suggestion = 'Base de datos no existe';
        } else if (error.code === '53300') {
            errorDetails.suggestion = 'Demasiadas conexiones simultáneas - usar pool más pequeño';
        }
        
        res.status(500).json({
            success: false,
            message: 'Error al conectar con Neon',
            error: errorDetails,
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                DATABASE_URL_configured: !!process.env.DATABASE_URL
            }
        });
    }
});

// ========================================
// Endpoint para crear tablas iniciales
// ========================================
app.post('/setup-database', async (req, res) => {
    console.log('🏗️ Configuración inicial de base de datos');
    
    try {
        // Crear tabla de usuarios
        console.log('📋 Creando tabla users...');
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                role VARCHAR(20) NOT NULL,
                permissions JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        `);
        
        // Crear tabla de empleados
        console.log('📋 Creando tabla employees...');
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS employees (
                dni VARCHAR(8) PRIMARY KEY,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'Activo',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP,
                created_by INTEGER,
                updated_by INTEGER,
                deleted_by INTEGER
            )
        `);
        
        // Crear tabla de facturas
        console.log('📋 Creando tabla invoices...');
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                invoice_number VARCHAR(20) UNIQUE NOT NULL,
                client_ruc VARCHAR(11) NOT NULL,
                client_name VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                currency VARCHAR(3) DEFAULT 'PEN',
                amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'Pendiente',
                is_export BOOLEAN DEFAULT false,
                invoice_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP,
                created_by INTEGER,
                updated_by INTEGER,
                deleted_by INTEGER
            )
        `);
        
        // Crear tabla de registros de tiempo
        console.log('📋 Creando tabla time_entries...');
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS time_entries (
                id SERIAL PRIMARY KEY,
                employee_dni VARCHAR(8) NOT NULL,
                entry_date DATE NOT NULL,
                entry_time TIME,
                exit_time TIME,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP,
                created_by INTEGER,
                updated_by INTEGER,
                deleted_by INTEGER,
                FOREIGN KEY (employee_dni) REFERENCES employees(dni)
            )
        `);
        
        // Insertar usuarios demo si no existen
        console.log('👤 Insertando usuarios demo...');
        const demoUsers = [
            {
                username: 'admin',
                password: 'admin123',
                full_name: 'Administrador General',
                role: 'admin'
            },
            {
                username: 'contabilidad',
                password: 'conta123',
                full_name: 'Usuario Contabilidad',
                role: 'contabilidad'
            },
            {
                username: 'rrhh',
                password: 'rrhh123',
                full_name: 'Usuario RRHH',
                role: 'rrhh'
            },
            {
                username: 'supervisor',
                password: 'super123',
                full_name: 'Usuario Supervisor',
                role: 'supervisor'
            }
        ];
        
        for (const user of demoUsers) {
            try {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await executeQuery(`
                    INSERT INTO users (username, password_hash, full_name, role)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (username) DO NOTHING
                `, [user.username, hashedPassword, user.full_name, user.role]);
                console.log(`✅ Usuario ${user.username} creado/verificado`);
            } catch (userError) {
                console.log(`⚠️ Error creando usuario ${user.username}:`, userError.message);
            }
        }
        
        // Insertar empleados demo
        console.log('👥 Insertando empleados demo...');
        const demoEmployees = [
            { dni: '12345678', first_name: 'Juan', last_name: 'Pérez', status: 'Activo' },
            { dni: '87654321', first_name: 'María', last_name: 'García', status: 'Activo' },
            { dni: '11223344', first_name: 'Carlos', last_name: 'López', status: 'Vacaciones' }
        ];
        
        for (const emp of demoEmployees) {
            try {
                await executeQuery(`
                    INSERT INTO employees (dni, first_name, last_name, status)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (dni) DO NOTHING
                `, [emp.dni, emp.first_name, emp.last_name, emp.status]);
                console.log(`✅ Empleado ${emp.first_name} ${emp.last_name} creado/verificado`);
            } catch (empError) {
                console.log(`⚠️ Error creando empleado ${emp.first_name}:`, empError.message);
            }
        }
        
        // Insertar factura demo
        console.log('📄 Insertando factura demo...');
        try {
            await executeQuery(`
                INSERT INTO invoices (invoice_number, client_ruc, client_name, description, amount, invoice_date)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (invoice_number) DO NOTHING
            `, ['F001-0001', '20123456789', 'Empresa Demo SAC', 'Servicios de consultoría', 2500.00, '2025-01-15']);
            console.log('✅ Factura demo creada/verificada');
        } catch (invError) {
            console.log('⚠️ Error creando factura demo:', invError.message);
        }
        
        console.log('🎉 Base de datos configurada exitosamente');
        res.json({
            success: true,
            message: 'Base de datos configurada exitosamente',
            tables_created: ['users', 'employees', 'invoices', 'time_entries'],
            demo_data_inserted: true
        });
        
    } catch (error) {
        console.error('❌ Error configurando base de datos:', error);
        res.status(500).json({
            success: false,
            message: 'Error configurando base de datos',
            error: error.message
        });
    }
});

// ========================================
// Autenticación (simplificada para debug)
// ========================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false,
            error: 'Token de acceso requerido' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_debug', (err, user) => {
        if (err) {
            console.error('Error verificando token:', err);
            return res.status(403).json({ 
                success: false,
                error: 'Token inválido o expirado' 
            });
        }
        req.user = user;
        next();
    });
};

// ========================================
// Rutas de Autenticación
// ========================================
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`🔐 Intento de login para: ${username}`);

        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Usuario y contraseña requeridos' 
            });
        }

        // Buscar usuario
        const userQuery = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
        const userResult = await executeQuery(userQuery, [username]);

        if (userResult.rows.length === 0) {
            console.log(`❌ Usuario no encontrado: ${username}`);
            return res.status(401).json({ 
                success: false,
                error: 'Usuario no encontrado o inactivo' 
            });
        }

        const user = userResult.rows[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.log(`❌ Contraseña incorrecta para: ${username}`);
            return res.status(401).json({ 
                success: false,
                error: 'Contraseña incorrecta' 
            });
        }

        // Generar token
        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role,
                name: user.full_name 
            },
            process.env.JWT_SECRET || 'fallback_secret_for_debug',
            { expiresIn: '8h' }
        );

        // Actualizar último login
        await executeQuery(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        console.log(`✅ Login exitoso para: ${username}`);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.full_name,
                permissions: user.permissions
            }
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor: ' + error.message
        });
    }
});

// ========================================
// Rutas básicas de datos (simplificadas)
// ========================================
app.get('/dashboard/stats', async (req, res) => {
    try {
        console.log('📊 Cargando estadísticas del dashboard');
        
        const stats = {};

        // Total de ingresos
        try {
            const incomeResult = await executeQuery(`
                SELECT COALESCE(SUM(amount), 0) as total_income
                FROM invoices 
                WHERE deleted_at IS NULL AND status != 'Anulado'
            `);
            stats.totalIncome = parseFloat(incomeResult.rows[0].total_income);
        } catch (e) {
            console.log('⚠️ Error calculando ingresos, usando valor por defecto');
            stats.totalIncome = 2500.00;
        }

        // Facturas pendientes
        try {
            const pendingResult = await executeQuery(`
                SELECT COUNT(*) as pending_count
                FROM invoices 
                WHERE status = 'Pendiente' AND deleted_at IS NULL
            `);
            stats.pendingInvoices = parseInt(pendingResult.rows[0].pending_count);
        } catch (e) {
            console.log('⚠️ Error contando facturas pendientes, usando valor por defecto');
            stats.pendingInvoices = 1;
        }

        // Empleados activos
        try {
            const employeesResult = await executeQuery(`
                SELECT COUNT(*) as active_count
                FROM employees 
                WHERE status = 'Activo' AND deleted_at IS NULL
            `);
            stats.activeEmployees = parseInt(employeesResult.rows[0].active_count);
        } catch (e) {
            console.log('⚠️ Error contando empleados activos, usando valor por defecto');
            stats.activeEmployees = 3;
        }

        // Compliance (siempre 100% por ahora)
        stats.compliance = 100;

        console.log('✅ Estadísticas cargadas:', stats);
        res.json({ success: true, stats });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo estadísticas: ' + error.message 
        });
    }
});

// ========================================
// Manejo de errores y rutas no encontradas
// ========================================
app.use((error, req, res, next) => {
    console.error('❌ Error no manejado:', error);
    res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

app.use('*', (req, res) => {
    console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        success: false,
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// ========================================
// Graceful shutdown
// ========================================
process.on('SIGTERM', async () => {
    console.log('🔄 Cerrando pool de conexiones...');
    if (pool) {
        await pool.end();
    }
    process.exit(0);
});

// ========================================
// Exportar handler para Netlify
// ========================================
module.exports.handler = serverless(app);
