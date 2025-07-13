const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

// ========================================
// Configuración mejorada para Neon
// ========================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 5, // Límite de conexiones para Neon
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
    query_timeout: 30000,
});

// Manejar errores de conexión del pool
pool.on('error', (err, client) => {
    console.error('Error inesperado en cliente de DB:', err);
});

// ========================================
// Middleware
// ========================================
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ========================================
// Middleware de autenticación mejorado
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

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
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

// Middleware de roles mejorado
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
// Test de conexión a DB mejorado
// ========================================
app.get('/test-db', async (req, res) => {
    let client;
    try {
        console.log('Iniciando prueba de conexión a Neon...');
        console.log('Database URL exists:', !!process.env.DATABASE_URL);
        console.log('Database URL preview:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NO URL');
        
        client = await pool.connect();
        console.log('✅ Cliente conectado exitosamente');
        
        // Test básico
        const timeResult = await client.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ Query de prueba ejecutada');
        
        // Test de tablas
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'employees', 'invoices', 'time_entries')
            ORDER BY table_name
        `);
        
        // Test de usuarios
        const usersResult = await client.query('SELECT COUNT(*) as user_count FROM users');
        
        res.json({ 
            success: true, 
            message: '🎉 Conexión a Neon exitosa!',
            data: {
                current_time: timeResult.rows[0].current_time,
                postgres_version: timeResult.rows[0].pg_version.split(' ')[0],
                tables_found: tablesResult.rows.map(row => row.table_name),
                user_count: parseInt(usersResult.rows[0].user_count),
                pool_stats: {
                    total_connections: pool.totalCount,
                    idle_connections: pool.idleCount,
                    waiting_count: pool.waitingCount
                }
            }
        });
    } catch (error) {
        console.error('❌ Error en test de conexión:', error);
        
        let errorDetails = {
            message: error.message,
            code: error.code,
            detail: error.detail
        };
        
        // Errores específicos de Neon/PostgreSQL
        if (error.code === 'ENOTFOUND') {
            errorDetails.suggestion = 'Verificar que DATABASE_URL esté configurada correctamente';
        } else if (error.code === '28000') {
            errorDetails.suggestion = 'Credenciales de autenticación incorrectas';
        } else if (error.code === '3D000') {
            errorDetails.suggestion = 'Base de datos no existe';
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al conectar con Neon',
            error: errorDetails
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// ========================================
// Función auxiliar para ejecutar queries con manejo de errores
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
// Rutas de Autenticación
// ========================================
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Usuario y contraseña requeridos' 
            });
        }

        console.log(`Intento de login para usuario: ${username}`);

        // Buscar usuario en la base de datos
        const userQuery = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
        const userResult = await executeQuery(userQuery, [username]);

        if (userResult.rows.length === 0) {
            console.log(`Usuario no encontrado: ${username}`);
            return res.status(401).json({ 
                success: false,
                error: 'Usuario no encontrado o inactivo' 
            });
        }

        const user = userResult.rows[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.log(`Contraseña incorrecta para usuario: ${username}`);
            return res.status(401).json({ 
                success: false,
                error: 'Contraseña incorrecta' 
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
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        // Actualizar último login
        await executeQuery(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        console.log(`✅ Login exitoso para usuario: ${username}`);

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

// Logout
app.post('/auth/logout', authenticateToken, async (req, res) => {
    try {
        res.json({ 
            success: true, 
            message: 'Sesión cerrada correctamente' 
        });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// Verificar token
app.get('/auth/verify', authenticateToken, async (req, res) => {
    try {
        // Obtener datos frescos del usuario
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
                permissions: user.permissions
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

// ========================================
// Rutas de Empleados
// ========================================
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

app.post('/employees', authenticateToken, requireRole(['admin', 'rrhh']), async (req, res) => {
    try {
        const { dni, first_name, last_name, status, notes } = req.body;

        if (!dni || !first_name || !last_name || !status) {
            return res.status(400).json({ 
                success: false,
                error: 'DNI, nombre, apellido y estado son requeridos' 
            });
        }

        // Verificar formato de DNI
        if (!/^[0-9]{8}$/.test(dni)) {
            return res.status(400).json({ 
                success: false,
                error: 'DNI debe tener 8 dígitos' 
            });
        }

        // Verificar si el empleado ya existe
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
// Rutas de Registro de Tiempo
// ========================================
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
// Rutas de Facturas
// ========================================
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

app.post('/invoices', authenticateToken, requireRole(['admin', 'contabilidad']), async (req, res) => {
    try {
        const { client_ruc, client_name, description, currency, amount, is_export } = req.body;

        if (!client_ruc || !client_name || !description || !currency || !amount) {
            return res.status(400).json({ 
                success: false,
                error: 'Todos los campos son requeridos' 
            });
        }

        // Verificar formato de RUC
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
// Rutas de Estadísticas y Reportes
// ========================================
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
            WHERE deleted_at IS NULL AND status != 'Anulado'
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
// Rutas de Sistema
// ========================================
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Tecsitel API v4.0 funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/system/info', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        // Obtener info de la base de datos
        const dbInfo = await executeQuery('SELECT version() as version');
        
        res.json({
            success: true,
            system: {
                name: 'Tecsitel',
                version: '4.0',
                environment: process.env.NODE_ENV || 'development',
                database: 'PostgreSQL (Neon)',
                database_version: dbInfo.rows[0].version.split(' ')[0],
                deployment: 'Netlify Functions',
                pool_stats: {
                    total_connections: pool.totalCount,
                    idle_connections: pool.idleCount,
                    waiting_count: pool.waitingCount
                }
            }
        });
    } catch (error) {
        console.error('Error obteniendo info del sistema:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// ========================================
// Manejo de errores global
// ========================================
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
        path: req.originalUrl 
    });
});

// ========================================
// Graceful shutdown
// ========================================
process.on('SIGTERM', async () => {
    console.log('Cerrando pool de conexiones...');
    await pool.end();
    process.exit(0);
});

// ========================================
// Exportar handler para Netlify
// ========================================
module.exports.handler = serverless(app);
