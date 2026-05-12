// ========== RANKING ROUTES ==========

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getRanking, getMiPosicion, getRankingGlobal } = require('../controllers/rankingController');

// Rutas públicas
router.get('/jornada/:jornadaId', getRanking);
router.get('/global', getRankingGlobal);

// Rutas protegidas
router.get('/mi-posicion/:jornadaId', auth, getMiPosicion);

module.exports = router;