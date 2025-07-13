// ========================================
// TECSITEL v4.0 - Sistema de Gestión Empresarial
// Frontend corregido para conectar con la API
// ========================================

// ========================================
// Configuración Global y Estado
// ========================================
const CONFIG = {
    API_BASE_URL: '/.netlify/functions/api',
    IGV_RATE: 0.18,
    LOADING_DURATION: 3000,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
    VERSION: '4.0',
    COMPANY: {
        name: 'TECSITEL PERU E.I.R.L.',
        ruc: '20605908285'
    }
};

// Estado de la aplicación
const AppState = { 
    user: null,
    userRole: null,
    isAuthenticated: false,
    token: null,
    invoices: [],
    employees: [],
    timeEntries: [],
    stats: {},
    sessionStart: null,
    permissions: {}
};

// ========================================
// Cliente API mejorado
// ========================================
class APIClient {
    static async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(AppState.token && { 'Authorization': `Bearer ${AppState.token}` })
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            console.log(`🔗 API Request: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            const data = await response.json();

            console.log(`📊 API Response: ${response.status}`, data);

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${data.message || 'Error desconocido'}`);
            }

            return data;
        } catch (error) {
            console.error('❌ Error en API:', error);
            
            // Si hay problemas de autenticación, cerrar sesión
            if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Token')) {
                logout();
            }
            
            throw error;
        }
    }

    static async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: data
        });
    }

    static async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data
        });
    }

    static async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// ========================================
// Sistema de Roles y Permisos
// ========================================
const USER_ROLES = {
    'admin': {
        name: 'Administrador General',
        permissions: ['all'],
        description: 'Acceso completo al sistema'
    },
    'contabilidad': {
        name: 'Contabilidad',
        permissions: ['dashboard', 'invoices', 'accounting', 'compliance', 'sharepoint'],
        description: 'Gestión financiera y contable'
    },
    'rrhh': {
        name: 'Recursos Humanos',
        permissions: ['dashboard', 'personnel', 'timetracking', 'compliance', 'sharepoint'],
        description: 'Gestión de personal y nóminas'
    },
    'supervisor': {
        name: 'Supervisor',
        permissions: ['dashboard', 'timetracking'],
        description: 'Control de asistencia'
    }
};

const NAVIGATION_MENU = {
    dashboard: { icon: '📊', text: 'Dashboard', description: 'Panel principal' },
    invoices: { icon: '📄', text: 'Facturas', description: 'Gestión de facturación' },
    accounting: { icon: '💰', text: 'Contabilidad', description: 'Balance y finanzas' },
    personnel: { icon: '👥', text: 'Personal', description: 'Gestión de empleados' },
    timetracking: { icon: '⏰', text: 'Asistencia', description: 'Control de horarios' },
    compliance: { icon: '⚖️', text: 'Cumplimiento', description: 'Normativas y regulaciones' },
    sharepoint: { icon: '☁️', text: 'Respaldos', description: 'Backup y seguridad' }
};

