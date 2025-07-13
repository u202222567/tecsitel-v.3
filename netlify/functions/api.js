const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

// ========================================
// Configuración de Base de Datos PostgreSQL/Neon
// ========================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000,
    query_timeout: 30000,
});

// Manejo de errores del pool
pool.on('error', (err, client) => {
    console.error('Error inesperado en cliente PostgreSQL:', err);
});

// ========================================
// Middleware
// ========================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ========================================
// Función auxiliar para ejecutar queries
// ========================================
async function executeQuery(queryText, params = []) {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(queryText, params);
        return result;
    } catch (error) {
        console.error('Error ejecutando query:', error);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
}

// ========================================
// Middleware de autenticación
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

    jwt.verify(token, process.env.JWT_SECRET || 'tecsitel_secret_key_2025', (err, user) => {
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

// Middleware de roles
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (req.user.role === 'admin' || allowedRoles.includes(req.user.role)) {
            next();
        } else {
            return res.status(403).json({ 
                success: false,
                error: 'Permisos insuficientes' 
            });
        }
    };
};

// ========================================
// RUTAS DE TESTING Y SALUD
// ========================================

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Tecsitel API v4.0 funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Test de conexión a base de datos
app.get('/test-db', async (req, res) => {
    let client;
    try {
        console.log('🔍 Iniciando test de conexión a PostgreSQL/Neon...');
        
        // Verificar variables de entorno
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL no está configurada');
        }
        
        console.log('📊 DATABASE_URL configurada correctamente');
        
        // Conectar a la base de datos
        client = await pool.connect();
        console.log('✅ Conexión a PostgreSQL establecida');
        
        // Test básico
        const timeResult = await client.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ Query de tiempo ejecutada');
        
        // Verificar tablas
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'employees', 'invoices', 'time_entries')
            ORDER BY table_name
        `);
        
        // Contar usuarios
        let userCount = 0;
        try {
            const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
            userCount = parseInt(usersResult.rows[0].count);
        } catch (error) {
            console.log('⚠️ Tabla users no existe o está vacía');
        }
        
        res.json({ 
            success: true, 
            message: '🎉 Conexión a PostgreSQL/Neon exitosa',
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
                environment: process.env.NODE_ENV || 'development'
            }
        });
        
    } catch (error) {
        console.error('❌ Error en test de DB:', error);
        
        let errorDetails = {
            message: error.message,
            code: error.code,
            type: 'Database Connection Error'
        };
        
        if (error.code === 'ENOTFOUND') {
            errorDetails.suggestion = 'Verificar que DATABASE_URL sea correcta';
        } else if (error.code === '28000') {
            errorDetails.suggestion = 'Credenciales de autenticación incorrectas';
        } else if (error.code === '3D000') {
            errorDetails.suggestion = 'Base de datos no existe';
        } else if (error.message.includes('DATABASE_URL')) {
            errorDetails.suggestion = 'Configurar variable de entorno DATABASE_URL en Netlify';
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error conectando con PostgreSQL/Neon',
            error: errorDetails
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// Inicializar base de datos
app.post('/init-db', async (req, res) => {
    try {
        console.log('🚀 Inicializando base de datos...');
        
        // Crear usuarios demo si no existen
        const users = [
            { username: 'admin', password: 'admin123', name: 'Administrador General', role: 'admin' },
            { username: 'contabilidad', password: 'conta123', name: 'Usuario Contabilidad', role: 'contabilidad' },
            { username: 'rrhh', password: 'rrhh123', name: 'Usuario Recursos Humanos', role: 'rrhh' },
            { username: 'supervisor', password: 'super123', name: 'Usuario Supervisor', role: 'supervisor' }
        ];
        
        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await executeQuery(`
                INSERT INTO users (username, password_hash, full_name, role, permissions)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (username) DO NOTHING
            `, [user.username, hashedPassword, user.name, user.role, JSON.stringify(getPermissionsByRole(user.role))]);
        }
        
        console.log('✅ Usuarios demo creados');
        
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

// ========================================
// RUTAS DE AUTENTICACIÓN
// ========================================

// Login
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Usuario y contraseña requeridos' 
            });
        }

        console.log(`🔐 Intento de login para: ${username}`);

        // Buscar usuario
        const userQuery = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
        const userResult = await executeQuery(userQuery, [username]);

        if (userResult.rows.length === 0) {
            console.log(`❌ Usuario no encontrado: ${username}`);
            return res.status(401).json({ 
                success: false,
                error: 'Credenciales incorrectas' 
            });
        }

        const user = userResult.rows[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.log(`❌ Contraseña incorrecta para: ${username}`);
            return res.status(401).json({ 
                success: false,
                error: 'Credenciales incorrectas' 
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role,
                name: user.full_name 
            },
            process.env.JWT_SECRET || 'tecsitel_secret_key_2025',
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
                permissions: user.permissions || getPermissionsByRole(user.role)
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

// Verificar token
app.get('/auth/verify', authenticateToken, async (req, res) => {
    try {
        const userQuery = 'SELECT id, username, role, full_name, permissions FROM users WHERE id = $1 AND is_active = true';
        const userResult = await executeQuery(userQuery, [req.user.userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ 
                success: false,
                error: 'Usuario no válido' 
            });
        }

        const user = userResult.rows[0];
        
        res.json({ 
            success: true, 
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.full_name,
                permissions: user.permissions || getPermissionsByRole(user.role)
            }
        });
    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// Logout
app.post('/auth/logout', authenticateToken, (req, res) => {
    res.json({ 
        success: true, 
        message: 'Sesión cerrada correctamente' 
    });
});

// ========================================
// RUTAS DE EMPLEADOS
// ========================================

// Obtener empleados
app.get('/employees', authenticateToken, requireRole(['admin', 'rrhh', 'supervisor']), async (req, res) => {
    try {
        const query = `
            SELECT dni, first_name, last_name, status, notes, created_at, updated_at
            FROM employees 
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
        `;
        const result = await executeQuery(query);
        
        res.json({ 
            success: true, 
            employees: result.rows 
        });
    } catch (error) {
        console.error('Error obteniendo empleados:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// Crear empleado
app.post('/employees', authenticateToken, requireRole(['admin', 'rrhh']), async (req, res) => {
    try {
        const { dni, first_name, last_name, status, notes } = req.body;

        if (!dni || !first_name || !last_name || !status) {
            return res.status(400).json({ 
                success: false,
                error: 'DNI, nombre, apellido y estado son requeridos' 
            });
        }

        if (!/^[0-9]{8}$/.test(dni)) {
            return res.status(400).json({ 
                success: false,
                error: 'DNI debe tener 8 dígitos' 
            });
        }

        // Verificar si existe
        const existingEmployee = await executeQuery(
            'SELECT dni FROM employees WHERE dni = $1 AND deleted_at IS NULL', 
            [dni]
        );
        
        if (existingEmployee.rows.length > 0) {
            return res.status(400).json({ 
                success: false,
                error: 'El empleado ya existe' 
            });
        }

        // Insertar empleado
        const insertQuery = `
            INSERT INTO employees (dni, first_name, last_name, status, notes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING dni, first_name, last_name, status, notes, created_at
        `;
        
        const result = await executeQuery(insertQuery, [
            dni, first_name, last_name, status, notes || '', req.user.userId
        ]);

        res.status(201).json({ 
            success: true, 
            employee: result.rows[0],
            message: 'Empleado creado correctamente' 
        });

    } catch (error) {
        console.error('Error creando empleado:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
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
        
        const result = await executeQuery(updateQuery, [
            first_name, last_name, status, notes || '', req.user.userId, dni
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Empleado no encontrado' 
            });
        }

        res.json({ 
            success: true, 
            employee: result.rows[0],
            message: 'Empleado actualizado correctamente' 
        });

    } catch (error) {
        console.error('Error actualizando empleado:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// Eliminar empleado
app.delete('/employees/:dni', authenticateToken, requireRole(['admin', 'rrhh']), async (req, res) => {
    try {
        const { dni } = req.params;

        const deleteQuery = `
            UPDATE employees 
            SET deleted_at = NOW(), deleted_by = $1
            WHERE dni = $2 AND deleted_at IS NULL
            RETURNING dni, first_name, last_name
        `;
        
        const result = await executeQuery(deleteQuery, [req.user.userId, dni]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Empleado no encontrado' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Empleado eliminado correctamente' 
        });

    } catch (error) {
        console.error('Error eliminando empleado:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// ========================================
// RUTAS DE FACTURAS
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
            LIMIT 100
        `;
        const result = await executeQuery(query);
        
        res.json({ 
            success: true, 
            invoices: result.rows 
        });
    } catch (error) {
        console.error('Error obteniendo facturas:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// Crear factura
app.post('/invoices', authenticateToken, requireRole(['admin', 'contabilidad']), async (req, res) => {
    try {
        const { client_ruc, client_name, description, currency, amount, is_export } = req.body;

        if (!client_ruc || !client_name || !description || !currency || !amount) {
            return res.status(400).json({ 
                success: false,
                error: 'Todos los campos son requeridos' 
            });
        }

        if (!/^[0-9]{11}$/.test(client_ruc)) {
            return res.status(400).json({ 
                success: false,
                error: 'RUC debe tener 11 dígitos' 
            });
        }

        // Generar número de factura
        const lastInvoice = await executeQuery(
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
        
        const result = await executeQuery(insertQuery, [
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
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// Eliminar factura
app.delete('/invoices/:id', authenticateToken, requireRole(['admin', 'contabilidad']), async (req, res) => {
    try {
        const { id } = req.params;

        const deleteQuery = `
            UPDATE invoices 
            SET deleted_at = NOW(), deleted_by = $1
            WHERE id = $2 AND deleted_at IS NULL
            RETURNING id, invoice_number
        `;
        
        const result = await executeQuery(deleteQuery, [req.user.userId, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Factura no encontrada' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Factura eliminada correctamente' 
        });

    } catch (error) {
        console.error('Error eliminando factura:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// ========================================
// RUTAS DE REGISTRO DE TIEMPO
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
            JOIN employees e ON te.employee_dni = e.dni AND e.deleted_at IS NULL
            WHERE te.deleted_at IS NULL
        `;
        
        const queryParams = [];
        let paramCount = 1;

        if (date) {
            query += ` AND te.entry_date = ${paramCount}`;
            queryParams.push(date);
            paramCount++;
        }

        if (employee_dni) {
            query += ` AND te.employee_dni = ${paramCount}`;
            queryParams.push(employee_dni);
            paramCount++;
        }

        query += ' ORDER BY te.entry_date DESC, te.entry_time DESC LIMIT 100';

        const result = await executeQuery(query, queryParams);
        
        res.json({ 
            success: true, 
            timeEntries: result.rows 
        });

    } catch (error) {
        console.error('Error obteniendo registros de tiempo:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// Crear registro de tiempo
app.post('/time-entries', authenticateToken, requireRole(['admin', 'rrhh', 'supervisor']), async (req, res) => {
    try {
        const { employee_dni, entry_date, entry_time, exit_time, notes } = req.body;

        if (!employee_dni || !entry_date) {
            return res.status(400).json({ 
                success: false,
                error: 'DNI del empleado y fecha son requeridos' 
            });
        }

        // Verificar que el empleado existe
        const employeeCheck = await executeQuery(
            'SELECT dni FROM employees WHERE dni = $1 AND deleted_at IS NULL', 
            [employee_dni]
        );
        
        if (employeeCheck.rows.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Empleado no encontrado' 
            });
        }

        // Verificar si ya existe un registro para esta fecha
        const existingEntry = await executeQuery(
            'SELECT id FROM time_entries WHERE employee_dni = $1 AND entry_date = $2 AND deleted_at IS NULL',
            [employee_dni, entry_date]
        );

        if (existingEntry.rows.length > 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Ya existe un registro para este empleado en esta fecha' 
            });
        }

        // Insertar registro
        const insertQuery = `
            INSERT INTO time_entries (employee_dni, entry_date, entry_time, exit_time, notes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, employee_dni, entry_date, entry_time, exit_time, notes, created_at
        `;
        
        const result = await executeQuery(insertQuery, [
            employee_dni, entry_date, entry_time, exit_time, notes || '', req.user.userId
        ]);

        res.status(201).json({ 
            success: true, 
            timeEntry: result.rows[0],
            message: 'Registro de tiempo creado correctamente' 
        });

    } catch (error) {
        console.error('Error creando registro de tiempo:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
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
        
        const result = await executeQuery(updateQuery, [
            entry_time, exit_time, notes || '', req.user.userId, id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Registro no encontrado' 
            });
        }

        res.json({ 
            success: true, 
            timeEntry: result.rows[0],
            message: 'Registro actualizado correctamente' 
        });

    } catch (error) {
        console.error('Error actualizando registro de tiempo:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// Eliminar registro de tiempo
app.delete('/time-entries/:id', authenticateToken, requireRole(['admin', 'rrhh', 'supervisor']), async (req, res) => {
    try {
        const { id } = req.params;

        const deleteQuery = `
            UPDATE time_entries 
            SET deleted_at = NOW(), deleted_by = $1
            WHERE id = $2 AND deleted_at IS NULL
            RETURNING id
        `;
        
        const result = await executeQuery(deleteQuery, [req.user.userId, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Registro no encontrado' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Registro eliminado correctamente' 
        });

    } catch (error) {
        console.error('Error eliminando registro:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// ========================================
// RUTAS DE ESTADÍSTICAS Y DASHBOARD
// ========================================

// Obtener estadísticas del dashboard
app.get('/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const stats = {};

        // Total de ingresos (convertir USD a PEN)
        const incomeQuery = `
            SELECT COALESCE(SUM(
                CASE 
                    WHEN currency = 'USD' THEN amount * 3.8 
                    ELSE amount 
                END
            ), 0) as total_income
            FROM invoices 
            WHERE deleted_at IS NULL AND status = 'Pagado'
        `;
        const incomeResult = await executeQuery(incomeQuery);
        stats.totalIncome = parseFloat(incomeResult.rows[0].total_income);

        // Facturas pendientes
        const pendingQuery = `
            SELECT COUNT(*) as pending_count
            FROM invoices 
            WHERE status = 'Pendiente' AND deleted_at IS NULL
        `;
        const pendingResult = await executeQuery(pendingQuery);
        stats.pendingInvoices = parseInt(pendingResult.rows[0].pending_count);

        // Empleados activos
        const employeesQuery = `
            SELECT COUNT(*) as active_count
            FROM employees 
            WHERE status = 'Activo' AND deleted_at IS NULL
        `;
        const employeesResult = await executeQuery(employeesQuery);
        stats.activeEmployees = parseInt(employeesResult.rows[0].active_count);

        // Compliance (siempre 100% por ahora)
        stats.compliance = 100;

        // Estadísticas adicionales
        const totalInvoicesQuery = `
            SELECT COUNT(*) as total_count
            FROM invoices 
            WHERE deleted_at IS NULL
        `;
        const totalInvoicesResult = await executeQuery(totalInvoicesQuery);
        stats.totalInvoices = parseInt(totalInvoicesResult.rows[0].total_count);

        const totalEmployeesQuery = `
            SELECT COUNT(*) as total_count
            FROM employees 
            WHERE deleted_at IS NULL
        `;
        const totalEmployeesResult = await executeQuery(totalEmployeesQuery);
        stats.totalEmployees = parseInt(totalEmployeesResult.rows[0].total_count);

        res.json({ 
            success: true, 
            stats 
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// ========================================
// FUNCIONES AUXILIARES
// ========================================

// Obtener permisos por rol
function getPermissionsByRole(role) {
    const permissions = {
        'admin': ['all'],
        'contabilidad': ['dashboard', 'invoices', 'accounting', 'compliance', 'sharepoint'],
        'rrhh': ['dashboard', 'personnel', 'timetracking', 'compliance', 'sharepoint'],
        'supervisor': ['dashboard', 'timetracking']
    };
    
    return permissions[role] || [];
}

// ========================================
// MANEJO DE ERRORES GLOBAL
// ========================================

// Error handler
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Ha ocurrido un error inesperado'
    });
});

// Ruta 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        available_routes: [
            'GET /health',
            'GET /test-db',
            'POST /init-db',
            'POST /auth/login',
            'GET /auth/verify',
            'POST /auth/logout',
            'GET /employees',
            'POST /employees',
            'PUT /employees/:dni',
            'DELETE /employees/:dni',
            'GET /invoices',
            'POST /invoices',
            'DELETE /invoices/:id',
            'GET /time-entries',
            'POST /time-entries',
            'PUT /time-entries/:id',
            'DELETE /time-entries/:id',
            'GET /dashboard/stats'
        ]
    });
});

// ========================================
// GRACEFUL SHUTDOWN
// ========================================
process.on('SIGTERM', async () => {
    console.log('Cerrando pool de conexiones PostgreSQL...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Cerrando pool de conexiones PostgreSQL...');
    await pool.end();
    process.exit(0);
});

// ========================================
// EXPORTAR HANDLER PARA NETLIFY
// ========================================
module.exports.handler = serverless(app);
