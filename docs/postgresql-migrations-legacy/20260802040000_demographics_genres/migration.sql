CREATE TYPE "Demographic" AS ENUM ('KODOMO', 'SHONEN', 'SHOJO', 'SEINEN', 'JOSEI', 'GENERAL');

ALTER TABLE "obra" ADD COLUMN "demographic" "Demographic";

CREATE TABLE "genre" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "isStandard" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "genre_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "genre_name_key" ON "genre"("name");
CREATE UNIQUE INDEX "genre_slug_key" ON "genre"("slug");

INSERT INTO "genre" ("id", "name", "slug", "isStandard") VALUES
  (gen_random_uuid()::text, 'Acción', 'accion', true),
  (gen_random_uuid()::text, 'Aventura', 'aventura', true),
  (gen_random_uuid()::text, 'Autobiografía', 'autobiografia', true),
  (gen_random_uuid()::text, 'Biografía', 'biografia', true),
  (gen_random_uuid()::text, 'Ciencia ficción', 'ciencia-ficcion', true),
  (gen_random_uuid()::text, 'Clásicos', 'clasicos', true),
  (gen_random_uuid()::text, 'Comedia', 'comedia', true),
  (gen_random_uuid()::text, 'Crimen', 'crimen', true),
  (gen_random_uuid()::text, 'Cuento', 'cuento', true),
  (gen_random_uuid()::text, 'Distopía', 'distopia', true),
  (gen_random_uuid()::text, 'Drama', 'drama', true),
  (gen_random_uuid()::text, 'Ensayo', 'ensayo', true),
  (gen_random_uuid()::text, 'Fantasía', 'fantasia', true),
  (gen_random_uuid()::text, 'Ficción contemporánea', 'ficcion-contemporanea', true),
  (gen_random_uuid()::text, 'Ficción histórica', 'ficcion-historica', true),
  (gen_random_uuid()::text, 'Ficción literaria', 'ficcion-literaria', true),
  (gen_random_uuid()::text, 'Filosofía', 'filosofia', true),
  (gen_random_uuid()::text, 'Historia', 'historia', true),
  (gen_random_uuid()::text, 'Humor y sátira', 'humor-y-satira', true),
  (gen_random_uuid()::text, 'Infantil', 'infantil', true),
  (gen_random_uuid()::text, 'Juvenil', 'juvenil', true),
  (gen_random_uuid()::text, 'Memorias', 'memorias', true),
  (gen_random_uuid()::text, 'Misterio', 'misterio', true),
  (gen_random_uuid()::text, 'No ficción', 'no-ficcion', true),
  (gen_random_uuid()::text, 'Poesía', 'poesia', true),
  (gen_random_uuid()::text, 'Política', 'politica', true),
  (gen_random_uuid()::text, 'Psicología', 'psicologia', true),
  (gen_random_uuid()::text, 'Realismo mágico', 'realismo-magico', true),
  (gen_random_uuid()::text, 'Religión y espiritualidad', 'religion-y-espiritualidad', true),
  (gen_random_uuid()::text, 'Romance', 'romance', true),
  (gen_random_uuid()::text, 'Terror', 'terror', true),
  (gen_random_uuid()::text, 'Thriller y suspenso', 'thriller-y-suspenso', true),
  (gen_random_uuid()::text, 'True crime', 'true-crime', true);
