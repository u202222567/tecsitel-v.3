// ========================================
// TECSITEL v4.0 - Sistema de Gestión Empresarial
// Versión integrada con API PostgreSQL/Neon Mejorada
// ========================================

// ========================================
// Configuración Global y Estado
// ========================================
const CONFIG = {
    API_BASE_URL: '/.netlify/functions/api',
    IGV_RATE: 0.18,
    LOADING_DURATION: 3000,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
    SESSION_WARNING: 5 * 60 * 1000, // Advertencia 5 minutos antes
    VERSION: '4.0',
    COMPANY: {
        name: 'TECSITEL PERU E.I.R.L.',
        ruc: '20605908285'
    },
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
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
    sessionTimer: null,
    permissions: {},
    isLoading: false,
    retryCount: 0
};

// ========================================
// Utilidades y Helpers
// ========================================
const Utils = {
    // Debounce para evitar llamadas múltiples
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Formatear errores de manera consistente
    formatError: (error) => {
        if (error.message) return error.message;
        if (typeof error === 'string') return error;
        return 'Error desconocido';
    },

    // Validar formato de email
    validateEmail: (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    // Sleep function para reintentos
    sleep: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// ========================================
// Utilitarios de API Mejorados
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

        // Reintentos automáticos para errores de red
        for (let i = 0; i < CONFIG.RETRY_ATTEMPTS; i++) {
            try {
                const response = await fetch(url, config);
                const data = await response.json();

                if (!response.ok) {
                    // Manejar errores específicos
                    if (response.status === 401) {
                        // Token expirado o inválido
                        if (AppState.isAuthenticated) {
                            showToast('⚠️ Sesión expirada. Por favor inicie sesión nuevamente.', 'warning');
                            logout();
                        }
                        throw new Error(data.error || 'No autorizado');
                    }
                    throw new Error(data.error || `HTTP ${response.status}`);
                }

                return data;
            } catch (error) {
                console.error(`Error en API (intento ${i + 1}/${CONFIG.RETRY_ATTEMPTS}):`, error);
                
                // Si es un error de red y no es el último intento, reintentar
                if (i < CONFIG.RETRY_ATTEMPTS - 1 && 
                    (error.name === 'NetworkError' || error.message === 'Failed to fetch')) {
                    await Utils.sleep(CONFIG.RETRY_DELAY * (i + 1));
                    continue;
                }
                
                throw error;
            }
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
    
    // Limpiar errores previos
    form.querySelectorAll('.form-error').forEach(error => error.textContent = '');
    form.querySelectorAll('.error').forEach(input => input.classList.remove('error'));
    
    try {
        // Mostrar loading
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> Validando...';
        
        // Llamar a la API de login
        const response = await APIClient.post('/api/auth/login', {
            username,
            password
        });

        if (response.success) {
            AppState.isAuthenticated = true;
            AppState.token = response.token;
            AppState.user = response.user;
            AppState.userRole = response.user.role;
            AppState.sessionStart = Date.now();
            AppState.permissions = response.user.permissions || getUserPermissions(response.user.role);
            
            // Guardar token en localStorage
            localStorage.setItem('tecsitel_token', response.token);
            localStorage.setItem('tecsitel_user', JSON.stringify(response.user));
            
            // Iniciar timer de sesión
            startSessionTimer();
            
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
        showToast(`❌ Error de login: ${Utils.formatError(error)}`, 'error');
        
        // Restaurar botón
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Iniciar Sesión';
        
        // Limpiar contraseña
        document.getElementById('password').value = '';
        
        // Añadir animación de shake al formulario
        form.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            form.style.animation = '';
        }, 500);
    }
}

// Sistema de gestión de sesión
function startSessionTimer() {
    // Limpiar timer existente
    if (AppState.sessionTimer) {
        clearInterval(AppState.sessionTimer);
    }
    
    // Verificar cada minuto
    AppState.sessionTimer = setInterval(() => {
        const sessionAge = Date.now() - AppState.sessionStart;
        const timeRemaining = CONFIG.SESSION_TIMEOUT - sessionAge;
        
        // Advertencia 5 minutos antes
        if (timeRemaining > 0 && timeRemaining <= CONFIG.SESSION_WARNING) {
            const minutesLeft = Math.floor(timeRemaining / 60000);
            showToast(`⏰ Su sesión expirará en ${minutesLeft} minutos`, 'warning');
        }
        
        // Sesión expirada
        if (timeRemaining <= 0) {
            clearInterval(AppState.sessionTimer);
            showToast('⏱️ Sesión expirada por inactividad', 'warning');
            logout();
        }
    }, 60000); // Cada minuto
}

// Renovar sesión con actividad
function renewSession() {
    AppState.sessionStart = Date.now();
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
            await APIClient.post('/api/auth/logout');
        }
    } catch (error) {
        console.error('Error en logout:', error);
    }
    
    // Limpiar timer de sesión
    if (AppState.sessionTimer) {
        clearInterval(AppState.sessionTimer);
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
            const response = await APIClient.get('/api/auth/verify');

            if (response.success) {
                AppState.isAuthenticated = true;
                AppState.user = response.user;
                AppState.userRole = response.user.role;
                AppState.sessionStart = Date.now();
                AppState.permissions = response.user.permissions || getUserPermissions(response.user.role);
                
                // Iniciar timer de sesión
                startSessionTimer();

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
// Gestión de Empleados con API
// ========================================
async function loadEmployees(showLoader = true) {
    try {
        if (showLoader) showTableLoader('employeesTable');
        
        const response = await APIClient.get('/api/employees');
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
        showToast(`❌ Error cargando empleados: ${Utils.formatError(error)}`, 'error');
        renderEmployeesError();
    } finally {
        hideTableLoader('employeesTable');
    }
}

async function saveEmployee(event) {
    event.preventDefault();
    const form = event.target;
    
    // Limpiar errores previos
    form.querySelectorAll('.form-error').forEach(error => error.textContent = '');
    form.querySelectorAll('.error').forEach(input => input.classList.remove('error'));
    
    const employeeData = {
        dni: form.dni.value.trim(),
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
    
    // Deshabilitar botón de submit
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';
    
    try {
        const response = await APIClient.post('/api/employees', employeeData);
        
        if (response.success) {
            await loadEmployees();
            updateDashboardStats();
            closeModal('newEmployee');
            form.reset();
            showToast(`✅ Empleado ${employeeData.first_name} ${employeeData.last_name} agregado correctamente`, 'success');
        }
    } catch (error) {
        console.error('Error guardando empleado:', error);
        showToast(`❌ Error guardando empleado: ${Utils.formatError(error)}`, 'error');
        
        // Mostrar error específico de DNI duplicado
        if (error.message.includes('ya existe')) {
            const dniError = document.getElementById('dniError');
            dniError.textContent = 'Este DNI ya está registrado';
            form.dni.classList.add('error');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
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
    
    // Deshabilitar botón
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Actualizando...';
    
    try {
        const response = await APIClient.put(`/api/employees/${dni}`, employeeData);
        
        if (response.success) {
            await loadEmployees();
            updateDashboardStats();
            closeModal('editEmployee');
            showToast(`✅ Empleado ${employeeData.first_name} ${employeeData.last_name} actualizado correctamente`, 'success');
        }
    } catch (error) {
        console.error('Error actualizando empleado:', error);
        showToast(`❌ Error actualizando empleado: ${Utils.formatError(error)}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function deleteEmployee(dni) {
    const employee = AppState.employees.find(e => e.dni === dni);
    const confirmMsg = employee ? 
        `¿Está seguro de que desea eliminar a ${employee.firstName} ${employee.lastName}?` :
        '¿Está seguro de que desea eliminar este empleado?';
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        showTableLoader('employeesTable');
        const response = await APIClient.delete(`/api/employees/${dni}`);
        
        if (response.success) {
            await loadEmployees(false);
            updateDashboardStats();
            showToast(response.message || '🗑️ Empleado eliminado correctamente', 'info');
        }
    } catch (error) {
        console.error('Error eliminando empleado:', error);
        showToast(`❌ Error eliminando empleado: ${Utils.formatError(error)}`, 'error');
        hideTableLoader('employeesTable');
    }
}

// ========================================
// Gestión de Facturas con API
// ========================================
async function loadInvoices(showLoader = true) {
    try {
        if (showLoader) showTableLoader('invoicesTable');
        
        const response = await APIClient.get('/api/invoices');
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
        showToast(`❌ Error cargando facturas: ${Utils.formatError(error)}`, 'error');
        renderInvoicesError();
    } finally {
        hideTableLoader('invoicesTable');
    }
}

async function saveInvoice(event) {
    event.preventDefault();
    const form = event.target;
    
    // Limpiar errores previos
    form.querySelectorAll('.form-error').forEach(error => error.textContent = '');
    form.querySelectorAll('.error').forEach(input => input.classList.remove('error'));
    
    const invoiceData = {
        client_ruc: form.clientRuc.value.trim(),
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
    
    // Validación de monto
    if (isNaN(invoiceData.amount) || invoiceData.amount <= 0) {
        showToast('❌ El monto debe ser un número positivo', 'error');
        form.amount.classList.add('error');
        form.amount.focus();
        return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando factura...';
    
    try {
        const response = await APIClient.post('/api/invoices', invoiceData);
        
        if (response.success) {
            await loadInvoices();
            updateDashboardStats();
            closeModal('newInvoice');
            form.reset();
            showToast(`✅ Factura ${response.invoice.invoice_number} creada correctamente`, 'success');
        }
    } catch (error) {
        console.error('Error guardando factura:', error);
        showToast(`❌ Error guardando factura: ${Utils.formatError(error)}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function deleteInvoice(invoiceId) {
    const invoice = AppState.invoices.find(i => i.id === invoiceId);
    const confirmMsg = invoice ? 
        `¿Está seguro de que desea anular la factura ${invoice.invoice_number}?` :
        '¿Está seguro de que desea anular esta factura?';
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        showTableLoader('invoicesTable');
        const response = await APIClient.delete(`/api/invoices/${invoiceId}`);
        
        if (response.success) {
            await loadInvoices(false);
            updateDashboardStats();
            showToast(response.message || '🗑️ Factura anulada correctamente', 'info');
        }
    } catch (error) {
        console.error('Error eliminando factura:', error);
        showToast(`❌ Error anulando factura: ${Utils.formatError(error)}`, 'error');
        hideTableLoader('invoicesTable');
    }
}

// ========================================
// Gestión de Registro de Tiempo con API
// ========================================
async function loadTimeEntries(showLoader = true) {
    try {
        if (showLoader) showTableLoader('timeEntriesTable');
        
        const response = await APIClient.get('/api/time-entries');
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
        showToast(`❌ Error cargando registros: ${Utils.formatError(error)}`, 'error');
        renderTimeEntriesError();
    } finally {
        hideTableLoader('timeEntriesTable');
    }
}

async function saveTimeEntry(event) {
    event.preventDefault();
    const form = event.target;
    
    const isEditing = form.dataset.editingId;
    
    const timeData = {
        employee_dni: form.employeeDni.value,
        entry_date: form.date.value,
        entry_time: form.entryTime.value || null,
        exit_time: form.exitTime.value || null,
        notes: sanitizeInput(form.notes.value || '')
    };
    
    // Validaciones
    if (!timeData.employee_dni || !timeData.entry_date) {
        showToast('❌ Empleado y fecha son requeridos', 'error');
        return;
    }
    
    if (!timeData.entry_time && !timeData.exit_time) {
        showToast('❌ Debe ingresar al menos la hora de entrada o salida', 'error');
        return;
    }
    
    // Validar formato de horas
    if (timeData.entry_time && !validateTime(timeData.entry_time)) {
        showToast('❌ Formato de hora de entrada inválido (use HH:MM)', 'error');
        form.entryTime.classList.add('error');
        return;
    }
    
    if (timeData.exit_time && !validateTime(timeData.exit_time)) {
        showToast('❌ Formato de hora de salida inválido (use HH:MM)', 'error');
        form.exitTime.classList.add('error');
        return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = isEditing ? 'Actualizando...' : 'Guardando...';
    
    try {
        let response;
        
        if (isEditing) {
            response = await APIClient.put(`/api/time-entries/${isEditing}`, {
                entry_time: timeData.entry_time,
                exit_time: timeData.exit_time,
                notes: timeData.notes
            });
        } else {
            response = await APIClient.post('/api/time-entries', timeData);
        }
        
        if (response.success) {
            await loadTimeEntries();
            closeModal('timeEntry');
            form.reset();
            delete form.dataset.editingId;
            showToast(response.message || '✅ Marcaje registrado correctamente', 'success');
        }
    } catch (error) {
        console.error('Error guardando marcaje:', error);
        showToast(`❌ Error guardando marcaje: ${Utils.formatError(error)}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function deleteTimeEntry(entryId) {
    if (!confirm('¿Está seguro de que desea eliminar este registro de asistencia?')) {
        return;
    }
    
    try {
        showTableLoader('timeEntriesTable');
        const response = await APIClient.delete(`/api/time-entries/${entryId}`);
        
        if (response.success) {
            await loadTimeEntries(false);
            showToast('🗑️ Registro eliminado correctamente', 'info');
        }
    } catch (error) {
        console.error('Error eliminando registro:', error);
        showToast(`❌ Error eliminando registro: ${Utils.formatError(error)}`, 'error');
        hideTableLoader('timeEntriesTable');
    }
}

// ========================================
// Dashboard y Estadísticas con API
// ========================================
async function loadDashboardStats() {
    try {
        const response = await APIClient.get('/api/dashboard/stats');
        if (response.success) {
            AppState.stats = response.stats;
            updateDashboardDisplay();
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        showToast(`❌ Error cargando estadísticas: ${Utils.formatError(error)}`, 'error');
        // Mostrar valores por defecto
        AppState.stats = {
            totalIncome: 0,
            pendingInvoices: 0,
            activeEmployees: 0,
            compliance: 100
        };
        updateDashboardDisplay();
    }
}

function updateDashboardDisplay() {
    const stats = calculateStatsByRole(AppState.userRole, AppState.stats);
    
    // Actualizar elementos del DOM con animación
    animateValue('totalIncome', 0, stats.totalIncome, 1000, (value) => 
        typeof value === 'number' ? formatCurrency(value) : value
    );
    animateValue('pendingInvoices', 0, stats.pendingInvoices, 1000);
    animateValue('activeEmployees', 0, stats.activeEmployees, 1000);
    animateValue('compliance', 0, stats.compliance, 1000, (value) => `${value}%`);
    
    // Actualizar estados según rol
    updateStatusMessagesByRole(AppState.userRole, stats);
}

// Animación de valores numéricos
function animateValue(elementId, start, end, duration, formatter) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Si no es un número, actualizar directamente
    if (typeof end !== 'number') {
        element.textContent = end;
        return;
    }
    
    const range = end - start;
    const startTime = Date.now();
    
    const updateValue = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.floor(start + range * progress);
        
        element.textContent = formatter ? formatter(value) : value;
        
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        }
    };
    
    requestAnimationFrame(updateValue);
}

function calculateStatsByRole(role, apiStats) {
    const baseStats = {
        totalIncome: apiStats.totalIncome || 0,
        pendingInvoices: apiStats.pendingInvoices || 0,
        activeEmployees: apiStats.activeEmployees || 0,
        compliance: apiStats.compliance || 100,
        // Nuevas estadísticas
        presentToday: apiStats.presentToday || 0,
        totalEmployees: apiStats.totalEmployees || 0,
        totalInvoices: apiStats.totalInvoices || 0,
        paidInvoices: apiStats.paidInvoices || 0
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
                totalIncome: apiStats.presentToday || 0, // Mostrar asistencias del día
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
// Funciones de Dashboard por Rol
// ========================================
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
                icon: '💰',
                title: 'Balance General',
                description: 'Ver contabilidad',
                action: 'tab',
                target: 'accounting',
                color: 'success'
            },
            {
                icon: '⚖️',
                title: 'Cumplimiento SUNAT',
                description: 'Normativas tributarias',
                action: 'tab',
                target: 'compliance',
                color: 'info'
            }
        ],
        'rrhh': [
            {
                icon: '👥',
                title: 'Nuevo Empleado',
                description: 'Agregar personal',
                action: 'modal',
                target: 'newEmployee',
                color: 'primary'
            },
            {
                icon: '📋',
                title: 'Gestionar Personal',
                description: 'Ver lista empleados',
                action: 'tab',
                target: 'personnel',
                color: 'info'
            },
            {
                icon: '⏰',
                title: 'Control Asistencia',
                description: 'Marcaje de tiempo',
                action: 'tab',
                target: 'timetracking',
                color: 'warning'
            },
            {
                icon: '⚖️',
                title: 'Cumplimiento SUNAFIL',
                description: 'Normativas laborales',
                action: 'tab',
                target: 'compliance',
                color: 'success'
            }
        ],
        'supervisor': [
            {
                icon: '⏰',
                title: 'Marcar Tiempo',
                description: 'Registrar asistencia',
                action: 'modal',
                target: 'timeEntry',
                color: 'primary'
            },
            {
                icon: '📊',
                title: 'Ver Asistencia',
                description: 'Control de horarios',
                action: 'tab',
                target: 'timetracking',
                color: 'warning'
            },
            {
                icon: '👥',
                title: 'Lista Personal',
                description: 'Ver empleados activos',
                action: 'tab',
                target: 'personnel',
                color: 'info'
            }
        ]
    };
    
    return allItems[role] || [];
}

function updateDashboardLabels() {
    const role = AppState.userRole;
    
    const labels = {
        'admin': {
            income: 'Ingresos Totales',
            invoices: 'Facturas Pendientes', 
            employees: 'Empleados Activos',
            compliance: 'Cumplimiento'
        },
        'contabilidad': {
            income: 'Ingresos Totales',
            invoices: 'Facturas Pendientes',
            employees: 'Personal Total',
            compliance: 'Cumplimiento SUNAT'
        },
        'rrhh': {
            income: 'Presupuesto RRHH',
            invoices: 'Procesos Pendientes',
            employees: 'Empleados Activos',
            compliance: 'Cumplimiento SUNAFIL'
        },
        'supervisor': {
            income: 'Asistencias Hoy',
            invoices: 'Pendientes',
            employees: 'Personal a Cargo',
            compliance: 'Registros'
        }
    };
    
    const roleLabels = labels[role] || labels['admin'];
    
    const incomeLabelEl = document.querySelector('#totalIncome')?.parentElement?.querySelector('.stat-label');
    const invoicesLabelEl = document.querySelector('#pendingInvoices')?.parentElement?.querySelector('.stat-label');
    const employeesLabelEl = document.querySelector('#activeEmployees')?.parentElement?.querySelector('.stat-label');
    const complianceLabelEl = document.querySelector('#compliance')?.parentElement?.querySelector('.stat-label');
    
    if (incomeLabelEl) incomeLabelEl.textContent = roleLabels.income;
    if (invoicesLabelEl) invoicesLabelEl.textContent = roleLabels.invoices;
    if (employeesLabelEl) employeesLabelEl.textContent = roleLabels.employees;
    if (complianceLabelEl) complianceLabelEl.textContent = roleLabels.compliance;
}

function updateStatusMessagesByRole(role, stats) {
    const incomeStatusEl = document.getElementById('incomeStatus');
    const invoiceStatusEl = document.getElementById('invoiceStatus');
    const employeeStatusEl = document.getElementById('employeeStatus');
    const complianceStatusEl = document.getElementById('complianceStatus');
    
    switch(role) {
        case 'contabilidad':
            if (incomeStatusEl) incomeStatusEl.textContent = '💰 Gestión financiera activa';
            if (invoiceStatusEl) invoiceStatusEl.textContent = stats.pendingInvoices > 0 ? '⚠️ Facturas por procesar' : '✅ Facturación al día';
            if (employeeStatusEl) employeeStatusEl.textContent = '👥 Fuera de alcance';
            if (complianceStatusEl) complianceStatusEl.textContent = '📋 SUNAT al día';
            break;
            
        case 'rrhh':
            if (incomeStatusEl) incomeStatusEl.textContent = '💼 Gestión de personal';
            if (invoiceStatusEl) invoiceStatusEl.textContent = '📋 Fuera de alcance';
            if (employeeStatusEl) employeeStatusEl.textContent = `👥 ${stats.activeEmployees} de ${stats.totalEmployees || stats.activeEmployees} activos`;
            if (complianceStatusEl) complianceStatusEl.textContent = '⚖️ SUNAFIL cumpliendo';
            break;
            
        case 'supervisor':
            if (incomeStatusEl) incomeStatusEl.textContent = `⏰ ${stats.totalIncome || 0} presentes hoy`;
            if (invoiceStatusEl) invoiceStatusEl.textContent = '📊 Enfoque en horarios';
            if (employeeStatusEl) employeeStatusEl.textContent = `👥 ${stats.activeEmployees} para supervisar`;
            if (complianceStatusEl) complianceStatusEl.textContent = '📝 Registros actualizados';
            break;
            
        default: // admin
            if (incomeStatusEl) incomeStatusEl.textContent = '✅ Sistema operativo';
            if (invoiceStatusEl) invoiceStatusEl.textContent = stats.pendingInvoices > 0 ? '⚠️ Por gestionar' : '✅ Al día';
            if (employeeStatusEl) employeeStatusEl.textContent = `✅ ${stats.activeEmployees} activos`;
            if (complianceStatusEl) complianceStatusEl.textContent = '✅ Sistema activo';
            break;
    }
}

function initializeComplianceContent() {
    const complianceTab = document.getElementById('compliance');
    if (complianceTab) {
        console.log('✅ Tab de Cumplimiento cargado');
        
        const complianceCards = complianceTab.querySelectorAll('.compliance-card');
        complianceCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.animation = 'fadeInUp 0.5s ease forwards';
            }, index * 100);
        });
    }
}

// ========================================
// Funciones de renderizado UI
// ========================================
function renderEmployees() {
    const tbody = document.querySelector('#employeesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (AppState.employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: var(--gray-500);">
                    <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
                    <div>No hay empleados registrados</div>
                    ${hasPermission('personnel') && AppState.userRole !== 'supervisor' ? 
                        '<button class="btn btn-primary" style="margin-top: 16px;" onclick="showModal(\'newEmployee\')">➕ Agregar primer empleado</button>' : 
                        ''}
                </td>
            </tr>
        `;
        return;
    }
    
    AppState.employees.forEach(employee => {
        const row = document.createElement('tr');
        row.setAttribute('data-dni', employee.dni);
        row.innerHTML = `
            <td><strong>${employee.dni}</strong></td>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="user-avatar" style="width: 32px; height: 32px; font-size: 12px;">
                        ${employee.avatar}
                    </div>
                    <div>
                        <div><strong>${employee.firstName} ${employee.lastName}</strong></div>
                        ${employee.notes ? `<div style="font-size: 12px; color: var(--gray-500);">${employee.notes}</div>` : ''}
                    </div>
                </div>
            </td>
            <td class="status-cell">
                <span class="status-badge ${getStatusClass(employee.status)}" 
                      ${AppState.userRole !== 'supervisor' ? `onclick="quickEditEmployeeStatus('${employee.dni}')" style="cursor: pointer;" title="Click para cambiar estado"` : ''}>
                    ${employee.status}
                </span>
            </td>
            <td>
                ${AppState.userRole !== 'supervisor' ? `
                    <button class="btn btn-secondary" style="padding: 8px 12px; font-size: 12px;" onclick="editEmployee('${employee.dni}')" title="Editar empleado">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-danger" style="padding: 8px 12px; font-size: 12px; margin-left: 8px;" onclick="deleteEmployee('${employee.dni}')" title="Eliminar empleado">
                        🗑️ Eliminar
                    </button>
                ` : '<span style="color: var(--gray-400); font-size: 12px;">Sin permisos</span>'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderEmployeesError() {
    const tbody = document.querySelector('#employeesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align: center; padding: 40px; color: var(--danger);">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <div>Error cargando empleados</div>
                <button class="btn btn-secondary" style="margin-top: 16px;" onclick="loadEmployees()">🔄 Reintentar</button>
            </td>
        </tr>
    `;
}

function renderEmployeeOptions() {
    const select = document.getElementById('employeeSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccionar empleado...</option>';
    
    AppState.employees
        .filter(emp => emp.status === 'Activo')
        .forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.dni;
            option.textContent = `${emp.firstName} ${emp.lastName} (${emp.dni})`;
            select.appendChild(option);
        });
}

function renderInvoices() {
    const tbody = document.querySelector('#invoicesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (AppState.invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--gray-500);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
                    <div>No hay facturas registradas</div>
                    ${hasPermission('invoices') ? 
                        '<button class="btn btn-primary" style="margin-top: 16px;" onclick="showModal(\'newInvoice\')">➕ Crear primera factura</button>' : 
                        ''}
                </td>
            </tr>
        `;
        return;
    }
    
    AppState.invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${invoice.invoice_number}</strong></td>
            <td>
                <div>${invoice.clientName}</div>
                <div style="font-size: 12px; color: var(--gray-500);">RUC: ${invoice.clientRuc}</div>
            </td>
            <td><strong>${formatCurrency(invoice.amount, invoice.currency)}</strong></td>
            <td><span class="status-badge ${getStatusClass(invoice.status)}">${invoice.status}</span></td>
            <td>${formatDate(invoice.date)}</td>
            <td>
                <button class="btn btn-danger" style="padding: 8px 12px; font-size: 12px;" onclick="deleteInvoice(${invoice.id})" title="Anular factura">
                    🗑️ Anular
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderInvoicesError() {
    const tbody = document.querySelector('#invoicesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: var(--danger);">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <div>Error cargando facturas</div>
                <button class="btn btn-secondary" style="margin-top: 16px;" onclick="loadInvoices()">🔄 Reintentar</button>
            </td>
        </tr>
    `;
}

function renderTimeEntries() {
    const tbody = document.querySelector('#timeEntriesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (AppState.timeEntries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--gray-500);">
                    <div style="font-size: 48px; margin-bottom: 16px;">⏰</div>
                    <div>No hay registros de asistencia</div>
                    ${hasPermission('timetracking') ? 
                        '<button class="btn btn-primary" style="margin-top: 16px;" onclick="showModal(\'timeEntry\')">➕ Registrar marcaje</button>' : 
                        ''}
                </td>
            </tr>
        `;
        return;
    }
    
    AppState.timeEntries.forEach(entry => {
        const hours = calculateHours(entry.entryTime, entry.exitTime);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div><strong>${entry.name}</strong></div>
                <div style="font-size: 12px; color: var(--gray-500);">DNI: ${entry.dni}</div>
            </td>
            <td>${formatDate(entry.date)}</td>
            <td>${entry.entryTime ? `<strong>${formatTime(entry.entryTime)}</strong>` : '<span style="color: var(--gray-400);">--:--</span>'}</td>
            <td>${entry.exitTime ? `<strong>${formatTime(entry.exitTime)}</strong>` : '<span style="color: var(--gray-400);">--:--</span>'}</td>
            <td>
                ${hours > 0 ? `
                    <span class="status-badge ${hours >= 8 ? 'active' : hours >= 4 ? 'warning' : 'danger'}">
                        ${hours.toFixed(1)}h
                    </span>
                ` : '<span style="color: var(--gray-400);">--</span>'}
            </td>
            <td>
                <button class="btn btn-secondary" style="padding: 8px 12px; font-size: 12px;" onclick="editTimeEntry(${entry.id})" title="Editar registro">
                    ✏️ Editar
                </button>
                <button class="btn btn-danger" style="padding: 8px 12px; font-size: 12px; margin-left: 8px;" onclick="deleteTimeEntry(${entry.id})" title="Eliminar registro">
                    🗑️ Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderTimeEntriesError() {
    const tbody = document.querySelector('#timeEntriesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: var(--danger);">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <div>Error cargando registros</div>
                <button class="btn btn-secondary" style="margin-top: 16px;" onclick="loadTimeEntries()">🔄 Reintentar</button>
            </td>
        </tr>
    `;
}

// ========================================
// Funciones de edición rápida de empleados
// ========================================
async function quickEditEmployeeStatus(dni) {
    const employee = AppState.employees.find(e => e.dni === dni);
    if (!employee) {
        showToast('❌ Empleado no encontrado', 'error');
        return;
    }
    
    // No permitir edición rápida para supervisores
    if (AppState.userRole === 'supervisor') {
        showToast('❌ No tiene permisos para editar empleados', 'error');
        return;
    }
    
    const currentStatus = employee.status;
    const statusOptions = ['Activo', 'Vacaciones', 'Descanso Médico', 'Cesado'];
    
    const selectHtml = statusOptions.map(status => 
        `<option value="${status}" ${status === currentStatus ? 'selected' : ''}>${status}</option>`
    ).join('');
    
    const dropdownId = `status-dropdown-${dni}`;
    const statusCell = document.querySelector(`[data-dni="${dni}"] .status-cell`);
    if (!statusCell) return;
    
    const originalContent = statusCell.innerHTML;
    
    statusCell.innerHTML = `
        <select id="${dropdownId}" class="quick-status-select" onchange="saveQuickStatusChange('${dni}', this.value)" onblur="cancelQuickStatusEdit('${dni}', \`${originalContent.replace(/`/g, '\\`')}\`)">
            ${selectHtml}
        </select>
    `;
    
    document.getElementById(dropdownId).focus();
}

async function saveQuickStatusChange(dni, newStatus) {
    const employee = AppState.employees.find(e => e.dni === dni);
    if (!employee) return;
    
    const oldStatus = employee.status;
    
    try {
        const response = await APIClient.put(`/api/employees/${dni}`, {
            first_name: employee.firstName,
            last_name: employee.lastName,
            status: newStatus,
            notes: employee.notes
        });
        
        if (response.success) {
            // Actualizar estado local inmediatamente
            employee.status = newStatus;
            renderEmployees();
            
            showToast(`✅ Estado de ${employee.firstName} ${employee.lastName} cambiado de "${oldStatus}" a "${newStatus}"`, 'success');
            
            // Actualizar estadísticas
            updateDashboardStats();
        }
    } catch (error) {
        console.error('Error cambiando estado:', error);
        showToast(`❌ Error cambiando estado: ${Utils.formatError(error)}`, 'error');
        // Recargar empleados para revertir cambios visuales
        await loadEmployees();
    }
}

function cancelQuickStatusEdit(dni, originalContent) {
    setTimeout(() => {
        const statusCell = document.querySelector(`[data-dni="${dni}"] .status-cell`);
        if (statusCell && statusCell.innerHTML.includes('quick-status-select')) {
            statusCell.innerHTML = originalContent;
        }
    }, 200);
}

function editEmployee(dni) {
    const employee = AppState.employees.find(e => e.dni === dni);
    if (!employee) {
        showToast('❌ Empleado no encontrado', 'error');
        return;
    }
    
    document.getElementById('originalDni').value = employee.dni;
    document.getElementById('editDni').value = employee.dni;
    document.getElementById('editFirstName').value = employee.firstName;
    document.getElementById('editLastName').value = employee.lastName;
    document.getElementById('editStatus').value = employee.status;
    document.getElementById('editNotes').value = employee.notes || '';
    
    showModal('editEmployee');
}

function editTimeEntry(entryId) {
    const entry = AppState.timeEntries.find(e => e.id === entryId);
    if (!entry) {
        showToast('❌ Registro no encontrado', 'error');
        return;
    }
    
    const form = document.getElementById('timeEntryForm');
    if (!form) return;
    
    // Llenar formulario con datos existentes
    form.employeeDni.value = entry.dni;
    form.date.value = entry.date;
    form.entryTime.value = entry.entryTime || '';
    form.exitTime.value = entry.exitTime || '';
    form.notes.value = entry.notes || '';
    
    // Marcar como edición
    form.dataset.editingId = entryId;
    
    // Cambiar texto del botón
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Actualizar Marcaje';
    }
    
    // Deshabilitar cambio de empleado y fecha en edición
    form.employeeDni.disabled = true;
    form.date.disabled = true;
    
    showModal('timeEntry');
}

// ========================================
// Utilidades
// ========================================
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    // Eliminar tags HTML y caracteres peligrosos
    return input
        .trim()
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
}

function validateRUC(ruc) {
    return /^[0-9]{11}$/.test(ruc);
}

function validateDNI(dni) {
    return /^[0-9]{8}$/.test(dni);
}

function validateTime(time) {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

function formatCurrency(amount, currency = 'PEN') {
    const symbol = currency === 'USD' ? '$' : 'S/';
    return `${symbol} ${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateString) {
    if (!dateString) return '';
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
    
    // Si la salida es antes que la entrada, asumimos que es del día siguiente
    if (diffMinutes < 0) {
        diffMinutes += 24 * 60;
    }
    
    return diffMinutes / 60;
}

function getStatusClass(status) {
    const statusMap = {
        'pagado': 'active',
        'activo': 'active',
        'pendiente': 'pending',
        'vencido': 'danger',
        'cesado': 'danger',
        'anulado': 'danger',
        'vacaciones': 'warning',
        'descanso médico': 'warning'
    };
    
    return statusMap[status.toLowerCase()] || 'inactive';
}

// ========================================
// Sistema de Modales
// ========================================
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Limpiar formulario si es timeEntry y no es edición
        if (modalId === 'timeEntry') {
            const form = document.getElementById('timeEntryForm');
            if (form && !form.dataset.editingId) {
                form.reset();
                form.employeeDni.disabled = false;
                form.date.disabled = false;
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.textContent = 'Guardar Marcaje';
            }
            
            // Establecer fecha de hoy por defecto
            const dateInput = modal.querySelector('input[name="date"]');
            if (dateInput && !dateInput.value) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }
        
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // Focus en el primer input
        const firstInput = modal.querySelector('input:not([disabled]), select:not([disabled]), textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        
        setTimeout(() => {
            modal.style.display = 'none';
            
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                form.querySelectorAll('.form-error').forEach(error => error.textContent = '');
                form.querySelectorAll('.error').forEach(input => input.classList.remove('error'));
                form.querySelectorAll('[disabled]').forEach(input => input.disabled = false);
                delete form.dataset.editingId;
            }
        }, 300);
    }
}

// ========================================
// Sistema de Notificaciones Toast
// ========================================
let toastCount = 0;

function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toastId = `toast-${Date.now()}-${toastCount++}`;
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast ${type}`;
    
    const icon = getToastIcon(type);
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="removeToast('${toastId}')">&times;</button>
    `;
    
    container.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto-remover después de duration
    setTimeout(() => {
        removeToast(toastId);
    }, duration);
}

function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

function getToastIcon(type) {
    const icons = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    return icons[type] || icons['info'];
}

// ========================================
// Loaders para tablas
// ========================================
function showTableLoader(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="10" style="text-align: center; padding: 40px;">
                <div class="spinner"></div>
                <div style="margin-top: 16px; color: var(--gray-500);">Cargando datos...</div>
            </td>
        </tr>
    `;
}

function hideTableLoader(tableId) {
    // El loader se remueve automáticamente al renderizar los datos
}

// ========================================
// Funciones de Exportación
// ========================================
function downloadFullBackup() {
    showToast('📥 Generando respaldo completo del sistema...', 'info');
    
    try {
        const csvData = generateBackupCSV();
        downloadCSV(csvData, `tecsitel_respaldo_completo_${new Date().toISOString().split('T')[0]}.csv`);
        
        showToast('✅ Respaldo completo descargado exitosamente', 'success');
    } catch (error) {
        console.error('Error generando respaldo:', error);
        showToast('❌ Error generando respaldo', 'error');
    }
}

function downloadInvoicesCSV() {
    showToast('📊 Exportando facturas...', 'info');
    
    try {
        const csvData = generateInvoicesCSV();
        downloadCSV(csvData, `tecsitel_facturas_${new Date().toISOString().split('T')[0]}.csv`);
        
        showToast('✅ Facturas exportadas exitosamente', 'success');
    } catch (error) {
        console.error('Error exportando facturas:', error);
        showToast('❌ Error exportando facturas', 'error');
    }
}

function generateBackupCSV() {
    let csv = `RESPALDO COMPLETO TECSITEL - ${new Date().toLocaleDateString()}\n\n`;
    
    csv += `SISTEMA,VERSIÓN,EMPRESA,RUC,FECHA_RESPALDO\n`;
    csv += `"Tecsitel","${CONFIG.VERSION}","${CONFIG.COMPANY.name}","${CONFIG.COMPANY.ruc}","${new Date().toISOString()}"\n\n`;
    
    csv += `SECCIÓN: FACTURAS (${AppState.invoices.length} registros)\n`;
    csv += `ID,Número,RUC_Cliente,Nombre_Cliente,Descripción,Moneda,Monto,Estado,Exportación,Fecha\n`;
    AppState.invoices.forEach(invoice => {
        csv += `"${invoice.id}","${invoice.invoice_number}","${invoice.clientRuc}","${invoice.clientName}","${invoice.description}","${invoice.currency}","${invoice.amount}","${invoice.status}","${invoice.isExport ? 'Sí' : 'No'}","${invoice.date}"\n`;
    });
    csv += '\n';
    
    csv += `SECCIÓN: EMPLEADOS (${AppState.employees.length} registros)\n`;
    csv += `DNI,Nombres,Apellidos,Estado,Notas,Fecha_Creación\n`;
    AppState.employees.forEach(employee => {
        csv += `"${employee.dni}","${employee.firstName}","${employee.lastName}","${employee.status}","${employee.notes || ''}","${employee.dateCreated || ''}"\n`;
    });
    csv += '\n';
    
    csv += `SECCIÓN: ASISTENCIA (${AppState.timeEntries.length} registros)\n`;
    csv += `ID,DNI,Nombre_Completo,Fecha,Hora_Entrada,Hora_Salida,Horas_Trabajadas,Notas\n`;
    AppState.timeEntries.forEach(entry => {
        const hours = calculateHours(entry.entryTime, entry.exitTime);
        csv += `"${entry.id}","${entry.dni}","${entry.name}","${entry.date}","${entry.entryTime || ''}","${entry.exitTime || ''}","${hours.toFixed(2)}","${entry.notes || ''}"\n`;
    });
    
    csv += `\n\nRESUMEN:\n`;
    csv += `Total Facturas: ${AppState.invoices.length}\n`;
    csv += `Total Empleados: ${AppState.employees.length}\n`;
    csv += `Total Registros de Asistencia: ${AppState.timeEntries.length}\n`;
    csv += `Generado por: ${AppState.user?.name || 'Sistema'}\n`;
    csv += `Rol: ${USER_ROLES[AppState.userRole]?.name || 'N/A'}\n`;
    
    return csv;
}

function generateInvoicesCSV() {
    let csv = `FACTURAS TECSITEL - ${new Date().toLocaleDateString()}\n\n`;
    csv += `Número,RUC_Cliente,Nombre_Cliente,Descripción,Moneda,Monto,Estado,Exportación,Fecha\n`;
    
    AppState.invoices.forEach(invoice => {
        csv += `"${invoice.invoice_number}","${invoice.clientRuc}","${invoice.clientName}","${invoice.description}","${invoice.currency}","${invoice.amount}","${invoice.status}","${invoice.isExport ? 'Sí' : 'No'}","${invoice.date}"\n`;
    });
    
    csv += `\n\nRESUMEN:\n`;
    csv += `Total Facturas: ${AppState.invoices.length}\n`;
    
    const totalPEN = AppState.invoices
        .filter(inv => inv.currency === 'PEN')
        .reduce((sum, inv) => sum + inv.amount, 0);
    
    const totalUSD = AppState.invoices
        .filter(inv => inv.currency === 'USD')
        .reduce((sum, inv) => sum + inv.amount, 0);
    
    csv += `Total en Soles: ${formatCurrency(totalPEN, 'PEN')}\n`;
    csv += `Total en Dólares: ${formatCurrency(totalUSD, 'USD')}\n`;
    csv += `Facturas Pendientes: ${AppState.invoices.filter(inv => inv.status === 'Pendiente').length}\n`;
    csv += `Facturas Pagadas: ${AppState.invoices.filter(inv => inv.status === 'Pagado').length}\n`;
    
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
    
    // Limpiar el objeto URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ========================================
// Construcción de UI
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
    
    const firstMenuItem = navMenu.querySelector('.nav-item');
    if (firstMenuItem) {
        firstMenuItem.classList.add('active');
    }
}

function buildBottomNavigation() {
    const bottomNav = document.getElementById('bottomNav');
    if (!bottomNav) return;
    
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        bottomNav.innerHTML = '';
        let itemCount = 0;
        const maxItems = 4;
        
        // Prioridad de items para móvil según rol
        const priorityMap = {
            'admin': ['dashboard', 'invoices', 'personnel', 'timetracking'],
            'contabilidad': ['dashboard', 'invoices', 'accounting', 'compliance'],
            'rrhh': ['dashboard', 'personnel', 'timetracking', 'compliance'],
            'supervisor': ['dashboard', 'timetracking']
        };
        
        const priorities = priorityMap[AppState.userRole] || ['dashboard'];
        
        priorities.forEach(key => {
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
    
    // Renovar sesión con actividad
    renewSession();
    
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
    
    quickAccessItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = `quick-access-card ${item.color}`;
        card.style.animationDelay = `${index * 50}ms`;
        
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

// ========================================
// Animaciones de carga
// ========================================
function setupLoadingAnimation() {
    const particles = document.getElementById('loadingParticles');
    if (!particles) return;
    
    particles.innerHTML = '';
    
    // Crear partículas más variadas
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
    
    // Partículas grandes con glow
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
    
    const steps = [
        { delay: 800, message: '📊 Configurando sistema de roles...', action: null },
        { delay: 500, message: '🗄️ Cargando datos del usuario...', action: null },
        { delay: 500, message: '🎨 Construyendo interfaz...', action: () => {
            buildNavigationMenu();
            buildBottomNavigation();
        }},
        { delay: 500, message: '👤 Actualizando información de usuario...', action: updateUserInterface },
        { delay: 500, message: '🚀 ¡Sistema listo!', action: null }
    ];
    
    let totalDelay = 0;
    
    for (const step of steps) {
        setTimeout(() => {
            updateLoadingStatus(step.message, false);
            if (step.action) step.action();
        }, totalDelay);
        totalDelay += step.delay;
    }
    
    setTimeout(() => {
        // Ocultar loading screen con fade out
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.style.opacity = '0';
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
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
        }, 500);
    }, totalDelay + 1000);
}

function updateUserInterface() {
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatar = document.getElementById('userAvatar');
    const userAvatarSidebar = document.getElementById('userAvatarSidebar');
    const userNameSidebar = document.getElementById('userNameSidebar');
    const userRoleSidebar = document.getElementById('userRoleSidebar');
    
    if (userNameDisplay) userNameDisplay.textContent = AppState.user.name;
    if (userAvatar) {
        const initials = AppState.user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        userAvatar.textContent = initials;
        userAvatar.title = `${AppState.user.name} - Cerrar sesión`;
    }
    if (userAvatarSidebar) {
        const initials = AppState.user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        userAvatarSidebar.textContent = initials;
    }
    if (userNameSidebar) userNameSidebar.textContent = AppState.user.name;
    if (userRoleSidebar) userRoleSidebar.textContent = USER_ROLES[AppState.userRole]?.description || 'Usuario';
}

function setupEventListeners() {
    // Renovar sesión con cualquier interacción
    document.addEventListener('click', Utils.debounce(renewSession, 1000));
    document.addEventListener('keypress', Utils.debounce(renewSession, 1000));
    
    // Verificar conectividad con API
    setInterval(async () => {
        try {
            await APIClient.get('/api/health');
        } catch (error) {
            console.error('Error de conectividad:', error);
            showToast('⚠️ Problemas de conectividad con el servidor', 'warning');
        }
    }, 5 * 60 * 1000); // Cada 5 minutos
    
    // Responsive navigation
    window.addEventListener('resize', Utils.debounce(() => {
        buildBottomNavigation();
        
        if (window.innerWidth > 1024) {
            closeSidebar();
        }
    }, 250));
    
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
            if (submitBtn && submitBtn.disabled) {
                e.preventDefault();
                return false;
            }
        });
    });
}

// ========================================
// Inicialización cuando el DOM esté listo
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Tecsitel v4.0 con API PostgreSQL/Neon iniciado');
    console.log('📦 Versión:', CONFIG.VERSION);
    console.log('🏢 Empresa:', CONFIG.COMPANY.name);
    
    // Verificar si hay una sesión existente
    const hasExistingSession = await checkExistingSession();
    
    if (!hasExistingSession) {
        // Mostrar pantalla de login
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
        document.getElementById('loadingScreen').style.display = 'none';
        
        // Focus en el primer campo
        setTimeout(() => {
            const firstInput = document.querySelector('#loginScreen input, #loginScreen select');
            if (firstInput) firstInput.focus();
        }, 100);
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

// ========================================
// Estilos CSS adicionales
// ========================================
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
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .toast {
        position: relative;
        display: flex;
        align-items: center;
        padding: 16px;
        margin-bottom: 12px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    }
    
    .toast.show {
        transform: translateX(0);
    }
    
    .toast-icon {
        font-size: 20px;
        margin-right: 12px;
    }
    
    .toast-content {
        flex: 1;
        font-size: 14px;
        color: #374151;
    }
    
    .toast-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
        margin-left: 12px;
        transition: color 0.2s;
    }
    
    .toast-close:hover {
        color: #374151;
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f4f6;
        border-top: 4px solid #dc143c;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }
    
    .quick-access-card {
        animation: fadeInUp 0.5s ease forwards;
        opacity: 0;
    }
    
    .loading-screen {
        transition: opacity 0.5s ease;
    }
    
    /* Mejoras para los select de estado rápido */
    .quick-status-select {
        animation: fadeIn 0.2s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity:
