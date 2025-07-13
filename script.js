// ========================================
// TECSITEL v4.0 - Sistema de Gestión Empresarial
// ========================================

// ========================================
// Configuración Global y Estado
// ========================================
const CONFIG = {
    // AJUSTE CLAVE: Apuntamos directamente a la función de Netlify.
    // Esto es más robusto que usar la redirección /api/*.
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
// Utilitarios de API
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
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                // Si el backend devuelve un error, lo lanzamos para que sea capturado por el catch
                throw new Error(data.error || `Error HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error en la llamada API:', error);
            // Si el token es inválido o no autorizado, cerramos sesión
            if (error.message.includes('Token inválido') || error.message.includes('401') || error.message.includes('403')) {
                logout();
            }
            throw error; // Relanzamos el error para que la función que llamó sepa que algo falló
        }
    }

    static async get(endpoint) { return this.request(endpoint, { method: 'GET' }); }
    static async post(endpoint, data) { return this.request(endpoint, { method: 'POST', body: data }); }
    static async put(endpoint, data) { return this.request(endpoint, { method: 'PUT', body: data }); }
    static async delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}

// ========================================
// Sistema de Roles y Permisos
// ========================================
const USER_ROLES = {
    'admin': { name: 'Administrador General', permissions: ['all'], description: 'Acceso completo al sistema' },
    'contabilidad': { name: 'Contabilidad', permissions: ['dashboard', 'invoices', 'accounting', 'compliance', 'sharepoint'], description: 'Gestión financiera y contable' },
    'rrhh': { name: 'Recursos Humanos', permissions: ['dashboard', 'personnel', 'timetracking', 'compliance', 'sharepoint'], description: 'Gestión de personal' },
    'supervisor': { name: 'Supervisor', permissions: ['dashboard', 'timetracking'], description: 'Control de asistencia' }
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
        
        const response = await APIClient.post('/auth/login', { username, password });

        if (response.success) {
            AppState.isAuthenticated = true;
            AppState.token = response.token;
            AppState.user = response.user;
            AppState.userRole = response.user.role;
            AppState.sessionStart = Date.now();
            AppState.permissions = response.user.permissions || getUserPermissions(response.user.role);
            
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
        showToast(`❌ Error de login: ${error.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Iniciar Sesión';
        document.getElementById('password').value = '';
    }
}

function getUserPermissions(role) {
    const roleConfig = USER_ROLES[role];
    return roleConfig ? roleConfig.permissions : [];
}

function hasPermission(section) {
    if(AppState.permissions.includes('all')) return true;
    return AppState.permissions.includes(section);
}

function logout() {
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
            AppState.isAuthenticated = true;
            AppState.user = response.user;
            AppState.userRole = response.user.role;
            AppState.sessionStart = Date.now();
            AppState.permissions = response.user.permissions || getUserPermissions(response.user.role);
            
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('loadingScreen').style.display = 'flex';
            
            setTimeout(() => {
                setupLoadingAnimation();
                initializeApp();
            }, 100);
            
            return true;
        }
    } catch (error) {
        console.error('Sesión inválida:', error);
        logout(); // Limpia todo si el token no es válido
    }
    return false;
}

// ========================================
// Carga de Datos desde la API
// ========================================
async function loadAllInitialData() {
    const dataPromises = [];
    if(hasPermission('personnel')) dataPromises.push(loadEmployees());
    if(hasPermission('invoices')) dataPromises.push(loadInvoices());
    if(hasPermission('timetracking')) dataPromises.push(loadTimeEntries());
    if(hasPermission('dashboard')) dataPromises.push(loadDashboardStats());

    await Promise.all(dataPromises);
}

async function loadEmployees() {
    try {
        const response = await APIClient.get('/employees');
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
    } catch (error) {
        showToast(`❌ Error cargando empleados: ${error.message}`, 'error');
    }
}

async function loadInvoices() {
    try {
        const response = await APIClient.get('/invoices');
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
    } catch (error) {
        showToast(`❌ Error cargando facturas: ${error.message}`, 'error');
    }
}

