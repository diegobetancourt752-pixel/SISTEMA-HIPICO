const express = require('express');
const { createJugada, getMyJugadas } = require('../controllers/jugadaController');

const router = express.Router();

router.post('/', createJugada);
router.get('/', getMyJugadas);
router.get('/mis-jugadas', getMyJugadas);

module.exports = router;
