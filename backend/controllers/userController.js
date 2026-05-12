// ========== USER CONTROLLER ==========

const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responses');

const getBalance = async (req, res) => {
    try {
        const result = await db.query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
        const balance = Number(result.rows[0]?.balance || 0);
        return successResponse(res, { balance }, 'Balance obtenido');
    } catch (error) {
        console.error('Error getBalance:', error);
        return errorResponse(res, 'Error al obtener balance', 500);
    }
};

module.exports = { getBalance };