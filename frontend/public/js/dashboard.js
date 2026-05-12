// ========== DASHBOARD.JS - COMPLETO Y CORREGIDO ==========
// NOTA: Las funciones formatBalance, showToast, apiFetch, getToken, getUser, 
// saveSession, clearSession, initSocket ya están definidas en common.js

let selectedJornada = null;
let currentSelections = {};

// Verificar autenticación
const token = localStorage.getItem('pollaToken');
const user = JSON.parse(localStorage.getItem('pollaUser') || '{}');

if (!token || !user.id) {
    window.location.href = 'index.html';
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard iniciado');
    
    const initialsEl = document.getElementById('userInitials');
    const balanceEl = document.getElementById('userBalance');
    if (initialsEl) initialsEl.textContent = user.username?.charAt(0).toUpperCase() || 'U';
    if (balanceEl) balanceEl.textContent = `$${Number(user.balance || 0).toFixed(2)}`;
    
    loadJornadas();
    loadHistorial();
    loadRankingGlobal();
    loadJornadasParaRanking();
    
    setupNavigation();
    setupUserMenu();
    setupModals();
    setupRecharge();
    
    if (typeof initSocket === 'function') initSocket();
});

// ========== WEBSOCKET CORREGIDO ==========
(function initWebSocket() {
    const authToken = localStorage.getItem('pollaToken');
    const currentUser = JSON.parse(localStorage.getItem('pollaUser') || '{}');
    
    if (authToken && currentUser.id && !window.socket) {
        const wsUrl = window.location.origin.replace('http', 'ws');
        console.log('Conectando WebSocket a:', wsUrl);
        
        window.socket = io(wsUrl, { 
            query: { token: authToken },
            transports: ['websocket', 'polling']
        });
        
        window.socket.on('connect', () => {
            console.log('✅ WebSocket conectado');
            window.socket.emit('join', currentUser.id);
        });
        
        window.socket.on('recarga_aprobada', (data) => {
            console.log('💰 Recarga aprobada:', data);
            if (typeof showToast === 'function') showToast(`Recarga de $${data.amount} aprobada`, 'success');
            
            const userData = JSON.parse(localStorage.getItem('pollaUser') || '{}');
            userData.balance = (userData.balance || 0) + Number(data.amount);
            localStorage.setItem('pollaUser', JSON.stringify(userData));
            
            const balanceEl = document.getElementById('userBalance');
            if (balanceEl) {
                balanceEl.textContent = `$${userData.balance.toFixed(2)}`;
            }
        });
        
        window.socket.on('connect_error', (err) => {
            console.error('WebSocket error:', err.message);
        });
    }
})();

// ========== NAVEGACIÓN ==========
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const page = link.dataset.page;
            if (!page) return;
            changePage(page);
        });
    });
    
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const page = link.dataset.page;
            if (!page) return;
            changePage(page);
            closeMobileMenu();
        });
    });
    
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
    
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('overlay');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            if (mobileMenu) mobileMenu.classList.toggle('open');
            if (overlay) overlay.classList.toggle('active');
            document.body.style.overflow = mobileMenu?.classList.contains('open') ? 'hidden' : '';
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', () => {
            if (hamburger) hamburger.classList.remove('active');
            if (mobileMenu) mobileMenu.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
}

function changePage(pageId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) targetPage.classList.add('active');
    
    if (pageId === 'jornadas') loadJornadas();
    if (pageId === 'mis-jugadas') loadHistorial();
    if (pageId === 'ranking') {
        loadRankingGlobal();
        const select = document.getElementById('rankingJornadaSelect');
        if (select?.value) {
            loadRankingPorJornada(select.value);
            loadMiPosicion(select.value);
        }
    }
}

function closeMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('overlay');
    
    if (hamburger) hamburger.classList.remove('active');
    if (mobileMenu) mobileMenu.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function setupUserMenu() {
    const avatar = document.getElementById('userMenuBtn');
    const dropdown = document.getElementById('userDropdown');
    
    if (avatar && dropdown) {
        avatar.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => dropdown.classList.remove('show'));
    }
}

