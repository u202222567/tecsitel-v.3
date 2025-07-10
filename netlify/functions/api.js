// ============================================
// TECSITEL V.3 - API BACKEND (Adaptado para Entorno)
// Netlify Functions
// ============================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const serverless = require('serverless-http');
const rateLimit = require('express-rate-limit');

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

// Límite de peticiones (Rate Limiting)
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15) * 60 * 1000, // en minutos
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // max peticiones por ventana
  message: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false, 
});
app.use('/api/', limiter); // Aplicar a todas las rutas API


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
  // En un escenario real, podrías querer que la aplicación no inicie.
  // process.exit(1); 
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

    // Se recomienda gestionar usuarios en la base de datos.
    // Este es un ejemplo con un admin cuya contraseña viene del entorno.
    const users = {
      'admin': {
        id: 1,
        username: 'admin',
        // La contraseña del admin se hashea al vuelo. No almacenar contraseñas en texto plano.
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
    // La configuración ahora se lee desde las variables de entorno
    const config = {
      version: '3.0.1-env',
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
      tasas: { // Estas tasas podrían también venir del entorno si cambian a menudo
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

// Validar RUC
app.post('/api/validate/ruc', async (req, res) => {
    const { ruc } = req.body;
    if (!ruc || !/^\d{11}$/.test(ruc)) {
        return res.status(400).json({ valid: false, error: 'RUC debe tener 11 dígitos' });
    }

    // Para usar la API externa, necesitarías una librería como node-fetch
    // Ejemplo de implementación (requiere 'node-fetch'):
    if (RUC_VALIDATION_URL) {
        try {
            // const fetch = require('node-fetch'); // O import fetch from 'node-fetch';
            // const apiRes = await fetch(`${RUC_VALIDATION_URL}?ruc=${ruc}`, { headers: { 'Authorization': 'Bearer TU_API_KEY' } });
            // const data = await apiRes.json();
            // return res.json({ valid: true, ...data });
            return res.status(501).json({ message: 'La validación externa de RUC no está implementada aún.', url: RUC_VALIDATION_URL });
        } catch (error) {
            console.error('Error en API externa de RUC:', error);
            return res.status(503).json({ valid: false, error: 'Servicio de validación no disponible.' });
        }
    }

    // Lógica de fallback con datos simulados si la URL no está configurada
    res.json({
        valid: true,
        ruc: ruc,
        razonSocial: 'EMPRESA DEMO (DATOS SIMULADOS)',
        message: 'RUC válido (simulado)'
    });
});

// ... (Otras rutas como /api/validate/dni, /api/reports, etc. se mantienen igual pero pueden ser adaptadas de forma similar)


// ========================================
// RUTA DE SALUD
// ========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    version: '3.0.1-env',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    database: pool ? 'connected' : 'not configured',
    cors_enabled: ENABLE_CORS_FLAG
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
    // Mostrar más detalles solo si el modo DEBUG está activado
    message: DEBUG_MODE ? error.message : 'Ocurrió un problema inesperado.'
  });
});

// ========================================
// EXPORTAR HANDLER PARA NETLIFY
// ========================================

module.exports.handler = serverless(app);
