// ========== ADMIN.JS - SIN FUNCIONES DUPLICADAS ==========
// NOTA: formatBalance y showToast están en common.js

// Verificar autenticación
const token = localStorage.getItem('pollaToken');
const user = JSON.parse(localStorage.getItem('pollaUser') || '{}');

if (!token || !user.id) {
    window.location.href = 'index.html';
} else if (user.role !== 'admin') {
    window.location.href = 'dashboard.html';
}

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin panel iniciado');
    
    // ========== UI ==========
    document.getElementById('userInitials').textContent = user.username?.charAt(0).toUpperCase() || 'A';
    document.getElementById('adminBalance').textContent = `$${formatBalance(user.balance || 0)}`;
    
    // ========== MENÚ HAMBURGUESA ==========
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', () => {
            hamburger?.classList.remove('active');
            sidebar?.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // ========== NAVEGACIÓN SIDEBAR ==========
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            if (!section) return;
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            const activeSection = document.getElementById(`${section}Section`);
            if (activeSection) activeSection.classList.add('active');
            
            if (section === 'manage') cargarJornadas();
            if (section === 'reloads') cargarRecargas();
            
            if (window.innerWidth <= 768) {
                hamburger?.classList.remove('active');
                sidebar?.classList.remove('open');
                overlay?.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // ========== TABS ==========
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const panel = tab.dataset.admin;
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
            const activePanel = document.getElementById(`${panel}Panel`);
            if (activePanel) activePanel.classList.add('active');
            
            if (panel === 'recargas') cargarRecargas();
            if (panel === 'manage') cargarJornadas();
        });
    });
    
    // ========== BOTONES ==========
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
    document.getElementById('backToDashboardBtn')?.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });
    document.getElementById('goToDashboardBtn')?.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });
    
    // ========== CARGAR DATOS ==========
    cargarRecargas();
    cargarJornadas();
});

