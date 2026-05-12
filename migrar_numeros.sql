-- Migración: Agregar números a caballos existentes

-- Agregar columnas si no existen
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS numero INTEGER;
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS nombre_opcional VARCHAR(100);
ALTER TABLE carreras ADD COLUMN IF NOT EXISTS cantidad_caballos INTEGER DEFAULT 6;

-- Para cada carrera, asignar números a los caballos existentes
UPDATE participantes p
SET numero = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY carrera_id ORDER BY id) as rn
  FROM participantes
) sub
WHERE p.id = sub.id;

-- Actualizar cantidad_caballos en carreras
UPDATE carreras c
SET cantidad_caballos = (
  SELECT COUNT(*) FROM participantes WHERE carrera_id = c.id
);

-- Verificar
SELECT c.id, c.name, c.cantidad_caballos, COUNT(p.id) as participantes
FROM carreras c
LEFT JOIN participantes p ON p.carrera_id = c.id
GROUP BY c.id;
