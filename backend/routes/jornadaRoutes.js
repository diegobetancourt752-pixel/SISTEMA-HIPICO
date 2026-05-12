const express = require('express');
const { getActive, getById } = require('../controllers/jornadaController');
const auth = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(auth);

router.get('/', getActive);
router.get('/active', getActive);
router.get('/:id', getById);
router.get('/:id/detalles', getById);  // alias para compatibilidad

module.exports = router;