// ========== RECARGAS PENDIENTES ==========
async function cargarRecargas() {
    const container = document.getElementById('recargasList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner">Cargando solicitudes...</div>';
    
    try {
        const res = await fetch('/api/admin/recargas/pendientes', {
            headers: { 'x-auth-token': token }
        });
        const data = await res.json();
        const recargas = data.recargas || data.data?.recargas || [];
        
        if (recargas.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay recargas pendientes</div>';
            return;
        }
        
        let html = '<div class="recargas-table-container"><table class="recargas-table"><thead><tr><th>Usuario</th><th>Monto</th><th>Método</th><th>Comprobante</th><th>Acciones</th></tr></thead><tbody>';
        recargas.forEach(r => {
            html += `
                <tr>
                    <td>${r.user_name || r.username}</td>
                    <td>$${formatBalance(r.amount)}</td>
                    <td>${r.metodo_pago || r.method}</td>
                    <td>${r.comprobante || r.reference || 'Sin comprobante'}</td>
                    <td>
                        <button class="btn-success" onclick="aprobarRecarga(${r.id})">Aprobar</button>
                        <button class="btn-danger" onclick="rechazarRecarga(${r.id})">Rechazar</button>
                    </td>
                </tr>
            `;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state error">Error al cargar recargas</div>';
    }
}

// ========== JORNADAS ==========
async function cargarJornadas() {
    const container = document.getElementById('manageJornadasList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner">Cargando jornadas...</div>';
    
    try {
        const res = await fetch('/api/jornadas', {
            headers: { 'x-auth-token': token }
        });
        const data = await res.json();
        const jornadas = data.jornadas || data.data?.jornadas || [];
        
        if (jornadas.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay jornadas registradas</div>';
            return;
        }
        
        let html = '<div class="jornadas-grid">';
        jornadas.forEach(j => {
            html += `
                <div class="jornada-card">
                    <div class="jornada-card-header">
                        <h3>${j.name}</h3>
                        <span class="status-badge status-${j.status}">${j.status === 'open' ? 'Abierta' : (j.status === 'closed' ? 'Cerrada' : (j.status === 'finished' ? 'Finalizada' : 'Próxima'))}</span>
                    </div>
                    <div class="jornada-card-stats">
                        <div class="stat"><span class="stat-label">Cierre</span><span class="stat-value">${new Date(j.close_date || j.closing_date).toLocaleString()}</span></div>
                        <div class="stat"><span class="stat-label">Costo</span><span class="stat-value">$${j.cost_per_bet || j.ticket_cost}</span></div>
                    </div>
                    <div class="card-actions">
                        ${j.status === 'open' ? `<button class="btn-secondary" onclick="cerrarJornada(${j.id})">Cerrar</button>` : ''}
                        ${j.status === 'closed' ? `<button class="btn-primary" onclick="liquidarJornada(${j.id})">Liquidar</button>` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state error">Error al cargar jornadas</div>';
    }
}

// ========== ACCIONES DE RECARGAS ==========
window.aprobarRecarga = async (id) => {
    try {
        const res = await fetch(`/api/admin/recargas/${id}/aprobar`, {
            method: 'POST',
            headers: { 'x-auth-token': token }
        });
        if (res.ok) {
            showToast('Recarga aprobada correctamente', 'success');
            cargarRecargas();
        } else {
            const data = await res.json();
            showToast(data.message || 'Error al aprobar', 'error');
        }
    } catch (err) {
        showToast('Error de conexión', 'error');
    }
};

window.rechazarRecarga = async (id) => {
    try {
        const res = await fetch(`/api/admin/recargas/${id}/rechazar`, {
            method: 'POST',
            headers: { 'x-auth-token': token }
        });
        if (res.ok) {
            showToast('Recarga rechazada', 'success');
            cargarRecargas();
        } else {
            const data = await res.json();
            showToast(data.message || 'Error al rechazar', 'error');
        }
    } catch (err) {
        showToast('Error de conexión', 'error');
    }
};

// ========== ACCIONES DE JORNADAS ==========
window.cerrarJornada = async (id) => {
    try {
        const res = await fetch(`/api/admin/jornadas/${id}/close`, {
            method: 'PUT',
            headers: { 'x-auth-token': token }
        });
        if (res.ok) {
            showToast('Jornada cerrada correctamente', 'success');
            cargarJornadas();
        } else {
            showToast('Error al cerrar jornada', 'error');
        }
    } catch (err) {
        showToast('Error de conexión', 'error');
    }
};

window.liquidarJornada = async (id) => {
    if (!confirm('¿Estás seguro de liquidar esta jornada?')) return;
    try {
        const res = await fetch(`/api/admin/jornadas/${id}/liquidar`, {
            method: 'POST',
            headers: { 'x-auth-token': token }
        });
        if (res.ok) {
            showToast('Liquidación completada', 'success');
            cargarJornadas();
        } else {
            showToast('Error al liquidar', 'error');
        }
    } catch (err) {
        showToast('Error de conexión', 'error');
    }
};

// ========== CREAR JORNADA ==========
const crearJornadaBtn = document.getElementById('crearJornadaBtn');
if (crearJornadaBtn) {
    crearJornadaBtn.addEventListener('click', async () => {
        const name = document.getElementById('jornadaNombre')?.value;
        const closing_date = document.getElementById('jornadaFechaCierre')?.value;
        const ticket_cost = parseFloat(document.getElementById('jornadaCosto')?.value || 0);
        
        if (!name || !closing_date || !ticket_cost) {
            showToast('Completa todos los campos', 'error');
            return;
        }
        
        const validaDivs = document.querySelectorAll('#validasContainer .valida-card');
        const validas = [];
        validaDivs.forEach(div => {
            validas.push({
                nombre: div.querySelector('.valida-nombre')?.value || '',
                cantidad_caballos: parseInt(div.querySelector('.valida-caballos')?.value || 6, 10)
            });
        });
        
        try {
            const res = await fetch('/api/admin/jornadas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ name, closing_date, ticket_cost, validas })
            });
            if (res.ok) {
                showToast('Jornada creada con éxito', 'success');
                document.getElementById('jornadaNombre').value = '';
                document.getElementById('jornadaFechaCierre').value = '';
                document.getElementById('jornadaCosto').value = '5';
                cargarJornadas();
            } else {
                const data = await res.json();
                showToast(data.message || 'Error al crear', 'error');
            }
        } catch (err) {
            showToast('Error de conexión', 'error');
        }
    });
}

// ========== GENERAR VÁLIDAS ==========
const generarValidasBtn = document.getElementById('generarValidasBtn');
if (generarValidasBtn) {
    generarValidasBtn.addEventListener('click', () => {
        const num = parseInt(document.getElementById('numValidas')?.value || 3, 10);
        const container = document.getElementById('validasContainer');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < num; i++) {
            container.innerHTML += `
                <div class="valida-card">
                    <h4>Válida ${i + 1}</h4>
                    <input type="text" class="valida-nombre" placeholder="Nombre" value="${i + 1}ra Válida" />
                    <label>Cantidad de caballos:</label>
                    <select class="valida-caballos">
                        <option value="4">4 caballos</option>
                        <option value="6" selected>6 caballos</option>
                        <option value="8">8 caballos</option>
                        <option value="10">10 caballos</option>
                        <option value="12">12 caballos</option>
                    </select>
                </div>
            `;
        }
    });
    
    // Generar válidas iniciales
    setTimeout(() => generarValidasBtn.click(), 100);
}