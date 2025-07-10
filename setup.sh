#!/bin/bash

# ===================================
# TECSITEL V.3 - SCRIPT DE INSTALACIÓN
# ===================================

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes coloreados
print_message() {
    echo -e "${2}${1}${NC}"
}

print_header() {
    echo ""
    echo "==========================================="
    print_message "$1" $BLUE
    echo "==========================================="
}

print_success() {
    print_message "✅ $1" $GREEN
}

print_warning() {
    print_message "⚠️  $1" $YELLOW
}

print_error() {
    print_message "❌ $1" $RED
}

# Banner de bienvenida
clear
echo ""
echo "🏢 =================================================="
echo "   TECSITEL V.3 - CONFIGURACIÓN AUTOMÁTICA"
echo "   Sistema de Gestión Empresarial Integral"
echo "================================================== 🏢"
echo ""

# Verificar requisitos del sistema
print_header "VERIFICANDO REQUISITOS DEL SISTEMA"

# Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js encontrado: $NODE_VERSION"
    
    # Verificar versión mínima
    REQUIRED_VERSION="18.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
        print_success "Versión de Node.js compatible"
    else
        print_error "Versión de Node.js insuficiente. Se requiere >= $REQUIRED_VERSION"
        exit 1
    fi
else
    print_error "Node.js no está instalado"
    print_warning "Por favor instala Node.js desde https://nodejs.org/"
    exit 1
fi

# Verificar npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm encontrado: v$NPM_VERSION"
else
    print_error "npm no está instalado"
    exit 1
fi

# Verificar git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    print_success "Git encontrado: $GIT_VERSION"
else
    print_warning "Git no encontrado - recomendado para control de versiones"
fi

# Instalación de dependencias
print_header "INSTALANDO DEPENDENCIAS"

if [ -f "package.json" ]; then
    print_message "Instalando dependencias de Node.js..." $BLUE
    npm install
    print_success "Dependencias instaladas correctamente"
else
    print_error "package.json no encontrado"
    exit 1
fi

# Configuración de variables de entorno
print_header "CONFIGURANDO VARIABLES DE ENTORNO"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Archivo .env creado desde .env.example"
        print_warning "IMPORTANTE: Edita el archivo .env con tus configuraciones"
    else
        print_warning ".env.example no encontrado, creando .env básico"
        
        # Crear .env básico
        cat > .env << EOF
# Configuración básica de Tecsitel v.3
JWT_SECRET=$(openssl rand -hex 32)
NODE_ENV=development
PORT=8888
DATABASE_URL=postgresql://localhost:5432/tecsitel

# Configuración de empresa
COMPANY_RUC=20123456789
COMPANY_NAME=TECSITEL S.A.C.
COMPANY_ADDRESS=AV. EJEMPLO 123, LIMA

# Configuración de Perú
PERU_UIT=5150
PERU_RMV=1025
PERU_ASIGNACION_FAMILIAR=102.50
PERU_IGV_RATE=0.18
EOF
        print_success "Archivo .env básico creado"
    fi
else
    print_success "Archivo .env ya existe"
fi

# Configuración de directorios
print_header "CREANDO ESTRUCTURA DE DIRECTORIOS"

directories=("logs" "backups" "uploads" "exports" "temp")

for dir in "${directories[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        print_success "Directorio $dir creado"
    else
        print_success "Directorio $dir ya existe"
    fi
done

# Configuración de permisos
if [[ "$OSTYPE" != "msys" && "$OSTYPE" != "win32" ]]; then
    print_header "CONFIGURANDO PERMISOS"
    chmod +x setup.sh
    chmod 755 logs backups uploads exports temp
    print_success "Permisos configurados correctamente"
fi

# Verificación de configuración
print_header "VERIFICANDO CONFIGURACIÓN"

# Verificar archivos esenciales
essential_files=("index.html" "package.json" "modules/advanced-modules.js")

for file in "${essential_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "Archivo $file encontrado"
    else
        print_error "Archivo esencial $file no encontrado"
        exit 1
    fi
done

# Configuración de base de datos (opcional)
print_header "CONFIGURACIÓN DE BASE DE DATOS"

read -p "¿Deseas configurar PostgreSQL? (y/N): " setup_db

