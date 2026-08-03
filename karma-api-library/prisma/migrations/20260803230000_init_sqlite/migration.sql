-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);

-- CreateTable
CREATE TABLE "profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "location" TEXT,
    "favoriteGenresJson" TEXT NOT NULL DEFAULT '[]',
    "avatarUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT '#9F6BFF',
    "readingGoal" INTEGER NOT NULL DEFAULT 12,
    "isKids" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    CONSTRAINT "profile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auth_session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    CONSTRAINT "auth_session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auth_session_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "obra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "originalTitle" TEXT,
    "autor" TEXT,
    "illustrator" TEXT,
    "publisher" TEXT,
    "releaseYear" INTEGER,
    "tipo" TEXT NOT NULL DEFAULT 'MANGA',
    "demographic" TEXT,
    "language" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "currentVolume" INTEGER,
    "currentChapter" INTEGER,
    "totalChapters" INTEGER,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "rating" REAL,
    "description" TEXT,
    "personalReview" TEXT,
    "notes" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "coverPath" TEXT,
    "thumbnailPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "genre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isStandard" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "obra_genre" (
    "obraId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("obraId", "genreId"),
    CONSTRAINT "obra_genre_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obra" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "obra_genre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genre" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "volume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_READ',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "chapters" TEXT,
    "startDate" DATETIME,
    "finishDate" DATETIME,
    "notes" TEXT,
    "coverPath" TEXT,
    "thumbnailPath" TEXT,
    "spinePath" TEXT,
    "title" TEXT,
    "isbn" TEXT,
    "publisher" TEXT,
    "publishDate" DATETIME,
    "ownership" TEXT NOT NULL DEFAULT 'NOT_OWNED',
    "obraId" TEXT NOT NULL,
    CONSTRAINT "volume_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obra" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "volume_cover_variant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "language" TEXT,
    "publisher" TEXT,
    "edition" TEXT,
    "country" TEXT,
    "isbn" TEXT,
    "publishDate" DATETIME,
    "spinePath" TEXT,
    "thumbnailPath" TEXT,
    "editionType" TEXT NOT NULL DEFAULT 'STANDARD',
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "volumeId" TEXT NOT NULL,
    CONSTRAINT "volume_cover_variant_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "volume" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reading_session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "startProgress" INTEGER,
    "endProgress" INTEGER,
    "unit" TEXT NOT NULL DEFAULT 'CHAPTER',
    "rereadNumber" INTEGER NOT NULL DEFAULT 1,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readerId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "volumeId" TEXT,
    CONSTRAINT "reading_session_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reading_session_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obra" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reading_session_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "volume" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shelf" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#9F6BFF',
    "smartType" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "readerId" TEXT NOT NULL,
    CONSTRAINT "shelf_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shelf_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shelfId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    CONSTRAINT "shelf_item_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "shelf" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shelf_item_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obra" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "account_email_key" ON "account"("email");

-- CreateIndex
CREATE INDEX "profile_accountId_position_idx" ON "profile"("accountId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_tokenHash_key" ON "auth_session"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_session_accountId_idx" ON "auth_session"("accountId");

-- CreateIndex
CREATE INDEX "auth_session_profileId_idx" ON "auth_session"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "genre_name_key" ON "genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "genre_slug_key" ON "genre"("slug");

-- CreateIndex
CREATE INDEX "obra_genre_genreId_idx" ON "obra_genre"("genreId");

-- CreateIndex
CREATE UNIQUE INDEX "volume_obraId_number_key" ON "volume"("obraId", "number");

-- CreateIndex
CREATE INDEX "volume_cover_variant_volumeId_idx" ON "volume_cover_variant"("volumeId");

-- CreateIndex
CREATE INDEX "reading_session_readerId_occurredAt_idx" ON "reading_session"("readerId", "occurredAt");

-- CreateIndex
CREATE INDEX "reading_session_obraId_idx" ON "reading_session"("obraId");

-- CreateIndex
CREATE INDEX "reading_session_volumeId_idx" ON "reading_session"("volumeId");

-- CreateIndex
CREATE INDEX "shelf_readerId_position_idx" ON "shelf"("readerId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_readerId_name_key" ON "shelf"("readerId", "name");

-- CreateIndex
CREATE INDEX "shelf_item_shelfId_position_idx" ON "shelf_item"("shelfId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_item_shelfId_obraId_key" ON "shelf_item"("shelfId", "obraId");
