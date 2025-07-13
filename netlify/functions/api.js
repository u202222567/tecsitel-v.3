const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

// ========================================
// Configuración de la base de datos
// ========================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// ========================================
// Middleware
// ========================================
app.use(cors());
app.use(express.json());

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Middleware de roles
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        // El rol 'admin' siempre tiene acceso, o si el rol del usuario está incluido en los permitidos
        if (req.user.role === 'admin' || allowedRoles.includes(req.user.role)) {
            next(); // El usuario tiene permiso, continuar.
        } else {
            // Si no, denegar acceso.
            return res.status(403).json({ error: 'Permisos insuficientes' });
        }
    };
};

app.get('/test-db', async (req, res) => {
    try {
        console.log('Iniciando prueba de conexión a la base de datos...');
        const client = await pool.connect();
        console.log('Cliente conectado, ejecutando query...');
        const timeResult = await client.query('SELECT NOW()');
        client.release();
        console.log('Conexión exitosa.');
        res.json({ 
            success: true, 
            message: '¡Conexión a la base de datos exitosa!',
            db_time: timeResult.rows[0].now
        });
    } catch (error) {
        console.error('Error en /test-db:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al conectar con la base de datos.',
            error: error.message 
        });
    }
});

// ========================================
// Rutas de Autenticación
// ========================================

