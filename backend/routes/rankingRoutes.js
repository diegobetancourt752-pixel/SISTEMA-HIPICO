const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
    getRankingGlobal, 
    getRanking, 
    getMiPosicion, 
    getRankingWithSelections 
} = require('../controllers/rankingController');

// Rutas públicas
router.get('/global', getRankingGlobal);
router.get('/jornada/:jornadaId', getRanking);
router.get('/jornada/:jornadaId/con-selecciones', getRankingWithSelections);

// Rutas protegidas
router.get('/mi-posicion/:jornadaId', auth, getMiPosicion);

module.exports = router;
