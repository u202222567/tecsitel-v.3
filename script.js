// ========================================
// TECSITEL v4.0 - Sistema de Gestión Empresarial
// Versión corregida para Netlify
// ========================================

// ========================================
// Configuración Global y Estado
// ========================================
const CONFIG = {
    // Configuración corregida para Netlify Functions
    API_BASE_URL: window.location.hostname === 'localhost' ? '/api' : '/.netlify/functions/api',
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
// Utilitarios de API mejorados
// ========================================
class APIClient {
    static async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(AppState.token && { 'Authorization': `Bearer ${AppState.token}` })
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            
            // Verificar si la respuesta es JSON válida
            const contentType = response.headers.get('content-type');
            const isJson = contentType && contentType.includes('application/json');
            
            let data;
            if (isJson) {
                data = await response.json();
            } else {
                // Si no es JSON, obtener el texto para debug
                const text = await response.text();
                console.error('Respuesta no JSON:', text);
                throw new Error(`Respuesta inválida del servidor: ${response.status}`);
            }

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP ${response.status}`);
            }

            console.log(`✅ API Response: ${url}`, data);
            return data;
            
        } catch (error) {
            console.error('❌ Error en API:', error);
            
            // Manejar errores de red
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                showToast('❌ Error de conectividad. Verifique su conexión a internet.', 'error');
            }
            
            // Si el token es inválido, cerrar sesión
            if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Token inválido')) {
                console.log('Token inválido, cerrando sesión...');
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
    dashboard: {
        icon: '📊',
        text: 'Dashboard',
        description: 'Panel principal'
    },
    invoices: {
        icon: '📄',
        text: 'Facturas',
        description: 'Gestión de facturación'
    },
    accounting: {
        icon: '💰',
        text: 'Contabilidad',
        description: 'Balance y finanzas'
    },
    personnel: {
        icon: '👥',
        text: 'Personal',
        description: 'Gestión de empleados'
    },
    timetracking: {
        icon: '⏰',
        text: 'Asistencia',
        description: 'Control de horarios'
    },
    compliance: {
        icon: '⚖️',
        text: 'Cumplimiento',
        description: 'Normativas y regulaciones'
    },
    sharepoint: {
        icon: '☁️',
        text: 'Respaldos',
        description: 'Backup y seguridad'
    }
};

// ========================================
// Funciones de Validación y Sanitización
// ========================================
function validateDNI(dni) {
    return /^[0-9]{8}$/.test(dni);
}

function validateRUC(ruc) {
    return /^[0-9]{11}$/.test(ruc);
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
}

// ========================================
// Sistema de Autenticación
// ========================================
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Validaciones básicas
    if (!username || !password) {
        showToast('❌ Por favor complete todos los campos', 'error');
        return;
    }
    
    try {
        // Mostrar loading
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Validando...';
        
        // Llamar a la API de login
        const response = await APIClient.post('/auth/login', {
            username: sanitizeInput(username),
            password: password
        });

        if (response.success) {
            AppState.isAuthenticated = true;
            AppState.token = response.token;
            AppState.user = response.user;
            AppState.userRole = response.user.role;
            AppState.sessionStart = Date.now();
            AppState.permissions = getUserPermissions(response.user.role);
            
            // Guardar token en localStorage
            localStorage.setItem('tecsitel_token', response.token);
            localStorage.setItem('tecsitel_user', JSON.stringify(response.user));
            
            // Ocultar pantalla de login
            document.getElementById('loginScreen').style.display = 'none';
            
            // Mostrar pantalla de loading
            const loadingScreen = document.getElementById('loadingScreen');
            loadingScreen.style.display = 'flex';
            
            // Inicializar app
            setTimeout(() => {
                setupLoadingAnimation();
                initializeApp();
            }, 100);
            
        }
    } catch (error) {
        console.error('Error en login:', error);
        showToast(`❌ Error de login: ${error.message}`, 'error');
        
        // Restaurar botón
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Iniciar Sesión';
        
        // Limpiar contraseña
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

async function logout() {
    try {
        if (AppState.token) {
            await APIClient.post('/auth/logout');
        }
    } catch (error) {
        console.error('Error en logout:', error);
    }
    
    // Limpiar estado local
    AppState.isAuthenticated = false;
    AppState.user = null;
    AppState.userRole = null;
    AppState.token = null;
    AppState.sessionStart = null;
    AppState.permissions = {};
    
    // Limpiar localStorage
    localStorage.removeItem('tecsitel_token');
    localStorage.removeItem('tecsitel_user');
    
    // Mostrar login
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    
    // Limpiar formulario
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();
    
    showToast('👋 Sesión cerrada correctamente', 'info');
}

// Verificar sesión existente al cargar
async function checkExistingSession() {
    const token = localStorage.getItem('tecsitel_token');
    const userData = localStorage.getItem('tecsitel_user');

    if (token && userData) {
        try {
            AppState.token = token;
            const response = await APIClient.get('/auth/verify');

            if (response.success) {
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
            console.error('Sesión inválida o expirada:', error);
            localStorage.removeItem('tecsitel_token');
            localStorage.removeItem('tecsitel_user');
        }
    }

    return false;
}

// ========================================
// Gestión de Datos con API
// ========================================
async function loadEmployees() {
    if (!hasPermission('personnel') && !hasPermission('timetracking')) return;
    
    try {
        const response = await APIClient.get('/employees');
        if (response.success) {
            AppState.employees = response.employees.map(emp => ({
                dni: emp.dni,
                firstName: emp.first_name,
                lastName: emp.last_name,
                avatar: `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase(),
                status: emp.status,
                notes: emp.notes || '',
                dateCreated: emp.created_at?.split('T')[0] || ''
            }));
            renderEmployees();
            renderEmployeeOptions();
        }
    } catch (error) {
        console.error('Error cargando empleados:', error);
        showToast(`❌ Error cargando empleados: ${error.message}`, 'error');
    }
}

