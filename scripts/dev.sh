# ============================================
# SCRIPTS/DEV.SH - Script de Desarrollo
# ============================================

#!/bin/bash

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🐳 Iniciando entorno de desarrollo Tecsitel v.3${NC}"

# Función para verificar si Docker está corriendo
check_docker() {
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker no está corriendo${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker está corriendo${NC}"
}

# Función para construir imágenes
build_images() {
    echo -e "${BLUE}🔨 Construyendo imágenes...${NC}"
    docker-compose build
}

# Función para iniciar servicios
start_services() {
    echo -e "${BLUE}🚀 Iniciando servicios...${NC}"
    docker-compose up -d postgres redis adminer
    
    echo -e "${YELLOW}⏳ Esperando que PostgreSQL esté listo...${NC}"
    sleep 10
    
    # Verificar conexión a la base de datos
    until docker-compose exec postgres pg_isready -U tecsitel_user -d tecsitel; do
        echo -e "${YELLOW}⏳ Esperando PostgreSQL...${NC}"
        sleep 2
    done
    
    echo -e "${GREEN}✅ Base de datos lista${NC}"
}

# Función para mostrar información
show_info() {
    echo -e "${GREEN}🎉 Entorno listo!${NC}"
    echo ""
    echo -e "${BLUE}📊 Servicios disponibles:${NC}"
    echo -e "  🌐 Aplicación: http://localhost:3000"
    echo -e "  🗄️  Adminer:    http://localhost:8080"
    echo -e "  🐘 PostgreSQL: localhost:5432"
    echo -e "  📱 Redis:      localhost:6379"
    echo ""
    echo -e "${BLUE}📋 Credenciales de base de datos:${NC}"
    echo -e "  Usuario: tecsitel_user"
    echo -e "  Contraseña: tecsitel_pass"
    echo -e "  Base de datos: tecsitel"
    echo ""
    echo -e "${BLUE}🛠️  Comandos útiles:${NC}"
    echo -e "  docker-compose logs -f app    # Ver logs de la aplicación"
    echo -e "  docker-compose exec postgres psql -U tecsitel_user -d tecsitel # Conectar a la DB"
    echo -e "  docker-compose down           # Detener todos los servicios"
    echo -e "  docker-compose down -v        # Detener y eliminar volúmenes"
}

# Función para limpiar todo
clean_all() {
    echo -e "${YELLOW}🧹 Limpiando todo...${NC}"
    docker-compose down -v
    docker system prune -f
    echo -e "${GREEN}✅ Limpieza completada${NC}"
}

# Función para mostrar logs
show_logs() {
    echo -e "${BLUE}📋 Mostrando logs...${NC}"
    docker-compose logs -f
}

# Menu principal
case "$1" in
    "start")
        check_docker
        build_images
        start_services
        show_info
        ;;
    "stop")
        echo -e "${YELLOW}🛑 Deteniendo servicios...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ Servicios detenidos${NC}"
        ;;
    "restart")
        echo -e "${YELLOW}🔄 Reiniciando servicios...${NC}"
        docker-compose restart
        echo -e "${GREEN}✅ Servicios reiniciados${NC}"
        ;;
    "logs")
        show_logs
        ;;
    "clean")
        clean_all
        ;;
    "db")
        echo -e "${BLUE}🗄️ Conectando a la base de datos...${NC}"
        docker-compose exec postgres psql -U tecsitel_user -d tecsitel
        ;;
    "backup")
        echo -e "${BLUE}💾 Creando respaldo de la base de datos...${NC}"
        mkdir -p backups
        docker-compose exec postgres pg_dump -U tecsitel_user tecsitel > "backups/backup_$(date +%Y%m%d_%H%M%S).sql"
        echo -e "${GREEN}✅ Respaldo creado en backups/${NC}"
        ;;
    "restore")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Especifica el archivo de respaldo${NC}"
            echo -e "Uso: $0 restore backup_file.sql"
            exit 1
        fi
        echo -e "${BLUE}🔄 Restaurando base de datos...${NC}"
        docker-compose exec -T postgres psql -U tecsitel_user -d tecsitel < "$2"
        echo -e "${GREEN}✅ Base de datos restaurada${NC}"
        ;;
    *)
        echo -e "${BLUE}🐳 Tecsitel v.3 - Herramientas de Desarrollo${NC}"
        echo ""
        echo -e "${YELLOW}Uso: $0 {comando}${NC}"
        echo ""
        echo -e "${BLUE}Comandos disponibles:${NC}"
        echo -e "  start   - Iniciar entorno de desarrollo"
        echo -e "  stop    - Detener servicios"
        echo -e "  restart - Reiniciar servicios"
        echo -e "  logs    - Mostrar logs en tiempo real"
        echo -e "  clean   - Limpiar todo (⚠️  elimina datos)"
        echo -e "  db      - Conectar a la base de datos"
        echo -e "  backup  - Crear respaldo de la base de datos"
        echo -e "  restore - Restaurar base de datos desde archivo"
        echo ""
        echo -e "${BLUE}Ejemplos:${NC}"
        echo -e "  $0 start"
        echo -e "  $0 logs"
        echo -e "  $0 backup"
        echo -e "  $0 restore backups/backup_20241201_120000.sql"
        ;;
esac