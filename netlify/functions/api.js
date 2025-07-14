const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// --- Configuración del Pool de PostgreSQL ---
// Se configura una sola vez para ser reutilizado en todas las funciones
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    // Configuraciones recomendadas para un entorno serverless
    max: 5, 
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// --- Middlewares ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Middleware para limpiar la ruta de Netlify
app.use((req, res, next) => {
    if (req.path.startsWith('/.netlify/functions/api')) {
        req.url = req.url.replace('/.netlify/functions/api', '');
        req.path = req.path.replace('/.netlify/functions/api', '');
    }
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path || req.url}`);
    next();
});

// --- Middleware de Autenticación JWT ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Acceso denegado: No se proporcionó token' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Token inválido o expirado' });
        }
        req.user = user;
        next();
    });
};


// ========================================
// RUTAS DE AUTENTICACIÓN (Públicas)
// ========================================

app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos' });
        }

        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND is_active = true', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
        }

        await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role, name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

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
        res.status(500).json({ success: false, error: 'Error interno del servidor', details: error.message });
    }
});

// Ruta para verificar un token existente
app.get('/auth/verify', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, full_name, role, permissions FROM users WHERE id = $1', [req.user.userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Error verificando sesión:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});


// ========================================
// RUTAS DEL DASHBOARD (Protegidas)
// ========================================

app.get('/dashboard/stats', verifyToken, async (req, res) => {
    try {
        // Simulación de consultas a la base de datos
        // En un caso real, estas tablas deben existir
        const totalIncomeResult = await pool.query("SELECT SUM(amount) as total FROM invoices WHERE status = 'Pagado'");
        const pendingInvoicesResult = await pool.query("SELECT COUNT(*) as count FROM invoices WHERE status = 'Pendiente'");
        const activeEmployeesResult = await pool.query("SELECT COUNT(*) as count FROM employees WHERE status = 'Activo'");

        const stats = {
            totalIncome: parseFloat(totalIncomeResult.rows[0].total) || 0,
            pendingInvoices: parseInt(pendingInvoicesResult.rows[0].count) || 0,
            activeEmployees: parseInt(activeEmployeesResult.rows[0].count) || 0,
            compliance: 100 // Valor estático por ahora
        };

        res.json({ success: true, stats });

    } catch (error) {
        console.error('Error cargando estadísticas del dashboard:', error);
        // Devuelve un objeto de estadísticas por defecto en caso de error para no romper el frontend
        res.status(500).json({
            success: false,
            error: 'No se pudieron cargar las estadísticas.',
            details: error.message,
            stats: { totalIncome: 0, pendingInvoices: 0, activeEmployees: 0, compliance: 0 }
        });
    }
});


// ========================================
// RUTAS DE EMPLEADOS (Protegidas)
// ========================================

app.get('/employees', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees ORDER BY last_name, first_name');
        res.json({ success: true, employees: result.rows });
    } catch (error) {
        console.error('Error obteniendo empleados:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// ... Aquí irían las rutas POST, PUT, DELETE para empleados


// ========================================
// RUTAS DE FACTURAS (Protegidas)
// ========================================

app.get('/invoices', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM invoices ORDER BY invoice_date DESC');
        res.json({ success: true, invoices: result.rows });
    } catch (error) {
        console.error('Error obteniendo facturas:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// ... Aquí irían las rutas POST, PUT, DELETE para facturas


// ========================================
// RUTAS DE ASISTENCIA (Protegidas)
// ========================================

app.get('/time-entries', verifyToken, async (req, res) => {
    try {
        const query = `
            SELECT te.*, e.first_name, e.last_name 
            FROM time_entries te
            JOIN employees e ON te.employee_dni = e.dni
            ORDER BY te.entry_date DESC, te.entry_time DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, timeEntries: result.rows });
    } catch (error) {
        console.error('Error obteniendo registros de tiempo:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// ... Aquí irían las rutas POST, PUT, DELETE para asistencia


// ========================================
// RUTAS DE TESTING Y SALUD
// ========================================

app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Tecsitel API v4.0 funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Bienvenido a la API de Tecsitel v4.0',
        rutas_disponibles: [
            'POST /auth/login',
            'GET /auth/verify',
            'GET /dashboard/stats',
            'GET /employees',
            'GET /invoices',
            'GET /time-entries',
            'GET /health'
        ]
    });
});


// ========================================
// MANEJO DE ERRORES Y 404
// ========================================

app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        path: req.originalUrl || req.url,
    });
});

app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
    });
});

module.exports.handler = serverless(app);
