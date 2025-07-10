# ============================================
# SCRIPTS/DEPLOY.SH - Script de Despliegue
# ============================================

#!/bin/bash

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
PROJECT_NAME="tecsitel-v3"
NETLIFY_SITE_ID="your-netlify-site-id"

echo -e "${BLUE}🚀 Script de despliegue Tecsitel v.3${NC}"

# Función para verificar dependencias
check_dependencies() {
    echo -e "${BLUE}🔍 Verificando dependencias...${NC}"
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js no está instalado${NC}"
        exit 1
    fi
    
    # Verificar npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm no está instalado${NC}"
        exit 1
    fi
    
    # Verificar git
    if ! command -v git &> /dev/null; then
        echo -e "${YELLOW}⚠️  Git no está instalado (recomendado)${NC}"
    fi
    
    echo -e "${GREEN}✅ Dependencias verificadas${NC}"
}

# Función para ejecutar tests
run_tests() {
    echo -e "${BLUE}🧪 Ejecutando tests...${NC}"
    
    # Tests básicos de sintaxis
    if ! node -c index.html &> /dev/null; then
        echo -e "${RED}❌ Error de sintaxis en archivos JavaScript${NC}"
        exit 1
    fi
    
    # Verificar archivos esenciales
    essential_files=("index.html" "package.json" "modules/advanced-modules.js")
    for file in "${essential_files[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}❌ Archivo esencial faltante: $file${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ Tests pasados${NC}"
}

# Función para construir para producción
build_production() {
    echo -e "${BLUE}🔨 Preparando build de producción...${NC}"
    
    # Instalar dependencias
    npm ci --only=production
    
    # Verificar configuración
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  .env no encontrado, usando .env.example${NC}"
        cp .env.example .env
    fi
    
    # Crear directorios necesarios
    mkdir -p logs backups uploads exports temp
    
    echo -e "${GREEN}✅ Build preparado${NC}"
}

# Función para desplegar en Netlify
deploy_netlify() {
    echo -e "${BLUE}🌐 Desplegando en Netlify...${NC}"
    
    if ! command -v netlify &> /dev/null; then
        echo -e "${YELLOW}📦 Instalando Netlify CLI...${NC}"
        npm install -g netlify-cli
    fi
    
    # Autenticarse si es necesario
    if ! netlify status &> /dev/null; then
        echo -e "${BLUE}🔐 Autenticación requerida...${NC}"
        netlify login
    fi
    
    # Desplegar
    echo -e "${BLUE}🚀 Desplegando...${NC}"
    if [ "$1" = "prod" ]; then
        netlify deploy --prod --dir .
    else
        netlify deploy --dir .
    fi
    
    echo -e "${GREEN}✅ Despliegue completado${NC}"
}

# Función para desplegar en Vercel
deploy_vercel() {
    echo -e "${BLUE}🌐 Desplegando en Vercel...${NC}"
    
    if ! command -v vercel &> /dev/null; then
        echo -e "${YELLOW}📦 Instalando Vercel CLI...${NC}"
        npm install -g vercel
    fi
    
    # Configurar vercel.json si no existe
    if [ ! -f "vercel.json" ]; then
        cat > vercel.json << EOF
{
  "version": 2,
  "builds": [
    {
      "src": "index.html",
      "use": "@vercel/static"
    },
    {
      "src": "netlify/functions/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/netlify/functions/api"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
EOF
        echo -e "${GREEN}✅ vercel.json creado${NC}"
    fi
    
    # Desplegar
    if [ "$1" = "prod" ]; then
        vercel --prod
    else
        vercel
    fi
    
    echo -e "${GREEN}✅ Despliegue completado${NC}"
}

# Función para crear release en GitHub
create_github_release() {
    echo -e "${BLUE}📦 Creando release en GitHub...${NC}"
    
    # Verificar si hay cambios sin commitear
    if ! git diff-index --quiet HEAD --; then
        echo -e "${YELLOW}⚠️  Hay cambios sin commitear${NC}"
        read -p "¿Deseas commitear los cambios? (y/N): " commit_changes
        
        if [[ $commit_changes =~ ^[Yy]$ ]]; then
            git add .
            read -p "Mensaje del commit: " commit_message
            git commit -m "$commit_message"
        fi
    fi
    
    # Obtener versión del package.json
    VERSION=$(node -p "require('./package.json').version")
    
    # Crear tag
    git tag -a "v$VERSION" -m "Release v$VERSION"
    git push origin "v$VERSION"
    
    echo -e "${GREEN}✅ Release v$VERSION creado${NC}"
}

# Función para mostrar información post-despliegue
show_deploy_info() {
    echo -e "${GREEN}🎉 Despliegue completado exitosamente!${NC}"
    echo ""
    echo -e "${BLUE}📊 Información del despliegue:${NC}"
    echo -e "  📅 Fecha: $(date)"
    echo -e "  📦 Versión: $(node -p "require('./package.json').version")"
    echo -e "  🌿 Branch: $(git branch --show-current 2>/dev/null || echo 'N/A')"
    echo -e "  💻 Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"
    echo ""
    echo -e "${BLUE}🔗 Enlaces útiles:${NC}"
    echo -e "  📖 Documentación: README.md"
    echo -e "  🐛 Reportar issues: GitHub Issues"
    echo -e "  📧 Soporte: soporte@tecsitel.com"
    echo ""
    echo -e "${YELLOW}⚠️  Recordatorios post-despliegue:${NC}"
    echo -e "  • Verificar que todas las funcionalidades trabajen correctamente"
    echo -e "  • Revisar logs en busca de errores"
    echo -e "  • Actualizar documentación si es necesario"
    echo -e "  • Notificar al equipo sobre el nuevo despliegue"
}

# Menu principal
case "$1" in
    "netlify")
        check_dependencies
        run_tests
        build_production
        deploy_netlify "$2"
        show_deploy_info
        ;;
    "vercel")
        check_dependencies
        run_tests
        build_production
        deploy_vercel "$2"
        show_deploy_info
        ;;
    "github")
        check_dependencies
        create_github_release
        ;;
    "test")
        check_dependencies
        run_tests
        echo -e "${GREEN}✅ Todos los tests pasaron${NC}"
        ;;
    "build")
        check_dependencies
        build_production
        echo -e "${GREEN}✅ Build completado${NC}"
        ;;
    *)
        echo -e "${BLUE}🚀 Tecsitel v.3 - Script de Despliegue${NC}"
        echo ""
        echo -e "${YELLOW}Uso: $0 {comando} [opciones]${NC}"
        echo ""
        echo -e "${BLUE}Comandos disponibles:${NC}"
        echo -e "  netlify [prod]  - Desplegar en Netlify"
        echo -e "  vercel [prod]   - Desplegar en Vercel"
        echo -e "  github          - Crear release en GitHub"
        echo -e "  test            - Ejecutar tests"
        echo -e "  build           - Preparar build de producción"
        echo ""
        echo -e "${BLUE}Ejemplos:${NC}"
        echo -e "  $0 netlify      # Despliegue de preview"
        echo -e "  $0 netlify prod # Despliegue de producción"
        echo -e "  $0 vercel prod  # Despliegue de producción en Vercel"
        echo -e "  $0 github       # Crear release en GitHub"
        echo -e "  $0 test         # Solo ejecutar tests"
        ;;
esac