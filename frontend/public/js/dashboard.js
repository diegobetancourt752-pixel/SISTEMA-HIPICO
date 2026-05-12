// ========== DASHBOARD.JS ==========
import { API_BASE, WS_URL } from './config.js';

let socket = null;
let currentUser = null;
let currentJornada = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard iniciado');
    
    // Verificar autenticación
    const token = localStorage.getItem('pollaToken');
    const userStr = localStorage.getItem('pollaUser');
    
    if (!token || !userStr) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(userStr);
        document.getElementById('userName').textContent = currentUser.username;
        document.getElementById('userBalance').textContent = `$${currentUser.balance || 0}`;
        
        // Conectar WebSocket
        connectWebSocket(token);
        
        // Cargar datos iniciales
        await loadJornadas();
        await loadRanking();
        
        // Configurar eventos
        setupEventListeners();
        
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
    }
});

function connectWebSocket(token) {
    try {
        socket = io(WS_URL, {
            query: { token },
            transports: ['websocket', 'polling']
        });
        
        socket.on('connect', () => {
            console.log('✅ WebSocket conectado');
        });
        
        socket.on('nueva_jornada', (jornada) => {
            console.log('Nueva jornada disponible:', jornada);
            loadJornadas();
        });
        
        socket.on('resultados_actualizados', (data) => {
            console.log('Resultados actualizados:', data);
            loadRanking();
        });
        
        socket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
        
    } catch (error) {
        console.error('Error conectando WebSocket:', error);
    }
}

async function loadJornadas() {
    try {
        const response = await fetch(`${API_BASE}/jornadas/activas`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const jornadas = result.data;
            console.log('Jornadas cargadas:', jornadas.length);
            
            const container = document.getElementById('jornadasContainer');
            
            if (jornadas.length === 0) {
                container.innerHTML = '<p>No hay jornadas activas en este momento.</p>';
                return;
            }
            
            container.innerHTML = jornadas.map(jornada => `
                <div class="jornada-card" data-id="${jornada.id}">
                    <h3>${jornada.name}</h3>
                    <p>Cierre: ${new Date(jornada.closing_date).toLocaleString()}</p>
                    <p>Costo por ticket: $${jornada.ticket_cost}</p>
                    <p>Premio total: $${jornada.total_prize_pool}</p>
                    <button onclick="apostar(${jornada.id})">Apostar</button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error cargando jornadas:', error);
    }
}

async function loadRanking() {
    try {
        const response = await fetch(`${API_BASE}/ranking/global`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const ranking = result.data;
            const container = document.getElementById('rankingContainer');
            
            if (ranking.length === 0) {
                container.innerHTML = '<p>Aún no hay ranking disponible.</p>';
                return;
            }
            
            container.innerHTML = `
                <table>
                    <thead>
                        <tr><th>Posición</th><th>Usuario</th><th>Puntos</th><th>Premio</th></tr>
                    </thead>
                    <tbody>
                        ${ranking.map((user, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${user.username}</td>
                                <td>${user.total_puntos || 0}</td>
                                <td>$${user.total_premio || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Error cargando ranking:', error);
    }
}

window.apostar = async (jornadaId) => {
    // Implementar lógica de apuesta
    const numeros = prompt('Ingresa tus números separados por comas (ej: 1,3,5,7)');
    if (!numeros) return;
    
    try {
        const response = await fetch(`${API_BASE}/apuestas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('pollaToken')}`
            },
            body: JSON.stringify({
                jornada_id: jornadaId,
                selecciones: numeros.split(',').map(n => parseInt(n.trim()))
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('¡Apuesta registrada con éxito!');
            loadJornadas();
        } else {
            alert(result.message || 'Error al registrar apuesta');
        }
    } catch (error) {
        console.error('Error apostando:', error);
        alert('Error de conexión');
    }
};

function setupEventListeners() {
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
    
    document.getElementById('recargarBtn')?.addEventListener('click', () => {
        const monto = prompt('¿Cuánto deseas recargar?', '10');
        if (monto && !isNaN(monto)) {
            solicitarRecarga(parseFloat(monto));
        }
    });
}

async function solicitarRecarga(monto) {
    try {
        const response = await fetch(`${API_BASE}/recargar/solicitar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('pollaToken')}`
            },
            body: JSON.stringify({ monto })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Solicitud de recarga enviada. Espera confirmación del administrador.');
        } else {
            alert(result.message || 'Error al solicitar recarga');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
}