// ========================================
// Sistema de Autenticación
// ========================================
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Validando...';
        
        console.log(`🔐 Intentando login con usuario: ${username}`);
        
        const response = await APIClient.post('/auth/login', { username, password });

        if (response.success) {
            console.log('✅ Login exitoso');
            
            AppState.isAuthenticated = true;
            AppState.token = response.token;
            AppState.user = response.user;
            AppState.userRole = response.user.role;
            AppState.sessionStart = Date.now();
            AppState.permissions = getUserPermissions(response.user.role);
            
            localStorage.setItem('tecsitel_token', response.token);
            localStorage.setItem('tecsitel_user', JSON.stringify(response.user));
            
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('loadingScreen').style.display = 'flex';
            
            setTimeout(() => {
                setupLoadingAnimation();
                initializeApp();
            }, 100);
        }
    } catch (error) {
        console.error('❌ Error en login:', error);
        showToast(`❌ Error de login: ${error.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Iniciar Sesión';
        document.getElementById('password').value = '';
    }
}

function getUserPermissions(role) {
    const roleConfig = USER_ROLES[role];
    if (!roleConfig) return {};
    
    const permissions = {};
    
    if (roleConfig.permissions.includes('all')) {
        Object.keys(NAVIGATION_MENU).forEach(key => {
            permissions[key] = true;
        });
    } else {
        roleConfig.permissions.forEach(permission => {
            permissions[permission] = true;
        });
    }
    
    return permissions;
}

function hasPermission(section) {
    return AppState.permissions[section] === true;
}

function logout() {
    console.log('👋 Cerrando sesión...');
    
    AppState.isAuthenticated = false;
    AppState.user = null;
    AppState.userRole = null;
    AppState.token = null;
    AppState.sessionStart = null;
    AppState.permissions = {};
    
    localStorage.removeItem('tecsitel_token');
    localStorage.removeItem('tecsitel_user');
    
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    
    document.getElementById('loginForm').reset();
    
    showToast('👋 Sesión cerrada correctamente', 'info');
}

async function checkExistingSession() {
    const token = localStorage.getItem('tecsitel_token');
    if (!token) return false;

    try {
        AppState.token = token;
        const response = await APIClient.get('/auth/verify');
        
        if (response.success) {
            console.log('✅ Sesión válida encontrada');
            
            AppState.isAuthenticated = true;
            AppState.user = response.user;
            AppState.userRole = response.user.role;
            AppState.sessionStart = Date.now();
            AppState.permissions = getUserPermissions(response.user.role);
            
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('loadingScreen').style.display = 'flex';
            
            setTimeout(() => {
                setupLoadingAnimation();
                initializeApp();
            }, 100);
            
            return true;
        }
    } catch (error) {
        console.error('❌ Sesión inválida:', error);
        logout();
    }
    return false;
}

// ========================================
// Carga de Datos (funciones simplificadas para la versión actual)
// ========================================
async function loadAllInitialData() {
    // Por ahora solo cargamos stats básicos
    await loadDashboardStats();
}

async function loadDashboardStats() {
    // Datos simulados para el dashboard
    AppState.stats = {
        totalIncome: 2500.00,
        pendingInvoices: 1,
        activeEmployees: 3,
        compliance: 100
    };
    updateDashboardDisplay();
}

// ========================================
// Renderizado de UI básico
// ========================================
function updateDashboardDisplay() {
    const stats = calculateStatsByRole(AppState.userRole, AppState.stats);
    
    const totalIncomeEl = document.getElementById('totalIncome');
    const pendingInvoicesEl = document.getElementById('pendingInvoices');
    const activeEmployeesEl = document.getElementById('activeEmployees');
    const complianceEl = document.getElementById('compliance');
    
    if (totalIncomeEl) totalIncomeEl.textContent = typeof stats.totalIncome === 'number' ? formatCurrency(stats.totalIncome) : stats.totalIncome;
    if (pendingInvoicesEl) pendingInvoicesEl.textContent = stats.pendingInvoices;
    if (activeEmployeesEl) activeEmployeesEl.textContent = stats.activeEmployees;
    if (complianceEl) complianceEl.textContent = stats.compliance + '%';
    
    updateStatusMessagesByRole(AppState.userRole, stats);
}

function calculateStatsByRole(role, apiStats) {
    const baseStats = {
        totalIncome: apiStats.totalIncome || 0,
        pendingInvoices: apiStats.pendingInvoices || 0,
        activeEmployees: apiStats.activeEmployees || 0,
        compliance: apiStats.compliance || 100
    };
    
    switch(role) {
        case 'contabilidad':
            return { ...baseStats, activeEmployees: 'N/A' };
        case 'supervisor':
            return {
                totalIncome: 'N/A',
                pendingInvoices: 'N/A',
                activeEmployees: baseStats.activeEmployees,
                compliance: 'N/A'
            };
        case 'rrhh':
            return {
                totalIncome: 'N/A',
                pendingInvoices: 'N/A',
                activeEmployees: baseStats.activeEmployees,
                compliance: baseStats.compliance
            };
        default:
            return baseStats;
    }
}

function updateStatusMessagesByRole(role, stats) {
    const incomeStatus = document.getElementById('incomeStatus');
    const invoiceStatus = document.getElementById('invoiceStatus');
    const employeeStatus = document.getElementById('employeeStatus');
    const complianceStatus = document.getElementById('complianceStatus');
    
    if (incomeStatus) incomeStatus.textContent = role === 'admin' || role === 'contabilidad' ? '✅ Sistema conectado' : '🔒 Sin acceso';
    if (invoiceStatus) invoiceStatus.textContent = stats.pendingInvoices > 0 ? '⚠️ Por gestionar' : '✅ Al día';
    if (employeeStatus) employeeStatus.textContent = role === 'supervisor' || role === 'admin' || role === 'rrhh' ? '✅ Base de datos activa' : '🔒 Sin acceso';
    if (complianceStatus) complianceStatus.textContent = role === 'admin' || role === 'rrhh' || role === 'contabilidad' ? '✅ Sistema activo' : '🔒 Sin acceso';
}

// ========================================
// Inicialización de la Aplicación
// ========================================
async function initializeApp() {
    updateLoadingStatus('🔐 Configurando sistema de roles...', false);
    buildNavigationMenu();
    buildBottomNavigation();
    updateUserInterface();
    
    updateLoadingStatus('🗄️ Cargando datos iniciales...', false);
    await loadAllInitialData();
    
    updateLoadingStatus('🎨 Finalizando configuración...', false);
    
    setTimeout(() => {
        updateLoadingStatus('🚀 ¡Sistema listo!', false);
        
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            const appContainer = document.getElementById('appContainer');
            appContainer.style.display = 'flex';
            
            setTimeout(() => {
                appContainer.classList.add('loaded');
                showTab('dashboard');
                setupEventListeners();
                
                setTimeout(() => {
                    showToast(`🎉 ¡Bienvenido ${AppState.user.name}!`, 'success');
                }, 500);
            }, 100);
        }, 1500);
    }, 500);
}

function updateUserInterface() {
    if (!AppState.user) return;
    
    const { name, role } = AppState.user;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatar = document.getElementById('userAvatar');
    const userAvatarSidebar = document.getElementById('userAvatarSidebar');
    const userNameSidebar = document.getElementById('userNameSidebar');
    const userRoleSidebar = document.getElementById('userRoleSidebar');
    
    if (userNameDisplay) userNameDisplay.textContent = name;
    if (userAvatar) userAvatar.textContent = initials;
    if (userAvatarSidebar) userAvatarSidebar.textContent = initials;
    if (userNameSidebar) userNameSidebar.textContent = name;
    if (userRoleSidebar) userRoleSidebar.textContent = USER_ROLES[role]?.name || role;
}

function setupEventListeners() {
    window.addEventListener('resize', buildBottomNavigation);
    
    document.addEventListener('click', e => {
        if (e.target.classList.contains('modal')) closeModal(e.target.id);
    });
    
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) closeModal(openModal.id);
        }
    });
}

// ========================================
// Construcción de Menús
// ========================================
function buildNavigationMenu() {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) return;
    
    navMenu.innerHTML = '';
    
    Object.keys(NAVIGATION_MENU).forEach(key => {
        if (hasPermission(key)) {
            const menuItem = NAVIGATION_MENU[key];
            const navItem = document.createElement('button');
            navItem.className = 'nav-item';
            navItem.setAttribute('data-tab', key);
            navItem.innerHTML = `
                <span class="nav-icon">${menuItem.icon}</span>
                <span class="nav-text">${menuItem.text}</span>
            `;
            navItem.addEventListener('click', () => showTab(key));
            navMenu.appendChild(navItem);
        }
    });
}

function buildBottomNavigation() {
    const bottomNav = document.getElementById('bottomNav');
    if (!bottomNav) return;
    
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        bottomNav.innerHTML = '';
        let itemCount = 0;
        const maxItems = 4;
        
        Object.keys(NAVIGATION_MENU).forEach(key => {
            if (hasPermission(key) && itemCount < maxItems) {
                const menuItem = NAVIGATION_MENU[key];
                const navItem = document.createElement('a');
                navItem.href = '#';
                navItem.className = 'bottom-nav-item';
                navItem.setAttribute('data-tab', key);
                navItem.innerHTML = `
                    <span class="bottom-nav-icon">${menuItem.icon}</span>
                    ${menuItem.text}
                `;
                navItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    showTab(key);
                });
                bottomNav.appendChild(navItem);
                itemCount++;
            }
        });
        
        bottomNav.style.display = 'flex';
    } else {
        bottomNav.style.display = 'none';
    }
}

// ========================================
// Gestión de Navegación
// ========================================
function showTab(tabName) {
    if (!hasPermission(tabName)) {
        showToast('❌ No tiene permisos para acceder a esta sección', 'error');
        return;
    }
    
    if (window.innerWidth <= 1024) {
        closeSidebar();
    }
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
        
        const menuItem = NAVIGATION_MENU[tabName];
        if (menuItem) {
            const pageTitle = document.getElementById('pageTitle');
            if (pageTitle) pageTitle.textContent = menuItem.text;
        }
        
        updateActiveNavItem(tabName);
        loadTabContent(tabName);
    }
}

function updateActiveNavItem(activeTab) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === activeTab) {
            item.classList.add('active');
        }
    });
    
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === activeTab) {
            item.classList.add('active');
        }
    });
}

async function loadTabContent(tabName) {
    switch(tabName) {
        case 'dashboard':
            await loadDashboardStats();
            renderQuickAccessGrid();
            break;
        case 'invoices':
            // Aquí cargarías las facturas cuando implementes la funcionalidad completa
            break;
        case 'personnel':
            // Aquí cargarías los empleados cuando implementes la funcionalidad completa
            break;
        case 'timetracking':
            // Aquí cargarías los registros de tiempo cuando implementes la funcionalidad completa
            break;
    }
}

function renderQuickAccessGrid() {
    const container = document.getElementById('quickAccessGrid');
    if (!container) return;
    
    const quickAccessItems = getQuickAccessItemsByRole(AppState.userRole);
    
    container.innerHTML = '';
    
    quickAccessItems.forEach(item => {
        const card = document.createElement('div');
        card.className = `quick-access-card ${item.color}`;
        card.onclick = () => {
            if (item.action === 'tab') {
                showTab(item.target);
            } else if (item.action === 'modal') {
                showModal(item.target);
            } else if (item.action === 'function') {
                window[item.target]();
            }
        };
        
        card.innerHTML = `
            <span class="quick-access-icon">${item.icon}</span>
            <div class="quick-access-title">${item.title}</div>
            <div class="quick-access-desc">${item.description}</div>
        `;
        
        container.appendChild(card);
    });
}

function getQuickAccessItemsByRole(role) {
    const baseItems = [
        { icon: '📄', title: 'Nueva Factura', description: 'Crear factura electrónica', action: 'modal', target: 'newInvoice', color: 'primary' },
        { icon: '👥', title: 'Nuevo Empleado', description: 'Agregar empleado', action: 'modal', target: 'newEmployee', color: 'info' },
        { icon: '⏰', title: 'Marcar Tiempo', description: 'Registrar asistencia', action: 'modal', target: 'timeEntry', color: 'warning' },
        { icon: '💰', title: 'Contabilidad', description: 'Ver balance', action: 'tab', target: 'accounting', color: 'success' },
        { icon: '⚖️', title: 'Cumplimiento', description: 'Normativas', action: 'tab', target: 'compliance', color: 'info' },
        { icon: '☁️', title: 'Respaldos', description: 'Exportar datos', action: 'tab', target: 'sharepoint', color: 'primary' }
    ];
    
    return baseItems.filter(item => {
        if (role === 'admin') return true;
        if (role === 'contabilidad') return ['newInvoice', 'accounting', 'compliance', 'sharepoint'].includes(item.target.replace('new', '').toLowerCase());
        if (role === 'rrhh') return ['newEmployee', 'timeEntry', 'compliance', 'sharepoint'].includes(item.target.replace('new', '').toLowerCase());
        if (role === 'supervisor') return ['timeEntry'].includes(item.target);
        return false;
    });
}

// ========================================
// Gestión de Sidebar
// ========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (window.innerWidth <= 1024) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}

// ========================================
// Sistema de Modales
// ========================================
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            form.querySelectorAll('.form-error').forEach(error => error.textContent = '');
            form.querySelectorAll('.error').forEach(input => input.classList.remove('error'));
        }
    }
}

// ========================================
// Sistema de Notificaciones
// ========================================
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = getToastIcon(type);
    
    toast.innerHTML = `
        <div style="font-size: 20px;">${icon}</div>
        <div class="toast-content">${message}</div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; padding: 4px; opacity: 0.7;">&times;</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'toastSlideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        case 'info': 
        default: return 'ℹ️';
    }
}

