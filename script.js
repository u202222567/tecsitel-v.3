// ========================================
// TECSITEL v4.0 - Sistema de Gestión Empresarial
// ========================================

// ========================================
// Configuración Global y Estado
// ========================================
const CONFIG = {
    IGV_RATE: 0.18,
    LOADING_DURATION: 3000,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
    DATABASE_URL: '/.netlify/functions/api', // Para futuro uso con PostgreSQL
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
    invoices: [],
    employees: [],
    timeEntries: [],
    invoiceCounter: 1,
    sessionStart: null,
    permissions: {}
};

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

const USER_CREDENTIALS = {
    'admin': 'admin123',
    'contabilidad': 'conta123',
    'rrhh': 'rrhh123',
    'supervisor': 'super123'
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
// Sistema de Autenticación Mejorado
// ========================================
function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Validar credenciales
    if (USER_CREDENTIALS[username] && USER_CREDENTIALS[username] === password) {
        AppState.isAuthenticated = true;
        AppState.userRole = username;
        AppState.user = {
            username: username,
            name: USER_ROLES[username].name,
            avatar: USER_ROLES[username].name.split(' ').map(n => n[0]).join('').toUpperCase()
        };
        AppState.sessionStart = Date.now();
        AppState.permissions = getUserPermissions(username);
        
        // Ocultar pantalla de login
        document.getElementById('loginScreen').style.display = 'none';
        
        // Mostrar pantalla de loading con animación
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.style.display = 'flex';
        
        // Inicializar animaciones inmediatamente
        setTimeout(() => {
            setupLoadingAnimation();
            initializeApp();
        }, 100);
        
    } else {
        showToast('❌ Usuario o contraseña incorrectos', 'error');
        // Limpiar campos
        document.getElementById('password').value = '';
    }
}

function getUserPermissions(role) {
    const roleConfig = USER_ROLES[role];
    if (!roleConfig) return {};
    
    const permissions = {};
    
    if (roleConfig.permissions.includes('all')) {
        // Administrador tiene todos los permisos
        Object.keys(NAVIGATION_MENU).forEach(key => {
            permissions[key] = true;
        });
    } else {
        // Permisos específicos por rol
        roleConfig.permissions.forEach(permission => {
            permissions[permission] = true;
        });
    }
    
    return permissions;
}

function hasPermission(section) {
    return AppState.permissions[section] === true;
}

function checkSession() {
    if (AppState.sessionStart && (Date.now() - AppState.sessionStart > CONFIG.SESSION_TIMEOUT)) {
        logout();
        showToast('⏰ Su sesión ha expirado por seguridad', 'warning');
    }
}

function logout() {
    AppState.isAuthenticated = false;
    AppState.user = null;
    AppState.userRole = null;
    AppState.sessionStart = null;
    AppState.permissions = {};
    
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    
    // Limpiar formulario
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    
    showToast('👋 Sesión cerrada correctamente', 'info');
}

// ========================================
// Construcción Dinámica del Menú
// ========================================
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
    
    // Activar primer elemento disponible
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
        const maxItems = 4; // Máximo 4 items en mobile
        
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
// Gestión de Sidebar Responsivo
// ========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (window.innerWidth <= 1024) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Prevenir scroll del body cuando el sidebar está abierto
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

// ========================================
// Gestión de Tabs Mejorada
// ========================================
function showTab(tabName) {
    // Verificar permisos
    if (!hasPermission(tabName)) {
        showToast('❌ No tiene permisos para acceder a esta sección', 'error');
        return;
    }
    
    // Cerrar sidebar en móvil
    if (window.innerWidth <= 1024) {
        closeSidebar();
    }
    
    // Ocultar todas las tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Mostrar la tab seleccionada
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
        
        // Actualizar título
        const menuItem = NAVIGATION_MENU[tabName];
        if (menuItem) {
            document.getElementById('pageTitle').textContent = menuItem.text;
        }
        
        // Actualizar navegación
        updateActiveNavItem(tabName);
        
        // Cargar contenido específico si es necesario
        loadTabContent(tabName);
    }
}

function updateActiveNavItem(activeTab) {
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === activeTab) {
            item.classList.add('active');
        }
    });
    
    // Bottom navigation (mobile)
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === activeTab) {
            item.classList.add('active');
        }
    });
}

