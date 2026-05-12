// ========== APP.JS - Aplicación principal ==========

let state = { selectedJornada: null, currentSelections: {} };

// Elementos DOM
const elements = {
  authPage: document.getElementById('authPage'),
  dashboardPage: document.getElementById('dashboardPage'),
  jornadasContainer: document.getElementById('jornadasContainer'),
  historialContainer: document.getElementById('historialContainer'),
  userBalance: document.getElementById('userBalance'),
  userInitials: document.getElementById('userInitials'),
  userMenuBtn: document.getElementById('userMenuBtn'),
  userDropdown: document.getElementById('userDropdown'),
  logoutBtn: document.getElementById('logoutBtn'),
  modalOverlay: document.getElementById('modalOverlay'),
  jornadaModal: document.getElementById('jornadaModal'),
  modalTitle: document.getElementById('modalTitle'),
  modalJornadaInfo: document.getElementById('modalJornadaInfo'),
  modalValidasContainer: document.getElementById('modalValidasContainer'),
  modalTotalCost: document.getElementById('modalTotalCost'),
  confirmBetModalBtn: document.getElementById('confirmBetModalBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  submitRechargeBtn: document.getElementById('submitRechargeBtn'),
  rechargeAmount: document.getElementById('rechargeAmount'),
  rechargeMethod: document.getElementById('rechargeMethod'),
  rechargeReference: document.getElementById('rechargeReference'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  authMessage: document.getElementById('authMessage')
};

// Mostrar dashboard
const showDashboard = () => {
  if (elements.authPage) elements.authPage.style.display = 'none';
  if (elements.dashboardPage) elements.dashboardPage.style.display = 'block';
  const user = getUser();
  if (user) {
    if (elements.userInitials) elements.userInitials.textContent = user.username?.charAt(0).toUpperCase() || 'U';
    updateUserBalance();
  }
  loadJornadas();
  loadHistorial();
  setupUserMenu();
  setupNavigation();
  initSocket();
};

// Mostrar login
const showAuth = () => {
  if (elements.authPage) elements.authPage.style.display = 'flex';
  if (elements.dashboardPage) elements.dashboardPage.style.display = 'none';
};

const updateUserBalance = () => {
  const user = getUser();
  if (elements.userBalance && user) {
    elements.userBalance.textContent = `$${formatBalance(user.balance)}`;
  }
};

// Jornadas
const loadJornadas = async () => {
  if (!elements.jornadasContainer) return;
  elements.jornadasContainer.innerHTML = '<div class="loading-spinner">Cargando jornadas...</div>';
  try {
    const data = await apiFetch('/jornadas');
    const jornadas = data.jornadas || data.data?.jornadas || [];
    if (jornadas.length === 0) {
      elements.jornadasContainer.innerHTML = '<div class="empty-state">No hay jornadas activas.</div>';
      return;
    }
    elements.jornadasContainer.innerHTML = jornadas.map(j => renderJornadaCard(j)).join('');
    jornadas.forEach(j => {
      const card = document.getElementById(`jornada-card-${j.id}`);
      if (card) card.addEventListener('click', () => openJornadaModal(j));
    });
  } catch (error) {
    elements.jornadasContainer.innerHTML = '<div class="empty-state error">Error al cargar jornadas</div>';
  }
};

const renderJornadaCard = (j) => `
  <div class="jornada-card" id="jornada-card-${j.id}">
    <div class="jornada-card-header">
      <h3>${j.name}</h3>
      <span class="status-badge status-open">Abierta</span>
    </div>
    <div class="jornada-card-stats">
      <div class="stat"><span class="stat-label">Precio</span><span class="stat-value">$${j.cost_per_bet || j.ticket_cost}</span></div>
      <div class="stat"><span class="stat-label">Pozo</span><span class="stat-value highlight">$${formatBalance(j.total_prize_pool || j.pot || 0)}</span></div>
    </div>
    <div class="jornada-card-footer"><span>Click para apostar</span></div>
  </div>
`;

// Modal
const openJornadaModal = async (jornada) => {
  state.selectedJornada = jornada;
  state.currentSelections = {};
  try {
    const data = await apiFetch(`/jornadas/${jornada.id}`);
    const detalle = data.data || data;
    const carreras = detalle.carreras || detalle.races || [];
    if (elements.modalTitle) elements.modalTitle.textContent = jornada.name;
    if (elements.modalTotalCost) elements.modalTotalCost.textContent = jornada.cost_per_bet || jornada.ticket_cost;
    if (elements.modalJornadaInfo) {
      elements.modalJornadaInfo.innerHTML = `<div class="modal-jornada-info-row"><span class="modal-jornada-label">Cierre</span><span class="modal-jornada-value">${new Date(jornada.close_date || jornada.closing_date).toLocaleString()}</span></div>
      <div class="modal-jornada-info-row"><span class="modal-jornada-label">Costo</span><span class="modal-jornada-value highlight">$${jornada.cost_per_bet || jornada.ticket_cost}</span></div>`;
    }
    if (elements.modalValidasContainer) {
      elements.modalValidasContainer.innerHTML = '';
      carreras.forEach((carrera, idx) => {
        const numbers = Array.from({ length: carrera.cantidad_caballos || 6 }, (_, i) => i + 1);
        const div = document.createElement('div');
        div.className = 'valida-seleccion';
        div.innerHTML = `<h4>${carrera.name} (Válida ${idx + 1})</h4><div class="numbers-grid">${numbers.map(n => `<button class="number-btn" data-numero="${n}">${n}</button>`).join('')}</div>`;
        div.querySelectorAll('.number-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            div.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.currentSelections[carrera.id] = parseInt(btn.dataset.numero);
          });
        });
        elements.modalValidasContainer.appendChild(div);
      });
    }
    if (elements.jornadaModal) elements.jornadaModal.classList.remove('hidden');
    if (elements.modalOverlay) elements.modalOverlay.classList.remove('hidden');
  } catch (error) {
    showToast('Error al cargar detalles', 'error');
  }
};

