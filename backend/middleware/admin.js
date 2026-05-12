const { errorResponse } = require('../utils/responses');

const admin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return errorResponse(res, 'Acceso denegado. Requiere rol de administrador.', 403);
  }
  next();
};

module.exports = admin;
