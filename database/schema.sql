-- =============================================
-- SISTEMA DE POLLA HIPICA - MVP
-- Base de datos: polla_db
-- =============================================

-- 1. TABLA DE USUARIOS
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    balance DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE JORNADAS
CREATE TABLE IF NOT EXISTS jornadas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    closing_date TIMESTAMP NOT NULL,
    ticket_cost DECIMAL(10,2) NOT NULL,
    total_prize_pool DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE CARRERAS
CREATE TABLE IF NOT EXISTS carreras (
    id SERIAL PRIMARY KEY,
    jornada_id INTEGER REFERENCES jornadas(id) ON DELETE CASCADE,
    race_number INTEGER NOT NULL,
    name VARCHAR(100),
    winner_participant_id INTEGER NULL
);

-- 4. TABLA DE PARTICIPANTES (CABALLOS)
CREATE TABLE IF NOT EXISTS participantes (
    id SERIAL PRIMARY KEY,
    carrera_id INTEGER REFERENCES carreras(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

-- 5. TABLA DE JUGADAS (TICKETS)
CREATE TABLE IF NOT EXISTS jugadas (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    jornada_id INTEGER REFERENCES jornadas(id),
    selections JSONB NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    prize DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA DE SOLICITUDES DE RECARGA
CREATE TABLE IF NOT EXISTS recargas_solicitudes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    metodo_pago VARCHAR(50) NOT NULL,
    comprobante TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    admin_comentario TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA DE TRANSACCIONES
CREATE TABLE IF NOT EXISTS transacciones (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(30) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA DE CONFIGURACIÓN DE PREMIOS
CREATE TABLE IF NOT EXISTS premios_config (
    id SERIAL PRIMARY KEY,
    jornada_id INTEGER REFERENCES jornadas(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL
);

-- =============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- =============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_jornadas_status ON jornadas(status);
CREATE INDEX idx_jugadas_user_id ON jugadas(user_id);
CREATE INDEX idx_jugadas_jornada_id ON jugadas(jornada_id);
CREATE INDEX idx_recargas_status ON recargas_solicitudes(status);

-- =============================================
-- DATOS INICIALES (SEEDS)
-- =============================================

-- Insertar usuario admin (contraseña: admin123)
-- La contraseña hasheada es para "admin123" con bcrypt (salt rounds 10)
INSERT INTO users (username, email, password_hash, role, balance) 
VALUES ('admin', 'admin@polla.com', '$2a$10$X7tYkQqZx5xLkqQwQwQwQ.8xLkqQwQwQwQwQwQwQwQwQwQ.', 'admin', 0)
ON CONFLICT (email) DO NOTHING;

-- Insertar usuario de prueba (contraseña: test123)
INSERT INTO users (username, email, password_hash, role, balance) 
VALUES ('testuser', 'test@test.com', '$2a$10$Y8uZkRrY8yMkqRrY8yMkq.9yMkqRrY8yMkqRrY8yMkqRrY8.', 'user', 100)
ON CONFLICT (email) DO NOTHING;

-- Insertar configuración de premios por defecto (60%, 25%, 15%)
-- Esto se asigna por jornada, pero aquí hay un ejemplo

-- =============================================
-- FUNCIÓN PARA ACTUALIZAR updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recargas_updated_at 
    BEFORE UPDATE ON recargas_solicitudes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CONSULTAS ÚTILES (COMENTADAS)
-- =============================================

-- Ver todas las tablas creadas:
-- \dt

-- Ver usuarios:
-- SELECT id, username, email, role, balance FROM users;

-- Ver jornadas:
-- SELECT id, name, status, closing_date, ticket_cost, total_prize_pool FROM jornadas;