// ========== JORNADAS ==========
async function loadJornadas() {
    const container = document.getElementById('jornadasContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner">Cargando jornadas...</div>';
    
    try {
        const res = await fetch('/api/jornadas', {
            headers: { 'x-auth-token': token }
        });
        const response = await res.json();
        
        const jornadas = response.data?.jornadas || response.jornadas || [];
        console.log('Jornadas cargadas:', jornadas.length);
        
        if (jornadas.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay jornadas activas en este momento.</div>';
            return;
        }
        
        container.innerHTML = jornadas.map(j => renderJornadaCard(j)).join('');
        
        jornadas.forEach(j => {
            const card = document.getElementById(`jornada-card-${j.id}`);
            if (card) {
                card.addEventListener('click', () => openApuestaModal(j));
            }
        });
        
    } catch (error) {
        console.error('Error loadJornadas:', error);
        container.innerHTML = '<div class="empty-state error">Error al cargar las jornadas</div>';
    }
}

function renderJornadaCard(j) {
    const costo = Number(j.cost_per_bet || j.ticket_cost || 5);
    const pozo = Number(j.total_prize_pool || j.pot || 0);
    const fechaCierre = new Date(j.close_date || j.closing_date);
    const fechaFormateada = fechaCierre.toLocaleString();
    
    return `
        <div class="jornada-card" id="jornada-card-${j.id}">
            <div class="jornada-card-header">
                <h3>${j.name}</h3>
                <span class="status-badge status-open">Abierta</span>
            </div>
            <div class="jornada-card-stats">
                <div class="stat"><span class="stat-label">Precio</span><span class="stat-value">$${costo.toFixed(2)}</span></div>
                <div class="stat"><span class="stat-label">Pozo</span><span class="stat-value highlight">$${pozo.toFixed(2)}</span></div>
            </div>
            <div class="jornada-card-footer"><span>📅 Cierra: ${fechaFormateada}</span><span>🎯 Click para apostar</span></div>
        </div>
    `;
}

// ========== MODAL APUESTA ==========
async function openApuestaModal(jornada) {
    console.log('Abriendo modal para:', jornada.name);
    selectedJornada = jornada;
    currentSelections = {};
    
    try {
        const res = await fetch(`/api/jornadas/${jornada.id}`, {
            headers: { 'x-auth-token': token }
        });
        const response = await res.json();
        
        const detalle = response.data || response;
        const carreras = detalle.carreras || detalle.races || [];
        
        const modalTitle = document.getElementById('modalTitle');
        const modalTotalCost = document.getElementById('modalTotalCost');
        const modalJornadaInfo = document.getElementById('modalJornadaInfo');
        
        if (modalTitle) modalTitle.textContent = jornada.name;
        const costoJornada = Number(jornada.cost_per_bet || jornada.ticket_cost || 5);
        if (modalTotalCost) modalTotalCost.textContent = costoJornada;
        
        const closingDate = new Date(jornada.closing_date || jornada.close_date);
        const fechaCierre = closingDate.toLocaleString();
        const pozoJornada = Number(jornada.total_prize_pool || 0);
        
        if (modalJornadaInfo) {
            modalJornadaInfo.innerHTML = `
                <div class="modal-jornada-info-row"><span class="modal-jornada-label">Cierre</span><span class="modal-jornada-value">${fechaCierre}</span></div>
                <div class="modal-jornada-info-row"><span class="modal-jornada-label">Costo por jugada</span><span class="modal-jornada-value">$${costoJornada.toFixed(2)}</span></div>
                <div class="modal-jornada-info-row"><span class="modal-jornada-label">Pozo acumulado</span><span class="modal-jornada-value">$${pozoJornada.toFixed(2)}</span></div>
            `;
        }
        
        const container = document.getElementById('modalValidasContainer');
        if (!container) return;
        container.innerHTML = '';
        
        if (!carreras || carreras.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>⚠️ Esta jornada no tiene válidas configuradas.</p><button class="btn-primary" onclick="closeModal()">Cerrar</button></div>`;
            document.getElementById('apuestaModal').classList.remove('hidden');
            document.getElementById('modalOverlay').classList.remove('hidden');
            return;
        }
        
        carreras.forEach((carrera, idx) => {
            const cantidad = Number(carrera.cantidad_caballos || 6);
            const numbers = Array.from({ length: cantidad }, (_, i) => i + 1);
            
            const div = document.createElement('div');
            div.className = 'valida-seleccion';
            div.innerHTML = `<h4>${carrera.name} <span style="color:#8a8f9e; font-size:12px;">(Válida ${idx + 1})</span></h4>
                <div class="numbers-grid" data-carrera-id="${carrera.id}">
                    ${numbers.map(n => `<button class="number-btn" data-numero="${n}">${n}</button>`).join('')}
                </div>`;
            
            div.querySelectorAll('.number-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    div.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    currentSelections[carrera.id] = parseInt(btn.dataset.numero);
                });
            });
            container.appendChild(div);
        });
        
        document.getElementById('apuestaModal').classList.remove('hidden');
        document.getElementById('modalOverlay').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error openApuestaModal:', error);
        if (typeof showToast === 'function') showToast('Error al cargar los detalles', 'error');
        closeModal();
    }
}

async function confirmBet() {
    console.log('Confirmando apuesta...');
    
    const validasDivs = document.querySelectorAll('#modalValidasContainer .valida-seleccion');
    const selections = [];
    
    for (const div of validasDivs) {
        const selected = div.querySelector('.number-btn.selected');
        if (!selected) {
            if (typeof showToast === 'function') showToast('Selecciona un número para cada válida', 'error');
            return;
        }
        selections.push(parseInt(selected.dataset.numero));
    }
    
    if (!selectedJornada || !selectedJornada.id) {
        if (typeof showToast === 'function') showToast('Error: No hay jornada seleccionada', 'error');
        return;
    }
    
    const payload = { jornadaId: selectedJornada.id, selections: selections };
    console.log('Payload apuesta:', payload);
    
    try {
        const res = await fetch('/api/jugadas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
            if (typeof showToast === 'function') showToast('¡Apuesta realizada con éxito!', 'success');
            closeModal();
            
            const newUser = JSON.parse(localStorage.getItem('pollaUser') || '{}');
            if (data.newBalance !== undefined) newUser.balance = data.newBalance;
            else if (data.data?.newBalance !== undefined) newUser.balance = data.data.newBalance;
            localStorage.setItem('pollaUser', JSON.stringify(newUser));
            const balanceEl = document.getElementById('userBalance');
            if (balanceEl) balanceEl.textContent = `$${Number(newUser.balance || 0).toFixed(2)}`;
            
            loadJornadas();
            loadHistorial();
        } else {
            if (typeof showToast === 'function') showToast(data.message || 'Error al realizar la apuesta', 'error');
        }
    } catch (error) {
        console.error('Error confirmBet:', error);
        if (typeof showToast === 'function') showToast('Error de conexión', 'error');
    }
}

function closeModal() {
    document.getElementById('apuestaModal').classList.add('hidden');
    document.getElementById('modalOverlay').classList.add('hidden');
    selectedJornada = null;
    currentSelections = {};
}

// ========== HISTORIAL CON ACIERTOS ==========
async function loadHistorial() {
    const container = document.getElementById('historialContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner">Cargando historial...</div>';
    
    try {
        const res = await fetch('/api/jugadas/mis-jugadas', {
            headers: { 'x-auth-token': token }
        });
        const response = await res.json();
        let jugadas = [];
        
        if (response.data && Array.isArray(response.data.jugadas)) {
            jugadas = response.data.jugadas;
        } else if (response.jugadas && Array.isArray(response.jugadas)) {
            jugadas = response.jugadas;
        } else if (Array.isArray(response)) {
            jugadas = response;
        }
        
        console.log('Historial cargado:', jugadas.length);
        
        if (jugadas.length === 0) {
            container.innerHTML = '<div class="empty-state">No tienes jugadas registradas. Realiza tu primera apuesta!</div>';
            return;
        }
        
        let html = '<div class="historial-table-container"><table class="historial-table"><thead><tr><th>Jornada</th><th>Selecciones</th><th>Aciertos</th><th>Costo</th><th>Estado</th><th>Premio</th><th>Fecha</th></tr></thead><tbody>';
        
        for (const j of jugadas) {
            const selections = Array.isArray(j.selections) ? j.selections.join(' - ') : (j.selections || '-');
            const costo = Number(j.cost || 0).toFixed(2);
            const premio = Number(j.prize || 0).toFixed(2);
            let statusText = '', statusColor = '';
            
            // Mostrar aciertos
            let aciertosTexto = '-';
            if (j.aciertos !== undefined && j.aciertos !== null) {
                const totalValidas = j.total_validas || 5;
                aciertosTexto = `${j.aciertos}/${totalValidas}`;
            }
            
            if (j.status === 'won') {
                statusText = 'Ganó';
                statusColor = '#2ecc71';
            } else if (j.status === 'lost') {
                statusText = 'Perdió';
                statusColor = '#e74c3c';
            } else if (j.status === 'pending' && j.aciertos > 0) {
                statusText = `${j.aciertos} acierto(s)`;
                statusColor = '#3498db';
            } else {
                statusText = 'Pendiente';
                statusColor = '#f39c12';
            }
            
            let fecha = '-';
            if (j.created_at) {
                try {
                    const fechaObj = new Date(j.created_at);
                    if (!isNaN(fechaObj.getTime())) {
                        fecha = fechaObj.toLocaleString();
                    }
                } catch(e) {
                    console.error('Error parsing date:', e);
                }
            }
            
            html += `<tr>
                <td>${j.jornada_name || j.jornada?.name || '-'}</td>
                <td style="font-family:monospace;">${selections}</td>
                <td style="font-weight:600;">${aciertosTexto}</td>
                <td>$${costo}</td>
                <td style="color:${statusColor}; font-weight:600;">${statusText}</td>
                <td>$${premio}</td>
                <td>${fecha}</td>
            </tr>`;
        }
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loadHistorial:', error);
        container.innerHTML = '<div class="empty-state error">Error al cargar el historial</div>';
    }
}

// ========== RECARGA ==========
function setupRecharge() {
    const submitBtn = document.getElementById('submitRechargeBtn');
    if (!submitBtn) return;
    
    submitBtn.addEventListener('click', async () => {
        const amountInput = document.getElementById('rechargeAmount');
        const methodSelect = document.getElementById('rechargeMethod');
        const referenceInput = document.getElementById('rechargeReference');
        
        const amount = parseFloat(amountInput?.value || 0);
        const method = methodSelect?.value || 'pago_movil';
        const reference = referenceInput?.value?.trim() || '';
        
        if (!amount || amount < 5) {
            if (typeof showToast === 'function') showToast('Monto mínimo $5', 'error');
            return;
        }
        if (!reference) {
            if (typeof showToast === 'function') showToast('Ingresa el número de referencia', 'error');
            return;
        }
        
        try {
            const res = await fetch('/api/recargas/solicitar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ amount, method, reference })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                if (typeof showToast === 'function') showToast('Solicitud de recarga enviada correctamente', 'success');
                if (amountInput) amountInput.value = '';
                if (referenceInput) referenceInput.value = '';
            } else {
                if (typeof showToast === 'function') showToast(data.message || 'Error al solicitar recarga', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            if (typeof showToast === 'function') showToast('Error de conexión', 'error');
        }
    });
}

// ========== RANKING ==========
async function loadRankingGlobal() {
    const container = document.getElementById('rankingGlobalContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner">Cargando ranking global...</div>';
    
    try {
        const res = await fetch('/api/ranking/global');
        const response = await res.json();
        
        let ranking = [];
        if (response.data && Array.isArray(response.data)) {
            ranking = response.data;
        } else if (response.ranking && Array.isArray(response.ranking)) {
            ranking = response.ranking;
        } else if (Array.isArray(response)) {
            ranking = response;
        }
        
        console.log('Ranking global:', ranking.length);
        
        if (!ranking || ranking.length === 0) {
            container.innerHTML = '<div class="empty-state">Aún no hay datos de ranking. Las jornadas deben ser liquidadas primero.</div>';
            return;
        }
        
        let html = '<div class="ranking-table-wrapper"><table class="ranking-table"><thead><tr><th>Posición</th><th>Jugador</th><th>Puntos</th><th>Premios</th></tr></thead><tbody>';
        
        ranking.forEach((j, index) => {
            const posicion = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `#${index + 1}`));
            const puntos = Number(j.total_puntos || j.puntos || 0);
            const premios = Number(j.total_premios || j.premio || 0);
            
            html += `<tr>
                <td class="posicion">${posicion}</td>
                <td>${j.username || j.user_name || 'Anónimo'}</td>
                <td class="puntos">${puntos} pts</td
                <td class="premio">$${premios.toFixed(2)}</td
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loadRankingGlobal:', error);
        container.innerHTML = '<div class="empty-state error">Error al cargar ranking global</div>';
    }
}

async function loadJornadasParaRanking() {
    try {
        const res = await fetch('/api/jornadas', {
            headers: { 'x-auth-token': token }
        });
        const response = await res.json();
        const jornadas = response.data?.jornadas || response.jornadas || [];
        const select = document.getElementById('rankingJornadaSelect');
        
        if (select) {
            let options = '<option value="">Selecciona una jornada</option>';
            jornadas.forEach(j => { options += `<option value="${j.id}">${j.name}</option>`; });
            select.innerHTML = options;
            select.addEventListener('change', (e) => {
                if (e.target.value) {
                    loadRankingPorJornada(e.target.value);
                    loadMiPosicion(e.target.value);
                }
            });
        }
    } catch (error) { console.error('Error loadJornadasParaRanking:', error); }
}

async function loadRankingPorJornada(jornadaId) {
    const container = document.getElementById('rankingJornadaContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner">Cargando ranking...</div>';
    
    try {
        const res = await fetch(`/api/ranking/jornada/${jornadaId}`);
        const response = await res.json();
        const ranking = response.data || response.ranking || [];
        
        if (ranking.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay datos de ranking para esta jornada</div>';
            return;
        }
        
        let html = '<div class="ranking-table-wrapper"><table class="ranking-table"><thead><tr><th>Posición</th><th>Jugador</th><th>Puntos</th><th>Premio</th></tr></thead><tbody>';
        
        ranking.forEach((j, index) => {
            const posicion = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `#${index + 1}`));
            const premio = Number(j.premio || 0);
            
            html += `<tr>
                <td class="posicion">${posicion}</td>
                <td>${j.username}</td>
                <td class="puntos">${j.puntos} pts</td
                <td class="premio">$${premio.toFixed(2)}</td
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loadRankingPorJornada:', error);
        container.innerHTML = '<div class="empty-state error">Error al cargar ranking</div>';
    }
}

async function loadMiPosicion(jornadaId) {
    const container = document.getElementById('miPosicionContainer');
    if (!container) return;
    
    try {
        const res = await fetch(`/api/ranking/mi-posicion/${jornadaId}`, {
            headers: { 'x-auth-token': token }
        });
        const response = await res.json();
        const miPos = response.data || response;
        
        if (!miPos || miPos.puntos === 0 || miPos.posicion === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = `
            <div class="mi-posicion-card">
                <h3>🎯 Tu posición en esta jornada</h3>
                <div class="mi-posicion-stats">
                    <div class="stat"><span class="stat-label">Posición</span><span class="stat-value">#${miPos.posicion}</span></div>
                    <div class="stat"><span class="stat-label">Puntos</span><span class="stat-value highlight">${miPos.puntos} pts</span></div>
                    <div class="stat"><span class="stat-label">Premio</span><span class="stat-value">$${Number(miPos.premio || 0).toFixed(2)}</span></div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loadMiPosicion:', error);
        container.innerHTML = '';
    }
}

// ========== MODAL CONFIGURACIÓN ==========
function setupModals() {
    document.getElementById('confirmBetBtn')?.addEventListener('click', confirmBet);
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('modalOverlay')?.addEventListener('click', closeModal);
}