// ========== RANKING SERVICE CON CACHÉ REDIS ==========

const db = require('../config/db');
const { getRedisClient } = require('../config/redis');

const CACHE_TTL = 60; // 60 segundos (1 minuto)

// Obtener ranking global
async function getRankingGlobal() {
    const redisClient = getRedisClient();
    const cacheKey = 'ranking:global';
    
    // Intentar obtener desde Redis
    if (redisClient && redisClient.isReady) {
        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                console.log('📦 Ranking global desde caché');
                return JSON.parse(cached);
            }
        } catch (err) {
            console.error('Redis error:', err.message);
        }
    }
    
    console.log('📊 Consultando ranking global desde BD');
    
    // Consultar base de datos
    const query = `
        SELECT u.id, u.username, 
               COALESCE(SUM(r.puntos), 0) as total_puntos,
               COALESCE(SUM(r.premio), 0) as total_premios,
               ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(r.puntos), 0) DESC) as posicion
        FROM users u
        LEFT JOIN ranking r ON r.user_id = u.id
        WHERE u.role = 'user'
        GROUP BY u.id, u.username
        ORDER BY total_puntos DESC
        LIMIT 50
    `;
    
    const result = await db.query(query);
    const ranking = result.rows;
    
    // Guardar en Redis
    if (redisClient && redisClient.isReady) {
        try {
            await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(ranking));
        } catch (err) {
            console.error('Redis set error:', err.message);
        }
    }
    
    return ranking;
}

// Obtener ranking por jornada
async function getRankingByJornada(jornadaId) {
    const redisClient = getRedisClient();
    const cacheKey = `ranking:jornada:${jornadaId}`;
    
    if (redisClient && redisClient.isReady) {
        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                console.log(`📦 Ranking jornada ${jornadaId} desde caché`);
                return JSON.parse(cached);
            }
        } catch (err) {
            console.error('Redis error:', err.message);
        }
    }
    
    console.log(`📊 Consultando ranking jornada ${jornadaId} desde BD`);
    
    const query = `
        SELECT u.id, u.username, COALESCE(r.puntos, 0) as puntos,
               COALESCE(r.premio, 0) as premio,
               ROW_NUMBER() OVER (ORDER BY COALESCE(r.puntos, 0) DESC) as posicion
        FROM users u
        LEFT JOIN ranking r ON r.user_id = u.id AND r.jornada_id = $1
        WHERE u.role = 'user'
        ORDER BY puntos DESC
        LIMIT 50
    `;
    
    const result = await db.query(query, [jornadaId]);
    const ranking = result.rows;
    
    if (redisClient && redisClient.isReady) {
        try {
            await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(ranking));
        } catch (err) {
            console.error('Redis set error:', err.message);
        }
    }
    
    return ranking;
}

// Invalidar caché
async function invalidateRankingCache(jornadaId = null) {
    const redisClient = getRedisClient();
    if (!redisClient || !redisClient.isReady) return;
    
    try {
        await redisClient.del('ranking:global');
        if (jornadaId) {
            await redisClient.del(`ranking:jornada:${jornadaId}`);
        }
        console.log('🗑️ Caché de ranking invalidada');
    } catch (err) {
        console.error('Redis invalidate error:', err.message);
    }
}

module.exports = { getRankingGlobal, getRankingByJornada, invalidateRankingCache };
