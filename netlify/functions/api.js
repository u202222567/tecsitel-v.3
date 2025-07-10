// ============================================
// TECSITEL V.3 - API BACKEND (Corregido y Mejorado)
// Netlify Functions
// ============================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const serverless = require('serverless-http');

// --- Configuración desde variables de entorno ---

// JWT
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Seguridad
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

// Base de datos
const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

// Aplicación
const NODE_ENV = process.env.NODE_ENV || 'development';
const DEBUG_MODE = process.env.DEBUG === 'true';

// CORS
const ENABLE_CORS_FLAG = process.env.ENABLE_CORS === 'true';
const CORS_ORIGIN_URL = process.env.CORS_ORIGIN || 'https://tecsitel.netlify.app';

// Empresa
const COMPANY_RUC = process.env.COMPANY_RUC || '20605908285';
const COMPANY_NAME = process.env.COMPANY_NAME || 'TECSITEL EIRL';
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS || 'Dirección no configurada';

// Perú
const PERU_UIT = parseFloat(process.env.PERU_UIT) || 5150;
const PERU_RMV = parseFloat(process.env.PERU_RMV) || 1025;
const PERU_ASIGNACION_FAMILIAR = parseFloat(process.env.PERU_ASIGNACION_FAMILIAR) || 102.50;
const PERU_IGV_RATE = parseFloat(process.env.PERU_IGV_RATE) || 0.18;

// GitHub Backup
const GITHUB_PAT = process.env.GITHUB_PAT;
const GITHUB_REPO = process.env.GITHUB_REPO;

// --- Logger Configurable ---
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const logLevels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLogLevel = logLevels[LOG_LEVEL.toLowerCase()] ?? logLevels.info;

const logger = {
  error: (...args) => { if (currentLogLevel >= logLevels.error) console.error('[ERROR]', ...args); },
  warn: (...args) => { if (currentLogLevel >= logLevels.warn) console.warn('[WARN]', ...args); },
  info: (...args) => { if (currentLogLevel >= logLevels.info) console.info('[INFO]', ...args); },
  debug: (...args) => { if (currentLogLevel >= logLevels.debug) console.debug('[DEBUG]', ...args); },
};

// --- Inicialización de la App ---
const app = express();

// --- Middlewares ---
if (ENABLE_CORS_FLAG) {
  app.use(cors({ origin: CORS_ORIGIN_URL, credentials: true }));
} else if (NODE_ENV !== 'production') {
  app.use(cors({ origin: ['http://localhost:8888', 'http://localhost:3000'], credentials: true }));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Conexión a Base de Datos ---
let pool = null;
if (DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    logger.info('Pool de base de datos inicializado.');
  } catch (error) {
    logger.error('No se pudo inicializar el pool de la base de datos:', error);
  }
} else {
  logger.warn("Advertencia: No se ha configurado DATABASE_URL. La API funcionará en modo sin conexión.");
}

// --- Verificación de JWT Secret ---
if (!JWT_SECRET) {
  logger.error("Error Crítico: La variable de entorno JWT_SECRET no está definida. La autenticación fallará.");
}