const closeModal = () => {
  if (elements.jornadaModal) elements.jornadaModal.classList.add('hidden');
  if (elements.modalOverlay) elements.modalOverlay.classList.add('hidden');
  state.selectedJornada = null;
  state.currentSelections = {};
};

const confirmBet = async () => {
  const validasDivs = document.querySelectorAll('#modalValidasContainer .valida-seleccion');
  const selections = [];
  for (const div of validasDivs) {
    const selected = div.querySelector('.number-btn.selected');
    if (!selected) { showToast('Selecciona un número para cada válida', 'error'); return; }
    selections.push(parseInt(selected.dataset.numero));
  }
  try {
    await apiFetch('/jugadas', { method: 'POST', body: JSON.stringify({ jornadaId: state.selectedJornada.id, selections }) });
    showToast('Apuesta realizada con éxito', 'success');
    closeModal();
    const user = getUser();
    if (user) { const balanceData = await apiFetch('/balance'); user.balance = balanceData.balance; saveSession(getToken(), user); updateUserBalance(); }
    loadJornadas();
    loadHistorial();
  } catch (error) { showToast(error.message, 'error'); }
};

// Historial
const loadHistorial = async () => {
  if (!elements.historialContainer) return;
  elements.historialContainer.innerHTML = '<div class="loading-spinner">Cargando historial...</div>';
  try {
    const data = await apiFetch('/jugadas/mis-jugadas');
    const jugadas = data.jugadas || data.data?.jugadas || [];
    if (jugadas.length === 0) { elements.historialContainer.innerHTML = '<div class="empty-state">No hay jugadas registradas</div>'; return; }
    elements.historialContainer.innerHTML = `<div class="historial-table-container"><table class="historial-table"><thead><tr><th>Jornada</th><th>Selecciones</th><th>Costo</th><th>Estado</th><th>Premio</th><th>Fecha</th></tr></thead><tbody>${jugadas.map(j => `<tr><td>${j.jornada_name || '-'}</td><td class="selections-cell">${j.selections?.join(' - ') || '-'}</td><td>$${formatBalance(j.cost)}</td><td><span class="${j.status === 'won' ? 'status-won' : (j.status === 'lost' ? 'status-lost' : 'status-pending')}">${j.status === 'won' ? 'Ganó' : (j.status === 'lost' ? 'Perdió' : 'Pendiente')}</span></td><td class="prize-cell">${j.prize ? `$${formatBalance(j.prize)}` : '-'}</td><td>${new Date(j.created_at).toLocaleString()}</td></tr>`).join('')}</tbody></table></div>`;
  } catch (error) { elements.historialContainer.innerHTML = '<div class="empty-state error">Error al cargar historial</div>'; }
};