async function saveEmployee(event) {
    event.preventDefault();
    const form = event.target;
    
    const employeeData = {
        dni: form.dni.value,
        first_name: sanitizeInput(form.firstName.value),
        last_name: sanitizeInput(form.lastName.value),
        status: form.status.value,
        notes: sanitizeInput(form.notes.value || '')
    };
    
    // Validación de DNI
    if (!validateDNI(employeeData.dni)) {
        const dniError = document.getElementById('dniError');
        if (dniError) {
            dniError.textContent = 'DNI debe tener exactamente 8 dígitos';
            form.dni.classList.add('error');
            form.dni.focus();
        }
        return;
    }
    
    try {
        const response = await APIClient.post('/employees', employeeData);
        
        if (response.success) {
            await loadEmployees();
            await loadDashboardStats();
            closeModal('newEmployee');
            form.reset();
            showToast(`✅ Empleado ${employeeData.first_name} ${employeeData.last_name} agregado correctamente`, 'success');
        }
    } catch (error) {
        console.error('Error guardando empleado:', error);
        showToast(`❌ Error guardando empleado: ${error.message}`, 'error');
        
        if (error.message.includes('ya existe')) {
            const dniError = document.getElementById('dniError');
            if (dniError) {
                dniError.textContent = 'Este DNI ya está registrado';
                form.dni.classList.add('error');
            }
        }
    }
}

async function deleteEmployee(dni) {
    if (!confirm('¿Está seguro de que desea eliminar este empleado?')) {
        return;
    }
    
    try {
        const response = await APIClient.delete(`/employees/${dni}`);
        
        if (response.success) {
            await loadEmployees();
            await loadDashboardStats();
            showToast('🗑️ Empleado eliminado correctamente', 'info');
        }
    } catch (error) {
        console.error('Error eliminando empleado:', error);
        showToast(`❌ Error eliminando empleado: ${error.message}`, 'error');
    }
}

