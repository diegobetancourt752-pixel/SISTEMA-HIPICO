const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responses');
const Jugada = require('../models/Jugada');
const Jornada = require('../models/Jornada');
const createJugada = async (req, res) => {
  const userId = req.user.id;
  const { jornada_id, jornadaId, selections } = req.body;
  const finalJornadaId = jornada_id || jornadaId;
  
  console.log('========== CREATE JUGADA ==========');
  console.log('userId:', userId);
  console.log('finalJornadaId:', finalJornadaId);
  console.log('selections:', selections);
  
  if (!finalJornadaId || !Array.isArray(selections) || !selections.length) {
    return errorResponse(res, 'Datos de apuesta incompletos', 400);
  }
  
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Obtener jornada - USAR ticket_cost
    const jornadaResult = await client.query(
      `SELECT id, ticket_cost, status FROM jornadas WHERE id = $1 FOR UPDATE`,
      [finalJornadaId]
    );
    const jornada = jornadaResult.rows[0];
    console.log('Jornada:', jornada);
    
    if (!jornada) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Jornada no encontrada', 404);
    }
    
    if (jornada.status !== 'open') {
      await client.query('ROLLBACK');
      return errorResponse(res, 'La jornada no está abierta para apuestas', 400);
    }
    
    const costo = Number(jornada.ticket_cost);
    console.log('Costo de la apuesta:', costo);
    
    const userResult = await client.query(
      `SELECT id, balance FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    const user = userResult.rows[0];
    console.log('Usuario balance:', user?.balance);
    
    if (!user || Number(user.balance) < costo) {
      await client.query('ROLLBACK');
      console.log(`Saldo insuficiente: ${user?.balance} < ${costo}`);
      return errorResponse(res, 'Saldo insuficiente para realizar la apuesta', 400);
    }
    
    // Crear jugada
    const jugada = await Jugada.create(userId, finalJornadaId, selections, costo, client);
    
    // Actualizar saldo del usuario
    await client.query(
      `UPDATE users SET balance = balance - $1 WHERE id = $2`,
      [costo, userId]
    );
    
    // Actualizar pozo de la jornada
    await client.query(
      `UPDATE jornadas SET total_prize_pool = COALESCE(total_prize_pool, 0) + $1 WHERE id = $2`,
      [costo, finalJornadaId]
    );
    
    // Registrar transacción
    await client.query(
      `INSERT INTO transacciones (user_id, type, amount, description) 
       VALUES ($1, 'bet', $2, $3)`,
      [userId, -costo, `Apuesta en jornada ${finalJornadaId}`]
    );
    
    await client.query('COMMIT');
    
    // Obtener el nuevo balance
    const newBalanceResult = await client.query(
      `SELECT balance FROM users WHERE id = $1`,
      [userId]
    );
    const newBalance = Number(newBalanceResult.rows[0]?.balance || 0);
    
    console.log('Apuesta exitosa. Nuevo balance:', newBalance);
    
    return successResponse(res, { 
      jugada, 
      newBalance,
      message: 'Apuesta realizada correctamente'
    }, 'Jugada creada correctamente', 201);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error createJugada:', error);
    return errorResponse(res, 'No se pudo crear la jugada', 500, error.message);
  } finally {
    client.release();
  }
};

const getMyJugadas = async (req, res) => {
  if (!req.user || !req.user.id) {
    return errorResponse(res, 'Usuario no autenticado', 401);
  }
  
  try {
    const jugadas = await Jugada.getByUser(req.user.id);
    return successResponse(res, { jugadas }, 'Mis jugadas cargadas');
  } catch (error) {
    console.error('Error getMyJugadas:', error);
    return errorResponse(res, 'No se pudieron cargar tus jugadas', 500, error.message);
  }
};

module.exports = { createJugada, getMyJugadas };