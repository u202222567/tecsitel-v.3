const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware básico
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Middleware para manejar las rutas de Netlify
app.use((req, res, next) => {
    // Limpiar la ruta para que funcione correctamente
    if (req.path.startsWith('/.netlify/functions/api')) {
        req.url = req.url.replace('/.netlify/functions/api', '');
        req.path = req.path.replace('/.netlify/functions/api', '');
    }
    
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path || req.url}`);
    next();
});

// ========================================
// RUTAS DE TESTING
// ========================================

// Health check básico
app.get('/health', (req, res) => {
    console.log('Health check solicitado');
    res.json({ 
        success: true, 
        message: 'Tecsitel API v4.0 funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        netlify: 'SI',
        version: '4.0'
    });
});

// Test de variables de entorno
app.get('/test-env', (req, res) => {
    console.log('Test de variables de entorno');
    res.json({
        success: true,
        message: 'Variables de entorno verificadas',
        data: {
            node_env: process.env.NODE_ENV,
            has_database_url: !!process.env.DATABASE_URL,
            has_jwt_secret: !!process.env.JWT_SECRET,
            cors_origin: process.env.CORS_ORIGIN,
            database_url_preview: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NO_URL'
        }
    });
});

// Test de conexión a base de datos
app.get('/test-db', async (req, res) => {
    try {
        console.log('Iniciando test de conexión a base de datos...');
        
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL no está configurada');
        }

        // Intentar conectar con pg
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            max: 1,
            connectionTimeoutMillis: 10000,
        });

        console.log('Pool creado, intentando conectar...');
        const client = await pool.connect();
        console.log('Cliente conectado exitosamente');

        const result = await client.query('SELECT NOW() as current_time, version() as version');
        console.log('Query ejecutada exitosamente');

        // Verificar si existen las tablas
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        // Verificar usuarios si existe la tabla
        let userCount = 0;
        let sampleUser = null;
        try {
            const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
            userCount = parseInt(usersResult.rows[0].count);
            
            // Obtener un usuario de muestra para debug
            if (userCount > 0) {
                const sampleResult = await client.query('SELECT username, password_hash FROM users LIMIT 1');
                sampleUser = sampleResult.rows[0];
            }
        } catch (error) {
            console.log('Tabla users no existe:', error.message);
        }

        client.release();
        await pool.end();

        res.json({
            success: true,
            message: 'Conexión a PostgreSQL exitosa',
            data: {
                current_time: result.rows[0].current_time,
                postgres_version: result.rows[0].version.split(' ')[0],
                connection_successful: true,
                tables_found: tablesResult.rows.map(row => row.table_name),
                user_count: userCount,
                sample_user_exists: !!sampleUser,
                sample_username: sampleUser?.username,
                password_hash_length: sampleUser?.password_hash?.length
            }
        });

    } catch (error) {
        console.error('Error en test de DB:', error);
        res.status(500).json({
            success: false,
            message: 'Error conectando con la base de datos',
            error: {
                message: error.message,
                code: error.code,
                type: 'Database Connection Error'
            }
        });
    }
});

// Inicializar usuarios demo
app.post('/init-db', async (req, res) => {
    try {
        console.log('Inicializando base de datos...');
        
        const bcrypt = require('bcryptjs');
        const { Pool } = require('pg');
        
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            max: 1,
        });

        const client = await pool.connect();

        // Crear tabla users si no existe
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                role VARCHAR(20) NOT NULL,
                permissions JSONB DEFAULT '[]',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP
            )
        `);

        console.log('Tabla users creada o verificada');

        // Crear usuarios demo
        const users = [
            { username: 'admin', password: 'admin123', name: 'Administrador General', role: 'admin' },
            { username: 'contabilidad', password: 'conta123', name: 'Usuario Contabilidad', role: 'contabilidad' },
            { username: 'rrhh', password: 'rrhh123', name: 'Usuario Recursos Humanos', role: 'rrhh' },
            { username: 'supervisor', password: 'super123', name: 'Usuario Supervisor', role: 'supervisor' }
        ];

        let usersCreated = 0;

        for (const user of users) {
            try {
                console.log(`Hasheando contraseña para ${user.username}...`);
                const hashedPassword = await bcrypt.hash(user.password, 12);
                console.log(`Hash creado para ${user.username}, longitud: ${hashedPassword.length}`);
                
                const result = await client.query(`
                    INSERT INTO users (username, password_hash, full_name, role, permissions)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (username) DO UPDATE SET
                        password_hash = EXCLUDED.password_hash,
                        full_name = EXCLUDED.full_name,
                        role = EXCLUDED.role
                    RETURNING id
                `, [user.username, hashedPassword, user.name, user.role, JSON.stringify([])]);
                
                usersCreated++;
                console.log(`Usuario procesado: ${user.username}`);
            } catch (error) {
                console.error(`Error procesando usuario ${user.username}:`, error);
            }
        }

        // Verificar usuarios creados
        const totalUsersResult = await client.query('SELECT COUNT(*) as count FROM users');
        const totalUsers = parseInt(totalUsersResult.rows[0].count);

        client.release();
        await pool.end();

        res.json({
            success: true,
            message: 'Base de datos inicializada correctamente',
            data: {
                users_processed: usersCreated,
                total_users: totalUsers,
                available_users: users.map(u => ({ username: u.username, role: u.role }))
            }
        });

    } catch (error) {
        console.error('Error inicializando DB:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

// Login con debug mejorado
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`🔐 Intento de login: ${username}`);
        console.log(`🔑 Password recibido: ${password ? 'SI' : 'NO'} (longitud: ${password?.length})`);

        if (!username || !password) {
            console.log('❌ Username o password faltante');
            return res.status(400).json({
                success: false,
                error: 'Usuario y contraseña requeridos'
            });
        }

        const bcrypt = require('bcryptjs');
        const jwt = require('jsonwebtoken');
        const { Pool } = require('pg');

        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            max: 1,
        });

        const client = await pool.connect();
        console.log(`🔍 Buscando usuario: ${username}`);
        
        const result = await client.query('SELECT * FROM users WHERE username = $1 AND is_active = true', [username]);
        console.log(`👥 Usuarios encontrados: ${result.rows.length}`);

        if (result.rows.length === 0) {
            console.log(`❌ Usuario no encontrado: ${username}`);
            client.release();
            await pool.end();
            return res.status(401).json({
                success: false,
                error: 'Credenciales incorrectas'
            });
        }

        const user = result.rows[0];
        console.log(`✅ Usuario encontrado: ${user.username}`);
        console.log(`🔑 Hash en DB longitud: ${user.password_hash?.length}`);
        console.log(`🔑 Hash en DB preview: ${user.password_hash?.substring(0, 20)}...`);

        console.log(`🔍 Comparando contraseñas...`);
        console.log(`🔍 Contraseña plana: "${password}"`);
        console.log(`🔍 Hash almacenado: "${user.password_hash}"`);
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        console.log(`🔐 Resultado de comparación: ${validPassword}`);

        if (!validPassword) {
            console.log(`❌ Contraseña incorrecta para: ${username}`);
            
            // Debug adicional: intentar hash manual
            const testHash = await bcrypt.hash(password, 12);
            console.log(`🧪 Hash de prueba: ${testHash}`);
            const testCompare = await bcrypt.compare(password, testHash);
            console.log(`🧪 Test de bcrypt funciona: ${testCompare}`);
            
            client.release();
            await pool.end();
            return res.status(401).json({
                success: false,
                error: 'Credenciales incorrectas',
                debug: {
                    user_found: true,
                    password_comparison: false,
                    bcrypt_test: testCompare
                }
            });
        }

        // Actualizar último login
        await client.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role, name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        console.log(`✅ Login exitoso para: ${username}`);

        client.release();
        await pool.end();

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.full_name,
                permissions: user.permissions || []
            }
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// Ruta raíz para testing
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Tecsitel API v4.0',
        available_routes: [
            'GET /health',
            'GET /test-env', 
            'GET /test-db',
            'POST /init-db',
            'POST /auth/login'
        ],
        timestamp: new Date().toISOString()
    });
});

// Ruta 404
app.use('*', (req, res) => {
    console.log(`Ruta no encontrada: ${req.method} ${req.originalUrl || req.url}`);
    res.status(404).json({ 
        success: false,
        error: 'Ruta no encontrada',
        path: req.originalUrl || req.url,
        method: req.method,
        available_routes: [
            'GET /',
            'GET /health',
            'GET /test-env', 
            'GET /test-db',
            'POST /init-db',
            'POST /auth/login'
        ]
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor',
        message: error.message
    });
});

module.exports.handler = serverless(app);