// Funciones similares para facturas y registros de tiempo...
async function loadInvoices() {
    if (!hasPermission('invoices')) return;
    
    try {
        const response = await APIClient.get('/invoices');
        if (response.success) {
            AppState.invoices = response.invoices.map(inv => ({
                id: inv.id,
                invoice_number: inv.invoice_number,
                clientRuc: inv.client_ruc,
                clientName: inv.client_name,
                description: inv.description,
                currency: inv.currency,
                amount: parseFloat(inv.amount),
                status: inv.status,
                isExport: inv.is_export,
                date: inv.invoice_date
            }));
            renderInvoices();
        }
    } catch (error) {
        console.error('Error cargando facturas:', error);
        showToast(`❌ Error cargando facturas: ${error.message}`, 'error');
    }
}

async function saveInvoice(event) {
    event.preventDefault();
    const form = event.target;
    
    const invoiceData = {
        client_ruc: form.clientRuc.value,
        client_name: sanitizeInput(form.clientName.value),
        description: sanitizeInput(form.description.value),
        currency: form.currency.value,
        amount: parseFloat(form.amount.value),
        is_export: form.isExportInvoice.checked
    };
    
    if (!validateRUC(invoiceData.client_ruc)) {
        const rucError = document.getElementById('rucError');
        if (rucError) {
            rucError.textContent = 'RUC debe tener exactamente 11 dígitos';
            form.clientRuc.classList.add('error');
            form.clientRuc.focus();
        }
        return;
    }
    
    try {
        const response = await APIClient.post('/invoices', invoiceData);
        
        if (response.success) {
            await loadInvoices();
            await loadDashboardStats();
            closeModal('newInvoice');
            form.reset();
            showToast(`✅ Factura ${response.invoice.invoice_number} creada correctamente`, 'success');
        }
    } catch (error) {
        console.error('Error guardando factura:', error);
        showToast(`❌ Error guardando factura: ${error.message}`, 'error');
    }
}

async function deleteInvoice(invoiceId) {
    if (!confirm('¿Está seguro de que desea eliminar esta factura?')) {
        return;
    }
    
    try {
        const response = await APIClient.delete(`/invoices/${invoiceId}`);
        
        if (response.success) {
            await loadInvoices();
            await loadDashboardStats();
            showToast('🗑️ Factura eliminada correctamente', 'info');
        }
    } catch (error) {
        console.error('Error eliminando factura:', error);
        showToast(`❌ Error eliminando factura: ${error.message}`, 'error');
    }
}