function loadTabContent(tabName) {
    switch(tabName) {
        case 'dashboard':
            updateDashboardLabels();
            updateDashboardStats();
            renderQuickAccessGrid();
            break;
        case 'invoices':
            renderInvoices();
            break;
        case 'personnel':
            renderEmployees();
            renderEmployeeOptions();
            break;
        case 'timetracking':
            renderTimeEntries();
            renderEmployeeOptions();
            break;
        case 'compliance':
            initializeComplianceContent();
            break;
    }
}

// ========================================
// Inicializar Contenido de Cumplimiento
// ========================================
function initializeComplianceContent() {
    // El contenido ya está en HTML, solo verificamos que se muestre
    const complianceTab = document.getElementById('compliance');
    if (complianceTab) {
        console.log('✅ Tab de Cumplimiento cargado');
        
        // Animar las cards de cumplimiento
        const complianceCards = complianceTab.querySelectorAll('.compliance-card');
        complianceCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.animation = 'fadeInUp 0.5s ease forwards';
            }, index * 100);
        });
    }
}

// ========================================
// Dashboard Personalizado por Rol
// ========================================
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
    
    // Personalizar etiquetas según rol
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
            income: 'Horas Trabajadas',
            invoices: 'Asistencias Hoy',
            employees: 'Personal a Cargo',
            compliance: 'Registros Completos'
        }
    };
    
    const roleLabels = labels[role] || labels['admin'];
    
    // Actualizar labels en el DOM
    const incomeLabelEl = document.querySelector('#totalIncome').parentElement.querySelector('.stat-label');
    const invoicesLabelEl = document.querySelector('#pendingInvoices').parentElement.querySelector('.stat-label');
    const employeesLabelEl = document.querySelector('#activeEmployees').parentElement.querySelector('.stat-label');
    const complianceLabelEl = document.querySelector('#compliance').parentElement.querySelector('.stat-label');
    
    if (incomeLabelEl) incomeLabelEl.textContent = roleLabels.income;
    if (invoicesLabelEl) invoicesLabelEl.textContent = roleLabels.invoices;
    if (employeesLabelEl) employeesLabelEl.textContent = roleLabels.employees;
    if (complianceLabelEl) complianceLabelEl.textContent = roleLabels.compliance;
}

// ========================================
// Utilidades de Seguridad Mejoradas
// ========================================
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

function validateRUC(ruc) {
    return /^[0-9]{11}$/.test(ruc);
}

