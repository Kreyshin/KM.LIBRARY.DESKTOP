-- CreateTable
CREATE TABLE "volume_cover_variant" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "language" TEXT,
    "publisher" TEXT,
    "edition" TEXT,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "volumeId" TEXT NOT NULL,

    CONSTRAINT "volume_cover_variant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "volume_cover_variant_volumeId_idx" ON "volume_cover_variant"("volumeId");

-- AddForeignKey
ALTER TABLE "volume_cover_variant" ADD CONSTRAINT "volume_cover_variant_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "volume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