if [[ $setup_db =~ ^[Yy]$ ]]; then
    if command -v psql &> /dev/null; then
        print_message "PostgreSQL encontrado" $GREEN
        
        read -p "Nombre de la base de datos [tecsitel]: " db_name
        db_name=${db_name:-tecsitel}
        
        read -p "Usuario de la base de datos [postgres]: " db_user
        db_user=${db_user:-postgres}
        
        read -s -p "Contraseña de la base de datos: " db_password
        echo ""
        
        # Intentar crear la base de datos
        export PGPASSWORD=$db_password
        
        if createdb -h localhost -U $db_user $db_name 2>/dev/null; then
            print_success "Base de datos $db_name creada"
            
            # Actualizar .env
            sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$db_user:$db_password@localhost:5432/$db_name|" .env
            print_success "Configuración de base de datos actualizada en .env"
        else
            print_warning "No se pudo crear la base de datos (puede que ya exista)"
        fi
        
        unset PGPASSWORD
    else
        print_warning "PostgreSQL no encontrado"
        print_message "Puedes instalarlo desde https://postgresql.org/" $YELLOW
    fi
else
    print_message "Configuración de base de datos omitida" $YELLOW
fi

# Instalación de Netlify CLI (opcional)
print_header "HERRAMIENTAS DE DESARROLLO"

read -p "¿Deseas instalar Netlify CLI para despliegue? (y/N): " install_netlify

if [[ $install_netlify =~ ^[Yy]$ ]]; then
    npm install -g netlify-cli
    print_success "Netlify CLI instalado"
    print_message "Usa 'netlify dev' para desarrollo local" $BLUE
    print_message "Usa 'netlify deploy' para desplegar" $BLUE
else
    print_message "Instalación de Netlify CLI omitida" $YELLOW
fi

# Configuración de Git (si no está configurado)
if command -v git &> /dev/null; then
    if [ ! -d ".git" ]; then
        read -p "¿Deseas inicializar repositorio Git? (y/N): " init_git
        
        if [[ $init_git =~ ^[Yy]$ ]]; then
            git init
            git add .
            git commit -m "Initial commit - Tecsitel v.3 setup"
            print_success "Repositorio Git inicializado"
        fi
    else
        print_success "Repositorio Git ya existe"
    fi
fi

# Mensaje final
print_header "🎉 INSTALACIÓN COMPLETADA"

print_success "Tecsitel v.3 ha sido configurado exitosamente!"
echo ""
print_message "PRÓXIMOS PASOS:" $BLUE
echo ""
echo "1. 📝 Edita el archivo .env con tus configuraciones específicas"
echo "2. 🔧 Revisa la configuración de base de datos si es necesario"
echo "3. 🚀 Ejecuta 'npm run dev' para iniciar el servidor de desarrollo"
echo "4. 🌐 Abre http://localhost:8888 en tu navegador"
echo "5. 🔐 Inicia sesión con admin/admin123 o demo/demo"
echo ""
print_message "COMANDOS ÚTILES:" $BLUE
echo ""
echo "• npm run dev          - Servidor de desarrollo"
echo "• npm run deploy       - Desplegar a Netlify"
echo "• netlify dev          - Desarrollo con Netlify CLI"
echo ""
print_message "DOCUMENTACIÓN:" $BLUE
echo ""
echo "• README.md            - Documentación completa"
echo "• .env.example         - Variables de entorno disponibles"
echo "• package.json         - Configuración del proyecto"
echo ""
print_message "SOPORTE:" $BLUE
echo ""
echo "• Email: soporte@tecsitel.com"
echo "• GitHub: https://github.com/tu-usuario/tecsitel-v3"
echo ""
print_success "¡Listo para comenzar! 🚀"
echo ""

# Preguntar si ejecutar el servidor de desarrollo
read -p "¿Deseas iniciar el servidor de desarrollo ahora? (y/N): " start_dev

if [[ $start_dev =~ ^[Yy]$ ]]; then
    print_message "Iniciando servidor de desarrollo..." $BLUE
    print_message "Presiona Ctrl+C para detener el servidor" $YELLOW
    sleep 2
    
    if command -v netlify &> /dev/null; then
        netlify dev
    else
        # Servidor básico con Python si está disponible
        if command -v python3 &> /dev/null; then
            python3 -m http.server 8888
        elif command -v python &> /dev/null; then
            python -m SimpleHTTPServer 8888
        else
            print_warning "No se puede iniciar servidor automáticamente"
            print_message "Abre index.html directamente en tu navegador" $YELLOW
        fi
    fi
fi

exit 0