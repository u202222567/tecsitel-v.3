// netlify/functions/api.js - Backend completo para TECSITEL
const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

// Configuración de middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

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

// ====================================
// RUTAS DE AUTENTICACIÓN
// ====================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    // Buscar usuario en la base de datos
    const userQuery = 'SELECT * FROM users WHERE username = $1 AND active = true';
    const userResult = await pool.query(userQuery, [username]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = userResult.rows[0];

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        company_id: user.company_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Registrar último acceso
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
        full_name: user.full_name,
        role: user.role,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ====================================
// RUTAS DE USUARIOS
// ====================================

// Obtener perfil de usuario
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const userQuery = 'SELECT id, username, full_name, email, role, created_at FROM users WHERE id = $1';
    const result = await pool.query(userQuery, [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ====================================
// RUTAS DE FACTURAS
// ====================================

// Obtener facturas
app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const invoicesQuery = `
      SELECT 
        i.*,
        c.name as client_name,
        c.ruc as client_ruc
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.company_id = $1
      ORDER BY i.created_at DESC
    `;
    
    const result = await pool.query(invoicesQuery, [req.user.company_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo facturas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nueva factura
app.post('/api/invoices', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      client_id,
      invoice_number,
      issue_date,
      due_date,
      items,
      subtotal,
      igv,
      total,
      notes
    } = req.body;

    // Insertar factura
    const invoiceQuery = `
      INSERT INTO invoices (
        company_id, client_id, invoice_number, issue_date, due_date,
        subtotal, igv, total, notes, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const invoiceResult = await client.query(invoiceQuery, [
      req.user.company_id,
      client_id,
      invoice_number,
      issue_date,
      due_date,
      subtotal,
      igv,
      total,
      notes,
      'draft',
      req.user.id
    ]);

    const invoiceId = invoiceResult.rows[0].id;

    // Insertar items de factura
    for (const item of items) {
      await client.query(
        `INSERT INTO invoice_items 
         (invoice_id, description, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [invoiceId, item.description, item.quantity, item.unit_price, item.total_price]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(invoiceResult.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creando factura:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// ====================================
// RUTAS DE PERSONAL
// ====================================

// Obtener empleados
app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const employeesQuery = `
      SELECT * FROM employees 
      WHERE company_id = $1 
      ORDER BY last_name, first_name
    `;
    
    const result = await pool.query(employeesQuery, [req.user.company_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo empleados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear empleado
app.post('/api/employees', authenticateToken, async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      dni,
      email,
      phone,
      position,
      department,
      salary,
      hire_date,
      status
    } = req.body;

    const employeeQuery = `
      INSERT INTO employees (
        company_id, first_name, last_name, dni, email, phone,
        position, department, salary, hire_date, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await pool.query(employeeQuery, [
      req.user.company_id,
      first_name,
      last_name,
      dni,
      email,
      phone,
      position,
      department,
      salary,
      hire_date,
      status,
      req.user.id
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando empleado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ====================================
// RUTAS DE REPORTES Y EXPORTACIÓN
// ====================================

// Exportar datos
app.get('/api/export/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;

    let query;
    let filename;

    switch (type) {
      case 'invoices':
        query = `
          SELECT 
            i.invoice_number,
            i.issue_date,
            i.due_date,
            c.name as client_name,
            c.ruc as client_ruc,
            i.subtotal,
            i.igv,
            i.total,
            i.status
          FROM invoices i
          LEFT JOIN clients c ON i.client_id = c.id
          WHERE i.company_id = $1
          ORDER BY i.issue_date DESC
        `;
        filename = 'facturas';
        break;

      case 'employees':
        query = `
          SELECT 
            first_name,
            last_name,
            dni,
            email,
            phone,
            position,
            department,
            salary,
            hire_date,
            status
          FROM employees
          WHERE company_id = $1
          ORDER BY last_name, first_name
        `;
        filename = 'empleados';
        break;

      default:
        return res.status(400).json({ error: 'Tipo de exportación no válido' });
    }

    const result = await pool.query(query, [req.user.company_id]);

    if (format === 'csv') {
      // Convertir a CSV
      const csv = convertToCSV(result.rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else {
      res.json({
        data: result.rows,
        count: result.rows.length,
        exported_at: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error en exportación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ====================================
// FUNCIONES AUXILIARES
// ====================================

function convertToCSV(data) {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      // Escapar comillas y envolver en comillas si contiene comas
      return typeof value === 'string' && value.includes(',') 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}

// ====================================
// MANEJO DE ERRORES GLOBAL
// ====================================

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Ruta por defecto
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

module.exports.handler = serverless(app);
