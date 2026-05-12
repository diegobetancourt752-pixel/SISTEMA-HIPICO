const express = require('express');
const {
  solicitarRecarga,
  subirComprobante,
  misSolicitudes,
  getPendientes,
  approveRecarga,
  rejectRecarga,
} = require('../controllers/recargaController');
const admin = require('../middleware/admin');

const router = express.Router();

router.post('/solicitar', solicitarRecarga);
router.post('/', solicitarRecarga);
router.post('/:id/comprobante', subirComprobante);
router.get('/mis-solicitudes', misSolicitudes);
router.get('/pending', getPendientes);

router.post('/:id/aprobar', admin, approveRecarga);
router.post('/:id/rechazar', admin, rejectRecarga);

module.exports = router;
