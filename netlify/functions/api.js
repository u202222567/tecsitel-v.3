// ============================================
// TECSITEL V.3 - API BACKEND (Corregido para despliegue)
// Netlify Functions
// ============================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const serverless = require('serverless-http');
// Se eliminó: const rateLimit = require('express-rate-limit');

// --- Configuración desde variables de entorno con valores por defecto ---

// JWT
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Seguridad
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

// Base de datos (Netlify inyecta DATABASE_URL desde NETLIFY_DATABASE_URL)
const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

// Configuración de la app
const NODE_ENV = process.env.NODE_ENV || 'development';
const DEBUG_MODE = process.env.DEBUG === 'true';

// Configuración de CORS
const ENABLE_CORS_FLAG = process.env.ENABLE_CORS === 'true';
const CORS_ORIGIN_URL = process.env.CORS_ORIGIN || 'https://tecsitel.netlify.app';

// Configuración de empresa
const COMPANY_RUC = process.env.COMPANY_RUC || '20605908285';
const COMPANY_NAME = process.env.COMPANY_NAME || 'TECSITEL EIRL';
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS || 'Dirección no configurada';

// Valores de Perú
const PERU_UIT = parseFloat(process.env.PERU_UIT) || 5150;
const PERU_RMV = parseFloat(process.env.PERU_RMV) || 1025;
const PERU_ASIGNACION_FAMILIAR = parseFloat(process.env.PERU_ASIGNACION_FAMILIAR) || 102.50;
const PERU_IGV_RATE = parseFloat(process.env.PERU_IGV_RATE) || 0.18;

// URLs de validación externa
const RUC_VALIDATION_URL = process.env.RUC_VALIDATION_URL;
const DNI_VALIDATION_URL = process.env.DNI_VALIDATION_URL;


// --- Inicialización de la App ---

const app = express();

// --- Middlewares ---

// Configuración de CORS
if (ENABLE_CORS_FLAG) {
  app.use(cors({
    origin: CORS_ORIGIN_URL,
    credentials: true
  }));
} else if (NODE_ENV !== 'production') {
  // Permitir localhost en desarrollo si CORS no está explícitamente habilitado
  app.use(cors({
    origin: ['http://localhost:8888', 'http://localhost:3000'],
    credentials: true
  }));
}

// Se eliminó el middleware de rate-limit para solucionar el error de despliegue.
// Para reactivarlo, asegúrate de añadir "express-rate-limit" a tu package.json

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Conexión a Base de Datos ---
let pool = null;
if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  console.warn("Advertencia: No se ha configurado la variable de entorno DATABASE_URL. La API funcionará sin conexión a la base de datos.");
}

// --- Verificación de JWT Secret ---
if (!JWT_SECRET) {
  console.error("Error Crítico: La variable de entorno JWT_SECRET no está definida. La autenticación fallará.");
}


// --- Middleware de Autenticación ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Error de verificación de JWT:', err.message);
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
};

// ========================================
// RUTAS DE AUTENTICACIÓN
// ========================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    const users = {
      'admin': {
        id: 1,
        username: 'admin',
        passwordHash: await bcrypt.hash(process.env.DB_PASSWORD || 'admin123', BCRYPT_ROUNDS),
        role: 'administrador',
        name: 'Administrador'
      },
      'demo': {
        id: 2,
        username: 'demo',
        passwordHash: await bcrypt.hash('demo', BCRYPT_ROUNDS),
        role: 'usuario',
        name: 'Usuario Demo'
      }
    };

    const user = users[username];
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, name: user.name }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ========================================
// RUTAS DE CONFIGURACIÓN
// ========================================

app.get('/api/config', authenticateToken, (req, res) => {
  try {
    const config = {
      version: '3.0.2-env',
      peru: {
        uit: PERU_UIT,
        rmv: PERU_RMV,
        asignacionFamiliar: PERU_ASIGNACION_FAMILIAR,
        igvRate: PERU_IGV_RATE
      },
      empresa: {
        ruc: COMPANY_RUC,
        razonSocial: COMPANY_NAME,
        direccion: COMPANY_ADDRESS
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
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});


// ========================================
// RUTAS DE VALIDACIÓN (con placeholder para API externa)
// ========================================

app.post('/api/validate/ruc', async (req, res) => {
    const { ruc } = req.body;
    if (!ruc || !/^\d{11}$/.test(ruc)) {
        return res.status(400).json({ valid: false, error: 'RUC debe tener 11 dígitos' });
    }

    if (RUC_VALIDATION_URL) {
        return res.status(501).json({ message: 'La validación externa de RUC no está implementada aún.', url: RUC_VALIDATION_URL });
    }

    res.json({
        valid: true,
        ruc: ruc,
        razonSocial: 'EMPRESA DEMO (DATOS SIMULADOS)',
        message: 'RUC válido (simulado)'
    });
});

// ========================================
// RUTAS DE DATOS (CRUD BÁSICO)
// ========================================

if (pool) {
  app.get('/api/invoices', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100');
      res.json(result.rows);
    } catch (error) {
      console.error('Error obteniendo facturas:', error);
      res.status(500).json({ error: 'Error al obtener facturas' });
    }
  });

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

  app.get('/api/employees', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM employees ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (error) {
      console.error('Error obteniendo empleados:', error);
      res.status(500).json({ error: 'Error al obtener empleados' });
    }
  });
}


// ========================================
// RUTA DE SALUD
// ========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    version: '3.0.2-env',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    database: pool ? 'connected' : 'not configured',
  });
});

// ========================================
// MANEJO DE ERRORES
// ========================================

app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint no encontrado',
    path: req.path,
    method: req.method 
  });
});

app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: DEBUG_MODE ? error.message : 'Ocurrió un problema inesperado.'
  });
});

// ========================================
// EXPORTAR HANDLER PARA NETLIFY
// ========================================

module.exports.handler = serverless(app);