// Login
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }

        // Buscar usuario en la base de datos
        const userQuery = 'SELECT * FROM users WHERE username = $1';
        const userResult = await pool.query(userQuery, [username]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const user = userResult.rows[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // Verificar que el usuario esté activo
        if (!user.is_active) {
            return res.status(401).json({ error: 'Usuario desactivado' });
        }

        // Generar token JWT
        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role,
                name: user.full_name 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        // Actualizar último login
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

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
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Logout
app.post('/auth/logout', authenticateToken, async (req, res) => {
    try {
        // En una implementación real, aquí se invalidaría el token
        res.json({ success: true, message: 'Sesión cerrada correctamente' });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Verificar token
app.get('/auth/verify', authenticateToken, (req, res) => {
    res.json({ 
        success: true, 
        user: req.user 
    });
});

// ========================================
// Rutas de Usuarios
// ========================================

// Obtener todos los usuarios (solo admin)
app.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const query = `
            SELECT id, username, role, full_name, email, is_active, 
                   created_at, last_login, permissions
            FROM users 
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, users: result.rows });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear usuario (solo admin)
app.post('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { username, password, role, full_name, email } = req.body;

        if (!username || !password || !role || !full_name) {
            return res.status(400).json({ error: 'Datos requeridos faltantes' });
        }

        // Verificar si el usuario ya existe
        const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // Hash de la contraseña
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Obtener permisos según el rol
        const permissions = getRolePermissions(role);

        // Insertar usuario
        const insertQuery = `
            INSERT INTO users (username, password_hash, role, full_name, email, permissions, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, username, role, full_name, email, is_active, created_at
        `;
        
        const result = await pool.query(insertQuery, [
            username, passwordHash, role, full_name, email, 
            JSON.stringify(permissions), true
        ]);

        res.status(201).json({ 
            success: true, 
            user: result.rows[0],
            message: 'Usuario creado correctamente' 
        });

    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Función auxiliar para obtener permisos por rol
function getRolePermissions(role) {
    const rolePermissions = {
        'admin': ['all'],
        'contabilidad': ['dashboard', 'invoices', 'accounting', 'compliance', 'sharepoint'],
        'rrhh': ['dashboard', 'personnel', 'timetracking', 'compliance', 'sharepoint'],
        'supervisor': ['dashboard', 'timetracking']
    };
    
    return rolePermissions[role] || [];
}

// ========================================
// Rutas de Empleados
// ========================================

// Obtener todos los empleados
app.get('/employees', authenticateToken, requireRole(['admin', 'rrhh', 'supervisor']), async (req, res) => {
    try {
        const query = `
            SELECT dni, first_name, last_name, status, notes, created_at, updated_at
            FROM employees 
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, employees: result.rows });
    } catch (error) {
        console.error('Error obteniendo empleados:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear empleado
app.post('/employees', authenticateToken, requireRole(['admin', 'rrhh']), async (req, res) => {
    try {
        const { dni, first_name, last_name, status, notes } = req.body;

        if (!dni || !first_name || !last_name || !status) {
            return res.status(400).json({ error: 'DNI, nombre, apellido y estado son requeridos' });
        }

        // Verificar formato de DNI
        if (!/^[0-9]{8}$/.test(dni)) {
            return res.status(400).json({ error: 'DNI debe tener 8 dígitos' });
        }

        // Verificar si el empleado ya existe
        const existingEmployee = await pool.query('SELECT dni FROM employees WHERE dni = $1 AND deleted_at IS NULL', [dni]);
        if (existingEmployee.rows.length > 0) {
            return res.status(400).json({ error: 'El empleado ya existe' });
        }

        // Insertar empleado
        const insertQuery = `
            INSERT INTO employees (dni, first_name, last_name, status, notes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING dni, first_name, last_name, status, notes, created_at
        `;
        
        const result = await pool.query(insertQuery, [
            dni, first_name, last_name, status, notes || '', req.user.userId
        ]);

        res.status(201).json({ 
            success: true, 
            employee: result.rows[0],
            message: 'Empleado creado correctamente' 
        });

    } catch (error) {
        console.error('Error creando empleado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar empleado
app.put('/employees/:dni', authenticateToken, requireRole(['admin', 'rrhh']), async (req, res) => {
    try {
        const { dni } = req.params;
        const { first_name, last_name, status, notes } = req.body;

        const updateQuery = `
            UPDATE employees 
            SET first_name = $1, last_name = $2, status = $3, notes = $4, 
                updated_at = NOW(), updated_by = $5
            WHERE dni = $6 AND deleted_at IS NULL
            RETURNING dni, first_name, last_name, status, notes, updated_at
        `;
        
        const result = await pool.query(updateQuery, [
            first_name, last_name, status, notes || '', req.user.userId, dni
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        res.json({ 
            success: true, 
            employee: result.rows[0],
            message: 'Empleado actualizado correctamente' 
        });

    } catch (error) {
        console.error('Error actualizando empleado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar empleado (soft delete)
app.delete('/employees/:dni', authenticateToken, requireRole(['admin', 'rrhh']), async (req, res) => {
    try {
        const { dni } = req.params;

        const deleteQuery = `
            UPDATE employees 
            SET deleted_at = NOW(), deleted_by = $1
            WHERE dni = $2 AND deleted_at IS NULL
            RETURNING dni, first_name, last_name
        `;
        
        const result = await pool.query(deleteQuery, [req.user.userId, dni]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        res.json({ 
            success: true, 
            message: 'Empleado eliminado correctamente' 
        });

    } catch (error) {
        console.error('Error eliminando empleado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ========================================
// Rutas de Registro de Tiempo
// ========================================

// Obtener registros de tiempo
app.get('/time-entries', authenticateToken, requireRole(['admin', 'rrhh', 'supervisor']), async (req, res) => {
    try {
        const { date, employee_dni } = req.query;
        
        let query = `
            SELECT te.id, te.employee_dni, te.entry_date, te.entry_time, te.exit_time, 
                   te.notes, te.created_at,
                   e.first_name, e.last_name
            FROM time_entries te
            JOIN employees e ON te.employee_dni = e.dni
            WHERE te.deleted_at IS NULL
        `;
        
        const queryParams = [];
        let paramCount = 1;

        if (date) {
            query += ` AND te.entry_date = $${paramCount}`;
            queryParams.push(date);
            paramCount++;
        }

        if (employee_dni) {
            query += ` AND te.employee_dni = $${paramCount}`;
            queryParams.push(employee_dni);
            paramCount++;
        }

        query += ' ORDER BY te.entry_date DESC, te.entry_time DESC';

        const result = await pool.query(query, queryParams);
        res.json({ success: true, timeEntries: result.rows });

    } catch (error) {
        console.error('Error obteniendo registros de tiempo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear registro de tiempo
app.post('/time-entries', authenticateToken, requireRole(['admin', 'rrhh', 'supervisor']), async (req, res) => {
    try {
        const { employee_dni, entry_date, entry_time, exit_time, notes } = req.body;

        if (!employee_dni || !entry_date) {
            return res.status(400).json({ error: 'DNI del empleado y fecha son requeridos' });
        }

        // Verificar que el empleado existe
        const employeeCheck = await pool.query('SELECT dni FROM employees WHERE dni = $1 AND deleted_at IS NULL', [employee_dni]);
        if (employeeCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Empleado no encontrado' });
        }

        // Verificar si ya existe un registro para esta fecha
        const existingEntry = await pool.query(
            'SELECT id FROM time_entries WHERE employee_dni = $1 AND entry_date = $2 AND deleted_at IS NULL',
            [employee_dni, entry_date]
        );

        if (existingEntry.rows.length > 0) {
            return res.status(400).json({ error: 'Ya existe un registro para este empleado en esta fecha' });
        }

        // Insertar registro
        const insertQuery = `
            INSERT INTO time_entries (employee_dni, entry_date, entry_time, exit_time, notes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, employee_dni, entry_date, entry_time, exit_time, notes, created_at
        `;
        
        const result = await pool.query(insertQuery, [
            employee_dni, entry_date, entry_time, exit_time, notes || '', req.user.userId
        ]);

        res.status(201).json({ 
            success: true, 
            timeEntry: result.rows[0],
            message: 'Registro de tiempo creado correctamente' 
        });

    } catch (error) {
        console.error('Error creando registro de tiempo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar registro de tiempo
app.put('/time-entries/:id', authenticateToken, requireRole(['admin', 'rrhh', 'supervisor']), async (req, res) => {
    try {
        const { id } = req.params;
        const { entry_time, exit_time, notes } = req.body;

        const updateQuery = `
            UPDATE time_entries 
            SET entry_time = $1, exit_time = $2, notes = $3, 
                updated_at = NOW(), updated_by = $4
            WHERE id = $5 AND deleted_at IS NULL
            RETURNING id, employee_dni, entry_date, entry_time, exit_time, notes, updated_at
        `;
        
        const result = await pool.query(updateQuery, [
            entry_time, exit_time, notes || '', req.user.userId, id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }

        res.json({ 
            success: true, 
            timeEntry: result.rows[0],
            message: 'Registro actualizado correctamente' 
        });

    } catch (error) {
        console.error('Error actualizando registro de tiempo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ========================================
// Rutas de Facturas
// ========================================

// Obtener facturas
app.get('/invoices', authenticateToken, requireRole(['admin', 'contabilidad']), async (req, res) => {
    try {
        const query = `
            SELECT id, invoice_number, client_ruc, client_name, description, 
                   currency, amount, status, is_export, invoice_date, created_at
            FROM invoices 
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, invoices: result.rows });
    } catch (error) {
        console.error('Error obteniendo facturas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear factura
app.post('/invoices', authenticateToken, requireRole(['admin', 'contabilidad']), async (req, res) => {
    try {
        const { client_ruc, client_name, description, currency, amount, is_export } = req.body;

        if (!client_ruc || !client_name || !description || !currency || !amount) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // Verificar formato de RUC
        if (!/^[0-9]{11}$/.test(client_ruc)) {
            return res.status(400).json({ error: 'RUC debe tener 11 dígitos' });
        }

        // Generar número de factura
        const lastInvoice = await pool.query(
            'SELECT invoice_number FROM invoices ORDER BY created_at DESC LIMIT 1'
        );
        
        let nextNumber = 1;
        if (lastInvoice.rows.length > 0) {
            const lastNumber = parseInt(lastInvoice.rows[0].invoice_number.split('-')[1]);
            nextNumber = lastNumber + 1;
        }
        
        const invoice_number = `F001-${nextNumber.toString().padStart(4, '0')}`;

        // Insertar factura
        const insertQuery = `
            INSERT INTO invoices (invoice_number, client_ruc, client_name, description, 
                                currency, amount, status, is_export, invoice_date, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, invoice_number, client_ruc, client_name, description, 
                     currency, amount, status, is_export, invoice_date, created_at
        `;
        
        const result = await pool.query(insertQuery, [
            invoice_number, client_ruc, client_name, description, currency, 
            amount, 'Pendiente', is_export || false, new Date().toISOString().split('T')[0], 
            req.user.userId
        ]);

        res.status(201).json({ 
            success: true, 
            invoice: result.rows[0],
            message: 'Factura creada correctamente' 
        });

    } catch (error) {
        console.error('Error creando factura:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ========================================
// Rutas de Estadísticas y Reportes
// ========================================

// Obtener estadísticas del dashboard
app.get('/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const stats = {};

        // Total de ingresos
        const incomeQuery = `
            SELECT COALESCE(SUM(
                CASE 
                    WHEN currency = 'USD' THEN amount * 3.8 
                    ELSE amount 
                END
            ), 0) as total_income
            FROM invoices 
            WHERE deleted_at IS NULL
        `;
        const incomeResult = await pool.query(incomeQuery);
        stats.totalIncome = parseFloat(incomeResult.rows[0].total_income);

        // Facturas pendientes
        const pendingQuery = `
            SELECT COUNT(*) as pending_count
            FROM invoices 
            WHERE status = 'Pendiente' AND deleted_at IS NULL
        `;
        const pendingResult = await pool.query(pendingQuery);
        stats.pendingInvoices = parseInt(pendingResult.rows[0].pending_count);

        // Empleados activos
        const employeesQuery = `
            SELECT COUNT(*) as active_count
            FROM employees 
            WHERE status = 'Activo' AND deleted_at IS NULL
        `;
        const employeesResult = await pool.query(employeesQuery);
        stats.activeEmployees = parseInt(employeesResult.rows[0].active_count);

        // Compliance (siempre 100% por ahora)
        stats.compliance = 100;

        res.json({ success: true, stats });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ========================================
// Rutas de Sistema
// ========================================

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Tecsitel API v4.0 funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Información del sistema
app.get('/system/info', authenticateToken, requireRole(['admin']), (req, res) => {
    res.json({
        success: true,
        system: {
            name: 'Tecsitel',
            version: '4.0',
            environment: process.env.NODE_ENV || 'development',
            database: 'PostgreSQL (Neon)',
            deployment: 'Netlify Functions'
        }
    });
});

// ========================================
// Manejo de errores global
// ========================================
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Ruta 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// ========================================
// Exportar handler para Netlify
// ========================================
module.exports.handler = serverless(app);
