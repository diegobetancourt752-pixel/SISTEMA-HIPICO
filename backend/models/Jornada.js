const db = require('../config/db');

const getActive = async () => {
  const query = `
    SELECT id, name, closing_date AS close_date, ticket_cost AS cost_per_bet,
           total_prize_pool AS pot, status
    FROM jornadas
    WHERE status = 'open'
    ORDER BY closing_date ASC
  `;
  const { rows } = await db.query(query);
  return rows;
};

const getById = async (id) => {
  const query = `
    SELECT id, name, closing_date AS close_date, ticket_cost AS cost_per_bet,
           total_prize_pool AS pot, status, created_at
    FROM jornadas
    WHERE id = $1
  `;
  const { rows } = await db.query(query, [id]);
  return rows[0];
};

const create = async ({ name, closing_date, ticket_cost, status = 'upcoming' }, dbClient = db) => {
  const query = `
    INSERT INTO jornadas (name, closing_date, ticket_cost, total_prize_pool, status, created_at)
    VALUES ($1, $2, $3, 0, $4, NOW())
    RETURNING id, name, closing_date AS close_date,
              ticket_cost AS cost_per_bet,
              total_prize_pool AS pot,
              status,
              created_at
  `;
  const values = [name, closing_date, ticket_cost, status];
  const { rows } = await dbClient.query(query, values);
  return rows[0];
};

const updateStatus = async (id, status, dbClient = db) => {
  const query = `
    UPDATE jornadas
    SET status = $2
    WHERE id = $1
    RETURNING id, name, closing_date AS close_date,
              ticket_cost AS cost_per_bet,
              total_prize_pool AS pot,
              status,
              created_at
  `;
  const { rows } = await dbClient.query(query, [id, status]);
  return rows[0];
};

const addToPrizePool = async (id, amount, dbClient = db) => {
  const query = `
    UPDATE jornadas
    SET total_prize_pool = COALESCE(total_prize_pool, 0) + $2
    WHERE id = $1
    RETURNING id, total_prize_pool AS pot
  `;
  const { rows } = await dbClient.query(query, [id, amount]);
  return rows[0];
};

const getAll = async () => {
  const query = `
    SELECT id, name, closing_date AS close_date, ticket_cost AS cost_per_bet,
           total_prize_pool AS pot, status, created_at
    FROM jornadas
    ORDER BY created_at DESC
  `;
  const { rows } = await db.query(query);
  return rows;
};

module.exports = {
  getActive,
  getById,
  create,
  updateStatus,
  addToPrizePool,
  getAll,
};
