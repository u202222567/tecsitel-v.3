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
// Carga de Datos desde la API
// ========================================
async function loadAllInitialData() {
    const promises = [];
    
    if (hasPermission('personnel') || hasPermission('all')) {
        promises.push(loadEmployees());
    }
    if (hasPermission('invoices') || hasPermission('all')) {
        promises.push(loadInvoices());
    }
    if (hasPermission('timetracking') || hasPermission('all')) {
        promises.push(loadTimeEntries());
    }
    if (hasPermission('dashboard') || hasPermission('all')) {
        promises.push(loadDashboardStats());
    }

    try {
        await Promise.all(promises);
        console.log('✅ Todos los datos iniciales cargados');
    } catch (error) {
        console.error('❌ Error cargando datos iniciales:', error);
    }
}

async function loadEmployees() {
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
        showToast(`❌ Error cargando empleados: ${error.message}`, 'error');
    }
}

async function loadInvoices() {
    try {
        const response = await APIClient.get('/invoices');
        if (response.success) {
            AppState.invoices = response.invoices.map(inv => ({
                id: inv.id,
                invoice_number: inv.invoice_number,
                clientRuc: inv.client_ruc,
                clientName: inv.client_name,
                amount: parseFloat(inv.amount),
                status: inv.status,
                date: inv.invoice_date,
                currency: inv.currency,
                description: inv.description,
                isExport: inv.is_export
            }));
            renderInvoices();
        }
    } catch (error) {
        showToast(`❌ Error cargando facturas: ${error.message}`, 'error');
    }
}

async function loadTimeEntries() {
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
        showToast(`❌ Error cargando registros de tiempo: ${error.message}`, 'error');
    }
}

async function loadDashboardStats() {
    try {
        const response = await APIClient.get('/dashboard/stats');
        if (response.success) {
            AppState.stats = response.stats;
            updateDashboardDisplay();
        }
    } catch (error) {
        showToast(`❌ Error cargando estadísticas: ${error.message}`, 'error');
    }
}

// ========================================
// Gestión de Empleados
// ========================================
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
    
    if (!validateDNI(employeeData.dni)) {
        showError('dniError', 'DNI debe tener exactamente 8 dígitos');
        form.dni.classList.add('error');
        form.dni.focus();
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
        showToast(`❌ Error guardando empleado: ${error.message}`, 'error');
        
        if (error.message.includes('ya existe')) {
            showError('dniError', 'Este DNI ya está registrado');
            form.dni.classList.add('error');
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
        showToast(`❌ Error eliminando empleado: ${error.message}`, 'error');
    }
}

function editEmployee(dni) {
    const employee = AppState.employees.find(emp => emp.dni === dni);
    if (!employee) return;
    
    const form = document.getElementById('editEmployeeForm');
    if (!form) return;
    
    form.originalDni.value = dni;
    form.dni.value = dni;
    form.firstName.value = employee.firstName;
    form.lastName.value = employee.lastName;
    form.status.value = employee.status;
    form.notes.value = employee.notes || '';
    
    showModal('editEmployee');
}

async function updateEmployee(event) {
    event.preventDefault();
    const form = event.target;
    
    const dni = form.originalDni.value;
    const employeeData = {
        first_name: sanitizeInput(form.firstName.value),
        last_name: sanitizeInput(form.lastName.value),
        status: form.status.value,
        notes: sanitizeInput(form.notes.value || '')
    };
    
    try {
        const response = await APIClient.put(`/employees/${dni}`, employeeData);
        
        if (response.success) {
            await loadEmployees();
            await loadDashboardStats();
            closeModal('editEmployee');
            showToast(`✅ Empleado ${employeeData.first_name} ${employeeData.last_name} actualizado correctamente`, 'success');
        }
    } catch (error) {
        showToast(`❌ Error actualizando empleado: ${error.message}`, 'error');
    }
}

// ========================================
// Gestión de Facturas
// ========================================
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
        showError('rucError', 'RUC debe tener exactamente 11 dígitos');
        form.clientRuc.classList.add('error');
        form.clientRuc.focus();
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
        showToast(`❌ Error eliminando factura: ${error.message}`, 'error');
    }
}

// ========================================
// Gestión de Registro de Tiempo
// ========================================
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
        showToast(`❌ Error eliminando registro: ${error.message}`, 'error');
    }
}

// ========================================
// Renderizado de UI
// ========================================
function renderEmployees() {
    const tbody = document.querySelector('#employeesTable tbody');
    if (!tbody) return;
    
    if (AppState.employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 2rem; color: #6b7280;">No hay empleados registrados</td></tr>`;
        return;
    }
    
    tbody.innerHTML = AppState.employees.map(e => `
        <tr data-dni="${e.dni}">
            <td><strong>${e.dni}</strong></td>
            <td>${e.firstName} ${e.lastName}</td>
            <td><span class="status-badge ${getStatusClass(e.status)}">${e.status}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editEmployee('${e.dni}')" title="Editar">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteEmployee('${e.dni}')" title="Eliminar">🗑️</button>
            </td>
        </tr>`).join('');
}

function renderInvoices() {
    const tbody = document.querySelector('#invoicesTable tbody');
    if (!tbody) return;
    
    if (AppState.invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 2rem; color: #6b7280;">No hay facturas registradas</td></tr>`;
        return;
    }
    
    tbody.innerHTML = AppState.invoices.map(i => `
        <tr>
            <td><strong>${i.invoice_number}</strong></td>
            <td>${i.clientName}</td>
            <td><strong>${formatCurrency(i.amount, i.currency)}</strong></td>
            <td><span class="status-badge ${getStatusClass(i.status)}">${i.status}</span></td>
            <td>${formatDate(i.date)}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteInvoice('${i.id}')" title="Eliminar">🗑️</button>
            </td>
        </tr>`).join('');
}

function renderTimeEntries() {
    const tbody = document.querySelector('#timeEntriesTable tbody');
    if (!tbody) return;
    
    if (AppState.timeEntries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 2rem; color: #6b7280;">No hay registros de asistencia</td></tr>`;
        return;
    }
    
    tbody.innerHTML = AppState.timeEntries.map(e => `
        <tr>
            <td>${e.name}</td>
            <td>${formatDate(e.date)}</td>
            <td>${formatTime(e.entryTime)}</td>
            <td>${formatTime(e.exitTime)}</td>
            <td>${calculateHours(e.entryTime, e.exitTime).toFixed(1)}h</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteTimeEntry('${e.id}')" title="Eliminar">🗑️</button>
            </td>
        </tr>`).join('');
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
// Dashboard y Estadísticas
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
    
    // Test de conectividad periódico
    setInterval(async () => {
        try {
            await APIClient.get('/health');
        } catch (error) {
            showToast('⚠️ Problemas de conectividad', 'warning');
        }
    }, 5 * 60 * 1000);
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
            await loadInvoices();
            break;
        case 'personnel':
            await loadEmployees();
            break;
        case 'timetracking':
            await loadTimeEntries();
            await loadEmployees();
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
    const symbol = currency === 'USD' ? '
         : 'S/';
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
// Funciones de Exportación
// ========================================
function downloadFullBackup() {
    showToast('📥 Generando respaldo completo...', 'info');
    
    const csvData = generateBackupCSV();
    downloadCSV(csvData, `tecsitel_respaldo_${new Date().toISOString().split('T')[0]}.csv`);
    
    showToast('✅ Respaldo descargado exitosamente', 'success');
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
