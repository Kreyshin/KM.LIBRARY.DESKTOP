CREATE TABLE "reader" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "location" TEXT,
    "favoriteGenres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avatarUrl" TEXT,
    "readingGoal" INTEGER NOT NULL DEFAULT 12,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    CONSTRAINT "reader_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readerId" TEXT NOT NULL,
    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reader_email_key" ON "reader"("email");
CREATE UNIQUE INDEX "auth_session_tokenHash_key" ON "auth_session"("tokenHash");
CREATE INDEX "auth_session_readerId_idx" ON "auth_session"("readerId");
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_readerId_fkey"
  FOREIGN KEY ("readerId") REFERENCES "reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
