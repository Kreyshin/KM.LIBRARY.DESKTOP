CREATE TYPE "CoverEditionType" AS ENUM ('STANDARD', 'SPECIAL', 'LIMITED', 'OMNIBUS', 'COLLECTOR', 'OTHER');
CREATE TYPE "ReadingUnit" AS ENUM ('CHAPTER', 'PAGE', 'PERCENT');
CREATE TYPE "SmartShelfType" AS ENUM ('PURCHASE_LIST', 'UNREAD', 'FAVORITES', 'IN_PROGRESS', 'OWNED');

ALTER TABLE "volume_cover_variant"
  ADD COLUMN "spinePath" TEXT,
  ADD COLUMN "thumbnailPath" TEXT,
  ADD COLUMN "editionType" "CoverEditionType" NOT NULL DEFAULT 'STANDARD';

CREATE TABLE "reading_session" (
  "id" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "minutes" INTEGER NOT NULL DEFAULT 0,
  "startProgress" INTEGER,
  "endProgress" INTEGER,
  "unit" "ReadingUnit" NOT NULL DEFAULT 'CHAPTER',
  "rereadNumber" INTEGER NOT NULL DEFAULT 1,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readerId" TEXT NOT NULL,
  "obraId" TEXT NOT NULL,
  "volumeId" TEXT,
  CONSTRAINT "reading_session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shelf" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT '#9F6BFF',
  "smartType" "SmartShelfType",
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "readerId" TEXT NOT NULL,
  CONSTRAINT "shelf_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shelf_item" (
  "id" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "shelfId" TEXT NOT NULL,
  "obraId" TEXT NOT NULL,
  CONSTRAINT "shelf_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reading_session_readerId_occurredAt_idx" ON "reading_session"("readerId", "occurredAt");
CREATE INDEX "reading_session_obraId_idx" ON "reading_session"("obraId");
CREATE INDEX "reading_session_volumeId_idx" ON "reading_session"("volumeId");
CREATE UNIQUE INDEX "shelf_readerId_name_key" ON "shelf"("readerId", "name");
CREATE INDEX "shelf_readerId_position_idx" ON "shelf"("readerId", "position");
CREATE UNIQUE INDEX "shelf_item_shelfId_obraId_key" ON "shelf_item"("shelfId", "obraId");
CREATE INDEX "shelf_item_shelfId_position_idx" ON "shelf_item"("shelfId", "position");

ALTER TABLE "reading_session" ADD CONSTRAINT "reading_session_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reading_session" ADD CONSTRAINT "reading_session_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reading_session" ADD CONSTRAINT "reading_session_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "volume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shelf" ADD CONSTRAINT "shelf_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shelf_item" ADD CONSTRAINT "shelf_item_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "shelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shelf_item" ADD CONSTRAINT "shelf_item_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
