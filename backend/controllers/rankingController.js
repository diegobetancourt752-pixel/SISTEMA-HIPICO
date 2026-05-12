// ========== RANKING CONTROLLER ==========

const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responses');
const { getRankingGlobal, getRankingByJornada } = require('../services/rankingService');

// Obtener ranking global
const getRankingGlobalController = async (req, res) => {
    try {
        const ranking = await getRankingGlobal();
        return successResponse(res, ranking, 'Ranking global obtenido');
    } catch (error) {
        console.error('Error getRankingGlobal:', error);
        return errorResponse(res, 'Error al obtener ranking global', 500, error.message);
    }
};

// Obtener ranking por jornada
const getRanking = async (req, res) => {
    const { jornadaId } = req.params;
    try {
        const ranking = await getRankingByJornada(jornadaId);
        return successResponse(res, ranking, 'Ranking obtenido');
    } catch (error) {
        console.error('Error getRanking:', error);
        return errorResponse(res, 'Error al obtener ranking', 500, error.message);
    }
};

// Obtener mi posición
const getMiPosicion = async (req, res) => {
    if (!req.user || !req.user.id) {
        return errorResponse(res, 'Usuario no autenticado', 401);
    }
    
    const userId = req.user.id;
    const { jornadaId } = req.params;
    
    try {
        const query = `
            WITH ranking_cte AS (
                SELECT user_id, puntos, 
                       ROW_NUMBER() OVER (ORDER BY puntos DESC) as posicion
                FROM ranking
                WHERE jornada_id = $1
            )
            SELECT u.id, u.username, COALESCE(r.puntos, 0) as puntos,
                   COALESCE(r.premio, 0) as premio,
                   COALESCE(rc.posicion, 0) as posicion
            FROM users u
            LEFT JOIN ranking r ON r.user_id = u.id AND r.jornada_id = $1
            LEFT JOIN ranking_cte rc ON rc.user_id = u.id
            WHERE u.id = $2
        `;
        const result = await db.query(query, [jornadaId, userId]);
        const miPos = result.rows[0] || { puntos: 0, posicion: 0, premio: 0 };
        return successResponse(res, miPos, 'Mi posición');
    } catch (error) {
        console.error('Error getMiPosicion:', error);
        return errorResponse(res, 'Error al obtener posición', 500, error.message);
    }
};

module.exports = { getRankingGlobal: getRankingGlobalController, getRanking, getMiPosicion };