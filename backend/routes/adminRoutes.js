const express = require('express');
const admin = require('../middleware/admin');
const {
  createJornada,
  openJornada,        // ← AGREGADO
  closeJornada,
  loadResultados,
  liquidarJornada,
  getAllJornadas,
  getPendingReloads,
  approveRecarga,
  rejectRecarga,
  deleteJornada,
} = require('../controllers/adminController');

const router = express.Router();

// Todas las rutas requieren autenticación y rol admin
router.use(admin);

// ========== RUTAS DE JORNADAS ==========
router.post('/jornadas', createJornada);           // Crear jornada
router.get('/jornadas', getAllJornadas);            // Obtener todas las jornadas
router.put('/jornadas/:id/open', openJornada);      // ← AGREGADO: Abrir jornada
router.put('/jornadas/:id/close', closeJornada);    // Cerrar jornada
router.post('/jornadas/:id/resultados', loadResultados);  // Cargar resultados
router.post('/jornadas/:id/liquidar', liquidarJornada);   // Liquidar jornada
router.delete('/jornadas/:id', admin, deleteJornada);

// ========== RUTAS DE RECARGAS ==========
router.get('/recargas/pendientes', getPendingReloads);     // Obtener recargas pendientes
router.post('/recargas/:id/aprobar', approveRecarga);      // Aprobar recarga
router.post('/recargas/:id/rechazar', rejectRecarga);      // Rechazar recarga

module.exports = router;