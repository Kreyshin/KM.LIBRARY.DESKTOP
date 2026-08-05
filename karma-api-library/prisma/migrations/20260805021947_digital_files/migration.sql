-- CreateTable
CREATE TABLE "digital_file" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "pageCount" INTEGER,
    "manifestJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "volumeId" TEXT NOT NULL,
    CONSTRAINT "digital_file_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "volume" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "digital_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currentPage" INTEGER NOT NULL DEFAULT 1,
    "totalPages" INTEGER,
    "percent" REAL NOT NULL DEFAULT 0,
    "locator" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "readerId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    CONSTRAINT "digital_progress_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "digital_progress_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "digital_file" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "digital_file_volumeId_createdAt_idx" ON "digital_file"("volumeId", "createdAt");

-- CreateIndex
CREATE INDEX "digital_progress_fileId_idx" ON "digital_progress"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "digital_progress_readerId_fileId_key" ON "digital_progress"("readerId", "fileId");
