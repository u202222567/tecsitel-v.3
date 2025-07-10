-- ============================================
-- TECSITEL V.3 - ESQUEMA DE BASE DE DATOS
-- PostgreSQL Schema
-- ============================================

-- Crear base de datos (ejecutar como superusuario)
-- CREATE DATABASE tecsitel;
-- \c tecsitel;

-- ========================================
-- EXTENSIONES
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- TABLAS DE USUARIOS Y AUTENTICACIÓN
-- ========================================

-- Tabla de usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'usuario' CHECK (role IN ('administrador', 'contador', 'rrhh', 'usuario')),
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de sesiones
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- CONFIGURACIÓN DE EMPRESA
-- ========================================

-- Tabla de configuración de empresa
CREATE TABLE company_config (
    id SERIAL PRIMARY KEY,
    ruc VARCHAR(11) UNIQUE NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    nombre_comercial VARCHAR(200),
    direccion TEXT,
    ubigeo VARCHAR(6),
    telefono VARCHAR(20),
    email VARCHAR(100),
    actividad_economica VARCHAR(200),
    tipo_empresa VARCHAR(20) CHECK (tipo_empresa IN ('micro', 'pequeña', 'mediana', 'grande')),
    regimen VARCHAR(20) CHECK (regimen IN ('general', 'especial', 'mype')),
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- CONTABILIDAD
-- ========================================

-- Tabla de plan contable
CREATE TABLE plan_contable (
    codigo VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 5),
    padre VARCHAR(10) REFERENCES plan_contable(codigo),
    tipo_cuenta VARCHAR(20) CHECK (tipo_cuenta IN ('activo', 'pasivo', 'patrimonio', 'ingresos', 'gastos')),
    descripcion TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de ejercicios contables
CREATE TABLE ejercicios_contables (
    id SERIAL PRIMARY KEY,
    año INTEGER UNIQUE NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de asientos contables
CREATE TABLE asientos_contables (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(20) UNIQUE NOT NULL,
    fecha DATE NOT NULL,
    glosa TEXT NOT NULL,
    ejercicio_id INTEGER REFERENCES ejercicios_contables(id),
    estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'registrado', 'anulado')),
    total_debe DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_haber DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de detalles de asientos contables
CREATE TABLE detalle_asientos (
    id SERIAL PRIMARY KEY,
    asiento_id INTEGER REFERENCES asientos_contables(id) ON DELETE CASCADE,
    cuenta VARCHAR(10) REFERENCES plan_contable(codigo),
    debe DECIMAL(15,2) DEFAULT 0,
    haber DECIMAL(15,2) DEFAULT 0,
    glosa TEXT,
    orden INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- FACTURACIÓN
-- ========================================

-- Tabla de clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    ruc VARCHAR(11),
    dni VARCHAR(8),
    razon_social VARCHAR(200),
    nombres VARCHAR(100),
    apellidos VARCHAR(100),
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    tipo_documento VARCHAR(3) CHECK (tipo_documento IN ('RUC', 'DNI', 'CEX')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_documento CHECK (
        (tipo_documento = 'RUC' AND ruc IS NOT NULL AND LENGTH(ruc) = 11) OR
        (tipo_documento = 'DNI' AND dni IS NOT NULL AND LENGTH(dni) = 8) OR
        (tipo_documento = 'CEX')
    )
);

-- Tabla de series de comprobantes
CREATE TABLE series_comprobantes (
    id SERIAL PRIMARY KEY,
    tipo_comprobante VARCHAR(2) NOT NULL, -- 01=Factura, 03=Boleta, etc.
    serie VARCHAR(4) NOT NULL,
    numero_actual INTEGER DEFAULT 0,
    numero_maximo INTEGER DEFAULT 99999999,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tipo_comprobante, serie)
);

-- Tabla de facturas
CREATE TABLE facturas (
    id SERIAL PRIMARY KEY,
    numero_completo VARCHAR(20) UNIQUE NOT NULL, -- F001-00000001
    tipo_comprobante VARCHAR(2) NOT NULL,
    serie VARCHAR(4) NOT NULL,
    numero INTEGER NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE,
    cliente_id INTEGER REFERENCES clientes(id),
    moneda VARCHAR(3) DEFAULT 'PEN',
    tipo_cambio DECIMAL(6,4) DEFAULT 1.0000,
    subtotal DECIMAL(15,2) NOT NULL,
    igv DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    is_exportacion BOOLEAN DEFAULT false,
    estado VARCHAR(20) DEFAULT 'emitida' CHECK (estado IN ('borrador', 'emitida', 'anulada')),
    observaciones TEXT,
    xml_content TEXT,
    hash_signature VARCHAR(255),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de detalle de facturas
CREATE TABLE detalle_facturas (
    id SERIAL PRIMARY KEY,
    factura_id INTEGER REFERENCES facturas(id) ON DELETE CASCADE,
    orden INTEGER,
    descripcion TEXT NOT NULL,
    cantidad DECIMAL(10,3) DEFAULT 1,
    precio_unitario DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    igv DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- RECURSOS HUMANOS
-- ========================================

-- Tabla de empleados
CREATE TABLE empleados (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(8) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    sexo VARCHAR(1) CHECK (sexo IN ('M', 'F')),
    estado_civil VARCHAR(20),
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    fecha_ingreso DATE NOT NULL,
    fecha_baja DATE,
    motivo_baja TEXT,
    cargo VARCHAR(100),
    area VARCHAR(100),
    tipo_contrato VARCHAR(20) CHECK (tipo_contrato IN ('indefinido', 'temporal', 'part-time')),
    regimen VARCHAR(20) CHECK (regimen IN ('privado', 'publico', 'cas')),
    sueldo_basico DECIMAL(10,2) NOT NULL,
    tipo_trabajador VARCHAR(20) CHECK (tipo_trabajador IN ('empleado', 'obrero')),
    sistema_pension VARCHAR(10) CHECK (sistema_pension IN ('AFP', 'ONP', 'SIN_SISTEMA')),
    afp VARCHAR(50),
    cuspp VARCHAR(12),
    fecha_afiliacion DATE,
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'vacaciones', 'baja')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de asistencia
CREATE TABLE asistencia (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER REFERENCES empleados(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_entrada TIME,
    hora_salida TIME,
    horas_trabajadas DECIMAL(4,2),
    observaciones TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empleado_id, fecha)
);

-- Tabla de planilla
CREATE TABLE planilla (
    id SERIAL PRIMARY KEY,
    periodo VARCHAR(7) NOT NULL, -- YYYY-MM
    empleado_id INTEGER REFERENCES empleados(id),
    sueldo_basico DECIMAL(10,2) NOT NULL,
    asignacion_familiar DECIMAL(10,2) DEFAULT 0,
    horas_extras DECIMAL(10,2) DEFAULT 0,
    bonificaciones DECIMAL(10,2) DEFAULT 0,
    total_ingresos DECIMAL(10,2) NOT NULL,
    afp_aporte DECIMAL(10,2) DEFAULT 0,
    afp_comision DECIMAL(10,2) DEFAULT 0,
    afp_seguro DECIMAL(10,2) DEFAULT 0,
    onp DECIMAL(10,2) DEFAULT 0,
    quinta_categoria DECIMAL(10,2) DEFAULT 0,
    prestamos DECIMAL(10,2) DEFAULT 0,
    otros_descuentos DECIMAL(10,2) DEFAULT 0,
    total_descuentos DECIMAL(10,2) NOT NULL,
    neto_pagar DECIMAL(10,2) NOT NULL,
    essalud_empleador DECIMAL(10,2) DEFAULT 0,
    sctr_empleador DECIMAL(10,2) DEFAULT 0,
    senati_empleador DECIMAL(10,2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'calculada' CHECK (estado IN ('calculada', 'pagada', 'anulada')),
    fecha_pago DATE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(periodo, empleado_id)
);

-- ========================================
-- AUDITORÍA Y LOGS
-- ========================================

-- Tabla de auditoría
CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES users(id),
    accion VARCHAR(20) NOT NULL, -- CREATE, READ, UPDATE, DELETE
    modulo VARCHAR(50) NOT NULL, -- CONTABILIDAD, RRHH, FACTURAS, SISTEMA
    tabla_afectada VARCHAR(50),
    registro_id INTEGER,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de logs del sistema
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    nivel VARCHAR(10) CHECK (nivel IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
    mensaje TEXT NOT NULL,
    modulo VARCHAR(50),
    usuario_id INTEGER REFERENCES users(id),
    ip_address INET,
    datos_adicionales JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PARÁMETROS DEL SISTEMA
-- ========================================

-- Tabla de parámetros
CREATE TABLE parametros_sistema (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(20) DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
    categoria VARCHAR(50),
    is_editable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índices de usuarios
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Índices de contabilidad
CREATE INDEX idx_asientos_fecha ON asientos_contables(fecha);
CREATE INDEX idx_asientos_numero ON asientos_contables(numero);
CREATE INDEX idx_detalle_asientos_cuenta ON detalle_asientos(cuenta);

-- Índices de facturación
CREATE INDEX idx_facturas_fecha ON facturas(fecha_emision);
CREATE INDEX idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX idx_facturas_numero ON facturas(numero_completo);
CREATE INDEX idx_clientes_ruc ON clientes(ruc);
CREATE INDEX idx_clientes_dni ON clientes(dni);

-- Índices de RRHH
CREATE INDEX idx_empleados_dni ON empleados(dni);
CREATE INDEX idx_empleados_estado ON empleados(estado);
CREATE INDEX idx_asistencia_fecha ON asistencia(fecha);
CREATE INDEX idx_asistencia_empleado ON asistencia(empleado_id);
CREATE INDEX idx_planilla_periodo ON planilla(periodo);

-- Índices de auditoría
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(created_at);
CREATE INDEX idx_auditoria_modulo ON auditoria(modulo);
CREATE INDEX idx_system_logs_nivel ON system_logs(nivel);
CREATE INDEX idx_system_logs_fecha ON system_logs(created_at);

-- ========================================
-- TRIGGERS PARA AUDITORÍA AUTOMÁTICA
-- ========================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_config_updated_at BEFORE UPDATE ON company_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asientos_updated_at BEFORE UPDATE ON asientos_contables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_facturas_updated_at BEFORE UPDATE ON facturas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_empleados_updated_at BEFORE UPDATE ON empleados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asistencia_updated_at BEFORE UPDATE ON asistencia FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parametros_updated_at BEFORE UPDATE ON parametros_sistema FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- DATOS INICIALES
-- ========================================

-- Insertar usuarios por defecto
INSERT INTO users (username, password_hash, role, name, email) VALUES
('admin', crypt('admin123', gen_salt('bf', 12)), 'administrador', 'Administrador', 'admin@tecsitel.com'),
('demo', crypt('demo', gen_salt('bf', 12)), 'usuario', 'Usuario Demo', 'demo@tecsitel.com'),
('contador', crypt('contador123', gen_salt('bf', 12)), 'contador', 'Contador', 'contador@tecsitel.com'),
('rrhh', crypt('rrhh123', gen_salt('bf', 12)), 'rrhh', 'Recursos Humanos', 'rrhh@tecsitel.com');

-- Insertar configuración de empresa por defecto
INSERT INTO company_config (ruc, razon_social, direccion, telefono, email, tipo_empresa, regimen) VALUES
('20123456789', 'TECSITEL S.A.C.', 'AV. EJEMPLO 123, LIMA', '01-234-5678', 'contacto@tecsitel.com', 'pequeña', 'general');

-- Insertar ejercicio contable actual
INSERT INTO ejercicios_contables (año, fecha_inicio, fecha_fin) VALUES
(2024, '2024-01-01', '2024-12-31');

-- Insertar series de comprobantes
INSERT INTO series_comprobantes (tipo_comprobante, serie) VALUES
('01', 'F001'), -- Facturas
('03', 'B001'), -- Boletas
('07', 'FC01'), -- Notas de crédito
('08', 'FD01'); -- Notas de débito

-- Insertar parámetros del sistema
INSERT INTO parametros_sistema (clave, valor, descripcion, tipo, categoria) VALUES
('UIT_2024', '5150', 'Unidad Impositiva Tributaria 2024', 'number', 'fiscal'),
('RMV_2024', '1025', 'Remuneración Mínima Vital 2024', 'number', 'laboral'),
('ASIGNACION_FAMILIAR', '102.50', 'Asignación Familiar 2024', 'number', 'laboral'),
('IGV_RATE', '0.18', 'Tasa del IGV', 'number', 'fiscal'),
('ESSALUD_RATE', '0.09', 'Tasa EsSalud empleador', 'number', 'laboral'),
('ONP_RATE', '0.13', 'Tasa ONP', 'number', 'laboral'),
('SENATI_RATE', '0.0075', 'Tasa SENATI', 'number', 'laboral'),
('BACKUP_AUTO', 'true', 'Respaldos automáticos habilitados', 'boolean', 'sistema'),
('AUDIT_RETENTION_DAYS', '365', 'Días de retención de auditoría', 'number', 'sistema');

-- ========================================
-- VISTAS ÚTILES
-- ========================================

-- Vista de balance de comprobación
CREATE VIEW vista_balance_comprobacion AS
SELECT 
    pc.codigo,
    pc.nombre,
    COALESCE(SUM(da.debe), 0) as total_debe,
    COALESCE(SUM(da.haber), 0) as total_haber,
    COALESCE(SUM(da.debe), 0) - COALESCE(SUM(da.haber), 0) as saldo
FROM plan_contable pc
LEFT JOIN detalle_asientos da ON pc.codigo = da.cuenta
LEFT JOIN asientos_contables ac ON da.asiento_id = ac.id
WHERE ac.estado = 'registrado' OR ac.estado IS NULL
GROUP BY pc.codigo, pc.nombre
ORDER BY pc.codigo;

-- Vista de empleados activos con datos completos
CREATE VIEW vista_empleados_activos AS
SELECT 
    e.*,
    EXTRACT(YEAR FROM AGE(e.fecha_nacimiento)) as edad,
    EXTRACT(YEAR FROM AGE(e.fecha_ingreso)) as años_servicio
FROM empleados e
WHERE e.estado = 'activo';

-- Vista de facturas con datos del cliente
CREATE VIEW vista_facturas_completas AS
SELECT 
    f.*,
    c.razon_social,
    c.nombres,
    c.apellidos,
    c.direccion as cliente_direccion,
    c.telefono as cliente_telefono
FROM facturas f
LEFT JOIN clientes c ON f.cliente_id = c.id;

-- ========================================
-- FUNCIONES ÚTILES
-- ========================================

-- Función para validar RUC
CREATE OR REPLACE FUNCTION validar_ruc(ruc_input VARCHAR(11))
RETURNS BOOLEAN AS $$
DECLARE
    weights INTEGER[] := ARRAY[5,4,3,2,7,6,5,4,3,2];
    sum_total INTEGER := 0;
    remainder INTEGER;
    check_digit INTEGER;
    i INTEGER;
BEGIN
    -- Verificar longitud
    IF LENGTH(ruc_input) != 11 THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar que son solo números
    IF ruc_input !~ '^[0-9]+$' THEN
        RETURN FALSE;
    END IF;
    
    -- Calcular dígito verificador
    FOR i IN 1..10 LOOP
        sum_total := sum_total + weights[i] * CAST(SUBSTRING(ruc_input, i, 1) AS INTEGER);
    END LOOP;
    
    remainder := sum_total % 11;
    check_digit := CASE WHEN remainder < 2 THEN remainder ELSE 11 - remainder END;
    
    RETURN check_digit = CAST(SUBSTRING(ruc_input, 11, 1) AS INTEGER);
END;
$$ LANGUAGE plpgsql;

-- Función para generar siguiente número de comprobante
CREATE OR REPLACE FUNCTION generar_numero_comprobante(tipo_comp VARCHAR(2), serie_comp VARCHAR(4))
RETURNS VARCHAR(20) AS $$
DECLARE
    numero_actual INTEGER;
    numero_nuevo INTEGER;
    resultado VARCHAR(20);
BEGIN
    -- Obtener número actual y incrementar
    UPDATE series_comprobantes 
    SET numero_actual = numero_actual + 1
    WHERE tipo_comprobante = tipo_comp AND serie = serie_comp
    RETURNING numero_actual INTO numero_nuevo;
    
    -- Formatear resultado
    resultado := serie_comp || '-' || LPAD(numero_nuevo::text, 8, '0');
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PERMISOS Y SEGURIDAD
-- ========================================

-- Crear rol para la aplicación
CREATE ROLE tecsitel_app WITH LOGIN;
GRANT CONNECT ON DATABASE tecsitel TO tecsitel_app;
GRANT USAGE ON SCHEMA public TO tecsitel_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tecsitel_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tecsitel_app;

-- RLS (Row Level Security) para datos sensibles
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propios datos
CREATE POLICY user_self_access ON users
    FOR ALL
    TO tecsitel_app
    USING (id = current_setting('app.current_user_id')::integer);

-- ========================================
-- COMENTARIOS EN TABLAS
-- ========================================

COMMENT ON TABLE users IS 'Usuarios del sistema con autenticación y roles';
COMMENT ON TABLE company_config IS 'Configuración de la empresa';
COMMENT ON TABLE plan_contable IS 'Plan Contable General Empresarial (PCGE)';
COMMENT ON TABLE asientos_contables IS 'Asientos contables del libro diario';
COMMENT ON TABLE facturas IS 'Comprobantes de pago emitidos';
COMMENT ON TABLE empleados IS 'Registro de empleados de la empresa';
COMMENT ON TABLE planilla IS 'Cálculos de planilla mensual';
COMMENT ON TABLE auditoria IS 'Log de auditoría de todas las operaciones';

-- ========================================
-- FINALIZACIÓN
-- ========================================

-- Actualizar estadísticas
ANALYZE;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos Tecsitel v.3 creada exitosamente';
    RAISE NOTICE 'Usuarios creados: admin, demo, contador, rrhh';
    RAISE NOTICE 'Esquema completo con auditoría y seguridad';
END $$;