// ========================================
// Dashboard y Estadísticas
// ========================================
async function loadDashboardStats() {
    if (!hasPermission('dashboard')) return;
    
    try {
        const response = await APIClient.get('/dashboard/stats');
        if (response.success) {
            AppState.stats = response.stats;
            updateDashboardDisplay();
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        showToast(`❌ Error cargando estadísticas: ${error.message}`, 'error');
    }
}

function updateDashboardDisplay() {
    const stats = calculateStatsByRole(AppState.userRole, AppState.stats);
    
    const elements = {
        totalIncome: document.getElementById('totalIncome'),
        pendingInvoices: document.getElementById('pendingInvoices'),
        activeEmployees: document.getElementById('activeEmployees'),
        compliance: document.getElementById('compliance')
    };
    
    if (elements.totalIncome) {
        elements.totalIncome.textContent = typeof stats.totalIncome === 'number' 
            ? formatCurrency(stats.totalIncome) 
            : stats.totalIncome;
    }
    if (elements.pendingInvoices) elements.pendingInvoices.textContent = stats.pendingInvoices;
    if (elements.activeEmployees) elements.activeEmployees.textContent = stats.activeEmployees;
    if (elements.compliance) elements.compliance.textContent = stats.compliance + '%';
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

// ========================================
// Funciones de Renderizado
// ========================================
function renderEmployees() {
    const tbody = document.querySelector('#employeesTable tbody');
    if (!tbody) return;
    
    if (AppState.employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay empleados registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = AppState.employees.map(e => `
        <tr data-dni="${e.dni}">
            <td><strong>${e.dni}</strong></td>
            <td>${e.firstName} ${e.lastName}</td>
            <td><span class="status-badge ${getStatusClass(e.status)}">${e.status}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editEmployee('${e.dni}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteEmployee('${e.dni}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function renderInvoices() {
    const tbody = document.querySelector('#invoicesTable tbody');
    if (!tbody) return;
    
    if (AppState.invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay facturas registradas</td></tr>';
        return;
    }
    
    tbody.innerHTML = AppState.invoices.map(i => `
        <tr>
            <td><strong>${i.invoice_number}</strong></td>
            <td>${i.clientName}</td>
            <td><strong>${formatCurrency(i.amount, i.currency)}</strong></td>
            <td><span class="status-badge ${getStatusClass(i.status)}">${i.status}</span></td>
            <td>${formatDate(i.date)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteInvoice(${i.id})">🗑️</button></td>
        </tr>
    `).join('');
}

function renderEmployeeOptions() {
    const select = document.getElementById('employeeSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccionar empleado...</option>' + 
        AppState.employees
            .filter(emp => emp.status === 'Activo')
            .map(emp => `<option value="${emp.dni}">${emp.firstName} ${emp.lastName}</option>`)
            .join('');
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

function getStatusClass(status) {
    const s = status.toLowerCase();
    if (s === 'pagado' || s === 'activo') return 'active';
    if (s === 'pendiente') return 'pending';
    if (s === 'vencido' || s === 'cesado') return 'danger';
    return 'inactive';
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
        
        if (modalId === 'timeEntry') {
            const dateInput = modal.querySelector('input[name="date"]');
            if (dateInput && !dateInput.value) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
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
// Sistema de Notificaciones Toast
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
// Navegación y UI
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
    try {
        switch(tabName) {
            case 'dashboard':
                await loadDashboardStats();
                renderQuickAccessGrid();
                break;
            case 'invoices':
                await loadInvoices();
                break;
            case 'personnel':
                await loadEmployees();
                break;
            case 'timetracking':
                await loadTimeEntries();
                await loadEmployees(); // Para el select de empleados
                break;
            case 'compliance':
                // Contenido estático, no requiere carga
                break;
            case 'accounting':
                // Contenido estático, no requiere carga
                break;
            case 'sharepoint':
                // Contenido estático, no requiere carga
                break;
        }
    } catch (error) {
        console.error(`Error cargando contenido de ${tabName}:`, error);
        showToast(`❌ Error cargando contenido: ${error.message}`, 'error');
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
    const adminItems = [
        { icon: '📄', title: 'Nueva Factura', description: 'Crear factura electrónica', action: 'modal', target: 'newInvoice', color: 'primary' },
        { icon: '👥', title: 'Gestionar Personal', description: 'Ver y editar empleados', action: 'tab', target: 'personnel', color: 'info' },
        { icon: '⏰', title: 'Control Asistencia', description: 'Marcar tiempo y horarios', action: 'tab', target: 'timetracking', color: 'warning' },
        { icon: '💰', title: 'Ver Contabilidad', description: 'Balance y finanzas', action: 'tab', target: 'accounting', color: 'success' }
    ];
    
    const contabilidadItems = [
        { icon: '📄', title: 'Nueva Factura', description: 'Crear factura electrónica', action: 'modal', target: 'newInvoice', color: 'primary' },
        { icon: '📋', title: 'Ver Facturas', description: 'Gestionar facturas', action: 'tab', target: 'invoices', color: 'warning' },
        { icon: '💰', title: 'Contabilidad', description: 'Balance general', action: 'tab', target: 'accounting', color: 'success' },
        { icon: '⚖️', title: 'Cumplimiento', description: 'Normativas SUNAT', action: 'tab', target: 'compliance', color: 'info' }
    ];
    
    const rrhhItems = [
        { icon: '👥', title: 'Nuevo Empleado', description: 'Agregar personal', action: 'modal', target: 'newEmployee', color: 'primary' },
        { icon: '📋', title: 'Ver Personal', description: 'Gestionar empleados', action: 'tab', target: 'personnel', color: 'info' },
        { icon: '⏰', title: 'Control Asistencia', description: 'Marcar horarios', action: 'tab', target: 'timetracking', color: 'warning' },
        { icon: '⚖️', title: 'Cumplimiento', description: 'Normativas SUNAFIL', action: 'tab', target: 'compliance', color: 'success' }
    ];
    
    const supervisorItems = [
        { icon: '⏰', title: 'Marcar Tiempo', description: 'Registrar asistencia', action: 'modal', target: 'timeEntry', color: 'primary' },
        { icon: '📊', title: 'Ver Asistencia', description: 'Control de horarios', action: 'tab', target: 'timetracking', color: 'info' }
    ];
    
    switch(role) {
        case 'admin': return adminItems;
        case 'contabilidad': return contabilidadItems;
        case 'rrhh': return rrhhItems;
        case 'supervisor': return supervisorItems;
        default: return [];
    }
}

// ========================================
// Sidebar y navegación responsiva
// ========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (window.innerWidth <= 1024) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        
        if (sidebar.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ========================================
// Carga de registros de tiempo
// ========================================
async function loadTimeEntries() {
    if (!hasPermission('timetracking')) return;
    
    try {
        const response = await APIClient.get('/time-entries');
        if (response.success) {
            AppState.timeEntries = response.timeEntries.map(entry => ({
                id: entry.id,
                dni: entry.employee_dni,
                name: `${entry.first_name} ${entry.last_name}`,
                date: entry.entry_date,
                entryTime: entry.entry_time || '',
                exitTime: entry.exit_time || '',
                notes: entry.notes || ''
            }));
            renderTimeEntries();
        }
    } catch (error) {
        console.error('Error cargando registros de tiempo:', error);
        showToast(`❌ Error cargando registros: ${error.message}`, 'error');
    }
}

function renderTimeEntries() {
    const tbody = document.querySelector('#timeEntriesTable tbody');
    if (!tbody) return;
    
    if (AppState.timeEntries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay registros de asistencia</td></tr>';
        return;
    }
    
    tbody.innerHTML = AppState.timeEntries.map(e => `
        <tr>
            <td>${e.name}</td>
            <td>${formatDate(e.date)}</td>
            <td>${formatTime(e.entryTime)}</td>
            <td>${formatTime(e.exitTime)}</td>
            <td>${calculateHours(e.entryTime, e.exitTime).toFixed(1)}h</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteTimeEntry(${e.id})">🗑️</button></td>
        </tr>
    `).join('');
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
        diffMinutes += 24 * 60; // Manejar casos donde la salida es al día siguiente
    }
    
    return diffMinutes / 60;
}

async function saveTimeEntry(event) {
    event.preventDefault();
    const form = event.target;
    
    const timeData = {
        employee_dni: form.employeeDni.value,
        entry_date: form.date.value,
        entry_time: form.entryTime.value || null,
        exit_time: form.exitTime.value || null,
        notes: sanitizeInput(form.notes.value || '')
    };
    
    if (!timeData.employee_dni || !timeData.entry_date) {
        showToast('❌ Empleado y fecha son requeridos', 'error');
        return;
    }
    
    if (!timeData.entry_time && !timeData.exit_time) {
        showToast('❌ Debe ingresar al menos la hora de entrada o salida', 'error');
        return;
    }
    
    try {
        const response = await APIClient.post('/time-entries', timeData);
        
        if (response.success) {
            await loadTimeEntries();
            closeModal('timeEntry');
            form.reset();
            showToast('✅ Marcaje registrado correctamente', 'success');
        }
    } catch (error) {
        console.error('Error guardando marcaje:', error);
        showToast(`❌ Error guardando marcaje: ${error.message}`, 'error');
    }
}

async function deleteTimeEntry(entryId) {
    if (!confirm('¿Está seguro de que desea eliminar este registro?')) {
        return;
    }
    
    try {
        const response = await APIClient.delete(`/time-entries/${entryId}`);
        
        if (response.success) {
            await loadTimeEntries();
            showToast('🗑️ Registro eliminado correctamente', 'info');
        }
    } catch (error) {
        console.error('Error eliminando registro:', error);
        showToast(`❌ Error eliminando registro: ${error.message}`, 'error');
    }
}

// ========================================
// Funciones de Exportación
// ========================================
function downloadFullBackup() {
    showToast('📥 Generando respaldo completo del sistema...', 'info');
    
    const csvData = generateBackupCSV();
    downloadCSV(csvData, `tecsitel_respaldo_completo_${new Date().toISOString().split('T')[0]}.csv`);
    
    showToast('✅ Respaldo completo descargado exitosamente', 'success');
}

function downloadInvoicesCSV() {
    showToast('📊 Exportando facturas...', 'info');
    
    const csvData = generateInvoicesCSV();
    downloadCSV(csvData, `tecsitel_facturas_${new Date().toISOString().split('T')[0]}.csv`);
    
    showToast('✅ Facturas exportadas exitosamente', 'success');
}

function generateBackupCSV() {
    let csv = `RESPALDO COMPLETO TECSITEL - ${new Date().toLocaleDateString()}\n\n`;
    
    csv += `SISTEMA,VERSIÓN,EMPRESA,RUC,FECHA_RESPALDO\n`;
    csv += `"Tecsitel","${CONFIG.VERSION}","${CONFIG.COMPANY.name}","${CONFIG.COMPANY.ruc}","${new Date().toISOString()}"\n\n`;
    
    csv += `SECCIÓN: FACTURAS\n`;
    csv += `ID,Número,RUC_Cliente,Nombre_Cliente,Descripción,Moneda,Monto,Estado,Exportación,Fecha\n`;
    AppState.invoices.forEach(invoice => {
        csv += `"${invoice.id}","${invoice.invoice_number}","${invoice.clientRuc}","${invoice.clientName}","${invoice.description}","${invoice.currency}","${invoice.amount}","${invoice.status}","${invoice.isExport}","${invoice.date}"\n`;
    });
    csv += '\n';
    
    csv += `SECCIÓN: EMPLEADOS\n`;
    csv += `DNI,Nombres,Apellidos,Estado,Notas,Fecha_Creación\n`;
    AppState.employees.forEach(employee => {
        csv += `"${employee.dni}","${employee.firstName}","${employee.lastName}","${employee.status}","${employee.notes || ''}","${employee.dateCreated || ''}"\n`;
    });
    csv += '\n';
    
    csv += `SECCIÓN: ASISTENCIA\n`;
    csv += `ID,DNI,Nombre_Completo,Fecha,Hora_Entrada,Hora_Salida,Horas_Trabajadas,Notas\n`;
    AppState.timeEntries.forEach(entry => {
        const hours = calculateHours(entry.entryTime, entry.exitTime);
        csv += `"${entry.id}","${entry.dni}","${entry.name}","${entry.date}","${entry.entryTime}","${entry.exitTime}","${hours.toFixed(2)}","${entry.notes || ''}"\n`;
    });
    
    return csv;
}

function generateInvoicesCSV() {
    let csv = `FACTURAS TECSITEL - ${new Date().toLocaleDateString()}\n\n`;
    csv += `Número,RUC_Cliente,Nombre_Cliente,Descripción,Moneda,Monto,Estado,Exportación,Fecha\n`;
    
    AppState.invoices.forEach(invoice => {
        csv += `"${invoice.invoice_number}","${invoice.clientRuc}","${invoice.clientName}","${invoice.description}","${invoice.currency}","${invoice.amount}","${invoice.status}","${invoice.isExport ? 'Sí' : 'No'}","${invoice.date}"\n`;
    });
    
    return csv;
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ========================================
// Animaciones de carga
// ========================================
function setupLoadingAnimation() {
    const particles = document.getElementById('loadingParticles');
    if (!particles) return;
    
    particles.innerHTML = '';
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        const size = Math.random() * 6 + 2;
        const duration = Math.random() * 4 + 3;
        const delay = Math.random() * 5;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(255, 255, 255, ${Math.random() * 0.6 + 0.4});
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
        statusEl.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            statusEl.textContent = message;
            statusEl.className = `loading-status ${isError ? 'error' : ''}`;
            
            statusEl.style.opacity = '1';
            statusEl.style.transform = 'translateY(0)';
        }, 200);
    }
}

// ========================================
// Inicialización de la aplicación
// ========================================
async function initializeApp() {
    updateLoadingStatus('🔐 Validando credenciales...', false);
    
    setTimeout(() => {
        updateLoadingStatus('📊 Configurando sistema de roles...', false);
        buildNavigationMenu();
        buildBottomNavigation();
        
        setTimeout(() => {
            updateLoadingStatus('👤 Actualizando información de usuario...', false);
            updateUserInterface();
            
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
                            showToast(`🎉 ¡Bienvenido ${AppState.user.name}!`, 'success', 3000);
                        }, 500);
                    }, 100);
                }, 1500);
            }, 500);
        }, 500);
    }, 800);
}

function updateUserInterface() {
    if (!AppState.user) return;
    
    const initials = AppState.user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    const elements = {
        userNameDisplay: document.getElementById('userNameDisplay'),
        userAvatar: document.getElementById('userAvatar'),
        userAvatarSidebar: document.getElementById('userAvatarSidebar'),
        userNameSidebar: document.getElementById('userNameSidebar'),
        userRoleSidebar: document.getElementById('userRoleSidebar')
    };
    
    if (elements.userNameDisplay) elements.userNameDisplay.textContent = AppState.user.name;
    if (elements.userAvatar) {
        elements.userAvatar.textContent = initials;
        elements.userAvatar.title = `${AppState.user.name} - Cerrar sesión`;
    }
    if (elements.userAvatarSidebar) elements.userAvatarSidebar.textContent = initials;
    if (elements.userNameSidebar) elements.userNameSidebar.textContent = AppState.user.name;
    if (elements.userRoleSidebar) {
        const roleConfig = USER_ROLES[AppState.userRole];
        elements.userRoleSidebar.textContent = roleConfig ? roleConfig.description : 'Usuario';
    }
}

function setupEventListeners() {
    // Responsive navigation
    window.addEventListener('resize', () => {
        buildBottomNavigation();
        if (window.innerWidth > 1024) {
            closeSidebar();
        }
    });
    
    // Cerrar modales con clicks fuera
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    });
    
    // Cerrar modales con ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                closeModal(openModal.id);
            }
        }
    });
    
    // Prevenir envío múltiple de formularios
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.disabled = true;
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Procesando...';
                
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }, 3000);
            }
        });
    });
    
    // Verificación de conectividad periódica
    setInterval(async () => {
        try {
            await APIClient.get('/health');
        } catch (error) {
            console.warn('Problemas de conectividad detectados');
        }
    }, 5 * 60 * 1000); // Cada 5 minutos
}

// ========================================
// Función de edición de empleados (placeholder)
// ========================================
function editEmployee(dni) {
    // Implementar modal de edición si es necesario
    showToast('🔧 Función de edición en desarrollo', 'info');
}

// ========================================
// Inicialización cuando el DOM esté listo
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Tecsitel v4.0 con API PostgreSQL/Neon iniciado');
    console.log('🌐 API Base URL:', CONFIG.API_BASE_URL);
    
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
    
    console.log('👨‍💼 Roles disponibles:', Object.keys(USER_ROLES));
});

// ========================================
// Estilos CSS adicionales para animaciones
// ========================================
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    @keyframes toastSlideOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
    }
    
    @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
        25% { transform: translateY(-10px) rotate(90deg); opacity: 1; }
        50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
        75% { transform: translateY(-10px) rotate(270deg); opacity: 1; }
    }

    @keyframes fadeInOut {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
    }
    
    .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        pointer-events: none;
    }
    
    .error {
        border-color: var(--danger) !important;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
    }
`;
document.head.appendChild(additionalStyles);
        