const db = require('../config/db');

const create = async (userId, jornadaId, selections, cost, dbClient = db) => {
  // Convertir selections a JSON string (importante!)
  const selectionsJson = JSON.stringify(selections);
  
  const query = `
    INSERT INTO jugadas (user_id, jornada_id, selections, cost, status, prize, created_at)
    VALUES ($1, $2, $3, $4, 'active', 0, NOW())
    RETURNING id, user_id, jornada_id, selections, cost, status, prize, created_at
  `;
  const values = [userId, jornadaId, selectionsJson, cost];
  const { rows } = await dbClient.query(query, values);
  return rows[0];
};

const getByUser = async (userId) => {
  const query = `
    SELECT j.id, j.jornada_id, j.selections, j.cost, j.status, j.prize, j.created_at, 
           jo.name AS jornada_name
    FROM jugadas j
    JOIN jornadas jo ON jo.id = j.jornada_id
    WHERE j.user_id = $1
    ORDER BY j.created_at DESC
  `;
  const { rows } = await db.query(query, [userId]);
  return rows;
};

const getByJornada = async (jornadaId) => {
  const query = `
    SELECT j.id, j.user_id, j.selections, j.cost, j.status, j.prize, j.created_at, 
           u.username, u.email
    FROM jugadas j
    JOIN users u ON u.id = j.user_id
    WHERE j.jornada_id = $1
    ORDER BY j.created_at ASC
  `;
  const { rows } = await db.query(query, [jornadaId]);
  return rows;
};

const updateStatusAndPrize = async (jugadaId, status, prize, dbClient = db) => {
  const query = `
    UPDATE jugadas
    SET status = $2, prize = $3
    WHERE id = $1
    RETURNING id, user_id, jornada_id, selections, cost, status, prize, created_at
  `;
  const { rows } = await dbClient.query(query, [jugadaId, status, prize]);
  return rows[0];
};

module.exports = {
  create,
  getByUser,
  getByJornada,
  updateStatusAndPrize,
};