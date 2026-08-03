-- CreateEnum
CREATE TYPE "VolumeOwnership" AS ENUM ('PHYSICAL', 'DIGITAL', 'NOT_OWNED');

-- AlterTable
ALTER TABLE "volume" ADD COLUMN     "isbn" TEXT,
ADD COLUMN     "ownership" "VolumeOwnership" NOT NULL DEFAULT 'PHYSICAL',
ADD COLUMN     "publishDate" TIMESTAMP(3),
ADD COLUMN     "publisher" TEXT,
ADD COLUMN     "title" TEXT;
