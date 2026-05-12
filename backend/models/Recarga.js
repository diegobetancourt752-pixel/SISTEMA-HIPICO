// ========== RECARGA MODEL - Backend ==========

const db = require('../config/db');

const createSolicitud = async (userId, amount, method, reference) => {
  const query = `
    INSERT INTO recargas_solicitudes (user_id, amount, metodo_pago, comprobante, status, created_at)
    VALUES ($1, $2, $3, $4, 'pending', NOW())
    RETURNING id, user_id, amount, metodo_pago AS method, comprobante AS comprobante_url, status, created_at
  `;
  const { rows } = await db.query(query, [userId, amount, method, reference]);
  return rows[0];
};

const updateComprobante = async (id, comprobanteUrl) => {
  const query = `
    UPDATE recargas_solicitudes
    SET comprobante = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id, comprobante AS comprobante_url
  `;
  const { rows } = await db.query(query, [id, comprobanteUrl]);
  return rows[0];
};

const getPendientes = async () => {
  const query = `
    SELECT r.id, r.user_id, u.username AS user_name, r.amount, r.metodo_pago AS method, 
           r.comprobante AS comprobante_url, r.status, r.created_at
    FROM recargas_solicitudes r
    JOIN users u ON u.id = r.user_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at ASC
  `;
  const { rows } = await db.query(query);
  return rows;
};

const getByUser = async (userId) => {
  const query = `
    SELECT id, user_id, amount, metodo_pago AS method, comprobante AS comprobante_url, 
           status, admin_comentario AS admin_comment, created_at, updated_at
    FROM recargas_solicitudes
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  const { rows } = await db.query(query, [userId]);
  return rows;
};

const approve = async (id, adminComment, dbClient = db) => {
  const query = `
    UPDATE recargas_solicitudes
    SET status = 'approved', admin_comentario = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id, user_id, amount, metodo_pago AS method, comprobante AS comprobante_url, 
              status, admin_comentario AS admin_comment, updated_at
  `;
  const { rows } = await dbClient.query(query, [id, adminComment]);
  return rows[0];
};

const reject = async (id, adminComment, dbClient = db) => {
  const query = `
    UPDATE recargas_solicitudes
    SET status = 'rejected', admin_comentario = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id, user_id, amount, metodo_pago AS method, comprobante AS comprobante_url, 
              status, admin_comentario AS admin_comment, updated_at
  `;
  const { rows } = await dbClient.query(query, [id, adminComment]);
  return rows[0];
};

module.exports = {
  createSolicitud,
  updateComprobante,
  getPendientes,
  getByUser,
  approve,
  reject,
};