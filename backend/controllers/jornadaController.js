const { successResponse, errorResponse } = require('../utils/responses');
const Jornada = require('../models/Jornada');
const Carrera = require('../models/Carrera');

const getActive = async (req, res) => {
  try {
    const jornadas = await Jornada.getActive();
    return successResponse(res, { jornadas }, 'Jornadas activas cargadas');
  } catch (error) {
    console.error('Error getActive:', error);
    return errorResponse(res, 'No se pudieron obtener las jornadas activas', 500, error.message);
  }
};

const getById = async (req, res) => {
  const { id } = req.params;

  try {
    const jornada = await Jornada.getById(id);
    if (!jornada) {
      return errorResponse(res, 'Jornada no encontrada', 404);
    }

    // Obtener carreras de la jornada
    const carreras = await Carrera.getByJornada(id);
    
    // Para cada carrera, obtener sus participantes (caballos)
    const carrerasConParticipantes = await Promise.all(
      carreras.map(async (carrera) => {
        const participantes = await Carrera.getParticipantes(carrera.id);
        return {
          id: carrera.id,
          race_number: carrera.race_number,
          name: carrera.name,
          cantidad_caballos: carrera.cantidad_caballos,
          winner_participant_id: carrera.winner_participant_id,
          participantes: participantes.map(p => ({
            id: p.id,
            numero: p.numero,
            nombre: p.nombre_opcional || `Caballo #${p.numero}`
          }))
        };
      })
    );

    const responseData = {
      id: jornada.id,
      name: jornada.name,
      closing_date: jornada.closing_date,
      close_date: jornada.closing_date,  // alias para compatibilidad
      ticket_cost: jornada.ticket_cost,
      cost_per_bet: jornada.ticket_cost,  // alias para compatibilidad
      status: jornada.status,
      total_prize_pool: jornada.total_prize_pool,
      carreras: carrerasConParticipantes,
      races: carrerasConParticipantes  // alias para compatibilidad
    };

    return successResponse(res, responseData, 'Detalle de jornada cargado');
  } catch (error) {
    console.error('Error getById:', error);
    return errorResponse(res, 'No se pudo obtener la jornada', 500, error.message);
  }
};

module.exports = {
  getActive,
  getById
};