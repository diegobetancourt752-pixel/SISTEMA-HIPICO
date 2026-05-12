-- ========== TABLA RANKING ==========

CREATE TABLE IF NOT EXISTS ranking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    jornada_id INTEGER REFERENCES jornadas(id) ON DELETE CASCADE,
    puntos INTEGER DEFAULT 0,
    premio DECIMAL(10,2) DEFAULT 0,
    actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, jornada_id)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_ranking_jornada ON ranking(jornada_id);
CREATE INDEX IF NOT EXISTS idx_ranking_puntos ON ranking(puntos DESC);
CREATE INDEX IF NOT EXISTS idx_ranking_user ON ranking(user_id);
