// ========== COMMON.JS - Funciones compartidas ==========

const API_BASE = '/api';

// Toast notifications
const showToast = (message, type = 'success') => {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
};

// Formatear balance
const formatBalance = (balance) => {
  const num = typeof balance === 'number' ? balance : Number(balance) || 0;
  return num.toFixed(2);
};

// Sesión
const saveSession = (token, user) => {
  localStorage.setItem('pollaToken', token);
  localStorage.setItem('pollaUser', JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem('pollaToken');
  localStorage.removeItem('pollaUser');
};

const getToken = () => localStorage.getItem('pollaToken');
const getUser = () => {
  const user = localStorage.getItem('pollaUser');
  return user ? JSON.parse(user) : null;
};

// API fetch
const apiFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['x-auth-token'] = token;

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
  
  if (response.status === 401) {
    clearSession();
    showToast('Sesión expirada', 'error');
    window.location.href = 'index.html';
    throw new Error('Unauthorized');
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error');
  return data;
};

// WebSocket
let socket = null;

const initSocket = () => {
  const token = getToken();
  if (!token) return;
  if (socket) socket.disconnect();
  
  socket = io(window.location.origin.replace('http', 'ws'), { query: { token } });
  
  socket.on('recarga_aprobada', (data) => {
    console.log('📥 Recarga recibida:', data);
    
    // Asegurar que amount sea número
    let amount = typeof data.amount === 'number' ? data.amount : Number(data.amount);
    
    if (isNaN(amount) || amount <= 0) {
      console.error('❌ Amount inválido:', data.amount);
      showToast('Error: Monto de recarga inválido', 'error');
      return;
    }
    
    const user = getUser();
    if (user) {
      // Asegurar que balance sea número (convertir si viene como string)
      let balanceActual = typeof user.balance === 'number' ? user.balance : Number(user.balance);
      if (isNaN(balanceActual)) balanceActual = 0;
      
      const nuevoBalance = balanceActual + amount;
      
      console.log(`💰 Balance anterior: ${balanceActual}, Suma: ${amount}, Nuevo: ${nuevoBalance}`);
      
      user.balance = nuevoBalance;
      localStorage.setItem('pollaUser', JSON.stringify(user));
      
      showToast(`Recarga de $${amount.toFixed(2)} aprobada. Nuevo balance: $${nuevoBalance.toFixed(2)}`, 'success');
      
      const balanceEl = document.getElementById('userBalance');
      if (balanceEl) {
        balanceEl.textContent = `$${formatBalance(user.balance)}`;
      }
    }
  });
  
  socket.on('connect', () => console.log('✅ WebSocket conectado'));
  socket.on('connect_error', (err) => console.error('❌ WebSocket error:', err.message));
};
