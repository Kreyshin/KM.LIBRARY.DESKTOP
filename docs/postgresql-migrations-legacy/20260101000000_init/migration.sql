-- CreateEnum
CREATE TYPE "FormatType" AS ENUM ('BOOK', 'MANGA', 'MANHWA', 'MANHUA', 'COMIC');

-- CreateEnum
CREATE TYPE "ReadingStatus" AS ENUM ('READING', 'COMPLETED', 'ON_HOLD', 'WISHLIST', 'DROPPED', 'NOT_STARTED');

-- CreateEnum
CREATE TYPE "VolumeStatus" AS ENUM ('OWNED', 'READING', 'NOT_READ');

-- CreateTable
CREATE TABLE "obra" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "originalTitle" TEXT,
    "autor" TEXT,
    "illustrator" TEXT,
    "publisher" TEXT,
    "releaseYear" INTEGER,
    "tipo" "FormatType" NOT NULL DEFAULT 'MANGA',
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" TEXT,
    "status" "ReadingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentVolume" INTEGER,
    "totalChapters" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rating" DOUBLE PRECISION,
    "description" TEXT,
    "personalReview" TEXT,
    "notes" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "coverPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volume" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "VolumeStatus" NOT NULL DEFAULT 'NOT_READ',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "chapters" TEXT,
    "startDate" TIMESTAMP(3),
    "finishDate" TIMESTAMP(3),
    "notes" TEXT,
    "coverPath" TEXT,
    "obraId" TEXT NOT NULL,

    CONSTRAINT "volume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "volume_obraId_number_key" ON "volume"("obraId", "number");

-- AddForeignKey
ALTER TABLE "volume" ADD CONSTRAINT "volume_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
