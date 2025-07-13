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

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
        netlify: 'SI'
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

        client.release();
        await pool.end();

        res.json({
            success: true,
            message: 'Conexión a PostgreSQL exitosa',
            data: {
                current_time: result.rows[0].current_time,
                postgres_version: result.rows[0].version.split(' ')[0],
                connection_successful: true
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
                permissions JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP
            )
        `);

        // Crear usuarios demo
        const users = [
            { username: 'admin', password: 'admin123', name: 'Administrador General', role: 'admin' },
            { username: 'contabilidad', password: 'conta123', name: 'Usuario Contabilidad', role: 'contabilidad' },
            { username: 'rrhh', password: 'rrhh123', name: 'Usuario Recursos Humanos', role: 'rrhh' },
            { username: 'supervisor', password: 'super123', name: 'Usuario Supervisor', role: 'supervisor' }
        ];

        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await client.query(`
                INSERT INTO users (username, password_hash, full_name, role, permissions)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (username) DO NOTHING
            `, [user.username, hashedPassword, user.name, user.role, JSON.stringify([])]);
        }

        client.release();
        await pool.end();

        res.json({
            success: true,
            message: 'Base de datos inicializada correctamente',
            users_created: users.map(u => ({ username: u.username, role: u.role }))
        });

    } catch (error) {
        console.error('Error inicializando DB:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Login básico
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`Intento de login: ${username}`);

        if (!username || !password) {
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
        const result = await client.query('SELECT * FROM users WHERE username = $1 AND is_active = true', [username]);

        if (result.rows.length === 0) {
            client.release();
            await pool.end();
            return res.status(401).json({
                success: false,
                error: 'Credenciales incorrectas'
            });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            client.release();
            await pool.end();
            return res.status(401).json({
                success: false,
                error: 'Credenciales incorrectas'
            });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role, name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

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
                permissions: user.permissions
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Ruta 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        available_routes: [
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
