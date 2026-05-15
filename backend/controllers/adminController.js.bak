// ========== ADMIN CONTROLLER - COMPLETO ==========

const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responses');
const Jornada = require('../models/Jornada');
const Carrera = require('../models/Carrera');
const Jugada = require('../models/Jugada');
const Recarga = require('../models/Recarga');

// ========== CREAR JORNADA (con válidas y números) ==========
const createJornada = async (req, res) => {
  const { 
    name, 
    closing_date, 
    ticket_cost, 
    validas
  } = req.body;
  
  console.log('Debug createJornada payload:', { name, closing_date, ticket_cost, validas });
  
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    if (req.user.role !== 'admin') {
      return errorResponse(res, 'No autorizado', 403);
    }
    
    const jornadaResult = await client.query(
      `INSERT INTO jornadas (name, closing_date, ticket_cost, status) 
       VALUES ($1, $2, $3, 'open') 
       RETURNING *`,
      [name, closing_date, ticket_cost]
    );
    const jornada = jornadaResult.rows[0];
    
    for (let i = 0; i < validas.length; i++) {
      const valida = validas[i];
      const raceNumber = i + 1;
      
      console.log(`Creando válida ${raceNumber}:`, valida);
      
      const carreraResult = await client.query(
        `INSERT INTO carreras (jornada_id, race_number, name, cantidad_caballos) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [jornada.id, raceNumber, valida.nombre, valida.cantidad_caballos]
      );
      const carrera = carreraResult.rows[0];
      
      for (let num = 1; num <= valida.cantidad_caballos; num++) {
        const caballoNombre = `Caballo #${num}`;
        await client.query(
          `INSERT INTO participantes (carrera_id, numero, nombre_opcional, name) 
           VALUES ($1, $2, $3, $4)`,
          [carrera.id, num, caballoNombre, caballoNombre]
        );
      }
    }
    
    await client.query('COMMIT');
    successResponse(res, { jornada, validas }, 'Jornada creada exitosamente');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error createJornada:', err);
    errorResponse(res, 'Error al crear la jornada', 500, err.message);
  } finally {
    client.release();
  }
};

// ========== ABRIR JORNADA ==========
const openJornada = async (req, res) => {
  const { id } = req.params;

  try {
    const jornada = await Jornada.getById(id);
    if (!jornada) {
      return errorResponse(res, 'Jornada no encontrada', 404);
    }

    if (jornada.status !== 'upcoming' && jornada.status !== 'closed') {
      return errorResponse(res, 'Solo las jornadas próximas o cerradas pueden reabrirse', 400);
    }

    const updated = await Jornada.updateStatus(id, 'open');
    return successResponse(res, { jornada: updated }, 'Jornada abierta correctamente');
  } catch (error) {
    console.error('Error openJornada:', error);
    return errorResponse(res, 'No se pudo abrir la jornada', 500, error.message);
  }
};

// ========== CERRAR JORNADA ==========
const closeJornada = async (req, res) => {
  const { id } = req.params;

  try {
    const jornada = await Jornada.getById(id);
    if (!jornada) {
      return errorResponse(res, 'Jornada no encontrada', 404);
    }

    const updated = await Jornada.updateStatus(id, 'closed');
    return successResponse(res, { jornada: updated }, 'Jornada cerrada correctamente');
  } catch (error) {
    console.error('Error closeJornada:', error);
    return errorResponse(res, 'No se pudo cerrar la jornada', 500, error.message);
  }
};

// ========== CARGAR RESULTADOS ==========
const loadResultados = async (req, res) => {
  const { id } = req.params;
  const { resultados } = req.body;

  if (!Array.isArray(resultados) || !resultados.length) {
    return errorResponse(res, 'Se requieren resultados de las carreras', 400);
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const jornada = await Jornada.getById(id);
    if (!jornada) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Jornada no encontrada', 404);
    }

    if (jornada.status !== 'closed') {
      await client.query('ROLLBACK');
      return errorResponse(res, 'La jornada debe estar cerrada antes de cargar resultados', 400);
    }

    for (const resultado of resultados) {
      if (!resultado.carreraId || !resultado.winnerNumero) {
        await client.query('ROLLBACK');
        return errorResponse(res, 'Cada resultado debe incluir carreraId y winnerNumero', 400);
      }
      
      const participantResult = await client.query(
        `SELECT id FROM participantes 
         WHERE carrera_id = $1 AND numero = $2`,
        [resultado.carreraId, resultado.winnerNumero]
      );
      
      if (participantResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return errorResponse(res, `No se encontró caballo con número ${resultado.winnerNumero} en la carrera`, 400);
      }
      
      await client.query(
        `UPDATE carreras SET winner_participant_id = $1 WHERE id = $2`,
        [participantResult.rows[0].id, resultado.carreraId]
      );
    }

    await client.query('COMMIT');
    return successResponse(res, null, 'Resultados cargados correctamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error loadResultados:', error);
    return errorResponse(res, 'No se pudieron cargar los resultados', 500, error.message);
  } finally {
    client.release();
  }
};

