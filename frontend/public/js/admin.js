// ========== ADMIN.JS - COMPLETO Y CORREGIDO ==========
// NOTA: formatBalance y showToast están en common.js

// Verificar autenticación
const token = localStorage.getItem('pollaToken');
const user = JSON.parse(localStorage.getItem('pollaUser') || '{}');

if (!token || !user.id) {
    window.location.href = 'index.html';
} else if (user.role !== 'admin') {
    window.location.href = 'dashboard.html';
}

// Variable para el filtro actual
let currentFilter = 'all';

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin panel iniciado');
    
    document.getElementById('userInitials').textContent = user.username?.charAt(0).toUpperCase() || 'A';
    document.getElementById('adminBalance').textContent = `$${formatBalance(user.balance || 0)}`;
    
    // Menú hamburguesa
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
    
    // Navegación sidebar
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
    
    // Tabs
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
    
    // Botones
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
    
    // Cargar datos
    cargarRecargas();
    cargarJornadas();
});
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
        
        let html = `
            <div class="recargas-table-container">
                <table class="recargas-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Monto</th>
                            <th>Método</th>
                            <th>Comprobante</th>
                            <th>Acciones</th>
                        </td>
                    </thead>
                    <tbody>
        `;
        
        recargas.forEach(r => {
            html += `
                <tr>
                    <td>${r.user_name || r.username}</td>
                    <td>$${formatBalance(Number(r.amount))}</td>
                    <td>${r.method || r.metodo_pago || 'No especificado'}</td>
                    <td>${r.comprobante_url || 'Sin comprobante'}</td>
                    <td>
                        <button class="btn-success" onclick="aprobarRecarga(${r.id})">Aprobar</button>
                        <button class="btn-danger" onclick="rechazarRecarga(${r.id})">Rechazar</button>
                    </td
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    } catch (err) {
        console.error('Error cargarRecargas:', err);
        container.innerHTML = '<div class="empty-state error">Error al cargar recargas</div>';
    }
}
// ========== JORNADAS CON FILTROS ==========
async function cargarJornadas() {
    const container = document.getElementById('manageJornadasList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner">Cargando jornadas...</div>';
    
    try {
        const res = await fetch('/api/admin/jornadas', {
            headers: { 'x-auth-token': token }
        });
        const data = await res.json();
        let jornadas = data.jornadas || data.data?.jornadas || [];
        
        if (currentFilter !== 'all') {
            jornadas = jornadas.filter(j => j.status === currentFilter);
        }
        
        jornadas.sort((a, b) => new Date(a.closing_date || a.close_date) - new Date(b.closing_date || b.close_date));
        
        if (jornadas.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay jornadas en esta categoría</div>';
            return;
        }
        
        let html = '<div class="jornadas-grid">';
        jornadas.forEach(j => {
            const fechaCierre = new Date(j.close_date || j.closing_date);
            const fechaFormateada = fechaCierre.toLocaleString();
            const puedeEliminar = j.status === 'upcoming' && (!j.total_apuestas || j.total_apuestas === 0);
            
            let statusText = '';
            let statusClass = '';
            
            switch(j.status) {
                case 'open':
                    statusText = 'Abierta';
                    statusClass = 'status-open';
                    break;
                case 'closed':
                    statusText = 'Cerrada';
                    statusClass = 'status-closed';
                    break;
                case 'finished':
                    statusText = 'Finalizada';
                    statusClass = 'status-finished';
                    break;
                default:
                    statusText = 'Próxima';
                    statusClass = 'status-upcoming';
            }
            
            html += `
                <div class="jornada-card" data-jornada-id="${j.id}">
                    <div class="jornada-card-header">
                        <h3>${j.name}</h3>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="jornada-card-stats">
                        <div class="stat">
                            <span class="stat-label">Cierre</span>
                            <span class="stat-value">${fechaFormateada}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Costo</span>
                            <span class="stat-value">$${j.cost_per_bet || j.ticket_cost}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Pozo</span>
                            <span class="stat-value">$${formatBalance(j.total_prize_pool || 0)}</span>
                        </div>
                    </div>
                    <div class="card-actions">
            `;
            
            if (j.status === 'open') {
                html += `<button class="btn-secondary" onclick="cerrarJornada(${j.id})">🔒 Cerrar</button>`;
            }
            
            if (j.status === 'closed') {
                html += `<button class="btn-secondary" onclick="abrirModalResultados(${j.id})">🏆 Cargar Resultados</button>`;
                html += `<button class="btn-primary" onclick="liquidarJornada(${j.id})">💰 Liquidar</button>`;
            }
            
            if (j.status === 'upcoming') {
                html += `<button class="btn-secondary" onclick="abrirJornada(${j.id})">🎯 Abrir</button>`;
            }
            
            if (puedeEliminar) {
                html += `<button class="btn-danger" onclick="eliminarJornada(${j.id})">🗑️ Eliminar</button>`;
            }
            
            html += `
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        
        setupFilters();
    } catch (err) {
        console.error('Error cargarJornadas:', err);
        container.innerHTML = '<div class="empty-state error">Error al cargar jornadas</div>';
    }
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            cargarJornadas();
        });
    });
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