// ========================================
// Funciones de Utilidad
// ========================================
function formatCurrency(amount, currency = 'PEN') {
    const symbol = currency === 'USD' ? '$' : 'S/';
    return `${symbol} ${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE');
}

function formatTime(timeString) {
    if (!timeString) return 'N/A';
    return timeString.substring(0, 5);
}

function calculateHours(entryTime, exitTime) {
    if (!entryTime || !exitTime) return 0;
    
    const [entryHour, entryMin] = entryTime.split(':').map(Number);
    const [exitHour, exitMin] = exitTime.split(':').map(Number);
    
    const entryMinutes = entryHour * 60 + entryMin;
    const exitMinutes = exitHour * 60 + exitMin;
    
    let diffMinutes = exitMinutes - entryMinutes;
    
    if (diffMinutes < 0) {
        diffMinutes += 24 * 60;
    }
    
    return diffMinutes / 60;
}

function getStatusClass(status) {
    switch(status.toLowerCase()) {
        case 'pagado':
        case 'activo':
            return 'active';
        case 'pendiente':
            return 'pending';
        case 'vencido':
        case 'cesado':
            return 'danger';
        default:
            return 'inactive';
    }
}

function validateDNI(dni) {
    return /^[0-9]{8}$/.test(dni);
}

function validateRUC(ruc) {
    return /^[0-9]{11}$/.test(ruc);
}

function sanitizeInput(input) {
    return input.trim().replace(/[<>]/g, '');
}

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) errorEl.textContent = message;
}

// ========================================
// Animaciones de Carga
// ========================================
function setupLoadingAnimation() {
    const particles = document.getElementById('loadingParticles');
    if (!particles) return;
    
    particles.innerHTML = '';
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        const size = Math.random() * 4 + 2;
        const duration = Math.random() * 3 + 2;
        const delay = Math.random() * 2;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2});
            border-radius: 50%;
            left: ${left}%;
            top: ${top}%;
            animation: float ${duration}s ease-in-out infinite;
            animation-delay: ${delay}s;
            pointer-events: none;
        `;
        particles.appendChild(particle);
    }
}

