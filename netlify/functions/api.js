// ============================================
// TECSITEL V.3 - API BACKEND
// Netlify Functions
// ============================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const serverless = require('serverless-http');

// Crear aplicación Express
const app = express();

// Configuración de middlewares
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tecsitel-v3.netlify.app', 'https://tu-dominio.com']
    : ['http://localhost:8888', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de base de datos (opcional)
let pool = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'tecsitel-secret-key-2024';

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// ========================================
// RUTAS DE AUTENTICACIÓN
// ========================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validación básica
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Usuario y contraseña son requeridos' 
      });
    }

    // Usuarios por defecto (en producción usar base de datos)
    const users = {
      'admin': {
        id: 1,
        username: 'admin',
        password: await bcrypt.hash('admin123', 12),
        role: 'administrador',
        name: 'Administrador'
      },
      'demo': {
        id: 2,
        username: 'demo',
        password: await bcrypt.hash('demo', 12),
        role: 'usuario',
        name: 'Usuario Demo'
      },
      'contador': {
        id: 3,
        username: 'contador',
        password: await bcrypt.hash('contador123', 12),
        role: 'contador',
        name: 'Contador'
      },
      'rrhh': {
        id: 4,
        username: 'rrhh',
        password: await bcrypt.hash('rrhh123', 12),
        role: 'rrhh',
        name: 'Recursos Humanos'
      }
    };

    const user = users[username];
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Crear token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
});

// Verificar token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// ========================================
// RUTAS DE VALIDACIÓN
// ========================================

// Validar RUC
app.post('/api/validate/ruc', (req, res) => {
  try {
    const { ruc } = req.body;

    if (!ruc || !/^\d{11}$/.test(ruc)) {
      return res.status(400).json({ 
        valid: false, 
        error: 'RUC debe tener 11 dígitos' 
      });
    }

    // Algoritmo de validación de RUC
    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, weight, i) => acc + weight * parseInt(ruc[i]), 0);
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;
    const isValid = checkDigit === parseInt(ruc[10]);

    // Datos simulados para demo
    const mockData = {
      '20123456789': {
        razonSocial: 'TECSITEL S.A.C.',
        direccion: 'AV. EJEMPLO 123, LIMA',
        estado: 'ACTIVO'
      },
      '20100000001': {
        razonSocial: 'EMPRESA DEMO S.A.C.',
        direccion: 'JR. DEMO 456, LIMA',
        estado: 'ACTIVO'
      }
    };

    const company = mockData[ruc];

    res.json({
      valid: isValid,
      ruc: ruc,
      razonSocial: company?.razonSocial || 'EMPRESA NO ENCONTRADA',
      direccion: company?.direccion || '',
      estado: company?.estado || 'NO ENCONTRADO',
      message: isValid ? 'RUC válido' : 'RUC inválido'
    });

  } catch (error) {
    console.error('Error validando RUC:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'Error al validar RUC' 
    });
  }
});

// Validar DNI
app.post('/api/validate/dni', (req, res) => {
  try {
    const { dni } = req.body;

    if (!dni || !/^\d{8}$/.test(dni)) {
      return res.status(400).json({ 
        valid: false, 
        error: 'DNI debe tener 8 dígitos' 
      });
    }

    // Datos simulados para demo
    const mockData = {
      '12345678': {
        nombres: 'JUAN CARLOS',
        apellidos: 'PEREZ RODRIGUEZ'
      },
      '87654321': {
        nombres: 'MARIA TERESA',
        apellidos: 'GARCIA LOPEZ'
      }
    };

    const person = mockData[dni];

    res.json({
      valid: true,
      dni: dni,
      nombres: person?.nombres || 'NOMBRES NO ENCONTRADOS',
      apellidos: person?.apellidos || 'APELLIDOS NO ENCONTRADOS',
      message: person ? 'DNI encontrado' : 'DNI válido pero no encontrado en base de datos'
    });

  } catch (error) {
    console.error('Error validando DNI:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'Error al validar DNI' 
    });
  }
});

// ========================================
// RUTAS DE CONFIGURACIÓN
// ========================================

// Obtener configuración del sistema
app.get('/api/config', authenticateToken, (req, res) => {
  try {
    const config = {
      version: '3.0.1',
      peru: {
        uit: 5150,
        rmv: 1025,
        asignacionFamiliar: 102.50,
        igvRate: 0.18
      },
      empresa: {
        ruc: process.env.COMPANY_RUC || '20123456789',
        razonSocial: process.env.COMPANY_NAME || 'TECSITEL S.A.C.',
        direccion: process.env.COMPANY_ADDRESS || 'AV. EJEMPLO 123, LIMA'
      },
      tasas: {
        essalud: 0.09,
        onp: 0.13,
        afp: {
          prima: 0.0125,
          comision: 0.0069
        },
        senati: 0.0075
      }
    };

    res.json(config);
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ 
      error: 'Error al obtener configuración' 
    });
  }
});

// ========================================
// RUTAS DE REPORTES
// ========================================