window.abrirJornada = async (id) => {
    try {
        const res = await fetch(`/api/admin/jornadas/${id}/open`, {
            method: 'PUT',
            headers: { 'x-auth-token': token }
        });
        if (res.ok) {
            showToast('Jornada abierta correctamente', 'success');
            cargarJornadas();
        } else {
            showToast('Error al abrir jornada', 'error');
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

window.eliminarJornada = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta jornada? No se puede deshacer.')) return;
    
    try {
        const res = await fetch(`/api/admin/jornadas/${id}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': token }
        });
        if (res.ok) {
            showToast('Jornada eliminada correctamente', 'success');
            cargarJornadas();
        } else {
            const data = await res.json();
            showToast(data.message || 'Error al eliminar', 'error');
        }
    } catch (err) {
        showToast('Error de conexión', 'error');
    }
};

// ========== MODAL DE RESULTADOS ==========
window.abrirModalResultados = async (jornadaId) => {
    window.currentJornadaId = jornadaId;
    const overlay = document.getElementById('resultadosModalOverlay');
    const modal = document.getElementById('resultadosModal');
    const container = document.getElementById('resultadosContainer');
    
    if (!overlay || !modal || !container) {
        showToast('Elementos de modal no encontrados', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/jornadas/${jornadaId}`, {
            headers: { 'x-auth-token': token }
        });
        const data = await res.json();
        const detalle = data.data || data;
        const carreras = detalle.carreras || detalle.races || [];
        
        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <p><strong>Selecciona el caballo GANADOR por número para cada válida</strong></p>
                <p style="color: #2ecc71; font-size: 12px;">Los puntos se asignarán automáticamente al liquidar</p>
            </div>
        `;
        
        window.resultadosSeleccionados = {};
        
        carreras.forEach((carrera, idx) => {
            const cantidad = carrera.cantidad_caballos || 6;
            const numbers = Array.from({ length: cantidad }, (_, i) => i + 1);
            
            const div = document.createElement('div');
            div.className = 'valida-card';
            div.style.marginBottom = '20px';
            div.innerHTML = `
                <h4>${carrera.name} (Válida ${idx + 1})</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                    ${numbers.map(n => `
                        <button 
                            type="button" 
                            class="resultado-number-btn" 
                            data-carrera-id="${carrera.id}" 
                            data-numero="${n}"
                            style="background:#2a2d35; border:1px solid #3a3d45; border-radius:8px; padding:10px 14px; font-size:14px; font-weight:600; color:white; cursor:pointer; width:50px;"
                        >${n}</button>
                    `).join('')}
                </div>
                <div class="selected-winner" style="margin-top:10px; font-size:12px; color:#2ecc71;">
                    Ganador seleccionado: <span id="winner-${carrera.id}">Ninguno</span>
                </div>
            `;
            container.appendChild(div);
            
            div.querySelectorAll('.resultado-number-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    div.querySelectorAll('.resultado-number-btn').forEach(b => {
                        b.style.background = '#2a2d35';
                        b.style.borderColor = '#3a3d45';
                        b.style.color = 'white';
                    });
                    btn.style.background = '#2ecc71';
                    btn.style.borderColor = '#2ecc71';
                    btn.style.color = '#0a0c10';
                    
                    const winnerSpan = document.getElementById(`winner-${carrera.id}`);
                    if (winnerSpan) {
                        winnerSpan.textContent = `Caballo #${btn.dataset.numero}`;
                        winnerSpan.style.color = '#2ecc71';
                    }
                    
                    window.resultadosSeleccionados[carrera.id] = parseInt(btn.dataset.numero);
                });
            });
        });
        
        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');
    } catch (err) {
        console.error('Error:', err);
        container.innerHTML = '<div class="empty-state">No se pudieron cargar las válidas</div>';
    }
};

async function guardarResultados() {
    if (!window.resultadosSeleccionados || Object.keys(window.resultadosSeleccionados).length === 0) {
        showToast('Selecciona los ganadores de cada válida', 'error');
        return;
    }
    
    const jornadaId = window.currentJornadaId;
    const resultados = Object.entries(window.resultadosSeleccionados).map(([carreraId, winnerNumero]) => ({
        carreraId: parseInt(carreraId),
        winnerNumero: winnerNumero
    }));
    
    try {
        const res = await fetch(`/api/admin/jornadas/${jornadaId}/resultados`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ resultados })
        });
        
        if (res.ok) {
            showToast('Resultados guardados correctamente. Ya puedes liquidar la jornada.', 'success');
            closeResultadosModal();
            cargarJornadas();
        } else {
            const data = await res.json();
            showToast(data.message || 'Error al guardar resultados', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showToast('Error de conexión', 'error');
    }
}

function closeResultadosModal() {
    document.getElementById('resultadosModalOverlay')?.classList.add('hidden');
    document.getElementById('resultadosModal')?.classList.add('hidden');
    const container = document.getElementById('resultadosContainer');
    if (container) container.innerHTML = '';
    window.resultadosSeleccionados = {};
}

function setupModals() {
    const overlay = document.getElementById('resultadosModalOverlay');
    const closeBtn = document.getElementById('closeResultadosModal');
    const cancelBtn = document.getElementById('cancelResultadosBtn');
    const saveBtn = document.getElementById('guardarResultadosBtn');
    
    if (overlay) overlay.addEventListener('click', closeResultadosModal);
    if (closeBtn) closeBtn.addEventListener('click', closeResultadosModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeResultadosModal);
    if (saveBtn) saveBtn.addEventListener('click', guardarResultados);
}

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
    
    setTimeout(() => generarValidasBtn.click(), 100);
}

// Inicializar modals
setupModals();