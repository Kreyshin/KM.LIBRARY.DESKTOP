-- Normaliza la clasificación existente y convierte los géneros en una relación real.
ALTER TABLE "obra" ADD COLUMN "currentChapter" INTEGER;
ALTER TABLE "obra" ADD COLUMN "thumbnailPath" TEXT;
ALTER TABLE "volume" ADD COLUMN "thumbnailPath" TEXT;

CREATE TABLE "obra_genre" (
  "obraId" TEXT NOT NULL,
  "genreId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "obra_genre_pkey" PRIMARY KEY ("obraId", "genreId")
);

CREATE INDEX "obra_genre_genreId_idx" ON "obra_genre"("genreId");
ALTER TABLE "obra_genre" ADD CONSTRAINT "obra_genre_obraId_fkey"
  FOREIGN KEY ("obraId") REFERENCES "obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "obra_genre" ADD CONSTRAINT "obra_genre_genreId_fkey"
  FOREIGN KEY ("genreId") REFERENCES "genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Shonen/Shōnen/Shounen es demografía, no género. Conserva su significado en el campo correcto.
UPDATE "obra"
SET "demographic" = 'SHONEN'
WHERE "tipo" IN ('MANGA', 'MANHWA', 'MANHUA')
  AND "demographic" IS NULL
  AND EXISTS (
    SELECT 1 FROM unnest("genres") AS value
    WHERE lower(trim(value)) IN ('shonen', 'shōnen', 'shounen')
  );

-- Crea entradas personalizadas solo para valores que no pertenecen a una demografía.
WITH normalized AS (
  SELECT DISTINCT
    CASE lower(trim(value))
      WHEN 'accion' THEN 'Acción'
      WHEN 'acción' THEN 'Acción'
      WHEN 'aventura' THEN 'Aventura'
      WHEN 'ciencia ficcion' THEN 'Ciencia ficción'
      WHEN 'ciencia ficción' THEN 'Ciencia ficción'
      WHEN 'fantasia' THEN 'Fantasía'
      WHEN 'fantasía' THEN 'Fantasía'
      WHEN 'historico' THEN 'Ficción histórica'
      WHEN 'histórico' THEN 'Ficción histórica'
      WHEN 'vida cotidiana' THEN 'Ficción contemporánea'
      ELSE trim(value)
    END AS name
  FROM "obra", unnest("genres") AS value
  WHERE trim(value) <> ''
    AND lower(trim(value)) NOT IN ('shonen', 'shōnen', 'shounen', 'shojo', 'shōjo', 'seinen', 'josei', 'kodomo')
)
INSERT INTO "genre" ("id", "name", "slug", "isStandard", "createdAt")
SELECT
  gen_random_uuid(),
  normalized.name,
  trim(both '-' from regexp_replace(
    lower(translate(normalized.name, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')),
    '[^a-z0-9]+', '-', 'g'
  )),
  false,
  CURRENT_TIMESTAMP
FROM normalized
WHERE NOT EXISTS (
  SELECT 1 FROM "genre" existing WHERE lower(existing."name") = lower(normalized.name)
)
ON CONFLICT DO NOTHING;

WITH normalized AS (
  SELECT
    obra."id" AS "obraId",
    CASE lower(trim(value))
      WHEN 'accion' THEN 'Acción'
      WHEN 'acción' THEN 'Acción'
      WHEN 'aventura' THEN 'Aventura'
      WHEN 'ciencia ficcion' THEN 'Ciencia ficción'
      WHEN 'ciencia ficción' THEN 'Ciencia ficción'
      WHEN 'fantasia' THEN 'Fantasía'
      WHEN 'fantasía' THEN 'Fantasía'
      WHEN 'historico' THEN 'Ficción histórica'
      WHEN 'histórico' THEN 'Ficción histórica'
      WHEN 'vida cotidiana' THEN 'Ficción contemporánea'
      ELSE trim(value)
    END AS name
  FROM "obra" obra, unnest(obra."genres") AS value
  WHERE trim(value) <> ''
    AND lower(trim(value)) NOT IN ('shonen', 'shōnen', 'shounen', 'shojo', 'shōjo', 'seinen', 'josei', 'kodomo')
)
INSERT INTO "obra_genre" ("obraId", "genreId", "createdAt")
SELECT normalized."obraId", genre."id", CURRENT_TIMESTAMP
FROM normalized
JOIN "genre" genre ON lower(genre."name") = lower(normalized.name)
ON CONFLICT DO NOTHING;

ALTER TABLE "obra" DROP COLUMN "genres";