function validateDNI(dni) {
    return /^[0-9]{8}$/.test(dni);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateTime(time) {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

function formatCurrency(amount, currency = 'PEN') {
    const symbol = currency === 'USD' ? '$' : 'S/';
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

// ========================================
// Sistema de Datos de Ejemplo Mejorado
// ========================================
function loadSampleData() {
    AppState.employees = [
        { 
            dni: '48756231', 
            firstName: 'Juan Carlos', 
            lastName: 'Pérez García', 
            avatar: 'JP', 
            status: 'Activo', 
            notes: 'Empleado del mes',
            dateCreated: '2024-01-15'
        },
        { 
            dni: '71234567', 
            firstName: 'María Elena', 
            lastName: 'Rodríguez Silva', 
            avatar: 'MR', 
            status: 'Vacaciones', 
            notes: 'Vacaciones hasta el 25/07/2025',
            dateCreated: '2024-02-20'
        },
        { 
            dni: '78945612', 
            firstName: 'Carlos Alberto', 
            lastName: 'Sánchez Torres', 
            avatar: 'CS', 
            status: 'Activo', 
            notes: 'Supervisor de turno',
            dateCreated: '2024-03-10'
        },
        { 
            dni: '12345678', 
            firstName: 'Ana Patricia', 
            lastName: 'Torres Mendoza', 
            avatar: 'AT', 
            status: 'Cesado', 
            notes: 'Fin de contrato temporal',
            dateCreated: '2024-01-05'
        }
    ];
    
    AppState.invoices = [
        {
            id: Date.now() - 100000,
            invoice_number: 'F001-0001',
            clientRuc: '20123456789',
            clientName: 'Empresa Demo SAC',
            description: 'Servicios de consultoría tecnológica',
            currency: 'PEN',
            amount: 2500.00,
            status: 'Pendiente',
            isExport: false,
            date: '2025-07-10'
        }
    ];
    
    AppState.timeEntries = [
        {
            id: 1,
            dni: '48756231',
            name: 'Juan Carlos Pérez García',
            date: '2025-07-13',
            entryTime: '08:00',
            exitTime: '17:00',
            notes: 'Jornada completa'
        },
        {
            id: 2,
            dni: '71234567',
            name: 'María Elena Rodríguez Silva',
            date: '2025-07-12',
            entryTime: '08:30',
            exitTime: '17:30',
            notes: 'Reunión de proyecto'
        }
    ];
    
    AppState.invoiceCounter = 2;
}

// ========================================
// Gestión de Facturas Mejorada
// ========================================
function renderInvoices() {
    const tbody = document.querySelector('#invoicesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (AppState.invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--gray-500);">
                    📄 No hay facturas registradas
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
                <button class="btn btn-danger" style="padding: 8px 12px; font-size: 12px;" onclick="deleteInvoice(${invoice.id})">
                    🗑️ Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
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

function saveInvoice(event) {
    event.preventDefault();
    const form = event.target;
    
    // Validación de RUC
    const ruc = form.clientRuc.value;
    const rucError = document.getElementById('rucError');
    
    if (!validateRUC(ruc)) {
        rucError.textContent = 'RUC debe tener exactamente 11 dígitos';
        form.clientRuc.classList.add('error');
        form.clientRuc.focus();
        return;
    } else {
        rucError.textContent = '';
        form.clientRuc.classList.remove('error');
    }
    
    const newInvoice = {
        id: Date.now(),
        invoice_number: `F001-${String(AppState.invoiceCounter++).padStart(4, '0')}`,
        clientRuc: ruc,
        clientName: sanitizeInput(form.clientName.value),
        description: sanitizeInput(form.description.value),
        currency: form.currency.value,
        amount: parseFloat(form.amount.value),
        status: 'Pendiente',
        isExport: form.isExportInvoice.checked,
        date: new Date().toISOString().split('T')[0]
    };
    
    AppState.invoices.push(newInvoice);
    renderInvoices();
    updateDashboardStats();
    closeModal('newInvoice');
    form.reset();
    
    showToast(`✅ Factura ${newInvoice.invoice_number} creada correctamente`, 'success');
}

function deleteInvoice(invoiceId) {
    if (confirm('¿Está seguro de que desea eliminar esta factura?')) {
        const index = AppState.invoices.findIndex(inv => inv.id === invoiceId);
        if (index !== -1) {
            const deletedInvoice = AppState.invoices.splice(index, 1)[0];
            renderInvoices();
            updateDashboardStats();
            showToast(`🗑️ Factura ${deletedInvoice.invoice_number} eliminada`, 'info');
        }
    }
}

// ========================================
// Gestión de Empleados Mejorada
// ========================================
function renderEmployees() {
    const tbody = document.querySelector('#employeesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (AppState.employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: var(--gray-500);">
                    👥 No hay empleados registrados
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
                <span class="status-badge ${getStatusClass(employee.status)}" onclick="quickEditEmployeeStatus('${employee.dni}')" style="cursor: pointer;" title="Click para cambiar estado">
                    ${employee.status}
                </span>
            </td>
            <td>
                <button class="btn btn-secondary" style="padding: 8px 12px; font-size: 12px;" onclick="editEmployee('${employee.dni}')" title="Editar empleado">
                    ✏️ Editar
                </button>
                <button class="btn btn-danger" style="padding: 8px 12px; font-size: 12px; margin-left: 8px;" onclick="deleteEmployee('${employee.dni}')" title="Eliminar empleado">
                    🗑️ Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
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

function saveEmployee(event) {
    event.preventDefault();
    const form = event.target;
    
    // Validación de DNI
    const dni = form.dni.value;
    const dniError = document.getElementById('dniError');
    
    if (!validateDNI(dni)) {
        dniError.textContent = 'DNI debe tener exactamente 8 dígitos';
        form.dni.classList.add('error');
        form.dni.focus();
        return;
    }
    
    // Verificar DNI único
    const existingEmployee = AppState.employees.find(emp => emp.dni === dni);
    if (existingEmployee) {
        dniError.textContent = 'Este DNI ya está registrado';
        form.dni.classList.add('error');
        form.dni.focus();
        return;
    }
    
    dniError.textContent = '';
    form.dni.classList.remove('error');
    
    const firstName = sanitizeInput(form.firstName.value);
    const lastName = sanitizeInput(form.lastName.value);
    
    const newEmployee = {
        dni: dni,
        firstName: firstName,
        lastName: lastName,
        avatar: `${firstName[0]}${lastName[0]}`.toUpperCase(),
        status: form.status.value,
        notes: sanitizeInput(form.notes.value || ''),
        dateCreated: new Date().toISOString().split('T')[0]
    };
    
    AppState.employees.push(newEmployee);
    renderEmployees();
    renderEmployeeOptions();
    updateDashboardStats();
    closeModal('newEmployee');
    form.reset();
    
    showToast(`✅ Empleado ${firstName} ${lastName} agregado correctamente`, 'success');
}

// ========================================
// Función Específica para Editar Estado de Empleado
// ========================================
function quickEditEmployeeStatus(dni) {
    const employee = AppState.employees.find(e => e.dni === dni);
    if (!employee) {
        showToast('❌ Empleado no encontrado', 'error');
        return;
    }
    
    // Crear dropdown temporal para cambio rápido de estado
    const currentStatus = employee.status;
    const statusOptions = ['Activo', 'Vacaciones', 'Descanso Médico', 'Cesado'];
    
    const selectHtml = statusOptions.map(status => 
        `<option value="${status}" ${status === currentStatus ? 'selected' : ''}>${status}</option>`
    ).join('');
    
    const dropdownId = `status-dropdown-${dni}`;
    
    // Buscar la celda de estado en la tabla
    const statusCell = document.querySelector(`[data-dni="${dni}"] .status-cell`);
    if (!statusCell) return;
    
    // Guardar contenido original
    const originalContent = statusCell.innerHTML;
    
    // Reemplazar temporalmente con dropdown
    statusCell.innerHTML = `
        <select id="${dropdownId}" class="quick-status-select" onchange="saveQuickStatusChange('${dni}', this.value)" onblur="cancelQuickStatusEdit('${dni}', \`${originalContent.replace(/`/g, '\\`')}\`)">
            ${selectHtml}
        </select>
    `;
    
    // Enfocar el dropdown
    document.getElementById(dropdownId).focus();
}

function saveQuickStatusChange(dni, newStatus) {
    const employee = AppState.employees.find(e => e.dni === dni);
    if (!employee) return;
    
    const oldStatus = employee.status;
    employee.status = newStatus;
    employee.dateUpdated = new Date().toISOString().split('T')[0];
    
    // Re-renderizar tabla
    renderEmployees();
    renderEmployeeOptions();
    updateDashboardStats();
    
    showToast(`✅ Estado de ${employee.firstName} ${employee.lastName} cambiado de "${oldStatus}" a "${newStatus}"`, 'success');
}

function cancelQuickStatusEdit(dni, originalContent) {
    setTimeout(() => {
        const statusCell = document.querySelector(`[data-dni="${dni}"] .status-cell`);
        if (statusCell && statusCell.innerHTML.includes('quick-status-select')) {
            statusCell.innerHTML = originalContent;
        }
    }, 100);
}

// ========================================
// Gestión de Edición de Empleados FUNCIONAL
// ========================================
function editEmployee(dni) {
    const employee = AppState.employees.find(e => e.dni === dni);
    if (!employee) {
        showToast('❌ Empleado no encontrado', 'error');
        return;
    }
    
    // Poblar el formulario con los datos actuales
    document.getElementById('originalDni').value = employee.dni;
    document.getElementById('editDni').value = employee.dni;
    document.getElementById('editFirstName').value = employee.firstName;
    document.getElementById('editLastName').value = employee.lastName;
    document.getElementById('editStatus').value = employee.status;
    document.getElementById('editNotes').value = employee.notes || '';
    
    // Mostrar el modal
    showModal('editEmployee');
}

function updateEmployee(event) {
    event.preventDefault();
    const form = event.target;
    
    const originalDni = form.originalDni.value;
    const firstName = sanitizeInput(form.firstName.value);
    const lastName = sanitizeInput(form.lastName.value);
    const status = form.status.value;
    const notes = sanitizeInput(form.notes.value || '');
    
    // Buscar el empleado en el estado
    const employeeIndex = AppState.employees.findIndex(e => e.dni === originalDni);
    
    if (employeeIndex === -1) {
        showToast('❌ Error: Empleado no encontrado', 'error');
        return;
    }
    
    // Actualizar los datos del empleado
    AppState.employees[employeeIndex] = {
        ...AppState.employees[employeeIndex],
        firstName: firstName,
        lastName: lastName,
        status: status,
        notes: notes,
        avatar: `${firstName[0]}${lastName[0]}`.toUpperCase(),
        dateUpdated: new Date().toISOString().split('T')[0]
    };
    
    // Re-renderizar la tabla de empleados
    renderEmployees();
    renderEmployeeOptions(); // Actualizar selects que usan empleados
    updateDashboardStats(); // Actualizar estadísticas
    
    // Cerrar modal y mostrar confirmación
    closeModal('editEmployee');
    showToast(`✅ Empleado ${firstName} ${lastName} actualizado correctamente`, 'success');
    
    // Log para debugging
    console.log('Empleado actualizado:', AppState.employees[employeeIndex]);
}

function deleteEmployee(dni) {
    if (confirm('¿Está seguro de que desea eliminar este empleado?')) {
        const index = AppState.employees.findIndex(emp => emp.dni === dni);
        if (index !== -1) {
            const deletedEmployee = AppState.employees.splice(index, 1)[0];
            renderEmployees();
            renderEmployeeOptions();
            updateDashboardStats();
            showToast(`🗑️ Empleado ${deletedEmployee.firstName} ${deletedEmployee.lastName} eliminado`, 'info');
        }
    }
}

// ========================================
// Sistema de Marcaje de Tiempo NUEVO
// ========================================
function renderTimeEntries() {
    const tbody = document.querySelector('#timeEntriesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (AppState.timeEntries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--gray-500);">
                    ⏰ No hay registros de asistencia
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
            <td><strong>${formatTime(entry.entryTime)}</strong></td>
            <td><strong>${formatTime(entry.exitTime)}</strong></td>
            <td>
                <span class="status-badge ${hours >= 8 ? 'active' : 'warning'}">
                    ${hours.toFixed(1)}h
                </span>
            </td>
            <td>
                <button class="btn btn-secondary" style="padding: 8px 12px; font-size: 12px;" onclick="editTimeEntry(${entry.id})">
                    ✏️ Editar
                </button>
                <button class="btn btn-danger" style="padding: 8px 12px; font-size: 12px; margin-left: 8px;" onclick="deleteTimeEntry(${entry.id})">
                    🗑️ Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function calculateHours(entryTime, exitTime) {
    if (!entryTime || !exitTime) return 0;
    
    const [entryHour, entryMin] = entryTime.split(':').map(Number);
    const [exitHour, exitMin] = exitTime.split(':').map(Number);
    
    const entryMinutes = entryHour * 60 + entryMin;
    const exitMinutes = exitHour * 60 + exitMin;
    
    let diffMinutes = exitMinutes - entryMinutes;
    
    // Manejar casos donde la salida es al día siguiente
    if (diffMinutes < 0) {
        diffMinutes += 24 * 60;
    }
    
    return diffMinutes / 60;
}

function saveTimeEntry(event) {
    event.preventDefault();
    const form = event.target;
    
    const employeeDni = form.employeeDni.value;
    const date = form.date.value;
    const entryTime = form.entryTime.value;
    const exitTime = form.exitTime.value;
    
    if (!employeeDni) {
        showToast('❌ Debe seleccionar un empleado', 'error');
        return;
    }
    
    if (!date) {
        showToast('❌ Debe seleccionar una fecha', 'error');
        return;
    }
    
    // Validar que al menos uno de los tiempos esté presente
    if (!entryTime && !exitTime) {
        showToast('❌ Debe ingresar al menos la hora de entrada o salida', 'error');
        return;
    }
    
    // Validar formato de horas
    if (entryTime && !validateTime(entryTime)) {
        showToast('❌ Formato de hora de entrada inválido', 'error');
        return;
    }
    
    if (exitTime && !validateTime(exitTime)) {
        showToast('❌ Formato de hora de salida inválido', 'error');
        return;
    }
    
    // Buscar información del empleado
    const employee = AppState.employees.find(emp => emp.dni === employeeDni);
    if (!employee) {
        showToast('❌ Empleado no encontrado', 'error');
        return;
    }
    
    // Verificar si ya existe un registro para este empleado en esta fecha
    const existingEntry = AppState.timeEntries.find(entry => 
        entry.dni === employeeDni && entry.date === date
    );
    
    if (existingEntry) {
        // Actualizar registro existente
        existingEntry.entryTime = entryTime || existingEntry.entryTime;
        existingEntry.exitTime = exitTime || existingEntry.exitTime;
        existingEntry.notes = sanitizeInput(form.notes.value || '');
        
        showToast(`✅ Marcaje actualizado para ${employee.firstName} ${employee.lastName}`, 'success');
    } else {
        // Crear nuevo registro
        const newTimeEntry = {
            id: Date.now(),
            dni: employeeDni,
            name: `${employee.firstName} ${employee.lastName}`,
            date: date,
            entryTime: entryTime || '',
            exitTime: exitTime || '',
            notes: sanitizeInput(form.notes.value || '')
        };
        
        AppState.timeEntries.push(newTimeEntry);
        showToast(`✅ Marcaje registrado para ${employee.firstName} ${employee.lastName}`, 'success');
    }
    
    renderTimeEntries();
    closeModal('timeEntry');
    form.reset();
}

function editTimeEntry(entryId) {
    const entry = AppState.timeEntries.find(e => e.id === entryId);
    if (!entry) return;
    
    const form = document.getElementById('timeEntryForm');
    if (!form) return;
    
    // Poblar formulario con datos existentes
    form.employeeDni.value = entry.dni;
    form.date.value = entry.date;
    form.entryTime.value = entry.entryTime || '';
    form.exitTime.value = entry.exitTime || '';
    form.notes.value = entry.notes || '';
    
    // Cambiar el comportamiento del formulario para actualizar en lugar de crear
    form.dataset.editingId = entryId;
    
    showModal('timeEntry');
}

function deleteTimeEntry(entryId) {
    if (confirm('¿Está seguro de que desea eliminar este registro de asistencia?')) {
        const index = AppState.timeEntries.findIndex(entry => entry.id === entryId);
        if (index !== -1) {
            const deletedEntry = AppState.timeEntries.splice(index, 1)[0];
            renderTimeEntries();
            showToast(`🗑️ Registro de ${deletedEntry.name} eliminado`, 'info');
        }
    }
}

// ========================================
// Dashboard y Estadísticas Personalizadas
// ========================================
function updateDashboardStats() {
    // Calcular estadísticas basadas en rol
    const stats = calculateStatsByRole(AppState.userRole);
    
    // Actualizar elementos del DOM
    const totalIncomeEl = document.getElementById('totalIncome');
    const pendingInvoicesEl = document.getElementById('pendingInvoices');
    const activeEmployeesEl = document.getElementById('activeEmployees');
    const complianceEl = document.getElementById('compliance');
    
    if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(stats.totalIncome);
    if (pendingInvoicesEl) pendingInvoicesEl.textContent = stats.pendingInvoices;
    if (activeEmployeesEl) activeEmployeesEl.textContent = stats.activeEmployees;
    if (complianceEl) complianceEl.textContent = stats.compliance + '%';
    
    // Actualizar estados según rol
    updateStatusMessagesByRole(AppState.userRole, stats);
}

function calculateStatsByRole(role) {
    const baseStats = {
        totalIncome: AppState.invoices.reduce((sum, inv) => {
            return inv.currency === 'PEN' ? sum + inv.amount : sum + (inv.amount * 3.8);
        }, 0),
        pendingInvoices: AppState.invoices.filter(inv => inv.status === 'Pendiente').length,
        activeEmployees: AppState.employees.filter(emp => emp.status === 'Activo').length,
        compliance: 100
    };
    
    // Personalizar según rol
    switch(role) {
        case 'contabilidad':
            return {
                ...baseStats,
                activeEmployees: 'N/A' // Contabilidad no ve empleados
            };
        case 'supervisor':
            return {
                totalIncome: 'N/A', // Supervisor no ve ingresos
                pendingInvoices: 'N/A', // Supervisor no ve facturas
                activeEmployees: baseStats.activeEmployees,
                compliance: 'N/A' // Supervisor no ve cumplimiento completo
            };
        case 'rrhh':
            return {
                totalIncome: 'N/A', // RRHH no ve ingresos directos
                pendingInvoices: 'N/A', // RRHH no ve facturas
                activeEmployees: baseStats.activeEmployees,
                compliance: baseStats.compliance
            };
        default:
            return baseStats;
    }
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
            if (employeeStatusEl) employeeStatusEl.textContent = `👥 ${stats.activeEmployees} empleados activos`;
            if (complianceStatusEl) complianceStatusEl.textContent = '⚖️ SUNAFIL cumpliendo';
            break;
            
        case 'supervisor':
            if (incomeStatusEl) incomeStatusEl.textContent = '⏰ Control de asistencia';
            if (invoiceStatusEl) invoiceStatusEl.textContent = '📊 Enfoque en horarios';
            if (employeeStatusEl) employeeStatusEl.textContent = `👥 ${stats.activeEmployees} para supervisar`;
            if (complianceStatusEl) complianceStatusEl.textContent = '📝 Registros actualizados';
            break;
            
        default: // admin
            if (incomeStatusEl) incomeStatusEl.textContent = '✅ Conectado al sistema';
            if (invoiceStatusEl) invoiceStatusEl.textContent = stats.pendingInvoices > 0 ? '⚠️ Por gestionar' : '✅ Al día';
            if (employeeStatusEl) employeeStatusEl.textContent = '✅ Base de datos';
            if (complianceStatusEl) complianceStatusEl.textContent = '✅ Sistema activo';
            break;
    }
}

// ========================================
// Sistema de Modales Mejorado
// ========================================
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // Enfocar en el primer campo
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // Configurar fecha actual en formularios de tiempo
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
        
        // Limpiar formulario
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            // Limpiar errores
            form.querySelectorAll('.form-error').forEach(error => error.textContent = '');
            form.querySelectorAll('.error').forEach(input => input.classList.remove('error'));
            // Limpiar datos de edición
            delete form.dataset.editingId;
        }
    }
}

// Cerrar modales al hacer clic fuera
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

// ========================================
// Sistema de Notificaciones Toast Mejorado
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
    
    // Auto-remove después del duration
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
// Funciones de Exportación Mejoradas
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
    
    // Información del sistema
    csv += `SISTEMA,VERSIÓN,EMPRESA,RUC,FECHA_RESPALDO\n`;
    csv += `"Tecsitel","${CONFIG.VERSION}","${CONFIG.COMPANY.name}","${CONFIG.COMPANY.ruc}","${new Date().toISOString()}"\n\n`;
    
    // Facturas
    csv += `SECCIÓN: FACTURAS\n`;
    csv += `ID,Número,RUC_Cliente,Nombre_Cliente,Descripción,Moneda,Monto,Estado,Exportación,Fecha\n`;
    AppState.invoices.forEach(invoice => {
        csv += `"${invoice.id}","${invoice.invoice_number}","${invoice.clientRuc}","${invoice.clientName}","${invoice.description}","${invoice.currency}","${invoice.amount}","${invoice.status}","${invoice.isExport}","${invoice.date}"\n`;
    });
    csv += '\n';
    
    // Empleados
    csv += `SECCIÓN: EMPLEADOS\n`;
    csv += `DNI,Nombres,Apellidos,Estado,Notas,Fecha_Creación\n`;
    AppState.employees.forEach(employee => {
        csv += `"${employee.dni}","${employee.firstName}","${employee.lastName}","${employee.status}","${employee.notes || ''}","${employee.dateCreated || ''}"\n`;
    });
    csv += '\n';
    
    // Registro de asistencia
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
// Animación de Carga Mejorada con Logo Girando
// ========================================
function setupLoadingAnimation() {
    const particles = document.getElementById('loadingParticles');
    if (!particles) return;
    
    // Limpiar partículas existentes
    particles.innerHTML = '';
    
    // Crear partículas animadas mejoradas
    for (let i = 0; i < 60; i++) {
        const particle = document.createElement('div');
        const size = Math.random() * 6 + 2; // Tamaño entre 2px y 8px
        const duration = Math.random() * 4 + 3; // Duración entre 3s y 7s
        const delay = Math.random() * 5; // Delay hasta 5s
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
    
    // Agregar algunas partículas más grandes para efecto especial
    for (let i = 0; i < 10; i++) {
        const bigParticle = document.createElement('div');
        const size = Math.random() * 4 + 8; // Tamaño entre 8px y 12px
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
        // Animación de salida
        statusEl.style.opacity = '0';
        statusEl.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            statusEl.textContent = message;
            statusEl.className = `loading-status ${isError ? 'error' : ''}`;
            
            // Animación de entrada
            statusEl.style.opacity = '1';
            statusEl.style.transform = 'translateY(0)';
        }, 200);
    }
}

// ========================================
// Inicialización de la Aplicación Mejorada
// ========================================
function initializeApp() {
    // Configurar animaciones de loading
    setupLoadingAnimation();
    updateLoadingStatus('🔐 Validando credenciales...', false);
    
    setTimeout(() => {
        updateLoadingStatus('📊 Configurando sistema de roles...', false);
        
        setTimeout(() => {
            updateLoadingStatus('🗄️ Cargando datos del usuario...', false);
            loadSampleData();
            
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
                        }, 1500); // Mantener "Sistema listo" más tiempo
                    }, 500);
                }, 500);
            }, 500);
        }, 500);
    }, 800); // Tiempo inicial más largo para mostrar las credenciales
}

