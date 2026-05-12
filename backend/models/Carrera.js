const db = require('../config/db');

const Carrera = {
  // Crear carrera con cantidad de caballos
  async create(jornadaId, raceNumber, name, cantidadCaballos = 6) {
    const result = await db.query(
      `INSERT INTO carreras (jornada_id, race_number, name, cantidad_caballos) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [jornadaId, raceNumber, name, cantidadCaballos]
    );
    return result.rows[0];
  },

  // Agregar participante con número
  async addParticipante(carreraId, numero, nombreOpcional = null) {
    const result = await db.query(
      `INSERT INTO participantes (carrera_id, numero, nombre_opcional) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [carreraId, numero, nombreOpcional]
    );
    return result.rows[0];
  },

  // Generar caballos automáticamente (números 1..cantidad)
  async generarCaballos(carreraId, cantidad) {
    for (let i = 1; i <= cantidad; i++) {
      await db.query(
        `INSERT INTO participantes (carrera_id, numero, nombre_opcional) 
         VALUES ($1, $2, $3)`,
        [carreraId, i, `Caballo #${i}`]
      );
    }
    return true;
  },
// Obtener participantes por carrera
async getParticipantes(carreraId) {
  const result = await db.query(
    `SELECT id, numero, nombre_opcional 
     FROM participantes 
     WHERE carrera_id = $1 
     ORDER BY numero`,
    [carreraId]
  );
  return result.rows;
},

  // Obtener todas las carreras de una jornada
  async getByJornada(jornadaId) {
    const result = await db.query(
      `SELECT * FROM carreras 
       WHERE jornada_id = $1 
       ORDER BY race_number`,
      [jornadaId]
    );
    
    // Para cada carrera, obtener sus participantes
    for (let carrera of result.rows) {
      carrera.participantes = await this.getParticipantes(carrera.id);
    }
    
    return result.rows;
  },

  // Establecer ganador por número
  async setWinner(carreraId, numeroGanador) {
    // Primero obtener el participant_id por número
    const participant = await db.query(
      `SELECT id FROM participantes 
       WHERE carrera_id = $1 AND numero = $2`,
      [carreraId, numeroGanador]
    );
    
    if (participant.rows.length === 0) {
      throw new Error(`No existe caballo con número ${numeroGanador} en esta carrera`);
    }
    
    const result = await db.query(
      `UPDATE carreras SET winner_participant_id = $1 
       WHERE id = $2 
       RETURNING *`,
      [participant.rows[0].id, carreraId]
    );
    return result.rows[0];
  }
};

module.exports = Carrera;