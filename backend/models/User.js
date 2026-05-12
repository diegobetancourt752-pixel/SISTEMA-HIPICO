const db = require('../config/db');

const User = {
  async findUserByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findUserByUsername(username) {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  },

  async createUser(username, email, passwordHash) {
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, role, balance',
      [username, email, passwordHash]
    );
    return result.rows[0];
  },

  async updateBalance(userId, amount) {
    const result = await db.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
      [amount, userId]
    );
    return result.rows[0]?.balance;
  },
};

module.exports = User;
