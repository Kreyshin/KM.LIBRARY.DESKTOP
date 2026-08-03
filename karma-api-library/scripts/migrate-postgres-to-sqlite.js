/* Migrates a running legacy PostgreSQL database into an already migrated SQLite database. */
const { Client } = require('pg');
const { cpSync, existsSync } = require('fs');
const path = require('path');

const oldUrl = process.env.OLD_DATABASE_URL;
if (!oldUrl) throw new Error('Define OLD_DATABASE_URL con la conexión PostgreSQL anterior.');
if (!process.env.DATABASE_URL?.startsWith('file:')) throw new Error('DATABASE_URL debe apuntar al archivo SQLite de destino.');

const { PrismaClient } = require('@prisma/client');
const source = new Client({ connectionString: oldUrl });
const target = new PrismaClient();
const json = (value) => JSON.stringify(Array.isArray(value) ? value : []);

async function rows(table) {
  return (await source.query(`SELECT * FROM "${table}"`)).rows;
}

async function main() {
  await source.connect();
  if (await target.account.count()) throw new Error('La base SQLite de destino no está vacía.');

  const readers = await rows('reader');
  if (!readers.length) throw new Error('La base PostgreSQL no contiene lectores para crear la cuenta del hogar.');
  for (const [position, reader] of readers.entries()) {
    const accountId = `account-${reader.id}`;
    await target.account.create({ data: {
      id: accountId, email: reader.email, passwordHash: reader.passwordHash,
      createdAt: reader.createdAt, updatedAt: reader.updatedAt, lastLoginAt: reader.lastLoginAt,
      profiles: { create: { id: reader.id, displayName: reader.displayName, bio: reader.bio, location: reader.location,
        favoriteGenresJson: json(reader.favoriteGenres), avatarUrl: reader.avatarUrl, readingGoal: reader.readingGoal,
        position, createdAt: reader.createdAt, updatedAt: reader.updatedAt } },
    } });
  }

  for (const item of await rows('obra')) await target.obra.create({ data: {
    id: item.id, titulo: item.titulo, originalTitle: item.originalTitle, autor: item.autor, illustrator: item.illustrator,
    publisher: item.publisher, releaseYear: item.releaseYear, tipo: item.tipo, demographic: item.demographic,
    language: item.language, status: item.status, currentVolume: item.currentVolume, currentChapter: item.currentChapter,
    totalChapters: item.totalChapters, tagsJson: json(item.tags), rating: item.rating, description: item.description,
    personalReview: item.personalReview, notes: item.notes, favorite: item.favorite, coverPath: item.coverPath,
    thumbnailPath: item.thumbnailPath, createdAt: item.createdAt,
  } });
  for (const item of await rows('genre')) await target.genre.create({ data: item });
  for (const item of await rows('obra_genre')) await target.obraGenre.create({ data: item });
  for (const item of await rows('volume')) await target.volume.create({ data: item });
  for (const item of await rows('volume_cover_variant')) await target.volumeCoverVariant.create({ data: item });
  for (const item of await rows('reading_session')) await target.readingSession.create({ data: item });
  for (const item of await rows('shelf')) await target.shelf.create({ data: item });
  for (const item of await rows('shelf_item')) await target.shelfItem.create({ data: item });

  const uploadsSource = process.env.OLD_UPLOADS_DIR;
  if (uploadsSource && existsSync(uploadsSource)) {
    const dataDir = process.env.KARMA_DATA_DIR || path.dirname(process.env.DATABASE_URL.replace(/^file:/, ''));
    cpSync(uploadsSource, path.join(dataDir, 'uploads'), { recursive: true, force: true });
  }
  console.log(`Migración completa: ${readers.length} perfil(es), ${await target.obra.count()} obra(s).`);
}

main().finally(async () => { await source.end(); await target.$disconnect(); }).catch((error) => { console.error(error); process.exitCode = 1; });
