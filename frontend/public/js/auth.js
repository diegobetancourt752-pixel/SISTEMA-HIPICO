// ========== AUTH.JS ==========

document.addEventListener('DOMContentLoaded', () => {
    console.log('Auth.js cargado');

    const token = localStorage.getItem('pollaToken');
    const userStr = localStorage.getItem('pollaUser');
    
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
            return;
        } catch(e) {
            localStorage.clear();
        }
    }

    // Tabs
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            document.getElementById(`${target}Form`).classList.add('active');
        });
    });

    // Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();
        console.log('Respuesta login:', result);

        if (response.ok && result.success && result.data) {
            const { token, user } = result.data;
            
            localStorage.setItem('pollaToken', token);
            localStorage.setItem('pollaUser', JSON.stringify(user));
            
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            alert(result.message || 'Error al iniciar sesión');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor');
    }
});

// Registro
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const result = await response.json();
        console.log('Respuesta registro:', result);

        if (response.ok && result.success && result.data) {
            const { token, user } = result.data;
            
            localStorage.setItem('pollaToken', token);
            localStorage.setItem('pollaUser', JSON.stringify(user));
            
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            alert(result.message || 'Error al registrarse');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor');
    }
});