// Recarga
const submitRecharge = async () => {
  const amount = parseFloat(elements.rechargeAmount?.value || 0);
  const metodo_pago = elements.rechargeMethod?.value || 'pago_movil';
  const comprobante = elements.rechargeReference?.value?.trim() || '';
  if (!amount || amount < 5) return showToast('Monto mínimo $5', 'error');
  if (!comprobante) return showToast('Ingresa el comprobante', 'error');
  try {
    await apiFetch('/recargas/solicitar', { method: 'POST', body: JSON.stringify({ amount, metodo_pago, comprobante }) });
    showToast('Solicitud enviada', 'success');
    if (elements.rechargeAmount) elements.rechargeAmount.value = '';
    if (elements.rechargeReference) elements.rechargeReference.value = '';
  } catch (error) { showToast(error.message, 'error'); }
};

// Navegación
const setupNavigation = () => {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const page = link.dataset.page;
      if (!page) return;
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const pageEl = document.getElementById(`${page}-page`);
      if (pageEl) pageEl.classList.add('active');
      if (page === 'jornadas') loadJornadas();
      if (page === 'mis-jugadas') loadHistorial();
    });
  });
};

const setupUserMenu = () => {
  if (!elements.userMenuBtn) return;
  const user = getUser();
  if (elements.userInitials) elements.userInitials.textContent = user?.username?.charAt(0).toUpperCase() || 'U';
  elements.userMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); elements.userDropdown?.classList.toggle('show'); });
  document.addEventListener('click', () => elements.userDropdown?.classList.remove('show'));
  if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', () => { clearSession(); showAuth(); });
};

// Autenticación
const handleLogin = async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail')?.value;
  const password = document.getElementById('loginPassword')?.value;
  if (!email || !password) return showToast('Completa todos los campos', 'error');
  try {
    const data = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => r.json());
    if (data.token) {
      saveSession(data.token, data.user);
      showToast('Login exitoso', 'success');
      showDashboard();
    } else { showToast(data.message || 'Error', 'error'); }
  } catch (error) { showToast('Error de conexión', 'error'); }
};

const handleRegister = async (e) => {
  e.preventDefault();
  const username = document.getElementById('registerUsername')?.value;
  const email = document.getElementById('registerEmail')?.value;
  const password = document.getElementById('registerPassword')?.value;
  if (!username || !email || !password) return showToast('Completa todos los campos', 'error');
  try {
    const data = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    }).then(r => r.json());
    if (data.token) {
      saveSession(data.token, data.user);
      showToast('Registro exitoso', 'success');
      showDashboard();
    } else { showToast(data.message || 'Error', 'error'); }
  } catch (error) { showToast('Error de conexión', 'error'); }
};

// Tabs de autenticación
const setupAuthTabs = () => {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      document.getElementById(`${target}Form`).classList.add('active');
    });
  });
};

// Inicializar
const init = () => {
  setupAuthTabs();
  if (elements.loginForm) elements.loginForm.addEventListener('submit', handleLogin);
  if (elements.registerForm) elements.registerForm.addEventListener('submit', handleRegister);
  if (elements.submitRechargeBtn) elements.submitRechargeBtn.addEventListener('click', submitRecharge);
  if (elements.confirmBetModalBtn) elements.confirmBetModalBtn.addEventListener('click', confirmBet);
  if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', closeModal);
  if (elements.cancelModalBtn) elements.cancelModalBtn.addEventListener('click', closeModal);
  if (elements.modalOverlay) elements.modalOverlay.addEventListener('click', closeModal);
  
  if (getToken() && getUser()) { showDashboard(); }
  else { showAuth(); }
};

document.addEventListener('DOMContentLoaded', init);