// ========== LIQUIDAR JORNADA (con puntos por posición) ==========
const liquidarJornada = async (req, res) => {
  const { id } = req.params;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const jornada = await Jornada.getById(id);
    if (!jornada) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Jornada no encontrada', 404);
    }

    if (jornada.status !== 'closed') {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Solo las jornadas cerradas pueden liquidarse', 400);
    }

    const carreras = await Carrera.getByJornada(id);
    const ganadores = [];
    
    for (const carrera of carreras) {
      if (!carrera.winner_participant_id) {
        await client.query('ROLLBACK');
        return errorResponse(res, `La carrera ${carrera.name} no tiene ganador definido`, 400);
      }
      
      const winnerParticipant = await client.query(
        `SELECT numero FROM participantes WHERE id = $1`,
        [carrera.winner_participant_id]
      );
      
      ganadores.push({
        carreraId: carrera.id,
        numeroGanador: winnerParticipant.rows[0]?.numero
      });
    }

    const jugadas = await Jugada.getByJornada(id);
    const jugadasActivas = jugadas.filter(j => j.status === 'active');

    if (jugadasActivas.length === 0) {
      await client.query('COMMIT');
      return successResponse(res, { message: 'No hay jugadas activas para liquidar' }, 'No hay apuestas');
    }

    const resultados = jugadasActivas.map(jugada => {
      const selections = Array.isArray(jugada.selections) ? jugada.selections : [];
      let aciertos = 0;
      
      for (let i = 0; i < ganadores.length && i < selections.length; i++) {
        if (selections[i] === ganadores[i]?.numeroGanador) {
          aciertos++;
        }
      }
      
      return { ...jugada, aciertos };
    });

    // ========== PUNTOS POR POSICIÓN ==========
    const sorted = [...resultados].sort((a, b) => b.aciertos - a.aciertos);
    
    const puntosPorPosicion = [
      { posicion: 1, puntos: 5 },
      { posicion: 2, puntos: 3 },
      { posicion: 3, puntos: 1 }
    ];
    
    const puntosAsignados = [];
    let pos = 0;
    let puestoActual = 1;
    
    while (pos < sorted.length && puestoActual <= 3) {
      const mismoAcierto = sorted.filter(j => j.aciertos === sorted[pos].aciertos);
      const puntosGrupo = puntosPorPosicion[puestoActual - 1]?.puntos || 0;
      const puntosPorJugador = puntosGrupo / mismoAcierto.length;
      
      for (const jugada of mismoAcierto) {
        puntosAsignados.push({
          jugadaId: jugada.id,
          userId: jugada.user_id,
          puntos: puntosPorJugador,
          aciertos: jugada.aciertos
        });
        pos++;
      }
      puestoActual++;
    }
    
    for (const punto of puntosAsignados) {
      await client.query(
        `INSERT INTO ranking (user_id, jornada_id, puntos) 
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, jornada_id) 
         DO UPDATE SET puntos = ranking.puntos + EXCLUDED.puntos`,
        [punto.userId, id, punto.puntos]
      );
    }

    // ========== PREMIOS ==========
    const distribution = [0.60, 0.25, 0.15];
    const premios = [];
    
    pos = 0;
    let puesto = 0;
    
    while (pos < sorted.length && puesto < distribution.length) {
      const grupo = sorted.filter(j => j.aciertos === sorted[pos].aciertos);
      
      if (grupo.length > 0) {
        const share = distribution[puesto];
        const totalShare = share * (parseFloat(jornada.total_prize_pool) || 0);
        const prizePerParticipant = totalShare / grupo.length;
        
        for (const jugada of grupo) {
          premios.push({ jugadaId: jugada.id, prize: prizePerParticipant, aciertos: jugada.aciertos });
        }
        pos += grupo.length;
        puesto++;
      } else {
        break;
      }
    }

    const prizeMap = premios.reduce((map, p) => {
      map[p.jugadaId] = p.prize;
      return map;
    }, {});

    for (const premio of premios) {
      await client.query(
        `UPDATE ranking SET premio = COALESCE(premio, 0) + $1 
         WHERE user_id = (SELECT user_id FROM jugadas WHERE id = $2) AND jornada_id = $3`,
        [premio.prize, premio.jugadaId, id]
      );
    }

    for (const jugada of jugadasActivas) {
      const prize = prizeMap[jugada.id] || 0;
      const status = prize > 0 ? 'won' : 'lost';
      
      await Jugada.updateStatusAndPrize(jugada.id, status, prize, client);
      
      if (prize > 0) {
        await client.query(
          `UPDATE users SET balance = balance + $1 WHERE id = $2`,
          [prize, jugada.user_id]
        );
        
        await client.query(
          `INSERT INTO transacciones (user_id, type, amount, description) 
           VALUES ($1, 'prize', $2, $3)`,
          [jugada.user_id, prize, `Premio jornada ${jornada.name}`]
        );
      }
    }

    await Jornada.updateStatus(id, 'finished', client);
    await client.query('COMMIT');
    
    return successResponse(res, { 
      total_ganadores: premios.length, 
      pozo_total: jornada.total_prize_pool,
      ranking_actualizado: puntosAsignados.map(p => ({ user_id: p.userId, puntos: p.puntos, aciertos: p.aciertos }))
    }, 'Liquidación ejecutada correctamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error liquidarJornada:', error);
    return errorResponse(res, 'No se pudo liquidar la jornada', 500, error.message);
  } finally {
    client.release();
  }
};