function updateLoadingStatus(message, isError = false) {
    const statusEl = document.getElementById('loadingStatus');
    if (statusEl) {
        statusEl.style.opacity = '0';
        
        setTimeout(() => {
            statusEl.textContent = message;
            statusEl.className = `loading-status ${isError ? 'error' : ''}`;
            statusEl.style.opacity = '1';
        }, 200);
    }
}

// ========================================
// Funciones de Exportación (placeholder)
// ========================================
function downloadFullBackup() {
    showToast('📥 Función de respaldo en desarrollo', 'info');
}

function downloadInvoicesCSV() {
    showToast('📊 Función de exportación en desarrollo', 'info');
}

// ========================================
// Placeholders para formularios
// ========================================
function saveEmployee(event) {
    event.preventDefault();
    showToast('👥 Función de empleados en desarrollo', 'info');
    closeModal('newEmployee');
}

function saveInvoice(event) {
    event.preventDefault();
    showToast('📄 Función de facturas en desarrollo', 'info');
    closeModal('newInvoice');
}

function saveTimeEntry(event) {
    event.preventDefault();
    showToast('⏰ Función de marcaje en desarrollo', 'info');
    closeModal('timeEntry');
}

// ========================================
// Inicialización cuando el DOM esté listo
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Tecsitel v4.0 con API PostgreSQL/Neon iniciado');
    
    // Test de conexión inicial
    try {
        const healthCheck = await fetch(`${CONFIG.API_BASE_URL}/health`);
        const healthData = await healthCheck.json();
        console.log('✅ API Health Check:', healthData);
    } catch (error) {
        console.error('❌ API no disponible:', error);
        showToast('⚠️ Problemas de conectividad con la API', 'warning');
    }
    
    // Verificar si hay una sesión existente
    const hasExistingSession = await checkExistingSession();
    
    if (!hasExistingSession) {
        // Mostrar pantalla de login
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
        document.getElementById('loadingScreen').style.display = 'none';
    }
    
    // Configurar navegación inicial
    buildBottomNavigation();
    
    // Mostrar el menú toggle en móvil
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle && window.innerWidth <= 1024) {
        menuToggle.style.display = 'block';
    }
    
    console.log('👨‍💼 Roles disponibles:', Object.keys(USER_ROLES));
});

// Añadir estilos para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    @keyframes float {
        0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.6;
        }
        25% {
            transform: translateY(-10px) rotate(90deg);
            opacity: 1;
        }
        50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.8;
        }
        75% {
            transform: translateY(-10px) rotate(270deg);
            opacity: 1;
        }
    }

    @keyframes fadeInOut {
        0%, 100% {
            opacity: 0.3;
        }
        50% {
            opacity: 1;
        }
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .btn-sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        margin: 0 0.125rem;
    }
    
    .text-center {
        text-align: center;
    }
`;
document.head.appendChild(style);
