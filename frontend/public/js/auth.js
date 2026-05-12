// ========== AUTH.JS ==========

document.addEventListener('DOMContentLoaded', () => {
  console.log('Auth.js cargado');

  // Verificar sesión existente
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

    console.log('1. Intentando login con:', email);

    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        console.log('2. Response status:', response.status);
        const result = await response.json();
        console.log('3. Resultado completo:', result);
        console.log('4. result.data:', result.data);
        console.log('5. result.data.token:', result.data?.token);
        console.log('6. result.data.user:', result.data?.user);

        if (response.ok && result.success && result.data) {
            const { token, user } = result.data;
            console.log('7. Token a guardar:', token);
            console.log('8. User a guardar:', user);
            
            localStorage.setItem('pollaToken', token);
            localStorage.setItem('pollaUser', JSON.stringify(user));
            
            console.log('9. Token guardado:', localStorage.getItem('pollaToken'));
            console.log('10. User guardado:', localStorage.getItem('pollaUser'));
            
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            console.log('11. Falló la condición:', { 
                responseOk: response.ok, 
                resultSuccess: result.success, 
                hasData: !!result.data 
            });
            document.getElementById('authMessage').textContent = result.message || 'Error al iniciar sesión';
        }
    } catch (error) {
        console.error('Error capturado:', error);
        document.getElementById('authMessage').textContent = 'Error de conexión con el servidor';
    }
});

  // Registro
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const result = await response.json();

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
        document.getElementById('authMessage').textContent = result.message || 'Error al registrarse';
      }
    } catch (error) {
      console.error('Error:', error);
      document.getElementById('authMessage').textContent = 'Error de conexión con el servidor';
    }
  });
});