async function loadTimeEntries() {
    try {
        const response = await APIClient.get('/time-entries');
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
    } catch (error) {
        showToast(`❌ Error cargando registros de tiempo: ${error.message}`, 'error');
    }
}

async function loadDashboardStats() {
    try {
        const response = await APIClient.get('/dashboard/stats');
        AppState.stats = response.stats;
        updateDashboardDisplay();
    } catch (error) {
        showToast(`❌ Error cargando estadísticas: ${error.message}`, 'error');
    }
}

// ========================================
// Renderizado de UI
// ========================================
function renderEmployees() {
    const tbody = document.querySelector('#employeesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = AppState.employees.length === 0 
        ? `<tr><td colspan="4" class="text-center p-5">No hay empleados registrados</td></tr>`
        : AppState.employees.map(e => `
            <tr data-dni="${e.dni}">
                <td><strong>${e.dni}</strong></td>
                <td>${e.firstName} ${e.lastName}</td>
                <td><span class="status-badge ${getStatusClass(e.status)}">${e.status}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="editEmployee('${e.dni}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteEmployee('${e.dni}')">🗑️</button>
                </td>
            </tr>`).join('');
}

function renderInvoices() {
    const tbody = document.querySelector('#invoicesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = AppState.invoices.length === 0 
        ? `<tr><td colspan="6" class="text-center p-5">No hay facturas registradas</td></tr>`
        : AppState.invoices.map(i => `
            <tr>
                <td><strong>${i.invoice_number}</strong></td>
                <td>${i.clientName}</td>
                <td><strong>${formatCurrency(i.amount, i.currency)}</strong></td>
                <td><span class="status-badge ${getStatusClass(i.status)}">${i.status}</span></td>
                <td>${formatDate(i.date)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteInvoice(${i.id})">🗑️</button></td>
            </tr>`).join('');
}

function renderTimeEntries() {
    const tbody = document.querySelector('#timeEntriesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = AppState.timeEntries.length === 0 
        ? `<tr><td colspan="6" class="text-center p-5">No hay registros de asistencia</td></tr>`
        : AppState.timeEntries.map(e => `
            <tr>
                <td>${e.name}</td>
                <td>${formatDate(e.date)}</td>
                <td>${formatTime(e.entryTime)}</td>
                <td>${formatTime(e.exitTime)}</td>
                <td>${calculateHours(e.entryTime, e.exitTime).toFixed(1)}h</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteTimeEntry(${e.id})">🗑️</button></td>
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
// Inicialización de la Aplicación
// ========================================
async function initializeApp() {
    updateLoadingStatus('Configurando sistema de roles...');
    buildNavigationMenu();
    buildBottomNavigation();
    updateUserInterface();
    
    updateLoadingStatus('Cargando datos iniciales...');
    await loadAllInitialData();
    
    updateLoadingStatus('¡Sistema listo!');
    
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
        const appContainer = document.getElementById('appContainer');
        appContainer.style.display = 'flex';
        setTimeout(() => appContainer.classList.add('loaded'), 50);
        
        showTab('dashboard');
        setupEventListeners();
        showToast(`🎉 ¡Bienvenido ${AppState.user.name}!`, 'success');
    }, 1000);
}

function updateUserInterface() {
    if (!AppState.user) return;
    const { name, role } = AppState.user;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    document.getElementById('userNameDisplay').textContent = name;
    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userAvatarSidebar').textContent = initials;
    document.getElementById('userNameSidebar').textContent = name;
    document.getElementById('userRoleSidebar').textContent = USER_ROLES[role]?.name || role;
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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Tecsitel v4.0 Iniciado');
    const hasSession = await checkExistingSession();
    if (!hasSession) {
        document.getElementById('loginScreen').style.display = 'flex';
    }
});

// ========================================
// Lógica de UI (Modales, Toasts, etc.)
// ========================================
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            const form = modal.querySelector('form');
            if (form) form.reset();
        }, 300);
    }
}

function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div>${message}</div><button onclick="this.parentElement.remove()">&times;</button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

function updateLoadingStatus(message) {
    const statusEl = document.getElementById('loadingStatus');
    if (statusEl) statusEl.textContent = message;
}

function setupLoadingAnimation() { /* Animaciones pueden ir aquí */ }

function buildNavigationMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.innerHTML = Object.keys(NAVIGATION_MENU).map(key => {
        if (hasPermission(key)) {
            const item = NAVIGATION_MENU[key];
            return `<button class="nav-item" data-tab="${key}" onclick="showTab('${key}')">
                        <span class="nav-icon">${item.icon}</span>
                        <span class="nav-text">${item.text}</span>
                    </button>`;
        }
        return '';
    }).join('');
}

function buildBottomNavigation() {
    const bottomNav = document.getElementById('bottomNav');
    if (window.innerWidth > 768) {
        bottomNav.style.display = 'none';
        return;
    }
    bottomNav.style.display = 'flex';
    bottomNav.innerHTML = Object.keys(NAVIGATION_MENU).slice(0, 4).map(key => {
         if (hasPermission(key)) {
            const item = NAVIGATION_MENU[key];
            return `<a href="#" class="bottom-nav-item" onclick="event.preventDefault(); showTab('${key}')">
                        <span class="bottom-nav-icon">${item.icon}</span> ${item.text}
                    </a>`;
        }
        return '';
    }).join('');
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabName)?.classList.add('active');
    
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(i => i.classList.add('active'));

    document.getElementById('pageTitle').textContent = NAVIGATION_MENU[tabName]?.text || 'Dashboard';
    if(window.innerWidth <= 1024) closeSidebar();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// ========================================
// Funciones de Ayuda y Formato
// ========================================
function formatCurrency(amount, currency = 'PEN') {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(amount);
}
function formatDate(dateString) {
    if(!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-PE', { timeZone: 'UTC' });
}
function formatTime(timeString) { return timeString ? timeString.substring(0, 5) : 'N/A'; }
function calculateHours(entry, exit) {
    if (!entry || !exit) return 0;
    const start = new Date(`1970-01-01T${entry}Z`);
    const end = new Date(`1970-01-01T${exit}Z`);
    return (end - start) / (1000 * 60 * 60);
}
function getStatusClass(status) {
    const s = status.toLowerCase();
    if (s === 'pagado' || s === 'activo') return 'active';
    if (s === 'pendiente') return 'pending';
    if (s === 'vencido' || s === 'cesado') return 'danger';
    return 'inactive';
}
function updateDashboardDisplay() {
    if (!hasPermission('dashboard')) return;
    const { totalIncome, pendingInvoices, activeEmployees, compliance } = AppState.stats;
    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('pendingInvoices').textContent = pendingInvoices;
    document.getElementById('activeEmployees').textContent = activeEmployees;
    document.getElementById('compliance').textContent = `${compliance}%`;
}

// Lógica de formularios (simplificada para brevedad)
async function saveEmployee(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const data = {
        dni: form.get('dni'),
        first_name: form.get('firstName'),
        last_name: form.get('lastName'),
        status: form.get('status'),
        notes: form.get('notes'),
    };
    try {
        await APIClient.post('/employees', data);
        showToast('✅ Empleado guardado', 'success');
        closeModal('newEmployee');
        loadEmployees();
    } catch(e) {
        showToast(`❌ ${e.message}`, 'error');
    }
}
async function deleteEmployee(dni) {
    if (!confirm('¿Seguro?')) return;
    try {
        await APIClient.delete(`/employees/${dni}`);
        showToast('🗑️ Empleado eliminado', 'info');
        loadEmployees();
    } catch(e) {
        showToast(`❌ ${e.message}`, 'error');
    }
}

    // Validación de DNI
    if (!validateDNI(employeeData.dni)) {
        const dniError = document.getElementById('dniError');
        dniError.textContent = 'DNI debe tener exactamente 8 dígitos';
        form.dni.classList.add('error');
        form.dni.focus();
        return;
    }
    
    try {
        const response = await APIClient.post('/employees', employeeData);
        
        if (response.success) {
            await loadEmployees(); // Recargar lista
            updateDashboardStats();
            closeModal('newEmployee');
            form.reset();
            showToast(`✅ Empleado ${employeeData.first_name} ${employeeData.last_name} agregado correctamente`, 'success');
        }
    } catch (error) {
        console.error('Error guardando empleado:', error);
        showToast(`❌ Error guardando empleado: ${error.message}`, 'error');
        
        // Mostrar error específico de DNI duplicado
        if (error.message.includes('ya existe')) {
            const dniError = document.getElementById('dniError');
            dniError.textContent = 'Este DNI ya está registrado';
            form.dni.classList.add('error');
        }
    }
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
            await loadEmployees(); // Recargar lista
            updateDashboardStats();
            closeModal('editEmployee');
            showToast(`✅ Empleado ${employeeData.first_name} ${employeeData.last_name} actualizado correctamente`, 'success');
        }
    } catch (error) {
        console.error('Error actualizando empleado:', error);
        showToast(`❌ Error actualizando empleado: ${error.message}`, 'error');
    }
}

async function deleteEmployee(dni) {
    if (!confirm('¿Está seguro de que desea eliminar este empleado?')) {
        return;
    }
    
    try {
        const response = await APIClient.delete(`/employees/${dni}`);
        
        if (response.success) {
            await loadEmployees(); // Recargar lista
            updateDashboardStats();
            showToast('🗑️ Empleado eliminado correctamente', 'info');
        }
    } catch (error) {
        console.error('Error eliminando empleado:', error);
        showToast(`❌ Error eliminando empleado: ${error.message}`, 'error');
    }
}

// ========================================
// Gestión de Facturas con API
// ========================================
async function loadInvoices() {
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
    
    // Validación de RUC
    if (!validateRUC(invoiceData.client_ruc)) {
        const rucError = document.getElementById('rucError');
        rucError.textContent = 'RUC debe tener exactamente 11 dígitos';
        form.clientRuc.classList.add('error');
        form.clientRuc.focus();
        return;
    }
    
    try {
        const response = await APIClient.post('/invoices', invoiceData);
        
        if (response.success) {
            await loadInvoices(); // Recargar lista
            updateDashboardStats();
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
            await loadInvoices(); // Recargar lista
            updateDashboardStats();
            showToast('🗑️ Factura eliminada correctamente', 'info');
        }
    } catch (error) {
        console.error('Error eliminando factura:', error);
        showToast(`❌ Error eliminando factura: ${error.message}`, 'error');
    }
}

// ========================================
// Gestión de Registro de Tiempo con API
// ========================================
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
        console.error('Error cargando registros de tiempo:', error);
        showToast(`❌ Error cargando registros: ${error.message}`, 'error');
    }
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
            await loadTimeEntries(); // Recargar lista
            closeModal('timeEntry');
            form.reset();
            showToast('✅ Marcaje registrado correctamente', 'success');
        }
    } catch (error) {
        console.error('Error guardando marcaje:', error);
        showToast(`❌ Error guardando marcaje: ${error.message}`, 'error');
    }
}

async function updateTimeEntry(entryId, timeData) {
    try {
        const response = await APIClient.put(`/time-entries/${entryId}`, timeData);
        
        if (response.success) {
            await loadTimeEntries(); // Recargar lista
            showToast('✅ Marcaje actualizado correctamente', 'success');
        }
    } catch (error) {
        console.error('Error actualizando marcaje:', error);
        showToast(`❌ Error actualizando marcaje: ${error.message}`, 'error');
    }
}

// ========================================
// Dashboard y Estadísticas con API
// ========================================
async function loadDashboardStats() {
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
    
    // Actualizar elementos del DOM
    const totalIncomeEl = document.getElementById('totalIncome');
    const pendingInvoicesEl = document.getElementById('pendingInvoices');
    const activeEmployeesEl = document.getElementById('activeEmployees');
    const complianceEl = document.getElementById('compliance');
    
    if (totalIncomeEl) totalIncomeEl.textContent = typeof stats.totalIncome === 'number' ? formatCurrency(stats.totalIncome) : stats.totalIncome;
    if (pendingInvoicesEl) pendingInvoicesEl.textContent = stats.pendingInvoices;
    if (activeEmployeesEl) activeEmployeesEl.textContent = stats.activeEmployees;
    if (complianceEl) complianceEl.textContent = stats.compliance + '%';
    
    // Actualizar estados según rol
    updateStatusMessagesByRole(AppState.userRole, stats);
}

function calculateStatsByRole(role, apiStats) {
    const baseStats = {
        totalIncome: apiStats.totalIncome || 0,
        pendingInvoices: apiStats.pendingInvoices || 0,
        activeEmployees: apiStats.activeEmployees || 0,
        compliance: apiStats.compliance || 100
    };
    
    // Personalizar según rol
    switch(role) {
        case 'contabilidad':
            return {
                ...baseStats,
                activeEmployees: 'N/A'
            };
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

// Alias para compatibilidad
function updateDashboardStats() {
    loadDashboardStats();
}

// ========================================
// Resto de funciones (UI, navegación, etc.)
// ========================================

// Construcción de menús (sin cambios)
function buildNavigationMenu() {
    const navMenu = document.getElementById('navMenu');
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
    
    const firstMenuItem = navMenu.querySelector('.nav-item');
    if (firstMenuItem) {
        firstMenuItem.classList.add('active');
    }
}

function buildBottomNavigation() {
    const bottomNav = document.getElementById('bottomNav');
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

// Gestión de sidebar responsivo
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
    
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Gestión de tabs
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
            document.getElementById('pageTitle').textContent = menuItem.text;
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
            updateDashboardLabels();
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
            initializeComplianceContent();
            break;
    }
}

// Dashboard personalizado por rol
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
    const allItems = {
        'admin': [
            {
                icon: '📄',
                title: 'Nueva Factura',
                description: 'Crear factura electrónica',
                action: 'modal',
                target: 'newInvoice',
                color: 'primary'
            },
            {
                icon: '👥',
                title: 'Gestionar Personal',
                description: 'Ver y editar empleados',
                action: 'tab',
                target: 'personnel',
                color: 'info'
            },
            {
                icon: '⏰',
                title: 'Control Asistencia',
                description: 'Marcar tiempo y horarios',
                action: 'tab',
                target: 'timetracking',
                color: 'warning'
            },
            {
                icon: '💰',
                title: 'Ver Contabilidad',
                description: 'Balance y finanzas',
                action: 'tab',
                target: 'accounting',
                color: 'success'
            },
            {
                icon: '⚖️',
                title: 'Cumplimiento',
                description: 'Normativas SUNAT/SUNAFIL',
                action: 'tab',
                target: 'compliance',
                color: 'info'
            },
            {
                icon: '☁️',
                title: 'Respaldos',
                description: 'Exportar y backup',
                action: 'tab',
                target: 'sharepoint',
                color: 'primary'
            }
        ],
        'contabilidad': [
            {
                icon: '📄',
                title: 'Nueva Factura',
                description: 'Crear factura electrónica',
                action: 'modal',
                target: 'newInvoice',
                color: 'primary'
            },
            {
                icon: '📋',
                title: 'Ver Facturas',
                description: 'Gestionar facturas',
                action: 'tab',
                target: 'invoices',
                color: 'warning'
            },
            {
                 : 'S/';
    return `${symbol} ${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatTime(timeString) {
    if (!timeString) return '';
    return timeString;
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
            delete form.dataset.editingId;
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
    
    for (let i = 0; i < 60; i++) {
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
            animation: 
                float ${duration}s ease-in-out infinite,
                fadeInOut ${duration * 0.8}s ease-in-out infinite;
            animation-delay: ${delay}s;
            pointer-events: none;
        `;
        particles.appendChild(particle);
    }
    
    for (let i = 0; i < 10; i++) {
        const bigParticle = document.createElement('div');
        const size = Math.random() * 4 + 8;
        const duration = Math.random() * 6 + 4;
        const delay = Math.random() * 3;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        
        bigParticle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            left: ${left}%;
            top: ${top}%;
            animation: float ${duration}s ease-in-out infinite;
            animation-delay: ${delay}s;
            pointer-events: none;
            box-shadow: 0 0 ${size}px rgba(255, 255, 255, 0.3);
        `;
        particles.appendChild(bigParticle);
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
    setupLoadingAnimation();
    updateLoadingStatus('🔐 Validando credenciales...', false);
    
    setTimeout(() => {
        updateLoadingStatus('📊 Configurando sistema de roles...', false);
        
        setTimeout(() => {
            updateLoadingStatus('🗄️ Cargando datos del usuario...', false);
            
            setTimeout(() => {
                updateLoadingStatus('🎨 Construyendo interfaz...', false);
                buildNavigationMenu();
                buildBottomNavigation();
                
                setTimeout(() => {
                    updateLoadingStatus('👤 Actualizando información de usuario...', false);
                    updateUserInterface();
                    
                    setTimeout(() => {
                        updateLoadingStatus('🚀 ¡Sistema listo!', false);
                        
                        setTimeout(() => {
                            // Ocultar loading screen
                            document.getElementById('loadingScreen').style.display = 'none';
                            const appContainer = document.getElementById('appContainer');
                            appContainer.style.display = 'flex';
                            
                            setTimeout(() => {
                                appContainer.classList.add('loaded');
                                
                                // Cargar contenido inicial
                                showTab('dashboard');
                                setupEventListeners();
                                
                                // Mostrar mensaje de bienvenida
                                setTimeout(() => {
                                    showToast(`🎉 ¡Bienvenido ${AppState.user.name}!`, 'success', 3000);
                                }, 500);
                                
                            }, 100);
                        }, 1500);
                    }, 500);
                }, 500);
            }, 500);
        }, 500);
    }, 800);
}

function updateUserInterface() {
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatar = document.getElementById('userAvatar');
    const userAvatarSidebar = document.getElementById('userAvatarSidebar');
    const userNameSidebar = document.getElementById('userNameSidebar');
    const userRoleSidebar = document.getElementById('userRoleSidebar');
    
    if (userNameDisplay) userNameDisplay.textContent = AppState.user.name;
    if (userAvatar) {
        userAvatar.textContent = AppState.user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        userAvatar.title = `${AppState.user.name} - Cerrar sesión`;
    }
    if (userAvatarSidebar) userAvatarSidebar.textContent = AppState.user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    if (userNameSidebar) userNameSidebar.textContent = AppState.user.name;
    if (userRoleSidebar) userRoleSidebar.textContent = USER_ROLES[AppState.userRole].description;
}

function setupEventListeners() {
    // Verificar conectividad con API
    setInterval(async () => {
        try {
            await APIClient.get('/health');
        } catch (error) {
            showToast('⚠️ Problemas de conectividad con el servidor', 'warning');
        }
    }, 5 * 60 * 1000); // Cada 5 minutos
    
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
            const modalId = event.target.id;
            closeModal(modalId);
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
}

// ========================================
// Inicialización cuando el DOM esté listo
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Tecsitel v4.0 con API PostgreSQL/Neon iniciado');
    
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
`;
document.head.appendChild(style);// ========================================
// TECSITEL v4.0 - Sistema de Gestión Empresarial
// Versión integrada con API PostgreSQL/Neon
// ========================================

// ========================================
// Configuración Global y Estado
// ========================================
const CONFIG = {
    API_BASE_URL: '/api',
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
// Utilitarios de API
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
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error en API:', error);
            if (error.message.includes('401') || error.message.includes('403')) {
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
// Sistema de Autenticación con API
// ========================================
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        // Mostrar loading
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Validando...';
        
        // Llamar a la API de login
        const response = await APIClient.post('/auth/login', {
            username,
            password
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
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    
    showToast('👋 Sesión cerrada correctamente', 'info');
}

// Verificar sesión existente al cargar
async function checkExistingSession() {
    const token = localStorage.getItem('tecsitel_token');
    const userData = localStorage.getItem('tecsitel_user');

    if (token && userData) {
        try {
            AppState.token = token;
            const response = await APIClient.get('/auth/verify'); // Validar token con el backend

            if (response.success) {
                // Si el token es válido, proceder a inicializar la app
                AppState.isAuthenticated = true;
                AppState.user = response.user; // Usar los datos de usuario frescos de la API
                AppState.userRole = response.user.role;
                AppState.sessionStart = Date.now();
                AppState.permissions = response.user.permissions;

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
            // Si hay un error (ej. token expirado), limpiar el almacenamiento local
            localStorage.removeItem('tecsitel_token');
            localStorage.removeItem('tecsitel_user');
        }
    }

    return false; // Si no hay token o no es válido, no hacer nada.
}

// ========================================
// Gestión de Empleados con API
// ========================================
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
        dniError.textContent = 'DNI debe tener exactamente 8 dígitos';
        form.dni.classList.add('error');
        form.dni.focus();
        return;
    }
    
    try {
        const response = await APIClient.post('/employees', employeeData);
        
        if (response.success) {
            await loadEmployees(); // Recargar lista
            updateDashboardStats();
            closeModal('newEmployee');
            form.reset();
            showToast(`✅ Empleado ${employeeData.first_name} ${employeeData.last_name} agregado correctamente`, 'success');
        }
    } catch (error) {
        console.error('Error guardando empleado:', error);
        showToast(`❌ Error guardando empleado: ${error.message}`, 'error');
        
        // Mostrar error específico de DNI duplicado
        if (error.message.includes('ya existe')) {
            const dniError = document.getElementById('dniError');
            dniError.textContent = 'Este DNI ya está registrado';
            form.dni.classList.add('error');
        }
    }
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
            await loadEmployees(); // Recargar lista
            updateDashboardStats();
            closeModal('editEmployee');
            showToast(`✅ Empleado ${employeeData.first_name} ${employeeData.last_name} actualizado correctamente`, 'success');
        }
    } catch (error) {
        console.error('Error actualizando empleado:', error);
        showToast(`❌ Error actualizando empleado: ${error.message}`, 'error');
    }
}

async function deleteEmployee(dni) {
    if (!confirm('¿Está seguro de que desea eliminar este empleado?')) {
        return;
    }
    
    try {
        const response = await APIClient.delete(`/employees/${dni}`);
        
        if (response.success) {
            await loadEmployees(); // Recargar lista
            updateDashboardStats();
            showToast('🗑️ Empleado eliminado correctamente', 'info');
        }
    } catch (error) {
        console.error('Error eliminando empleado:', error);
        showToast(`❌ Error eliminando empleado: ${error.message}`, 'error');
    }
}

// ========================================
// Gestión de Facturas con API
// ========================================
async function loadInvoices() {
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
    
    // Validación de RUC
    if (!validateRUC(invoiceData.client_ruc)) {
        const rucError = document.getElementById('rucError');
        rucError.textContent = 'RUC debe tener exactamente 11 dígitos';
        form.clientRuc.classList.add('error');
        form.clientRuc.focus();
        return;
    }
    
    try {
        const response = await APIClient.post('/invoices', invoiceData);
        
        if (response.success) {
            await loadInvoices(); // Recargar lista
            updateDashboardStats();
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
            await loadInvoices(); // Recargar lista
            updateDashboardStats();
            showToast('🗑️ Factura eliminada correctamente', 'info');
        }
    } catch (error) {
        console.error('Error eliminando factura:', error);
        showToast(`❌ Error eliminando factura: ${error.message}`, 'error');
    }
}

// ========================================
// Gestión de Registro de Tiempo con API
// ========================================
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
        console.error('Error cargando registros de tiempo:', error);
        showToast(`❌ Error cargando registros: ${error.message}`, 'error');
    }
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
            await loadTimeEntries(); // Recargar lista
            closeModal('timeEntry');
            form.reset();
            showToast('✅ Marcaje registrado correctamente', 'success');
        }
    } catch (error) {
        console.error('Error guardando marcaje:', error);
        showToast(`❌ Error guardando marcaje: ${error.message}`, 'error');
    }
}

async function updateTimeEntry(entryId, timeData) {
    try {
        const response = await APIClient.put(`/time-entries/${entryId}`, timeData);
        
        if (response.success) {
            await loadTimeEntries(); // Recargar lista
            showToast('✅ Marcaje actualizado correctamente', 'success');
        }
    } catch (error) {
        console.error('Error actualizando marcaje:', error);
        showToast(`❌ Error actualizando marcaje: ${error.message}`, 'error');
    }
}

// ========================================
// Dashboard y Estadísticas con API
// ========================================
async function loadDashboardStats() {
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
    
    // Actualizar elementos del DOM
    const totalIncomeEl = document.getElementById('totalIncome');
    const pendingInvoicesEl = document.getElementById('pendingInvoices');
    const activeEmployeesEl = document.getElementById('activeEmployees');
    const complianceEl = document.getElementById('compliance');
    
    if (totalIncomeEl) totalIncomeEl.textContent = typeof stats.totalIncome === 'number' ? formatCurrency(stats.totalIncome) : stats.totalIncome;
    if (pendingInvoicesEl) pendingInvoicesEl.textContent = stats.pendingInvoices;
    if (activeEmployeesEl) activeEmployeesEl.textContent = stats.activeEmployees;
    if (complianceEl) complianceEl.textContent = stats.compliance + '%';
    
    // Actualizar estados según rol
    updateStatusMessagesByRole(AppState.userRole, stats);
}

function calculateStatsByRole(role, apiStats) {
    const baseStats = {
        totalIncome: apiStats.totalIncome || 0,
        pendingInvoices: apiStats.pendingInvoices || 0,
        activeEmployees: apiStats.activeEmployees || 0,
        compliance: apiStats.compliance || 100
    };
    
    // Personalizar según rol
    switch(role) {
        case 'contabilidad':
            return {
                ...baseStats,
                activeEmployees: 'N/A'
            };
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

// Alias para compatibilidad
function updateDashboardStats() {
    loadDashboardStats();
}

// ========================================
// Resto de funciones (UI, navegación, etc.)
// ========================================

// Construcción de menús (sin cambios)
function buildNavigationMenu() {
    const navMenu = document.getElementById('navMenu');
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
    
    const firstMenuItem = navMenu.querySelector('.nav-item');
    if (firstMenuItem) {
        firstMenuItem.classList.add('active');
    }
}

function buildBottomNavigation() {
    const bottomNav = document.getElementById('bottomNav');
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

// Gestión de sidebar responsivo
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
    
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Gestión de tabs
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
            document.getElementById('pageTitle').textContent = menuItem.text;
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
            updateDashboardLabels();
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
            initializeComplianceContent();
            break;
    }
}

// Dashboard personalizado por rol
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
    const allItems = {
        'admin': [
            {
                icon: '📄',
                title: 'Nueva Factura',
                description: 'Crear factura electrónica',
                action: 'modal',
                target: 'newInvoice',
                color: 'primary'
            },
            {
                icon: '👥',
                title: 'Gestionar Personal',
                description: 'Ver y editar empleados',
                action: 'tab',
                target: 'personnel',
                color: 'info'
            },
            {
                icon: '⏰',
                title: 'Control Asistencia',
                description: 'Marcar tiempo y horarios',
                action: 'tab',
                target: 'timetracking',
                color: 'warning'
            },
            {
                icon: '💰',
                title: 'Ver Contabilidad',
                description: 'Balance y finanzas',
                action: 'tab',
                target: 'accounting',
                color: 'success'
            },
            {
                icon: '⚖️',
                title: 'Cumplimiento',
                description: 'Normativas SUNAT/SUNAFIL',
                action: 'tab',
                target: 'compliance',
                color: 'info'
            },
            {
                icon: '☁️',
                title: 'Respaldos',
                description: 'Exportar y backup',
                action: 'tab',
                target: 'sharepoint',
                color: 'primary'
            }
        ],
        'contabilidad': [
            {
                icon: '📄',
                title: 'Nueva Factura',
                description: 'Crear factura electrónica',
                action: 'modal',
                target: 'newInvoice',
                color: 'primary'
            },
            {
                icon: '📋',
                title: 'Ver Facturas',
                description: 'Gestionar facturas',
                action: 'tab',
                target: 'invoices',
                color: 'warning'
            },
            {
