// ========== AUTH MIDDLEWARE - Backend ==========

const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responses');

const authMiddleware = (req, res, next) => {
  // Obtener token del header
  const token = req.header('x-auth-token');

  // Verificar si no hay token
  if (!token) {
    return errorResponse(res, 'No token, autorización denegada', 401);
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Compatibilidad con diferentes formatos de token
    if (decoded.user) {
      req.user = decoded.user;
    } else if (decoded.id) {
      req.user = { id: decoded.id, role: decoded.role || 'user' };
    } else {
      req.user = decoded;
    }
    
    console.log('Usuario autenticado:', req.user.id, 'Rol:', req.user.role);
    next();
  } catch (err) {
    console.error('Error de autenticación:', err.message);
    return errorResponse(res, 'Token inválido o expirado', 401);
  }
};

module.exports = authMiddleware;