// Generar reporte de facturación
app.post('/api/reports/invoices', authenticateToken, (req, res) => {
  try {
    const { startDate, endDate, currency } = req.body;

    // Simulación de datos para demo
    const mockInvoices = [
      {
        id: 1,
        invoice_number: 'F001-00000001',
        date: '2024-01-15',
        clientName: 'CLIENTE DEMO S.A.C.',
        clientRuc: '20100000001',
        amount: 1000.00,
        currency: 'PEN',
        igv: 180.00,
        total: 1180.00
      },
      {
        id: 2,
        invoice_number: 'F001-00000002',
        date: '2024-01-16',
        clientName: 'EXPORTADORA PERU S.A.C.',
        clientRuc: '20200000002',
        amount: 5000.00,
        currency: 'USD',
        igv: 0.00,
        total: 5000.00
      }
    ];

    const report = {
      periodo: `${startDate} - ${endDate}`,
      totalFacturas: mockInvoices.length,
      montoTotal: mockInvoices.reduce((sum, inv) => sum + inv.total, 0),
      igvTotal: mockInvoices.reduce((sum, inv) => sum + inv.igv, 0),
      facturas: mockInvoices
    };

    res.json(report);
  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ 
      error: 'Error al generar reporte' 
    });
  }
});

// ========================================
// RUTAS DE EXPORTACIÓN
// ========================================

// Exportar PLE
app.post('/api/export/ple', authenticateToken, (req, res) => {
  try {
    const { libro, periodo } = req.body;

    // Simulación de contenido PLE
    const pleContent = `${periodo}|20123456789|TECSITEL S.A.C.|030100|0000000001|${new Date().toISOString().split('T')[0].replace(/-/g, '')}|AST001|M001|1041||||||${new Date().toISOString().split('T')[0].replace(/-/g, '')}|${new Date().toISOString().split('T')[0].replace(/-/g, '')}|||Apertura de cuenta corriente|10000.00|0.00||1
${periodo}|20123456789|TECSITEL S.A.C.|030100|0000000002|${new Date().toISOString().split('T')[0].replace(/-/g, '')}|AST001|M001|5011||||||${new Date().toISOString().split('T')[0].replace(/-/g, '')}|${new Date().toISOString().split('T')[0].replace(/-/g, '')}|||Apertura de cuenta corriente|0.00|10000.00||1`;

    res.json({
      filename: `LE20123456789${periodo}${libro}00001111.txt`,
      content: pleContent,
      size: pleContent.length
    });
  } catch (error) {
    console.error('Error exportando PLE:', error);
    res.status(500).json({ 
      error: 'Error al exportar PLE' 
    });
  }
});

// Exportar PLAME
app.post('/api/export/plame', authenticateToken, (req, res) => {
  try {
    const { periodo } = req.body;

    const plameFiles = {
      rem: `12345678|05|0000000001|01||${periodo.replace('-', '')}|01|1025.00|0.00|92.25|1`,
      per: `1|12345678|PEREZ|RODRIGUEZ|JUAN|19900101|M|0000|||AV. EJEMPLO 123|1`,
      est: `20123456789|TECSITEL S.A.C.|1|${periodo.replace('-', '')}|1`,
      ide: `20123456789|TECSITEL S.A.C.|AV. EJEMPLO 123|LIMA|LIMA|LIMA|1`
    };

    res.json({
      files: plameFiles,
      periodo: periodo
    });
  } catch (error) {
    console.error('Error exportando PLAME:', error);
    res.status(500).json({ 
      error: 'Error al exportar PLAME' 
    });
  }
});

// ========================================
// RUTAS DE DATOS (CRUD BÁSICO)
// ========================================

// Si hay base de datos configurada, agregar rutas CRUD
if (pool) {
  
  // Obtener facturas
  app.get('/api/invoices', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100');
      res.json(result.rows);
    } catch (error) {
      console.error('Error obteniendo facturas:', error);
      res.status(500).json({ error: 'Error al obtener facturas' });
    }
  });

  // Crear factura
  app.post('/api/invoices', authenticateToken, async (req, res) => {
    try {
      const { invoice_number, client_ruc, client_name, amount, currency, is_export } = req.body;
      
      const result = await pool.query(
        'INSERT INTO invoices (invoice_number, client_ruc, client_name, amount, currency, is_export, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [invoice_number, client_ruc, client_name, amount, currency, is_export, req.user.id]
      );
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creando factura:', error);
      res.status(500).json({ error: 'Error al crear factura' });
    }
  });

  // Obtener empleados
  app.get('/api/employees', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM employees ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (error) {
      console.error('Error obteniendo empleados:', error);
      res.status(500).json({ error: 'Error al obtener empleados' });
    }
  });

  // Crear empleado
  app.post('/api/employees', authenticateToken, async (req, res) => {
    try {
      const { dni, first_name, last_name, position, salary } = req.body;
      
      const result = await pool.query(
        'INSERT INTO employees (dni, first_name, last_name, position, salary, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [dni, first_name, last_name, position, salary, req.user.id]
      );
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creando empleado:', error);
      res.status(500).json({ error: 'Error al crear empleado' });
    }
  });
}

// ========================================
// RUTA DE SALUD
// ========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    version: '3.0.1',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: pool ? 'connected' : 'not configured'
  });
});

// ========================================
// MANEJO DE ERRORES
// ========================================

// Ruta no encontrada
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint no encontrado',
    path: req.path,
    method: req.method 
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
  });
});

// ========================================
// EXPORTAR HANDLER PARA NETLIFY
// ========================================

module.exports.handler = serverless(app);