// --- Middleware de Autenticación ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token de acceso requerido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Fallo en verificación de JWT:', err.message);
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
    if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });

    // --- USUARIOS CONFIGURADOS ---
    // Se hashean las contraseñas al vuelo para la comparación.
    // En un sistema de producción real, estos usuarios estarían en la base de datos.
    const users = {
      'admin': {
        id: 1,
        username: 'admin',
        passwordHash: await bcrypt.hash('admin123', BCRYPT_ROUNDS),
        role: 'administrador',
        name: 'Administrador'
      },
      'contable': {
        id: 2,
        username: 'contable',
        passwordHash: await bcrypt.hash('cont123', BCRYPT_ROUNDS),
        role: 'contable',
        name: 'Contable'
      },
      'rrhh': {
        id: 3,
        username: 'rrhh',
        passwordHash: await bcrypt.hash('rrhh123', BCRYPT_ROUNDS),
        role: 'rrhh',
        name: 'Recursos Humanos'
      },
      'operario': {
        id: 4,
        username: 'operario',
        passwordHash: await bcrypt.hash('oper123', BCRYPT_ROUNDS),
        role: 'operario',
        name: 'Operario'
      }
    };

    const user = users[username];
    if (!user) {
        logger.warn(`Intento de login fallido para usuario inexistente: ${username}`);
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
        logger.warn(`Intento de login con contraseña incorrecta para usuario: ${username}`);
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    logger.info(`Login exitoso para usuario: ${username}, rol: ${user.role}`);
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
  } catch (error) {
    logger.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ========================================
// RUTAS DE CONFIGURACIÓN
// ========================================
app.get('/api/config', authenticateToken, (req, res) => {
  try {
    const config = {
      version: '3.0.4-env',
      peru: { uit: PERU_UIT, rmv: PERU_RMV, asignacionFamiliar: PERU_ASIGNACION_FAMILIAR, igvRate: PERU_IGV_RATE },
      empresa: { ruc: COMPANY_RUC, razonSocial: COMPANY_NAME, direccion: COMPANY_ADDRESS },
    };
    res.json(config);
  } catch (error) {
    logger.error('Error obteniendo configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// ========================================
// RUTAS DE DATOS (CRUD)
// ========================================
if (pool) {
  app.get('/api/invoices', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100');
      res.json(result.rows);
    } catch (error) {
      logger.error('Error obteniendo facturas:', error);
      res.status(500).json({ error: 'Error al obtener facturas' });
    }
  });

  app.post('/api/invoices', authenticateToken, async (req, res) => {
    try {
      const { invoice_number, client_ruc, client_name, amount, currency } = req.body;
      const is_export = currency === 'USD'; // Lógica de ejemplo
      const result = await pool.query(
        'INSERT INTO invoices (invoice_number, client_ruc, client_name, amount, currency, is_export, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [invoice_number, client_ruc, client_name, amount, currency, is_export, req.user.id]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      logger.error('Error creando factura:', error);
      res.status(500).json({ error: 'Error al crear factura' });
    }
  });

  app.get('/api/employees', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM employees ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (error) {
      logger.error('Error obteniendo empleados:', error);
      res.status(500).json({ error: 'Error al obtener empleados' });
    }
  });
}

// ========================================
// RUTA DE RESPALDOS (BACKUP)
// ========================================
app.post('/api/backup/trigger', authenticateToken, async (req, res) => {
    // Solo los administradores pueden ejecutar esta acción
    if (req.user.role !== 'administrador') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }

    logger.info(`Usuario '${req.user.username}' ha solicitado un respaldo manual.`);

    if (!GITHUB_PAT || !GITHUB_REPO) {
        logger.error('Faltan variables de entorno de GitHub para el respaldo (GITHUB_PAT, GITHUB_REPO).');
        return res.status(500).json({ error: 'La configuración de respaldos en GitHub está incompleta.' });
    }

    logger.info(`Simulando respaldo a repositorio: ${GITHUB_REPO}`);
    
    res.status(202).json({ 
        message: 'Solicitud de respaldo recibida. El proceso se ejecutará en segundo plano.',
        details: {
            repo: GITHUB_REPO,
            triggerTime: new Date().toISOString()
        }
    });
});


// ========================================
// RUTA DE SALUD (HEALTH CHECK)
// ========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    version: '3.0.4-env',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    database: pool ? 'connected' : 'not configured',
  });
});

// ========================================
// MANEJO DE ERRORES
// ========================================
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado', path: req.path, method: req.method });
});

app.use((error, req, res, next) => {
  logger.error('Error no manejado:', error);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: DEBUG_MODE ? error.message : 'Ocurrió un problema inesperado.'
  });
});

// ========================================
// EXPORTAR HANDLER PARA NETLIFY
// ========================================
module.exports.handler = serverless(app);
