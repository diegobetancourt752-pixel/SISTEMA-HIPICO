const redis = require('redis');

let redisClient = null;

async function initRedis() {
    try {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            console.warn('⚠️ REDIS_URL no configurada');
            return null;
        }
        
        redisClient = redis.createClient({ url: redisUrl });
        redisClient.on('connect', () => console.log('✅ Redis conectado'));
        redisClient.on('error', (err) => console.error('❌ Redis error:', err.message));
        await redisClient.connect();
        return redisClient;
    } catch (err) {
        console.warn('⚠️ Redis no disponible:', err.message);
        return null;
    }
}

function getRedisClient() { return redisClient; }

module.exports = { initRedis, getRedisClient };
