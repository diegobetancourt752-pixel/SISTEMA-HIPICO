// Cargar variables de entorno PRIMERO
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const jornadaRoutes = require('./routes/jornadaRoutes');
const jugadaRoutes = require('./routes/jugadaRoutes');
const recargaRoutes = require('./routes/recargaRoutes');
const adminRoutes = require('./routes/adminRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const auth = require('./middleware/auth');

// Importar conexión a BD
const db = require('./config/db');
// Inicializar Redis
const { initRedis } = require('./config/redis');
initRedis();

// Importar controlador de usuario
const userController = require('./controllers/userController');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware para pasar io a rutas
app.set('io', io);

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Servir archivos subidos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== RUTAS ==========
// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas (requieren autenticación)
app.use('/api/jornadas', auth, jornadaRoutes);
app.use('/api/jugadas', auth, jugadaRoutes);
app.use('/api/recargas', auth, recargaRoutes);
app.use('/api/admin', auth, adminRoutes);
app.use('/api/ranking', rankingRoutes);

// Ruta para obtener balance del usuario
app.get('/api/balance', auth, userController.getBalance);

// Ruta de prueba
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Ruta para verificar estado
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== WEBSOCKET ==========
io.on('connection', (socket) => {
  console.log('🟢 Usuario conectado:', socket.id);

  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`🔵 Usuario ${userId} se unió a la sala user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Usuario desconectado:', socket.id);
  });
});

// ========== INICIAR SERVIDOR ==========
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});