function updateUserInterface() {
    // Actualizar información del usuario en la interfaz
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatar = document.getElementById('userAvatar');
    const userAvatarSidebar = document.getElementById('userAvatarSidebar');
    const userNameSidebar = document.getElementById('userNameSidebar');
    const userRoleSidebar = document.getElementById('userRoleSidebar');
    
    if (userNameDisplay) userNameDisplay.textContent = AppState.user.name;
    if (userAvatar) {
        userAvatar.textContent = AppState.user.avatar;
        userAvatar.title = `${AppState.user.name} - Cerrar sesión`;
    }
    if (userAvatarSidebar) userAvatarSidebar.textContent = AppState.user.avatar;
    if (userNameSidebar) userNameSidebar.textContent = AppState.user.name;
    if (userRoleSidebar) userRoleSidebar.textContent = USER_ROLES[AppState.userRole].description;
}

function setupEventListeners() {
    // Verificación de sesión cada 5 minutos
    setInterval(checkSession, 5 * 60 * 1000);
    
    // Responsive navigation
    window.addEventListener('resize', () => {
        buildBottomNavigation();
        
        // Cerrar sidebar en desktop
        if (window.innerWidth > 1024) {
            closeSidebar();
        }
    });
    
    // Prevenir envío de formularios sin validación
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Procesando...';
                
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }, 2000);
            }
        });
    });
}

// ========================================
// Inicialización cuando el DOM esté listo
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay una sesión activa (para futuras implementaciones)
    const savedSession = localStorage.getItem('tecsitel_session');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            if (sessionData.expires > Date.now()) {
                // Restaurar sesión automáticamente
                console.log('Sesión válida encontrada');
            } else {
                localStorage.removeItem('tecsitel_session');
            }
        } catch (e) {
            localStorage.removeItem('tecsitel_session');
        }
    }
    
    // Configurar navegación inicial
    buildBottomNavigation();
    
    // Inicializar animación de loading desde el inicio
    setupLoadingAnimation();
    
    // Mostrar el menú toggle en móvil
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle && window.innerWidth <= 1024) {
        menuToggle.style.display = 'block';
    }
    
    console.log('🚀 Tecsitel v4.0 iniciado correctamente');
    console.log('👨‍💼 Roles disponibles:', Object.keys(USER_ROLES));
});

// Añadir animación de salida para toasts
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
document.head.appendChild(style);