// ========== OBTENER TODAS LAS JORNADAS ==========
const getAllJornadas = async (req, res) => {
  try {
    const jornadas = await Jornada.getAll();
    return successResponse(res, { jornadas }, 'Todas las jornadas cargadas');
  } catch (error) {
    console.error('Error getAllJornadas:', error);
    return errorResponse(res, 'No se pudieron cargar las jornadas', 500, error.message);
  }
};

// ========== RECARGAS PENDIENTES ==========
const getPendingReloads = async (req, res) => {
  try {
    const recargas = await Recarga.getPendientes();
    return successResponse(res, { recargas }, 'Recargas pendientes cargadas');
  } catch (error) {
    console.error('Error getPendingReloads:', error);
    return errorResponse(res, 'No se pudieron cargar las recargas pendientes', 500, error.message);
  }
};

// ========== APROBAR RECARGA (CON NOTIFICACIÓN WEBSOCKET) ==========
const approveRecarga = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    
    const recargaResult = await client.query(
      `SELECT user_id, amount, status FROM recargas_solicitudes WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const recarga = recargaResult.rows[0];

    if (!recarga) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Recarga no encontrada', 404);
    }

    if (recarga.status !== 'pending') {
      await client.query('ROLLBACK');
      return errorResponse(res, 'La recarga ya fue procesada', 400);
    }

    await Recarga.approve(id, comment || 'Aprobada por administrador', client);
    await client.query(
      `UPDATE users SET balance = balance + $1 WHERE id = $2`,
      [recarga.amount, recarga.user_id]
    );

    await client.query('COMMIT');
    
    // ========== NOTIFICAR AL USUARIO VÍA WEBSOCKET ==========
    const io = req.app.get('io');
    console.log(`✅ Notificando a user_${recarga.user_id} recarga de $${recarga.amount}`);
    io.to(`user_${recarga.user_id}`).emit('recarga_aprobada', { 
      amount: recarga.amount,
      nuevo_balance: recarga.amount
    });
    
    return successResponse(res, null, 'Recarga aprobada exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approveRecarga:', error);
    return errorResponse(res, 'No se pudo aprobar la recarga', 500, error.message);
  } finally {
    client.release();
  }
};

// ========== RECHAZAR RECARGA (CON NOTIFICACIÓN WEBSOCKET) ==========
const rejectRecarga = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  try {
    const recarga = await Recarga.reject(id, comment || 'Rechazada por administrador');
    if (!recarga) {
      return errorResponse(res, 'Recarga no encontrada', 404);
    }
    
    // Notificar al usuario
    const io = req.app.get('io');
    console.log(`❌ Notificando a user_${recarga.user_id} que su recarga fue rechazada`);
    io.to(`user_${recarga.user_id}`).emit('recarga_rechazada', { 
      amount: recarga.amount,
      message: 'Tu solicitud de recarga fue rechazada'
    });
    
    return successResponse(res, { recarga }, 'Recarga rechazada');
  } catch (error) {
    console.error('Error rejectRecarga:', error);
    return errorResponse(res, 'No se pudo rechazar la recarga', 500, error.message);
  }
};
// ========== ELIMINAR JORNADA ==========
const deleteJornada = async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    
    try {
        // Verificar si hay apuestas
        const apuestasResult = await client.query(
            'SELECT COUNT(*) FROM jugadas WHERE jornada_id = $1',
            [id]
        );
        
        if (parseInt(apuestasResult.rows[0].count) > 0) {
            return errorResponse(res, 'No se puede eliminar una jornada con apuestas', 400);
        }
        
        await client.query('BEGIN');
        await client.query('DELETE FROM carreras WHERE jornada_id = $1', [id]);
        await client.query('DELETE FROM jornadas WHERE id = $1', [id]);
        await client.query('COMMIT');
        
        return successResponse(res, null, 'Jornada eliminada correctamente');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleteJornada:', error);
        return errorResponse(res, 'Error al eliminar la jornada', 500, error.message);
    } finally {
        client.release();
    }
};

// ========== EXPORTAR ==========
module.exports = {
  createJornada,
  openJornada,
  closeJornada,
  loadResultados,
  liquidarJornada,
  getAllJornadas,
  getPendingReloads,
  approveRecarga,
  rejectRecarga,
  deleteJornada,
};