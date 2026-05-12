require('dotenv').config();
const { Pool } = require('pg');

// Usar DATABASE_URL de Railway o construir desde variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL no está configurada');
    process.exit(1);
}

console.log('🔍 Conectando a PostgreSQL...');

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => {
    console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Error en PostgreSQL:', err.message);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};